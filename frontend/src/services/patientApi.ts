import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import type { ApiResponse, Patient, PatientCreate } from '../types';
import type { AxiosError } from 'axios';
import { patientLocal } from './local/patientLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export interface PatientDetail extends Patient {
  cases: Array<{
    id: string;
    status: string;
    chief_complaint: string | null;
    created_at: string;
  }>;
}

export interface PatientVital {
  id: string;
  patient_id: string;
  recorded_by_id: string;
  height?: number;
  weight?: number;
  blood_pressure?: string;
  temperature?: number;
  pulse?: number;
  notes?: string;
  recorded_at: string;
}

export const patientApi = {
  list: async (searchQuery?: string): Promise<ApiResponse<Patient[]>> => {
    if (isNative) return patientLocal.list(searchQuery);
    try {
      const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const response = await apiClient.get<Patient[]>(`/patients${params}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  getById: async (id: string): Promise<ApiResponse<PatientDetail>> => {
    if (isNative) return patientLocal.getById(id);
    try {
      const response = await apiClient.get<PatientDetail>(`/patients/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  create: async (data: PatientCreate): Promise<ApiResponse<Patient>> => {
    if (isNative) return patientLocal.create(data);
    try {
      const response = await apiClient.post<Patient>('/patients', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  addVitals: async (patientId: string, vitals: Partial<PatientVital>): Promise<ApiResponse<PatientVital>> => {
    if (isNative) return patientLocal.addVitals(patientId, vitals);
    try {
      const response = await apiClient.post<PatientVital>(`/patients/${patientId}/vitals`, vitals);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },

  getVitals: async (patientId: string): Promise<ApiResponse<PatientVital[]>> => {
    if (isNative) return patientLocal.getVitals(patientId);
    try {
      const response = await apiClient.get<PatientVital[]>(`/patients/${patientId}/vitals`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },
};

