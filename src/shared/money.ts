import { getCurrencyMetadata } from './currency-config';

export interface Money {
  amount: number; // Integer minor units (e.g., 10000 VND = 10000, $10.50 USD = 1050)
  currency: string;
}

/**
 * Converts a major unit decimal (e.g. 10.50) to integer minor units (e.g. 1050 for USD, 10500 for VND)
 */
export function toMinorUnits(majorAmount: number, currencyCode: string): number {
  if (typeof majorAmount !== 'number' || isNaN(majorAmount)) return 0;
  const meta = getCurrencyMetadata(currencyCode);
  const factor = Math.pow(10, meta.decimalPlaces);
  return Math.round(majorAmount * factor);
}

/**
 * Converts integer minor units (e.g. 1050) to major unit decimal (e.g. 10.50)
 */
export function toMajorUnits(minorAmount: number, currencyCode: string): number {
  if (typeof minorAmount !== 'number' || isNaN(minorAmount)) return 0;
  const meta = getCurrencyMetadata(currencyCode);
  const factor = Math.pow(10, meta.decimalPlaces);
  return minorAmount / factor;
}

/**
 * Formats minor units into human readable money string (e.g., "100.000 ₫" or "$10.50")
 */
export function formatMoney(minorAmount: number, currencyCode: string): string {
  const safeMinor = typeof minorAmount === 'number' && !isNaN(minorAmount) ? minorAmount : 0;
  const meta = getCurrencyMetadata(currencyCode);
  const major = toMajorUnits(safeMinor, currencyCode);

  const formattedNum = new Intl.NumberFormat(
    meta.code === 'VND' ? 'vi-VN' : 'en-US',
    {
      minimumFractionDigits: meta.decimalPlaces,
      maximumFractionDigits: meta.decimalPlaces,
    }
  ).format(Math.abs(major));

  const sign = safeMinor < 0 ? '-' : '';
  const space = meta.spaceSeparator ? ' ' : '';

  if (meta.symbolPosition === 'prefix') {
    return `${sign}${meta.symbol}${space}${formattedNum}`;
  } else {
    return `${sign}${formattedNum}${space}${meta.symbol}`;
  }
}

/**
 * Adds two Money objects (must have same currency)
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Subtracts b from a (must have same currency)
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount - b.amount, currency: a.currency };
}

/**
 * Distributes an exact integer minor amount among a set of weights (ratios or percentages)
 * using the Largest Remainder Method (Hamilton Method).
 * Guarantees that sum(result) === totalAmount exactly.
 */
export function allocateMoney(totalAmount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }

  const exactAllocations = weights.map((w) => (totalAmount * w) / totalWeight);
  const integerAllocations = exactAllocations.map((a) => Math.floor(a));
  const allocatedSum = integerAllocations.reduce((sum, a) => sum + a, 0);

  let remainder = totalAmount - allocatedSum;

  const fractionalParts = exactAllocations.map((exact, idx) => ({
    index: idx,
    fraction: exact - integerAllocations[idx],
  }));

  // Sort by fraction descending
  fractionalParts.sort((a, b) => b.fraction - a.fraction);

  const result = [...integerAllocations];
  for (let i = 0; i < remainder; i++) {
    const targetIdx = fractionalParts[i % fractionalParts.length].index;
    result[targetIdx] += 1;
  }

  return result;
}
