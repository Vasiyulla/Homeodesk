/**
 * Local User Service — Manage user profiles via SQLite.
 */

import { query } from './database';
import type { User, ApiResponse } from '../../types';

export const userLocal = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    // Reuse authLocal profile check
    const userId = localStorage.getItem('access_token');
    if (!userId) {
      return { success: false, error: { status: 401, message: 'Not authenticated', errors: null } };
    }
    return userLocal.getUser(userId);
  },

  getUser: async (userId: string): Promise<ApiResponse<User>> => {
    try {
      const rows = await query<{
        id: string;
        email: string;
        full_name: string | null;
        license_number: string | null;
        is_active: number;
        created_at: string;
      }>('SELECT * FROM users WHERE id = ?', [userId]);

      if (rows.length === 0) {
        return { success: false, error: { status: 404, message: 'User not found', errors: null } };
      }

      const row = rows[0];

      // Get org role
      const orgRows = await query<{ organization_id: string; role: string }>(
        'SELECT organization_id, role FROM organization_users WHERE user_id = ?',
        [row.id]
      );

      let orgName: string | undefined;
      if (orgRows.length > 0) {
        const orgResult = await query<{ name: string }>(
          'SELECT name FROM organizations WHERE id = ?',
          [orgRows[0].organization_id]
        );
        orgName = orgResult[0]?.name;
      }

      const user: User = {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        license_number: row.license_number,
        is_active: !!row.is_active,
        role: orgRows[0]?.role,
        organization_id: orgRows[0]?.organization_id,
        organization_name: orgName,
        created_at: row.created_at,
      };

      return { success: true, data: user };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch user';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
