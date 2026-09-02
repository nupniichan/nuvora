import {
  addMoney,
  allocateMoney,
  formatMoney,
  subtractMoney,
  toMajorUnits,
  toMinorUnits,
} from '../money';

describe('Money Utilities', () => {
  test('toMinorUnits and toMajorUnits for VND (0 decimal places)', () => {
    expect(toMinorUnits(150000, 'VND')).toBe(150000);
    expect(toMajorUnits(150000, 'VND')).toBe(150000);
  });

  test('toMinorUnits and toMajorUnits for USD (2 decimal places)', () => {
    expect(toMinorUnits(10.5, 'USD')).toBe(1050);
    expect(toMajorUnits(1050, 'USD')).toBe(10.5);
  });

  test('formatMoney formatting', () => {
    expect(formatMoney(150000, 'VND')).toContain('150');
    expect(formatMoney(150000, 'VND')).toContain('₫');
    expect(formatMoney(1050, 'USD')).toContain('$10.50');
  });

  test('addMoney and subtractMoney', () => {
    const a = { amount: 100, currency: 'USD' };
    const b = { amount: 50, currency: 'USD' };

    expect(addMoney(a, b)).toEqual({ amount: 150, currency: 'USD' });
    expect(subtractMoney(a, b)).toEqual({ amount: 50, currency: 'USD' });
  });

  test('allocateMoney preserves exact total sum using Largest Remainder Method', () => {
    // 100 units allocated in ratios 1:1:1 (33.333... each)
    const total = 100;
    const weights = [1, 1, 1];
    const allocations = allocateMoney(total, weights);

    expect(allocations.reduce((sum, val) => sum + val, 0)).toBe(total);
    // Should be [34, 33, 33] or similar distributing the 1 remainder
    expect(allocations).toEqual([34, 33, 33]);
  });

  test('allocateMoney for percentage weights', () => {

    const total = 100000;
    const weights = [50, 30, 20]; // 50%, 30%, 20%
    const allocations = allocateMoney(total, weights);

    expect(allocations.reduce((sum, val) => sum + val, 0)).toBe(total);
    expect(allocations).toEqual([50000, 30000, 20000]);
  });
});
