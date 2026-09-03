import { getDatabase } from '@/database/database';
import { AccountRow, AccountType } from '@/database/types';
import { generateUUID } from '@/shared/uuid';

export async function getAllAccounts(includeArchived: boolean = false): Promise<AccountRow[]> {
  const db = getDatabase();
  const sql = includeArchived
    ? 'SELECT * FROM accounts ORDER BY sort_order ASC, name ASC;'
    : 'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, name ASC;';
  return await db.getAllAsync<AccountRow>(sql);
}

export async function getAccountById(id: string): Promise<AccountRow | null> {
  const db = getDatabase();
  return await db.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE id = ?;', [id]);
}

export async function createAccount(data: {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number; // Integer minor units
  icon?: string;
  color?: string;
}): Promise<AccountRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, balance, icon, color, sort_order, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 10, 0, ?, ?);`,
    [
      id,
      data.name,
      data.type,
      data.currency,
      data.initialBalance,
      data.icon || 'account-balance-wallet',
      data.color || '#F89E62',
      now,
      now,
    ]
  );

  const created = await getAccountById(id);
  if (!created) {
    throw new Error('Failed to retrieve newly created account.');
  }
  return created;
}

export async function updateAccount(
  id: string,
  data: Partial<Pick<AccountRow, 'name' | 'type' | 'currency' | 'icon' | 'color' | 'is_archived'>>
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.currency !== undefined) {
    updates.push('currency = ?');
    values.push(data.currency);
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?');
    values.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    values.push(data.color);
  }
  if (data.is_archived !== undefined) {
    updates.push('is_archived = ?');
    values.push(data.is_archived);
  }

  values.push(id);
  await db.runAsync(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?;`, values);
}

/**
 * Gets transaction count for an account to determine if safe to delete
 */
export async function getAccountTransactionCount(id: string): Promise<number> {
  const db = getDatabase();
  const res = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR to_account_id = ?;`,
    [id, id]
  );
  return res ? Number(res.count) : 0;
}

/**
 * Deletes or archives an account safely
 */
export async function deleteAccount(id: string): Promise<boolean> {
  const db = getDatabase();
  const count = await getAccountTransactionCount(id);
  if (count > 0) {
    // If account has transactions, soft-delete (archive) to preserve history
    await updateAccount(id, { is_archived: 1 });
    return false;
  }

  // Hard delete if completely clean
  await db.runAsync('DELETE FROM accounts WHERE id = ?;', [id]);
  return true;
}
