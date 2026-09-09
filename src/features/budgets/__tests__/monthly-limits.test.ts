import { closeDatabase, getDatabase } from '@/database/database.web';
import { getDefaultAccount, getAccountById } from '@/features/accounts/account-queries';
import { createTransaction, updateTransaction, getTransactions } from '@/features/transactions/transaction-queries';
import { confirmOccurrence, createRecurringRule, processRecurringCatchUp } from '@/features/recurring/recurring-queries';
import { completeGoal, createGoal } from '@/features/goals/financial-goals';
import { formatDateISO } from '@/shared/date-utils';
import { getMonthlyLimit, saveMonthlyLimit, projectMonthlyExpense, MonthlyLimitExceededError } from '../monthly-limits';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => {
  let nextId = 0;
  return { generateUUID: () => String(++nextId) };
});

beforeEach(async () => { await closeDatabase(); });

it('keeps month-only limits isolated, including an explicit unlimited month', async () => {
  await saveMonthlyLimit(2026, 9, 'VND', 100, 'month');
  expect((await getMonthlyLimit(2026, 9, 'VND')).limit).toBe(100);
  expect((await getMonthlyLimit(2026, 10, 'VND')).limit).toBeNull();
  expect((await getMonthlyLimit(2026, 9, 'USD')).limit).toBeNull();
  await saveMonthlyLimit(2026, 9, 'VND', null, 'month');
  expect((await getMonthlyLimit(2026, 9, 'VND')).limit).toBeNull();
});

it('repeats across years, preserves overrides, supports future rule changes and stopping', async () => {
  await saveMonthlyLimit(2026, 9, 'VND', 100, 'recurring');
  await saveMonthlyLimit(2026, 10, 'VND', 200, 'month');
  await saveMonthlyLimit(2026, 11, 'VND', null, 'month');
  await saveMonthlyLimit(2027, 1, 'VND', 300, 'recurring');
  expect((await getMonthlyLimit(2026, 8, 'VND')).limit).toBeNull();
  expect((await getMonthlyLimit(2026, 10, 'VND')).limit).toBe(200);
  expect((await getMonthlyLimit(2026, 11, 'VND')).limit).toBeNull();
  expect((await getMonthlyLimit(2026, 12, 'VND')).limit).toBe(100);
  expect((await getMonthlyLimit(2027, 2, 'VND')).limit).toBe(300);
  await saveMonthlyLimit(2026, 10, 'VND', null, 'inherit');
  expect((await getMonthlyLimit(2026, 10, 'VND')).limit).toBe(100);
  await saveMonthlyLimit(2027, 3, 'VND', null, 'recurring');
  expect((await getMonthlyLimit(2027, 4, 'VND')).limit).toBeNull();
  expect((await getMonthlyLimit(2027, 2, 'VND')).limit).toBe(300);
});

it('retains legacy totals only in their original month and can remove them', async () => {
  await getDatabase().runAsync('INSERT INTO budgets (id, currency, start_date, total_budget, updated_at) VALUES (?, ?, ?, ?, ?);', ['old', 'VND', '2026-09-01', 500, '2026-09-01']);
  expect((await getMonthlyLimit(2026, 9, 'VND')).limit).toBe(500);
  expect((await getMonthlyLimit(2026, 10, 'VND')).limit).toBeNull();
  await saveMonthlyLimit(2026, 9, 'VND', null, 'inherit');
  expect((await getMonthlyLimit(2026, 9, 'VND')).limit).toBeNull();
});

it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid limit %s', async amount => {
  await expect(saveMonthlyLimit(2026, 9, 'VND', amount, 'month')).rejects.toThrow();
});

it('counts confirmed expenses across accounts and categories, using local month boundaries and currency', async () => {
  await saveMonthlyLimit(2028, 2, 'VND', 100, 'month');
  const entries = [
    ['a', 'expense', 30, 'VND', 'confirmed', '2028-02-01'],
    ['goal-completion:b', 'expense', 40, 'VND', 'confirmed', '2028-02-29'],
    ['c', 'expense', 500, 'USD', 'confirmed', '2028-02-02'],
    ['d', 'expense', 500, 'VND', 'planned', '2028-02-02'],
    ['e', 'income', 500, 'VND', 'confirmed', '2028-02-02'],
    ['f', 'transfer', 500, 'VND', 'confirmed', '2028-02-02'],
    ['g', 'expense', 500, 'VND', 'confirmed', '2028-01-31'],
    ['h', 'expense', 500, 'VND', 'confirmed', '2028-03-01'],
  ];
  for (const entry of entries) await getDatabase().runAsync('INSERT INTO transactions (id, type, amount, currency, status, date) VALUES (?, ?, ?, ?, ?, ?);', entry);
  expect(await projectMonthlyExpense('2028-02-29', 'VND', 30)).toMatchObject({ spent: 70, projected: 100, exceeded: 0 });
  expect(await projectMonthlyExpense('2028-02-29', 'VND', 31)).toMatchObject({ exceeded: 1 });
  await expect(projectMonthlyExpense('2026-02-29', 'VND', 30)).rejects.toThrow();
});

it('requires fresh explicit approval before posting, and serializes competing expenses', async () => {
  const account = await getDefaultAccount();
  await saveMonthlyLimit(2026, 9, 'VND', 100, 'month');
  const data = { type: 'expense' as const, amount: 60, currency: 'VND', accountId: account.id, date: '2026-09-08' };
  const results = await Promise.allSettled([createTransaction(data), createTransaction(data)]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  const error = (results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason as MonthlyLimitExceededError;
  expect(error).toBeInstanceOf(MonthlyLimitExceededError);
  expect((await getAccountById(account.id))?.balance).toBe(-60);
  expect(await getTransactions()).toHaveLength(1);
  await expect(createTransaction({ ...data, amount: 70, monthlyLimitApproval: error.approval })).rejects.toBeInstanceOf(MonthlyLimitExceededError);
  await createTransaction({ ...data, monthlyLimitApproval: error.approval });
  expect((await getAccountById(account.id))?.balance).toBe(-120);
  await expect(createTransaction({ ...data, monthlyLimitApproval: error.approval })).rejects.toBeInstanceOf(MonthlyLimitExceededError);
});

it('excludes the old entry on edit and checks the destination month', async () => {
  const account = await getDefaultAccount();
  await saveMonthlyLimit(2026, 9, 'VND', 100, 'month');
  await saveMonthlyLimit(2026, 10, 'VND', 50, 'month');
  const entry = await createTransaction({ type: 'expense', amount: 60, currency: 'VND', accountId: account.id, date: '2026-09-08' });
  await updateTransaction(entry.id, { amount: 100 });
  await expect(updateTransaction(entry.id, { date: '2026-10-01' })).rejects.toMatchObject({ projection: { spent: 0, projected: 100, exceeded: 50 } });
  expect((await getTransactions())[0].date).toBe('2026-09-08');
  expect((await getAccountById(account.id))?.balance).toBe(-100);
  await updateTransaction(entry.id, { type: 'income', amount: 500 });
  expect((await getAccountById(account.id))?.balance).toBe(500);
});

it('leaves automatic over-limit occurrences pending until the user approves', async () => {
  const account = await getDefaultAccount();
  await saveMonthlyLimit(2026, 9, 'VND', 100, 'month');
  await createRecurringRule({ name: 'Expense', type: 'expense', amount: 60, currency: 'VND', accountId: account.id, frequency: 'daily', startDate: '2026-09-08', behavior: 'auto_post' });
  expect(await processRecurringCatchUp('2026-09-09')).toEqual({ processed: 1, created: 1 });
  const pending = await getDatabase().getFirstAsync("SELECT * FROM automation_occurrences WHERE status = 'pending';");
  const error = await confirmOccurrence(pending!.id).catch(e => e);
  expect(error).toBeInstanceOf(MonthlyLimitExceededError);
  expect(await getTransactions()).toHaveLength(1);
  await confirmOccurrence(pending!.id, error.approval);
  await confirmOccurrence(pending!.id, error.approval);
  expect(await getTransactions()).toHaveLength(2);
  expect(await processRecurringCatchUp('2026-09-09')).toEqual({ processed: 0, created: 0 });
});

it('requires approval for a goal completion and rolls back on rejection', async () => {
  const date = formatDateISO(new Date());
  const [year, month] = date.split('-').map(Number);
  const account = await getDefaultAccount();
  await createTransaction({ type: 'income', amount: 1000, currency: 'VND', accountId: account.id, date });
  await saveMonthlyLimit(year, month, 'VND', 100, 'month');
  const goal = await createGoal({ name: 'Goal', type: 'saving', target_amount: 200 });
  const error = await completeGoal(goal.id).catch(e => e);
  expect(error).toBeInstanceOf(MonthlyLimitExceededError);
  expect((await getAccountById(account.id))?.balance).toBe(1000);
  await completeGoal(goal.id, undefined, error.approval);
  expect((await getAccountById(account.id))?.balance).toBe(800);
});
