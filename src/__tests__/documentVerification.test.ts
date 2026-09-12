// Run: npm test
//
// Guards the public document verification path. Two classes of bug are covered:
//   1. The /verify/[ref] page must never resolve its own origin and call its
//      own API over HTTP — that produced "Could not reach verification service"
//      on every production scan.
//   2. A reference minted anywhere in the app must route to a registry, so a
//      genuine receipt is never reported as "not in our registry".

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  referenceKind,
  referenceCandidates,
  transactionDocumentType,
  maskName,
} from "../lib/verificationReferences";

// npm test runs from the repo root.
const repoRoot = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(repoRoot, p), "utf8");

// These tests assert on what the page *does*, so the prose explaining what it
// deliberately no longer does must not trip them. Drop whole-line comments.
const codeOnly = (src: string) =>
  src
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*"));
    })
    .join("\n");

// ── The page must not self-fetch ──────────────────────────────────────────────

test("the verify page does not fetch over HTTP", () => {
  const page = codeOnly(read("src/app/verify/[ref]/page.tsx"));
  assert.ok(!/\bfetch\s*\(/.test(page), "verify page must resolve documents in-process, not over HTTP");
});

test("the verify page does not guess its own origin", () => {
  const page = codeOnly(read("src/app/verify/[ref]/page.tsx"));
  for (const env of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
    assert.ok(!page.includes(env), `verify page must not depend on ${env}`);
  }
  assert.ok(!page.includes("localhost:3000"), "verify page must not fall back to localhost");
});

test("the verify page resolves documents through the shared library", () => {
  const page = codeOnly(read("src/app/verify/[ref]/page.tsx"));
  assert.match(page, /verifyDocument/);
  assert.match(page, /@\/lib\/documentVerification/);
});

// ── Every minted reference prefix routes somewhere ────────────────────────────

// Prefixes actually produced by the app, with the registry each belongs to.
const MINTED: Array<[string, ReturnType<typeof referenceKind>]> = [
  ["WIRE-1712345678-AB12", "transaction"],
  ["IWR-1712345678-AB12", "transaction"],
  ["INTL-1712345678-AB12", "transaction"],
  ["EXT-1712345678-AB12", "transaction"],
  ["INT-1712345678-AB12", "transaction"],
  ["TXN-1712345678-AB12", "transaction"],
  ["TRF-1712345678", "transaction"],
  ["SCH-1712345678-AB12", "transaction"],
  ["DEP-1712345678-AB12", "transaction"],
  ["WTH-1712345678-AB12", "transaction"],
  ["REC-1712345678", "transaction"],
  ["ADJ-202605-A3F7B2", "transaction"],
  ["REV-202605-A3F7B2", "transaction"],
  ["RCP-WIRE-1712345678-AB12", "transaction"],
  ["FRZ-202605-A3F7B2", "restriction"],
  ["BLK-202605-A3F7B2", "restriction"],
  ["CLS-202605-A3F7B2", "restriction"],
  ["TRB-202605-A3F7B2", "trust"],
];

for (const [ref, expected] of MINTED) {
  test(`${ref} routes to the ${expected} registry`, () => {
    assert.equal(referenceKind(ref), expected);
  });
}

test("an unrecognised prefix is not classified rather than misrouted", () => {
  // "unknown" means "search every registry", which is the safe answer.
  assert.equal(referenceKind("QQQ-1712345678"), "unknown");
  assert.equal(referenceKind(""), "unknown");
});

test("INTL- is not swallowed by the INT- prefix", () => {
  // Both are transactions, but the distinction matters if the sets ever split.
  assert.equal(referenceKind("INTL-1-A"), "transaction");
  assert.equal(referenceKind("INT-1-A"), "transaction");
});

// ── Candidate expansion ───────────────────────────────────────────────────────

test("a bare transfer reference also matches its booked legs", () => {
  const c = referenceCandidates("WIRE-1712345678-AB12");
  assert.ok(c.includes("WIRE-1712345678-AB12"));
  assert.ok(c.includes("WIRE-1712345678-AB12-OUT"));
  assert.ok(c.includes("WIRE-1712345678-AB12-IN"));
});

test("a leg reference is not double-suffixed", () => {
  const c = referenceCandidates("WIRE-1-A-OUT");
  assert.deepEqual(c, ["WIRE-1-A-OUT"]);
});

test("a printed receipt number resolves to the reference it came from", () => {
  const c = referenceCandidates("RCP-WIRE-1-A");
  assert.ok(c.includes("WIRE-1-A"), "RCP- prefix must be stripped");
  assert.ok(c.includes("WIRE-1-A-OUT"));
});

test("candidates are unique and empty input yields none", () => {
  const c = referenceCandidates("TXN-1");
  assert.equal(new Set(c).size, c.length);
  assert.deepEqual(referenceCandidates("   "), []);
});

// ── Document labelling ────────────────────────────────────────────────────────

test("document type follows the reference prefix before the transaction type", () => {
  assert.equal(transactionDocumentType("REV-1", "transfer-out"), "Transaction Reversal Notice");
  assert.equal(transactionDocumentType("ADJ-1", "adjustment-credit"), "Account Adjustment Receipt");
});

test("document type falls back to the transaction type", () => {
  assert.equal(transactionDocumentType("TXN-1", "transfer-out"), "Funds Transfer Receipt");
  assert.equal(transactionDocumentType("DEP-1", "deposit"), "Deposit Receipt");
  assert.equal(transactionDocumentType("WTH-1", "withdraw"), "Withdrawal Receipt");
  assert.equal(transactionDocumentType("TXN-1", "interest"), "Interest Credit Advice");
  assert.equal(transactionDocumentType("QQQ-1", "something-new"), "Transaction Record");
});

// ── Name masking discloses no more than it must ───────────────────────────────

test("masking keeps the first name and one initial", () => {
  assert.equal(maskName("Haruki  Tanaka"), "Haruki T.");
  assert.equal(maskName("Ada Lovelace Byron"), "Ada B.");
  assert.equal(maskName("Cher"), "Cher");
  assert.equal(maskName("   "), "");
});
