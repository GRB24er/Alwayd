// src/lib/currency.ts
// Single source of truth for the display currencies the app supports.
//
// Important: this governs PRESENTATION only. The underlying ledger
// (Transaction rows) is denominated in the bank's base unit and stores plain
// numeric amounts — choosing a display currency relabels the symbol, it does
// not apply any FX conversion. That is deliberate for the prototype.

export interface CurrencyDef {
  code: string;   // ISO 4217
  symbol: string;
  label: string;
  locale: string; // used for Intl formatting
}

export const SUPPORTED_CURRENCIES: CurrencyDef[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro', locale: 'en-GB' },
  { code: 'GBP', symbol: '£', label: 'British Pound', locale: 'en-GB' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc', locale: 'de-CH' },
];

export const DEFAULT_CURRENCY = 'USD';

const BY_CODE: Record<string, CurrencyDef> = SUPPORTED_CURRENCIES.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<string, CurrencyDef>
);

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(BY_CODE, code.toUpperCase());
}

export function normalizeCurrency(code: unknown): string {
  return isSupportedCurrency(code) ? (code as string).toUpperCase() : DEFAULT_CURRENCY;
}

export function currencySymbol(code: string): string {
  return BY_CODE[normalizeCurrency(code)].symbol;
}

// Format an amount in the given display currency. Falls back gracefully if the
// runtime lacks the locale/currency data.
export function formatMoney(
  amount: number,
  code: string = DEFAULT_CURRENCY,
  opts: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
): string {
  const def = BY_CODE[normalizeCurrency(code)];
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(def.locale, {
      style: 'currency',
      currency: def.code,
      minimumFractionDigits: opts.minimumFractionDigits ?? 2,
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
    }).format(n);
  } catch {
    return `${def.symbol}${n.toLocaleString(undefined, {
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
    })}`;
  }
}
