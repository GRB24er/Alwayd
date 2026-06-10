// Generates the official Funds Transfer Receipt PDF issued to customers once a
// transfer has been initiated/settled. Shares the brand chrome of the other
// official documents (logo, gold top band, FCA/PRA footer, QR-verified
// reference) and adds receipt-specific security furniture: a tiled diagonal
// watermark, a status stamp, an amount breakdown and a SHA-256 integrity
// digest so any copy can be checked against the ledger.

import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
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
const PANEL_BG = rgb(0.984, 0.98, 0.969);
const GREEN = rgb(0.063, 0.725, 0.506);
const AMBER = rgb(0.804, 0.569, 0.169);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const FOOTER_RESERVED = 104;

export type TransferReceiptStatus = "completed" | "processing";

export interface TransferReceiptParty {
  name: string;
  /** Already-masked account representation, e.g. "••••4821" */
  accountMasked?: string;
  accountType?: string;
  bankName?: string;
  address?: string;
  routingMasked?: string;
  swiftBic?: string;
  country?: string;
}

export interface TransferReceiptData {
  receiptNumber: string;            // RCP-WIRE-XXXX...
  reference: string;                // underlying ledger reference
  status: TransferReceiptStatus;
  /** "debit" = funds leaving the account, "credit" = funds arriving */
  direction: "debit" | "credit";
  transferKind: string;             // e.g. "Domestic Wire Transfer"
  rail: string;                     // e.g. "FEDWIRE" / "SWIFT" / "ACH" / "BOOK TRANSFER"
  channel: string;                  // e.g. "Online Banking"
  amount: number;
  currency: string;                 // ISO 4217
  fee: number;
  totalSettled: number;             // amount + fee on debits; amount on credits
  initiatedAt: Date;
  completedAt?: Date | null;        // settlement timestamp once posted
  purpose?: string;
  narrative?: string;               // customer-facing description
  sender: TransferReceiptParty;
  beneficiary: TransferReceiptParty;
  integrityHash: string;            // hex SHA-256 of the canonical receipt payload
  verificationUrl: string;          // public QR verification URL
  generatedAt: Date;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtDateTime = (d: Date) =>
  `${fmtDate(d)} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
const fmtMoney = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD", minimumFractionDigits: 2 }).format(n);

// Single-line fit with ellipsis — panel fields are fixed-width, like the
// 35-character fields on a SWIFT confirmation.
function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t.trimEnd()}…`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
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
  logo: { width: number; height: number; embed: PDFImage } | null;
  data: TransferReceiptData;
}

function statusColor(data: TransferReceiptData) {
  return data.status === "completed" ? GREEN : AMBER;
}

function statusBadgeText(data: TransferReceiptData) {
  return data.status === "completed" ? "TRANSFER COMPLETED" : "PROCESSING - PENDING SETTLEMENT";
}

function drawTopBand(page: PDFPage) {
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GOLD });
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 4, color: NAVY_DEEP });
}

// Tiled diagonal security watermark covering the full sheet, with the status
// stamped once across the middle — the pattern survives photocopying and makes
// excised screenshots obvious.
function drawWatermark(page: PDFPage, bold: PDFFont, data: TransferReceiptData) {
  const tile = "ALDWYCH EUROPEAN CAPITAL • OFFICIAL RECEIPT";
  const tileSize = 13;
  const tileW = bold.widthOfTextAtSize(tile, tileSize);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -80 + col * (tileW * 0.78) - (row % 2) * 90;
      const y = 30 + row * 105;
      page.drawText(tile, {
        x,
        y,
        size: tileSize,
        font: bold,
        color: rgb(0.93, 0.9, 0.83),
        rotate: degrees(-30),
        opacity: 0.5,
      });
    }
  }

  const stamp = data.status === "completed" ? "COMPLETED" : "PROCESSING";
  const stampSize = 86;
  const w = bold.widthOfTextAtSize(stamp, stampSize);
  page.drawText(stamp, {
    x: PAGE_W / 2 - w / 2 + 60,
    y: PAGE_H / 2 - 20,
    size: stampSize,
    font: bold,
    color: data.status === "completed" ? rgb(0.78, 0.9, 0.84) : rgb(0.93, 0.88, 0.78),
    rotate: degrees(-30),
    opacity: 0.22,
  });
}

function drawHeader(ctx: Ctx) {
  const { page, font, bold, logo, data } = ctx;
  drawTopBand(page);

  if (logo) {
    // Ghost logo behind the body content.
    const gw = 240;
    const gh = gw * (logo.height / logo.width);
    page.drawImage(logo.embed, { x: PAGE_W / 2 - gw / 2, y: PAGE_H / 2 - gh / 2, width: gw, height: gh, opacity: 0.06 });
    const sw = 130;
    const sh = sw * (logo.height / logo.width);
    page.drawImage(logo.embed, { x: MARGIN, y: PAGE_H - sh - 24, width: sw, height: sh });
  } else {
    page.drawText("ALDWYCH EUROPEAN CAPITAL", { x: MARGIN, y: PAGE_H - 38, size: 14, font: bold, color: NAVY });
    page.drawText("European Private Banking · Est. 1897", {
      x: MARGIN, y: PAGE_H - 54, size: 9, font, color: TEXT,
    });
  }

  const docTitle = "OFFICIAL PAYMENT RECEIPT";
  const w = bold.widthOfTextAtSize(docTitle, 11);
  page.drawText(docTitle, { x: PAGE_W - MARGIN - w, y: PAGE_H - 36, size: 11, font: bold, color: statusColor(data) });

  const refLine = `Receipt No: ${data.receiptNumber}`;
  const rW = font.widthOfTextAtSize(refLine, 9);
  page.drawText(refLine, { x: PAGE_W - MARGIN - rW, y: PAGE_H - 52, size: 9, font, color: TEXT });

  const dateLine = `Issued: ${fmtDateTime(data.generatedAt)}`;
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
  const { page, bold, font } = ctx;
  const headline = "FUNDS TRANSFER RECEIPT";
  const size = 21;
  const w = bold.widthOfTextAtSize(headline, size);
  page.drawText(headline, { x: PAGE_W / 2 - w / 2, y: ctx.cursorY - size, size, font: bold, color: NAVY_DEEP });
  ctx.cursorY -= size + 5;

  const sub = `${ctx.data.transferKind} — issued by Aldwych European Capital Payments Office`;
  const subW = font.widthOfTextAtSize(sub, 9);
  page.drawText(sub, { x: PAGE_W / 2 - subW / 2, y: ctx.cursorY - 9, size: 9, font, color: TEXT });
  ctx.cursorY -= 9 + 10;
}

function drawAmountHero(ctx: Ctx) {
  const { page, bold, font, data } = ctx;
  const sign = data.direction === "credit" ? "+" : "-";
  const color = data.direction === "credit" ? GREEN : NAVY_DEEP;
  const amountStr = `${sign}${fmtMoney(data.amount, data.currency)}`;

  const size = 32;
  const w = bold.widthOfTextAtSize(amountStr, size);
  page.drawText(amountStr, { x: PAGE_W / 2 - w / 2, y: ctx.cursorY - size, size, font: bold, color });
  ctx.cursorY -= size + 4;

  const ccyLine = `${data.currency} · ${data.rail}`;
  const cW = font.widthOfTextAtSize(ccyLine, 9);
  page.drawText(ccyLine, { x: PAGE_W / 2 - cW / 2, y: ctx.cursorY - 9, size: 9, font, color: MUTED });
  ctx.cursorY -= 9 + 6;

  const badge = statusBadgeText(data);
  const badgeSize = 10.5;
  const padX = 16, padY = 6;
  const bw = bold.widthOfTextAtSize(badge, badgeSize);
  const boxX = PAGE_W / 2 - (bw + padX * 2) / 2;
  page.drawRectangle({
    x: boxX, y: ctx.cursorY - (badgeSize + padY * 2),
    width: bw + padX * 2, height: badgeSize + padY * 2,
    color: statusColor(data), opacity: 0.94,
  });
  page.drawText(badge, {
    x: boxX + padX, y: ctx.cursorY - badgeSize - padY + 2,
    size: badgeSize, font: bold, color: rgb(1, 1, 1),
  });
  ctx.cursorY -= badgeSize + padY * 2 + 16;
}

interface PartyRow {
  label: string;
  value: string;
  lines: 1 | 2;
}

// Side-by-side remitter / beneficiary panels, the way clearing confirmations
// lay out ordering and beneficiary customer blocks.
function drawPartyPanels(ctx: Ctx) {
  const { page, font, bold, data } = ctx;
  const gap = 12;
  const panelW = (PAGE_W - MARGIN * 2 - gap) / 2;
  const innerPad = 10;
  const titleH = 20;
  const rowH = 21;

  const partyRows = (p: TransferReceiptParty): PartyRow[] => {
    const rows: PartyRow[] = [{ label: "Name", value: p.name || "—", lines: 1 }];
    if (p.accountMasked) rows.push({ label: "Account", value: p.accountMasked, lines: 1 });
    if (p.accountType) rows.push({ label: "Account type", value: p.accountType, lines: 1 });
    if (p.bankName) rows.push({ label: "Bank", value: p.bankName, lines: 1 });
    if (p.routingMasked) rows.push({ label: "Routing (ABA)", value: p.routingMasked, lines: 1 });
    if (p.swiftBic) rows.push({ label: "SWIFT / BIC", value: p.swiftBic, lines: 1 });
    if (p.country) rows.push({ label: "Country", value: p.country, lines: 1 });
    if (p.address) rows.push({ label: "Address", value: p.address, lines: 2 });
    return rows;
  };

  const senderRows = partyRows(data.sender);
  const benefRows = partyRows(data.beneficiary);
  const weight = (rows: PartyRow[]) => rows.reduce((acc, r) => acc + r.lines, 0);
  const rowUnits = Math.max(weight(senderRows), weight(benefRows));
  const panelH = titleH + innerPad + rowUnits * rowH + 2;

  const top = ctx.cursorY;
  const y = top - panelH;

  const drawPanel = (x: number, title: string, rows: PartyRow[]) => {
    page.drawRectangle({
      x, y, width: panelW, height: panelH,
      color: PANEL_BG, borderColor: SOFT_BORDER, borderWidth: 0.5,
    });
    page.drawRectangle({ x, y: top - titleH, width: panelW, height: titleH, color: NAVY_DEEP });
    page.drawText(title, { x: x + innerPad, y: top - titleH + 6, size: 9.5, font: bold, color: GOLD });

    let rowY = top - titleH - innerPad - 6;
    const maxW = panelW - innerPad * 2;
    for (const row of rows) {
      page.drawText(row.label.toUpperCase(), { x: x + innerPad, y: rowY, size: 7, font: bold, color: MUTED });
      if (row.lines === 2) {
        const lines = wrapText(row.value, font, 9, maxW);
        page.drawText(lines[0] || "—", { x: x + innerPad, y: rowY - 11, size: 9, font, color: NAVY });
        if (lines.length > 1) {
          const rest = lines.slice(1).join(" ");
          page.drawText(fitText(rest, font, 9, maxW), { x: x + innerPad, y: rowY - 22, size: 9, font, color: NAVY });
        }
      } else {
        page.drawText(fitText(row.value, font, 9.5, maxW), { x: x + innerPad, y: rowY - 11, size: 9.5, font, color: NAVY });
      }
      rowY -= rowH * row.lines;
    }
  };

  drawPanel(MARGIN, "REMITTER (SENDER)", senderRows);
  drawPanel(MARGIN + panelW + gap, "BENEFICIARY (RECIPIENT)", benefRows);
  ctx.cursorY = y - 14;
}

function drawDataPanel(ctx: Ctx, title: string, rows: Array<[string, string]>) {
  const { page, font, bold } = ctx;
  const innerPad = 12;
  const panelX = MARGIN;
  const panelW = PAGE_W - MARGIN * 2;
  const rowH = 15.5;
  const titleH = 20;
  const panelH = titleH + innerPad + rows.length * rowH + 4;

  const top = ctx.cursorY;
  const y = top - panelH;

  page.drawRectangle({
    x: panelX, y, width: panelW, height: panelH,
    color: PANEL_BG, borderColor: SOFT_BORDER, borderWidth: 0.5,
  });
  page.drawRectangle({ x: panelX, y: top - titleH, width: panelW, height: titleH, color: NAVY_DEEP });
  page.drawText(title, { x: panelX + innerPad, y: top - titleH + 6, size: 9.5, font: bold, color: GOLD });

  let rowY = top - titleH - innerPad - 2;
  const labelW = 170;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: panelX + innerPad, y: rowY, size: 7.5, font: bold, color: MUTED });
    page.drawText(fitText(value || "—", font, 9.5, panelW - innerPad * 2 - labelW), {
      x: panelX + innerPad + labelW, y: rowY, size: 9.5, font, color: NAVY,
    });
    rowY -= rowH;
  }
  ctx.cursorY = y - 14;
}

// Bottom band: settlement summary (left) beside the authentication panel with
// QR code and integrity digest (right).
function drawSettlementAndSecurity(ctx: Ctx, qrImg: PDFImage | null) {
  const { page, font, bold, data } = ctx;
  const gap = 12;
  const totalW = PAGE_W - MARGIN * 2;
  const sumW = Math.round(totalW * 0.52);
  const secW = totalW - sumW - gap;
  const panelH = 96;
  const top = ctx.cursorY;
  const y = top - panelH;

  // — Settlement summary —
  const sumX = MARGIN;
  page.drawRectangle({
    x: sumX, y, width: sumW, height: panelH,
    color: PANEL_BG, borderColor: SOFT_BORDER, borderWidth: 0.5,
  });
  page.drawRectangle({ x: sumX, y: top - 20, width: sumW, height: 20, color: NAVY_DEEP });
  page.drawText("SETTLEMENT SUMMARY", { x: sumX + 12, y: top - 14, size: 9.5, font: bold, color: GOLD });

  const rows: Array<[string, string, boolean]> = [
    ["Transfer amount", fmtMoney(data.amount, data.currency), false],
  ];
  if (data.fee > 0) rows.push(["Transfer fee", fmtMoney(data.fee, data.currency), false]);
  rows.push([
    data.direction === "credit" ? "Total credited" : "Total debited",
    `${data.direction === "credit" ? "+" : "-"}${fmtMoney(data.totalSettled, data.currency)}`,
    true,
  ]);

  let rowY = top - 20 - 16;
  for (const [label, value, emphasis] of rows) {
    if (emphasis) {
      page.drawLine({
        start: { x: sumX + 12, y: rowY + 12 },
        end: { x: sumX + sumW - 12, y: rowY + 12 },
        thickness: 0.8, color: GOLD,
      });
    }
    const lFont = emphasis ? bold : font;
    const size = emphasis ? 11 : 9.5;
    page.drawText(label, { x: sumX + 12, y: rowY, size, font: lFont, color: emphasis ? NAVY_DEEP : TEXT });
    const vW = lFont.widthOfTextAtSize(value, size);
    page.drawText(value, {
      x: sumX + sumW - 12 - vW, y: rowY, size, font: lFont,
      color: emphasis ? (data.direction === "credit" ? GREEN : NAVY_DEEP) : NAVY,
    });
    rowY -= 19;
  }

  // — Authentication panel —
  const secX = sumX + sumW + gap;
  page.drawRectangle({
    x: secX, y, width: secW, height: panelH,
    color: rgb(0.957, 0.965, 0.976), borderColor: SOFT_BORDER, borderWidth: 0.5,
  });

  const qrSize = 68;
  if (qrImg) {
    page.drawImage(qrImg, { x: secX + 10, y: y + (panelH - qrSize) / 2, width: qrSize, height: qrSize });
  }
  const textX = secX + 10 + qrSize + 8;
  const textW = secW - (textX - secX) - 8;
  let ty = top - 16;
  page.drawText("DOCUMENT AUTHENTICATION", { x: textX, y: ty, size: 7, font: bold, color: GOLD_DARK });
  ty -= 10;
  page.drawText("Scan the QR code or visit:", { x: textX, y: ty, size: 6.5, font, color: TEXT });
  ty -= 9;
  const urlDisplay = data.verificationUrl.replace(/^https?:\/\//, "");
  const urlLines = wrapText(urlDisplay.replace(/\//g, "/ "), font, 6.5, textW).slice(0, 2);
  for (const ln of urlLines) {
    page.drawText(ln.replace(/\/ /g, "/"), { x: textX, y: ty, size: 6.5, font, color: NAVY });
    ty -= 9;
  }
  ty -= 3;
  page.drawText("INTEGRITY DIGEST (SHA-256)", { x: textX, y: ty, size: 6, font: bold, color: MUTED });
  ty -= 8;
  const digest = (data.integrityHash.match(/.{1,8}/g) || []).join(" ").toUpperCase();
  const dLines = wrapText(digest, font, 5.8, textW).slice(0, 3);
  for (const ln of dLines) {
    page.drawText(ln, { x: textX, y: ty, size: 5.8, font, color: MUTED });
    ty -= 7.5;
  }

  ctx.cursorY = y - 12;
}

async function embedQR(pdf: PDFDocument, url: string) {
  const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 240 });
  const base64 = dataUrl.split(",")[1];
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return await pdf.embedPng(bytes);
}

function drawFooter(ctx: Ctx, pageNum: number, pageCount: number) {
  const { page, font, bold } = ctx;
  const top = FOOTER_RESERVED;
  page.drawLine({
    start: { x: MARGIN, y: top + 2 }, end: { x: PAGE_W - MARGIN, y: top + 2 },
    thickness: 0.5, color: SOFT_BORDER,
  });
  const lines = [
    "This receipt is generated electronically by Aldwych European Capital and is valid without signature.",
    "Aldwych European Capital plc — Registered in England and Wales. Authorised by the Prudential Regulation",
    "Authority and regulated by the Financial Conduct Authority and the Prudential Regulation Authority.",
    "Registered office: Aldwych House, 71-91 Aldwych, London WC2B 4HN · support@aldwycheuropeancapital.com · +44 (0)20 7946 0000",
  ];
  let fy = top - 14;
  for (const ln of lines) {
    page.drawText(ln, { x: MARGIN, y: fy, size: 7.5, font, color: MUTED });
    fy -= 10;
  }
  page.drawText(`Receipt ${ctx.data.receiptNumber} · Transaction ${ctx.data.reference}`, {
    x: MARGIN, y: 18, size: 8, font: bold, color: TEXT,
  });
  const pageLabel = `Page ${pageNum} of ${pageCount}`;
  const pW = font.widthOfTextAtSize(pageLabel, 8);
  page.drawText(pageLabel, { x: PAGE_W - MARGIN - pW, y: 18, size: 8, font, color: MUTED });
}

export async function generateTransferReceipt(data: TransferReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Funds Transfer Receipt — ${data.receiptNumber}`);
  pdf.setAuthor("Aldwych European Capital — Payments Office");
  pdf.setSubject(`Receipt for transfer ${data.reference}`);
  pdf.setKeywords(["receipt", "funds transfer", data.reference, data.receiptNumber]);
  pdf.setProducer("Aldwych European Capital");
  pdf.setCreationDate(data.generatedAt);
  pdf.setModificationDate(data.generatedAt);

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
  const ctx: Ctx = { pdf, page, font, bold, logo, data, cursorY: PAGE_H - 104 };

  drawWatermark(page, bold, data);
  drawHeader(ctx);

  drawHeadline(ctx);
  drawAmountHero(ctx);
  drawPartyPanels(ctx);

  const details: Array<[string, string]> = [
    ["Receipt number", data.receiptNumber],
    ["Transaction reference", data.reference],
    ["Transfer type", data.transferKind],
    ["Payment rail", data.rail],
    ["Channel", data.channel],
    ["Initiated", fmtDateTime(data.initiatedAt)],
    [
      data.status === "completed" ? "Settled" : "Expected settlement",
      data.completedAt ? fmtDateTime(data.completedAt) : "Pending clearing confirmation",
    ],
  ];
  if (data.purpose) details.push(["Purpose of transfer", data.purpose]);
  if (data.narrative) details.push(["Payment narrative", data.narrative]);
  drawDataPanel(ctx, "TRANSFER DETAILS", details);

  const qrImg = await embedQR(pdf, data.verificationUrl).catch(() => null);
  drawSettlementAndSecurity(ctx, qrImg);

  if (data.status === "processing" && ctx.cursorY - 26 > FOOTER_RESERVED) {
    const note =
      "This receipt confirms acceptance of your payment instruction. Funds are reserved and will be released to the beneficiary once clearing completes; the settled receipt will then be available from your transaction history.";
    const lines = wrapText(note, font, 8.5, PAGE_W - MARGIN * 2).slice(0, 2);
    for (const ln of lines) {
      page.drawText(ln, { x: MARGIN, y: ctx.cursorY - 8.5, size: 8.5, font, color: MUTED });
      ctx.cursorY -= 12;
    }
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    drawFooter({ ...ctx, page: p }, i + 1, pages.length);
  });

  return await pdf.save();
}
