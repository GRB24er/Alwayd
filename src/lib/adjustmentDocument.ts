// Generates the official Account Adjustment receipt OR Transaction Reversal
// notice PDF. Same brand chrome as the restriction notice (logo, watermark,
// gold top band, FCA/PRA footer, QR-verified reference) but with content
// tailored to the document type.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";

const NAVY = rgb(0.0509, 0.1411, 0.2509);
const NAVY_DEEP = rgb(0.031, 0.094, 0.188);
const GOLD = rgb(0.7882, 0.6627, 0.3843);
const GOLD_DARK = rgb(0.6588, 0.5764, 0.3725);
const TEXT = rgb(0.2784, 0.3372, 0.4156);
const MUTED = rgb(0.5803, 0.6392, 0.7215);
const SOFT_BORDER = rgb(0.886, 0.91, 0.941);
const GREEN = rgb(0.063, 0.725, 0.506);
const RED = rgb(0.722, 0.196, 0.196);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const FOOTER_RESERVED = 110;

export type AdjustmentDocumentKind = "adjustment_credit" | "adjustment_debit" | "reversal";

export interface AdjustmentDocumentData {
  kind: AdjustmentDocumentKind;
  reference: string;          // e.g. ADJ-202605-A3F7B2 / REV-202605-...
  amount: number;             // positive dollar amount
  currency: string;           // ISO 4217
  accountType: "checking" | "savings" | "investment";
  balanceBefore: number;
  balanceAfter: number;
  reasonCategory: string;     // display label
  reasonNote: string;
  legalBasis?: string;
  issuedAt: Date;
  // Officer who authorised the action
  issuedByName: string;
  issuedByTitle: string;

  // Reversal-specific
  reversedReference?: string;     // original transaction reference
  reversedAt?: Date;
  reversedDescription?: string;
  reversedOriginalDate?: Date;

  customer: {
    name: string;
    email: string;
    accountNumber?: string;
  };

  // Public verification URL for the QR code
  verificationUrl: string;
}

const DOC_HEADLINE: Record<AdjustmentDocumentKind, string> = {
  adjustment_credit: "ACCOUNT ADJUSTMENT — CREDIT",
  adjustment_debit: "ACCOUNT ADJUSTMENT — DEBIT",
  reversal: "TRANSACTION REVERSAL NOTICE",
};

const DOC_BADGE: Record<AdjustmentDocumentKind, string> = {
  adjustment_credit: "CREDIT POSTED",
  adjustment_debit: "DEBIT POSTED",
  reversal: "REVERSAL POSTED",
};

const DOC_INTRO: Record<AdjustmentDocumentKind, string> = {
  adjustment_credit:
    "This notice confirms that the account identified below has been credited by Aldwych European Capital under the authority of our Operations Office. The adjustment has been posted to the ledger and the new balance is in effect immediately.",
  adjustment_debit:
    "This notice confirms that a debit adjustment has been posted to the account identified below by Aldwych European Capital under the authority of our Operations Office. The amount has been deducted from the account balance and the new balance is in effect immediately.",
  reversal:
    "This notice confirms the reversal of a previously posted transaction. A contra-entry equal and opposite to the original has been written to the ledger; the original transaction record is preserved unchanged for audit. The reversal is effective immediately.",
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtDateFull = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDateTime = (d: Date) =>
  `${fmtDate(d)} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
const fmtMoney = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD", minimumFractionDigits: 2 }).format(n);

function maskAccountNumber(n?: string): string {
  if (!n) return "—";
  if (n.length <= 4) return n;
  return `••••${n.slice(-4)}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\n+/);
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > maxWidth) {
        if (line) out.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    out.push("");
  }
  if (out[out.length - 1] === "") out.pop();
  return out;
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), "public", "images", "Logo.png");
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  cursorY: number;
  logo: { width: number; height: number; embed: any } | null;
  data: AdjustmentDocumentData;
}

function drawTopBand(page: PDFPage) {
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GOLD });
}

function drawWatermark(page: PDFPage, font: PDFFont, text: string) {
  const size = 76;
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: PAGE_W / 2 - w / 2 + 40,
    y: PAGE_H / 2 + 40,
    size,
    font,
    color: rgb(0.95, 0.91, 0.81),
    rotate: degrees(-30),
    opacity: 0.18,
  });
}

function drawHeader(ctx: Ctx) {
  const { page, font, bold, logo, data } = ctx;
  drawTopBand(page);

  if (logo) {
    const w = 220;
    const h = w * (logo.height / logo.width);
    page.drawImage(logo.embed, { x: PAGE_W / 2 - w / 2, y: PAGE_H / 2 + 200, width: w, height: h, opacity: 0.07 });
    const sw = 130;
    const sh = sw * (logo.height / logo.width);
    page.drawImage(logo.embed, { x: MARGIN, y: PAGE_H - sh - 24, width: sw, height: sh });
  } else {
    page.drawText("ALDWYCH EUROPEAN CAPITAL", { x: MARGIN, y: PAGE_H - 38, size: 14, font: bold, color: NAVY });
    page.drawText("European Private Banking · Est. 1897", {
      x: MARGIN, y: PAGE_H - 54, size: 9, font, color: TEXT,
    });
  }

  const isCredit = data.kind === "adjustment_credit";
  const headlineColor = isCredit ? GREEN : RED;
  const docTitle = DOC_HEADLINE[data.kind];
  const w = bold.widthOfTextAtSize(docTitle, 11);
  page.drawText(docTitle, { x: PAGE_W - MARGIN - w, y: PAGE_H - 36, size: 11, font: bold, color: headlineColor });

  const refLine = `Reference: ${data.reference}`;
  const rW = font.widthOfTextAtSize(refLine, 9);
  page.drawText(refLine, { x: PAGE_W - MARGIN - rW, y: PAGE_H - 52, size: 9, font, color: TEXT });

  const dateLine = `Issued: ${fmtDate(data.issuedAt)}`;
  const dW = font.widthOfTextAtSize(dateLine, 9);
  page.drawText(dateLine, { x: PAGE_W - MARGIN - dW, y: PAGE_H - 66, size: 9, font, color: TEXT });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_H - 90 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - 90 },
    thickness: 0.5,
    color: SOFT_BORDER,
  });
}

function drawHeadline(ctx: Ctx) {
  const { page, bold } = ctx;
  const headline = DOC_HEADLINE[ctx.data.kind];
  const size = 22;
  const w = bold.widthOfTextAtSize(headline, size);
  page.drawText(headline, { x: PAGE_W / 2 - w / 2, y: ctx.cursorY - size, size, font: bold, color: NAVY_DEEP });
  ctx.cursorY -= size + 6;

  const sub = "Issued under the authority of Aldwych European Capital Operations Office";
  const subW = ctx.font.widthOfTextAtSize(sub, 9);
  page.drawText(sub, { x: PAGE_W / 2 - subW / 2, y: ctx.cursorY - 9, size: 9, font: ctx.font, color: TEXT });
  ctx.cursorY -= 9 + 18;
}

function drawAmountHero(ctx: Ctx) {
  const { page, bold, data } = ctx;
  const isCredit = data.kind === "adjustment_credit" || (data.kind === "reversal" && data.reversedDescription?.toLowerCase().includes("debit"));
  const sign = isCredit ? "+" : "−";
  const color = isCredit ? GREEN : RED;
  const amountStr = `${sign}${fmtMoney(data.amount, data.currency)}`;

  const size = 36;
  const w = bold.widthOfTextAtSize(amountStr, size);
  page.drawText(amountStr, { x: PAGE_W / 2 - w / 2, y: ctx.cursorY - size, size, font: bold, color });
  ctx.cursorY -= size + 4;

  const badge = DOC_BADGE[data.kind];
  const badgeSize = 11;
  const padX = 16, padY = 6;
  const bw = bold.widthOfTextAtSize(badge, badgeSize);
  const boxX = PAGE_W / 2 - (bw + padX * 2) / 2;
  page.drawRectangle({
    x: boxX, y: ctx.cursorY - (badgeSize + padY * 2),
    width: bw + padX * 2, height: badgeSize + padY * 2,
    color, opacity: 0.94,
  });
  page.drawText(badge, {
    x: boxX + padX, y: ctx.cursorY - badgeSize - padY + 2,
    size: badgeSize, font: bold, color: rgb(1, 1, 1),
  });
  ctx.cursorY -= badgeSize + padY * 2 + 24;
}

function drawDataPanel(ctx: Ctx, title: string, rows: Array<[string, string]>) {
  const { page, font, bold } = ctx;
  const innerPad = 14;
  const panelX = MARGIN;
  const panelW = PAGE_W - MARGIN * 2;
  const rowH = 18;
  const titleH = 22;
  const panelH = titleH + innerPad + rows.length * rowH + innerPad;

  const top = ctx.cursorY;
  const y = top - panelH;

  page.drawRectangle({
    x: panelX, y, width: panelW, height: panelH,
    color: rgb(0.984, 0.98, 0.969),
    borderColor: SOFT_BORDER, borderWidth: 0.5,
  });
  page.drawRectangle({ x: panelX, y: top - titleH, width: panelW, height: titleH, color: NAVY_DEEP });
  page.drawText(title, { x: panelX + innerPad, y: top - titleH + 6, size: 10, font: bold, color: GOLD });

  let rowY = top - titleH - innerPad - 4;
  const labelW = 170;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: panelX + innerPad, y: rowY, size: 8, font: bold, color: MUTED });
    const valLines = wrapText(value, font, 10, panelW - innerPad * 2 - labelW);
    page.drawText(valLines[0] || "—", { x: panelX + innerPad + labelW, y: rowY, size: 10, font, color: NAVY });
    rowY -= rowH;
  }
  ctx.cursorY = y - 18;
}

function drawSection(ctx: Ctx, title: string) {
  ctx.page.drawText(title.toUpperCase(), {
    x: MARGIN, y: ctx.cursorY - 11, size: 10, font: ctx.bold, color: GOLD_DARK,
  });
  ctx.cursorY -= 11 + 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.cursorY - 2 },
    end: { x: PAGE_W - MARGIN, y: ctx.cursorY - 2 },
    thickness: 0.4, color: SOFT_BORDER,
  });
  ctx.cursorY -= 14;
}

function drawParagraph(ctx: Ctx, text: string, opts: { size?: number; color?: any } = {}) {
  const size = opts.size ?? 10.5;
  const color = opts.color ?? TEXT;
  const lines = wrapText(text, ctx.font, size, PAGE_W - MARGIN * 2);
  for (const line of lines) {
    if (line === "") { ctx.cursorY -= size * 0.6; continue; }
    ctx.page.drawText(line, { x: MARGIN, y: ctx.cursorY - size, size, font: ctx.font, color });
    ctx.cursorY -= size + 4;
  }
  ctx.cursorY -= 4;
}

function drawSignatureBlock(ctx: Ctx) {
  const { page, font, bold, data } = ctx;
  const top = ctx.cursorY;
  const blockY = top - 110;

  page.drawText("AUTHORISED SIGNATORY", { x: MARGIN, y: top - 12, size: 8, font: bold, color: MUTED });
  page.drawLine({
    start: { x: MARGIN, y: blockY + 50 },
    end: { x: MARGIN + 220, y: blockY + 50 },
    thickness: 0.6, color: NAVY,
  });
  page.drawText(data.issuedByName, { x: MARGIN, y: blockY + 36, size: 11, font: bold, color: NAVY });
  page.drawText(data.issuedByTitle, { x: MARGIN, y: blockY + 22, size: 9, font, color: TEXT });
  page.drawText("Aldwych European Capital — Operations Division", {
    x: MARGIN, y: blockY + 10, size: 8, font, color: MUTED,
  });
  ctx.cursorY = blockY - 6;
}

async function embedQR(pdf: PDFDocument, url: string) {
  const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 240 });
  const base64 = dataUrl.split(",")[1];
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return await pdf.embedPng(bytes);
}

function drawFooter(ctx: Ctx, qrImg: any | null) {
  const { page, font, bold } = ctx;
  const top = FOOTER_RESERVED;
  page.drawLine({
    start: { x: MARGIN, y: top + 2 }, end: { x: PAGE_W - MARGIN, y: top + 2 },
    thickness: 0.5, color: SOFT_BORDER,
  });
  if (qrImg) {
    const qrSize = 72;
    page.drawImage(qrImg, { x: PAGE_W - MARGIN - qrSize, y: 24, width: qrSize, height: qrSize });
    page.drawText("Verify this notice", {
      x: PAGE_W - MARGIN - qrSize - 4, y: 18, size: 7, font: bold, color: MUTED,
    });
  }
  const lines = [
    "Aldwych European Capital plc — Registered in England and Wales",
    "Authorised by the Prudential Regulation Authority and regulated by",
    "the Financial Conduct Authority and the Prudential Regulation Authority.",
    "Registered office: Aldwych House, 71-91 Aldwych, London WC2B 4HN",
  ];
  let fy = top - 14;
  for (const ln of lines) {
    page.drawText(ln, { x: MARGIN, y: fy, size: 7.5, font, color: MUTED });
    fy -= 10;
  }
  page.drawText(`Document reference: ${ctx.data.reference}`, {
    x: MARGIN, y: 18, size: 8, font: bold, color: TEXT,
  });
}

export async function generateAdjustmentDocument(data: AdjustmentDocumentData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${DOC_HEADLINE[data.kind]} — ${data.reference}`);
  pdf.setAuthor("Aldwych European Capital — Operations Division");
  pdf.setSubject(`${data.kind} for ${data.customer.name}`);
  pdf.setProducer("Aldwych European Capital");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await loadLogoBytes();
  let logo: Ctx["logo"] = null;
  if (logoBytes) {
    try {
      const img = await pdf.embedPng(logoBytes);
      logo = { width: img.width, height: img.height, embed: img };
    } catch {
      try {
        const img = await pdf.embedJpg(logoBytes);
        logo = { width: img.width, height: img.height, embed: img };
      } catch {
        logo = null;
      }
    }
  }

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { pdf, page, font, bold, logo, data, cursorY: PAGE_H - 100 };

  drawWatermark(page, bold, DOC_BADGE[data.kind]);
  drawHeader(ctx);
  ctx.cursorY = PAGE_H - 110;

  drawHeadline(ctx);
  drawAmountHero(ctx);

  // Particulars
  const accountLabel = data.accountType[0].toUpperCase() + data.accountType.slice(1);
  const rows: Array<[string, string]> = [
    ["Account holder", data.customer.name],
    ["Account number", maskAccountNumber(data.customer.accountNumber)],
    ["Affected account", accountLabel],
    ["Amount", `${data.kind === "adjustment_debit" ? "−" : data.kind === "adjustment_credit" ? "+" : ""}${fmtMoney(data.amount, data.currency)}`],
    ["Balance before", fmtMoney(data.balanceBefore, data.currency)],
    ["Balance after", fmtMoney(data.balanceAfter, data.currency)],
    ["Reason category", data.reasonCategory],
    ["Issued by", `${data.issuedByName}, ${data.issuedByTitle}`],
    ["Issue date", fmtDateFull(data.issuedAt)],
    ["Document reference", data.reference],
  ];
  if (data.kind === "reversal" && data.reversedReference) {
    rows.splice(7, 0, ["Reverses transaction", data.reversedReference]);
    if (data.reversedOriginalDate) {
      rows.splice(8, 0, ["Original transaction date", fmtDateTime(data.reversedOriginalDate)]);
    }
  }
  drawDataPanel(ctx, "Notice particulars", rows);

  drawSection(ctx, "Statement of action");
  drawParagraph(ctx, DOC_INTRO[data.kind]);

  drawSection(ctx, "Reason for this entry");
  drawParagraph(ctx, data.reasonCategory, { size: 11 });
  if (data.reasonNote) drawParagraph(ctx, data.reasonNote);
  if (data.legalBasis) {
    drawSection(ctx, "Legal / regulatory basis");
    drawParagraph(ctx, data.legalBasis);
  }

  drawSection(ctx, "Questions about this notice");
  drawParagraph(
    ctx,
    "If you believe this entry was posted in error, or you require additional information, contact our Operations Office at operations@aldwychcapital.com or +44 (0)20 7946 0000, quoting the document reference above. Disputes must be raised within 60 days of the issue date."
  );

  if (ctx.cursorY < FOOTER_RESERVED + 140) {
    const p2 = pdf.addPage([PAGE_W, PAGE_H]);
    ctx.page = p2;
    drawTopBand(p2);
    drawWatermark(p2, bold, DOC_BADGE[data.kind]);
    drawHeader(ctx);
    ctx.cursorY = PAGE_H - 110;
  }
  drawSignatureBlock(ctx);

  const qrImg = await embedQR(pdf, data.verificationUrl).catch(() => null);
  for (const p of pdf.getPages()) {
    const tempCtx: Ctx = { ...ctx, page: p };
    drawFooter(tempCtx, qrImg);
  }

  return await pdf.save();
}
