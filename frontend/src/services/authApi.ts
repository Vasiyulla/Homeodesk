import apiClient, { setAuthToken } from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { User, TokenResponse, ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { authLocal } from './local/authLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    full_name?: string;
    license_number?: string;
    clinic_name?: string;
    clinic_type?: string;
    employee_count?: string;
  }): Promise<ApiResponse<User>> => {
    if (isNative) return authLocal.register(data);
    try {
      const response = await apiClient.post<User>('/auth/register', data);
      logger.info('Registration successful', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Registration failed', errorData);
      return { success: false, error: errorData };
    }
  },

  login: async (email: string, password: string): Promise<ApiResponse<TokenResponse>> => {
    if (isNative) return authLocal.login(email, password);
    try {
      // OAuth2 password flow uses form data
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await apiClient.post<TokenResponse>('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      // Store token
      setAuthToken(response.data.access_token);
      logger.info('Login successful');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Login failed', errorData);
      return { success: false, error: errorData };
    }
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    if (isNative) return authLocal.getProfile();
    try {
      const response = await apiClient.get<User>('/auth/me');
      logger.info('Profile fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch profile', errorData);
      return { success: false, error: errorData };
    }
  },
};

