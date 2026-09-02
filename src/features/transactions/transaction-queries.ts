import { getDatabase } from '@/database/database';
import { TransactionRow, TransactionType } from '@/database/types';
import { generateUUID } from '@/shared/uuid';

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<TransactionRow[]> {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter.accountId) {
    conditions.push('(account_id = ? OR to_account_id = ?)');
    params.push(filter.accountId, filter.accountId);
  }
  if (filter.categoryId) {
    conditions.push('category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }
  if (filter.startDate) {
    conditions.push('date >= ?');
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    conditions.push('date <= ?');
    params.push(filter.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';

  const sql = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, created_at DESC ${limitClause};`;
  return await db.getAllAsync<TransactionRow>(sql, params);
}

export async function getTransactionById(id: string): Promise<TransactionRow | null> {
  const db = getDatabase();
  return await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?;', [id]);
}

/**
 * Creates a transaction and updates involved account balances atomically
 */
export async function createTransaction(data: {
  type: TransactionType;
  amount: number; // Integer minor units
  currency: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  recurringRuleId?: string;
  occurrenceId?: string;
  note?: string;
  date: string; // ISO date YYYY-MM-DD
}): Promise<TransactionRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Insert transaction
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?);`,
      [
        id,
        data.type,
        data.amount,
        data.currency,
        data.accountId,
        data.toAccountId || null,
        data.categoryId || null,
        data.recurringRuleId || null,
        data.occurrenceId || null,
        data.note || null,
        data.date,
        now,
        now,
      ]
    );

    // Update account balances
    if (data.type === 'income') {
      await db.runAsync(
        'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;',
        [data.amount, now, data.accountId]
      );
    } else if (data.type === 'expense') {
      await db.runAsync(
        'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
        [data.amount, now, data.accountId]
      );
    } else if (data.type === 'transfer' && data.toAccountId) {
      await db.runAsync(
        'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
        [data.amount, now, data.accountId]
      );
      await db.runAsync(
        'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;',
        [data.amount, now, data.toAccountId]
      );
    }
  });

  const created = await getTransactionById(id);
  if (!created) {
    throw new Error('Failed to retrieve newly created transaction.');
  }
  return created;
}

/**
 * Deletes a transaction and reverses balance changes atomically
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = getDatabase();
  const tx = await getTransactionById(id);
  if (!tx) return;

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (tx.type === 'income') {
      await db.runAsync(
        'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
        [tx.amount, now, tx.account_id]
      );
    } else if (tx.type === 'expense') {
      await db.runAsync(
        'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;',
        [tx.amount, now, tx.account_id]
      );
    } else if (tx.type === 'transfer' && tx.to_account_id) {
      await db.runAsync(
        'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;',
        [tx.amount, now, tx.account_id]
      );
      await db.runAsync(
        'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
        [tx.amount, now, tx.to_account_id]
      );
    }

    await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
  });
}
