import { getCurrencyMetadata } from './currency-config';

export interface Money {
  amount: number;
  currency: string;
}

export function toMinorUnits(majorAmount: number, currencyCode: string): number {
  if (typeof majorAmount !== 'number' || isNaN(majorAmount)) return 0;
  const meta = getCurrencyMetadata(currencyCode);
  const factor = Math.pow(10, meta.decimalPlaces);
  return Math.round(majorAmount * factor);
}

export function toMajorUnits(minorAmount: number, currencyCode: string): number {
  if (typeof minorAmount !== 'number' || isNaN(minorAmount)) return 0;
  const meta = getCurrencyMetadata(currencyCode);
  const factor = Math.pow(10, meta.decimalPlaces);
  return minorAmount / factor;
}

export function formatMoney(minorAmount: number, currencyCode: string, locale?: string): string {
  const safeMinor = typeof minorAmount === 'number' && !isNaN(minorAmount) ? minorAmount : 0;
  const meta = getCurrencyMetadata(currencyCode);
  const major = toMajorUnits(safeMinor, currencyCode);

  const formattedNum = new Intl.NumberFormat(
    locale ?? (meta.code === 'VND' ? 'vi-VN' : 'en-US'),
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

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount - b.amount, currency: a.currency };
}

export function allocateMoney(totalAmount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }

  const exactAllocations = weights.map((weight) => (totalAmount * weight) / totalWeight);
  const integerAllocations = exactAllocations.map((allocation) => Math.floor(allocation));
  const allocatedSum = integerAllocations.reduce((sum, allocation) => sum + allocation, 0);

  let remainder = totalAmount - allocatedSum;

  const fractionalParts = exactAllocations.map((exact, index) => ({
    index,
    fraction: exact - integerAllocations[index],
  }));

  fractionalParts.sort((a, b) => b.fraction - a.fraction);

  const result = [...integerAllocations];
  for (let i = 0; i < remainder; i++) {
    const targetIdx = fractionalParts[i % fractionalParts.length].index;
    result[targetIdx] += 1;
  }

  return result;
}
