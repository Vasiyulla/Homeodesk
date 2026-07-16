/**
 * Local Staff Service — Fetch clinic staff members via SQLite.
 */

import { query } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse } from '../../types';
import type { StaffMember } from '../staffApi';

export const staffLocal = {
  getStaff: async (): Promise<ApiResponse<StaffMember[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      if (!orgId) {
        return { success: true, data: [] };
      }

      // Query staff members from organization_users joined with users and optionally departments
      const rows = await query<{
        user_id: string;
        email: string;
        full_name: string | null;
        role: string;
        department_name: string | null;
      }>(
        `SELECT u.id as user_id, u.email, u.full_name, ou.role, d.name as department_name
         FROM users u
         JOIN organization_users ou ON u.id = ou.user_id
         LEFT JOIN employee_profiles ep ON u.id = ep.user_id
         LEFT JOIN departments d ON ep.department_id = d.id
         WHERE ou.organization_id = ?`,
        [orgId]
      );

      const staff: StaffMember[] = rows.map((row) => ({
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        department: row.department_name,
      }));

      return { success: true, data: staff };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch staff';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
