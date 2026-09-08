import { AccountRow, TransactionRow } from '@/database/types';
import { buildBalanceComparisons } from '../balance-comparison';

const account = (overrides: Partial<AccountRow> = {}): AccountRow => ({
  id: 'cash', name: 'Cash', type: 'cash', currency: 'VND', balance: 130000,
  icon: null, color: null, sort_order: 1, is_archived: 0,
  created_at: '2025-01-01T00:00:00.000Z', updated_at: '2026-09-08T00:00:00.000Z', ...overrides,
});
const tx = (overrides: Partial<TransactionRow> = {}): TransactionRow => ({
  id: 'tx', type: 'income', amount: 50000, currency: 'VND', account_id: 'cash',
  to_account_id: null, category_id: null, recurring_rule_id: null, occurrence_id: null,
  note: null, date: '2026-09-08', status: 'confirmed', created_at: '', updated_at: '', ...overrides,
});
const today = new Date(2026, 8, 8);

it('compares balance including opening funds against the previous month and year closings', () => {
  const [result] = buildBalanceComparisons([account()], [
    tx({ date: '2026-08-31', amount: 20000 }),
    tx({ amount: 30000 }),
  ], today);
  expect(result.balance).toBe(130000);
  expect(result.month).toEqual({ date: '2026-08-31', previousBalance: 100000, amount: 30000, percent: 30 });
  expect(result.year.previousBalance).toBe(80000);
  expect(result.year.amount).toBe(50000);
});

it('handles decreases, unchanged balances, zero baselines and negative balances', () => {
  const [down] = buildBalanceComparisons([account({ balance: 70000 })], [tx({ type: 'expense', amount: 30000 })], today);
  expect(down.month).toMatchObject({ previousBalance: 100000, amount: -30000, percent: -30 });
  const [same] = buildBalanceComparisons([account()], [], today);
  expect(same.month).toMatchObject({ amount: 0, percent: 0 });
  const [zero] = buildBalanceComparisons([account({ balance: 50000 })], [tx()], today);
  expect(zero.month).toMatchObject({ previousBalance: 0, amount: 50000, percent: null });
  const [negative] = buildBalanceComparisons([account({ balance: -50000 })], [tx()], today);
  expect(negative.month).toMatchObject({ previousBalance: -100000, amount: 50000, percent: 50 });
});

it('does not invent a previous balance before tracking began', () => {
  const [recent] = buildBalanceComparisons([account({ created_at: '2026-09-01T00:00:00Z' })], [tx()], today);
  expect(recent.month).toMatchObject({ previousBalance: null, amount: null, percent: null });
  const [partial] = buildBalanceComparisons([account({ created_at: '2026-08-01T00:00:00Z' })], [], today);
  expect(partial.month.amount).toBe(0);
  expect(partial.year.amount).toBeNull();
});

it('uses imported historical dates and handles January and leap-year month ends', () => {
  const [january] = buildBalanceComparisons([account({ created_at: '2026-01-02T00:00:00Z' })], [tx({ date: '2025-12-31' })], new Date(2026, 0, 5));
  expect(january.month.date).toBe('2025-12-31');
  expect(january.year.date).toBe('2025-12-31');
  expect(january.month.amount).toBe(0);
  expect(buildBalanceComparisons([account()], [], new Date(2024, 2, 1))[0].month.date).toBe('2024-02-29');
});

it('excludes planned entries and reverses already-posted future entries from today’s balance', () => {
  const [result] = buildBalanceComparisons([account({ balance: 200000 })], [
    tx({ date: '2026-10-01', amount: 100000 }),
    tx({ type: 'expense', status: 'planned', amount: 50000 }),
    tx({ currency: 'USD' }), tx({ date: 'invalid' }), tx({ date: '2026-02-30' }), tx({ amount: NaN }),
  ], today);
  expect(result.balance).toBe(100000);
  expect(result.month).toMatchObject({ previousBalance: 100000, amount: 0 });
});

it('keeps currencies separate and cancels historical transfers within the same total', () => {
  const results = buildBalanceComparisons([
    account({ balance: 80000 }), account({ id: 'bank', balance: 70000 }),
    account({ id: 'usd', currency: 'USD', balance: 2000 }),
    account({ id: 'archived', is_archived: 1, balance: 900000 }),
  ], [tx({ type: 'transfer', to_account_id: 'bank', amount: 20000 })], today);
  expect(results).toHaveLength(2);
  expect(results[0].balance).toBe(150000);
  expect(results[0].month.amount).toBe(0);
  expect(results[1].balance).toBe(2000);
});
