import { closeDatabase, getDatabase } from '@/database/database.web';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { createTransaction } from '@/features/transactions/transaction-queries';
import { completeGoal, createGoal, getGoalById, getGoalFunds } from '@/features/goals/financial-goals';
import { createEncryptedBackup, restoreFromEncryptedBackup } from '../backup-service';
import { getMonthlyLimit, saveMonthlyLimit } from '@/features/budgets/monthly-limits';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => { let nextId = 0; return { generateUUID: () => String(++nextId) }; });

jest.mock('@/services/security/crypto', () => ({
  DEFAULT_KDF_PARAMS: {}, generateRandomHex: () => '00', deriveKeyArgon2id: async () => 'key',
  encryptAesGcm: async (plaintext: string) => ({ ciphertextHex: plaintext, nonceHex: 'nonce', authTagHex: 'tag' }),
  decryptAesGcm: async (ciphertext: string) => ciphertext,
}));

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8, 12));
  await closeDatabase();
});
afterEach(() => jest.useRealTimers());

it('restores automatic monthly limits, individual overrides and future changes', async () => {
  await saveMonthlyLimit(2026, 9, 'VND', 100, 'recurring');
  await saveMonthlyLimit(2026, 10, 'VND', 200, 'month');
  await saveMonthlyLimit(2026, 11, 'VND', null, 'month');
  await saveMonthlyLimit(2027, 1, 'VND', 300, 'recurring');
  const backup = await createEncryptedBackup('test');
  await closeDatabase();
  await restoreFromEncryptedBackup(backup, 'test');
  expect((await getMonthlyLimit(2026, 9, 'VND')).limit).toBe(100);
  expect((await getMonthlyLimit(2026, 10, 'VND')).limit).toBe(200);
  expect((await getMonthlyLimit(2026, 11, 'VND')).limit).toBeNull();
  expect((await getMonthlyLimit(2027, 2, 'VND')).limit).toBe(300);
});

it('restores completed goals, their expense links and balance without spending again', async () => {
  const account = await getDefaultAccount();
  await createTransaction({ type: 'income', amount: 10000000, currency: 'VND', accountId: account.id, date: '2026-09-08' });
  const goal = await createGoal({ name: 'Laptop', type: 'saving', target_amount: 3000000 });
  await completeGoal(goal.id);
  const backup = await createEncryptedBackup('test');
  await closeDatabase();
  await restoreFromEncryptedBackup(backup, 'test');
  expect(await getGoalById(goal.id)).toMatchObject({ status: 'completed', current_amount: 3000000 });
  expect(await getDatabase().getAllAsync('SELECT * FROM goal_contributions;')).toHaveLength(1);
  await completeGoal(goal.id);
  expect((await getGoalFunds()).balance).toBe(7000000);
});

it('clears current goals when restoring an older backup that has no goal tables', async () => {
  const goal = await createGoal({ name: 'Current goal', type: 'saving', target_amount: 3000000 });
  const envelope = JSON.parse(await createEncryptedBackup('test'));
  const payload = JSON.parse(envelope.ciphertextHex);
  delete payload.financial_goals;
  delete payload.goal_contributions;
  envelope.ciphertextHex = JSON.stringify(payload);
  await restoreFromEncryptedBackup(JSON.stringify(envelope), 'test');
  expect(await getGoalById(goal.id)).toBeNull();
  expect(await getDatabase().getAllAsync('SELECT * FROM goal_contributions;')).toHaveLength(0);
});
