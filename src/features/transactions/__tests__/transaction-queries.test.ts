import { closeDatabase, getDatabase } from '@/database/database.web';
import { getAccountById, getAllAccounts, getDefaultAccount } from '@/features/accounts/account-queries';
import { AccountRow } from '@/database/types';
import { generateUUID } from '@/shared/uuid';
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from '../transaction-queries';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => {
  let nextId = 0;
  return { generateUUID: () => String(++nextId) };
});

async function seedLegacyAccount(data: { name: string; type: string; currency: string; initialBalance: number }): Promise<AccountRow> {
  const id = generateUUID();
  await getDatabase().runAsync('INSERT INTO accounts (id, name, type, currency, balance, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, 1, 0);',
    [id, data.name, data.type, data.currency, data.initialBalance]);
  return (await getAccountById(id))!;
}

beforeEach(async () => { await closeDatabase(); });

it('uses the configured currency and reuses the default account', async () => {
  const db = getDatabase();
  await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?);', ['default_currency', 'USD']);
  const account = await getDefaultAccount();
  expect(account.currency).toBe('USD');
  expect((await getDefaultAccount()).id).toBe(account.id);
  expect(await getAllAccounts()).toHaveLength(1);
});

it('creates a usable default account for an empty database', async () => {
  const account = await getDefaultAccount();
  expect(account).toMatchObject({ currency: 'VND', balance: 0 });
  const tx = await createTransaction({ type: 'income', amount: 50000, currency: account.currency, accountId: account.id, date: '2026-09-08' });
  expect(tx.to_account_id).toBeNull();
  expect((await getAccountById(account.id))?.balance).toBe(50000);
});

it('keeps an existing entry on its original account when edited without a picker', async () => {
  const account = await seedLegacyAccount({ name: 'Original', type: 'bank', currency: 'VND', initialBalance: 100000 });
  const tx = await createTransaction({ type: 'expense', amount: 20000, currency: 'VND', accountId: account.id, date: '2026-09-08' });
  const updated = await updateTransaction(tx.id, { amount: 30000 });
  expect(updated.account_id).toBe(account.id);
  expect((await getAccountById(account.id))?.balance).toBe(70000);
  await updateTransaction(tx.id, { type: 'income', amount: 10000 });
  expect((await getAccountById(account.id))?.balance).toBe(110000);
  await deleteTransaction(tx.id);
  expect((await getAccountById(account.id))?.balance).toBe(100000);
});

it('rejects new transfers and converting an entry to a transfer without changing balances', async () => {
  const account = await getDefaultAccount();
  await expect(createTransaction({

    type: 'transfer', amount: 50000, currency: 'VND', accountId: account.id, date: '2026-09-08',
  })).rejects.toThrow('Transfers are no longer supported');
  expect(await getTransactions()).toHaveLength(0);
  expect((await getAccountById(account.id))?.balance).toBe(0);
  const tx = await createTransaction({ type: 'income', amount: 50000, currency: 'VND', accountId: account.id, date: '2026-09-08' });

  await expect(updateTransaction(tx.id, { type: 'transfer' })).rejects.toThrow('Transfers are no longer supported');
  expect((await getAccountById(account.id))?.balance).toBe(50000);
});

it('keeps historical transfers readable and reverses both balances when deleted', async () => {
  const source = await seedLegacyAccount({ name: 'Source', type: 'bank', currency: 'VND', initialBalance: 150000 });
  const target = await seedLegacyAccount({ name: 'Target', type: 'bank', currency: 'VND', initialBalance: 150000 });
  await getDatabase().runAsync('INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
    ['legacy', 'transfer', 50000, 'VND', source.id, target.id, '2026-09-01', 'confirmed']);
  expect(await getTransactions()).toHaveLength(1);
  await expect(updateTransaction('legacy', { amount: 60000 })).rejects.toThrow('Transfers are no longer supported');
  await deleteTransaction('legacy');
  expect((await getAccountById(source.id))?.balance).toBe(200000);
  expect((await getAccountById(target.id))?.balance).toBe(100000);
  expect(await getTransactions()).toHaveLength(0);
});

it('initializes only one account when several screens request it concurrently', async () => {
  const accounts = await Promise.all(Array.from({ length: 5 }, () => getDefaultAccount()));
  expect(new Set(accounts.map((account) => account.id)).size).toBe(1);
  expect(await getAllAccounts(true)).toHaveLength(1);
  await createTransaction({ type: 'income', amount: 50000, currency: 'VND', accountId: accounts[0].id, date: '2026-09-08' });
  expect((await getDefaultAccount()).balance).toBe(50000);
});

it('reuses an existing account without creating another when the currency setting differs', async () => {
  const legacy = await seedLegacyAccount({ name: 'Existing', type: 'cash', currency: 'VND', initialBalance: 100000 });
  await getDatabase().runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', ['default_currency', 'USD']);
  expect(await getDefaultAccount()).toMatchObject({ id: legacy.id, currency: 'VND', balance: 100000 });
  expect(await getAllAccounts(true)).toHaveLength(1);
});

it('keeps the chosen account when old accounts are renamed or the currency setting changes', async () => {
  const chosen = await getDefaultAccount();
  await seedLegacyAccount({ name: 'A restored account', type: 'bank', currency: 'USD', initialBalance: 3000 });
  await getDatabase().runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', ['default_currency', 'USD']);
  expect((await getDefaultAccount()).id).toBe(chosen.id);
  expect(await getAllAccounts(true)).toHaveLength(2);
});

it('recovers from a missing default reference after restoring an older backup', async () => {
  await getDatabase().runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', ['default_account_id', 'missing']);
  const legacy = await seedLegacyAccount({ name: 'Restored', type: 'cash', currency: 'VND', initialBalance: 123000 });
  expect((await getDefaultAccount()).id).toBe(legacy.id);
  expect((await getDefaultAccount()).balance).toBe(123000);
  expect(await getAllAccounts(true)).toHaveLength(1);
});
