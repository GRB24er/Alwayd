// Lightweight schema validators for API inputs. No external deps.
// Each validator returns { ok: true, value } or { ok: false, errors }.

import { IBAN_LENGTHS } from "./bankingCodes";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

type FieldRule<T> = (value: unknown, errors: Record<string, string>, key: string) => T | undefined;

export const v = {
  string(opts?: { min?: number; max?: number; pattern?: RegExp; trim?: boolean }): FieldRule<string> {
    return (raw, errors, key) => {
      if (raw === undefined || raw === null || raw === "") {
        errors[key] = `${key} is required`;
        return;
      }
      if (typeof raw !== "string") {
        errors[key] = `${key} must be a string`;
        return;
      }
      const value = opts?.trim !== false ? raw.trim() : raw;
      if (opts?.min !== undefined && value.length < opts.min) {
        errors[key] = `${key} must be at least ${opts.min} characters`;
        return;
      }
      if (opts?.max !== undefined && value.length > opts.max) {
        errors[key] = `${key} must be at most ${opts.max} characters`;
        return;
      }
      if (opts?.pattern && !opts.pattern.test(value)) {
        errors[key] = `${key} has an invalid format`;
        return;
      }
      return value;
    };
  },

  email(): FieldRule<string> {
    return v.string({
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      max: 254,
    });
  },

  enum<T extends string>(values: readonly T[]): FieldRule<T> {
    return (raw, errors, key) => {
      if (typeof raw !== "string" || !(values as readonly string[]).includes(raw)) {
        errors[key] = `${key} must be one of: ${values.join(", ")}`;
        return;
      }
      return raw as T;
    };
  },

  amountString(): FieldRule<string> {
    // Accepts "100.50", "1,000.00", or plain numbers serialized as strings.
    return (raw, errors, key) => {
      if (raw === undefined || raw === null || raw === "") {
        errors[key] = `${key} is required`;
        return;
      }
      const str = typeof raw === "number" ? raw.toString() : String(raw);
      const cleaned = str.replace(/[^\d.\-]/g, "");
      if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
        errors[key] = `${key} must be a number with up to 2 decimals`;
        return;
      }
      const num = Number(cleaned);
      if (!Number.isFinite(num) || num <= 0) {
        errors[key] = `${key} must be greater than 0`;
        return;
      }
      return cleaned;
    };
  },

  bool(): FieldRule<boolean> {
    return (raw, errors, key) => {
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      errors[key] = `${key} must be a boolean`;
      return;
    };
  },

  optional<T>(rule: FieldRule<T>): FieldRule<T | undefined> {
    return (raw, errors, key) => {
      if (raw === undefined || raw === null || raw === "") return undefined;
      return rule(raw, errors, key);
    };
  },

  routingNumber(): FieldRule<string> {
    // ABA checksum: (3*d1 + 7*d2 + d3 + 3*d4 + 7*d5 + d6 + 3*d7 + 7*d8 + d9) mod 10 === 0
    return (raw, errors, key) => {
      if (typeof raw !== "string" || !/^\d{9}$/.test(raw)) {
        errors[key] = `${key} must be 9 digits`;
        return;
      }
      const d = raw.split("").map(Number);
      const checksum = 3 * d[0] + 7 * d[1] + d[2] + 3 * d[3] + 7 * d[4] + d[5] + 3 * d[6] + 7 * d[7] + d[8];
      if (checksum % 10 !== 0) {
        errors[key] = `${key} failed ABA checksum`;
        return;
      }
      return raw;
    };
  },

  accountNumber(): FieldRule<string> {
    return v.string({ pattern: /^[A-Z0-9]{4,34}$/, trim: true, max: 34 });
  },

  iban(opts?: { country?: string }): FieldRule<string> {
    // mod-97 check + length-per-country from ISO 13616 registry.
    return (raw, errors, key) => {
      if (typeof raw !== "string") {
        errors[key] = `${key} is required`;
        return;
      }
      const clean = raw.replace(/\s+/g, "").toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) {
        errors[key] = `${key} is not a valid IBAN format`;
        return;
      }
      const countryFromIban = clean.slice(0, 2);
      const expectedLen = IBAN_LENGTHS[countryFromIban];
      if (expectedLen && clean.length !== expectedLen) {
        errors[key] = `${key} length ${clean.length} doesn't match ${expectedLen} expected for ${countryFromIban}`;
        return;
      }
      if (opts?.country && countryFromIban !== opts.country.toUpperCase()) {
        errors[key] = `${key} country prefix ${countryFromIban} doesn't match selected country ${opts.country}`;
        return;
      }
      const rearranged = clean.slice(4) + clean.slice(0, 4);
      const expanded = rearranged
        .split("")
        .map((ch) => (/[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch))
        .join("");
      let remainder = 0;
      for (let i = 0; i < expanded.length; i += 7) {
        remainder = Number(String(remainder) + expanded.slice(i, i + 7)) % 97;
      }
      if (remainder !== 1) {
        errors[key] = `${key} failed IBAN mod-97 check`;
        return;
      }
      return clean;
    };
  },

  swiftBic(): FieldRule<string> {
    return v.string({ pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, max: 11, trim: true });
  },

  countryCode(): FieldRule<string> {
    return v.string({ pattern: /^[A-Z]{2}$/, trim: true });
  },

  // UK sort code: 6 digits, optionally formatted "12-34-56".
  sortCodeUk(): FieldRule<string> {
    return (raw, errors, key) => {
      if (typeof raw !== "string") {
        errors[key] = `${key} is required`;
        return;
      }
      const clean = raw.replace(/[-\s]/g, "");
      if (!/^\d{6}$/.test(clean)) {
        errors[key] = `${key} must be 6 digits (e.g. 12-34-56)`;
        return;
      }
      return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
    };
  },

  // UK domestic account number: 8 digits.
  ukAccountNumber(): FieldRule<string> {
    return v.string({ pattern: /^\d{8}$/, trim: true });
  },

  // Australian BSB: 6 digits.
  bsbAu(): FieldRule<string> {
    return (raw, errors, key) => {
      if (typeof raw !== "string") {
        errors[key] = `${key} is required`;
        return;
      }
      const clean = raw.replace(/[-\s]/g, "");
      if (!/^\d{6}$/.test(clean)) {
        errors[key] = `${key} must be 6 digits`;
        return;
      }
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
    };
  },

  // Indian IFSC: 4 letters + '0' + 6 alphanumeric.
  ifscIn(): FieldRule<string> {
    return v.string({ pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, max: 11, trim: true });
  },

  // Mexican CLABE: 18 digits with mod-97 check digit per Banxico spec.
  clabeMx(): FieldRule<string> {
    return (raw, errors, key) => {
      if (typeof raw !== "string" || !/^\d{18}$/.test(raw)) {
        errors[key] = `${key} must be 18 digits`;
        return;
      }
      const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
      let sum = 0;
      for (let i = 0; i < 17; i++) {
        sum += (Number(raw[i]) * weights[i]) % 10;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      if (checkDigit !== Number(raw[17])) {
        errors[key] = `${key} failed CLABE checksum`;
        return;
      }
      return raw;
    };
  },

  // Canadian transit + institution: 5 digits + '-' + 3 digits.
  transitCa(): FieldRule<string> {
    return (raw, errors, key) => {
      if (typeof raw !== "string") {
        errors[key] = `${key} is required`;
        return;
      }
      const clean = raw.replace(/\s/g, "");
      if (!/^\d{5}-\d{3}$/.test(clean) && !/^\d{8}$/.test(clean)) {
        errors[key] = `${key} must be 5-digit transit and 3-digit institution (e.g. 12345-001)`;
        return;
      }
      return clean.length === 8 ? `${clean.slice(0, 5)}-${clean.slice(5, 8)}` : clean;
    };
  },

  // Brazilian CPF (11 digits) or CNPJ (14 digits) with checksum.
  brTaxId(): FieldRule<string> {
    return (raw, errors, key) => {
      if (typeof raw !== "string") {
        errors[key] = `${key} is required`;
        return;
      }
      const clean = raw.replace(/[.\-\/]/g, "");
      if (clean.length === 11) {
        if (!isValidCpf(clean)) {
          errors[key] = `${key} failed CPF checksum`;
          return;
        }
        return clean;
      }
      if (clean.length === 14) {
        if (!isValidCnpj(clean)) {
          errors[key] = `${key} failed CNPJ checksum`;
          return;
        }
        return clean;
      }
      errors[key] = `${key} must be 11 digits (CPF) or 14 digits (CNPJ)`;
      return;
    };
  },

  // RBI Purpose Code: alphanumeric P0XXX format.
  rbiPurposeCode(): FieldRule<string> {
    return v.string({ pattern: /^P\d{4}$/, trim: true });
  },
} as const;

export function validate<T extends Record<string, any>>(
  input: any,
  schema: Record<string, FieldRule<any>>
): ValidationResult<T> {
  const errors: Record<string, string> = {};
  const out: Record<string, any> = {};
  for (const [key, rule] of Object.entries(schema)) {
    const value = rule(input?.[key], errors, key);
    if (value !== undefined && errors[key] === undefined) {
      out[key] = value;
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: out as T };
}

// ── helpers for tax-id checksums ────────────────────────────────────────────

function isValidCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cpf[i]) * (slice + 1 - i);
    const rem = (sum * 10) % 11;
    return rem === 10 ? 0 : rem;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (slice: number, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cnpj[i]) * weights[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return calc(12, weights1) === Number(cnpj[12]) && calc(13, weights2) === Number(cnpj[13]);
}
