// Field-level encryption for PII (SSN, DOB, ID numbers, etc.).
// AES-256-GCM with the key derived from PII_ENCRYPTION_KEY (32-byte hex in env).
// Each ciphertext is self-describing: version|iv|ciphertext|tag — Base64-encoded.
// Versioned so we can rotate the key later without rewriting at-rest data.

import crypto from "crypto";

const VERSION = "v1";
const ALG = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PII_ENCRYPTION_KEY env var is required for field-level encryption");
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === KEY_LEN * 2) {
    key = Buffer.from(raw, "hex");
  } else {
    // Allow base64 too. If neither form yields exactly 32 bytes, hash it down deterministically.
    try {
      const b = Buffer.from(raw, "base64");
      key = b.length === KEY_LEN ? b : crypto.createHash("sha256").update(raw).digest();
    } catch {
      key = crypto.createHash("sha256").update(raw).digest();
    }
  }
  return key;
}

export interface EncryptedField {
  // Versioned ciphertext format: `${version}:${iv_b64}:${ct_b64}:${tag_b64}`
  ciphertext: string;
  // Lowercase hash of the cleartext for indexable equality search (e.g. de-dup SSNs).
  // Keyed with HMAC so attackers can't pre-image with rainbow tables of common SSNs.
  searchHash?: string;
}

export function encrypt(plaintext: string, opts?: { searchable?: boolean }): EncryptedField {
  if (typeof plaintext !== "string") {
    throw new Error("encrypt: plaintext must be string");
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const result: EncryptedField = {
    ciphertext: `${VERSION}:${iv.toString("base64")}:${ct.toString("base64")}:${tag.toString("base64")}`,
  };

  if (opts?.searchable) {
    result.searchHash = searchHash(plaintext);
  }
  return result;
}

export function decrypt(ciphertext: string): string {
  if (typeof ciphertext !== "string" || !ciphertext.startsWith(`${VERSION}:`)) {
    throw new Error(`decrypt: unsupported ciphertext version`);
  }
  const [, ivB64, ctB64, tagB64] = ciphertext.split(":");
  if (!ivB64 || !ctB64 || !tagB64) throw new Error("decrypt: malformed ciphertext");

  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) throw new Error("decrypt: bad iv/tag length");

  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function searchHash(plaintext: string): string {
  const key = getKey();
  // Normalize: lowercase + remove whitespace/punctuation, so "123-45-6789" and "123456789" match.
  const norm = plaintext.toLowerCase().replace(/[\s\-./]/g, "");
  return crypto.createHmac("sha256", key).update(norm).digest("hex");
}

// Mask a PII string for display: keep last 4 chars, mask the rest.
export function mask(plaintext: string, visibleTail = 4): string {
  if (plaintext.length <= visibleTail) return "*".repeat(plaintext.length);
  return "*".repeat(plaintext.length - visibleTail) + plaintext.slice(-visibleTail);
}

// Helper for "encrypt this if a key is configured; otherwise pass through".
// Use only at write boundaries — never at read paths.
export function encryptOptional(plaintext: string | undefined | null): EncryptedField | null {
  if (!plaintext) return null;
  if (!process.env.PII_ENCRYPTION_KEY) return { ciphertext: plaintext };
  return encrypt(plaintext, { searchable: true });
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.PII_ENCRYPTION_KEY;
}
