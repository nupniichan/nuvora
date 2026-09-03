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

/**
 * Updates an existing transaction and adjusts account balances accordingly
 */
export async function updateTransaction(
  id: string,
  data: {
    type?: TransactionType;
    amount?: number;
    currency?: string;
    accountId?: string;
    toAccountId?: string | null;
    categoryId?: string | null;
    note?: string | null;
    date?: string;
  }
): Promise<TransactionRow> {
  const db = getDatabase();
  const oldTx = await getTransactionById(id);
  if (!oldTx) throw new Error('Giao dịch không tồn tại');

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // 1. Revert previous transaction effects on accounts
    if (oldTx.type === 'income') {
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
        oldTx.amount,
        now,
        oldTx.account_id,
      ]);
    } else if (oldTx.type === 'expense') {
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
        oldTx.amount,
        now,
        oldTx.account_id,
      ]);
    } else if (oldTx.type === 'transfer' && oldTx.to_account_id) {
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
        oldTx.amount,
        now,
        oldTx.account_id,
      ]);
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
        oldTx.amount,
        now,
        oldTx.to_account_id,
      ]);
    }

    // 2. Prepare new transaction values
    const newType = data.type !== undefined ? data.type : oldTx.type;
    const newAmount = data.amount !== undefined ? data.amount : oldTx.amount;
    const newCurrency = data.currency !== undefined ? data.currency : oldTx.currency;
    const newAccountId = data.accountId !== undefined ? data.accountId : oldTx.account_id;
    const newToAccountId = data.toAccountId !== undefined ? data.toAccountId : oldTx.to_account_id;
    const newCategoryId = data.categoryId !== undefined ? data.categoryId : oldTx.category_id;
    const newNote = data.note !== undefined ? data.note : oldTx.note;
    const newDate = data.date !== undefined ? data.date : oldTx.date;

    // 3. Apply new transaction effects on accounts
    if (newType === 'income') {
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
        newAmount,
        now,
        newAccountId,
      ]);
    } else if (newType === 'expense') {
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
        newAmount,
        now,
        newAccountId,
      ]);
    } else if (newType === 'transfer' && newToAccountId) {
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
        newAmount,
        now,
        newAccountId,
      ]);
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
        newAmount,
        now,
        newToAccountId,
      ]);
    }

    // 4. Update transaction record
    await db.runAsync(
      `UPDATE transactions
       SET type = ?, amount = ?, currency = ?, account_id = ?, to_account_id = ?,
           category_id = ?, note = ?, date = ?, updated_at = ?
       WHERE id = ?;`,
      [
        newType,
        newAmount,
        newCurrency,
        newAccountId,
        newToAccountId || null,
        newCategoryId || null,
        newNote || null,
        newDate,
        now,
        id,
      ]
    );
  });

  const updated = await getTransactionById(id);
  if (!updated) throw new Error('Không thể tải giao dịch sau khi cập nhật');
  return updated;
}
