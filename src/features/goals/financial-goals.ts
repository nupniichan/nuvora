import { getDatabase } from '@/database/database';
import {
  FinancialGoalRow,
  GoalContributionRow,
  GoalStatus,
  GoalType,
} from '@/database/types';
import { generateUUID } from '@/shared/uuid';

export interface FinancialGoalWithProgress extends FinancialGoalRow {
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
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
  daysRemaining: number | null;
  isOverdue: boolean;
} {
  const target = Math.max(1, goal.target_amount);
  const current = Math.max(0, goal.current_amount);
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remainingAmount = Math.max(0, target - current);
  const isCompleted = goal.status === 'completed' || current >= target;

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
    percentage,
    remainingAmount,
    isCompleted,
    daysRemaining,
    isOverdue,
  };
}

/**
 * Retrieves all goals, optionally filtered by status
 */
export async function getAllGoals(status?: GoalStatus): Promise<FinancialGoalWithProgress[]> {
  const db = getDatabase();
  let sql = `
    SELECT g.*, c.name as linked_category_name, a.name as linked_account_name
    FROM financial_goals g
    LEFT JOIN categories c ON c.id = g.linked_category_id
    LEFT JOIN accounts a ON a.id = g.linked_account_id
  `;
  const params: any[] = [];

  if (status) {
    sql += ` WHERE g.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY g.created_at DESC;`;

  const rows = await db.getAllAsync<any>(sql, params);

  return rows.map((r) => {
    const goal: FinancialGoalRow = {
      id: r.id,
      name: r.name,
      type: r.type,
      icon: r.icon,
      color: r.color,
      target_amount: Number(r.target_amount) || 0,
      current_amount: Number(r.current_amount) || 0,
      target_date: r.target_date,
      linked_category_id: r.linked_category_id,
      linked_account_id: r.linked_account_id,
      notes: r.notes,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    const metrics = calculateGoalMetrics(goal);

    return {
      ...goal,
      ...metrics,
      linkedCategoryName: r.linked_category_name,
      linkedAccountName: r.linked_account_name,
    };
  });
}

/**
 * Retrieves a single goal by id with progress metrics
 */
export async function getGoalById(id: string): Promise<FinancialGoalWithProgress | null> {
  const db = getDatabase();
  const r = await db.getFirstAsync<any>(
    `SELECT g.*, c.name as linked_category_name, a.name as linked_account_name
     FROM financial_goals g
     LEFT JOIN categories c ON c.id = g.linked_category_id
     LEFT JOIN accounts a ON a.id = g.linked_account_id
     WHERE g.id = ?;`,
    [id]
  );
  if (!r) return null;

  const goal: FinancialGoalRow = {
    id: r.id,
    name: r.name,
    type: r.type,
    icon: r.icon,
    color: r.color,
    target_amount: Number(r.target_amount) || 0,
    current_amount: Number(r.current_amount) || 0,
    target_date: r.target_date,
    linked_category_id: r.linked_category_id,
    linked_account_id: r.linked_account_id,
    notes: r.notes,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };

  const metrics = calculateGoalMetrics(goal);

  return {
    ...goal,
    ...metrics,
    linkedCategoryName: r.linked_category_name,
    linkedAccountName: r.linked_account_name,
  };
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
  current_amount?: number;
  target_date?: string | null;
  linked_category_id?: string | null;
  linked_account_id?: string | null;
  notes?: string | null;
}): Promise<FinancialGoalRow> {
  const db = getDatabase();
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
      data.current_amount ?? 0,
      data.target_date || null,
      data.linked_category_id || null,
      data.linked_account_id || null,
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
    current_amount?: number;
    target_date?: string | null;
    linked_category_id?: string | null;
    linked_account_id?: string | null;
    notes?: string | null;
    status?: GoalStatus;
  }
): Promise<void> {
  const db = getDatabase();
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
  if (data.current_amount !== undefined) {
    updates.push('current_amount = ?');
    params.push(data.current_amount);
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
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  params.push(id);
  await db.runAsync(`UPDATE financial_goals SET ${updates.join(', ')} WHERE id = ?;`, params);
}

/**
 * Adds a contribution to a goal and logs it
 */
export async function addGoalContribution(
  goalId: string,
  amount: number,
  note?: string,
  date?: string
): Promise<void> {
  const db = getDatabase();
  const contributionId = generateUUID();
  const now = new Date().toISOString();
  const contDate = date || now.slice(0, 10);

  await db.withTransactionAsync(async () => {
    // Insert contribution
    await db.runAsync(
      `INSERT INTO goal_contributions (id, goal_id, amount, note, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [contributionId, goalId, amount, note || null, contDate, now]
    );

    // Update goal current_amount
    await db.runAsync(
      `UPDATE financial_goals SET current_amount = current_amount + ?, updated_at = ? WHERE id = ?;`,
      [amount, now, goalId]
    );

    // Auto mark completed if current >= target
    const goal = await db.getFirstAsync<FinancialGoalRow>(
      `SELECT * FROM financial_goals WHERE id = ?;`,
      [goalId]
    );
    if (goal && goal.current_amount >= goal.target_amount && goal.status === 'active') {
      await db.runAsync(
        `UPDATE financial_goals SET status = 'completed', updated_at = ? WHERE id = ?;`,
        [now, goalId]
      );
    }
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
 * Deletes a goal and its contributions
 */
export async function deleteGoal(id: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM goal_contributions WHERE goal_id = ?;`, [id]);
    await db.runAsync(`DELETE FROM financial_goals WHERE id = ?;`, [id]);
  });
}
