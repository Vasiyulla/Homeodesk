import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { searchLocal } from './local/searchLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export interface RubricEntry {
  main_rubric: string;
  sub_condition: string;
  remedy_count: number;
  source: string;
}

export interface RemedyDetail {
  name: string;
  grade: number;
}

export interface ExactRubricResult {
  chapter: string;
  main_rubric: string;
  sub_condition: string;
  remedies: RemedyDetail[];
  source: string;
}

export interface RemedyRubricResult {
  chapter: string;
  main_rubric: string;
  sub_condition: string;
  grade: number;
  source: string;
}

export const repertoryBrowserApi = {
  getChapters: async (): Promise<ApiResponse<{ sections: string[] }>> => {
    if (isNative) return searchLocal.getChapters();
    try {
      const response = await apiClient.get<{ sections: string[] }>('/search/sections');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch chapters', errorData);
      return { success: false, error: errorData };
    }
  },

  getRubricsByChapter: async (chapter: string, source?: string): Promise<ApiResponse<{ chapter: string; count: number; rubrics: RubricEntry[] }>> => {
    if (isNative) return searchLocal.getRubricsByChapter(chapter, source);
    try {
      const response = await apiClient.get<{ chapter: string; count: number; rubrics: RubricEntry[] }>(`/search/chapter/${encodeURIComponent(chapter)}`, {
        params: { source },
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch rubrics for chapter', errorData);
      return { success: false, error: errorData };
    }
  },

  getExactRubric: async (chapter: string, main_rubric: string, sub_condition: string = "", source?: string): Promise<ApiResponse<{ count: number; results: ExactRubricResult[] }>> => {
    if (isNative) return searchLocal.getExactRubric(chapter, main_rubric, sub_condition, source);
    try {
      const response = await apiClient.get<{ count: number; results: ExactRubricResult[] }>('/search/rubric/exact', {
        params: { chapter, main_rubric, sub_condition, source },
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch exact rubric remedies', errorData);
      return { success: false, error: errorData };
    }
  },

  getRemedies: async (): Promise<ApiResponse<{ count: number; remedies: string[] }>> => {
    if (isNative) return searchLocal.getRemedies();
    try {
      const response = await apiClient.get<{ count: number; remedies: string[] }>('/search/remedies');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch remedies', errorData);
      return { success: false, error: errorData };
    }
  },

  getRubricsByRemedy: async (remedyName: string, source?: string): Promise<ApiResponse<{ remedy: string; count: number; rubrics: RemedyRubricResult[] }>> => {
    if (isNative) return searchLocal.getRubricsByRemedy(remedyName, source);
    try {
      const response = await apiClient.get<{ remedy: string; count: number; rubrics: RemedyRubricResult[] }>(`/search/remedy/${encodeURIComponent(remedyName)}`, {
        params: { source },
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch rubrics for remedy', errorData);
      return { success: false, error: errorData };
    }
  }
};

