import { closeDatabase, getDatabase } from '@/database/database.web';
import { getDefaultAccount, getAccountById } from '@/features/accounts/account-queries';
import { getTransactions } from '@/features/transactions/transaction-queries';
import { confirmOccurrence, createRecurringRule, processRecurringCatchUp } from '../recurring-queries';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => {
  let nextId = 0;
  return { generateUUID: () => String(++nextId) };
});

beforeEach(async () => { await closeDatabase(); });

it('ignores legacy transfer rules while continuing normal recurring entries', async () => {
  const account = await getDefaultAccount();
  const db = getDatabase();
  for (const behavior of ['confirm', 'auto_post']) {
    await db.runAsync('INSERT INTO recurring_rules (id, type, account_id, amount, currency, frequency, start_date, behavior, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);',
      [behavior, 'transfer', account.id, 10000, 'VND', 'daily', '2026-09-08', behavior]);
  }
  await db.runAsync('INSERT INTO automation_occurrences (id, recurring_rule_id, status, scheduled_date) VALUES (?, ?, ?, ?);', ['legacy-pending', 'confirm', 'pending', '2026-09-08']);
  await confirmOccurrence('legacy-pending');
  expect(await getTransactions()).toHaveLength(0);
  await createRecurringRule({ name: 'Salary', type: 'income', amount: 50000, currency: account.currency, accountId: account.id, frequency: 'daily', startDate: '2026-09-08', behavior: 'auto_post' });
  expect(await processRecurringCatchUp('2026-09-08')).toEqual({ processed: 1, created: 0 });
  expect(await getTransactions()).toHaveLength(1);
  expect((await getAccountById(account.id))?.balance).toBe(50000);
});

it('rejects new recurring transfers', async () => {
  const account = await getDefaultAccount();
  await expect(createRecurringRule({

    type: 'transfer', name: 'Removed', amount: 10000, currency: 'VND', accountId: account.id, frequency: 'daily', startDate: '2026-09-08',
  })).rejects.toThrow('Transfers are no longer supported');
});
