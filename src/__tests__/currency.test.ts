// Run: npm test
//
// The bank is based in Japan, so yen must lead every currency picker, be the
// default for anything unlabelled, format without a minor unit, and — because
// the ledger is USD-denominated and converted at display time — carry an FX
// quote. A supported currency with no quote converts at 1.0 and would show a
// $50,000 balance as ¥50,000.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  formatMoney,
  normalizeCurrency,
  currencyDecimals,
  isSupportedCurrency,
} from "../lib/currency";
import { FALLBACK_RATES } from "../lib/fx";

test("yen leads the currency list", () => {
  assert.equal(SUPPORTED_CURRENCIES[0].code, "JPY");
});

test("yen is the default currency", () => {
  assert.equal(DEFAULT_CURRENCY, "JPY");
  assert.ok(isSupportedCurrency("JPY"));
});

test("an unknown or missing currency falls back to yen", () => {
  assert.equal(normalizeCurrency(undefined), "JPY");
  assert.equal(normalizeCurrency("ZZZ"), "JPY");
  assert.equal(normalizeCurrency("jpy"), "JPY");
});

test("yen has no minor unit and the others have two", () => {
  assert.equal(currencyDecimals("JPY"), 0);
  for (const c of SUPPORTED_CURRENCIES.filter((x) => x.code !== "JPY")) {
    assert.equal(currencyDecimals(c.code), 2, `${c.code} should have 2 decimals`);
  }
});

test("yen formats without decimal places", () => {
  const out = formatMoney(1200000, "JPY");
  assert.ok(!out.includes("."), `yen must not print a minor unit, got ${out}`);
  assert.match(out, /1,200,000/);
});

test("two-decimal currencies still print their minor unit", () => {
  assert.match(formatMoney(1234.5, "USD"), /1,234\.50/);
});

test("an explicit fraction-digit option still wins", () => {
  assert.match(formatMoney(1234.56, "JPY", { maximumFractionDigits: 2, minimumFractionDigits: 2 }), /\.56/);
});

test("every supported currency has an FX quote", () => {
  for (const c of SUPPORTED_CURRENCIES) {
    const rate = FALLBACK_RATES[c.code];
    assert.ok(
      Number.isFinite(rate) && rate > 0,
      `${c.code} is offered as a display currency but has no FX rate — it would convert at 1.0`
    );
  }
});

test("every supported currency carries a symbol, label and locale", () => {
  for (const c of SUPPORTED_CURRENCIES) {
    assert.ok(c.symbol, `${c.code} needs a symbol`);
    assert.ok(c.label, `${c.code} needs a label`);
    assert.ok(/^[a-z]{2}-[A-Z]{2}$/.test(c.locale), `${c.code} needs a valid locale, got ${c.locale}`);
  }
});
