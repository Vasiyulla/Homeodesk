/**
 * Local Audit Log Service — Paginated queries via SQLite.
 */

import { query } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse } from '../../types';
import type { PaginatedAuditLogs, AuditLogFilters } from '../auditApi';

export const auditLocal = {
  getLogs: async (filters: AuditLogFilters = {}): Promise<ApiResponse<PaginatedAuditLogs>> => {
    try {
      const orgId = await getCurrentOrgId();
      const page = filters.page || 1;
      const pageSize = filters.page_size || 20;
      const offset = (page - 1) * pageSize;

      let whereClauses = ['al.organization_id = ?'];
      const params: unknown[] = [orgId];

      if (filters.action) {
        whereClauses.push('al.action = ?');
        params.push(filters.action);
      }
      if (filters.resource_type) {
        whereClauses.push('al.resource_type = ?');
        params.push(filters.resource_type);
      }
      if (filters.date_from) {
        whereClauses.push('al.created_at >= ?');
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        whereClauses.push('al.created_at <= ?');
        params.push(filters.date_to);
      }

      const whereStr = whereClauses.join(' AND ');

      // Get total count
      const countRows = await query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM audit_logs al WHERE ${whereStr}`,
        params
      );
      const total = countRows[0]?.cnt || 0;

      // Get paginated items
      const items = await query<Record<string, unknown>>(
        `SELECT al.*, u.full_name as actor_name
         FROM audit_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         WHERE ${whereStr}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      const mappedItems = items.map((row) => ({
        id: row.id as string,
        actor_id: (row.actor_id as string) || null,
        action: row.action as string,
        resource_type: row.resource_type as string,
        resource_id: (row.resource_id as string) || null,
        payload_json: row.payload_json ? JSON.parse(row.payload_json as string) : null,
        ip_address: (row.ip_address as string) || null,
        created_at: row.created_at as string,
        actor_name: (row.actor_name as string) || null,
      }));

      return {
        success: true,
        data: {
          items: mappedItems,
          total,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch audit logs';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
