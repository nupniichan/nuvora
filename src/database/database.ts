import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { STARTER_TEMPLATES } from '@/features/categories/starter-templates';
import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | any = null;

/**
 * Creates an in-memory mock SQLite object for Web browser preview mode
 */
function createWebDbMock(): any {
  const STORAGE_KEY = 'nuvora_web_db_tables';
  let tables: Record<string, any[]> = {
    app_settings: [],
    accounts: [],
    category_groups: [],
    categories: [],
    recurring_rules: [],
    automation_occurrences: [],
    transactions: [],
    budgets: [],
    budget_allocations: [],
    financial_goals: [],
    goal_contributions: [],
    audit_logs: [],
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) tables = { ...tables, ...JSON.parse(raw) };
    }
  } catch {}

  const save = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
      }
    } catch {}
  };

  // Auto seed starter categories if none exist
  if (!tables.categories || tables.categories.length === 0) {
    const now = new Date().toISOString();
    let gSort = 1;
    tables.category_groups = [];
    tables.categories = [];
    for (const group of STARTER_TEMPLATES) {
      const gId = 'cg_' + gSort;
      tables.category_groups.push({
        id: gId,
        name: group.nameVi,
        icon: group.icon,
        color: group.color,
        sort_order: gSort++,
        type: group.type,
        is_system: 1,
        created_at: now,
      });
      let cSort = 1;
      for (const cat of group.categories) {
        const cId = `cat_${gSort}_${cSort}`;
        tables.categories.push({
          id: cId,
          group_id: gId,
          name: cat.nameVi,
          icon: cat.icon,
          color: cat.color,
          sort_order: cSort++,
          is_archived: 0,
          created_at: now,
        });
      }
    }
    save();
  }

  // Auto seed default account if none exists
  if (!tables.accounts || tables.accounts.length === 0) {
    tables.accounts = [
      {
        id: 'acc_cash_default',
        name: 'Tiền mặt',
        type: 'cash',
        currency: 'VND',
        balance: 0,
        is_archived: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    save();
  }

  return {
    execAsync: async () => {},
    runAsync: async (sql: string, params: any[] = []) => {
      const trimmed = sql.trim().replace(/;$/, '');
      let changes = 0;
      if (/^INSERT/i.test(trimmed)) {
        const match = trimmed.match(/INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (match) {
          const tName = match[1].toLowerCase();
          const cols = match[2].split(',').map((c) => c.trim());
          const vals = match[3].split(',').map((v) => v.trim());
          if (!tables[tName]) tables[tName] = [];
          const row: any = {};
          let pIdx = 0;
          for (let i = 0; i < cols.length; i++) {
            row[cols[i]] = vals[i] === '?' ? params[pIdx++] : vals[i].replace(/^'|'$/g, '');
          }
          const pk = row.id ? 'id' : row.key ? 'key' : null;
          if (pk) {
            const idx = tables[tName].findIndex((r) => r[pk] === row[pk]);
            if (idx >= 0) tables[tName][idx] = { ...tables[tName][idx], ...row };
            else tables[tName].push(row);
          } else tables[tName].push(row);
          changes = 1;
          save();
        }
      } else if (/^UPDATE/i.test(trimmed)) {
        const uMatch = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?$/i);
        if (uMatch) {
          const tName = uMatch[1].toLowerCase();
          const sets = uMatch[2].split(',').map((s) => s.trim());
          const wherePart = uMatch[3] ? uMatch[3].trim() : '';

          if (tables[tName]) {
            // Count ? in sets
            let setParamCount = 0;
            for (const s of sets) {
              const qCount = (s.match(/\?/g) || []).length;
              setParamCount += qCount;
            }
            const setParams = params.slice(0, setParamCount);
            const whereParams = params.slice(setParamCount);

            tables[tName] = tables[tName].map((row) => {
              let matchWhere = true;
              if (wherePart) {
                let wpIdx = 0;
                if (/id\s*=\s*\?/i.test(wherePart)) {
                  matchWhere = matchWhere && (row.id === whereParams[wpIdx++]);
                }
                if (/budget_id\s*=\s*\?/i.test(wherePart)) {
                  matchWhere = matchWhere && (row.budget_id === whereParams[wpIdx++]);
                }
                if (/category_id\s*=\s*\?/i.test(wherePart)) {
                  matchWhere = matchWhere && (row.category_id === whereParams[wpIdx++]);
                }
              }

              if (matchWhere) {
                const u = { ...row };
                let spIdx = 0;
                for (const assign of sets) {
                  const plus = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\1\s*\+\s*\?/);
                  const minus = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\1\s*-\s*\?/);
                  const simple = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\?/);
                  const constant = assign.match(/([a-zA-Z0-9_]+)\s*=\s*([^?]+)/);
                  if (plus) u[plus[1]] = (Number(u[plus[1]]) || 0) + Number(setParams[spIdx++]);
                  else if (minus) u[minus[1]] = (Number(u[minus[1]]) || 0) - Number(setParams[spIdx++]);
                  else if (simple) u[simple[1]] = setParams[spIdx++];
                  else if (constant) {
                    const cVal = constant[2].trim().replace(/^'|'$/g, '');
                    u[constant[1]] = !isNaN(Number(cVal)) ? Number(cVal) : cVal;
                  }
                }
                changes++;
                return u;
              }
              return row;
            });
            save();
          }
        }
      } else if (/^DELETE/i.test(trimmed)) {
        const dMatch = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*))?$/i);
        if (dMatch && tables[dMatch[1].toLowerCase()]) {
          const tName = dMatch[1].toLowerCase();
          const wherePart = dMatch[2] ? dMatch[2].trim() : '';
          let pIdx = 0;
          tables[tName] = tables[tName].filter((row) => {
            if (!wherePart) return false;
            let keep = true;
            if (/id\s*=\s*\?/i.test(wherePart)) {
              if (row.id === params[pIdx]) keep = false;
              pIdx++;
            } else if (/budget_id\s*=\s*\?\s*AND\s*category_id\s*=\s*\?/i.test(wherePart)) {
              if (row.budget_id === params[0] && row.category_id === params[1]) keep = false;
            }
            return keep;
          });
          changes = 1;
          save();
        }
      }
      return { lastInsertRowId: 1, changes };
    },
    getAllAsync: async (sql: string, params: any[] = []) => {
      const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (!fromMatch) return [];
      const tName = fromMatch[1].toLowerCase();
      let rows = [...(tables[tName] || [])];

      // Check for JOIN with categories
      if (/JOIN\s+categories/i.test(sql)) {
        const categories = tables.categories || [];
        const groups = tables.category_groups || [];
        rows = rows.map((r) => {
          const cat = categories.find((c) => c.id === r.category_id);
          const grp = cat ? groups.find((g) => g.id === cat.group_id) : null;
          return {
            ...r,
            category_name: cat ? cat.name : null,
            category_icon: cat ? cat.icon : null,
            category_color: cat ? cat.color : null,
            group_id: cat ? cat.group_id : null,
            group_name: grp ? grp.name : 'General',
            group_type: grp ? grp.type : 'expense',
          };
        });
      }

      // Check for direct JOIN with category_groups
      if (/JOIN\s+category_groups/i.test(sql) && !/JOIN\s+categories/i.test(sql)) {
        const groups = tables.category_groups || [];
        rows = rows
          .map((r) => {
            const grp = groups.find((g) => g.id === r.group_id);
            if (!grp) return null;
            return {
              ...r,
              group_name: grp.name,
              group_type: grp.type,
              group_color: grp.color,
              group_icon: grp.icon,
            };
          })
          .filter(Boolean);
      }

      if (/WHERE/i.test(sql)) {
        let pIdx = 0;
        if (/is_archived\s*=\s*0/i.test(sql)) rows = rows.filter((r) => !r.is_archived || r.is_archived === 0);
        if (/is_active\s*=\s*1/i.test(sql)) rows = rows.filter((r) => r.is_active === 1);
        if (/(?:ba\.)?budget_id\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.budget_id === params[pIdx++]);
        if (/id\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.id === params[pIdx++]);
        if (/\(account_id\s*=\s*\?\s*OR\s*to_account_id\s*=\s*\?\)/i.test(sql)) {
          const id1 = params[pIdx++];
          const id2 = params[pIdx++];
          rows = rows.filter((r) => r.account_id === id1 || r.to_account_id === id2);
        }
        if (/category_id\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.category_id === params[pIdx++]);
        if (/cg\.type\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.group_type === params[pIdx++]);
        else if (/type\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.type === params[pIdx++]);
        if (/date\s*>=\s*\?/i.test(sql)) rows = rows.filter((r) => r.date >= params[pIdx++]);
        if (/date\s*<=\s*\?/i.test(sql)) rows = rows.filter((r) => r.date <= params[pIdx++]);
      }
      if (/ORDER\s+BY/i.test(sql)) {
        if (/sort_order\s+ASC/i.test(sql)) rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        else if (/date\s+DESC/i.test(sql)) rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1], 10));
      return rows;
    },
    getFirstAsync: async (sql: string, params: any[] = []) => {
      if (/SUM\(amount\)\s+as\s+total_spent/i.test(sql)) {
        const catId = params[0];
        const txs = tables.transactions || [];
        const total = txs.filter((t) => t.category_id === catId && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        return { total_spent: total };
      }
      const fMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (!fMatch) return null;
      const tName = fMatch[1].toLowerCase();
      let rows = [...(tables[tName] || [])];
      if (/WHERE/i.test(sql)) {
        let pIdx = 0;
        if (/id\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.id === params[pIdx++]);
        if (/category_id\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.category_id === params[pIdx++]);
        if (/budget_id\s*=\s*\?/i.test(sql)) rows = rows.filter((r) => r.budget_id === params[pIdx++]);
        if (/is_active\s*=\s*1/i.test(sql)) rows = rows.filter((r) => r.is_active === 1);
      }
      return rows[0] || null;
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
    await db.execAsync(`PRAGMA key = '${dekKeyHex}';`);
    const cipherVersion = await db.getFirstAsync<{ cipher_version: string }>(
      'PRAGMA cipher_version;'
    );
    if (!cipherVersion?.cipher_version) {
      await db.closeAsync();
      throw new Error('SQLCipher is not enabled in this native build.');
    }
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

/** Keep the transaction on the existing SQLCipher-unlocked connection. */
export async function withGoalTransaction(task: (txn: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(() => task(db));
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

export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  try {
    await SQLite.deleteDatabaseAsync('nuvora.db');
  } catch (error) {
    // A previous attempt may already have deleted the file before secure storage cleanup failed.
    const failure = error as { code?: string; message?: string };
    const missing = failure?.code === 'ERR_DATABASE_NOT_FOUND'
      || (failure?.code === 'E_SQLITE_DELETE_DATABASE' && /Database .+ not found/.test(failure.message ?? ''));
    if (!missing) throw error;
  }
}
