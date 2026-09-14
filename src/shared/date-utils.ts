export function parseISODate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-').map((part) => parseInt(part, 10));
  return { year: parts[0], month: parts[1], day: parts[2] };
}

export function formatYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function formatDateISO(date: Date | string = new Date()): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateNextOccurrence(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number = 1,
  targetDayOfMonth?: number,
  monthEndBehavior: 'last_day' | 'skip' = 'last_day'
): string | null {
  const { year, month, day } = parseISODate(currentDateStr);
  const originalDay = targetDayOfMonth ?? day;

  switch (frequency) {
    case 'daily': {
      const date = new Date(year, month - 1, day + interval);
      return formatDateISO(date);
    }
    case 'weekly': {
      const date = new Date(year, month - 1, day + interval * 7);
      return formatDateISO(date);
    }
    case 'monthly': {
      let targetMonth = month + interval;
      let targetYear = year + Math.floor((targetMonth - 1) / 12);
      targetMonth = ((targetMonth - 1) % 12) + 1;

      const maxDays = getDaysInMonth(targetYear, targetMonth);

      if (originalDay > maxDays) {
        if (monthEndBehavior === 'skip') {
          const nextDateStr = formatYMD(targetYear, targetMonth, 1);
          return calculateNextOccurrence(nextDateStr, 'monthly', 1, originalDay, monthEndBehavior);
        } else {
          return formatYMD(targetYear, targetMonth, maxDays);
        }
      } else {
        return formatYMD(targetYear, targetMonth, originalDay);
      }
    }
    case 'yearly': {
      let targetYear = year + interval;
      const maxDays = getDaysInMonth(targetYear, month);

      if (originalDay > maxDays) {
        if (monthEndBehavior === 'skip') {
          const nextDateStr = formatYMD(targetYear + 1, month, 1);
          return calculateNextOccurrence(nextDateStr, 'yearly', 1, originalDay, monthEndBehavior);
        } else {
          return formatYMD(targetYear, month, maxDays);
        }
      } else {
        return formatYMD(targetYear, month, originalDay);
      }
    }
    default:
      return null;
  }
}

export type TimeOfDay = 'day' | 'night';

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}
