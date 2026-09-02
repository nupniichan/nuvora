import { calculateNextOccurrence, getDaysInMonth } from '../date-utils';

describe('Date & Recurrence Utilities', () => {
  test('getDaysInMonth', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29); // Leap year 2024
    expect(getDaysInMonth(2025, 2)).toBe(28); // Non-leap year 2025
    expect(getDaysInMonth(2025, 4)).toBe(30); // April
    expect(getDaysInMonth(2025, 5)).toBe(31); // May
  });

  test('calculateNextOccurrence monthly on day 31 in 30-day month with last_day behavior', () => {
    // Start March 31, 2025. Next month is April (30 days).
    const next = calculateNextOccurrence('2025-03-31', 'monthly', 1, 31, 'last_day');
    expect(next).toBe('2025-04-30');
  });

  test('calculateNextOccurrence monthly on day 31 in 30-day month with skip behavior', () => {
    // Start March 31, 2025. Next month April has only 30 days -> skip to May 31.
    const next = calculateNextOccurrence('2025-03-31', 'monthly', 1, 31, 'skip');
    expect(next).toBe('2025-05-31');
  });

  test('calculateNextOccurrence yearly Feb 29 in non-leap year', () => {
    // Feb 29, 2024 + 1 year -> 2025 (non-leap). last_day -> Feb 28, 2025.
    const next = calculateNextOccurrence('2024-02-29', 'yearly', 1, 29, 'last_day');
    expect(next).toBe('2025-02-28');
  });
});
