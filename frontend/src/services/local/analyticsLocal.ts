/**
 * Local Analytics Service — Aggregate queries via SQLite.
 */

import { query } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse } from '../../types';
import type { AnalyticsSummary, WeeklyCount, TopRemedy, StaffActivityItem } from '../analyticsApi';

export const analyticsLocal = {
  getSummary: async (): Promise<ApiResponse<AnalyticsSummary>> => {
    try {
      const orgId = await getCurrentOrgId();

      const patients = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM patients WHERE organization_id = ?', [orgId]
      );
      const totalCases = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM cases WHERE organization_id = ?', [orgId]
      );
      const activeCases = await query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM cases WHERE organization_id = ? AND status != 'CLOSED'", [orgId]
      );
      const revenue = await query<{ total: number }>(
        "SELECT COALESCE(SUM(amount_due), 0) as total FROM invoices WHERE organization_id = ? AND status = 'PAID'", [orgId]
      );
      const pending = await query<{ total: number }>(
        "SELECT COALESCE(SUM(amount_due), 0) as total FROM invoices WHERE organization_id = ? AND status = 'PENDING'", [orgId]
      );
      const staff = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM organization_users WHERE organization_id = ?', [orgId]
      );

      return {
        success: true,
        data: {
          total_patients: patients[0]?.cnt || 0,
          total_cases: totalCases[0]?.cnt || 0,
          active_cases: activeCases[0]?.cnt || 0,
          closed_cases: (totalCases[0]?.cnt || 0) - (activeCases[0]?.cnt || 0),
          total_revenue: revenue[0]?.total || 0,
          pending_revenue: pending[0]?.total || 0,
          total_staff: staff[0]?.cnt || 0,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch analytics summary';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getCasesOverTime: async (weeks = 12): Promise<ApiResponse<WeeklyCount[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      const results: WeeklyCount[] = [];
      const now = new Date();

      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const rows = await query<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM cases
           WHERE organization_id = ? AND created_at >= ? AND created_at < ?`,
          [orgId, weekStart.toISOString(), weekEnd.toISOString()]
        );

        const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        results.push({ week_label: label, count: rows[0]?.cnt || 0 });
      }

      return { success: true, data: results };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch cases over time';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getTopRemedies: async (limit = 10): Promise<ApiResponse<TopRemedy[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      const rows = await query<TopRemedy>(
        `SELECT d.remedy_name, COUNT(d.id) as prescription_count
         FROM decisions d
         JOIN cases c ON d.case_id = c.id
         WHERE c.organization_id = ?
         GROUP BY d.remedy_name
         ORDER BY prescription_count DESC
         LIMIT ?`,
        [orgId, limit]
      );
      return { success: true, data: rows };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch top remedies';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getStaffActivity: async (): Promise<ApiResponse<StaffActivityItem[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      const activity: StaffActivityItem[] = [];

      // Doctors: count of cases
      const doctors = await query<{ id: string; full_name: string | null; cnt: number }>(
        `SELECT u.id, u.full_name, COUNT(c.id) as cnt
         FROM users u
         JOIN organization_users ou ON ou.user_id = u.id AND ou.organization_id = ? AND ou.role = 'DOCTOR'
         LEFT JOIN cases c ON c.assigned_doctor_id = u.id
         GROUP BY u.id, u.full_name`,
        [orgId]
      );
      for (const d of doctors) {
        activity.push({
          user_id: d.id, full_name: d.full_name, role: 'DOCTOR',
          metric_label: 'Cases Assigned', metric_value: d.cnt,
        });
      }

      // Nurses: count of dose logs
      const nurses = await query<{ id: string; full_name: string | null; cnt: number }>(
        `SELECT u.id, u.full_name, COUNT(dl.id) as cnt
         FROM users u
         JOIN organization_users ou ON ou.user_id = u.id AND ou.organization_id = ? AND ou.role = 'NURSE'
         LEFT JOIN dose_logs dl ON dl.administered_by_id = u.id
         GROUP BY u.id, u.full_name`,
        [orgId]
      );
      for (const n of nurses) {
        activity.push({
          user_id: n.id, full_name: n.full_name, role: 'NURSE',
          metric_label: 'Doses Administered', metric_value: n.cnt,
        });
      }

      return { success: true, data: activity };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch staff activity';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
