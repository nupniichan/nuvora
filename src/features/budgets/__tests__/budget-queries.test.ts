import {
  checkSpendingLimit,
  createBudget,
  getActiveBudget,
  getBudgetWithAllocations,
  setCategorySpendingLimit,
} from '../budget-queries';

// Mock sqlite for in-memory testing of budget queries
jest.mock('@/database/database', () => {
  const budgetsMap = new Map<string, any>();
  const allocationsMap = new Map<string, any>();
  const categoriesMap = new Map<string, any>([
    ['cat_food', { id: 'cat_food', name: 'Food & Dining', icon: 'restaurant', color: '#FF7043' }],
    ['cat_rent', { id: 'cat_rent', name: 'Rent', icon: 'home', color: '#5C6BC0' }],
  ]);
  const transactionsMap = new Map<string, any>();

  const db = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM budget_allocations')) {
        const budgetId = params?.[0];
        const results = Array.from(allocationsMap.values())
          .filter((a) => a.budget_id === budgetId)
          .map((a) => {
            const c = categoriesMap.get(a.category_id);
            return {
              ...a,
              category_name: c?.name || 'Unknown',
              category_icon: c?.icon || null,
              category_color: c?.color || null,
            };
          });
        return results;
      }
      if (sql.includes('FROM transactions')) {
        return Array.from(transactionsMap.values());
      }
      return [];
    }),
    getFirstAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM budgets')) {
        if (sql.includes('WHERE id = ?')) {
          return budgetsMap.get(params?.[0]) || null;
        }
        if (sql.includes('is_active = 1')) {
          const active = Array.from(budgetsMap.values()).find((b) => b.is_active === 1);
          return active || null;
        }
        return Array.from(budgetsMap.values())[0] || null;
      }
      if (sql.includes('FROM budget_allocations')) {
        const budgetId = params?.[0];
        const categoryId = params?.[1];
        return (
          Array.from(allocationsMap.values()).find(
            (a) => a.budget_id === budgetId && a.category_id === categoryId
          ) || null
        );
      }
      if (sql.includes('SUM(amount) as total_spent FROM transactions')) {
        const catId = params?.[0];
        let total = 0;
        for (const tx of transactionsMap.values()) {
          if (tx.category_id === catId && tx.type === 'expense') {
            total += tx.amount;
          }
        }
        return { total_spent: total };
      }
      return null;
    }),
    runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('UPDATE budgets SET is_active = 0')) {
        for (const b of budgetsMap.values()) {
          b.is_active = 0;
        }
        return { changes: budgetsMap.size, lastInsertRowId: 0 };
      }
      if (sql.includes('INSERT INTO budgets')) {
        const [id, name, period_type, start_date, currency, total_budget, created_at, updated_at] = params || [];
        budgetsMap.set(id, {
          id,
          name,
          period_type,
          start_date,
          currency,
          total_budget: total_budget ?? null,
          is_active: 1,
          created_at,
          updated_at,
        });
        return { changes: 1, lastInsertRowId: 1 };
      }
      if (sql.includes('UPDATE budgets SET total_budget = ?')) {
        const [total, , budgetId] = params || [];
        const b = budgetsMap.get(budgetId);
        if (b) b.total_budget = total;
        return { changes: 1, lastInsertRowId: 0 };
      }
      if (sql.includes('INSERT INTO budget_allocations')) {
        const [id, budget_id, category_id, amount] = params || [];
        allocationsMap.set(id, {
          id,
          budget_id,
          category_id,
          rule_type: 'limit',
          amount,
          percentage: null,
          sort_order: 0,
        });
        return { changes: 1, lastInsertRowId: 1 };
      }
      if (sql.includes('UPDATE budget_allocations SET amount = ?')) {
        const [amount, id] = params || [];
        const a = allocationsMap.get(id);
        if (a) a.amount = amount;
        return { changes: 1, lastInsertRowId: 0 };
      }
      if (sql.includes('DELETE FROM budget_allocations')) {
        const budgetId = params?.[0];
        const categoryId = params?.[1];
        if (categoryId) {
          for (const [k, v] of allocationsMap.entries()) {
            if (v.budget_id === budgetId && v.category_id === categoryId) {
              allocationsMap.delete(k);
            }
          }
        } else {
          for (const [k, v] of allocationsMap.entries()) {
            if (v.budget_id === budgetId) allocationsMap.delete(k);
          }
        }
        return { changes: 1, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }),
    withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<void>) => {
      await cb();
    }),
    __clear: () => {
      budgetsMap.clear();
      allocationsMap.clear();
      transactionsMap.clear();
    },
    __seedTransaction: (tx: any) => {
      transactionsMap.set(tx.id, tx);
    },
  };

  return {
    getDatabase: () => db,
  };
});

describe('Budget Queries & Spending Limits', () => {
  beforeEach(() => {
    const dbModule = require('@/database/database');
    dbModule.getDatabase().__clear();
    jest.clearAllMocks();
  });

  it('creates a budget and sets it active', async () => {
    const budget = await createBudget({
      name: 'Ngân sách Tháng 9/2026',
      period_type: 'monthly',
      start_date: '2026-09-01',
      currency: 'VND',
      total_budget: 15000000,
    });

    expect(budget.id).toBeDefined();
    expect(budget.name).toBe('Ngân sách Tháng 9/2026');
    expect(budget.total_budget).toBe(15000000);
    expect(budget.is_active).toBe(1);

    const active = await getActiveBudget();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(budget.id);
  });

  it('sets and updates category spending limits', async () => {
    const budget = await createBudget({
      name: 'Test Limits',
      period_type: 'monthly',
      start_date: '2026-09-01',
      currency: 'VND',
    });

    // Set limit for cat_food to 2,000,000
    await setCategorySpendingLimit(budget.id, 'cat_food', 2000000);
    // Set limit for cat_rent to 5,000,000
    await setCategorySpendingLimit(budget.id, 'cat_rent', 5000000);

    let full = await getBudgetWithAllocations(budget.id);
    expect(full?.allocations.length).toBe(2);

    const foodAlloc = full?.allocations.find((a: any) => a.category_id === 'cat_food');
    expect(foodAlloc?.amount).toBe(2000000);

    // Update food limit to 2,500,000
    await setCategorySpendingLimit(budget.id, 'cat_food', 2500000);
    full = await getBudgetWithAllocations(budget.id);
    const updatedFood = full?.allocations.find((a: any) => a.category_id === 'cat_food');
    expect(updatedFood?.amount).toBe(2500000);

    // Remove limit (set to null)
    await setCategorySpendingLimit(budget.id, 'cat_rent', null);
    full = await getBudgetWithAllocations(budget.id);
    expect(full?.allocations.length).toBe(1);
  });

  it('checks spending limit and detects overspending correctly', async () => {
    const dbModule = require('@/database/database');
    const mockDb = dbModule.getDatabase();

    const budget = await createBudget({
      name: 'Budget Test',
      period_type: 'monthly',
      start_date: '2026-09-01',
      currency: 'VND',
    });

    await setCategorySpendingLimit(budget.id, 'cat_food', 2000000); // Limit 2M

    // Seed 1.5M expense
    mockDb.__seedTransaction({
      id: 'tx1',
      category_id: 'cat_food',
      type: 'expense',
      amount: 1500000,
      date: '2026-09-05',
    });

    // Proposing 300,000 more (Total = 1.8M <= 2M -> not over limit)
    const check1 = await checkSpendingLimit('cat_food', 2026, 9, 300000);
    expect(check1.hasLimit).toBe(true);
    expect(check1.limit).toBe(2000000);
    expect(check1.spent).toBe(1500000);
    expect(check1.projectedTotal).toBe(1800000);
    expect(check1.isOverLimit).toBe(false);
    expect(check1.percentUsed).toBe(90);

    // Proposing 800,000 more (Total = 2.3M > 2M -> OVER LIMIT)
    const check2 = await checkSpendingLimit('cat_food', 2026, 9, 800000);
    expect(check2.isOverLimit).toBe(true);
    expect(check2.projectedTotal).toBe(2300000);
    expect(check2.percentUsed).toBe(115);
  });
});
