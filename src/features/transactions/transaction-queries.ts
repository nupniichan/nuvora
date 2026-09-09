import { getDatabase, withGoalTransaction } from '@/database/database';
import { runGoalWrite } from '@/database/goal-write';
import { EntryType, TransactionRow, TransactionType } from '@/database/types';
import { generateUUID } from '@/shared/uuid';
import { requireMonthlyLimitApproval } from '@/features/budgets/monthly-limits';

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
export function createTransaction(data: Parameters<typeof createTransactionOnce>[0]): Promise<TransactionRow> {
  return runGoalWrite(() => createTransactionOnce(data));
}

async function createTransactionOnce(data: {
  type: EntryType;
  amount: number; // Integer minor units
  currency: string;
  accountId: string;
  categoryId?: string;
  recurringRuleId?: string;
  occurrenceId?: string;
  note?: string;
  date: string; // ISO date YYYY-MM-DD
  monthlyLimitApproval?: string;
}): Promise<TransactionRow> {
  if (data.type !== 'income' && data.type !== 'expense') {
    throw new Error('Transfers are no longer supported.');
  }
  const db = getDatabase();
  if (data.occurrenceId) {
    const existing = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE occurrence_id = ?;', [data.occurrenceId]);
    if (existing) return existing;
  }
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await requireMonthlyLimitApproval({ ...data, operation: `create:${data.accountId}` }, data.monthlyLimitApproval);
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
        null,
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
    }
    if (data.occurrenceId) {
      await db.runAsync(
        "UPDATE automation_occurrences SET status = 'confirmed', transaction_id = ?, processed_at = ? WHERE id = ?;",
        [id, now, data.occurrenceId]
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
export function isGoalCompletionTransaction(id: string): boolean {
  return id.startsWith('goal-completion:');
}

export async function deleteTransaction(id: string): Promise<void> {
  if (isGoalCompletionTransaction(id)) {
    return runGoalWrite(async () => {
      await withGoalTransaction(async (txn) => {
        const entry = await txn.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?;', [id]);
        if (!entry) return;
        const now = new Date().toISOString();
        await txn.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [entry.amount, now, entry.account_id]);
        await txn.runAsync("UPDATE financial_goals SET status = 'active', current_amount = 0, updated_at = ? WHERE id = ?;", [now, id.slice('goal-completion:'.length)]);
        await txn.runAsync('DELETE FROM goal_contributions WHERE transaction_id = ?;', [id]);
        await txn.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
      });
    });
  }
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
export function updateTransaction(id: string, data: Parameters<typeof updateTransactionOnce>[1]): Promise<TransactionRow> {
  return runGoalWrite(() => updateTransactionOnce(id, data));
}

async function updateTransactionOnce(
  id: string,
  data: {
    type?: EntryType;
    amount?: number;
    currency?: string;
    accountId?: string;
    categoryId?: string | null;
    note?: string | null;
    date?: string;
    monthlyLimitApproval?: string;
  }
): Promise<TransactionRow> {
  if (isGoalCompletionTransaction(id)) throw new Error('goalCompletionLocked');
  const db = getDatabase();
  const oldTx = await getTransactionById(id);
  if (!oldTx) throw new Error('Giao dịch không tồn tại');

  if (oldTx.type === 'transfer' || (data.type !== undefined && data.type !== 'income' && data.type !== 'expense')) {
    throw new Error('Transfers are no longer supported.');
  }

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await requireMonthlyLimitApproval({
      type: data.type ?? oldTx.type, date: data.date ?? oldTx.date,
      currency: data.currency ?? oldTx.currency, amount: data.amount ?? oldTx.amount,
      excludeTransactionId: id, operation: `update:${id}`,
    }, data.monthlyLimitApproval);
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
    }

    // 2. Prepare new transaction values
    const newType = data.type !== undefined ? data.type : oldTx.type;
    const newAmount = data.amount !== undefined ? data.amount : oldTx.amount;
    const newCurrency = data.currency !== undefined ? data.currency : oldTx.currency;
    const newAccountId = data.accountId !== undefined ? data.accountId : oldTx.account_id;
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
        null,
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
