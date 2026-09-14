import { AccountRow, TransactionRow } from '@/database/types';
import { formatDateISO, getDaysInMonth } from '@/shared/date-utils';

export type BalanceComparisonPeriod = 'month' | 'year';

export interface BalanceChange {
  date: string;
  previousBalance: number | null;
  amount: number | null;
  percent: number | null;
}

export interface BalanceComparison {
  currency: string;
  balance: number;
  month: BalanceChange;
  year: BalanceChange;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month);
}

export function buildBalanceComparisons(
  accounts: AccountRow[],
  transactions: TransactionRow[],
  asOf: Date = new Date(),
): BalanceComparison[] {
  const today = formatDateISO(asOf);
  const monthEnd = formatDateISO(new Date(asOf.getFullYear(), asOf.getMonth(), 0));
  const yearEnd = formatDateISO(new Date(asOf.getFullYear() - 1, 11, 31));
  const totals = new Map<string, { balance: number; month: number; year: number; monthKnown: boolean; yearKnown: boolean }>();
  const confirmed = transactions.filter((tx) => tx.status === 'confirmed'
    && Number.isSafeInteger(tx.amount) && tx.amount > 0 && validDate(tx.date));

  for (const account of accounts) {
    if (account.is_archived || !Number.isSafeInteger(account.balance)) continue;
    let balance = account.balance;
    let month = account.balance;
    let year = account.balance;
    const createdDate = account.created_at ? formatDateISO(new Date(account.created_at)) : '';
    let knownSince = validDate(createdDate) ? createdDate : today;

    for (const tx of confirmed) {
      if (tx.currency !== account.currency) continue;
      let effect = 0;
      if (tx.account_id === account.id) {
        if (tx.type === 'income') effect += tx.amount;
        if (tx.type === 'expense' || tx.type === 'transfer') effect -= tx.amount;
      }
      if (tx.type === 'transfer' && tx.to_account_id === account.id) effect += tx.amount;
      if (!effect) continue;
      if (tx.date < knownSince) knownSince = tx.date;

      if (tx.date > today) balance -= effect;
      if (tx.date > monthEnd) month -= effect;
      if (tx.date > yearEnd) year -= effect;
    }

    const total = totals.get(account.currency)
      || { balance: 0, month: 0, year: 0, monthKnown: false, yearKnown: false };
    total.balance += balance;
    if (knownSince <= monthEnd) {
      total.month += month;
      total.monthKnown = true;
    }
    if (knownSince <= yearEnd) {
      total.year += year;
      total.yearKnown = true;
    }
    totals.set(account.currency, total);
  }

  function change(balance: number, previous: number, known: boolean, date: string): BalanceChange {
    const amount = balance - previous;
    return {
      date,
      previousBalance: known ? previous : null,
      amount: known ? amount : null,
      percent: known && previous !== 0 ? amount / Math.abs(previous) * 100 : null,
    };
  }

  return Array.from(totals, ([currency, total]) => ({
    currency,
    balance: total.balance,
    month: change(total.balance, total.month, total.monthKnown, monthEnd),
    year: change(total.balance, total.year, total.yearKnown, yearEnd),
  }));
}
