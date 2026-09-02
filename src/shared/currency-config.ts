export interface CurrencyMetadata {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  symbolPosition: 'prefix' | 'suffix';
  spaceSeparator: boolean;
}

export const CURRENCIES: Record<string, CurrencyMetadata> = {
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Việt Nam Đồng',
    decimalPlaces: 0,
    symbolPosition: 'suffix',
    spaceSeparator: true,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    symbolPosition: 'prefix',
    spaceSeparator: false,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    symbolPosition: 'prefix',
    spaceSeparator: true,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimalPlaces: 0,
    symbolPosition: 'prefix',
    spaceSeparator: false,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    symbolPosition: 'prefix',
    spaceSeparator: false,
  },
};

export const DEFAULT_CURRENCY = 'VND';

export function getCurrencyMetadata(code: string): CurrencyMetadata {
  return (
    CURRENCIES[code.toUpperCase()] ?? {
      code: code.toUpperCase(),
      symbol: code.toUpperCase(),
      name: code.toUpperCase(),
      decimalPlaces: 2,
      symbolPosition: 'suffix',
      spaceSeparator: true,
    }
  );
}
