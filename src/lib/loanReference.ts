// src/lib/loanReference.ts
// Reference number generator for Aldwych European Capital facilities.
// Format: AEC-YY-MM-XXXX-C
//   AEC  : issuer prefix
//   YY   : 2-digit year of issuance
//   MM   : 2-digit month
//   XXXX : 4-character cryptographically random alphanumeric
//   C    : single-character Luhn-style check digit so a typed reference
//          can be validated client-side without a DB round-trip.

import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
const ALPHA_LEN = ALPHABET.length; // 32

function alphabetIndex(ch: string): number {
  return ALPHABET.indexOf(ch.toUpperCase());
}

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHA_LEN];
  }
  return out;
}

/** Computes the check digit for a reference body (the part before the
 *  final character). Uses a position-weighted sum modulo the alphabet
 *  length, similar in spirit to ISO/IEC 7064 / Luhn. */
function computeCheckDigit(body: string): string {
  let sum = 0;
  let weight = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    const idx = alphabetIndex(body[i]);
    if (idx < 0) continue; // skip non-alphabet (e.g. hyphens)
    sum += idx * weight;
    weight = weight === 2 ? 3 : 2;
  }
  return ALPHABET[(ALPHA_LEN - (sum % ALPHA_LEN)) % ALPHA_LEN];
}

export function generateLoanReference(now: Date = new Date()): string {
  const yy = String(now.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const code = randomCode(4);
  const body = `AEC-${yy}-${mm}-${code}`;
  const check = computeCheckDigit(body.replace(/-/g, ''));
  return `${body}-${check}`;
}

/** Validates a reference number's check digit. Does NOT confirm the
 *  reference exists — that requires a DB lookup. */
export function isValidLoanReference(reference: string): boolean {
  const trimmed = String(reference || '').trim().toUpperCase();
  // Expected layout: AEC-XX-XX-XXXX-X
  if (!/^AEC-\d{2}-\d{2}-[A-Z2-9]{4}-[A-Z2-9]$/.test(trimmed)) return false;
  const parts = trimmed.split('-');
  const body = parts.slice(0, 4).join('').replace(/[^A-Z2-9]/g, '');
  const expected = computeCheckDigit(body);
  return expected === parts[4];
}
