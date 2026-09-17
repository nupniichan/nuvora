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

export function formatMinorForInput(minorAmount: number, currencyCode: string, locale?: string): string {
  if (typeof minorAmount !== 'number' || isNaN(minorAmount) || minorAmount <= 0) return '';
  const meta = getCurrencyMetadata(currencyCode);
  const activeLocale = locale ?? (meta.code === 'VND' ? 'vi-VN' : 'en-US');

  if (meta.decimalPlaces === 0) {
    return new Intl.NumberFormat(activeLocale, { useGrouping: true }).format(minorAmount);
  }

  const major = toMajorUnits(minorAmount, currencyCode);
  return new Intl.NumberFormat(activeLocale, {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: meta.decimalPlaces,
  }).format(major);
}

export function parseAndFormatInput(
  rawInput: string,
  currencyCode: string,
  locale?: string
): { formatted: string; minor: number } {
  const meta = getCurrencyMetadata(currencyCode);
  const activeLocale = locale ?? (meta.code === 'VND' ? 'vi-VN' : 'en-US');

  if (!rawInput || rawInput.trim() === '') {
    return { formatted: '', minor: 0 };
  }

  if (meta.decimalPlaces === 0) {
    const digits = rawInput.replace(/\D/g, '');
    if (!digits) {
      return { formatted: '', minor: 0 };
    }
    const num = parseInt(digits, 10);
    if (isNaN(num) || num <= 0) {
      return { formatted: '', minor: 0 };
    }
    const formatted = new Intl.NumberFormat(activeLocale, { useGrouping: true }).format(num);
    return { formatted, minor: num };
  }

  const isCommaDecimal = activeLocale.startsWith('vi') || activeLocale.startsWith('de') || activeLocale.startsWith('fr');
  const decChar = isCommaDecimal ? ',' : '.';

  let cleaned = rawInput.replace(isCommaDecimal ? /\./g : /,/g, '').replace(/[^0-9.,]/g, '');
  const firstSepIdx = cleaned.search(/[.,]/);
  let intDigits = '';
  let decDigits: string | null = null;

  if (firstSepIdx !== -1) {
    intDigits = cleaned.slice(0, firstSepIdx).replace(/\D/g, '');
    decDigits = cleaned.slice(firstSepIdx + 1).replace(/\D/g, '').slice(0, meta.decimalPlaces);
  } else {
    intDigits = cleaned.replace(/\D/g, '');
  }

  if (!intDigits && decDigits === null) {
    return { formatted: '', minor: 0 };
  }

  let formattedInt = '';
  if (intDigits) {
    const intNum = parseInt(intDigits, 10);
    if (!isNaN(intNum)) {
      formattedInt = new Intl.NumberFormat(activeLocale, { useGrouping: true }).format(intNum);
    }
  }

  let formatted = formattedInt;
  if (firstSepIdx !== -1) {
    formatted = (formatted || '0') + decChar + (decDigits ?? '');
  }

  const numVal = parseFloat((intDigits || '0') + '.' + (decDigits || '0'));
  const minor = isNaN(numVal) ? 0 : Math.round(numVal * Math.pow(10, meta.decimalPlaces));

  return { formatted, minor };
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
