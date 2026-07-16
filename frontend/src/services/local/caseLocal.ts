/**
 * Local Case Service — CRUD operations on the cases table via SQLite.
 */

import { query, run, generateUUID, nowISO } from './database';
import { getCurrentUserId, getCurrentOrgId } from './authLocal';
import type { Case, CaseCreate, CaseUpdate, AuditTrailResponse, ApiResponse } from '../../types';

export const caseLocal = {
  createCase: async (caseData: CaseCreate): Promise<ApiResponse<Case>> => {
    try {
      const id = generateUUID();
      const now = nowISO();
      const userId = getCurrentUserId();
      const orgId = await getCurrentOrgId();

      await run(
        `INSERT INTO cases (id, organization_id, patient_id, assigned_doctor_id, created_by_id,
         status, chief_complaint, case_notes, symptoms, mode, remedy_name, potency, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, orgId, caseData.patient_id || null, userId, userId,
          'DRAFT', caseData.chief_complaint || null, caseData.case_notes || null,
          caseData.symptoms ? JSON.stringify(caseData.symptoms) : null,
          caseData.mode || 'clinical', caseData.remedy_name || null,
          caseData.potency || null, now, now,
        ]
      );

      // Fetch the created case with patient info
      return await caseLocal.getCase(id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create case';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getCase: async (caseId: string): Promise<ApiResponse<Case>> => {
    try {
      const rows = await query<Record<string, unknown>>(
        `SELECT c.*, p.name as patient_name, p.age as patient_age,
                p.gender as patient_gender, p.display_id as patient_display_id
         FROM cases c
         LEFT JOIN patients p ON c.patient_id = p.id
         WHERE c.id = ?`,
        [caseId]
      );

      if (rows.length === 0) {
        return { success: false, error: { status: 404, message: 'Case not found', errors: null } };
      }

      const row = rows[0];
      const caseItem = mapRowToCase(row);
      return { success: true, data: caseItem };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch case';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  updateCase: async (caseId: string, caseData: CaseUpdate): Promise<ApiResponse<Case>> => {
    try {
      const now = nowISO();
      const sets: string[] = ['updated_at = ?'];
      const params: unknown[] = [now];

      if (caseData.case_notes !== undefined) {
        sets.push('case_notes = ?');
        params.push(caseData.case_notes);
      }
      if (caseData.symptoms !== undefined) {
        sets.push('symptoms = ?');
        params.push(JSON.stringify(caseData.symptoms));
      }
      if (caseData.remedy_name !== undefined) {
        sets.push('remedy_name = ?');
        params.push(caseData.remedy_name);
      }
      if (caseData.potency !== undefined) {
        sets.push('potency = ?');
        params.push(caseData.potency);
      }
      if (caseData.rag_analysis !== undefined) {
        sets.push('rag_analysis = ?');
        params.push(JSON.stringify(caseData.rag_analysis));
      }

      params.push(caseId);
      await run(`UPDATE cases SET ${sets.join(', ')} WHERE id = ?`, params);

      return await caseLocal.getCase(caseId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update case';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  listMyCases: async (): Promise<ApiResponse<Case[]>> => {
    try {
      const orgId = await getCurrentOrgId();

      const rows = await query<Record<string, unknown>>(
        `SELECT c.*, p.name as patient_name, p.age as patient_age,
                p.gender as patient_gender, p.display_id as patient_display_id
         FROM cases c
         LEFT JOIN patients p ON c.patient_id = p.id
         WHERE c.organization_id = ?
         ORDER BY c.created_at DESC`,
        [orgId]
      );

      const cases = rows.map(mapRowToCase);
      return { success: true, data: cases };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch cases';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getAuditTrail: async (caseId: string): Promise<ApiResponse<AuditTrailResponse>> => {
    try {
      // Get patient name
      const caseRows = await query<{ patient_name: string }>(
        `SELECT p.name as patient_name FROM cases c
         LEFT JOIN patients p ON c.patient_id = p.id
         WHERE c.id = ?`,
        [caseId]
      );

      // Get decisions
      const decisions = await query<Record<string, unknown>>(
        'SELECT * FROM decisions WHERE case_id = ? ORDER BY created_at',
        [caseId]
      );

      // Get follow-ups
      const followUps = await query<Record<string, unknown>>(
        'SELECT * FROM follow_ups WHERE case_id = ? ORDER BY created_at',
        [caseId]
      );

      const trail = [
        ...decisions.map((d) => ({
          type: 'decision' as const,
          timestamp: d.created_at as string,
          remedy: d.remedy_name as string,
          confidence: d.confidence as string,
          reasoning: d.reasoning as string,
        })),
        ...followUps.map((f) => ({
          type: 'follow-up' as const,
          timestamp: f.created_at as string,
          reaction: f.reaction as string,
          observations: f.observations as string,
        })),
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        success: true,
        data: {
          case_id: caseId,
          patient: caseRows[0]?.patient_name || 'Unknown',
          audit_trail: trail,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch audit trail';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};

function mapRowToCase(row: Record<string, unknown>): Case {
  let symptoms = null;
  if (row.symptoms && typeof row.symptoms === 'string') {
    try { symptoms = JSON.parse(row.symptoms); } catch { symptoms = null; }
  }
  let ragAnalysis = null;
  if (row.rag_analysis && typeof row.rag_analysis === 'string') {
    try { ragAnalysis = JSON.parse(row.rag_analysis); } catch { ragAnalysis = null; }
  }

  return {
    id: row.id as string,
    patient_id: row.patient_id as string | undefined,
    patient_name: row.patient_name as string | undefined,
    patient_display_id: row.patient_display_id as string | undefined,
    patient_age: row.patient_age as number | undefined,
    patient_gender: row.patient_gender as string | undefined,
    status: row.status as string,
    assigned_doctor_id: row.assigned_doctor_id as string | undefined,
    created_by_id: row.created_by_id as string | undefined,
    chief_complaint: (row.chief_complaint as string) || null,
    case_notes: (row.case_notes as string) || null,
    symptoms,
    mode: (row.mode as string) || 'clinical',
    rag_analysis: ragAnalysis,
    remedy_name: (row.remedy_name as string) || null,
    potency: (row.potency as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
