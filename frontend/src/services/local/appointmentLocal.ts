/**
 * Local Appointment Service — CRUD via SQLite.
 */

import { query, run, generateUUID, nowISO } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse } from '../../types';
import type { Appointment, AppointmentCreate } from '../appointmentApi';

export const appointmentLocal = {
  list: async (): Promise<ApiResponse<Appointment[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      const rows = await query<Appointment>(
        `SELECT * FROM appointments WHERE organization_id = ? ORDER BY scheduled_time DESC`,
        [orgId]
      );
      return { success: true, data: rows };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch appointments';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  create: async (data: AppointmentCreate): Promise<ApiResponse<Appointment>> => {
    try {
      const id = generateUUID();
      const orgId = await getCurrentOrgId();
      const userId = localStorage.getItem('access_token');
      const now = nowISO();

      await run(
        `INSERT INTO appointments (id, patient_id, doctor_id, organization_id, scheduled_time, status, is_emergency, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.patient_id, data.doctor_id || userId, orgId, data.scheduled_time, data.status || 'scheduled', data.is_emergency ? 1 : 0, now]
      );

      return {
        success: true,
        data: {
          id, patient_id: data.patient_id, doctor_id: data.doctor_id || userId,
          organization_id: orgId, scheduled_time: data.scheduled_time,
          status: data.status || 'scheduled', is_emergency: data.is_emergency || false,
          appointment_type: data.appointment_type || 'in_person',
          meeting_link: data.meeting_link || null,
          checked_in_at: null,
          created_at: now,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create appointment';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  checkIn: async (id: string): Promise<ApiResponse<Appointment>> => {
    try {
      await run(`UPDATE appointments SET status = 'arrived' WHERE id = ?`, [id]);
      const rows = await query<Appointment>('SELECT * FROM appointments WHERE id = ?', [id]);
      return { success: true, data: rows[0] };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to check in';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  complete: async (id: string): Promise<ApiResponse<Appointment>> => {
    try {
      await run(`UPDATE appointments SET status = 'completed' WHERE id = ?`, [id]);
      const rows = await query<Appointment>('SELECT * FROM appointments WHERE id = ?', [id]);
      return { success: true, data: rows[0] };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to complete appointment';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
