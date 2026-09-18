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

export function formatDateTimeISO(date: Date | string = new Date()): string {
  if (typeof date === 'string') {
    if (date.includes('T')) {
      const parts = date.split('T');
      const timePart = parts[1]?.slice(0, 8) || '00:00:00';
      const timeParts = timePart.split(':');
      const hh = (timeParts[0] || '00').padStart(2, '0');
      const mm = (timeParts[1] || '00').padStart(2, '0');
      const ss = (timeParts[2] || '00').padStart(2, '0');
      return `${parts[0]}T${hh}:${mm}:${ss}`;
    }
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${date}T${hh}:${mm}:00`;
  }
  const ymd = formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${ymd}T${hh}:${mm}:${ss}`;
}

export function appendCurrentTime(dateStr: string): string {
  if (dateStr.includes('T')) return dateStr;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${dateStr}T${hh}:${mm}:00`;
}

export function hasTime(dateStr?: string | null): boolean {
  return Boolean(dateStr && dateStr.includes('T'));
}

export function extractDatePart(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
}

export function extractTimePart(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[1]?.slice(0, 5) : '';
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

export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseISODate(dateStr);
  const d = new Date(year, month - 1, day + days);
  return formatDateISO(d);
}

export function formatDateDisplay(dateStr?: string | null, locale: string = 'vi'): string {
  if (!dateStr) return '';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const timePart = dateStr.includes('T') ? dateStr.split('T')[1]?.slice(0, 5) : '';

  const { year, month, day } = parseISODate(datePart);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const formattedDate = locale === 'vi' ? `${dd}/${mm}/${year}` : `${year}-${mm}-${dd}`;

  if (timePart) {
    return `${formattedDate} ${timePart}`;
  }
  return formattedDate;
}

export interface CalendarDayItem {
  dateStr: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getCalendarMatrix(
  year: number,
  month: number,
  todayStr: string = formatDateISO(new Date())
): CalendarDayItem[] {
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInCurrentMonth = getDaysInMonth(year, month);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const items: CalendarDayItem[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateStr = formatYMD(prevYear, prevMonth, day);
    items.push({
      dateStr,
      day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = formatYMD(year, month, day);
    items.push({
      dateStr,
      day,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const remainingCells = 42 - items.length;
  for (let day = 1; day <= remainingCells; day++) {
    const dateStr = formatYMD(nextYear, nextMonth, day);
    items.push({
      dateStr,
      day,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return items;
}
