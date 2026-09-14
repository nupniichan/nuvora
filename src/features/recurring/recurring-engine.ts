import { formatYMD, getDaysInMonth, parseISODate } from '@/shared/date-utils';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function calculateDueOccurrences(
  rule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    day_of_month?: number | null;
    day_of_week?: number | null;
    month_end_behavior?: 'last_day' | 'skip' | null;
    start_date: string;
    end_date?: string | null;
  },
  fromDate: string,
  toDate: string
): string[] {
  const occurrences: string[] = [];
  const interval = Math.max(1, rule.interval ?? 1);
  const startDate = rule.start_date;
  const endDate = rule.end_date || '9999-12-31';

  const effectiveEnd = endDate < toDate ? endDate : toDate;
  if (effectiveEnd < startDate) return [];

  if (rule.frequency === 'daily' || rule.frequency === 'weekly') {
    let current = startDate;
    const stepDays = rule.frequency === 'daily' ? interval : interval * 7;

    while (current <= effectiveEnd) {
      if (current >= fromDate && current <= effectiveEnd) {
        occurrences.push(current);
      }
      const { year, month, day } = parseISODate(current);
      const d = new Date(year, month - 1, day + stepDays);
      current = formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  } else if (rule.frequency === 'monthly') {
    const { year: startY, month: startM, day: startD } = parseISODate(startDate);
    const targetDay = rule.day_of_month ?? startD;

    let curYear = startY;
    let curMonth = startM;

    while (true) {
      const maxDays = getDaysInMonth(curYear, curMonth);
      let dayToUse: number | null = targetDay;

      if (targetDay > maxDays) {
        if (rule.month_end_behavior === 'skip') {
          dayToUse = null;
        } else {
          dayToUse = maxDays;
        }
      }

      if (dayToUse !== null) {
        const dateStr = formatYMD(curYear, curMonth, dayToUse);
        if (dateStr > effectiveEnd) break;

        if (dateStr >= startDate && dateStr >= fromDate && dateStr <= effectiveEnd) {
          occurrences.push(dateStr);
        }
      }

      curMonth += interval;
      while (curMonth > 12) {
        curMonth -= 12;
        curYear += 1;
      }

      const nextFirst = formatYMD(curYear, curMonth, 1);
      if (nextFirst > effectiveEnd) break;
    }
  } else if (rule.frequency === 'yearly') {
    const { year: startY, month: startM, day: startD } = parseISODate(startDate);
    const targetDay = rule.day_of_month ?? startD;

    let curYear = startY;

    while (true) {
      const maxDays = getDaysInMonth(curYear, startM);
      let dayToUse = targetDay;

      if (targetDay > maxDays) {
        dayToUse = rule.month_end_behavior === 'skip' ? -1 : maxDays;
      }

      if (dayToUse > 0) {
        const dateStr = formatYMD(curYear, startM, dayToUse);
        if (dateStr > effectiveEnd) break;

        if (dateStr >= startDate && dateStr >= fromDate && dateStr <= effectiveEnd) {
          occurrences.push(dateStr);
        }
      }

      curYear += interval;
      const nextFirst = formatYMD(curYear, startM, 1);
      if (nextFirst > effectiveEnd) break;
    }
  }

  return occurrences;
}
