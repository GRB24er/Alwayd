"use client";

// Client hook that resolves the signed-in user's display currency once and
// returns a formatter. The result is memoised at module scope so navigating
// between pages doesn't re-fetch. Presentation only — amounts are not
// FX-converted, this just relabels with the chosen symbol.

import { useEffect, useState } from "react";
import { formatMoney, DEFAULT_CURRENCY, currencySymbol } from "@/lib/currency";

let cachedCurrency: string | null = null;

export function useDisplayCurrency() {
  const [currency, setCurrency] = useState<string>(cachedCurrency || DEFAULT_CURRENCY);

  useEffect(() => {
    if (cachedCurrency) {
      setCurrency(cachedCurrency);
      return;
    }
    let active = true;
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
    return () => {
      active = false;
    };
  }, []);

  // Format a value in the resolved currency. `compact` renders 1.2K / 3.4M.
  const format = (amount: number, opts?: { compact?: boolean; maximumFractionDigits?: number }) => {
    const n = Number(amount || 0);
    if (opts?.compact) {
      const sym = currencySymbol(currency);
      if (Math.abs(n) >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
      if (Math.abs(n) >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}K`;
    }
    return formatMoney(n, currency, { maximumFractionDigits: opts?.maximumFractionDigits });
  };

  return { currency, symbol: currencySymbol(currency), format };
}
