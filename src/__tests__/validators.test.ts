// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { v, validate } from "../lib/validators";

test("ABA routing checksum accepts a valid number", () => {
  // 021000021 — JPMorgan Chase (real, well-known ABA)
  const r = validate({ routing: "021000021" }, { routing: v.routingNumber() });
  assert.equal(r.ok, true);
});

test("ABA routing checksum rejects a wrong checksum", () => {
  const r = validate({ routing: "021000022" }, { routing: v.routingNumber() });
  assert.equal(r.ok, false);
});

test("IBAN mod-97 accepts a valid German IBAN", () => {
  // Wikipedia IBAN example — mod-97 valid.
  const r = validate({ iban: "DE89370400440532013000" }, { iban: v.iban() });
  assert.equal(r.ok, true);
});

test("IBAN rejects wrong length for the country prefix", () => {
  // DE IBAN must be 22 chars
  const r = validate({ iban: "DE893704004405320130" }, { iban: v.iban() });
  assert.equal(r.ok, false);
});

test("IBAN rejects country mismatch with selected country", () => {
  const r = validate({ iban: "DE89370400440532013000" }, { iban: v.iban({ country: "FR" }) });
  assert.equal(r.ok, false);
});

test("UK Sort Code formats to dashed form", () => {
  const r = validate({ sc: "123456" }, { sc: v.sortCodeUk() });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.sc, "12-34-56");
});

test("UK Sort Code rejects 5 digits", () => {
  const r = validate({ sc: "12345" }, { sc: v.sortCodeUk() });
  assert.equal(r.ok, false);
});

test("Australian BSB accepts 6 digits", () => {
  const r = validate({ bsb: "012003" }, { bsb: v.bsbAu() });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.bsb, "012-003");
});

test("Indian IFSC accepts valid format", () => {
  const r = validate({ ifsc: "HDFC0001234" }, { ifsc: v.ifscIn() });
  assert.equal(r.ok, true);
});

test("Indian IFSC rejects without 5th-char '0'", () => {
  const r = validate({ ifsc: "HDFC1001234" }, { ifsc: v.ifscIn() });
  assert.equal(r.ok, false);
});

test("Mexican CLABE accepts a valid checksum", () => {
  // Real CLABE structure from Banxico spec, computed with the official algorithm.
  // 002 (BBVA) + 010 (branch) + 01234567890123 + check digit computed mod 10.
  // Build it:
  const without = "00201001234567890123";
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(without[i]) * weights[i]) % 10;
  const check = (10 - (sum % 10)) % 10;
  const clabe = without.slice(0, 17) + String(check);
  const r = validate({ clabe }, { clabe: v.clabeMx() });
  assert.equal(r.ok, true);
});

test("CLABE rejects a bad checksum", () => {
  const r = validate({ clabe: "002010012345678901" }, { clabe: v.clabeMx() });
  // 18 digits but checksum almost certainly wrong
  assert.equal(r.ok, false);
});

test("Canadian transit normalizes to dashed", () => {
  const r = validate({ t: "12345001" }, { t: v.transitCa() });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.t, "12345-001");
});

test("Brazilian CPF accepts a valid one", () => {
  // 11144477735 is a commonly used CPF test vector with valid checksum.
  const r = validate({ cpf: "11144477735" }, { cpf: v.brTaxId() });
  assert.equal(r.ok, true);
});

test("Brazilian CPF rejects all-same-digit", () => {
  const r = validate({ cpf: "11111111111" }, { cpf: v.brTaxId() });
  assert.equal(r.ok, false);
});

test("SWIFT/BIC accepts 8 and 11 char forms", () => {
  const a = validate({ s: "DEUTDEFF" }, { s: v.swiftBic() });
  const b = validate({ s: "DEUTDEFF500" }, { s: v.swiftBic() });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
});

test("Country code only accepts ISO alpha-2", () => {
  const a = validate({ c: "US" }, { c: v.countryCode() });
  const b = validate({ c: "USA" }, { c: v.countryCode() });
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
});

test("Amount string strips currency and thousands", () => {
  const r = validate({ a: "$1,234.56" }, { a: v.amountString() });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.a, "1234.56");
});

test("Amount string rejects 3-decimal", () => {
  const r = validate({ a: "1.234" }, { a: v.amountString() });
  assert.equal(r.ok, false);
});

test("RBI purpose code requires P+4 digits", () => {
  const a = validate({ p: "P0102" }, { p: v.rbiPurposeCode() });
  const b = validate({ p: "P102" }, { p: v.rbiPurposeCode() });
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
});
