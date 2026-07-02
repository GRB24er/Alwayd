import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// ─── Brand Palette ──────────────────────────────────────────────────────────
const NAVY       = rgb(0.051, 0.141, 0.251);
const NAVY_DEEP  = rgb(0.031, 0.094, 0.188);
const GOLD       = rgb(0.788, 0.663, 0.384);
const GOLD_LIGHT = rgb(0.91, 0.84, 0.68);
const BLACK      = rgb(0, 0, 0);
const WHITE      = rgb(1, 1, 1);
const TEXT_DARK   = rgb(0.15, 0.15, 0.15);
const TEXT_BODY   = rgb(0.25, 0.25, 0.25);
const TEXT_MUTED  = rgb(0.50, 0.50, 0.50);
const RULE_LIGHT  = rgb(0.82, 0.82, 0.82);
const RULE_DOTS   = rgb(0.78, 0.78, 0.78);
const RED_NEG     = rgb(0.72, 0.15, 0.15);

// ─── Page Geometry ──────────────────────────────────────────────────────────
const PW = 595.28;       // A4 width
const PH = 841.89;       // A4 height
const ML = 50;            // margin left
const MR = 50;            // margin right
const CW = PW - ML - MR; // content width
const FOOTER_Y = 52;     // bottom reserved

// ─── Column Grid (transaction table — fixed positions, right-edge anchored) ─
const TX_DATE_X    = ML;
const TX_DATE_W    = 52;
const TX_DESC_X    = ML + 56;
const TX_DESC_W    = 190;
const TX_DEBIT_RE  = ML + 358;   // right edge of debit column
const TX_CREDIT_RE = ML + 448;   // right edge of credit column
const TX_BAL_RE    = PW - MR;    // right edge of balance column

export interface StatementTransaction {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
}

export interface StatementData {
  accountHolder: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
  };
  account: {
    name: string;
    number: string;
    type: string;
    currency: string;
  };
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  summary: {
    openingBalance: number;
    totalDebits: number;
    totalCredits: number;
    closingBalance: number;
  };
  transactions: StatementTransaction[];
  bankInfo: {
    branchName?: string;
    branchAddress?: string;
    transitNumber?: string;
    phone?: string;
    directLine?: string;
    website?: string;
    plan?: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtAbs = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, minimumFractionDigits: 2 }).format(Math.abs(n));
const fmtSigned = (n: number, ccy = "USD") => {
  const s = fmtAbs(n, ccy);
  return n < 0 ? `-${s}` : s;
};
const fmtDateShort = (d: string) => {
  const dt = new Date(d);
  const m = dt.toLocaleDateString("en-US", { month: "short" });
  const day = String(dt.getDate()).padStart(2, "0");
  return `${m} ${day}`;
};
const fmtDateLong = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function textRight(page: PDFPage, text: string, rightEdge: number, y: number, font: PDFFont, size: number, color = TEXT_BODY) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightEdge - w, y, size, font, color });
}

// Letter-spaced (tracked) wordmark, drawn from a right edge.
function trackedRight(page: PDFPage, text: string, rightEdge: number, y: number, font: PDFFont, size: number, tracking: number, color = NAVY) {
  const chars = text.split("");
  const totalW = chars.reduce((acc, c) => acc + font.widthOfTextAtSize(c, size) + tracking, 0) - tracking;
  let x = rightEdge - totalW;
  for (const c of chars) {
    page.drawText(c, { x, y, size, font, color });
    x += font.widthOfTextAtSize(c, size) + tracking;
  }
}

function drawDottedRule(page: PDFPage, y: number, x1 = ML, x2 = PW - MR) {
  let x = x1;
  while (x < x2) {
    const end = Math.min(x + 1.2, x2);
    page.drawLine({ start: { x, y }, end: { x: end, y }, thickness: 0.35, color: RULE_DOTS });
    x = end + 2.2;
  }
}

function drawSolidRule(page: PDFPage, y: number, thickness = 0.5, color = RULE_LIGHT) {
  page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness, color });
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  for (const p of [
    path.join(process.cwd(), "assets", "images", "logo-full.png"),
    path.resolve(__dirname, "..", "assets", "images", "logo-full.png"),
  ]) {
    try { return await fs.readFile(p); } catch { continue; }
  }
  return null;
}

function genHash(data: StatementData): string {
  return crypto.createHash("sha256").update(JSON.stringify({
    h: data.accountHolder.name, a: data.account.number,
    p: data.period.label, c: data.summary.closingBalance,
  })).digest("hex").slice(0, 16).toUpperCase();
}

interface Ctx {
  pdf: PDFDocument;
  f: PDFFont;     // regular
  b: PDFFont;     // bold
  logo: { w: number; h: number; img: PDFImage } | null;
  data: StatementData;
  hash: string;
  now: Date;
}

// ─── Logo Watermark ─────────────────────────────────────────────────────────
function drawWatermark(page: PDFPage, ctx: Ctx) {
  if (!ctx.logo) return;
  const wmW = 320;
  const wmH = wmW * (ctx.logo.h / ctx.logo.w);
  page.drawImage(ctx.logo.img, {
    x: PW / 2 - wmW / 2,
    y: PH / 2 - wmH / 2 - 30,
    width: wmW,
    height: wmH,
    opacity: 0.04,
  });
}

// ─── Page 1 Header ──────────────────────────────────────────────────────────
// Clean white masthead so the navy logo is fully visible (like a real bank).
function drawPage1Header(page: PDFPage, ctx: Ctx): number {
  const { f, b, logo, data } = ctx;

  // Top gold accent bar
  page.drawRectangle({ x: 0, y: PH - 4, width: PW, height: 4, color: GOLD });

  // Logo (navy) on white, top-left
  const logoTop = PH - 20;
  let logoBottom = logoTop;
  if (logo) {
    const lw = 168;
    const lh = lw * (logo.h / logo.w);
    logoBottom = logoTop - lh;
    page.drawImage(logo.img, { x: ML, y: logoBottom, width: lw, height: lh });
  } else {
    logoBottom = logoTop - 30;
    page.drawText("ALDWYCH EUROPEAN CAPITAL", { x: ML, y: logoTop - 20, size: 15, font: b, color: NAVY });
  }

  // Product wordmark (right), letter-spaced navy caps + gold underline
  const wordmark = "PRIVATE BANKING";
  const wmY = logoTop - 20;
  trackedRight(page, wordmark, PW - MR, wmY, b, 13, 2.2, NAVY);
  const wmW = wordmark.split("").reduce((a, c) => a + b.widthOfTextAtSize(c, 13) + 2.2, 0) - 2.2;
  page.drawRectangle({ x: PW - MR - wmW, y: wmY - 6, width: wmW, height: 1.6, color: GOLD });

  // Full-width gold divider under the masthead
  const dividerY = logoBottom - 12;
  page.drawRectangle({ x: ML, y: dividerY, width: CW, height: 1.4, color: GOLD });

  // ── Left column: branch address + customer address ──
  let ly = dividerY - 18;

  page.drawText("Your office address:", { x: ML, y: ly, size: 7.5, font: b, color: TEXT_DARK });
  ly -= 12;
  page.drawText(data.bankInfo.branchAddress || "Aldwych House, 71-91 Aldwych", { x: ML, y: ly, size: 8.5, font: f, color: TEXT_BODY });
  ly -= 11;
  page.drawText("London WC2B 4HN, United Kingdom", { x: ML, y: ly, size: 8.5, font: f, color: TEXT_BODY });

  // Customer mailing block (indented)
  ly -= 26;
  const cx = ML + 12;
  page.drawText(data.accountHolder.name.toUpperCase(), { x: cx, y: ly, size: 9.5, font: b, color: TEXT_DARK });
  if (data.accountHolder.addressLine1) {
    ly -= 13;
    page.drawText(data.accountHolder.addressLine1.toUpperCase(), { x: cx, y: ly, size: 9, font: f, color: TEXT_BODY });
  }
  if (data.accountHolder.addressLine2) {
    ly -= 13;
    page.drawText(data.accountHolder.addressLine2.toUpperCase(), { x: cx, y: ly, size: 9, font: f, color: TEXT_BODY });
  }
  if (data.accountHolder.addressLine3) {
    ly -= 13;
    page.drawText(data.accountHolder.addressLine3.toUpperCase(), { x: cx, y: ly, size: 9, font: f, color: TEXT_BODY });
  }

  // ── Right column: bank info block ──
  const rx = PW - MR - 172;
  let ry = dividerY - 18;

  const label = (t: string) => { page.drawText(t, { x: rx, y: ry, size: 7.5, font: b, color: TEXT_DARK }); ry -= 11; };
  const value = (t: string) => { page.drawText(t, { x: rx, y: ry, size: 8.5, font: f, color: TEXT_BODY }); ry -= 11; };

  label("Your Office");
  value(data.bankInfo.branchName || "PRIVATE BANKING OFFICE");
  if (data.bankInfo.transitNumber) value(`Account ref: ${data.bankInfo.transitNumber}`);
  ry -= 7;

  label("For questions about your");
  page.drawText("statement call", { x: rx, y: ry, size: 7.5, font: b, color: TEXT_DARK }); ry -= 11;
  value(data.bankInfo.phone || "+44 (0)20 7946 0000");
  ry -= 7;

  label("Online Banking");
  value(data.bankInfo.website || "www.aldwycheuropeancapital.com");
  ry -= 7;

  label("Your Plan");
  value(data.bankInfo.plan || "Private Banking Premier");

  return Math.min(ly, ry) - 12;
}

// ─── Continuation Header (pages 2+) ────────────────────────────────────────
function drawContinuationHeader(page: PDFPage, ctx: Ctx): number {
  const { f, b, logo, data } = ctx;

  // Slim top bar
  page.drawRectangle({ x: 0, y: PH - 4, width: PW, height: 4, color: GOLD });

  // Slim navy band
  const bandH = 30;
  const bandY = PH - 4 - bandH;
  page.drawRectangle({ x: 0, y: bandY, width: PW, height: bandH, color: NAVY_DEEP });

  // Left: statement title (single line, vertically centred)
  page.drawText("Your Private Banking Statement", { x: ML, y: bandY + 11, size: 9.5, font: b, color: WHITE });

  // Right: holder + period stacked (two lines, clear of the left title)
  textRight(page, data.accountHolder.name, PW - MR, bandY + 17, f, 8, GOLD_LIGHT);
  textRight(page, `Period ending ${fmtDateLong(data.period.endDate)}`, PW - MR, bandY + 6, f, 7.5, GOLD_LIGHT);

  // Thin gold accent under band
  page.drawRectangle({ x: 0, y: bandY - 1.5, width: PW, height: 1.5, color: GOLD });

  return bandY - 22;
}

// ─── Statement Title + Summary ──────────────────────────────────────────────
function drawTitleAndSummary(page: PDFPage, ctx: Ctx, startY: number): number {
  const { f, b, data } = ctx;
  const ccy = data.account.currency;
  let y = startY;

  // Title
  page.drawText(`Your ${data.account.type} Statement`, { x: ML, y, size: 17, font: b, color: BLACK });
  y -= 18;
  page.drawText(`For the period ending ${fmtDateLong(data.period.endDate)}`, { x: ML, y, size: 10.5, font: f, color: TEXT_BODY });
  y -= 30;

  // ── Summary of your account ──
  page.drawText("Summary of your account", { x: ML, y, size: 14, font: b, color: BLACK });
  y -= 28;

  // Summary table — 5 fixed columns with precise positions
  //   Col 0: Account label    (left-aligned, ML)
  //   Col 1: Opening balance  (right-aligned at RE1)
  //   Col 2: Total deducted   (right-aligned at RE2)
  //   Col 3: Total added      (right-aligned at RE3)
  //   Col 4: Closing balance  (right-aligned at RE4)
  const RE1 = ML + 218;
  const RE2 = ML + 322;
  const RE3 = ML + 414;
  const RE4 = PW - MR;

  // Column headers — clean two-line grid (no operators here, no overlap)
  const hdrSize = 7.5;
  const hdr1Y = y + 10;   // top line
  const hdr2Y = y;        // bottom line

  page.drawText("Account", { x: ML, y: hdr2Y, size: hdrSize, font: b, color: TEXT_DARK });

  textRight(page, "Opening", RE1, hdr1Y, f, hdrSize, TEXT_DARK);
  textRight(page, "balance ($)", RE1, hdr2Y, f, hdrSize, TEXT_DARK);

  textRight(page, "Total amounts", RE2, hdr1Y, f, hdrSize, TEXT_DARK);
  textRight(page, "deducted ($)", RE2, hdr2Y, f, hdrSize, TEXT_DARK);

  textRight(page, "Total amounts", RE3, hdr1Y, f, hdrSize, TEXT_DARK);
  textRight(page, "added ($)", RE3, hdr2Y, f, hdrSize, TEXT_DARK);

  textRight(page, "Closing", RE4, hdr1Y, f, hdrSize, TEXT_DARK);
  textRight(page, "balance ($)", RE4, hdr2Y, f, hdrSize, TEXT_DARK);

  y -= 8;

  // Bold rule under summary header
  page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 1.2, color: BLACK });
  y -= 18;

  // Account data row
  page.drawText(data.account.name, { x: ML, y, size: 8.5, font: f, color: TEXT_BODY });
  page.drawText(`# ${data.account.number}`, { x: ML, y: y - 12, size: 8.5, font: f, color: TEXT_BODY });

  const valY = y - 4;
  const openStr = fmtSigned(data.summary.openingBalance, ccy);
  const dedStr  = fmtAbs(data.summary.totalDebits, ccy);
  const addStr  = fmtAbs(data.summary.totalCredits, ccy);
  const closeStr = fmtSigned(data.summary.closingBalance, ccy);

  textRight(page, openStr, RE1, valY, f, 9, TEXT_BODY);
  textRight(page, dedStr, RE2, valY, f, 9, TEXT_BODY);
  textRight(page, addStr, RE3, valY, f, 9, TEXT_BODY);
  textRight(page, closeStr, RE4, valY, b, 9, data.summary.closingBalance < 0 ? RED_NEG : TEXT_DARK);

  // Operators sit in the clear gaps between the numbers, on the data baseline
  const gapMid = (rightEdgePrev: number, rightEdgeNext: number, nextStr: string) => {
    const nextStart = rightEdgeNext - f.widthOfTextAtSize(nextStr, 9);
    return (rightEdgePrev + nextStart) / 2;
  };
  page.drawText("-", { x: gapMid(RE1, RE2, dedStr) - 2, y: valY, size: 11, font: b, color: TEXT_MUTED });
  page.drawText("+", { x: gapMid(RE2, RE3, addStr) - 3, y: valY, size: 11, font: b, color: TEXT_MUTED });
  page.drawText("=", { x: gapMid(RE3, RE4, closeStr) - 3, y: valY, size: 11, font: b, color: TEXT_MUTED });

  y -= 32;
  return y;
}

// ─── Transaction Table Header ───────────────────────────────────────────────
function drawTxTableHeader(page: PDFPage, ctx: Ctx, startY: number, continued: boolean): number {
  const { f, b } = ctx;
  let y = startY;

  const heading = continued
    ? "Here's what happened in your account (continued)"
    : "Here's what happened in your account";
  page.drawText(heading, { x: ML, y, size: 14, font: b, color: BLACK });
  y -= 26;

  // Two-line column headers
  const hs = 7.5;
  const h1 = y + 10;
  const h2 = y;

  page.drawText("Date", { x: TX_DATE_X, y: h2 + 2, size: hs, font: b, color: TEXT_DARK });
  page.drawText("Description", { x: TX_DESC_X, y: h2 + 2, size: hs, font: b, color: TEXT_DARK });

  textRight(page, "Amounts deducted", TX_DEBIT_RE, h1, b, hs, TEXT_DARK);
  textRight(page, "from your account ($)", TX_DEBIT_RE, h2, b, hs, TEXT_DARK);

  textRight(page, "Amounts added", TX_CREDIT_RE, h1, b, hs, TEXT_DARK);
  textRight(page, "to your account ($)", TX_CREDIT_RE, h2, b, hs, TEXT_DARK);

  textRight(page, "Balance ($)", TX_BAL_RE, h2 + 2, b, hs, TEXT_DARK);

  y -= 8;
  page.drawLine({ start: { x: ML, y }, end: { x: PW - MR, y }, thickness: 1.5, color: BLACK });
  y -= 8;

  return y;
}

// ─── Account Sub-header ─────────────────────────────────────────────────────
function drawAccountSubheader(page: PDFPage, ctx: Ctx, y: number, continued: boolean): number {
  const { f, b, data } = ctx;

  const accLine = `${data.account.name} # ${data.account.number}`;
  page.drawText(accLine, { x: TX_DESC_X, y, size: 9, font: b, color: TEXT_DARK });

  if (continued) {
    textRight(page, "(continued)", TX_BAL_RE, y, f, 9, TEXT_MUTED);
  }
  y -= 16;

  if (!continued) {
    page.drawText("Owner:", { x: ML, y, size: 8, font: f, color: TEXT_MUTED });
    y -= 12;
    page.drawText(data.accountHolder.name.toUpperCase(), { x: ML, y, size: 9, font: b, color: TEXT_DARK });
    y -= 20;
  }

  return y;
}

// ─── Single Transaction Row ─────────────────────────────────────────────────
function drawTxRow(page: PDFPage, ctx: Ctx, tx: StatementTransaction, y: number, kind: "normal" | "opening" | "closing"): number {
  const { f, b, data } = ctx;
  const ccy = data.account.currency;
  const sz = 8.5;
  const useFont = kind !== "normal" ? b : f;

  // Date
  page.drawText(fmtDateShort(tx.date), { x: TX_DATE_X, y, size: sz, font: useFont, color: TEXT_DARK });

  // Description (wrap within TX_DESC_W)
  const maxDescW = kind === "closing" ? TX_DESC_W + 40 : TX_DESC_W;
  const descLines = wrapText(tx.description, useFont, sz, maxDescW);
  for (let i = 0; i < descLines.length; i++) {
    page.drawText(descLines[i], { x: TX_DESC_X, y: y - i * 11, size: sz, font: useFont, color: TEXT_BODY });
  }

  // Debit
  if (tx.debit && tx.debit > 0) {
    textRight(page, fmtAbs(tx.debit, ccy), TX_DEBIT_RE, y, kind === "closing" ? b : f, sz, TEXT_BODY);
  }

  // Credit
  if (tx.credit && tx.credit > 0) {
    textRight(page, fmtAbs(tx.credit, ccy), TX_CREDIT_RE, y, kind === "closing" ? b : f, sz, TEXT_BODY);
  }

  // Balance (not shown on closing totals row)
  if (kind !== "closing") {
    const balColor = tx.balance < 0 ? RED_NEG : TEXT_BODY;
    textRight(page, fmtSigned(tx.balance, ccy), TX_BAL_RE, y, useFont, sz, balColor);
  }

  const rowH = Math.max(descLines.length * 11, 11) + 7;
  return y - rowH;
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function drawFooter(page: PDFPage, ctx: Ctx, pageNum: number, totalPages: number, showContinued: boolean) {
  const { f, b, logo } = ctx;

  if (showContinued) {
    textRight(page, "continued", PW - MR, FOOTER_Y + 20, f, 8.5, TEXT_MUTED);
  }

  // Page label
  page.drawText(`Page ${pageNum} of ${totalPages}`, { x: ML, y: 26, size: 8, font: f, color: TEXT_MUTED });

  // Footer branded bar (right-aligned), white text (visible on navy)
  const barW = 232;
  const barH = 28;
  const barX = PW - barW;
  const barY = 12;

  // Gold accent strip above bar
  page.drawRectangle({ x: barX, y: barY + barH, width: barW, height: 2.5, color: GOLD });

  // Navy bar
  page.drawRectangle({ x: barX, y: barY, width: barW, height: barH, color: NAVY_DEEP });

  // Bank name (white) + tagline (gold) inside the bar
  textRight(page, "Aldwych European Capital", PW - MR - 12, barY + 15, b, 9, WHITE);
  textRight(page, "Private Banking · Est. 1897", PW - MR - 12, barY + 5, f, 6.5, GOLD_LIGHT);

  // Small gold star accent on the left of the bar
  page.drawText("*", { x: barX + 12, y: barY + 8, size: 14, font: b, color: GOLD });

  // Bottom gold line
  page.drawRectangle({ x: 0, y: 0, width: PW, height: 3, color: GOLD });
}

// ─── Disclaimer ─────────────────────────────────────────────────────────────
function drawDisclaimer(page: PDFPage, ctx: Ctx, startY: number): number {
  const { f, b } = ctx;
  let y = startY;

  const disclaimer = "Please report any errors, omissions or irregularities in writing within 30 days of the statement date after which this statement shall be deemed accurate except for any amount credited to your account in error.";
  const lines = wrapText(disclaimer, f, 7.5, CW);
  for (const ln of lines) {
    page.drawText(ln, { x: ML, y, size: 7.5, font: f, color: TEXT_MUTED });
    y -= 10;
  }
  y -= 8;

  page.drawText("Registration numbers", { x: ML, y, size: 8, font: b, color: TEXT_DARK });
  y -= 12;
  page.drawText("FCA Registration — 09876543     PRA Registration — AEC/2024/0091", { x: ML, y, size: 8, font: f, color: TEXT_BODY });
  y -= 20;

  // Document hash
  page.drawText(`Document integrity: ${ctx.hash}`, { x: ML, y, size: 7, font: f, color: TEXT_MUTED });
  y -= 10;
  page.drawText(`Generated: ${ctx.now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} at ${ctx.now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC`, { x: ML, y, size: 7, font: f, color: TEXT_MUTED });
  y -= 16;

  return y;
}

// ─── Main Generator ─────────────────────────────────────────────────────────
export async function generateStatementPDF(data: StatementData): Promise<Uint8Array> {
  const now = new Date();
  const hash = genHash(data);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Account Statement — ${data.accountHolder.name} — ${data.period.label}`);
  pdf.setAuthor("Aldwych European Capital — Private Banking");
  pdf.setSubject(`Statement for ${data.account.name} ${data.account.number}`);
  pdf.setProducer("Aldwych European Capital");
  pdf.setCreationDate(now);

  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await loadLogoBytes();
  let logo: Ctx["logo"] = null;
  if (logoBytes) {
    try {
      const img = await pdf.embedPng(logoBytes);
      logo = { w: img.width, h: img.height, img };
    } catch {
      try {
        const img = await pdf.embedJpg(logoBytes);
        logo = { w: img.width, h: img.height, img };
      } catch { logo = null; }
    }
  }

  const ctx: Ctx = { pdf, f, b, logo, data, hash, now };

  // ── Page management ──
  const allPages: PDFPage[] = [];
  let page = pdf.addPage([PW, PH]);
  allPages.push(page);

  // Watermark on every page will be applied at the end
  const needsNewPage = (y: number, minSpace = 80) => y < FOOTER_Y + minSpace;

  const addPage = (isContinuation: boolean): [PDFPage, number] => {
    const p = pdf.addPage([PW, PH]);
    allPages.push(p);
    const startY = isContinuation ? drawContinuationHeader(p, ctx) : PH - 30;
    return [p, startY];
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1: Header, Summary, Transaction Table
  // ══════════════════════════════════════════════════════════════════════════
  let y = drawPage1Header(page, ctx);
  y = drawTitleAndSummary(page, ctx, y);

  // Transaction table
  y -= 6;
  y = drawTxTableHeader(page, ctx, y, false);
  y = drawAccountSubheader(page, ctx, y, false);

  // Opening balance row
  const openingTx: StatementTransaction = {
    date: data.period.startDate,
    description: "Opening balance",
    balance: data.summary.openingBalance,
  };
  y = drawTxRow(page, ctx, openingTx, y, "opening");
  drawDottedRule(page, y + 5);
  y -= 2;

  // Transaction rows
  for (const tx of data.transactions) {
    if (needsNewPage(y)) {
      [page, y] = addPage(true);
      y = drawTxTableHeader(page, ctx, y, true);
      y = drawAccountSubheader(page, ctx, y, true);
    }

    y = drawTxRow(page, ctx, tx, y, "normal");
    drawDottedRule(page, y + 5);
    y -= 2;
  }

  // Closing totals
  if (needsNewPage(y, 60)) {
    [page, y] = addPage(true);
    y = drawTxTableHeader(page, ctx, y, true);
    y = drawAccountSubheader(page, ctx, y, true);
  }

  // Solid rule before closing
  drawSolidRule(page, y + 4, 0.8, BLACK);
  y -= 2;

  const closingTx: StatementTransaction = {
    date: data.period.endDate,
    description: "Closing totals",
    debit: data.summary.totalDebits,
    credit: data.summary.totalCredits,
    balance: data.summary.closingBalance,
  };
  y = drawTxRow(page, ctx, closingTx, y, "closing");
  y -= 14;

  // Disclaimer
  if (needsNewPage(y, 100)) {
    [page, y] = addPage(true);
  }
  y = drawDisclaimer(page, ctx, y);

  // ── Apply watermark + footer to all pages ──
  const total = allPages.length;
  for (let i = 0; i < total; i++) {
    drawWatermark(allPages[i], ctx);
    drawFooter(allPages[i], ctx, i + 1, total, i < total - 1);
  }

  return await pdf.save();
}
