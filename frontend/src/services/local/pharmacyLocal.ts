/**
 * Local Pharmacy Service — Dispensing queue via SQLite.
 */

import { query, run, nowISO } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse } from '../../types';
import type { PrescriptionItem, PharmacyStats } from '../pharmacyApi';

export const pharmacyLocal = {
  getQueue: async (status: 'PENDING' | 'DISPENSED' = 'PENDING'): Promise<ApiResponse<PrescriptionItem[]>> => {
    try {
      const orgId = await getCurrentOrgId();

      const rows = await query<PrescriptionItem>(
        `SELECT d.id as decision_id, d.case_id, p.name as patient_name, p.age as patient_age,
                p.gender as patient_gender, d.remedy_name, d.potency, d.dose,
                u.full_name as doctor_name, d.created_at as prescribed_at,
                d.dispense_status, d.dispensed_at
         FROM decisions d
         JOIN cases c ON d.case_id = c.id
         LEFT JOIN patients p ON c.patient_id = p.id
         LEFT JOIN users u ON c.assigned_doctor_id = u.id
         WHERE c.organization_id = ? AND d.dispense_status = ?
         ORDER BY d.created_at DESC`,
        [orgId, status]
      );

      return { success: true, data: rows };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch pharmacy queue';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getStats: async (): Promise<ApiResponse<PharmacyStats>> => {
    try {
      const orgId = await getCurrentOrgId();
      const today = new Date().toISOString().split('T')[0];

      const pendingRows = await query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM decisions d
         JOIN cases c ON d.case_id = c.id
         WHERE c.organization_id = ? AND d.dispense_status = 'PENDING'`,
        [orgId]
      );

      const dispensedRows = await query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM decisions d
         JOIN cases c ON d.case_id = c.id
         WHERE c.organization_id = ? AND d.dispense_status = 'DISPENSED'
         AND d.dispensed_at >= ?`,
        [orgId, today]
      );

      return {
        success: true,
        data: {
          pending: pendingRows[0]?.cnt || 0,
          dispensed_today: dispensedRows[0]?.cnt || 0,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch pharmacy stats';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  dispense: async (decisionId: string, _notes?: string): Promise<ApiResponse<{ status: string; message: string }>> => {
    try {
      const now = nowISO();
      const userId = localStorage.getItem('access_token');

      await run(
        `UPDATE decisions SET dispense_status = 'DISPENSED', dispensed_at = ?, dispensed_by_id = ?
         WHERE id = ?`,
        [now, userId, decisionId]
      );

      return {
        success: true,
        data: { status: 'DISPENSED', message: 'Prescription dispensed successfully' },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to dispense';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
