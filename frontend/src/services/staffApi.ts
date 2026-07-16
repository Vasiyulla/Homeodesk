import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { staffLocal } from './local/staffLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export interface StaffMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
}

export const staffApi = {
  getStaff: async (): Promise<ApiResponse<StaffMember[]>> => {
    if (isNative) return staffLocal.getStaff();
    try {
      const response = await apiClient.get<StaffMember[]>('/staff');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch staff members', errorData);
      return { success: false, error: errorData };
    }
  },
};

