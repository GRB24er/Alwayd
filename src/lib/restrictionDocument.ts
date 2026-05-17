// Generates a professional, printable Notice of Account Freeze / Block / Closure
// in PDF form, with embedded bank logo, watermark, embossed seal, verifiable QR
// code, and a signature block. Mirrors the visual style of loanDocuments.ts so
// the customer experiences a single, coherent document language across products.
//
// The output Uint8Array is what the API streams back to the browser and what
// the email-notification path attaches.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";
import {
  ACTION_LABELS,
  REASON_LABELS,
  IAccountRestriction,
  RestrictionAction,
} from "@/models/AccountRestriction";

// ── Brand palette ──────────────────────────────────────────────────────────
const NAVY = rgb(0.0509, 0.1411, 0.2509);
const NAVY_DEEP = rgb(0.031, 0.094, 0.188);
const GOLD = rgb(0.7882, 0.6627, 0.3843);
const GOLD_DARK = rgb(0.6588, 0.5764, 0.3725);
const TEXT = rgb(0.2784, 0.3372, 0.4156);
const MUTED = rgb(0.5803, 0.6392, 0.7215);
const SOFT_BORDER = rgb(0.886, 0.91, 0.941);
const ALERT_RED = rgb(0.722, 0.196, 0.196);
const WARN_AMBER = rgb(0.717, 0.443, 0.039);

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 48;
const FOOTER_RESERVED = 110;

export interface RestrictionDocumentData {
  restriction: IAccountRestriction;
  customer: {
    name: string;
    email: string;
    accountNumber?: string;
    routingNumber?: string;
    address?: string;
  };
  // Public verification URL for the QR code (links to the bank's restriction
  // verifier page that confirms the reference is genuine).
  verificationUrl: string;
}

const ACTION_HEADLINE: Record<RestrictionAction, string> = {
  freeze: "NOTICE OF ACCOUNT FREEZE",
  block: "NOTICE OF ACCOUNT BLOCK",
  close: "NOTICE OF ACCOUNT CLOSURE",
};

const ACTION_BADGE_TEXT: Record<RestrictionAction, string> = {
  freeze: "ACCOUNT FROZEN",
  block: "ACCOUNT BLOCKED",
  close: "ACCOUNT CLOSED",
};

const ACTION_INTRO: Record<RestrictionAction, string> = {
  freeze:
    "This notice serves as a formal record that the account(s) identified below have been placed under a TEMPORARY FREEZE by Aldwych European Capital. While this freeze remains in effect, outgoing transactions — including transfers, withdrawals, card purchases, and bill payments — are suspended. Incoming credits will continue to be accepted and posted to the account.",
  block:
    "This notice serves as a formal record that the account(s) identified below have been placed under FULL BLOCK by Aldwych European Capital. All access to the account — including online banking, card transactions, transfers, deposits, and withdrawals — has been suspended pending resolution of the matter described in this notice.",
  close:
    "This notice serves as a formal record that the account(s) identified below have been CLOSED by Aldwych European Capital. Any residual balance will be remitted to the account holder in accordance with the closure procedure outlined in your account terms.",
};

// What the customer can do, by action type.
const PERMITTED_ACTIONS: Record<RestrictionAction, string[]> = {
  freeze: [
    "View account balances and transaction history (online banking)",
    "Receive incoming deposits, salary credits, and inbound transfers",
    "Contact our compliance team to resolve the matter",
    "Request a copy of this notice and supporting documentation",
  ],
  block: [
    "Contact our compliance team to inquire about resolution",
    "Provide additional documentation upon request",
    "Request a copy of this notice for your records",
  ],
  close: [
    "Request the disbursement of any residual balance",
    "Request a final statement of account",
    "Open a new account subject to standard onboarding procedures",
  ],
};

const PROHIBITED_ACTIONS: Record<RestrictionAction, string[]> = {
  freeze: [
    "Outgoing wire transfers (domestic or international)",
    "ACH transfers and bill payments",
    "Card transactions and ATM withdrawals",
    "Account transfers between your accounts at this bank",
    "Cheque issuance",
  ],
  block: [
    "All online banking access",
    "Card transactions and ATM withdrawals",
    "Deposits, transfers, withdrawals, and bill payments",
    "Receipt of inbound transfers (returned to sender)",
  ],
  close: [
    "All banking services tied to the closed account number(s)",
  ],
};

const fmtDateFull = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtDateTime = (d: Date) =>
  `${fmtDate(d)} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), "public", "images", "Logo.png");
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

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
    out.push(""); // paragraph break
  }
  if (out[out.length - 1] === "") out.pop();
  return out;
}

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  cursorY: number;
  logo: { width: number; height: number; embed: any } | null;
  data: RestrictionDocumentData;
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

  // Faded large logo behind the header for emboss effect
  if (logo) {
    const w = 220;
    const h = w * (logo.height / logo.width);
    page.drawImage(logo.embed, {
      x: PAGE_W / 2 - w / 2,
      y: PAGE_H / 2 + 200,
      width: w,
      height: h,
      opacity: 0.07,
    });

    // Small visible logo top-left
    const sw = 130;
    const sh = sw * (logo.height / logo.width);
    page.drawImage(logo.embed, {
      x: MARGIN,
      y: PAGE_H - sh - 24,
      width: sw,
      height: sh,
    });
  } else {
    page.drawText("ALDWYCH EUROPEAN CAPITAL", {
      x: MARGIN,
      y: PAGE_H - 38,
      size: 14,
      font: bold,
      color: NAVY,
    });
    page.drawText("European Private Banking · Est. 1897", {
      x: MARGIN,
      y: PAGE_H - 54,
      size: 9,
      font,
      color: TEXT,
    });
  }

  // Top-right block: document type, reference, date
  const docTitle = ACTION_HEADLINE[data.restriction.action];
  const dtWidth = bold.widthOfTextAtSize(docTitle, 11);
  page.drawText(docTitle, {
    x: PAGE_W - MARGIN - dtWidth,
    y: PAGE_H - 36,
    size: 11,
    font: bold,
    color: data.restriction.action === "freeze" ? WARN_AMBER : ALERT_RED,
  });

  const refLine = `Reference: ${data.restriction.referenceNumber}`;
  const rlWidth = font.widthOfTextAtSize(refLine, 9);
  page.drawText(refLine, {
    x: PAGE_W - MARGIN - rlWidth,
    y: PAGE_H - 52,
    size: 9,
    font,
    color: TEXT,
  });

  const dateLine = `Issued: ${fmtDate(data.restriction.createdAt)}`;
  const dlWidth = font.widthOfTextAtSize(dateLine, 9);
  page.drawText(dateLine, {
    x: PAGE_W - MARGIN - dlWidth,
    y: PAGE_H - 66,
    size: 9,
    font,
    color: TEXT,
  });

  // Header separator
  page.drawLine({
    start: { x: MARGIN, y: PAGE_H - 90 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - 90 },
    thickness: 0.5,
    color: SOFT_BORDER,
  });
}

function drawStatusBadge(ctx: Ctx) {
  const { page, bold, data } = ctx;
  const action = data.restriction.action;
  const text = ACTION_BADGE_TEXT[action];
  const color = action === "freeze" ? WARN_AMBER : ALERT_RED;

  const size = 13;
  const tw = bold.widthOfTextAtSize(text, size);
  const padX = 18;
  const padY = 10;
  const boxW = tw + padX * 2;
  const boxH = size + padY * 2;
  const x = PAGE_W / 2 - boxW / 2;
  const y = ctx.cursorY - boxH;

  page.drawRectangle({ x, y, width: boxW, height: boxH, color, opacity: 0.92, borderWidth: 0 });
  page.drawText(text, {
    x: x + padX,
    y: y + padY + 2,
    size,
    font: bold,
    color: rgb(1, 1, 1),
  });

  ctx.cursorY = y - 20;
}

function drawHeadline(ctx: Ctx) {
  const { page, bold } = ctx;
  const headline = ACTION_HEADLINE[ctx.data.restriction.action];
  const size = 22;
  const tw = bold.widthOfTextAtSize(headline, size);
  page.drawText(headline, {
    x: PAGE_W / 2 - tw / 2,
    y: ctx.cursorY - size,
    size,
    font: bold,
    color: NAVY_DEEP,
  });
  ctx.cursorY -= size + 6;

  // Subline
  const sub = `Issued under the authority of Aldwych European Capital Compliance Office`;
  const subSize = 9;
  const sw = ctx.font.widthOfTextAtSize(sub, subSize);
  page.drawText(sub, {
    x: PAGE_W / 2 - sw / 2,
    y: ctx.cursorY - subSize,
    size: subSize,
    font: ctx.font,
    color: TEXT,
  });
  ctx.cursorY -= subSize + 20;
}

// A 2-column "key: value" panel.
function drawDataPanel(
  ctx: Ctx,
  title: string,
  rows: Array<[string, string]>
) {
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
    x: panelX,
    y,
    width: panelW,
    height: panelH,
    color: rgb(0.984, 0.98, 0.969),
    borderColor: SOFT_BORDER,
    borderWidth: 0.5,
  });

  // Title bar
  page.drawRectangle({
    x: panelX,
    y: top - titleH,
    width: panelW,
    height: titleH,
    color: NAVY_DEEP,
  });
  page.drawText(title, {
    x: panelX + innerPad,
    y: top - titleH + 6,
    size: 10,
    font: bold,
    color: GOLD,
  });

  let rowY = top - titleH - innerPad - 4;
  const labelW = 170;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), {
      x: panelX + innerPad,
      y: rowY,
      size: 8,
      font: bold,
      color: MUTED,
    });
    const valLines = wrapText(value, font, 10, panelW - innerPad * 2 - labelW);
    page.drawText(valLines[0] || "—", {
      x: panelX + innerPad + labelW,
      y: rowY,
      size: 10,
      font,
      color: NAVY,
    });
    rowY -= rowH;
  }

  ctx.cursorY = y - 18;
}

function drawSection(ctx: Ctx, title: string) {
  const { page, bold } = ctx;
  page.drawText(title.toUpperCase(), {
    x: MARGIN,
    y: ctx.cursorY - 11,
    size: 10,
    font: bold,
    color: GOLD_DARK,
  });
  ctx.cursorY -= 11 + 4;
  page.drawLine({
    start: { x: MARGIN, y: ctx.cursorY - 2 },
    end: { x: PAGE_W - MARGIN, y: ctx.cursorY - 2 },
    thickness: 0.4,
    color: SOFT_BORDER,
  });
  ctx.cursorY -= 14;
}

function drawParagraph(ctx: Ctx, text: string, opts: { size?: number; color?: any } = {}) {
  const size = opts.size ?? 10.5;
  const color = opts.color ?? TEXT;
  const lines = wrapText(text, ctx.font, size, PAGE_W - MARGIN * 2);
  for (const line of lines) {
    if (line === "") {
      ctx.cursorY -= size * 0.6;
      continue;
    }
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.cursorY - size,
      size,
      font: ctx.font,
      color,
    });
    ctx.cursorY -= size + 4;
  }
  ctx.cursorY -= 4;
}

function drawBulletList(ctx: Ctx, items: string[], bulletColor: any = GOLD) {
  for (const item of items) {
    const size = 10;
    const bulletX = MARGIN + 4;
    const textX = MARGIN + 18;
    ctx.page.drawCircle({ x: bulletX, y: ctx.cursorY - size / 2 - 1, size: 2, color: bulletColor });
    const lines = wrapText(item, ctx.font, size, PAGE_W - MARGIN * 2 - 18);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "") continue;
      ctx.page.drawText(lines[i], {
        x: textX,
        y: ctx.cursorY - size,
        size,
        font: ctx.font,
        color: TEXT,
      });
      ctx.cursorY -= size + 3;
    }
    ctx.cursorY -= 2;
  }
  ctx.cursorY -= 6;
}

async function embedQR(pdf: PDFDocument, url: string) {
  const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 240 });
  const base64 = dataUrl.split(",")[1];
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return await pdf.embedPng(bytes);
}

function drawSignatureBlock(ctx: Ctx) {
  const { page, font, bold, data } = ctx;
  const top = ctx.cursorY;
  const blockY = top - 110;

  // Left: bank officer
  page.drawText("AUTHORISED SIGNATORY", {
    x: MARGIN,
    y: top - 12,
    size: 8,
    font: bold,
    color: MUTED,
  });
  // Signature line
  page.drawLine({
    start: { x: MARGIN, y: blockY + 50 },
    end: { x: MARGIN + 220, y: blockY + 50 },
    thickness: 0.6,
    color: NAVY,
  });
  page.drawText(data.restriction.issuedByName, {
    x: MARGIN,
    y: blockY + 36,
    size: 11,
    font: bold,
    color: NAVY,
  });
  page.drawText(data.restriction.issuedByTitle || "Compliance Officer", {
    x: MARGIN,
    y: blockY + 22,
    size: 9,
    font,
    color: TEXT,
  });
  page.drawText("Aldwych European Capital — Compliance Division", {
    x: MARGIN,
    y: blockY + 10,
    size: 8,
    font,
    color: MUTED,
  });

  ctx.cursorY = blockY - 6;
}

function drawFooter(ctx: Ctx, qrImg: any | null) {
  const { page, font, bold } = ctx;
  const footerTop = FOOTER_RESERVED;

  page.drawLine({
    start: { x: MARGIN, y: footerTop + 2 },
    end: { x: PAGE_W - MARGIN, y: footerTop + 2 },
    thickness: 0.5,
    color: SOFT_BORDER,
  });

  // QR (verification) — bottom right
  if (qrImg) {
    const qrSize = 72;
    page.drawImage(qrImg, {
      x: PAGE_W - MARGIN - qrSize,
      y: 24,
      width: qrSize,
      height: qrSize,
    });
    page.drawText("Verify this notice", {
      x: PAGE_W - MARGIN - qrSize - 4,
      y: 18,
      size: 7,
      font: bold,
      color: MUTED,
    });
  }

  // Footer text — bottom left
  const lines = [
    "Aldwych European Capital plc — Registered in England and Wales",
    "Authorised by the Prudential Regulation Authority and regulated by",
    "the Financial Conduct Authority and the Prudential Regulation Authority.",
    "Registered office: Aldwych House, 71-91 Aldwych, London WC2B 4HN",
  ];
  let fy = footerTop - 14;
  for (const ln of lines) {
    page.drawText(ln, { x: MARGIN, y: fy, size: 7.5, font, color: MUTED });
    fy -= 10;
  }

  // Page footer reference
  page.drawText(`Document reference: ${ctx.data.restriction.referenceNumber}`, {
    x: MARGIN,
    y: 18,
    size: 8,
    font: bold,
    color: TEXT,
  });
}

export async function generateRestrictionNotice(
  data: RestrictionDocumentData
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${ACTION_HEADLINE[data.restriction.action]} — ${data.restriction.referenceNumber}`);
  pdf.setAuthor("Aldwych European Capital — Compliance Division");
  pdf.setSubject(`${ACTION_LABELS[data.restriction.action]} notice for ${data.customer.name}`);
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
  const ctx: Ctx = {
    pdf,
    page,
    font,
    bold,
    logo,
    data,
    cursorY: PAGE_H - 100,
  };

  drawWatermark(page, bold, ACTION_BADGE_TEXT[data.restriction.action]);
  drawHeader(ctx);
  ctx.cursorY = PAGE_H - 110;

  drawHeadline(ctx);
  drawStatusBadge(ctx);

  // ── Customer + Restriction summary panel ───────────────────────────────
  const r = data.restriction;
  const affectedLabel = r.affectedAccounts.includes("all")
    ? "All accounts"
    : r.affectedAccounts.map((a) => a[0].toUpperCase() + a.slice(1)).join(", ");

  drawDataPanel(ctx, "Notice Particulars", [
    ["Account holder", data.customer.name],
    ["Email", data.customer.email],
    ["Account number", maskAccountNumber(data.customer.accountNumber)],
    ["Affected account(s)", affectedLabel],
    ["Notice type", ACTION_LABELS[r.action]],
    ["Reason category", REASON_LABELS[r.reasonCategory]],
    ["Effective from", fmtDateTime(r.effectiveFrom)],
    ["Effective until", r.effectiveUntil ? fmtDateTime(r.effectiveUntil) : "Until further notice"],
    ["Issued by", `${r.issuedByName}${r.issuedByTitle ? `, ${r.issuedByTitle}` : ""}`],
    ["Issue date", fmtDateFull(r.createdAt)],
    ["Document reference", r.referenceNumber],
  ]);

  // ── Statement ──────────────────────────────────────────────────────────
  drawSection(ctx, "Statement of action");
  drawParagraph(ctx, ACTION_INTRO[r.action]);

  // ── Reason for action ──────────────────────────────────────────────────
  drawSection(ctx, "Reason for this action");
  drawParagraph(ctx, REASON_LABELS[r.reasonCategory], { size: 11 });
  if (r.reasonNote) {
    drawParagraph(ctx, r.reasonNote);
  }
  if (r.legalBasis) {
    drawSection(ctx, "Legal / regulatory basis");
    drawParagraph(ctx, r.legalBasis);
  }

  // ── What you can / cannot do ───────────────────────────────────────────
  drawSection(ctx, "Permitted activity during this period");
  drawBulletList(ctx, PERMITTED_ACTIONS[r.action], GOLD);

  drawSection(ctx, "Suspended activity during this period");
  drawBulletList(ctx, PROHIBITED_ACTIONS[r.action], ALERT_RED);

  // ── How to resolve ─────────────────────────────────────────────────────
  drawSection(ctx, "How to resolve this matter");
  drawParagraph(
    ctx,
    r.action === "close"
      ? "If you believe this closure was issued in error, contact our Compliance Office within 30 days at the address below. Final balance disbursement will be processed in accordance with the closure procedure in your account terms."
      : "To resolve this matter, contact our Compliance Office at compliance@aldwychcapital.com or by telephone on +44 (0)20 7946 0000, quoting the document reference above. Please be prepared to provide identification and, where requested, documentation supporting the activity under review."
  );

  // ── Signature ──────────────────────────────────────────────────────────
  if (ctx.cursorY < FOOTER_RESERVED + 140) {
    // Push to a fresh page if the signature would collide with footer.
    const p2 = pdf.addPage([PAGE_W, PAGE_H]);
    ctx.page = p2;
    drawTopBand(p2);
    drawWatermark(p2, bold, ACTION_BADGE_TEXT[r.action]);
    drawHeader(ctx);
    ctx.cursorY = PAGE_H - 110;
  }
  drawSignatureBlock(ctx);

  // ── Footer (every page) ────────────────────────────────────────────────
  const qrImg = await embedQR(pdf, data.verificationUrl).catch(() => null);
  for (const p of pdf.getPages()) {
    const tempCtx: Ctx = { ...ctx, page: p };
    drawFooter(tempCtx, qrImg);
  }

  return await pdf.save();
}
