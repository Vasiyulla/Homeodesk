import type { ApiError } from '../types';
import type { AxiosError } from 'axios';

interface ErrorResponseData {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export const handleApiError = (error: AxiosError<any>): ApiError => {
  if (error.response) {
    return {
      status: error.response.status,
      message:
        error.response.data?.detail ||
        error.response.data?.message ||
        'An error occurred',
      errors: error.response.data?.errors || null,
    };
  }

  if (error.request) {
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
      errors: null,
    };
  }

  return {
    status: 0,
    message: error.message || 'An unexpected error occurred',
    errors: null,
  };
};
