import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { SymptomSearchResponse, ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { symptomSearchLocal } from './local/symptomSearchLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const symptomApi = {
  searchSymptoms: async (symptom: string, source = 'both', limit = 10): Promise<ApiResponse<SymptomSearchResponse>> => {
    if (isNative) return symptomSearchLocal.searchSymptoms(symptom, source, limit);
    try {
      const response = await apiClient.post<SymptomSearchResponse>('/symptom-search', {
        symptom,
        source,
        limit,
      });
      logger.info('Symptoms searched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to search symptoms', errorData);
      return { success: false, error: errorData };
    }
  },

  getSymptomsByCategory: async (
    mentalSymptoms?: string[],
    generalSymptoms?: string[],
    particularSymptoms?: string[],
    causationSymptoms?: string[],
    source = 'both'
  ): Promise<ApiResponse<Record<string, unknown[]>>> => {
    if (isNative) {
      return symptomSearchLocal.getSymptomsByCategory(
        mentalSymptoms,
        generalSymptoms,
        particularSymptoms,
        causationSymptoms,
        source
      );
    }
    try {
      const response = await apiClient.post<Record<string, unknown[]>>('/symptom-search/by-category', {
        mental_symptoms: mentalSymptoms,
        general_symptoms: generalSymptoms,
        particular_symptoms: particularSymptoms,
        causation_symptoms: causationSymptoms,
        source,
      });
      logger.info('Symptoms by category fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch symptoms by category', errorData);
      return { success: false, error: errorData };
    }
  },

  getTopRubrics: async (symptom: string, count = 3, source = 'both'): Promise<ApiResponse<unknown>> => {
    if (isNative) return symptomSearchLocal.getTopRubrics(symptom, count, source);
    try {
      const response = await apiClient.get(`/symptom-search/top/${encodeURIComponent(symptom)}`, {
        params: { count, source },
      });
      logger.info('Top rubrics fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch top rubrics', errorData);
      return { success: false, error: errorData };
    }
  },
};

