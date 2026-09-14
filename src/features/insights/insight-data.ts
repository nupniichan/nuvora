import { TransactionRow } from '@/database/types';
import { getTransactions } from '@/features/transactions/transaction-queries';
import { formatYMD, getDaysInMonth } from '@/shared/date-utils';

export interface DailySpendingPoint {
  date: string;
  amount: number;
  income: number;
}

export interface MonthlyCashflowPoint {
  year: number;
  month: number;
  income: number;
  expense: number;
}

export interface SpendingHistory {
  currency: string;
  days: DailySpendingPoint[];
  months: MonthlyCashflowPoint[];
}

export function buildSpendingHistory(
  transactions: Pick<TransactionRow, 'date' | 'amount' | 'type' | 'currency' | 'status'>[],
  year: number,
  month: number,
  currency: string,
): SpendingHistory {
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, index) => ({
    date: formatYMD(year, month, index + 1), amount: 0, income: 0,
  }));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1, income: 0, expense: 0 };
  });
  const dailyMap = new Map(days.map((day) => [day.date, day]));
  const monthlyMap = new Map(months.map((point) => [formatYMD(point.year, point.month, 1).slice(0, 7), point]));

  for (const tx of transactions) {
    if (tx.currency !== currency || tx.status !== 'confirmed' || tx.type === 'transfer' || !Number.isSafeInteger(tx.amount) || tx.amount <= 0) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) continue;
    const [txYear, txMonth, txDay] = tx.date.split('-').map(Number);
    if (txMonth < 1 || txMonth > 12 || txDay < 1 || txDay > getDaysInMonth(txYear, txMonth)) continue;
    const period = monthlyMap.get(tx.date.slice(0, 7));
    if (!period) continue;
    if (tx.type === 'income') {
      period.income += tx.amount;
      const day = dailyMap.get(tx.date);
      if (day) day.income += tx.amount;
    }
    if (tx.type === 'expense') {
      period.expense += tx.amount;
      const day = dailyMap.get(tx.date);
      if (day) day.amount += tx.amount;
    }
  }
  return { currency, days, months };
}

export async function getSpendingHistory(year: number, month: number, currency: string): Promise<SpendingHistory> {
  const start = new Date(year, month - 6, 1);
  const transactions = await getTransactions({
    startDate: formatYMD(start.getFullYear(), start.getMonth() + 1, 1),
    endDate: formatYMD(year, month, getDaysInMonth(year, month)),
  });
  return buildSpendingHistory(transactions, year, month, currency);
}
