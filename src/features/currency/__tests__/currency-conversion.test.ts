import { closeDatabase, getDatabase, withGoalTransaction } from '@/database/database.web';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { getMonthlyLimit, saveMonthlyLimit } from '@/features/budgets/monthly-limits';
import { completeGoal, createGoal, getGoalById } from '@/features/goals/financial-goals';
import { createTransaction, deleteTransaction, getTransactions } from '@/features/transactions/transaction-queries';
import { convertCurrencyAmount, getCurrencySwitchState, switchCurrency } from '../currency-conversion';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => { let id = 0; return { generateUUID: () => String(++id) }; });

beforeEach(async () => { await closeDatabase(); });
afterEach(() => jest.restoreAllMocks());

async function seed() {
  const account = await getDefaultAccount();
  await createTransaction({ type: 'income', amount: 2500000, currency: 'VND', accountId: account.id, date: '2026-09-10' });
  return account;
}

it('converts dong to cents and back, handles negative amounts, and validates rates and precision', () => {
  expect(convertCurrencyAmount(250000, 'VND', 25000)).toBe(1000);
  expect(convertCurrencyAmount(1000, 'USD', 25000)).toBe(250000);
  expect(convertCurrencyAmount(-375, 'VND', 25000)).toBe(-2);
  for (const rate of [0, -1, NaN, Infinity]) expect(() => convertCurrencyAmount(1, 'VND', rate)).toThrow('invalidRate');
  expect(() => convertCurrencyAmount(1, 'VND', 25000)).toThrow('tooSmall');
  expect(() => convertCurrencyAmount(1.5, 'USD', 25000)).toThrow('invalidAmount');
  expect(() => convertCurrencyAmount(Number.MAX_SAFE_INTEGER, 'USD', 25000)).toThrow('invalidAmount');
});

it('converts every financial table, settings and completed goals in both directions', async () => {
  const account = await seed();
  const goal = await createGoal({ name: 'Laptop', type: 'saving', target_amount: 500000 });
  await completeGoal(goal.id);
  await saveMonthlyLimit(2026, 9, 'VND', 1000000, 'recurring');
  await saveMonthlyLimit(2026, 10, 'VND', null, 'month');
  const db = getDatabase();
  await db.runAsync('INSERT INTO budgets (id, currency, total_budget) VALUES (?, ?, ?);', ['budget', 'VND', 750000]);
  await db.runAsync('INSERT INTO budget_allocations (id, budget_id, amount, percentage) VALUES (?, ?, ?, ?);', ['allocation', 'budget', 250000, 20]);
  await db.runAsync('INSERT INTO recurring_rules (id, amount, currency) VALUES (?, ?, ?);', ['rule', 125000, 'VND']);
  await switchCurrency('VND', 25000);
  expect(await getDefaultAccount()).toMatchObject({ id: account.id, currency: 'USD', balance: 8000 });
  expect((await getTransactions()).map(tx => [tx.currency, tx.amount])).toEqual(expect.arrayContaining([['USD', 10000], ['USD', 2000]]));
  expect(await getGoalById(goal.id)).toMatchObject({ currency: 'USD', target_amount: 2000, current_amount: 2000, status: 'completed' });
  expect(await db.getFirstAsync('SELECT * FROM goal_contributions;')).toMatchObject({ amount: 2000 });
  expect(await db.getFirstAsync('SELECT * FROM budgets;')).toMatchObject({ currency: 'USD', total_budget: 3000 });
  expect(await db.getFirstAsync('SELECT * FROM budget_allocations;')).toMatchObject({ amount: 1000, percentage: 20 });
  expect(await db.getFirstAsync('SELECT * FROM recurring_rules;')).toMatchObject({ currency: 'USD', amount: 500 });
  expect((await getMonthlyLimit(2026, 9, 'USD')).limit).toBe(4000);
  expect((await getMonthlyLimit(2026, 10, 'USD')).limit).toBeNull();
  expect(await getCurrencySwitchState()).toMatchObject({ rate: '25000' });
  expect(await db.getFirstAsync('SELECT * FROM app_settings WHERE key = ?;', ['default_currency'])).toMatchObject({ value: 'USD' });
  await switchCurrency('USD', 25000);
  expect(await getDefaultAccount()).toMatchObject({ currency: 'VND', balance: 2000000 });
  expect(await getGoalById(goal.id)).toMatchObject({ target_amount: 500000 });
  expect((await getMonthlyLimit(2026, 9, 'VND')).limit).toBe(1000000);

  await deleteTransaction('goal-completion:' + goal.id);
  expect(await getDefaultAccount()).toMatchObject({ balance: 2500000 });
});

it('keeps rounded balances consistent with deletion of the converted ledger', async () => {
  const account = await getDefaultAccount();
  for (let i = 0; i < 3; i++) {
    await createTransaction({ type: 'income', amount: 375, currency: 'VND', accountId: account.id, date: '2026-09-10' });
  }
  await switchCurrency('VND', 25000);
  expect(await getDefaultAccount()).toMatchObject({ balance: 6 });
  for (const tx of await getTransactions()) await deleteTransaction(tx.id);
  expect(await getDefaultAccount()).toMatchObject({ balance: 0 });
});

it('leaves other currencies alone and includes archived accounts and planned transactions', async () => {
  await seed();
  const db = getDatabase();
  await db.runAsync('INSERT INTO accounts (id, currency, balance, is_archived) VALUES (?, ?, ?, ?);', ['archived', 'VND', 250000, 1]);
  await db.runAsync('INSERT INTO accounts (id, currency, balance) VALUES (?, ?, ?);', ['foreign', 'EUR', 12345]);
  await db.runAsync('INSERT INTO transactions (id, currency, amount, status) VALUES (?, ?, ?, ?);', ['planned', 'VND', 25000, 'planned']);
  await switchCurrency('VND', 25000);
  expect(await db.getFirstAsync('SELECT * FROM accounts WHERE id = ?;', ['archived'])).toMatchObject({ balance: 1000, currency: 'USD', is_archived: 1 });
  expect(await db.getFirstAsync('SELECT * FROM accounts WHERE id = ?;', ['foreign'])).toMatchObject({ balance: 12345, currency: 'EUR' });
  expect(await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?;', ['planned'])).toMatchObject({ amount: 100, currency: 'USD', status: 'planned' });
});

it('rolls back earlier updates when a later amount cannot be converted', async () => {
  await seed();
  await getDatabase().runAsync('INSERT INTO recurring_rules (id, currency, amount) VALUES (?, ?, ?);', ['tiny', 'VND', 1]);
  await expect(switchCurrency('VND', 25000)).rejects.toMatchObject({ code: 'tooSmall' });
  expect(await getDefaultAccount()).toMatchObject({ currency: 'VND', balance: 2500000 });
  expect((await getTransactions())[0]).toMatchObject({ currency: 'VND', amount: 2500000 });
});

it('rolls back when a database write fails', async () => {
  await seed();
  const databaseModule = jest.requireMock('@/database/database');
  const originalTransaction = withGoalTransaction;
  jest.spyOn(databaseModule, 'withGoalTransaction').mockImplementation(async (...args: unknown[]) => {
    const task = args[0] as (db: any) => Promise<void>;
    await originalTransaction(async db => {
      const run = db.runAsync.bind(db);
      jest.spyOn(db, 'runAsync').mockImplementation(async (sql, params) => {
        if (sql.startsWith('UPDATE transactions')) throw new Error('disk full');
        return run(sql, params);
      });
      await task(db);
    });
  });
  await expect(switchCurrency('VND', 25000)).rejects.toThrow('disk full');
  expect(await getDefaultAccount()).toMatchObject({ currency: 'VND', balance: 2500000 });
});

it('prevents duplicate conversion and preserves conflicting monthly schedules', async () => {
  await seed();
  const results = await Promise.allSettled([switchCurrency('VND', 25000), switchCurrency('VND', 25000)]);
  expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
  expect(await getDefaultAccount()).toMatchObject({ currency: 'USD', balance: 10000 });
  await saveMonthlyLimit(2026, 9, 'USD', 100, 'recurring');
  await saveMonthlyLimit(2026, 10, 'VND', 50000, 'month');
  await expect(switchCurrency('USD', 25000)).rejects.toMatchObject({ code: 'limitConflict' });
  expect((await getMonthlyLimit(2026, 9, 'USD')).limit).toBe(100);
  expect((await getMonthlyLimit(2026, 10, 'VND')).limit).toBe(50000);
});

it('persists the converted currency and rate across reopening the web database', async () => {
  const storage = new Map<string, string>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } } });
  try {
    await seed();
    await switchCurrency('VND', 25000);
    await closeDatabase();
    expect(await getCurrencySwitchState()).toMatchObject({ account: { currency: 'USD', balance: 10000 }, rate: '25000' });
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

it('keeps both memory and persisted data unchanged if browser storage is full', async () => {
  const storage = new Map<string, string>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let rejectConversion = false;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectConversion && value.includes('"currency":"USD"')) throw new Error('quota exceeded');
      storage.set(key, value);
    },
  } } });
  try {
    await seed();
    rejectConversion = true;
    await expect(switchCurrency('VND', 25000)).rejects.toThrow('quota exceeded');
    expect(await getDefaultAccount()).toMatchObject({ currency: 'VND', balance: 2500000 });
    await closeDatabase();
    expect(await getDefaultAccount()).toMatchObject({ currency: 'VND', balance: 2500000 });
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
