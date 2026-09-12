// src/lib/statementEmail.ts
// Builds the emailed account statement, shared by the admin's queued send
// (/api/statements/send) and the admin's manual send (/api/statements/send-manual).
//
// The classification and balance maths live here because the routes had them
// wrong: they filtered on transaction types 'credit' and 'debit', which are not
// members of TxType, so every statement reported zero deposits, zero
// withdrawals, and labelled every line a withdrawal. Opening balance was the
// literal 5000.

import Transaction from "@/models/Transaction";
import { displayDescription } from "@/lib/channels";
import { formatMoney, normalizeCurrency } from "@/lib/currency";
import { getFxRates, convertFromBase } from "@/lib/fx";

export type StatementAccountType = "checking" | "savings" | "investment";

export const BALANCE_FIELD: Record<StatementAccountType, string> = {
  checking: "checkingBalance",
  savings: "savingsBalance",
  investment: "investmentBalance",
};

// The real TxType union — see src/models/Transaction.ts. Anything that adds to
// the balance is a credit; anything that removes from it is a debit.
const CREDIT_TYPES = new Set(["deposit", "transfer-in", "interest", "adjustment-credit"]);
const DEBIT_TYPES = new Set(["withdraw", "transfer-out", "fee", "adjustment-debit"]);

export function isCreditType(type: string): boolean {
  return CREDIT_TYPES.has(type);
}

export function isDebitType(type: string): boolean {
  return DEBIT_TYPES.has(type);
}

// Signed effect on the balance. An unrecognised type contributes nothing rather
// than silently counting as a withdrawal, which is what the old code did.
export function signedAmount(tx: { type?: unknown; amount?: unknown }): number {
  const amount = Math.abs(Number(tx.amount || 0));
  const type = String(tx.type ?? "");
  if (isCreditType(type)) return amount;
  if (isDebitType(type)) return -amount;
  return 0;
}

// Only settled money appears on a statement and counts toward a balance.
export function isSettled(tx: { status?: unknown; posted?: unknown }): boolean {
  return tx.posted === true || tx.status === "completed" || tx.status === "approved";
}

export interface StatementInput {
  user: { _id: unknown; name?: string; email: string; displayCurrency?: string; [k: string]: unknown };
  accountType: StatementAccountType;
  startDate: Date;
  endDate: Date;
}

export interface StatementSummary {
  statementNumber: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  deposits: number;
  withdrawals: number;
  transactionCount: number;
}

export interface BuiltStatement extends StatementSummary {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

const longDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

const shortDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });

export function statementNumberFor(now: Date = new Date()): string {
  return `AEC-${now.getFullYear()}-${String(now.getTime()).slice(-8)}`;
}

export async function buildStatement(input: StatementInput): Promise<BuiltStatement> {
  const { user, accountType, startDate, endDate } = input;

  // Everything on this account, so the opening balance can be derived rather
  // than invented: work backwards from the balance we hold today.
  const all = await Transaction.find({ userId: user._id, accountType })
    .sort({ date: 1 })
    .lean();

  const settled = (all as Array<Record<string, any>>).filter(isSettled);
  const inPeriod = settled.filter((t) => {
    const d = new Date(t.date || t.createdAt);
    return d >= startDate && d <= endDate;
  });
  const afterPeriod = settled.filter((t) => new Date(t.date || t.createdAt) > endDate);

  const currentBalance = Number((user as Record<string, any>)[BALANCE_FIELD[accountType]] || 0);
  const netAfter = afterPeriod.reduce((s, t) => s + signedAmount(t), 0);
  const netInPeriod = inPeriod.reduce((s, t) => s + signedAmount(t), 0);

  const closingBase = currentBalance - netAfter;
  const openingBase = closingBase - netInPeriod;
  const depositsBase = inPeriod.filter((t) => isCreditType(t.type)).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const withdrawalsBase = inPeriod.filter((t) => isDebitType(t.type)).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  // The statement is denominated in the customer's display currency, converted
  // from the base unit at the same rates the dashboard uses — otherwise a
  // customer banking in yen receives a statement in dollars.
  const currency = normalizeCurrency(user.displayCurrency);
  const { rates } = await getFxRates();
  const to = (n: number) => convertFromBase(n, currency, rates);
  const fmt = (n: number) => formatMoney(to(n), currency);

  const opening = to(openingBase);
  const closing = to(closingBase);
  const deposits = to(depositsBase);
  const withdrawals = to(withdrawalsBase);
  const statementNumber = statementNumberFor();

  let running = openingBase;
  const rows = inPeriod
    .map((t) => {
      running += signedAmount(t);
      const credit = isCreditType(t.type);
      const sign = credit ? "+" : isDebitType(t.type) ? "-" : "";
      return `
        <tr>
          <td class="date-col">${esc(shortDate(t.date || t.createdAt))}</td>
          <td class="desc-col">${esc(displayDescription(t.description, t.type) || "Transaction")}</td>
          <td class="type-col"><span class="type-badge type-${credit ? "credit" : "debit"}">${esc(
            String(t.type).replace(/-/g, " ")
          )}</span></td>
          <td class="amount-col amount-${credit ? "credit" : "debit"}">${sign}${esc(
            fmt(Math.abs(Number(t.amount || 0)))
          )}</td>
          <td class="balance-col">${esc(fmt(running))}</td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1e293b; background: #f8f9fa; padding: 20px; }
  .statement-container { max-width: 850px; margin: 0 auto; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
  .letterhead { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; padding: 40px; }
  .bank-info { font-size: 12px; line-height: 1.8; opacity: .95; }
  .bank-info strong { display: block; font-size: 16px; margin-bottom: 8px; letter-spacing: 1px; }
  .statement-header { padding: 40px; border-bottom: 3px solid #e5e7eb; }
  .statement-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .statement-subtitle { color: #64748b; font-size: 14px; }
  .statement-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
  .meta-group { background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; }
  .meta-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
  .meta-value { font-size: 15px; font-weight: 600; }
  .account-summary { padding: 40px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
  .summary-title, .transactions-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #cbd5e1; }
  .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .summary-item { background: #fff; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb; }
  .summary-item-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
  .summary-item-value { font-size: 24px; font-weight: 700; }
  .summary-item-value.credit { color: #10b981; }
  .summary-item-value.debit { color: #ef4444; }
  .transactions-section { padding: 40px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #f1f5f9; padding: 14px 12px; text-align: left; font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  .date-col { width: 110px; } .type-col { width: 130px; }
  .amount-col, .balance-col { width: 130px; text-align: right; font-weight: 600; }
  .amount-credit { color: #10b981; } .amount-debit { color: #ef4444; }
  .type-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .type-credit { background: #d1fae5; color: #065f46; } .type-debit { background: #fee2e2; color: #991b1b; }
  .statement-footer { background: #1e293b; color: #fff; padding: 40px; }
  .footer-important { background: rgba(255,255,255,.1); padding: 20px; border-radius: 8px; margin-bottom: 30px; }
  .footer-important-title { font-weight: 700; margin-bottom: 10px; color: #fbbf24; }
  .footer-important-text { font-size: 13px; line-height: 1.7; opacity: .9; }
  .footer-legal { font-size: 11px; opacity: .7; line-height: 1.8; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.1); text-align: center; }
  .no-transactions { text-align: center; padding: 60px 20px; color: #64748b; }
</style>
</head>
<body>
  <div class="statement-container">
    <div class="letterhead">
      <div class="bank-info">
        <strong>ALDWYCH EUROPEAN CAPITAL</strong>
        www.aldwycheuropeancapital.com | support@aldwycheuropeancapital.com
      </div>
    </div>

    <div class="statement-header">
      <div class="statement-title">ACCOUNT STATEMENT</div>
      <div class="statement-subtitle">Confidential — for the account holder named below</div>
      <div class="statement-meta">
        <div class="meta-group"><div class="meta-label">Account Holder</div><div class="meta-value">${esc(user.name || user.email)}</div></div>
        <div class="meta-group"><div class="meta-label">Statement Number</div><div class="meta-value">${esc(statementNumber)}</div></div>
        <div class="meta-group"><div class="meta-label">Account</div><div class="meta-value">${esc(
          accountType.charAt(0).toUpperCase() + accountType.slice(1)
        )} Account</div></div>
        <div class="meta-group"><div class="meta-label">Statement Period</div><div class="meta-value">${esc(
          longDate(startDate)
        )} – ${esc(longDate(endDate))}</div></div>
        <div class="meta-group"><div class="meta-label">Statement Date</div><div class="meta-value">${esc(
          longDate(new Date())
        )}</div></div>
        <div class="meta-group"><div class="meta-label">Currency</div><div class="meta-value">${esc(currency)}</div></div>
      </div>
    </div>

    <div class="account-summary">
      <div class="summary-title">ACCOUNT SUMMARY</div>
      <div class="summary-grid">
        <div class="summary-item"><div class="summary-item-label">Opening Balance</div><div class="summary-item-value">${esc(
          formatMoney(opening, currency)
        )}</div></div>
        <div class="summary-item"><div class="summary-item-label">Closing Balance</div><div class="summary-item-value">${esc(
          formatMoney(closing, currency)
        )}</div></div>
        <div class="summary-item"><div class="summary-item-label">Total Credits</div><div class="summary-item-value credit">+${esc(
          formatMoney(deposits, currency)
        )}</div></div>
        <div class="summary-item"><div class="summary-item-label">Total Debits</div><div class="summary-item-value debit">-${esc(
          formatMoney(withdrawals, currency)
        )}</div></div>
      </div>
    </div>

    <div class="transactions-section">
      <div class="transactions-title">TRANSACTION HISTORY (${inPeriod.length})</div>
      ${
        inPeriod.length > 0
          ? `<table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<div class="no-transactions"><p style="font-weight:600;color:#1e293b;margin-bottom:8px;">No transactions in this period</p><p>There was no settled activity on this account between the dates shown.</p></div>`
      }
    </div>

    <div class="statement-footer">
      <div class="footer-important">
        <div class="footer-important-title">IMPORTANT NOTICE</div>
        <div class="footer-important-text">
          Please review this statement carefully. If you notice any discrepancy or a transaction you
          do not recognise, contact us at support@aldwycheuropeancapital.com within 60 days of the
          statement date.
        </div>
      </div>
      <div class="footer-legal">
        This statement is confidential and intended solely for the account holder named above.<br>
        © ${new Date().getFullYear()} Aldwych European Capital. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;

  const subject = `Aldwych European Capital — Account Statement ${statementNumber}`;
  const text = [
    `Account statement ${statementNumber}`,
    `${accountType.charAt(0).toUpperCase() + accountType.slice(1)} account`,
    `Period: ${longDate(startDate)} – ${longDate(endDate)}`,
    ``,
    `Opening balance: ${formatMoney(opening, currency)}`,
    `Total credits:   +${formatMoney(deposits, currency)}`,
    `Total debits:    -${formatMoney(withdrawals, currency)}`,
    `Closing balance: ${formatMoney(closing, currency)}`,
    ``,
    `${inPeriod.length} transaction(s) in this period. Open the HTML version of this email for the full list.`,
  ].join("\n");

  return {
    statementNumber,
    currency,
    openingBalance: opening,
    closingBalance: closing,
    deposits,
    withdrawals,
    transactionCount: inPeriod.length,
    subject,
    text,
    html,
  };
}
