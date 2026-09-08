import { buildSpendingHistory } from '../insight-data';
import { TransactionRow } from '@/database/types';

jest.mock('@/features/transactions/transaction-queries', () => ({ getTransactions: jest.fn() }));

const tx = (overrides: Partial<TransactionRow> = {}) => ({
  date: '2026-01-05', amount: 10000, type: 'expense' as const,
  currency: 'VND', status: 'confirmed' as const, ...overrides,
});

describe('spending history', () => {
  it('fills missing calendar days and crosses year boundaries with six chronological months', () => {
    const history = buildSpendingHistory([tx(), tx({ amount: 25000 }), tx({ date: '2025-12-31', type: 'income', amount: 50000 }), tx({ type: 'income', amount: 75000 })], 2026, 1, 'VND');
    expect(history.days).toHaveLength(31);
    expect(history.days[4].amount).toBe(35000);
    expect(history.days[4].income).toBe(75000);
    expect(history.days[5].amount).toBe(0);
    expect(history.months[0]).toEqual({ year: 2025, month: 8, income: 0, expense: 0 });
    expect(history.months[4].income).toBe(50000);
    expect(history.months[5].expense).toBe(35000);
    expect(history.months[5].income).toBe(75000);
  });

  it('excludes other currencies, transfers, planned entries, invalid amounts/dates and out-of-range transactions', () => {
    const history = buildSpendingHistory([
      tx(), tx({ currency: 'USD' }), tx({ type: 'transfer' }), tx({ status: 'planned' }),
      tx({ amount: -1 }), tx({ amount: NaN }), tx({ amount: 1.5 }),
      tx({ date: '2026-01-32' }), tx({ date: '2025-07-31' }), tx({ date: '2026-02-01' }),
    ], 2026, 1, 'VND');
    expect(history.months.reduce((sum, point) => sum + point.expense, 0)).toBe(10000);
    expect(history.days.reduce((sum, point) => sum + point.amount, 0)).toBe(10000);
  });

  it('handles leap days and preserves minor units for decimal currencies', () => {
    const leap = buildSpendingHistory([tx({ date: '2024-02-29', currency: 'USD', amount: 1250 })], 2024, 2, 'USD');
    expect(leap.days).toHaveLength(29);
    expect(leap.days[28].amount).toBe(1250);
    expect(leap.months[5].expense).toBe(1250);
    expect(buildSpendingHistory([], 2025, 2, 'USD').days).toHaveLength(28);
  });

  it('represents empty months as zero without synthetic activity', () => {
    const history = buildSpendingHistory([], 2026, 9, 'VND');
    expect(history.months).toHaveLength(6);
    expect(history.months.every((point) => point.income === 0 && point.expense === 0)).toBe(true);
    expect(history.days.every((point) => point.amount === 0 && point.income === 0)).toBe(true);
  });
});
