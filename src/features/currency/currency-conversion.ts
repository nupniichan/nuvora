import { getDatabase, withGoalTransaction } from '@/database/database';
import { runGoalWrite } from '@/database/goal-write';
import { AccountRow, AppSettingRow, BudgetAllocationRow, BudgetRow, FinancialGoalRow, GoalContributionRow, TransactionRow } from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';

export type SwitchCurrency = 'VND' | 'USD';
export class CurrencyConversionError extends Error {
  constructor(public readonly code: 'invalidRate' | 'invalidAmount' | 'tooSmall' | 'changedCurrency' | 'limitConflict' | 'unsupportedCurrency') {
    super(code);
  }
}

export function convertCurrencyAmount(amount: number, from: SwitchCurrency, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) throw new CurrencyConversionError('invalidRate');
  if (from !== 'VND' && from !== 'USD') throw new CurrencyConversionError('unsupportedCurrency');
  if (!Number.isSafeInteger(amount)) throw new CurrencyConversionError('invalidAmount');
  const result = Math.sign(amount) * Math.round(Math.abs(amount) * (from === 'VND' ? 100 / rate : rate / 100));
  if (!Number.isSafeInteger(result)) throw new CurrencyConversionError('invalidAmount');
  if (amount !== 0 && result === 0) throw new CurrencyConversionError('tooSmall');
  return result;
}

export async function getCurrencySwitchState() {
  const account = await getDefaultAccount();
  const saved = await getDatabase().getFirstAsync<AppSettingRow>(
    'SELECT * FROM app_settings WHERE key = ?;', ['usd_vnd_rate']
  );
  return { account, rate: saved?.value ?? '' };
}

export async function switchCurrency(from: SwitchCurrency, rate: number): Promise<void> {
  convertCurrencyAmount(0, from, rate);
  const to = from === 'VND' ? 'USD' : 'VND';
  return runGoalWrite(async () => {
    const defaultAccount = await getDefaultAccount();
    await withGoalTransaction(async (db) => {
      const accounts = await db.getAllAsync<AccountRow>('SELECT * FROM accounts;');
      if (accounts.find(row => row.id === defaultAccount.id)?.currency !== from) {
        throw new CurrencyConversionError('changedCurrency');
      }
      const transactions = await db.getAllAsync<TransactionRow>('SELECT * FROM transactions;');
      const budgets = await db.getAllAsync<BudgetRow>('SELECT * FROM budgets;');
      const allocations = await db.getAllAsync<BudgetAllocationRow>('SELECT * FROM budget_allocations;');
      const goals = await db.getAllAsync<FinancialGoalRow>('SELECT * FROM financial_goals;');
      const contributions = await db.getAllAsync<GoalContributionRow>('SELECT * FROM goal_contributions;');
      const rules = await db.getAllAsync<{ id: string; amount: number; currency: string }>('SELECT * FROM recurring_rules;');
      const settings = await db.getAllAsync<AppSettingRow>('SELECT * FROM app_settings;');
      const convert = (amount: number) => convertCurrencyAmount(amount, from, rate);
      const now = new Date().toISOString();
      const sourceTransactions = transactions.filter(row => row.currency === from);
      const converted = new Map(sourceTransactions.map(row => [row.id, convert(row.amount)]));
      const sourceBudgets = budgets.filter(row => row.currency === from);
      const budgetIds = new Set(sourceBudgets.map(row => row.id));
      const limitPrefix = `monthly-spending-limit:${from}:`;
      const limits = settings.filter(row => row.key.startsWith(limitPrefix));

      if (limits.length && settings.some(row => row.key.startsWith(`monthly-spending-limit:${to}:`))) {
        throw new CurrencyConversionError('limitConflict');
      }

      for (const account of accounts.filter(row => row.currency === from)) {
        let oldEffect = 0;
        let newEffect = 0;
        for (const tx of sourceTransactions.filter(row => row.status === 'confirmed')) {
          const sign = (tx.account_id === account.id ? (tx.type === 'income' ? 1 : -1) : 0)
            + (tx.type === 'transfer' && tx.to_account_id === account.id ? 1 : 0);
          oldEffect += sign * tx.amount;
          newEffect += sign * converted.get(tx.id)!;
        }

        const balance = convert(account.balance - oldEffect) + newEffect;
        if (!Number.isSafeInteger(balance)) throw new CurrencyConversionError('invalidAmount');
        await db.runAsync('UPDATE accounts SET balance = ?, currency = ?, updated_at = ? WHERE id = ?;',
          [balance, to, now, account.id]);
      }
      for (const tx of sourceTransactions) {
        await db.runAsync('UPDATE transactions SET amount = ?, currency = ?, updated_at = ? WHERE id = ?;',
          [converted.get(tx.id)!, to, now, tx.id]);
      }
      for (const rule of rules.filter(row => row.currency === from)) {
        await db.runAsync('UPDATE recurring_rules SET amount = ?, currency = ?, updated_at = ? WHERE id = ?;',
          [convert(rule.amount), to, now, rule.id]);
      }
      for (const budget of sourceBudgets) {
        await db.runAsync('UPDATE budgets SET total_budget = ?, currency = ?, updated_at = ? WHERE id = ?;',
          [budget.total_budget == null ? null : convert(budget.total_budget), to, now, budget.id]);
      }
      for (const allocation of allocations.filter(row => budgetIds.has(row.budget_id))) {
        if (allocation.amount != null) {
          await db.runAsync('UPDATE budget_allocations SET amount = ? WHERE id = ?;', [convert(allocation.amount), allocation.id]);
        }
      }

      for (const goal of goals) {
        await db.runAsync('UPDATE financial_goals SET target_amount = ?, current_amount = ?, updated_at = ? WHERE id = ?;',
          [convert(goal.target_amount), convert(goal.current_amount), now, goal.id]);
      }
      for (const contribution of contributions) {
        await db.runAsync('UPDATE goal_contributions SET amount = ? WHERE id = ?;', [convert(contribution.amount), contribution.id]);
      }
      for (const limit of limits) {
        const key = limit.key.replace(limitPrefix, `monthly-spending-limit:${to}:`);
        const value = limit.value === 'null' ? 'null' : String(convert(Number(limit.value)));
        await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);', [key, value, now]);
        await db.runAsync('DELETE FROM app_settings WHERE key = ?;', [limit.key]);
      }
      for (const [key, value] of [['default_currency', to], ['usd_vnd_rate', String(rate)]]) {
        await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);', [key, value, now]);
      }
    });
  });
}
