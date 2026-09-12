// src/lib/fx.ts
// Foreign-exchange rates for display conversion.
//
// The ledger is denominated in the base unit (USD) — every stored balance and
// transaction amount is a USD number. When a customer chooses a different
// display currency we convert at display time using live mid-market rates,
// so $100 credited shows as roughly €92 / £79 etc.
//
// Rates are fetched from a free provider and cached in-process. If the network
// call fails we fall back to recent static approximations so the app never
// breaks during a demo — the response reports which source was used.

export const BASE_CURRENCY = "USD";

// Recent approximate mid-market rates vs USD, used only if the live fetch
// fails. Kept deliberately close to real values so a fallback still looks sane.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
};

interface FxSnapshot {
  base: string;
  rates: Record<string, number>;
  asOf: string;
  source: "live" | "fallback";
}

let cache: { snapshot: FxSnapshot; fetchedAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchLive(): Promise<Record<string, number> | null> {
  // Primary: Frankfurter (ECB data, free, no key). Falls back to open.er-api.
  const endpoints = [
    "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,CHF",
    "https://open.er-api.com/v6/latest/USD",
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data: any = await res.json();
      const rates: Record<string, number> = { USD: 1 };
      const src = data.rates || {};
      for (const code of ["EUR", "GBP", "CHF"]) {
        const r = Number(src[code]);
        if (Number.isFinite(r) && r > 0) rates[code] = r;
      }
      // Require at least one non-USD rate to consider it a success.
      if (Object.keys(rates).length > 1) return rates;
    } catch {
      // try next endpoint
    }
  }
  return null;
}

export async function getFxRates(): Promise<FxSnapshot> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.snapshot;
  }
  const live = await fetchLive();
  const snapshot: FxSnapshot = live
    ? { base: BASE_CURRENCY, rates: { ...FALLBACK_RATES, ...live }, asOf: new Date().toISOString(), source: "live" }
    : { base: BASE_CURRENCY, rates: { ...FALLBACK_RATES }, asOf: new Date().toISOString(), source: "fallback" };
  cache = { snapshot, fetchedAt: Date.now() };
  return snapshot;
}

// Convert an amount from the base (USD) to a target display currency.
export function convertFromBase(amount: number, to: string, rates: Record<string, number>): number {
  const rate = rates[to];
  if (!Number.isFinite(rate) || rate <= 0) return amount;
  return amount * rate;
}
