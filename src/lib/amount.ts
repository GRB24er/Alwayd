// src/lib/amount.ts
/**
 * Amount parsing/validation helpers.
 * Accepts inputs like:
 *  - "45909900.98"
 *  - "45,909,900.98"
 *  - 45909900.98 (number)
 *
 * Keeps exactly 2 decimal places max. Returns a JS number.
 * If invalid, throws an Error with a clear message.
 */

export function parseAmount(input: unknown): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Amount must be a finite number.");
    if (input <= 0) throw new Error("Amount must be greater than 0.");
    // limit to 2 decimals
    return round2(input);
  }

  if (typeof input !== "string") {
    throw new Error("Amount must be a string or number.");
  }

  const trimmed = input.trim();
  if (!trimmed) throw new Error("Amount is required.");

  // Allow digits, commas, dot, optional leading +/-
  // Strip out any currency symbols or spaces the user may paste.
  const cleaned = trimmed.replace(/[^\d.,+-]/g, "");

  // If user typed "+", remove it; we don't allow negatives for deposits.
  const unsigned = cleaned.replace(/^\+/, "");

  // Normalize: remove all commas (treat them as thousands separators)
  const noCommas = unsigned.replace(/,/g, "");

  // Must match: digits, optional single dot with up to 2 decimals
  if (!/^\d+(\.\d{1,2})?$/.test(noCommas)) {
    throw new Error("Invalid amount format. Use up to 2 decimals (e.g. 45,909,900.98).");
  }

  const value = Number(noCommas);
  if (!Number.isFinite(value)) throw new Error("Amount is not a valid number.");
  if (value <= 0) throw new Error("Amount must be greater than 0.");

  return round2(value);
}

/** Optional: for client-side inputs — remove commas, keep up to 2 decimals. */
export function normalizeAmountInputForSubmit(input: string): string {
  const cleaned = input.trim().replace(/[^\d.,+-]/g, "").replace(/,/g, "");
  // keep only the first dot if user typed many
  const parts = cleaned.split(".");
  const head = parts.shift() ?? "";
  const tail = parts.join(""); // merge all extra dots
  const withOneDot = tail ? `${head}.${tail}` : head;

  // limit to 2 decimals for submission
  const match = withOneDot.match(/^(\d+)(?:\.(\d{0,2}))?/);
  if (!match) return "";
  const whole = match[1];
  const dec = match[2] ?? "";
  return dec ? `${whole}.${dec}` : whole;
}

/** Format a number like 45909900.98 -> "45,909,900.98" (nice for display) */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  // Avoid FP noise and keep 2 decimals
  return Math.round(n * 100) / 100;
}
