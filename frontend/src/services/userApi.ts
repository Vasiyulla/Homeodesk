import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { User, ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { userLocal } from './local/userLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    if (isNative) return userLocal.getProfile();
    try {
      const response = await apiClient.get<User>('/users/me');
      logger.info('User profile fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch profile', errorData);
      return { success: false, error: errorData };
    }
  },

  getUser: async (userId: string): Promise<ApiResponse<User>> => {
    if (isNative) return userLocal.getUser(userId);
    try {
      const response = await apiClient.get<User>(`/users/${userId}`);
      logger.info('User fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch user', errorData);
      return { success: false, error: errorData };
    }
  },
};

