import axios from 'axios';
import logger from '../utils/logger';

// Determine API URL based on environment.
// For Tauri desktop app (which runs on a custom protocol), use the local server IP.
// For standard Vite web dev, use '/api' to leverage the Vite proxy.
const isDesktopApp = (window as any).__TAURI__ !== undefined || window.location.protocol.includes('tauri');
const API_BASE_URL = isDesktopApp ? 'http://127.0.0.1:8000/api' : '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Request interceptor — attach JWT token ──────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response interceptor — handle 401 and errors ────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(function (resolve, reject) {
        // Send request to refresh endpoint. Cookie is sent automatically on same-origin
        axios.post(API_BASE_URL + '/auth/refresh', {}, { withCredentials: true })
          .then(({ data }) => {
            setAuthToken(data.access_token);
            apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + data.access_token;
            originalRequest.headers['Authorization'] = 'Bearer ' + data.access_token;
            processQueue(null, data.access_token);
            resolve(apiClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            clearAuthToken();
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    if (error.response?.status === 401) {
      // Clear auth if refresh failed or login failed
      clearAuthToken();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    logger.error('API Error', error);
    return Promise.reject(error);
  }
);

export default apiClient;

// ── Token management helpers ────────────────────────────────────────────────
export const setAuthToken = (token: string): void => {
  localStorage.setItem('access_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('access_token');
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('access_token');
};
