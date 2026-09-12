// Run: npm test
//
// The statement routes classified transactions as 'credit' / 'debit' — neither
// is a member of TxType, so every emailed statement showed zero credits, zero
// debits, every line badged as a withdrawal, and a running balance that only
// ever fell. These guard the classification and the routes' wiring.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isCreditType, isDebitType, signedAmount, isSettled, statementNumberFor } from "../lib/statementEmail";

const repoRoot = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(repoRoot, p), "utf8");
const exists = (p: string) => fs.existsSync(path.join(repoRoot, p));

// Every member of TxType (src/models/Transaction.ts) must be classified.
const CREDITS = ["deposit", "transfer-in", "interest", "adjustment-credit"];
const DEBITS = ["withdraw", "transfer-out", "fee", "adjustment-debit"];

test("every transaction type is classified as a credit or a debit", () => {
  const declared = read("src/models/Transaction.ts");
  const union = declared.slice(declared.indexOf("export type TxType"), declared.indexOf("export type TxStatus"));
  const types = Array.from(union.matchAll(/'([a-z-]+)'/g)).map((m) => m[1]);
  assert.ok(types.length >= 8, `expected to parse the TxType union, got ${types.join(", ")}`);
  for (const t of types) {
    assert.ok(
      isCreditType(t) !== isDebitType(t),
      `${t} must be exactly one of credit or debit — it is currently ${
        isCreditType(t) ? "both" : "neither"
      }`
    );
  }
});

test("credits add and debits subtract", () => {
  for (const t of CREDITS) assert.equal(signedAmount({ type: t, amount: 100 }), 100, t);
  for (const t of DEBITS) assert.equal(signedAmount({ type: t, amount: 100 }), -100, t);
});

test("a stored negative amount does not flip a debit back into a credit", () => {
  assert.equal(signedAmount({ type: "withdraw", amount: -100 }), -100);
  assert.equal(signedAmount({ type: "deposit", amount: -100 }), 100);
});

test("'credit' and 'debit' are not transaction types", () => {
  // The exact bug: filtering on these matched nothing.
  for (const bogus of ["credit", "debit", "transfer", "withdrawal"]) {
    assert.equal(isCreditType(bogus), false, bogus);
    assert.equal(isDebitType(bogus), false, bogus);
    assert.equal(signedAmount({ type: bogus, amount: 100 }), 0, `${bogus} must not move the balance`);
  }
});

test("only settled money counts", () => {
  assert.equal(isSettled({ status: "completed" }), true);
  assert.equal(isSettled({ status: "approved" }), true);
  assert.equal(isSettled({ posted: true, status: "pending" }), true);
  assert.equal(isSettled({ status: "pending" }), false);
  assert.equal(isSettled({ status: "rejected" }), false);
  assert.equal(isSettled({}), false);
});

test("statement numbers are unique-ish and prefixed", () => {
  const a = statementNumberFor(new Date("2026-03-01T00:00:00Z"));
  assert.match(a, /^AEC-2026-\d{8}$/);
});

// ── Route wiring ──────────────────────────────────────────────────────────────

test("the route the admin console posts a manual statement to exists", () => {
  const page = read("src/app/dashboard/admin/statements/page.tsx");
  const endpoints = Array.from(page.matchAll(/fetch\(\s*['"`](\/api\/[^'"`?]+)/g)).map((m) => m[1]);
  assert.ok(endpoints.length > 0, "expected the console to call some API routes");
  for (const ep of endpoints) {
    const routeFile = `src/app${ep}/route.ts`;
    assert.ok(exists(routeFile), `${ep} is called by the admin console but ${routeFile} does not exist`);
  }
});

test("the manual send accepts the field the console actually sends", () => {
  const page = read("src/app/dashboard/admin/statements/page.tsx");
  const route = read("src/app/api/statements/send-manual/route.ts");
  // The console's input is an email address, not an id.
  assert.match(page, /userEmail: selectedUser/);
  assert.match(route, /body\.userEmail/);
});

test("both statement routes build from the shared module", () => {
  for (const p of ["src/app/api/statements/send/route.ts", "src/app/api/statements/send-manual/route.ts"]) {
    const src = read(p);
    assert.match(src, /buildStatement/, `${p} should use the shared builder`);
    assert.ok(!/=== 'credit'|=== "credit"/.test(src), `${p} must not classify on a 'credit' type`);
    assert.ok(!/openingBalance = 5000/.test(src), `${p} must not hardcode an opening balance`);
  }
});

test("a failed send is recorded rather than silently dropped", () => {
  for (const p of ["src/app/api/statements/send/route.ts", "src/app/api/statements/send-manual/route.ts"]) {
    assert.match(read(p), /'failed'|"failed"/, `${p} should mark the statement failed on error`);
  }
});
