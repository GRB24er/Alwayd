// src/lib/money.ts
// Render money like $45,600,780.89 everywhere.

export type CurrencyCode = string;

export function formatCurrency(
  value: number | string,
  currency: CurrencyCode = "USD",
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) {
  const num = Number(value ?? 0);
  const minimumFractionDigits = opts?.minimumFractionDigits ?? 2;
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(isFinite(num) ? num : 0);
}

export function formatSigned(
  value: number | string,
  currency: CurrencyCode = "USD",
  direction: "credit" | "debit" | "none" = "none"
) {
  const n = Number(value ?? 0);
  const core = formatCurrency(Math.abs(n), currency);
  if (direction === "credit") return `+${core}`;
  if (direction === "debit") return `-${core}`;
  return core;
}
