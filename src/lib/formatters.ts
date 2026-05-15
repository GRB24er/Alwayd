// src/lib/formatters.ts
export type Money = { USD: number; BTC: number };
export type Balances = {
  checking: Money;
  savings: Money;
  investment: Money;
  checkingSpark?: number[];
  savingsSpark?: number[];
  investmentSpark?: number[];
};

export function toNumber(x: unknown, d = 0): number {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : d;
  }
  return d;
}

export function usdTotal(b: Balances): number {
  return toNumber(b?.checking?.USD)
       + toNumber(b?.savings?.USD)
       + toNumber(b?.investment?.USD);
}

export function formatUSD(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
