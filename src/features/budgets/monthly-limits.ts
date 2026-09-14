import { getDatabase } from '@/database/database';
import { AppSettingRow, BudgetRow, TransactionRow } from '@/database/types';

export type MonthlyLimitScope = 'month' | 'recurring' | 'inherit';
const prefix = 'monthly-spending-limit:';

export class MonthlyLimitValidationError extends Error {
  constructor(public readonly code: 'invalidMonth' | 'invalidAmount' | 'invalidDate' | 'invalidSavedLimit') {
    super(code);
  }
}

export function monthKey(year: number, month: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new MonthlyLimitValidationError('invalidMonth');
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function isValidTransactionDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate();
}

export async function getMonthlyLimit(year: number, month: number, currency: string) {
  const key = monthKey(year, month);
  const db = getDatabase();
  const settings = await db.getAllAsync<AppSettingRow>('SELECT * FROM app_settings;');
  const base = `${prefix}${currency}:`;
  const recurring = settings.filter(row => row.key.startsWith(`${base}recurring:`) && row.key.slice(-7) <= key)
    .sort((a, b) => b.key.localeCompare(a.key))[0];
  const override = settings.find(row => row.key === `${base}month:${key}`);
  const readAmount = (row: AppSettingRow | undefined): number | null => {
    if (!row || row.value === 'null') return null;
    const value = Number(row.value);
    if (!Number.isSafeInteger(value) || value <= 0) throw new MonthlyLimitValidationError('invalidSavedLimit');
    return value;
  };
  const recurringLimit = readAmount(recurring);
  if (override) return { limit: readAmount(override), recurringLimit, source: 'month' as const };
  if (recurring) return { limit: recurringLimit, recurringLimit, source: 'recurring' as const };

  const budgets = await db.getAllAsync<BudgetRow>('SELECT * FROM budgets;');
  const legacy = budgets.filter(row => row.currency === currency && row.start_date.slice(0, 7) === key && row.total_budget != null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  return { limit: legacy?.total_budget && legacy.total_budget > 0 ? legacy.total_budget : null, recurringLimit, source: legacy ? 'month' as const : 'none' as const };
}

export async function saveMonthlyLimit(year: number, month: number, currency: string, limit: number | null, scope: MonthlyLimitScope): Promise<void> {
  const key = monthKey(year, month);
  if (limit !== null && (!Number.isSafeInteger(limit) || limit <= 0)) throw new MonthlyLimitValidationError('invalidAmount');
  const db = getDatabase();
  const base = `${prefix}${currency}:`;
  await db.withTransactionAsync(async () => {
    if (scope !== 'inherit') {
      await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
        [`${base}${scope}:${key}`, JSON.stringify(limit), new Date().toISOString()]);
    }
    if (scope !== 'month') {
      await db.runAsync('DELETE FROM app_settings WHERE key = ?;', [`${base}month:${key}`]);

      const budgets = await db.getAllAsync<BudgetRow>('SELECT * FROM budgets;');
      for (const budget of budgets.filter(row => row.currency === currency && row.start_date.slice(0, 7) === key)) {
        await db.runAsync('UPDATE budgets SET total_budget = ?, updated_at = ? WHERE id = ?;', [null, new Date().toISOString(), budget.id]);
      }
    }
  });
}

export interface MonthlyLimitProjection {
  month: string;
  currency: string;
  limit: number | null;
  spent: number;
  projected: number;
  exceeded: number;
}

export async function projectMonthlyExpense(date: string, currency: string, amount: number, excludeTransactionId?: string): Promise<MonthlyLimitProjection> {
  if (!isValidTransactionDate(date)) throw new MonthlyLimitValidationError('invalidDate');
  const [year, month] = date.split('-').map(Number);
  const key = monthKey(year, month);
  const { limit } = await getMonthlyLimit(year, month, currency);
  const end = `${key}-${new Date(year, month, 0).getDate()}`;
  const rows = await getDatabase().getAllAsync<TransactionRow>('SELECT * FROM transactions WHERE date >= ? AND date <= ?;', [`${key}-01`, end]);
  const spent = rows.filter(row => row.type === 'expense' && row.status === 'confirmed' && row.currency === currency && row.id !== excludeTransactionId)
    .reduce((total, row) => total + row.amount, 0);
  const projected = spent + amount;
  return { month: key, currency, limit, spent, projected, exceeded: limit === null ? 0 : Math.max(0, projected - limit) };
}

export class MonthlyLimitExceededError extends Error {
  readonly approval: string;
  constructor(public readonly projection: MonthlyLimitProjection, operation: string) {
    super('Monthly spending limit exceeded');
    this.approval = JSON.stringify([operation, projection]);
  }
}

export async function requireMonthlyLimitApproval(data: { type: string; date: string; currency: string; amount: number; excludeTransactionId?: string; operation: string }, approval?: string): Promise<void> {
  if (!isValidTransactionDate(data.date)) throw new MonthlyLimitValidationError('invalidDate');
  if (!Number.isSafeInteger(data.amount) || data.amount <= 0) throw new MonthlyLimitValidationError('invalidAmount');
  if (data.type !== 'expense') return;
  const projection = await projectMonthlyExpense(data.date, data.currency, data.amount, data.excludeTransactionId);
  if (projection.exceeded <= 0) return;
  const error = new MonthlyLimitExceededError(projection, data.operation);
  if (approval !== error.approval) throw error;
}
