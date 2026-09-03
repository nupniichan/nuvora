import { calculateDueOccurrences, isLeapYear } from '../recurring-engine';

describe('Recurring Engine Edge Cases & Invariants', () => {
  it('correctly identifies leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
  });

  it('calculates daily intervals correctly', () => {
    const dates = calculateDueOccurrences(
      {
        frequency: 'daily',
        interval: 2,
        start_date: '2026-01-01',
      },
      '2026-01-01',
      '2026-01-07'
    );

    expect(dates).toEqual(['2026-01-01', '2026-01-03', '2026-01-05', '2026-01-07']);
  });

  it('handles day 31 in shorter months with last_day behavior', () => {
    // Starting on Jan 31, 2026 (non-leap year)
    // Jan has 31, Feb has 28, March has 31, April has 30
    const dates = calculateDueOccurrences(
      {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 31,
        month_end_behavior: 'last_day',
        start_date: '2026-01-31',
      },
      '2026-01-01',
      '2026-04-30'
    );

    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28', // Last day of Feb non-leap
      '2026-03-31',
      '2026-04-30', // Last day of April
    ]);
  });

  it('handles day 31 in leap year February correctly', () => {
    // 2024 is a leap year (Feb has 29 days)
    const dates = calculateDueOccurrences(
      {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 31,
        month_end_behavior: 'last_day',
        start_date: '2024-01-31',
      },
      '2024-01-01',
      '2024-02-29'
    );

    expect(dates).toEqual(['2024-01-31', '2024-02-29']);
  });

  it('skips unsupported months when month_end_behavior is skip', () => {
    const dates = calculateDueOccurrences(
      {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 31,
        month_end_behavior: 'skip',
        start_date: '2026-01-31',
      },
      '2026-01-01',
      '2026-04-30'
    );

    // Feb (28) and April (30) are skipped
    expect(dates).toEqual(['2026-01-31', '2026-03-31']);
  });

  it('respects end_date constraint', () => {
    const dates = calculateDueOccurrences(
      {
        frequency: 'daily',
        interval: 1,
        start_date: '2026-05-01',
        end_date: '2026-05-03',
      },
      '2026-05-01',
      '2026-05-10'
    );

    expect(dates).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
  });
});
