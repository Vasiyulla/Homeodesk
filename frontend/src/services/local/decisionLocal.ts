/**
 * Local Decision Service — CRUD via SQLite.
 */

import { query, run, generateUUID, nowISO } from './database';
import type { Decision, DecisionCreate, ApiResponse } from '../../types';

export const decisionLocal = {
  createDecision: async (caseId: string, data: DecisionCreate): Promise<ApiResponse<Decision>> => {
    try {
      const id = generateUUID();
      const now = nowISO();

      await run(
        `INSERT INTO decisions (id, case_id, remedy_name, potency, dose, reasoning,
         rejected_remedies, supporting_rubrics, confidence, dispense_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, caseId, data.remedy_name,
          data.potency || null, data.dose || null,
          data.reasoning || null,
          data.rejected_remedies ? JSON.stringify(data.rejected_remedies) : null,
          data.supporting_rubrics ? JSON.stringify(data.supporting_rubrics) : null,
          data.confidence || 'medium', 'PENDING', now,
        ]
      );

      // Update case status and remedy
      await run(
        `UPDATE cases SET status = 'REMEDY_PRESCRIBED', remedy_name = ?, potency = ?, updated_at = ?
         WHERE id = ?`,
        [data.remedy_name, data.potency || null, now, caseId]
      );

      return {
        success: true,
        data: {
          id,
          case_id: caseId,
          remedy_name: data.remedy_name,
          potency: data.potency || null,
          dose: data.dose || null,
          reasoning: data.reasoning || null,
          rejected_remedies: data.rejected_remedies || null,
          supporting_rubrics: data.supporting_rubrics || null,
          confidence: data.confidence || 'medium',
          created_at: now,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create decision';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getDecisions: async (caseId: string): Promise<ApiResponse<Decision[]>> => {
    try {
      const rows = await query<Record<string, unknown>>(
        'SELECT * FROM decisions WHERE case_id = ? ORDER BY created_at DESC',
        [caseId]
      );

      const decisions: Decision[] = rows.map((row) => ({
        id: row.id as string,
        case_id: row.case_id as string,
        remedy_name: row.remedy_name as string,
        potency: (row.potency as string) || null,
        dose: (row.dose as string) || null,
        reasoning: (row.reasoning as string) || null,
        rejected_remedies: row.rejected_remedies
          ? JSON.parse(row.rejected_remedies as string)
          : null,
        supporting_rubrics: row.supporting_rubrics
          ? JSON.parse(row.supporting_rubrics as string)
          : null,
        confidence: (row.confidence as string) || 'medium',
        created_at: row.created_at as string,
      }));

      return { success: true, data: decisions };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch decisions';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
