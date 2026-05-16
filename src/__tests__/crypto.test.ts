// Run: npm test
// Sets a deterministic key for the test process.

process.env.PII_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars = 32 bytes

import { test } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt, searchHash, mask } from "../lib/crypto";

test("encrypt -> decrypt round trip", () => {
  const pt = "123-45-6789";
  const enc = encrypt(pt);
  assert.notEqual(enc.ciphertext, pt);
  assert.equal(decrypt(enc.ciphertext), pt);
});

test("ciphertext is unique per encryption (IV randomized)", () => {
  const a = encrypt("secret");
  const b = encrypt("secret");
  assert.notEqual(a.ciphertext, b.ciphertext);
});

test("searchHash is deterministic and normalizes punctuation", () => {
  const h1 = searchHash("123-45-6789");
  const h2 = searchHash("123456789");
  const h3 = searchHash("123 45 6789");
  assert.equal(h1, h2);
  assert.equal(h2, h3);
});

test("decrypt rejects tampered ciphertext", () => {
  const enc = encrypt("hello world");
  // Flip a byte in the ciphertext segment (third field).
  const parts = enc.ciphertext.split(":");
  const ct = Buffer.from(parts[2], "base64");
  ct[0] ^= 0xff;
  parts[2] = ct.toString("base64");
  const tampered = parts.join(":");
  assert.throws(() => decrypt(tampered));
});

test("decrypt rejects an unsupported version prefix", () => {
  assert.throws(() => decrypt("v9:foo:bar:baz"));
});

test("mask shows only the last N characters", () => {
  assert.equal(mask("123456789"), "*****6789");
  assert.equal(mask("123", 4), "***");
  assert.equal(mask("ABCDEFGH", 2), "******GH");
});

test("searchable encryption returns both ciphertext and hash", () => {
  const e = encrypt("123-45-6789", { searchable: true });
  assert.equal(typeof e.ciphertext, "string");
  assert.equal(typeof e.searchHash, "string");
  assert.equal(e.searchHash, searchHash("123-45-6789"));
});
