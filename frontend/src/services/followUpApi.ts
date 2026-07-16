import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { FollowUp, FollowUpCreate, ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { followUpLocal } from './local/followUpLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const followUpApi = {
  createFollowUp: async (caseId: string, data: FollowUpCreate): Promise<ApiResponse<FollowUp>> => {
    if (isNative) return followUpLocal.createFollowUp(caseId, data);
    try {
      const response = await apiClient.post<FollowUp>(`/cases/${caseId}/follow-ups`, data);
      logger.info('Follow-up created', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to create follow-up', errorData);
      return { success: false, error: errorData };
    }
  },

  getFollowUps: async (caseId: string): Promise<ApiResponse<FollowUp[]>> => {
    if (isNative) return followUpLocal.getFollowUps(caseId);
    try {
      const response = await apiClient.get<FollowUp[]>(`/cases/${caseId}/follow-ups`);
      logger.info('Follow-ups fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch follow-ups', errorData);
      return { success: false, error: errorData };
    }
  },
};

