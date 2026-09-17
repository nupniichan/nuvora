import {
  addMoney,
  allocateMoney,
  formatMinorForInput,
  formatMoney,
  parseAndFormatInput,
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

  test('formatMoney follows the selected language without changing currency precision', () => {
    expect(formatMoney(150000, 'VND', 'vi-VN')).toBe('150.000 ₫');
    expect(formatMoney(150000, 'VND', 'en-US')).toBe('150,000 ₫');
    expect(formatMoney(-1050, 'USD', 'vi-VN')).toBe('-$10,50');
    expect(formatMoney(-1050, 'USD', 'en-US')).toBe('-$10.50');
  });

  test('formatMinorForInput formats numbers for text inputs', () => {
    expect(formatMinorForInput(1000000, 'VND', 'vi-VN')).toBe('1.000.000');
    expect(formatMinorForInput(1000000, 'VND', 'en-US')).toBe('1,000,000');
    expect(formatMinorForInput(1050, 'USD', 'en-US')).toBe('10.5');
    expect(formatMinorForInput(0, 'VND')).toBe('');
  });

  test('parseAndFormatInput auto-formats as user types', () => {
    expect(parseAndFormatInput('1000000', 'VND', 'vi-VN')).toEqual({
      formatted: '1.000.000',
      minor: 1000000,
    });
    expect(parseAndFormatInput('1.000.0000', 'VND', 'vi-VN')).toEqual({
      formatted: '10.000.000',
      minor: 10000000,
    });
    expect(parseAndFormatInput('1.000.00', 'VND', 'vi-VN')).toEqual({
      formatted: '100.000',
      minor: 100000,
    });
    expect(parseAndFormatInput('', 'VND', 'vi-VN')).toEqual({
      formatted: '',
      minor: 0,
    });
    expect(parseAndFormatInput('1000.5', 'USD', 'en-US')).toEqual({
      formatted: '1,000.5',
      minor: 100050,
    });
  });

  test('addMoney and subtractMoney', () => {
    const a = { amount: 100, currency: 'USD' };
    const b = { amount: 50, currency: 'USD' };

    expect(addMoney(a, b)).toEqual({ amount: 150, currency: 'USD' });
    expect(subtractMoney(a, b)).toEqual({ amount: 50, currency: 'USD' });
  });

  test('allocateMoney preserves exact total sum using Largest Remainder Method', () => {
    const total = 100;
    const weights = [1, 1, 1];
    const allocations = allocateMoney(total, weights);

    expect(allocations.reduce((sum, val) => sum + val, 0)).toBe(total);
    expect(allocations).toEqual([34, 33, 33]);
  });

  test('allocateMoney for percentage weights', () => {
    const total = 100000;
    const weights = [50, 30, 20];
    const allocations = allocateMoney(total, weights);

    expect(allocations.reduce((sum, val) => sum + val, 0)).toBe(total);
    expect(allocations).toEqual([50000, 30000, 20000]);
  });
});
