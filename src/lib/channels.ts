// src/lib/channels.ts
// Customer-facing labels for transaction booking metadata. Internal codes
// (channel "internal", legacy "admin" bookings, "system", etc.) must never
// surface on receipts, statements, emails, or the transaction list — every
// channel renders as a recognisable banking channel name.

const CHANNEL_LABELS: Record<string, string> = {
  online: "Online Banking",
  mobile: "Mobile Banking",
  atm: "ATM",
  wire: "Wire Transfer",
  scheduled: "Standing Order",
  international: "International Banking",
  branch: "Branch",
  // Bank-initiated postings (and legacy "admin"/"system" bookings) present as
  // head-office activity, the way a core banking system labels them.
  internal: "Head Office",
  system: "Head Office",
  admin: "Head Office",
};

export function channelLabel(channel?: string | null): string {
  if (!channel) return "Online Banking";
  return CHANNEL_LABELS[channel.trim().toLowerCase()] || "Online Banking";
}

// Default narrative for transactions posted by bank staff. Replaces the old
// "Admin <type>" wording on statements, receipts, and notification emails.
const BANK_POSTED_DESCRIPTIONS: Record<string, string> = {
  deposit: "Bank credit",
  withdraw: "Bank debit",
  "transfer-in": "Credit transfer received",
  "transfer-out": "Funds transfer",
  fee: "Service charge",
  interest: "Interest payment",
  "adjustment-credit": "Account adjustment (credit)",
  "adjustment-debit": "Account adjustment (debit)",
};

export function bankPostedDescription(type?: string | null): string {
  if (!type) return "Bank transaction";
  return BANK_POSTED_DESCRIPTIONS[type.trim().toLowerCase()] || "Bank transaction";
}

// Historical bookings stored narratives like "Admin deposit" / "Admin Withdrawal".
// Rewrite them at display time so records created before the rename also read
// professionally everywhere they appear.
export function displayDescription(
  description?: string | null,
  type?: string | null
): string | undefined {
  if (!description) return undefined;
  if (/^admin\b/i.test(description.trim())) return bankPostedDescription(type);
  return description;
}
