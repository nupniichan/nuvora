import { getDatabase } from '@/database/database';
import { AccountRow } from '@/database/types';
import { getCurrentLanguage } from '@/i18n/language-state';
import { generateUUID } from '@/shared/uuid';

function localizeDefaultAccount(account: AccountRow): AccountRow {
  if (account.type !== 'cash' || !['Cash', 'Tiền mặt'].includes(account.name)) return account;
  return {
    ...account,
    name: getCurrentLanguage() === 'en' ? 'Cash' : 'Tiền mặt',
  };
}

export async function getAllAccounts(includeArchived: boolean = false): Promise<AccountRow[]> {
  const db = getDatabase();
  const sql = includeArchived
    ? 'SELECT * FROM accounts ORDER BY sort_order ASC, name ASC;'
    : 'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, name ASC;';
  const rows = await db.getAllAsync<AccountRow>(sql);
  return rows.map(localizeDefaultAccount);
}

export async function getAccountById(id: string): Promise<AccountRow | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE id = ?;', [id]);
  return row ? localizeDefaultAccount(row) : null;
}

// Share initialization across screens, but always reload balances on later calls.
const pendingDefaults = new WeakMap<object, Promise<AccountRow>>();

/** Return the one account used for all new entries. Legacy accounts stay intact. */
export function getDefaultAccount(): Promise<AccountRow> {
  const db = getDatabase();
  const pending = pendingDefaults.get(db);
  if (pending) return pending;

  const request = resolveDefaultAccount().finally(() => pendingDefaults.delete(db));
  pendingDefaults.set(db, request);
  return request;
}

async function resolveDefaultAccount(): Promise<AccountRow> {
  const db = getDatabase();
  let account: AccountRow | null = null;

  await db.withTransactionAsync(async () => {
    const saved = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?;', ['default_account_id']
    );
    if (saved) account = await getAccountById(saved.value);

    if (!account) {
      const setting = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?;', ['default_currency']
      );
      const currency = setting?.value || 'VND';
      const accounts = await getAllAccounts(true);
      account = accounts.find((item) => !item.is_archived && item.currency === currency)
        || accounts.find((item) => !item.is_archived)
        || accounts[0]
        || null;

      if (!account) {
        const id = generateUUID();
        const now = new Date().toISOString();
        await db.runAsync(
          "INSERT INTO accounts (id, name, type, currency, balance, icon, color, sort_order, is_archived, created_at, updated_at) VALUES (?, ?, 'cash', ?, 0, 'account-balance-wallet', '#CCCCFF', 1, 0, ?, ?);",
          [id, getCurrentLanguage() === 'en' ? 'Cash' : 'Tiền mặt', currency, now, now]
        );
        account = await getAccountById(id);
      }
    }

    if (!account) throw new Error('Failed to initialize the default account.');
    if (account.is_archived) {
      await db.runAsync('UPDATE accounts SET is_archived = 0, updated_at = ? WHERE id = ?;',
        [new Date().toISOString(), account.id]);
      account = { ...account, is_archived: 0 };
    }
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
      ['default_account_id', account.id, new Date().toISOString()]);
  });

  if (!account) throw new Error('Failed to initialize the default account.');
  return account;
}
