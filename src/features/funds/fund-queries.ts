import { getDatabase } from '@/database/database';
import { FundRow, TransactionRow } from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { formatDateTimeISO } from '@/shared/date-utils';
import { generateUUID } from '@/shared/uuid';

export async function getAllFunds(includeDeleted: boolean = false): Promise<FundRow[]> {
  const db = getDatabase();
  const sql = includeDeleted
    ? 'SELECT * FROM funds ORDER BY sort_order ASC, created_at ASC;'
    : 'SELECT * FROM funds WHERE is_deleted = 0 ORDER BY sort_order ASC, created_at ASC;';
  return await db.getAllAsync<FundRow>(sql);
}

export async function getFundById(id: string): Promise<FundRow | null> {
  const db = getDatabase();
  return await db.getFirstAsync<FundRow>('SELECT * FROM funds WHERE id = ?;', [id]);
}

export async function createFund(data: {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  targetAmount?: number | null;
  currency?: string;
}): Promise<FundRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  let currency = data.currency;
  if (!currency) {
    const defaultAcc = await getDefaultAccount();
    currency = defaultAcc.currency || 'VND';
  }

  const existingFunds = await getAllFunds(true);
  const nextSortOrder = existingFunds.length > 0
    ? Math.max(...existingFunds.map((f) => f.sort_order ?? 0)) + 1
    : 1;

  const target = data.targetAmount !== undefined && data.targetAmount !== null && data.targetAmount > 0
    ? Math.round(data.targetAmount)
    : null;

  await db.runAsync(
    `INSERT INTO funds (id, name, description, icon, color, target_amount, balance, currency, sort_order, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?);`,
    [
      id,
      data.name.trim(),
      data.description?.trim() || null,
      data.icon || 'savings',
      data.color || '#4CAF7D',
      target,
      currency,
      nextSortOrder,
      now,
      now,
    ]
  );

  const created = await getFundById(id);
  if (!created) throw new Error('Failed to retrieve newly created fund.');
  return created;
}

export async function updateFund(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    targetAmount?: number | null;
  }
): Promise<FundRow> {
  const db = getDatabase();
  const existing = await getFundById(id);
  if (!existing) throw new Error('FUND_NOT_FOUND');

  const now = new Date().toISOString();
  const newName = data.name !== undefined ? data.name.trim() : existing.name;
  const newDesc = data.description !== undefined ? (data.description ? data.description.trim() : null) : existing.description;
  const newIcon = data.icon !== undefined ? data.icon : existing.icon;
  const newColor = data.color !== undefined ? data.color : existing.color;
  const newTarget = data.targetAmount !== undefined
    ? (data.targetAmount !== null && data.targetAmount > 0 ? Math.round(data.targetAmount) : null)
    : existing.target_amount;

  await db.runAsync(
    `UPDATE funds
     SET name = ?, description = ?, icon = ?, color = ?, target_amount = ?, updated_at = ?
     WHERE id = ?;`,
    [newName, newDesc, newIcon, newColor, newTarget, now, id]
  );

  const updated = await getFundById(id);
  if (!updated) throw new Error('Failed to retrieve updated fund.');
  return updated;
}

export async function reorderFunds(orderedFundIds: string[]): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedFundIds.length; i++) {
      await db.runAsync(
        'UPDATE funds SET sort_order = ?, updated_at = ? WHERE id = ?;',
        [i + 1, now, orderedFundIds[i]]
      );
    }
  });
}

export async function depositToFund(data: {
  fundId: string;
  amount: number;
  note?: string;
  date?: string;
}): Promise<TransactionRow> {
  if (data.amount <= 0) throw new Error('Số tiền nạp phải lớn hơn 0.');

  const db = getDatabase();
  const fund = await getFundById(data.fundId);
  if (!fund || fund.is_deleted) throw new Error('FUND_NOT_FOUND');

  const wallet = await getDefaultAccount();
  if (wallet.balance < data.amount) {
    throw new Error('INSUFFICIENT_WALLET_BALANCE');
  }

  const txId = generateUUID();
  const now = new Date().toISOString();
  const txDate = data.date ? (data.date.includes('T') ? data.date : formatDateTimeISO(data.date)) : now;

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
      data.amount,
      now,
      wallet.id,
    ]);
    await db.runAsync('UPDATE funds SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
      data.amount,
      now,
      fund.id,
    ]);
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, fund_id, to_fund_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
       VALUES (?, 'fund_deposit', ?, ?, ?, NULL, NULL, ?, NULL, NULL, NULL, ?, ?, 'confirmed', ?, ?);`,
      [
        txId,
        data.amount,
        fund.currency,
        wallet.id,
        fund.id,
        data.note || null,
        txDate,
        now,
        now,
      ]
    );
  });

  const tx = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?;', [txId]);
  if (!tx) throw new Error('Failed to retrieve deposit transaction.');
  return tx;
}

export async function withdrawFromFund(data: {
  fundId: string;
  amount: number;
  note?: string;
  date?: string;
}): Promise<TransactionRow> {
  if (data.amount <= 0) throw new Error('Số tiền rút phải lớn hơn 0.');

  const db = getDatabase();
  const fund = await getFundById(data.fundId);
  if (!fund || fund.is_deleted) throw new Error('FUND_NOT_FOUND');

  if (fund.balance < data.amount) {
    throw new Error('INSUFFICIENT_FUND_BALANCE');
  }

  const wallet = await getDefaultAccount();
  const txId = generateUUID();
  const now = new Date().toISOString();
  const txDate = data.date ? (data.date.includes('T') ? data.date : formatDateTimeISO(data.date)) : now;

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE funds SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
      data.amount,
      now,
      fund.id,
    ]);
    await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
      data.amount,
      now,
      wallet.id,
    ]);
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, fund_id, to_fund_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
       VALUES (?, 'fund_withdrawal', ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, ?, 'confirmed', ?, ?);`,
      [
        txId,
        data.amount,
        fund.currency,
        wallet.id,
        fund.id,
        data.note || null,
        txDate,
        now,
        now,
      ]
    );
  });

  const tx = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?;', [txId]);
  if (!tx) throw new Error('Failed to retrieve withdrawal transaction.');
  return tx;
}

export async function transferBetweenFunds(data: {
  fromFundId: string;
  toFundId: string;
  amount: number;
  note?: string;
  date?: string;
}): Promise<TransactionRow> {
  if (data.fromFundId === data.toFundId) {
    throw new Error('INVALID_FUND_TRANSFER');
  }
  if (data.amount <= 0) throw new Error('Số tiền chuyển phải lớn hơn 0.');

  const db = getDatabase();
  const fromFund = await getFundById(data.fromFundId);
  const toFund = await getFundById(data.toFundId);

  if (!fromFund || fromFund.is_deleted || !toFund || toFund.is_deleted) {
    throw new Error('FUND_NOT_FOUND');
  }

  if (fromFund.balance < data.amount) {
    throw new Error('INSUFFICIENT_FUND_BALANCE');
  }

  const wallet = await getDefaultAccount();
  const txId = generateUUID();
  const now = new Date().toISOString();
  const txDate = data.date ? (data.date.includes('T') ? data.date : formatDateTimeISO(data.date)) : now;

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE funds SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
      data.amount,
      now,
      fromFund.id,
    ]);
    await db.runAsync('UPDATE funds SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
      data.amount,
      now,
      toFund.id,
    ]);
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, fund_id, to_fund_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
       VALUES (?, 'fund_transfer', ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, ?, 'confirmed', ?, ?);`,
      [
        txId,
        data.amount,
        fromFund.currency,
        wallet.id,
        fromFund.id,
        toFund.id,
        data.note || null,
        txDate,
        now,
        now,
      ]
    );
  });

  const tx = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?;', [txId]);
  if (!tx) throw new Error('Failed to retrieve fund transfer transaction.');
  return tx;
}

export async function deleteFund(
  id: string,
  options?: {
    action: 'refund_to_wallet' | 'transfer_to_fund';
    targetFundId?: string;
  }
): Promise<void> {
  const db = getDatabase();
  const fund = await getFundById(id);
  if (!fund || fund.is_deleted) throw new Error('FUND_NOT_FOUND');

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (fund.balance > 0) {
      if (!options || !options.action) {
        throw new Error('FUND_NON_ZERO_BALANCE_ON_DELETE');
      }

      if (options.action === 'refund_to_wallet') {
        const wallet = await getDefaultAccount();
        const txId = generateUUID();
        await db.runAsync('UPDATE funds SET balance = 0, updated_at = ? WHERE id = ?;', [now, fund.id]);
        await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
          fund.balance,
          now,
          wallet.id,
        ]);
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, fund_id, to_fund_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
           VALUES (?, 'fund_withdrawal', ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, ?, 'confirmed', ?, ?);`,
          [
            txId,
            fund.balance,
            fund.currency,
            wallet.id,
            fund.id,
            'Hoàn số dư về ví khi xóa quỹ',
            now,
            now,
            now,
          ]
        );
      } else if (options.action === 'transfer_to_fund') {
        if (!options.targetFundId || options.targetFundId === fund.id) {
          throw new Error('INVALID_FUND_TRANSFER');
        }
        const targetFund = await getFundById(options.targetFundId);
        if (!targetFund || targetFund.is_deleted) throw new Error('FUND_NOT_FOUND');

        const wallet = await getDefaultAccount();
        const txId = generateUUID();
        await db.runAsync('UPDATE funds SET balance = 0, updated_at = ? WHERE id = ?;', [now, fund.id]);
        await db.runAsync('UPDATE funds SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
          fund.balance,
          now,
          targetFund.id,
        ]);
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, fund_id, to_fund_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
           VALUES (?, 'fund_transfer', ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, ?, 'confirmed', ?, ?);`,
          [
            txId,
            fund.balance,
            fund.currency,
            wallet.id,
            fund.id,
            targetFund.id,
            `Chuyển số dư sang quỹ "${targetFund.name}" khi xóa quỹ`,
            now,
            now,
            now,
          ]
        );
      }
    }

    // Soft delete
    await db.runAsync('UPDATE funds SET is_deleted = 1, updated_at = ? WHERE id = ?;', [now, id]);
  });
}

export async function getFundTransactions(fundId: string): Promise<TransactionRow[]> {
  const db = getDatabase();
  const sql = `SELECT * FROM transactions
               WHERE (fund_id = ? OR to_fund_id = ?)
               ORDER BY date DESC, created_at DESC;`;
  return await db.getAllAsync<TransactionRow>(sql, [fundId, fundId]);
}

export async function getTotalFundsBalance(): Promise<number> {
  const activeFunds = await getAllFunds(false);
  return activeFunds.reduce((sum, fund) => sum + (Number(fund.balance) || 0), 0);
}

export async function getAssetSummary(): Promise<{
  walletBalance: number;
  fundsBalance: number;
  totalAssets: number;
  currency: string;
}> {
  const [wallet, fundsBalance] = await Promise.all([
    getDefaultAccount(),
    getTotalFundsBalance(),
  ]);

  const walletBalance = Number(wallet.balance) || 0;
  return {
    walletBalance,
    fundsBalance,
    totalAssets: walletBalance + fundsBalance,
    currency: wallet.currency || 'VND',
  };
}
