import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { Case, CaseCreate, CaseUpdate, AuditTrailResponse, ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { caseLocal } from './local/caseLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const caseApi = {
  createCase: async (caseData: CaseCreate): Promise<ApiResponse<Case>> => {
    if (isNative) return caseLocal.createCase(caseData);
    try {
      const response = await apiClient.post<Case>('/cases', caseData);
      logger.info('Case created', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to create case', errorData);
      return { success: false, error: errorData };
    }
  },

  getCase: async (caseId: string): Promise<ApiResponse<Case>> => {
    if (isNative) return caseLocal.getCase(caseId);
    try {
      const response = await apiClient.get<Case>(`/cases/${caseId}`);
      logger.info('Case fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch case', errorData);
      return { success: false, error: errorData };
    }
  },

  updateCase: async (caseId: string, caseData: CaseUpdate): Promise<ApiResponse<Case>> => {
    if (isNative) return caseLocal.updateCase(caseId, caseData);
    try {
      const response = await apiClient.put<Case>(`/cases/${caseId}`, caseData);
      logger.info('Case updated', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to update case', errorData);
      return { success: false, error: errorData };
    }
  },

  listMyCases: async (): Promise<ApiResponse<Case[]>> => {
    if (isNative) return caseLocal.listMyCases();
    try {
      const response = await apiClient.get<Case[]>('/my-cases');
      logger.info('Cases fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch cases', errorData);
      return { success: false, error: errorData };
    }
  },

  getAuditTrail: async (caseId: string): Promise<ApiResponse<AuditTrailResponse>> => {
    if (isNative) return caseLocal.getAuditTrail(caseId);
    try {
      const response = await apiClient.get<AuditTrailResponse>(`/cases/${caseId}/audit-trail`);
      logger.info('Audit trail fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch audit trail', errorData);
      return { success: false, error: errorData };
    }
  },

  getPatientCaseHistory: async (patientId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.get<any>(`/patients/${patientId}/case-history`);
      logger.info('Patient case history fetched', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch patient case history', errorData);
      return { success: false, error: errorData };
    }
  },
};
