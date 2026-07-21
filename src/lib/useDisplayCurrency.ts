"use client";

// Client hook that resolves the signed-in user's display currency AND live FX
// rates, then returns converting formatters. The ledger stores amounts in the
// base unit (USD); this converts them to the chosen display currency at
// mid-market rates, so $100 credited shows as ~€92 / ~£79.
//
// Both the currency and the rate snapshot are memoised at module scope so
// navigating between pages doesn't re-fetch.

import { useEffect, useState } from "react";
import { formatMoney, DEFAULT_CURRENCY, currencySymbol } from "@/lib/currency";

let cachedCurrency: string | null = null;
let cachedRates: Record<string, number> | null = null;

export function useDisplayCurrency() {
  const [currency, setCurrency] = useState<string>(cachedCurrency || DEFAULT_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>(cachedRates || { USD: 1 });

  useEffect(() => {
    let active = true;

    if (!cachedCurrency) {
      fetch("/api/user/dashboard")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const c = d?.user?.displayCurrency;
          if (c && active) {
            cachedCurrency = c;
            setCurrency(c);
          }
        })
        .catch(() => {});
    }

    if (!cachedRates) {
      fetch("/api/fx/rates")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.rates && active) {
            cachedRates = d.rates;
            setRates(d.rates);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, []);

  const rate = Number(rates[currency]) > 0 ? Number(rates[currency]) : 1;

  // Convert a base-currency (USD) amount into the display currency.
  const convert = (amount: number) => Number(amount || 0) * rate;

  // Convert then format with the display currency's symbol. `compact` renders
  // 1.2K / 3.4M.
  const format = (amount: number, opts?: { compact?: boolean; maximumFractionDigits?: number }) => {
    const n = convert(amount);
    if (opts?.compact) {
      const sym = currencySymbol(currency);
      if (Math.abs(n) >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
      if (Math.abs(n) >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}K`;
    }
    return formatMoney(n, currency, { maximumFractionDigits: opts?.maximumFractionDigits });
  };

  return { currency, symbol: currencySymbol(currency), rate, convert, format };
}
