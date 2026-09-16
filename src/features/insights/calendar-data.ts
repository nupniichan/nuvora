import { getDatabase } from '@/database/database';
import { formatYMD, getDaysInMonth } from '@/shared/date-utils';

export interface MonthSummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface CalendarTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  groupName: string | null;
  note: string | null;
}

export interface CalendarDayData {
  date: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactions: CalendarTransaction[];
}

export async function getCalendarMonthData(
  year: number,
  month: number,
  currency: string,
): Promise<Map<string, CalendarDayData>> {
  const db = getDatabase();
  const startDate = formatYMD(year, month, 1);
  const endDate = formatYMD(year, month, getDaysInMonth(year, month));

  const rows = await db.getAllAsync<any>(
    `SELECT
       t.id,
       t.type,
       t.amount,
       t.currency,
       t.date,
       t.note,
       t.status,
       t.category_id,
       c.name AS category_name,
       c.icon AS category_icon,
       c.color AS category_color,
       cg.name AS group_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN category_groups cg ON c.group_id = cg.id
     WHERE t.date >= ? AND t.date <= ?;`,
    [startDate, endDate],
  );

  const dayMap = new Map<string, CalendarDayData>();

  for (const row of rows) {
    if (row.currency !== currency) continue;
    if (row.status && row.status !== 'confirmed') continue;
    if (row.type !== 'income' && row.type !== 'expense') continue;
    const amount = Number(row.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(row.date)) continue;
    const dateStr = row.date.slice(0, 10);

    let dayData = dayMap.get(dateStr);
    if (!dayData) {
      dayData = {
        date: dateStr,
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        transactions: [],
      };
      dayMap.set(dateStr, dayData);
    }

    const tx: CalendarTransaction = {
      id: String(row.id),
      type: row.type as 'income' | 'expense',
      amount,
      currency: row.currency,
      categoryName: row.category_name ?? row.categoryName ?? null,
      categoryIcon: row.category_icon ?? row.categoryIcon ?? null,
      categoryColor: row.category_color ?? row.categoryColor ?? null,
      groupName: row.group_name ?? row.groupName ?? null,
      note: row.note ?? null,
    };

    dayData.transactions.push(tx);

    if (row.type === 'income') {
      dayData.totalIncome += amount;
    } else if (row.type === 'expense') {
      dayData.totalExpense += amount;
    }
    dayData.netBalance = dayData.totalIncome - dayData.totalExpense;
  }

  return dayMap;
}

export async function getYearMonthlySummaries(
  year: number,
  currency: string,
): Promise<MonthSummary[]> {
  const db = getDatabase();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const rows = await db.getAllAsync<any>(
    `SELECT id, type, amount, currency, date, status
     FROM transactions
     WHERE date >= ? AND date <= ?;`,
    [startDate, endDate],
  );

  const summaries: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  }));

  for (const row of rows) {
    if (row.currency !== currency) continue;
    if (row.status && row.status !== 'confirmed') continue;
    if (row.type !== 'income' && row.type !== 'expense') continue;
    const amount = Number(row.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(row.date)) continue;

    const rowMonth = parseInt(row.date.slice(5, 7), 10);
    const idx = rowMonth - 1;
    if (idx < 0 || idx > 11) continue;

    if (row.type === 'income') {
      summaries[idx].totalIncome += amount;
    } else if (row.type === 'expense') {
      summaries[idx].totalExpense += amount;
    }
    summaries[idx].netBalance = summaries[idx].totalIncome - summaries[idx].totalExpense;
  }

  return summaries;
}
