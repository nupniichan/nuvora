/**
 * Parses YYYY-MM-DD string into [year, month (1-12), day]
 */
export function parseISODate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/**
 * Formats year, month (1-12), day into YYYY-MM-DD string
 */
export function formatYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Formats a Date object or ISO string into YYYY-MM-DD string
 */
export function formatDateISO(date: Date | string = new Date()): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Returns current timestamp in ISO 8601 format
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Gets the number of days in a given month (1-12) and year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates the next occurrence date for a recurring schedule.
 * Handles month-end edge cases (e.g. day 31 in April, Feb 29 in non-leap year) according to monthEndBehavior.
 */
export function calculateNextOccurrence(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number = 1,
  targetDayOfMonth?: number,
  monthEndBehavior: 'last_day' | 'skip' = 'last_day'
): string | null {
  const { year, month, day } = parseISODate(currentDateStr);
  const origDay = targetDayOfMonth ?? day;

  switch (frequency) {
    case 'daily': {
      const d = new Date(year, month - 1, day + interval);
      return formatDateISO(d);
    }
    case 'weekly': {
      const d = new Date(year, month - 1, day + interval * 7);
      return formatDateISO(d);
    }
    case 'monthly': {
      let targetMonth = month + interval;
      let targetYear = year + Math.floor((targetMonth - 1) / 12);
      targetMonth = ((targetMonth - 1) % 12) + 1;

      const maxDays = getDaysInMonth(targetYear, targetMonth);

      if (origDay > maxDays) {
        if (monthEndBehavior === 'skip') {
          // Recurse to next month
          const nextDateStr = formatYMD(targetYear, targetMonth, 1);
          return calculateNextOccurrence(nextDateStr, 'monthly', 1, origDay, monthEndBehavior);
        } else {
          return formatYMD(targetYear, targetMonth, maxDays);
        }
      } else {
        return formatYMD(targetYear, targetMonth, origDay);
      }
    }
    case 'yearly': {
      let targetYear = year + interval;
      const maxDays = getDaysInMonth(targetYear, month);

      if (origDay > maxDays) {
        if (monthEndBehavior === 'skip') {
          const nextDateStr = formatYMD(targetYear + 1, month, 1);
          return calculateNextOccurrence(nextDateStr, 'yearly', 1, origDay, monthEndBehavior);
        } else {
          return formatYMD(targetYear, month, maxDays);
        }
      } else {
        return formatYMD(targetYear, month, origDay);
      }
    }
    default:
      return null;
  }
}

export type TimeOfDay = 'day' | 'night';

/**
 * Determines whether it is daytime (06:00 - 17:59) or nighttime (18:00 - 05:59)
 * using the user's device clock and local timezone.
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}
