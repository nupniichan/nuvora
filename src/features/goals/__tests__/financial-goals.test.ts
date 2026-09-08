import { FinancialGoalRow } from '@/database/types';
import { calculateGoalMetrics } from '../financial-goals';

jest.mock('@/database/database', () => ({
  getDatabase: () => ({
    execAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    withTransactionAsync: jest.fn(),
  }),
}));

describe('Financial Goals Metrics', () => {
  it('calculates progress percentage, remaining amount, and completed state', () => {
    const goal: FinancialGoalRow = {
      id: 'g1',
      name: 'Quỹ khẩn cấp',
      type: 'saving',
      icon: 'shield',
      color: '#4CAF7D',
      target_amount: 50000000,
      current_amount: 25000000,
      target_date: null,
      linked_category_id: null,
      linked_account_id: null,
      notes: null,
      status: 'active',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };

    const metrics = calculateGoalMetrics(goal);
    expect(metrics.percentage).toBe(50);
    expect(metrics.remainingAmount).toBe(25000000);
    expect(metrics.isCompleted).toBe(false);
  });

  it('allows completion when funded but waits for the explicit action', () => {
    const goal: FinancialGoalRow = {
      id: 'g2',
      name: 'Mua xe máy',
      type: 'saving',
      icon: 'two-wheeler',
      color: '#42A5F5',
      target_amount: 30000000,
      current_amount: 35000000,
      target_date: null,
      linked_category_id: null,
      linked_account_id: null,
      notes: null,
      status: 'active',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };

    const metrics = calculateGoalMetrics(goal);
    expect(metrics.percentage).toBe(100);
    expect(metrics.remainingAmount).toBe(0);
    expect(metrics.isCompleted).toBe(false);
    expect(metrics.canComplete).toBe(true);
  });

  it('calculates overdue deadline state correctly', () => {
    const pastGoal: FinancialGoalRow = {
      id: 'g3',
      name: 'Trả nợ tín dụng',
      type: 'debt_payoff',
      icon: 'credit-card',
      color: '#EF5350',
      target_amount: 10000000,
      current_amount: 5000000,
      target_date: '2020-01-01', // Past date
      linked_category_id: null,
      linked_account_id: null,
      notes: null,
      status: 'active',
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2020-01-01T00:00:00Z',
    };

    const metrics = calculateGoalMetrics(pastGoal);
    expect(metrics.isOverdue).toBe(true);
    expect(metrics.daysRemaining).toBeLessThan(0);
  });
});
