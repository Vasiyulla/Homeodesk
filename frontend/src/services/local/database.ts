/**
 * Local SQLite Database Manager for Capacitor Android
 *
 * Handles:
 * - Opening the bundled homeopathy_android.db
 * - Copying from assets on first launch
 * - Providing query() and run() helper methods
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'homeopathy_android';
let db: SQLiteDBConnection | null = null;
let sqliteConnection: SQLiteConnection | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the SQLite database. Copies bundled DB from assets on first run.
 */
export async function initDatabase(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = _doInit();
  return initPromise;
}

async function _doInit(): Promise<void> {
  try {
    const platform = Capacitor.getPlatform();
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);

    if (platform === 'web') {
      // For web testing, use jeep-sqlite web component
      const jeepEl = document.createElement('jeep-sqlite');
      document.body.appendChild(jeepEl);
      await customElements.whenDefined('jeep-sqlite');
      await sqliteConnection.initWebStore();
    }

    // Check if database exists, if not copy from assets
    const dbExists = await sqliteConnection.isDatabase(DB_NAME);
    if (!dbExists.result) {
      // Copy the pre-bundled database from assets
      await sqliteConnection.copyFromAssets(false);
      console.log('[DB] Copied database from assets');
    }

    // Open the database
    db = await sqliteConnection.createConnection(
      DB_NAME,
      false,      // encrypted
      'no-encryption', // mode
      1,          // version
      false       // readonly
    );
    await db.open();
    console.log('[DB] Database opened successfully');

    // Enable WAL mode for better performance
    await db.query('PRAGMA journal_mode=WAL;');
    await db.query('PRAGMA foreign_keys=ON;');
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the active database connection. Initializes if not already done.
 */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (!db) {
    await initDatabase();
  }
  if (!db) {
    throw new Error('Database failed to initialize');
  }
  return db;
}

/**
 * Execute a SELECT query and return results.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const connection = await getDb();
  const result = await connection.query(sql, params);
  return (result.values || []) as T[];
}

/**
 * Execute an INSERT/UPDATE/DELETE statement.
 */
export async function run(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastId: number }> {
  const connection = await getDb();
  const result = await connection.run(sql, params);
  return {
    changes: result.changes?.changes || 0,
    lastId: result.changes?.lastId || 0,
  };
}

/**
 * Execute raw SQL (for DDL statements like CREATE TABLE).
 */
export async function execute(sql: string): Promise<void> {
  const connection = await getDb();
  await connection.execute(sql);
}

/**
 * Generate a UUID v4 string (for creating new records).
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current timestamp in ISO format.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
