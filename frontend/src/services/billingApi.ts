import apiClient from './apiClient';
import { handleApiError } from '../utils/errorHandler';
import logger from '../utils/logger';
import type { ApiResponse, Invoice, InvoiceCreate } from '../types';
import type { AxiosError } from 'axios';
import { billingLocal } from './local/billingLocal';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const billingApi = {
  createInvoice: async (data: InvoiceCreate): Promise<ApiResponse<Invoice>> => {
    if (isNative) return billingLocal.createInvoice(data);
    try {
      const response = await apiClient.post<Invoice>('/billing/invoices', data);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to create invoice', errorData);
      return { success: false, error: errorData };
    }
  },

  listInvoices: async (): Promise<ApiResponse<Invoice[]>> => {
    if (isNative) return billingLocal.listInvoices();
    try {
      const response = await apiClient.get<Invoice[]>('/billing/invoices');
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to fetch invoices', errorData);
      return { success: false, error: errorData };
    }
  },

  payInvoice: async (invoiceId: string, paymentMethod: string = 'CASH'): Promise<ApiResponse<Invoice>> => {
    if (isNative) return billingLocal.payInvoice(invoiceId, paymentMethod);
    try {
      const response = await apiClient.put<Invoice>(`/billing/invoices/${invoiceId}/pay`, {
        payment_method: paymentMethod
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = handleApiError(error as AxiosError);
      logger.error('Failed to pay invoice', errorData);
      return { success: false, error: errorData };
    }
  }
};

