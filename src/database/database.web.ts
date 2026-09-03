const STORAGE_KEY = 'nuvora_web_db_tables';

interface TableStore {
  [table: string]: any[];
}

class WebSQLiteDatabase {
  private tables: TableStore = {
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

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.tables = { ...this.tables, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to load web database from localStorage', e);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tables));
      } catch (e) {
        console.warn('Failed to save web database to localStorage', e);
      }
    }
  }

  async execAsync(sql: string): Promise<void> {
    // DDL or PRAGMA statements are no-ops in web mock
    return;
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim();
    let changes = 0;

    // INSERT / INSERT OR REPLACE
    if (/^INSERT/i.test(trimmed)) {
      const match = trimmed.match(/INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const columns = match[2].split(',').map((c) => c.trim());
        const rawValues = match[3].split(',').map((v) => v.trim());

        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }

        const row: Record<string, any> = {};
        let paramIdx = 0;

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const valExpr = rawValues[i];
          if (valExpr === '?') {
            row[col] = params[paramIdx++];
          } else if (/^'.*'$/.test(valExpr)) {
            row[col] = valExpr.slice(1, -1);
          } else if (!isNaN(Number(valExpr))) {
            row[col] = Number(valExpr);
          } else {
            row[col] = valExpr;
          }
        }

        // Primary key check (id or key)
        const primaryKey = row.id ? 'id' : row.key ? 'key' : null;
        if (primaryKey) {
          const existingIdx = this.tables[tableName].findIndex((r) => r[primaryKey] === row[primaryKey]);
          if (existingIdx >= 0) {
            this.tables[tableName][existingIdx] = { ...this.tables[tableName][existingIdx], ...row };
          } else {
            this.tables[tableName].push(row);
          }
        } else {
          this.tables[tableName].push(row);
        }

        changes = 1;
        this.saveToStorage();
      }
    }
    // UPDATE
    else if (/^UPDATE/i.test(trimmed)) {
      const updateWithWhere = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*?)\s+WHERE\s+(.*)/i);
      const updateWithoutWhere = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*)/i);

      if (updateWithWhere) {
        const tableName = updateWithWhere[1].toLowerCase();
        const setClause = updateWithWhere[2];
        if (this.tables[tableName]) {
          let paramIdx = 0;
          const assignments = setClause.split(',').map((s) => s.trim());
          const idParam = params[params.length - 1];

          this.tables[tableName] = this.tables[tableName].map((row) => {
            if (row.id === idParam) {
              const updated = { ...row };
              paramIdx = 0;
              for (const assign of assignments) {
                const plusMatch = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\1\s*\+\s*\?/);
                const minusMatch = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\1\s*-\s*\?/);
                const simpleMatch = assign.match(/([a-zA-Z0-9_]+)\s*=\s*\?/);

                if (plusMatch) {
                  const col = plusMatch[1];
                  const delta = params[paramIdx++];
                  updated[col] = (Number(updated[col]) || 0) + Number(delta);
                } else if (minusMatch) {
                  const col = minusMatch[1];
                  const delta = params[paramIdx++];
                  updated[col] = (Number(updated[col]) || 0) - Number(delta);
                } else if (simpleMatch) {
                  const col = simpleMatch[1];
                  updated[col] = params[paramIdx++];
                }
              }
              changes++;
              return updated;
            }
            return row;
          });

          this.saveToStorage();
        }
      } else if (updateWithoutWhere) {
        const tableName = updateWithoutWhere[1].toLowerCase();
        const setClause = updateWithoutWhere[2].replace(/;$/, '').trim();
        if (this.tables[tableName]) {
          const assignments = setClause.split(',').map((s) => s.trim());
          this.tables[tableName] = this.tables[tableName].map((row) => {
            const updated = { ...row };
            for (const assign of assignments) {
              const simpleLitMatch = assign.match(/([a-zA-Z0-9_]+)\s*=\s*([^,;]+)/);
              if (simpleLitMatch) {
                const col = simpleLitMatch[1];
                let val: any = simpleLitMatch[2].trim();
                if (!isNaN(Number(val))) val = Number(val);
                updated[col] = val;
              }
            }
            changes++;
            return updated;
          });
          this.saveToStorage();
        }
      }
    }
    // DELETE
    else if (/^DELETE/i.test(trimmed)) {
      const deleteMatch = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([a-zA-Z0-9_.]+)\s*=\s*\?)?/i);
      if (deleteMatch) {
        const tableName = deleteMatch[1].toLowerCase();
        const colName = (deleteMatch[2] || 'id').replace(/^[a-zA-Z0-9_]+\./, '');
        const targetVal = params[0];
        if (this.tables[tableName]) {
          const initialLen = this.tables[tableName].length;
          this.tables[tableName] = this.tables[tableName].filter((r) => r[colName] !== targetVal);
          changes = initialLen - this.tables[tableName].length;
          this.saveToStorage();
        }
      }
    }

    return { lastInsertRowId: 1, changes };
  }

  async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim();
    const fromMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return [];

    const tableName = fromMatch[1].toLowerCase();
    let rows: any[] = [...(this.tables[tableName] || [])];

    // Check for JOIN with categories
    if (/JOIN\s+categories/i.test(trimmed)) {
      const categories = this.tables.categories || [];
      const groups = this.tables.category_groups || [];
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

    // Check for direct JOIN with category_groups (e.g. from categories table)
    if (/JOIN\s+category_groups/i.test(trimmed) && !/JOIN\s+categories/i.test(trimmed)) {
      const groups = this.tables.category_groups || [];
      rows = rows.map((r) => {
        const grp = groups.find((g) => g.id === r.group_id);
        return {
          ...r,
          group_name: grp ? grp.name : 'General',
          group_type: grp ? grp.type : 'expense',
        };
      });
    }

    // Check for recurring_rules joins
    if (tableName === 'recurring_rules' && /JOIN\s+accounts/i.test(trimmed)) {
      const accounts = this.tables.accounts || [];
      const categories = this.tables.categories || [];
      rows = rows.map((r) => {
        const acc = accounts.find((a) => a.id === r.account_id);
        const cat = categories.find((c) => c.id === r.category_id);
        return {
          ...r,
          account_name: acc ? acc.name : 'Unknown',
          category_name: cat ? cat.name : null,
        };
      });
    }

    // Check for automation_occurrences joins
    if (tableName === 'automation_occurrences' && /JOIN\s+recurring_rules/i.test(trimmed)) {
      const rules = this.tables.recurring_rules || [];
      const accounts = this.tables.accounts || [];
      const categories = this.tables.categories || [];
      rows = rows.map((r) => {
        const rule = rules.find((rl) => rl.id === r.recurring_rule_id);
        const acc = rule ? accounts.find((a) => a.id === rule.account_id) : null;
        const cat = rule ? categories.find((c) => c.id === rule.category_id) : null;
        return {
          ...r,
          rule_name: rule ? rule.name : 'Unknown',
          rule_type: rule ? rule.type : 'expense',
          rule_amount: rule ? rule.amount : 0,
          rule_currency: rule ? rule.currency : 'VND',
          account_id: rule ? rule.account_id : '',
          account_name: acc ? acc.name : 'Unknown',
          category_id: rule ? rule.category_id : null,
          category_name: cat ? cat.name : null,
        };
      });
    }

    // Filter conditions
    if (/WHERE/i.test(trimmed)) {
      let pIdx = 0;
      if (/status\s*=\s*'pending'/i.test(trimmed)) {
        rows = rows.filter((r) => r.status === 'pending');
      }
      if (/recurring_rule_id\s*=\s*\?\s*AND\s*scheduled_date\s*=\s*\?/i.test(trimmed)) {
        const ruleId = params[pIdx++];
        const sDate = params[pIdx++];
        rows = rows.filter((r) => r.recurring_rule_id === ruleId && r.scheduled_date === sDate);
      }
      if (/cg\.type\s*=\s*\?/i.test(trimmed)) {
        const grpType = params[pIdx++];
        rows = rows.filter((r) => r.group_type === grpType);
      }
      if (/is_archived\s*=\s*0/i.test(trimmed)) {
        rows = rows.filter((r) => !r.is_archived || r.is_archived === 0);
      }
      if (/is_active\s*=\s*1/i.test(trimmed)) {
        rows = rows.filter((r) => r.is_active === 1);
      }
      if (/(?:ba\.)?budget_id\s*=\s*\?/i.test(trimmed)) {
        const targetBudgetId = params[pIdx++];
        rows = rows.filter((r) => r.budget_id === targetBudgetId);
      }
      if (/id\s*=\s*\?/i.test(trimmed)) {
        const targetId = params[pIdx++];
        rows = rows.filter((r) => r.id === targetId);
      }
      if (/\(account_id\s*=\s*\?\s*OR\s*to_account_id\s*=\s*\?\)/i.test(trimmed)) {
        const accId1 = params[pIdx++];
        const accId2 = params[pIdx++];
        rows = rows.filter((r) => r.account_id === accId1 || r.to_account_id === accId2);
      }
      if (/category_id\s*=\s*\?/i.test(trimmed)) {
        const catId = params[pIdx++];
        rows = rows.filter((r) => r.category_id === catId);
      }
      if (/type\s*=\s*\?/i.test(trimmed)) {
        const typeVal = params[pIdx++];
        rows = rows.filter((r) => r.type === typeVal);
      } else if (/type\s*=\s*'expense'/i.test(trimmed)) {
        rows = rows.filter((r) => r.type === 'expense');
      }
      if (/date\s*>=\s*\?/i.test(trimmed)) {
        const startDate = params[pIdx++];
        rows = rows.filter((r) => r.date >= startDate);
      }
      if (/date\s*<=\s*\?/i.test(trimmed)) {
        const endDate = params[pIdx++];
        rows = rows.filter((r) => r.date <= endDate);
      }
    }

    // Check for GROUP BY category_id and SUM(amount)
    if (/GROUP\s+BY\s+category_id/i.test(trimmed)) {
      const groupMap = new Map<string, number>();
      for (const row of rows) {
        if (row.category_id) {
          const current = groupMap.get(row.category_id) || 0;
          groupMap.set(row.category_id, current + (Number(row.amount) || 0));
        }
      }
      const aggregated = Array.from(groupMap.entries()).map(([category_id, total_spent]) => ({
        category_id,
        total_spent,
      }));
      return aggregated as unknown as T[];
    }

    // Order By
    if (/ORDER\s+BY/i.test(trimmed)) {
      if (/sort_order\s+ASC,\s*(?:c\.)?name\s+ASC/i.test(trimmed)) {
        rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || a.category_name || '').localeCompare(b.name || b.category_name || ''));
      } else if (/created_at\s+DESC/i.test(trimmed)) {
        rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      } else if (/date\s+DESC,\s*created_at\s+DESC/i.test(trimmed)) {
        rows.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
      }
    }

    // Limit
    const limitMatch = trimmed.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      rows = rows.slice(0, limit);
    }

    return rows as T[];
  }

  async getFirstAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.getAllAsync<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async withTransactionAsync(cb: () => Promise<void>): Promise<void> {
    await cb();
  }

  async closeAsync(): Promise<void> {
    // No-op
  }
}

let dbInstance: WebSQLiteDatabase | null = null;

export async function initDatabase(dekKeyHex?: string): Promise<any> {
  if (!dbInstance) {
    dbInstance = new WebSQLiteDatabase();
  }
  return dbInstance;
}

export function getDatabase(): any {
  if (!dbInstance) {
    dbInstance = new WebSQLiteDatabase();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  dbInstance = null;
}
