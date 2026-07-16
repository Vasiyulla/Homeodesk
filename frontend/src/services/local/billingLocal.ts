/**
 * Local Billing Service — Invoice CRUD via SQLite.
 */

import { query, run, generateUUID, nowISO } from './database';
import { getCurrentOrgId } from './authLocal';
import type { ApiResponse, Invoice, InvoiceCreate } from '../../types';

export const billingLocal = {
  createInvoice: async (data: InvoiceCreate): Promise<ApiResponse<Invoice>> => {
    try {
      const id = generateUUID();
      const orgId = await getCurrentOrgId();
      const now = nowISO();
      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

      await run(
        `INSERT INTO invoices (id, organization_id, patient_id, case_id, amount_due, status, due_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, orgId, data.patient_id, data.case_id || null, totalAmount, 'PENDING', data.due_date || null, now]
      );

      // Insert invoice items
      for (const item of data.items) {
        await run(
          `INSERT INTO invoice_items (id, invoice_id, description, amount)
           VALUES (?, ?, ?, ?)`,
          [generateUUID(), id, item.description, item.amount]
        );
      }

      return {
        success: true,
        data: {
          id, organization_id: orgId || '', patient_id: data.patient_id,
          case_id: data.case_id, amount_due: totalAmount, status: 'PENDING',
          due_date: data.due_date, created_at: now,
          items: data.items.map((item, i) => ({ id: `item-${i}`, ...item })),
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create invoice';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  listInvoices: async (): Promise<ApiResponse<Invoice[]>> => {
    try {
      const orgId = await getCurrentOrgId();
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM invoices WHERE organization_id = ? ORDER BY created_at DESC`,
        [orgId]
      );

      const invoices: Invoice[] = [];
      for (const row of rows) {
        const items = await query<{ id: string; description: string; amount: number }>(
          'SELECT * FROM invoice_items WHERE invoice_id = ?',
          [row.id]
        );
        invoices.push({
          id: row.id as string,
          organization_id: row.organization_id as string,
          patient_id: row.patient_id as string,
          case_id: row.case_id as string | undefined,
          amount_due: row.amount_due as number,
          status: row.status as string,
          payment_method: row.payment_method as string | undefined,
          due_date: row.due_date as string | undefined,
          created_at: row.created_at as string,
          items,
        });
      }

      return { success: true, data: invoices };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch invoices';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  payInvoice: async (invoiceId: string, paymentMethod: string = 'CASH'): Promise<ApiResponse<Invoice>> => {
    try {
      await run(
        `UPDATE invoices SET status = 'PAID', payment_method = ? WHERE id = ?`,
        [paymentMethod, invoiceId]
      );

      const rows = await query<Record<string, unknown>>(
        'SELECT * FROM invoices WHERE id = ?', [invoiceId]
      );
      const items = await query<{ id: string; description: string; amount: number }>(
        'SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]
      );

      const row = rows[0];
      return {
        success: true,
        data: {
          id: row.id as string,
          organization_id: row.organization_id as string,
          patient_id: row.patient_id as string,
          case_id: row.case_id as string | undefined,
          amount_due: row.amount_due as number,
          status: 'PAID',
          payment_method: paymentMethod,
          due_date: row.due_date as string | undefined,
          created_at: row.created_at as string,
          items,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to pay invoice';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
