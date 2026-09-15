import {
  addDays,
  calculateNextOccurrence,
  CalendarDayItem,
  formatDateDisplay,
  getCalendarMatrix,
  getDaysInMonth,
  getTimeOfDay,
} from '../date-utils';

describe('Date & Recurrence Utilities', () => {
  test('getDaysInMonth', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2025, 2)).toBe(28);
    expect(getDaysInMonth(2025, 4)).toBe(30);
    expect(getDaysInMonth(2025, 5)).toBe(31);
  });

  test('calculateNextOccurrence monthly on day 31 in 30-day month with last_day behavior', () => {

    const next = calculateNextOccurrence('2025-03-31', 'monthly', 1, 31, 'last_day');
    expect(next).toBe('2025-04-30');
  });

  test('calculateNextOccurrence monthly on day 31 in 30-day month with skip behavior', () => {

    const next = calculateNextOccurrence('2025-03-31', 'monthly', 1, 31, 'skip');
    expect(next).toBe('2025-05-31');
  });

  test('calculateNextOccurrence yearly Feb 29 in non-leap year', () => {

    const next = calculateNextOccurrence('2024-02-29', 'yearly', 1, 29, 'last_day');
    expect(next).toBe('2025-02-28');
  });

  test('getTimeOfDay distinguishes daytime and nighttime correctly', () => {
    const morning = new Date(2025, 0, 1, 8, 30);
    expect(getTimeOfDay(morning)).toBe('day');

    const noon = new Date(2025, 0, 1, 12, 0);
    expect(getTimeOfDay(noon)).toBe('day');

    const lateAfternoon = new Date(2025, 0, 1, 17, 59);
    expect(getTimeOfDay(lateAfternoon)).toBe('day');

    const evening = new Date(2025, 0, 1, 18, 0);
    expect(getTimeOfDay(evening)).toBe('night');

    const midnight = new Date(2025, 0, 1, 0, 30);
    expect(getTimeOfDay(midnight)).toBe('night');

    const dawnBeforeSix = new Date(2025, 0, 1, 5, 59);
    expect(getTimeOfDay(dawnBeforeSix)).toBe('night');
  });

  test('addDays adds and subtracts days correctly', () => {
    expect(addDays('2026-09-15', 1)).toBe('2026-09-16');
    expect(addDays('2026-09-15', -1)).toBe('2026-09-14');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('formatDateDisplay formats dates for display', () => {
    expect(formatDateDisplay('2026-09-15', 'vi')).toBe('15/09/2026');
    expect(formatDateDisplay('2026-09-15', 'en')).toBe('2026-09-15');
    expect(formatDateDisplay('2026-09-15T14:30:00', 'vi')).toBe('15/09/2026 14:30');
    expect(formatDateDisplay('')).toBe('');
    expect(formatDateDisplay(null)).toBe('');
  });

  test('getCalendarMatrix returns 42 calendar grid items', () => {
    const matrix = getCalendarMatrix(2026, 9, '2026-09-15');
    expect(matrix.length).toBe(42);
    expect(matrix[0].day).toBe(30);
    expect(matrix[0].isCurrentMonth).toBe(false);
    expect(matrix[1].day).toBe(31);
    expect(matrix[1].isCurrentMonth).toBe(false);
    expect(matrix[2].day).toBe(1);
    expect(matrix[2].isCurrentMonth).toBe(true);

    const todayItem = matrix.find((item) => item.dateStr === '2026-09-15');
    expect(todayItem?.isToday).toBe(true);
    expect(todayItem?.isCurrentMonth).toBe(true);
  });
});
