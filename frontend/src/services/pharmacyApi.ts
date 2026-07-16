import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { pharmacyLocal } from './local/pharmacyLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export interface PrescriptionItem {
  decision_id: string;
  case_id: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  remedy_name: string;
  potency?: string;
  dose?: string;
  doctor_name: string;
  prescribed_at: string;
  dispense_status: string;
  dispensed_at?: string;
}

export interface PharmacyStats {
  pending: number;
  dispensed_today: number;
}

export const pharmacyApi = {
  getQueue: async (status: 'PENDING' | 'DISPENSED' = 'PENDING'): Promise<ApiResponse<PrescriptionItem[]>> => {
    if (isNative) return pharmacyLocal.getQueue(status);
    try {
      const response = await apiClient.get<PrescriptionItem[]>(`/pharmacy/queue?status=${status}`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch pharmacy queue', errorData);
      return { success: false, error: errorData };
    }
  },

  getStats: async (): Promise<ApiResponse<PharmacyStats>> => {
    if (isNative) return pharmacyLocal.getStats();
    try {
      const response = await apiClient.get<PharmacyStats>('/pharmacy/stats');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch pharmacy stats', errorData);
      return { success: false, error: errorData };
    }
  },

  dispense: async (decisionId: string, notes?: string): Promise<ApiResponse<{ status: string, message: string }>> => {
    if (isNative) return pharmacyLocal.dispense(decisionId, notes);
    try {
      const response = await apiClient.post(`/pharmacy/queue/${decisionId}/dispense`, { notes });
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to dispense prescription', errorData);
      return { success: false, error: errorData };
    }
  },
};

