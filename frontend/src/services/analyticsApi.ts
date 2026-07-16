import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import type { ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { analyticsLocal } from './local/analyticsLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// ── Response Types ──────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total_patients: number;
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  total_revenue: number;
  pending_revenue: number;
  total_staff: number;
}

export interface WeeklyCount {
  week_label: string;
  count: number;
}

export interface TopRemedy {
  remedy_name: string;
  prescription_count: number;
}

export interface StaffActivityItem {
  user_id: string;
  full_name: string | null;
  role: string;
  metric_label: string;
  metric_value: number;
}

// ── API Calls ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  getSummary: async (): Promise<ApiResponse<AnalyticsSummary>> => {
    if (isNative) return analyticsLocal.getSummary();
    try {
      const response = await apiClient.get<AnalyticsSummary>('/analytics/summary');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  getCasesOverTime: async (weeks = 12): Promise<ApiResponse<WeeklyCount[]>> => {
    if (isNative) return analyticsLocal.getCasesOverTime(weeks);
    try {
      const response = await apiClient.get<WeeklyCount[]>(`/analytics/cases-over-time?weeks=${weeks}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  getTopRemedies: async (limit = 10): Promise<ApiResponse<TopRemedy[]>> => {
    if (isNative) return analyticsLocal.getTopRemedies(limit);
    try {
      const response = await apiClient.get<TopRemedy[]>(`/analytics/top-remedies?limit=${limit}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  getStaffActivity: async (): Promise<ApiResponse<StaffActivityItem[]>> => {
    if (isNative) return analyticsLocal.getStaffActivity();
    try {
      const response = await apiClient.get<StaffActivityItem[]>('/analytics/staff-activity');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },
};

