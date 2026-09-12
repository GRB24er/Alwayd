// src/lib/verificationReferences.ts
// Pure reference-parsing helpers for public document verification. Kept free of
// model/database imports so they can be unit tested on their own.

// Which registry a reference most likely belongs to, from its prefix alone.
// This only decides the order we search in — a reference whose prefix we do not
// recognise is still looked up in every registry before we call a document
// fake. That matters because references are minted in a dozen places with
// prefixes the old prefix-gated lookup never knew about (TRF-, SCH-, INTL-,
// DEP-, WTH-, REC-…), and a genuine receipt reported as "not in our registry"
// is worse than a slightly slower lookup.
export type ReferenceKind = "restriction" | "trust" | "transaction" | "loan" | "unknown";

export function referenceKind(ref: string): ReferenceKind {
  const r = String(ref || "").trim();
  if (/^(FRZ|BLK|CLS)-/i.test(r)) return "restriction";
  if (/^TRB-/i.test(r)) return "trust";
  if (/^(ADJ|REV|WIRE|IWR|INTL|EXT|INT|TXN|TRF|SCH|DEP|WTH|REC|RCP)-/i.test(r)) return "transaction";
  if (/^(LN|LOAN|AEC)-/i.test(r)) return "loan";
  return "unknown";
}

// Every stored `reference` a scanned code could legitimately mean.
// A receipt prints RCP-<ref> next to <ref>, and a two-leg transfer books the
// debit as <ref>-OUT and the credit as <ref>-IN; scanning any of them must
// resolve the same document.
export function referenceCandidates(ref: string): string[] {
  const base = String(ref || "").trim();
  if (!base) return [];
  const roots = Array.from(new Set([base, base.replace(/^RCP-/i, "")]));
  const out: string[] = [];
  for (const root of roots) {
    out.push(root);
    if (!/-(OUT|IN)$/i.test(root)) out.push(`${root}-OUT`, `${root}-IN`);
  }
  return Array.from(new Set(out));
}

// Human label for a transaction-backed document.
export function transactionDocumentType(ref: string, type: string): string {
  if (/^REV-/i.test(ref)) return "Transaction Reversal Notice";
  if (/^ADJ-/i.test(ref) || type === "adjustment-credit" || type === "adjustment-debit") {
    return "Account Adjustment Receipt";
  }
  if (type === "transfer-in" || type === "transfer-out") return "Funds Transfer Receipt";
  if (type === "deposit") return "Deposit Receipt";
  if (type === "withdraw") return "Withdrawal Receipt";
  if (type === "fee") return "Fee Notice";
  if (type === "interest") return "Interest Credit Advice";
  return "Transaction Record";
}

// First name plus last initial — enough to authenticate a document against the
// name printed on it without disclosing the holder to whoever scanned the code.
export function maskName(fullName: string): string {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
