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
  // ISO 4217 minor-unit digits. Yen has none: ¥1,200 — never ¥1,200.00.
  decimals: number;
}

// Order matters: this list drives every currency picker in the app, and the
// bank's home currency leads it. Yen is first because the bank is based in
// Japan.
export const SUPPORTED_CURRENCIES: CurrencyDef[] = [
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', locale: 'ja-JP', decimals: 0 },
  { code: 'USD', symbol: '$', label: 'US Dollar', locale: 'en-US', decimals: 2 },
  { code: 'EUR', symbol: '€', label: 'Euro', locale: 'en-GB', decimals: 2 },
  { code: 'GBP', symbol: '£', label: 'British Pound', locale: 'en-GB', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc', locale: 'de-CH', decimals: 2 },
];

// The bank's home currency, and what anything unlabelled is presented in.
export const DEFAULT_CURRENCY = 'JPY';

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

export function currencyDef(code: string): CurrencyDef {
  return BY_CODE[normalizeCurrency(code)];
}

// Minor-unit digits for a currency — 0 for yen, 2 for the rest.
export function currencyDecimals(code: string): number {
  return currencyDef(code).decimals;
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
  // Default to the currency's own minor-unit digits so yen renders as ¥1,200
  // rather than ¥1,200.00. An explicit option still wins.
  const min = opts.minimumFractionDigits ?? def.decimals;
  const max = Math.max(min, opts.maximumFractionDigits ?? def.decimals);
  try {
    return new Intl.NumberFormat(def.locale, {
      style: 'currency',
      currency: def.code,
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(n);
  } catch {
    return `${def.symbol}${n.toLocaleString(undefined, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    })}`;
  }
}
