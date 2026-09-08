import { closeDatabase, getDatabase } from '@/database/database.web';
import { getDefaultAccount, getAccountById } from '@/features/accounts/account-queries';
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from '@/features/transactions/transaction-queries';
import { completeGoal, createGoal, deleteGoal, getAllGoals, getGoalById, getGoalFunds, updateGoal } from '../financial-goals';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => { let nextId = 0; return { generateUUID: () => String(++nextId) }; });

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8, 12));
  await closeDatabase();
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

async function fund(amount = 10000000) {
  const account = await getDefaultAccount();
  await createTransaction({ type: 'income', amount, currency: account.currency, accountId: account.id, date: '2026-09-08' });
  return account;
}

it('uses live balance, waits for completion and spends the target exactly once', async () => {
  const account = await fund();
  const goal = await createGoal({ name: 'Laptop', type: 'saving', target_amount: 3000000 });
  expect(goal.current_amount).toBe(10000000);
  expect(await getGoalById(goal.id)).toMatchObject({ canComplete: true, isCompleted: false, status: 'active' });
  await Promise.all([completeGoal(goal.id), completeGoal(goal.id)]);
  expect((await getAccountById(account.id))?.balance).toBe(7000000);
  expect(await getGoalById(goal.id)).toMatchObject({ status: 'completed', current_amount: 3000000, isCompleted: true, canComplete: false });
  expect((await getTransactions()).filter((tx) => tx.type === 'expense')).toHaveLength(1);
  await expect(updateGoal(goal.id, { target_amount: 100 })).rejects.toMatchObject({ code: 'completedLocked' });
});

it('rejects deletion queued after completion and preserves its financial records', async () => {
  const account = await fund();
  const goal = await createGoal({ name: 'Laptop', type: 'saving', target_amount: 3000000 });
  const results = await Promise.allSettled([completeGoal(goal.id), deleteGoal(goal.id)]);
  expect(results[0].status).toBe('fulfilled');
  expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'completedLocked' } });
  await expect(deleteGoal(goal.id)).rejects.toMatchObject({ code: 'completedLocked' });
  expect(await getGoalById(goal.id)).toMatchObject({ status: 'completed', current_amount: 3000000 });
  expect((await getAccountById(account.id))?.balance).toBe(7000000);
  expect((await getTransactions()).filter((tx) => tx.type === 'expense')).toHaveLength(1);
  expect(await getDatabase().getAllAsync('SELECT * FROM goal_contributions;')).toHaveLength(1);
});

it('still allows deleting an unfinished goal without changing the balance', async () => {
  const account = await fund();
  const goal = await createGoal({ name: 'Laptop', type: 'saving', target_amount: 3000000 });
  await deleteGoal(goal.id);
  expect(await getGoalById(goal.id)).toBeNull();
  expect((await getAccountById(account.id))?.balance).toBe(10000000);
  expect(await getTransactions()).toHaveLength(1);
});

it('recalculates every active goal after spending and prevents two goals spending the same money', async () => {
  const account = await fund();
  const first = await createGoal({ name: 'One', type: 'saving', target_amount: 6000000 });
  const second = await createGoal({ name: 'Two', type: 'custom', target_amount: 6000000 });
  const result = await Promise.allSettled([completeGoal(first.id), completeGoal(second.id)]);
  expect(result.map((item) => item.status)).toEqual(['fulfilled', 'rejected']);
  expect((await getAccountById(account.id))?.balance).toBe(4000000);
  expect(await getGoalById(second.id)).toMatchObject({ current_amount: 4000000, canComplete: false, remainingAmount: 2000000 });
  expect(await getAllGoals('active')).toHaveLength(1);
});

it('checks the latest available balance and excludes future confirmed income', async () => {
  const account = await fund(2000000);
  const goal = await createGoal({ name: 'Goal', type: 'saving', target_amount: 3000000 });
  await createTransaction({ type: 'income', amount: 5000000, currency: account.currency, accountId: account.id, date: '2026-10-01' });
  expect((await getGoalFunds()).balance).toBe(2000000);
  await expect(completeGoal(goal.id)).rejects.toMatchObject({ code: 'insufficientFunds' });
  expect((await getAccountById(account.id))?.balance).toBe(7000000);
  expect((await getTransactions()).filter((tx) => tx.type === 'expense')).toHaveLength(0);
});

it('rolls back the expense, balance and status if a completion write fails', async () => {
  const account = await fund();
  const goal = await createGoal({ name: 'Goal', type: 'saving', target_amount: 3000000 });
  const prototype = Object.getPrototypeOf(getDatabase());
  const original = prototype.runAsync;
  jest.spyOn(prototype, 'runAsync').mockImplementation(function (this: any, ...args: any[]) {
    if (String(args[0]).startsWith('INSERT INTO goal_contributions')) throw new Error('Simulated write failure');
    return original.apply(this, args);
  });
  await expect(completeGoal(goal.id)).rejects.toThrow('Simulated write failure');
  expect((await getAccountById(account.id))?.balance).toBe(10000000);
  expect((await getGoalById(goal.id))?.status).toBe('active');
  expect((await getTransactions()).filter((tx) => tx.type === 'expense')).toHaveLength(0);
});

it('deleting the completion expense refunds once and reopens the goal', async () => {
  const account = await fund();
  const goal = await createGoal({ name: 'Goal', type: 'saving', target_amount: 3000000 });
  await completeGoal(goal.id);
  const expenseId = 'goal-completion:' + goal.id;
  await expect(updateTransaction(expenseId, { amount: 1 })).rejects.toThrow('goalCompletionLocked');
  await Promise.all([deleteTransaction(expenseId), deleteTransaction(expenseId)]);
  expect((await getAccountById(account.id))?.balance).toBe(10000000);
  expect((await getGoalById(goal.id))?.status).toBe('active');
  await completeGoal(goal.id);
  expect((await getAccountById(account.id))?.balance).toBe(7000000);
});

it('uses the default currency and accepts the exact remaining balance', async () => {
  await getDatabase().runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?);', ['default_currency', 'USD']);
  const account = await fund(1250);
  const goal = await createGoal({ name: 'Goal', type: 'custom', target_amount: 1250 });
  expect(await getGoalById(goal.id)).toMatchObject({ currency: 'USD', canComplete: true });
  await completeGoal(goal.id);
  expect((await getGoalFunds()).balance).toBe(0);
  expect((await getAccountById(account.id))?.balance).toBe(0);
});
