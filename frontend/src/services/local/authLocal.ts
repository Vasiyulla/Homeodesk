/**
 * Local Auth Service — Replaces HTTP auth API for offline Android.
 *
 * Uses local SQLite to manage users. On first launch, auto-creates
 * a default admin account. No JWT needed offline.
 */

import { query, run, generateUUID, nowISO } from './database';
import type { User, TokenResponse, ApiResponse } from '../../types';

// Simple in-memory session
let currentUser: (User & { organization_id?: string }) | null = null;

// Simple bcrypt-like hash using SHA-256 (good enough for local offline use)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_homeopathy_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

/**
 * Ensure default tables and a default admin user exist on first launch.
 */
export async function ensureDefaultUser(): Promise<void> {
  // Check if any users exist
  const users = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
  if (users[0]?.cnt > 0) return;

  // Create a default organization and user
  const orgId = generateUUID();
  const userId = generateUUID();
  const now = nowISO();
  const hashedPw = await hashPassword('admin123');

  await run(
    `INSERT INTO organizations (id, name, clinic_type, subscription_tier, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [orgId, 'My Clinic', 'General', 'free', now]
  );

  await run(
    `INSERT INTO users (id, email, hashed_password, full_name, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'admin@clinic.local', hashedPw, 'Dr. Admin', 1, now]
  );

  await run(
    `INSERT INTO organization_users (id, organization_id, user_id, role)
     VALUES (?, ?, ?, ?)`,
    [generateUUID(), orgId, userId, 'OWNER']
  );

  console.log('[Auth] Default admin user created: admin@clinic.local / admin123');
}

export const authLocal = {
  register: async (data: {
    email: string;
    password: string;
    full_name?: string;
    license_number?: string;
    clinic_name?: string;
    clinic_type?: string;
    employee_count?: string;
  }): Promise<ApiResponse<User>> => {
    try {
      // Check if email already exists
      const existing = await query<{ id: string }>(
        'SELECT id FROM users WHERE email = ?',
        [data.email]
      );
      if (existing.length > 0) {
        return {
          success: false,
          error: { status: 409, message: 'An account with this email already exists', errors: null },
        };
      }

      const userId = generateUUID();
      const orgId = generateUUID();
      const now = nowISO();
      const hashedPw = await hashPassword(data.password);

      // Create org
      await run(
        `INSERT INTO organizations (id, name, clinic_type, employee_count, subscription_tier, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orgId, data.clinic_name || `${data.full_name || 'Doctor'}'s Clinic`, data.clinic_type || '', data.employee_count || '', 'free', now]
      );

      // Create user
      await run(
        `INSERT INTO users (id, email, hashed_password, full_name, license_number, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, data.email, hashedPw, data.full_name || '', data.license_number || '', 1, now]
      );

      // Link user to org
      await run(
        `INSERT INTO organization_users (id, organization_id, user_id, role)
         VALUES (?, ?, ?, ?)`,
        [generateUUID(), orgId, userId, 'OWNER']
      );

      const user: User = {
        id: userId,
        email: data.email,
        full_name: data.full_name || null,
        license_number: data.license_number || null,
        is_active: true,
        role: 'OWNER',
        organization_id: orgId,
        created_at: now,
      };

      currentUser = user;
      return { success: true, data: user };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  login: async (email: string, password: string): Promise<ApiResponse<TokenResponse>> => {
    try {
      const rows = await query<{
        id: string;
        email: string;
        hashed_password: string;
        full_name: string | null;
        license_number: string | null;
        is_active: number;
        created_at: string;
      }>('SELECT * FROM users WHERE email = ?', [email]);

      if (rows.length === 0) {
        return {
          success: false,
          error: { status: 401, message: 'Incorrect email or password', errors: null },
        };
      }

      const row = rows[0];
      const valid = await verifyPassword(password, row.hashed_password);
      if (!valid) {
        return {
          success: false,
          error: { status: 401, message: 'Incorrect email or password', errors: null },
        };
      }

      if (!row.is_active) {
        return {
          success: false,
          error: { status: 403, message: 'Account is deactivated', errors: null },
        };
      }

      // Get role and org
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

      currentUser = {
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

      // Store a simple session token (just the user ID for offline use)
      localStorage.setItem('access_token', row.id);

      return {
        success: true,
        data: { access_token: row.id, token_type: 'bearer' },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    try {
      if (currentUser) {
        return { success: true, data: currentUser };
      }

      // Try to restore from localStorage
      const userId = localStorage.getItem('access_token');
      if (!userId) {
        return {
          success: false,
          error: { status: 401, message: 'Not authenticated', errors: null },
        };
      }

      const rows = await query<{
        id: string;
        email: string;
        full_name: string | null;
        license_number: string | null;
        is_active: number;
        created_at: string;
      }>('SELECT * FROM users WHERE id = ?', [userId]);

      if (rows.length === 0) {
        return {
          success: false,
          error: { status: 401, message: 'User not found', errors: null },
        };
      }

      const row = rows[0];
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

      currentUser = {
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

      return { success: true, data: currentUser };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch profile';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};

/**
 * Get the current user's organization ID. Used by many local services.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const userId = localStorage.getItem('access_token');
  if (!userId) return null;
  const rows = await query<{ organization_id: string }>(
    'SELECT organization_id FROM organization_users WHERE user_id = ?',
    [userId]
  );
  return rows[0]?.organization_id || null;
}

/**
 * Get the current user ID from local session.
 */
export function getCurrentUserId(): string | null {
  return localStorage.getItem('access_token');
}
