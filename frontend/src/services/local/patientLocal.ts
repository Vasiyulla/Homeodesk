/**
 * Local Patient Service — CRUD operations via SQLite.
 */

import { query, run, generateUUID, nowISO } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse, Patient, PatientCreate } from '../../types';
import type { PatientDetail, PatientVital } from '../patientApi';

export const patientLocal = {
  list: async (searchQuery?: string): Promise<ApiResponse<Patient[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      let sql = `SELECT * FROM patients WHERE organization_id = ?`;
      const params: unknown[] = [orgId];

      if (searchQuery) {
        sql += ` AND (name LIKE ? OR display_id LIKE ?)`;
        params.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }

      sql += ` ORDER BY created_at DESC`;

      const rows = await query<Record<string, unknown>>(sql, params);
      const patients: Patient[] = rows.map(mapRowToPatient);
      return { success: true, data: patients };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch patients';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getById: async (id: string): Promise<ApiResponse<PatientDetail>> => {
    try {
      const rows = await query<Record<string, unknown>>(
        'SELECT * FROM patients WHERE id = ?', [id]
      );
      if (rows.length === 0) {
        return { success: false, error: { status: 404, message: 'Patient not found', errors: null } };
      }

      const patient = mapRowToPatient(rows[0]);

      // Get related cases
      const cases = await query<{
        id: string; status: string; chief_complaint: string | null; created_at: string;
      }>(
        `SELECT id, status, chief_complaint, created_at FROM cases
         WHERE patient_id = ? ORDER BY created_at DESC`,
        [id]
      );

      return {
        success: true,
        data: { ...patient, cases } as PatientDetail,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch patient';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  create: async (data: PatientCreate): Promise<ApiResponse<Patient>> => {
    try {
      const id = generateUUID();
      const orgId = await getCurrentOrgId();
      const now = nowISO();

      // Generate display ID (PAT-001, PAT-002, etc.)
      const countRows = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM patients WHERE organization_id = ?',
        [orgId]
      );
      const displayId = `PAT-${String((countRows[0]?.cnt || 0) + 1).padStart(3, '0')}`;

      await run(
        `INSERT INTO patients (id, organization_id, display_id, name, age, gender, contact_info, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, orgId, displayId, data.name, data.age || null,
          data.gender || null,
          data.contact_info ? JSON.stringify(data.contact_info) : null,
          now,
        ]
      );

      const patient: Patient = {
        id,
        organization_id: orgId || undefined,
        display_id: displayId,
        name: data.name,
        age: data.age,
        gender: data.gender,
        contact_info: data.contact_info,
        created_at: now,
      };

      return { success: true, data: patient };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create patient';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  addVitals: async (patientId: string, vitals: Partial<PatientVital>): Promise<ApiResponse<PatientVital>> => {
    try {
      const id = generateUUID();
      const userId = localStorage.getItem('access_token');
      const orgId = await getCurrentOrgId();
      const now = nowISO();

      await run(
        `INSERT INTO patient_vitals (id, patient_id, recorded_by_id, organization_id,
         height, weight, blood_pressure, temperature, pulse, notes, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, patientId, userId, orgId,
          vitals.height || null, vitals.weight || null,
          vitals.blood_pressure || null, vitals.temperature || null,
          vitals.pulse || null, vitals.notes || null, now,
        ]
      );

      return {
        success: true,
        data: {
          id,
          patient_id: patientId,
          recorded_by_id: userId || '',
          height: vitals.height,
          weight: vitals.weight,
          blood_pressure: vitals.blood_pressure,
          temperature: vitals.temperature,
          pulse: vitals.pulse,
          notes: vitals.notes,
          recorded_at: now,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to add vitals';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getVitals: async (patientId: string): Promise<ApiResponse<PatientVital[]>> => {
    try {
      const rows = await query<PatientVital>(
        'SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC',
        [patientId]
      );
      return { success: true, data: rows };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch vitals';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};

function mapRowToPatient(row: Record<string, unknown>): Patient {
  let contactInfo = undefined;
  if (row.contact_info && typeof row.contact_info === 'string') {
    try { contactInfo = JSON.parse(row.contact_info); } catch { /* ignore */ }
  }
  return {
    id: row.id as string,
    organization_id: row.organization_id as string | undefined,
    display_id: row.display_id as string | undefined,
    name: row.name as string,
    age: row.age as number | undefined,
    gender: row.gender as string | undefined,
    contact_info: contactInfo,
    created_at: row.created_at as string,
  };
}
