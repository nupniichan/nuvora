import { initDatabase } from '@/database/database';
import { createAccount, getAllAccounts } from '@/features/accounts/account-queries';
import { createTransaction, deleteTransaction, getTransactions } from '../transaction-queries';

// Mock sqlite for in-memory testing or test runner
jest.mock('@/database/database', () => {
  const accountsMap = new Map<string, any>();
  const txsMap = new Map<string, any>();

  const db = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM accounts')) {
        return Array.from(accountsMap.values());
      }
      if (sql.includes('FROM transactions')) {
        return Array.from(txsMap.values());
      }
      return [];
    }),
    getFirstAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM accounts')) {
        return accountsMap.get(params?.[0]) || null;
      }
      if (sql.includes('FROM transactions')) {
        return txsMap.get(params?.[0]) || null;
      }
      return null;
    }),
    runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO accounts')) {
        accountsMap.set(params?.[0], {
          id: params?.[0],
          name: params?.[1],
          type: params?.[2],
          currency: params?.[3],
          balance: params?.[4],
        });
      } else if (sql.includes('INSERT INTO transactions')) {
        txsMap.set(params?.[0], {
          id: params?.[0],
          type: params?.[1],
          amount: params?.[2],
          currency: params?.[3],
          account_id: params?.[4],
          to_account_id: params?.[5],
        });
      } else if (sql.includes('UPDATE accounts SET balance = balance +')) {
        const acc = accountsMap.get(params?.[2]);
        if (acc) acc.balance += params?.[0];
      } else if (sql.includes('UPDATE accounts SET balance = balance -')) {
        const acc = accountsMap.get(params?.[2]);
        if (acc) acc.balance -= params?.[0];
      } else if (sql.includes('DELETE FROM transactions')) {
        txsMap.delete(params?.[0]);
      }
    }),
    withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<void>) => {
      await cb();
    }),
  };

  return {
    getDatabase: () => db,
    initDatabase: jest.fn().mockResolvedValue(db),
  };
});

describe('Transactions & Account Invariants', () => {
  test('Income increases account balance', async () => {
    const acc = await createAccount({
      name: 'Cash',
      type: 'cash',
      currency: 'VND',
      initialBalance: 100000,
    });

    const tx = await createTransaction({
      type: 'income',
      amount: 50000,
      currency: 'VND',
      accountId: acc.id,
      date: '2025-09-02',
    });

    expect(tx.amount).toBe(50000);
    const updatedAcc = (await getAllAccounts())[0];
    expect(updatedAcc.balance).toBe(150000);
  });

  test('Transfer between accounts alters individual balances but total remains invariant', async () => {
    const acc1 = await createAccount({
      name: 'Bank 1',
      type: 'bank',
      currency: 'VND',
      initialBalance: 200000,
    });
    const acc2 = await createAccount({
      name: 'Bank 2',
      type: 'bank',
      currency: 'VND',
      initialBalance: 100000,
    });

    const initialTotal = acc1.balance + acc2.balance; // 300,000

    await createTransaction({
      type: 'transfer',
      amount: 50000,
      currency: 'VND',
      accountId: acc1.id,
      toAccountId: acc2.id,
      date: '2025-09-02',
    });

    const all = await getAllAccounts();
    const a1 = all.find((a) => a.id === acc1.id);
    const a2 = all.find((a) => a.id === acc2.id);

    expect(a1?.balance).toBe(150000);
    expect(a2?.balance).toBe(150000);
    expect(a1!.balance + a2!.balance).toBe(initialTotal);
  });
});
