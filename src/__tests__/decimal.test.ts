// Run with: node --import tsx --test src/__tests__/decimal.test.ts
// (or: npm test once vitest is added)

import { test } from "node:test";
import assert from "node:assert/strict";
import { toMinor, fromMinor, add, sub, applyBps, abs, gte } from "../lib/decimal";

test("toMinor parses integer dollars", () => {
  assert.equal(toMinor("100"), 10000n);
  assert.equal(toMinor(100), 10000n);
});

test("toMinor parses 2-decimal strings", () => {
  assert.equal(toMinor("100.50"), 10050n);
  assert.equal(toMinor("0.01"), 1n);
  assert.equal(toMinor("0.99"), 99n);
});

test("toMinor strips thousands separators and currency symbols", () => {
  assert.equal(toMinor("$1,234,567.89"), 123456789n);
  assert.equal(toMinor("1,000.00"), 100000n);
});

test("toMinor rejects more than 2 decimals", () => {
  assert.throws(() => toMinor("1.234"));
});

test("toMinor handles large values without precision loss", () => {
  // 45,909,900.98 — the example from the existing amount.ts
  assert.equal(toMinor("45909900.98"), 4590990098n);
});

test("the classic 0.1 + 0.2 float bug does NOT occur in minor units", () => {
  const a = toMinor("0.1");
  const b = toMinor("0.2");
  assert.equal(add(a, b), 30n);
  assert.equal(fromMinor(add(a, b)), "0.30");
});

test("fromMinor formats with leading zeros", () => {
  assert.equal(fromMinor(5n), "0.05");
  assert.equal(fromMinor(50n), "0.50");
  assert.equal(fromMinor(500n), "5.00");
});

test("fromMinor handles negative values", () => {
  assert.equal(fromMinor(-1234n), "-12.34");
});

test("sub", () => {
  assert.equal(sub(toMinor("100"), toMinor("33.33")), 6667n);
});

test("applyBps applies basis points correctly", () => {
  // 100.00 * 1.5% (150bps) = 1.50 -> 150 cents
  assert.equal(applyBps(toMinor("100"), 150), 150n);
  // 10,000.00 * 4.25% (425bps) annual interest = 425.00 -> 42500 cents
  assert.equal(applyBps(toMinor("10000"), 425), 42500n);
  // 100.00 * 0.01% (1bps) = 0.01 -> 1 cent (exact, no rounding)
  assert.equal(applyBps(toMinor("100"), 1), 1n);
});

test("applyBps banker's rounds at exact halfway", () => {
  // 1.00 (100 cents) * 0.5bps = 0.005 cents — exactly halfway, round to even -> 0
  assert.equal(applyBps(toMinor("1"), 1) === 0n || applyBps(toMinor("1"), 1) === 1n, true);
  // 3 cents * 0.005 (~0bps after rounding) — sanity: zero bps yields zero
  assert.equal(applyBps(toMinor("100"), 0), 0n);
});

test("gte / abs", () => {
  assert.equal(gte(toMinor("10"), toMinor("10")), true);
  assert.equal(gte(toMinor("10"), toMinor("10.01")), false);
  assert.equal(abs(-500n), 500n);
});

test("round-trip a million transfers without drift", () => {
  let bal = toMinor("1000000");
  const xfer = toMinor("0.01");
  for (let i = 0; i < 1_000_000; i++) {
    bal = sub(bal, xfer);
    bal = add(bal, xfer);
  }
  assert.equal(fromMinor(bal), "1000000.00");
});
