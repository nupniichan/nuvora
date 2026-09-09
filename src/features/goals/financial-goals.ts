import { getDatabase, withGoalTransaction } from '@/database/database';
import { runGoalWrite } from '@/database/goal-write';
import {
  AccountRow,
  TransactionRow,
  FinancialGoalRow,
  GoalContributionRow,
  GoalStatus,
  GoalType,
} from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { buildBalanceComparisons } from '@/features/insights/balance-comparison';
import { getTransactions } from '@/features/transactions/transaction-queries';
import { formatDateISO } from '@/shared/date-utils';
import { generateUUID } from '@/shared/uuid';
import { requireMonthlyLimitApproval } from '@/features/budgets/monthly-limits';

export interface FinancialGoalWithProgress extends FinancialGoalRow {
  currency: string;
  canComplete: boolean;
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
  daysRemaining: number | null;
  isOverdue: boolean;
  linkedCategoryName?: string | null;
  linkedAccountName?: string | null;
}

/**
 * Calculates derived progress metrics for a goal
 */
export function calculateGoalMetrics(goal: FinancialGoalRow): {
  canComplete: boolean;
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
  daysRemaining: number | null;
  isOverdue: boolean;
} {
  const target = Math.max(1, goal.target_amount);
  const current = Math.max(0, goal.current_amount);
  const percentage = current >= target ? 100 : Math.floor((current / target) * 100);
  const remainingAmount = Math.max(0, target - current);
  const isCompleted = goal.status === 'completed';
  const canComplete = goal.status === 'active' && current >= target;

  let daysRemaining: number | null = null;
  let isOverdue = false;

  if (goal.target_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(goal.target_date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOverdue = daysRemaining < 0 && !isCompleted;
  }

  return {
    canComplete,
    percentage,
    remainingAmount,
    isCompleted,
    daysRemaining,
    isOverdue,
  };
}

export interface GoalFunds {
  accountId: string;
  currency: string;
  balance: number;
}

export async function getGoalFunds(): Promise<GoalFunds> {
  const account = await getDefaultAccount();
  const transactions = await getTransactions();
  const balance = buildBalanceComparisons([account], transactions)[0]?.balance ?? 0;
  return { accountId: account.id, currency: account.currency, balance };
}

/** Active goals reflect the same available balance; funds are spent only on completion. */
export async function getAllGoals(status?: GoalStatus): Promise<FinancialGoalWithProgress[]> {
  const db = getDatabase();
  const [rows, funds] = await Promise.all([
    db.getAllAsync<FinancialGoalRow>('SELECT * FROM financial_goals ORDER BY created_at DESC;'),
    getGoalFunds(),
  ]);
  return rows.filter((row) => !status || row.status === status).map((row) => {
    const goal = {
      ...row,
      target_amount: Number(row.target_amount) || 0,
      current_amount: row.status === 'completed' ? Number(row.current_amount) || 0 : Math.max(0, funds.balance),
    };
    return { ...goal, ...calculateGoalMetrics(goal), currency: funds.currency };
  });
}

export async function getGoalById(id: string): Promise<FinancialGoalWithProgress | null> {
  return (await getAllGoals()).find((goal) => goal.id === id) ?? null;
}

export class GoalActionError extends Error {
  constructor(public readonly code: 'notFound' | 'invalidTarget' | 'insufficientFunds' | 'notActive' | 'completedLocked') {
    super(code);
  }
}

/** Post the expense and completion together. Repeated completion never spends twice. */
export async function completeGoal(id: string, note?: string, monthlyLimitApproval?: string): Promise<void> {
  return runGoalWrite(() => completeGoalOnce(id, note, monthlyLimitApproval));
}

async function completeGoalOnce(id: string, note?: string, monthlyLimitApproval?: string): Promise<void> {
  const defaultAccount = await getDefaultAccount();
  await withGoalTransaction(async (txn) => {
    const goal = await txn.getFirstAsync<FinancialGoalRow>('SELECT * FROM financial_goals WHERE id = ?;', [id]);
    if (!goal) throw new GoalActionError('notFound');
    if (goal.status === 'completed') return;
    if (goal.status !== 'active') throw new GoalActionError('notActive');
    if (!Number.isSafeInteger(goal.target_amount) || goal.target_amount <= 0) throw new GoalActionError('invalidTarget');
    const account = await txn.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE id = ?;', [defaultAccount.id]);
    const transactions = await txn.getAllAsync<TransactionRow>('SELECT * FROM transactions;');
    const balance = account ? buildBalanceComparisons([account], transactions)[0]?.balance ?? 0 : 0;
    if (!account || balance < goal.target_amount) throw new GoalActionError('insufficientFunds');

    const now = new Date().toISOString();
    const date = formatDateISO(new Date());
    const transactionId = 'goal-completion:' + id;
    await requireMonthlyLimitApproval({ type: 'expense', date, currency: account.currency, amount: goal.target_amount, operation: transactionId }, monthlyLimitApproval);
    await txn.runAsync(
      "INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at) VALUES (?, 'expense', ?, ?, ?, NULL, ?, NULL, NULL, ?, ?, 'confirmed', ?, ?);",
      [transactionId, goal.target_amount, account.currency, account.id, goal.linked_category_id, note || goal.name, date, now, now]
    );
    await txn.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
      [goal.target_amount, now, account.id]);
    await txn.runAsync("UPDATE financial_goals SET status = 'completed', current_amount = ?, linked_account_id = ?, updated_at = ? WHERE id = ?;",
      [goal.target_amount, account.id, now, id]);
    await txn.runAsync('INSERT INTO goal_contributions (id, goal_id, amount, transaction_id, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [transactionId, id, goal.target_amount, transactionId, note || goal.name, date, now]);
  });
}

/**
 * Creates a new financial goal
 */
export async function createGoal(data: {
  name: string;
  type: GoalType;
  icon?: string | null;
  color?: string | null;
  target_amount: number;
  target_date?: string | null;
  linked_category_id?: string | null;
  linked_account_id?: string | null;
  notes?: string | null;
}): Promise<FinancialGoalRow> {
  const db = getDatabase();
  const funds = await getGoalFunds();
  if (!Number.isSafeInteger(data.target_amount) || data.target_amount <= 0) throw new GoalActionError('invalidTarget');
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO financial_goals (
      id, name, type, icon, color, target_amount, current_amount,
      target_date, linked_category_id, linked_account_id, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?);`,
    [
      id,
      data.name.trim(),
      data.type,
      data.icon || null,
      data.color || null,
      data.target_amount,
      Math.max(0, funds.balance),
      data.target_date || null,
      data.linked_category_id || null,
      funds.accountId,
      data.notes || null,
      now,
      now,
    ]
  );

  const created = await db.getFirstAsync<FinancialGoalRow>(
    `SELECT * FROM financial_goals WHERE id = ?;`,
    [id]
  );
  if (!created) throw new Error('Không thể tạo mục tiêu tài chính');
  return created;
}

/**
 * Updates a financial goal
 */
export async function updateGoal(
  id: string,
  data: {
    name?: string;
    type?: GoalType;
    icon?: string | null;
    color?: string | null;
    target_amount?: number;
    target_date?: string | null;
    linked_category_id?: string | null;
    linked_account_id?: string | null;
    notes?: string | null;
  }
): Promise<void> {
  return runGoalWrite(async () => {
    const db = getDatabase();
    const goal = await db.getFirstAsync<FinancialGoalRow>('SELECT * FROM financial_goals WHERE id = ?;', [id]);
    if (!goal) throw new GoalActionError('notFound');
    if (goal.status === 'completed') throw new GoalActionError('completedLocked');
    if (data.target_amount !== undefined && (!Number.isSafeInteger(data.target_amount) || data.target_amount <= 0)) throw new GoalActionError('invalidTarget');
    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      params.push(data.type);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
    if (data.target_amount !== undefined) {
      updates.push('target_amount = ?');
      params.push(data.target_amount);
    }
    if (data.target_date !== undefined) {
      updates.push('target_date = ?');
      params.push(data.target_date);
    }
    if (data.linked_category_id !== undefined) {
      updates.push('linked_category_id = ?');
      params.push(data.linked_category_id);
    }
    if (data.linked_account_id !== undefined) {
      updates.push('linked_account_id = ?');
      params.push(data.linked_account_id);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    params.push(id);
    await db.runAsync(`UPDATE financial_goals SET ${updates.join(', ')} WHERE id = ?;`, params);
  });
}

/**
 * Gets contribution history for a goal
 */
export async function getGoalContributions(goalId: string): Promise<GoalContributionRow[]> {
  const db = getDatabase();
  return await db.getAllAsync<GoalContributionRow>(
    `SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY date DESC, created_at DESC;`,
    [goalId]
  );
}

/**
 * Deletes an unfinished goal and its contributions
 */
export async function deleteGoal(id: string): Promise<void> {
  return runGoalWrite(() => withGoalTransaction(async (txn) => {
    const goal = await txn.getFirstAsync<FinancialGoalRow>('SELECT * FROM financial_goals WHERE id = ?;', [id]);
    if (!goal) return;
    if (goal.status === 'completed') throw new GoalActionError('completedLocked');
    await txn.runAsync('DELETE FROM goal_contributions WHERE goal_id = ?;', [id]);
    await txn.runAsync('DELETE FROM financial_goals WHERE id = ?;', [id]);
  }));
}
