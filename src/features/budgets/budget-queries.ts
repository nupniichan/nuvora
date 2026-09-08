import { getDatabase } from '@/database/database';
import {
  BudgetAllocationRow,
  BudgetPeriodType,
  BudgetRow,
} from '@/database/types';
import { generateUUID } from '@/shared/uuid';

export const GOAL_COMPLETION_CATEGORY_ID = 'goal_completion';

export interface CategoryIncomeSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  groupName: string;
  totalAmount: number; // Integer minor units
  transactionCount: number;
}

export interface CategoryExpenseSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  groupName: string;
  totalAmount: number; // Integer minor units
  transactionCount: number;
  spendingLimit: number | null; // Integer minor units (null = no limit)
  remainingAmount: number | null;
  percentUsed: number | null; // 0 - 100+
  isOverLimit: boolean;
}

export interface MonthlySnapshot {
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  currency: string;
  budget: BudgetRow | null;

  totalIncome: number;
  totalExpense: number;
  netBalance: number; // totalIncome - totalExpense

  incomeCategories: CategoryIncomeSummary[];
  expenseCategories: CategoryExpenseSummary[];

  uncategorizedIncome: number;
  uncategorizedExpense: number;

  totalSpendingLimit: number;
  overLimitCount: number;
}

export interface BudgetWithAllocations extends BudgetRow {
  allocations: (BudgetAllocationRow & {
    category_name: string;
    category_icon: string | null;
    category_color: string | null;
  })[];
}

/**
 * Retrieves the currently active budget or latest budget
 */
export async function getActiveBudget(): Promise<BudgetRow | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<BudgetRow>(
    `SELECT * FROM budgets WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1;`
  );
  return row ?? null;
}

/**
 * Retrieves or creates a budget for a specified month
 */
export async function getOrCreateActiveBudget(
  year: number,
  month: number,
  currency: string = 'VND'
): Promise<BudgetRow> {
  const active = await getActiveBudget();
  if (active) return active;

  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const name = `Ngân sách Tháng ${month}/${year}`;

  return await createBudget({
    name,
    period_type: 'monthly',
    start_date: startDate,
    currency,
  });
}

/**
 * Creates a new budget
 */
export async function createBudget(data: {
  name: string;
  period_type: BudgetPeriodType;
  start_date: string;
  currency: string;
  total_budget?: number | null;
}): Promise<BudgetRow> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = generateUUID();

  // Deactivate old budgets
  await db.runAsync(`UPDATE budgets SET is_active = 0;`);

  await db.runAsync(
    `INSERT INTO budgets (id, name, period_type, start_date, currency, total_budget, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);`,
    [id, data.name, data.period_type, data.start_date, data.currency, data.total_budget ?? null, now, now]
  );

  const created = await db.getFirstAsync<BudgetRow>(`SELECT * FROM budgets WHERE id = ?;`, [id]);
  if (!created) throw new Error('Không thể tạo ngân sách');
  return created;
}

/**
 * Sets or updates total monthly budget limit
 */
export async function setMonthlyBudgetTotal(budgetId: string, total: number | null): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE budgets SET total_budget = ?, updated_at = ? WHERE id = ?;`,
    [total, now, budgetId]
  );
}

/**
 * Sets spending limit for a specific category
 */
export async function setCategorySpendingLimit(
  budgetId: string,
  categoryId: string,
  limitAmount: number | null
): Promise<void> {
  const db = getDatabase();

  if (limitAmount === null || limitAmount <= 0) {
    // Remove limit
    await db.runAsync(
      `DELETE FROM budget_allocations WHERE budget_id = ? AND category_id = ?;`,
      [budgetId, categoryId]
    );
    return;
  }

  // Check if exists
  const existing = await db.getFirstAsync<BudgetAllocationRow>(
    `SELECT * FROM budget_allocations WHERE budget_id = ? AND category_id = ?;`,
    [budgetId, categoryId]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE budget_allocations SET amount = ?, rule_type = 'limit' WHERE id = ?;`,
      [limitAmount, existing.id]
    );
  } else {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO budget_allocations (id, budget_id, category_id, rule_type, amount, percentage, sort_order)
       VALUES (?, ?, ?, 'limit', ?, NULL, 0);`,
      [id, budgetId, categoryId, limitAmount]
    );
  }
}

/**
 * Retrieves a budget along with all its category allocations (spending limits)
 */
export async function getBudgetWithAllocations(
  budgetId: string
): Promise<BudgetWithAllocations | null> {
  const db = getDatabase();
  const budget = await db.getFirstAsync<BudgetRow>(
    `SELECT * FROM budgets WHERE id = ?;`,
    [budgetId]
  );
  if (!budget) return null;

  const allocations = await db.getAllAsync<
    BudgetAllocationRow & {
      category_name: string;
      category_icon: string | null;
      category_color: string | null;
    }
  >(
    `SELECT ba.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM budget_allocations ba
     JOIN categories c ON c.id = ba.category_id
     WHERE ba.budget_id = ?
     ORDER BY ba.sort_order ASC, c.name ASC;`,
    [budgetId]
  );

  return {
    ...budget,
    allocations,
  };
}

/**
 * Computes a comprehensive monthly snapshot (income vs expense breakdown, limits, net balance)
 */
export async function getMonthlySnapshot(
  year: number,
  month: number,
  overrideCurrency?: string
): Promise<MonthlySnapshot> {
  const db = getDatabase();

  const monthStr = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const periodStart = `${year}-${monthStr}-01`;
  const periodEnd = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const budget = await getOrCreateActiveBudget(year, month, overrideCurrency || 'VND');
  const currency = overrideCurrency || budget.currency || 'VND';

  // 1. Get spending limits for active budget
  const limits = await db.getAllAsync<BudgetAllocationRow>(
    `SELECT * FROM budget_allocations WHERE budget_id = ?;`,
    [budget.id]
  );
  const limitMap = new Map<string, number>();
  for (const l of limits) {
    if (l.amount && l.amount > 0) {
      limitMap.set(l.category_id, l.amount);
    }
  }

  // 2. Query actual transactions for the month
  const txRows = await db.getAllAsync<any>(
    `SELECT t.id, t.type, t.amount, t.category_id, t.currency, t.status,
            c.name as category_name, c.icon as category_icon, c.color as category_color,
            cg.name as group_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN category_groups cg ON cg.id = c.group_id
     WHERE t.date >= ? AND t.date <= ?;`,
    [periodStart, periodEnd]
  );

  let totalIncome = 0;
  let totalExpense = 0;
  let uncategorizedIncome = 0;
  let uncategorizedExpense = 0;
  let uncategorizedIncomeCount = 0;
  let uncategorizedExpenseCount = 0;

  const incomeMap = new Map<string, CategoryIncomeSummary>();
  const expenseMap = new Map<string, { total: number; count: number; name: string; icon: string | null; color: string | null; group: string }>();

  for (const row of txRows) {
    if (row.currency !== currency || row.status !== 'confirmed') continue;
    const amount = Number(row.amount) || 0;

    // Resolve category details if not populated by JOIN
    let catName = row.category_name;
    let catIcon = row.category_icon;
    let catColor = row.category_color;
    let grpName = row.group_name;

    if (row.category_id && !catName) {
      try {
        const cat = await db.getFirstAsync<any>(
          `SELECT c.name, c.icon, c.color, cg.name as group_name
           FROM categories c
           LEFT JOIN category_groups cg ON cg.id = c.group_id
           WHERE c.id = ?;`,
          [row.category_id]
        );
        if (cat) {
          catName = cat.name;
          catIcon = cat.icon;
          catColor = cat.color;
          grpName = cat.group_name;
        }
      } catch {}
    }

    if (row.type === 'income') {
      totalIncome += amount;
      if (!row.category_id) {
        uncategorizedIncome += amount;
        uncategorizedIncomeCount += 1;
      } else {
        const cur = incomeMap.get(row.category_id) || {
          categoryId: row.category_id,
          categoryName: catName || 'Khoản thu khác',
          categoryIcon: catIcon || 'payments',
          categoryColor: catColor || '#4CAF7D',
          groupName: grpName || 'Thu nhập',
          totalAmount: 0,
          transactionCount: 0,
        };
        cur.totalAmount += amount;
        cur.transactionCount += 1;
        incomeMap.set(row.category_id, cur);
      }
    } else if (row.type === 'expense') {
      totalExpense += amount;
      if (String(row.id).startsWith('goal-completion:')) {
        const cur = expenseMap.get(GOAL_COMPLETION_CATEGORY_ID) || {
          total: 0,
          count: 0,
          name: GOAL_COMPLETION_CATEGORY_ID,
          icon: 'flag',
          color: '#6464A8',
          group: GOAL_COMPLETION_CATEGORY_ID,
        };
        cur.total += amount;
        cur.count += 1;
        expenseMap.set(GOAL_COMPLETION_CATEGORY_ID, cur);
      } else if (!row.category_id) {
        uncategorizedExpense += amount;
        uncategorizedExpenseCount += 1;
      } else {
        const cur = expenseMap.get(row.category_id) || {
          total: 0,
          count: 0,
          name: catName || 'Khoản chi khác',
          icon: catIcon || 'category',
          color: catColor || '#EF5350',
          group: grpName || 'Chi tiêu',
        };
        cur.total += amount;
        cur.count += 1;
        expenseMap.set(row.category_id, cur);
      }
    }
  }

  // Also include categories that have a spending limit even if spent = 0
  for (const catId of limitMap.keys()) {
    if (!expenseMap.has(catId)) {
      const cat = await db.getFirstAsync<any>(
        `SELECT c.*, cg.name as group_name
         FROM categories c
         LEFT JOIN category_groups cg ON cg.id = c.group_id
         WHERE c.id = ?;`,
        [catId]
      );
      if (cat) {
        expenseMap.set(catId, {
          total: 0,
          count: 0,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          group: cat.group_name || 'Chi tiêu',
        });
      }
    }
  }

  const incomeCategories = Array.from(incomeMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  // If there is uncategorized income, display it as a dedicated category item
  if (uncategorizedIncome > 0) {
    incomeCategories.push({
      categoryId: 'uncategorized_income',
      categoryName: 'Chưa phân loại',
      categoryIcon: 'help-outline',
      categoryColor: '#78909C',
      groupName: 'Khoản thu khác',
      totalAmount: uncategorizedIncome,
      transactionCount: uncategorizedIncomeCount,
    });
  }

  let totalSpendingLimit = 0;
  let overLimitCount = 0;

  const expenseCategories: CategoryExpenseSummary[] = Array.from(expenseMap.entries())
    .map(([catId, data]) => {
      const limit = limitMap.get(catId) ?? null;
      let percentUsed: number | null = null;
      let remainingAmount: number | null = null;
      let isOverLimit = false;

      if (limit !== null && limit > 0) {
        totalSpendingLimit += limit;
        percentUsed = Math.round((data.total / limit) * 100);
        remainingAmount = limit - data.total;
        isOverLimit = data.total > limit;
        if (isOverLimit) overLimitCount++;
      }

      return {
        categoryId: catId,
        categoryName: data.name,
        categoryIcon: data.icon,
        categoryColor: data.color,
        groupName: data.group,
        totalAmount: data.total,
        transactionCount: data.count,
        spendingLimit: limit,
        remainingAmount,
        percentUsed,
        isOverLimit,
      };
    });

  // If there is uncategorized expense, display it as a dedicated category item
  if (uncategorizedExpense > 0) {
    expenseCategories.push({
      categoryId: 'uncategorized_expense',
      categoryName: 'Chưa phân loại',
      categoryIcon: 'help-outline',
      categoryColor: '#78909C',
      groupName: 'Khoản chi khác',
      totalAmount: uncategorizedExpense,
      transactionCount: uncategorizedExpenseCount,
      spendingLimit: null,
      remainingAmount: null,
      percentUsed: null,
      isOverLimit: false,
    });
  }

  expenseCategories.sort((a, b) => {
    // Prioritize overspent first, then highest spent
    if (a.isOverLimit && !b.isOverLimit) return -1;
    if (!a.isOverLimit && b.isOverLimit) return 1;
    return b.totalAmount - a.totalAmount;
  });

  return {
    year,
    month,
    periodStart,
    periodEnd,
    currency,
    budget,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    incomeCategories,
    expenseCategories,
    uncategorizedIncome,
    uncategorizedExpense,
    totalSpendingLimit,
    overLimitCount,
  };
}

/**
 * Checks if a proposed transaction would exceed the category spending limit
 */
export async function checkSpendingLimit(
  categoryId: string,
  year: number,
  month: number,
  proposedAmount: number = 0
): Promise<{
  hasLimit: boolean;
  limit: number;
  spent: number;
  projectedTotal: number;
  remaining: number;
  isOverLimit: boolean;
  percentUsed: number;
}> {
  const db = getDatabase();
  const active = await getActiveBudget();
  if (!active) {
    return {
      hasLimit: false,
      limit: 0,
      spent: 0,
      projectedTotal: proposedAmount,
      remaining: 0,
      isOverLimit: false,
      percentUsed: 0,
    };
  }

  const alloc = await db.getFirstAsync<BudgetAllocationRow>(
    `SELECT * FROM budget_allocations WHERE budget_id = ? AND category_id = ?;`,
    [active.id, categoryId]
  );

  if (!alloc || !alloc.amount || alloc.amount <= 0) {
    return {
      hasLimit: false,
      limit: 0,
      spent: 0,
      projectedTotal: proposedAmount,
      remaining: 0,
      isOverLimit: false,
      percentUsed: 0,
    };
  }

  const limit = alloc.amount;
  const monthStr = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${year}-${monthStr}-01`;
  const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const res = await db.getFirstAsync<{ total_spent: number }>(
    `SELECT SUM(amount) as total_spent FROM transactions
     WHERE type = 'expense' AND category_id = ? AND date >= ? AND date <= ?;`,
    [categoryId, start, end]
  );

  const spent = Number(res?.total_spent) || 0;
  const projectedTotal = spent + proposedAmount;
  const remaining = limit - spent;
  const isOverLimit = projectedTotal > limit;
  const percentUsed = Math.round((projectedTotal / limit) * 100);

  return {
    hasLimit: true,
    limit,
    spent,
    projectedTotal,
    remaining,
    isOverLimit,
    percentUsed,
  };
}
