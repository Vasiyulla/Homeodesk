import { AxiosError } from 'axios';
import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import type { ApiResponse } from '../types';
import logger from '../utils/logger';

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  title: string;
  message: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

export const notificationApi = {
  getNotifications: async (limit: number = 50): Promise<ApiResponse<Notification[]>> => {
    try {
      const response = await apiClient.get<Notification[]>(`/notifications?limit=${limit}`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch notifications', errorData);
      return { success: false, error: errorData };
    }
  },

  markAsRead: async (notificationId: string): Promise<ApiResponse<Notification>> => {
    try {
      const response = await apiClient.put<Notification>(`/notifications/${notificationId}/read`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to mark notification as read', errorData);
      return { success: false, error: errorData };
    }
  },

  markAllAsRead: async (): Promise<ApiResponse<{ status: string; message: string }>> => {
    try {
      const response = await apiClient.put<{ status: string; message: string }>('/notifications/read-all');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to mark all notifications as read', errorData);
      return { success: false, error: errorData };
    }
  },
};
