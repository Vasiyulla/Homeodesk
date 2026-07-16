import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import type { ApiResponse } from '../types';
import type { AxiosError } from 'axios';
import { auditLocal } from './local/auditLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  payload_json: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogFilters {
  page?: number;
  page_size?: number;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
}

// ── API ─────────────────────────────────────────────────────────────────────

export const auditApi = {
  getLogs: async (filters: AuditLogFilters = {}): Promise<ApiResponse<PaginatedAuditLogs>> => {
    if (isNative) return auditLocal.getLogs(filters);
    try {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.page_size) params.set('page_size', String(filters.page_size));
      if (filters.action) params.set('action', filters.action);
      if (filters.resource_type) params.set('resource_type', filters.resource_type);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get<PaginatedAuditLogs>(`/audit-logs${queryStr}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error as AxiosError) };
    }
  },
};

