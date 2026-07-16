/**
 * Local Follow-Up Service — CRUD via SQLite.
 */

import { query, run, generateUUID, nowISO } from './database';
import type { FollowUp, FollowUpCreate, ApiResponse } from '../../types';

export const followUpLocal = {
  createFollowUp: async (caseId: string, data: FollowUpCreate): Promise<ApiResponse<FollowUp>> => {
    try {
      const id = generateUUID();
      const now = nowISO();

      await run(
        `INSERT INTO follow_ups (id, case_id, decision_id, days_since_dose, reaction,
         observations, new_symptoms, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, caseId,
          data.decision_id || null,
          data.days_since_dose || null,
          data.reaction || null,
          data.observations || null,
          data.new_symptoms ? JSON.stringify(data.new_symptoms) : null,
          data.notes || null,
          now,
        ]
      );

      // Update case status
      await run(
        `UPDATE cases SET status = 'UNDER_OBSERVATION', updated_at = ? WHERE id = ?`,
        [now, caseId]
      );

      return {
        success: true,
        data: {
          id,
          case_id: caseId,
          decision_id: data.decision_id || null,
          days_since_dose: data.days_since_dose || null,
          reaction: data.reaction || null,
          observations: data.observations || null,
          new_symptoms: (data.new_symptoms as FollowUp['new_symptoms']) || null,
          notes: data.notes || null,
          created_at: now,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create follow-up';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getFollowUps: async (caseId: string): Promise<ApiResponse<FollowUp[]>> => {
    try {
      const rows = await query<Record<string, unknown>>(
        'SELECT * FROM follow_ups WHERE case_id = ? ORDER BY created_at DESC',
        [caseId]
      );

      const followUps: FollowUp[] = rows.map((row) => ({
        id: row.id as string,
        case_id: row.case_id as string,
        decision_id: (row.decision_id as string) || null,
        days_since_dose: (row.days_since_dose as number) || null,
        reaction: (row.reaction as string) || null,
        observations: (row.observations as string) || null,
        new_symptoms: row.new_symptoms
          ? JSON.parse(row.new_symptoms as string)
          : null,
        notes: (row.notes as string) || null,
        created_at: row.created_at as string,
      }));

      return { success: true, data: followUps };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch follow-ups';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
