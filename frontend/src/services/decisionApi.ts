import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { Decision, DecisionCreate, ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { decisionLocal } from './local/decisionLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const decisionApi = {
  createDecision: async (caseId: string, data: DecisionCreate): Promise<ApiResponse<Decision>> => {
    if (isNative) return decisionLocal.createDecision(caseId, data);
    try {
      const response = await apiClient.post<Decision>(`/cases/${caseId}/decisions`, data);
      logger.info('Decision created', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to create decision', errorData);
      return { success: false, error: errorData };
    }
  },

  getDecisions: async (caseId: string): Promise<ApiResponse<Decision[]>> => {
    if (isNative) return decisionLocal.getDecisions(caseId);
    try {
      const response = await apiClient.get<Decision[]>(`/cases/${caseId}/decisions`);
      logger.info('Decisions fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch decisions', errorData);
      return { success: false, error: errorData };
    }
  },
};

