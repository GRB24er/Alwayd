// Integer minor-unit money math. Stores money as bigint cents to avoid IEEE-754 drift.
// All amounts that cross system boundaries should pass through here.

export type MinorUnits = bigint;

const SCALE_CACHE = new Map<number, bigint>();
function scale(decimals: number): bigint {
  let s = SCALE_CACHE.get(decimals);
  if (!s) {
    s = 10n ** BigInt(decimals);
    SCALE_CACHE.set(decimals, s);
  }
  return s;
}

export function toMinor(value: number | string | bigint, decimals = 2): MinorUnits {
  if (typeof value === "bigint") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Amount must be a finite number");
    return toMinor(value.toFixed(decimals), decimals);
  }

  const raw = value.trim();
  if (!raw) throw new Error("Amount is required");

  const cleaned = raw.replace(/[^\d.\-]/g, "");
  const m = cleaned.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`Invalid amount: ${value}`);

  const [, sign, whole, frac = ""] = m;
  if (frac.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places: ${value}`);
  }

  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const minor = BigInt(whole) * scale(decimals) + BigInt(padded || "0");
  return sign === "-" ? -minor : minor;
}

export function fromMinor(value: MinorUnits, decimals = 2): string {
  const s = scale(decimals);
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / s;
  const frac = (abs % s).toString().padStart(decimals, "0");
  return `${neg ? "-" : ""}${whole.toString()}.${frac}`;
}

export function toNumber(value: MinorUnits, decimals = 2): number {
  return Number(fromMinor(value, decimals));
}

export function add(a: MinorUnits, b: MinorUnits): MinorUnits {
  return a + b;
}

export function sub(a: MinorUnits, b: MinorUnits): MinorUnits {
  return a - b;
}

// Percentage in basis points (1% = 100bps). Banker's rounding to nearest minor unit.
export function applyBps(value: MinorUnits, bps: number): MinorUnits {
  const bpsBig = BigInt(Math.round(bps));
  const product = value * bpsBig;
  const divisor = 10000n;
  const quot = product / divisor;
  const rem = product % divisor;
  const absRem = rem < 0n ? -rem : rem;
  if (absRem * 2n < divisor) return quot;
  if (absRem * 2n > divisor) return product < 0n ? quot - 1n : quot + 1n;
  // exactly halfway -> round to even
  return quot % 2n === 0n ? quot : product < 0n ? quot - 1n : quot + 1n;
}

export function isPositive(v: MinorUnits): boolean {
  return v > 0n;
}

export function gte(a: MinorUnits, b: MinorUnits): boolean {
  return a >= b;
}

export function abs(v: MinorUnits): MinorUnits {
  return v < 0n ? -v : v;
}

export function max(a: MinorUnits, b: MinorUnits): MinorUnits {
  return a > b ? a : b;
}

// Serializes bigint as a fixed-decimal string for JSON / Mongo.
// Mongoose stores it as a string field; convert back with toMinor() on read.
export function serialize(v: MinorUnits, decimals = 2): string {
  return fromMinor(v, decimals);
}
