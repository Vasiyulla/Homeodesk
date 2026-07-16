import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { appointmentLocal } from './local/appointmentLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  organization_id: string | null;
  scheduled_time: string;
  status: string;
  appointment_type: string;
  meeting_link: string | null;
  checked_in_at: string | null;
  is_emergency: boolean;
  created_at: string;
}

export interface AppointmentCreate {
  patient_id: string;
  doctor_id?: string;
  scheduled_time: string;
  status?: string;
  appointment_type?: string;
  meeting_link?: string;
  is_emergency?: boolean;
}

export const appointmentApi = {
  create: async (data: AppointmentCreate): Promise<ApiResponse<Appointment>> => {
    if (isNative) return appointmentLocal.create(data);
    try {
      const response = await apiClient.post<Appointment>('/appointments', data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to create appointment', errorData);
      return { success: false, error: errorData };
    }
  },

  list: async (): Promise<ApiResponse<Appointment[]>> => {
    if (isNative) return appointmentLocal.list();
    try {
      const response = await apiClient.get<Appointment[]>('/appointments');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch appointments', errorData);
      return { success: false, error: errorData };
    }
  },

  getWaitingRoom: async (): Promise<ApiResponse<Appointment[]>> => {
    try {
      const response = await apiClient.get<Appointment[]>('/appointments/waiting-room');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch waiting room appointments', errorData);
      return { success: false, error: errorData };
    }
  },

  checkIn: async (id: string): Promise<ApiResponse<Appointment>> => {
    if (isNative) return appointmentLocal.checkIn(id);
    try {
      const response = await apiClient.put<Appointment>(`/appointments/${id}/checkin`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to check in appointment', errorData);
      return { success: false, error: errorData };
    }
  },

  complete: async (id: string): Promise<ApiResponse<Appointment>> => {
    if (isNative) return appointmentLocal.complete(id);
    try {
      const response = await apiClient.put<Appointment>(`/appointments/${id}/complete`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to complete appointment', errorData);
      return { success: false, error: errorData };
    }
  },
};

