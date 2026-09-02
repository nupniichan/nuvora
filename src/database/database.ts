import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | any = null;

/**
 * Creates an in-memory mock SQLite object for Web browser preview mode
 */
function createWebDbMock(): any {
  const store = new Map<string, any[]>();
  return {
    execAsync: async () => {},
    runAsync: async (sql: string, params: any[] = []) => {
      return { lastInsertRowId: 1, changes: 1 };
    },
    getAllAsync: async (sql: string, params: any[] = []) => {
      return [];
    },
    getFirstAsync: async (sql: string, params: any[] = []) => {
      return null;
    },
    withTransactionAsync: async (cb: () => Promise<void>) => {
      await cb();
    },
    closeAsync: async () => {},
  };
}

/**
 * Initializes and opens the SQLite database with SQLCipher DEK key
 */
export async function initDatabase(dekKeyHex?: string): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // On Web, return a safe mock to prevent native worker crash in browser preview
  if (Platform.OS === 'web') {
    dbInstance = createWebDbMock();
    return dbInstance;
  }

  // Open native SQLite database file on Android / iOS
  const db = await SQLite.openDatabaseAsync('nuvora.db');

  if (dekKeyHex) {
    // PRAGMA key for SQLCipher encryption at rest
    await db.execAsync(`PRAGMA key = "${dekKeyHex}";`);
  }

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Run migrations
  await runMigrations(db);

  dbInstance = db;
  return dbInstance;
}

/**
 * Returns current active DB instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    if (Platform.OS === 'web') {
      dbInstance = createWebDbMock();
      return dbInstance;
    }
    throw new Error('Database has not been initialized. Call initDatabase first.');
  }
  return dbInstance;
}

/**
 * Closes the database instance (useful during reset/restore)
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    if (Platform.OS !== 'web' && typeof dbInstance.closeAsync === 'function') {
      await dbInstance.closeAsync();
    }
    dbInstance = null;
  }
}
