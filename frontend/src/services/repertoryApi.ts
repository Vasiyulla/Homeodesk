import { AxiosError } from 'axios';
import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import type { ApiResponse } from '../types';
import logger from '../utils/logger';

export interface SelectedRubric {
  chapter: string;
  main_rubric: string;
  sub_condition?: string;
  category?: string;
  source?: string;
}

export interface RemedyScore {
  remedy: string;
  total_score: number;
  rubric_count: number;
  rubrics_covered: Record<string, number>[];
}

export const repertoryApi = {
  repertorize: async (rubrics: SelectedRubric[], weights?: Record<string, number>): Promise<ApiResponse<RemedyScore[]>> => {
    try {
      const response = await apiClient.post<RemedyScore[]>('/repertory/repertorize', {
        rubrics,
        weights,
      });
      logger.info('Repertorization complete', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to repertorize', errorData);
      return { success: false, error: errorData };
    }
  },
};
