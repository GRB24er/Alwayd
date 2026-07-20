// src/lib/trustDocuments.ts
// Aldwych European Capital — Trustee document generator.
//
// Produces the formal paperwork a private trustee issues over the life of an
// inheritance / age-contingent trust, as printable A4 PDFs that share the
// visual language of loanDocuments.ts and restrictionDocument.ts: embossed
// logo, official seal, watermark, signature block, and a scannable QR code
// that resolves to the trust's public verification page.
//
// Every field is populated from the real trust record — names, reference,
// amounts, dates and the distribution schedule are the genuine values, never
// placeholders.
//
//   deed                  — Declaration of Trust (the founding instrument)
//   certificate           — Certificate of Establishment (one-page proof)
//   funding_receipt       — Contribution Receipt for the principal
//   letter_of_wishes      — Settlor's non-binding guidance to the trustee
//   distribution_statement— Payment advice for a released tranche
//   completion_statement  — Final accounting once fully distributed
//   deed_of_revocation    — Cancellation of a revocable trust

import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export type TrustDocumentType =
  | 'deed'
  | 'certificate'
  | 'funding_receipt'
  | 'letter_of_wishes'
  | 'distribution_statement'
  | 'completion_statement'
  | 'deed_of_revocation';

export interface TrustDocDistribution {
  label: string;
  triggerType: 'age' | 'date';
  triggerAge?: number;
  triggerDate?: Date | string;
  percentage: number;
  status: string;
  releasedAmount?: number;
  releasedAt?: Date | string;
}

export interface TrustDocumentData {
  referenceNumber: string;
  documentType: TrustDocumentType;
  issuedAt: Date;
  verificationUrl: string;

  trustName: string;
  settlorName: string;
  settlorEmail?: string;
  beneficiaryName: string;
  beneficiaryDateOfBirth: Date | string;
  beneficiaryRelationship?: string;

  currency: string;
  principalAmount: number;
  heldBalance: number;
  fundingAccount: string;
  revocable: boolean;

  distributions: TrustDocDistribution[];

  fundedAt?: Date | string;
  fundingReference?: string;
  letterOfWishes?: string;

  // Distribution statement — the specific tranche being advised.
  releasedTranche?: {
    label: string;
    amount: number;
    releasedAt: Date | string;
    remainingBalance: number;
  };

  // Completion / revocation extras.
  completedAt?: Date | string;
  cancelledAt?: Date | string;
  cancellationReason?: string;
  refundAmount?: number;
}

// ── Brand palette (identical to loanDocuments.ts) ───────────────────────────
const NAVY = rgb(0.0509, 0.1411, 0.2509);
const NAVY_DEEP = rgb(0.031, 0.094, 0.188);
const GOLD = rgb(0.7882, 0.6627, 0.3843);
const GOLD_DARK = rgb(0.6588, 0.5764, 0.3725);
const TEXT = rgb(0.2784, 0.3372, 0.4156);
const MUTED = rgb(0.5803, 0.6392, 0.7215);
const SOFT_BORDER = rgb(0.886, 0.91, 0.941);

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 48;

const DOC_TITLES: Record<TrustDocumentType, string> = {
  deed: 'DECLARATION OF TRUST',
  certificate: 'CERTIFICATE OF ESTABLISHMENT',
  funding_receipt: 'TRUST CONTRIBUTION RECEIPT',
  letter_of_wishes: 'LETTER OF WISHES',
  distribution_statement: 'DISTRIBUTION STATEMENT',
  completion_statement: 'TRUST COMPLETION STATEMENT',
  deed_of_revocation: 'DEED OF REVOCATION',
};

const DOC_SUBTITLES: Record<TrustDocumentType, string> = {
  deed: 'Instrument constituting a trust administered by Aldwych European Capital as Trustee',
  certificate: 'Confirmation that the trust described below has been duly established and funded',
  funding_receipt: 'Acknowledgement of funds received into trust by the Trustee',
  letter_of_wishes: 'Non-binding guidance from the Settlor to the Trustee',
  distribution_statement: 'Advice of a distribution released to the Beneficiary',
  completion_statement: 'Final accounting confirming the trust has been fully distributed',
  deed_of_revocation: 'Revocation of a revocable trust and return of undistributed funds',
};

const ACCOUNT_LABELS: Record<string, string> = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  investment: 'Investment Account',
};

function fmtMoney(n: number, currency: string): string {
  const cur = currency || 'EUR';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return `${cur} ${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(d: Date | string | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function triggerText(dist: TrustDocDistribution): string {
  if (dist.triggerType === 'age' && typeof dist.triggerAge === 'number') {
    return `On reaching age ${dist.triggerAge}${dist.triggerDate ? ` (${fmtDate(dist.triggerDate)})` : ''}`;
  }
  return dist.triggerDate ? `On ${fmtDate(dist.triggerDate)}` : 'On the specified date';
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), 'public', 'images', 'Logo.png');
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

// ── Shared chrome (watermark, seal, header, footer) ─────────────────────────

function drawWatermark(page: PDFPage, font: PDFFont) {
  const text = 'ALDWYCH EUROPEAN CAPITAL';
  const size = 64;
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: PAGE_W / 2 - w / 2.2,
    y: PAGE_H / 2 - 40,
    size,
    font,
    color: GOLD,
    opacity: 0.06,
    rotate: degrees(-30),
  });
  const sub = '· TRUSTEE · OFFICIAL · VERIFIED ·';
  const subSize = 16;
  const subW = font.widthOfTextAtSize(sub, subSize);
  page.drawText(sub, {
    x: PAGE_W / 2 - subW / 2.2,
    y: PAGE_H / 2 - 90,
    size: subSize,
    font,
    color: NAVY,
    opacity: 0.05,
    rotate: degrees(-30),
  });
}

function drawArcText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  color: any,
  cx: number,
  cy: number,
  radius: number,
  arc: 'top' | 'bottom',
  letterSpacing = 0.6
) {
  const widths = Array.from(text).map((c) => font.widthOfTextAtSize(c, size) + letterSpacing);
  const totalArcLength = widths.reduce((s, w) => s + w, 0);
  const totalAngle = totalArcLength / radius;
  const centerAngleRad = arc === 'top' ? Math.PI / 2 : -Math.PI / 2;
  let cursor = arc === 'top' ? centerAngleRad + totalAngle / 2 : centerAngleRad - totalAngle / 2;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const charArc = widths[i] / radius;
    const angle = arc === 'top' ? cursor - charArc / 2 : cursor + charArc / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    const rotDeg = (angle * 180) / Math.PI + (arc === 'top' ? -90 : 90);
    page.drawText(ch, { x: px, y: py, size, font, color, rotate: degrees(rotDeg) });
    if (arc === 'top') cursor -= charArc;
    else cursor += charArc;
  }
}

function drawStar(page: PDFPage, cx: number, cy: number, r: number, color: any) {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.8, color });
  }
}

function drawLaurelFlourish(page: PDFPage, cx: number, cy: number, color: any) {
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const angle = Math.PI - t * Math.PI * 0.55;
    const r = 14 + Math.sin(t * Math.PI) * 3;
    page.drawCircle({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) - 3, size: 0.7, color });
  }
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const angle = t * Math.PI * 0.55;
    const r = 14 + Math.sin(t * Math.PI) * 3;
    page.drawCircle({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) - 3, size: 0.7, color });
  }
}

function drawSeal(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  x: number,
  y: number,
  referenceNumber: string
) {
  const outerR = 50;
  const ringR = 45;
  const textR = 41;
  const innerR = 33;
  const coreR = 29;

  page.drawCircle({ x, y, size: outerR, borderColor: GOLD, borderWidth: 0.7, opacity: 0.9 });
  page.drawCircle({ x, y, size: ringR, borderColor: GOLD, borderWidth: 2, opacity: 0.95 });
  page.drawCircle({ x, y, size: innerR, borderColor: GOLD_DARK, borderWidth: 0.7, opacity: 0.85 });
  page.drawCircle({ x, y, size: coreR, borderColor: GOLD_DARK, borderWidth: 0.5, opacity: 0.6 });
  page.drawCircle({ x, y, size: coreR - 1, color: GOLD, opacity: 0.05 });

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const inTop = a > Math.PI * 0.25 && a < Math.PI * 0.75;
    const inBottom = a > Math.PI * 1.25 && a < Math.PI * 1.75;
    if (inTop || inBottom) continue;
    page.drawCircle({
      x: x + (innerR - 2) * Math.cos(a),
      y: y + (innerR - 2) * Math.sin(a),
      size: 0.5,
      color: GOLD_DARK,
      opacity: 0.75,
    });
  }

  drawArcText(page, 'ALDWYCH EUROPEAN CAPITAL', boldFont, 5.5, GOLD_DARK, x, y, textR, 'top', 0.4);
  drawArcText(page, 'TRUSTEE · EST. 1897', boldFont, 5, GOLD_DARK, x, y, textR, 'bottom', 0.4);
  drawStar(page, x - textR - 1.5, y, 3, GOLD_DARK);
  drawStar(page, x + textR + 1.5, y, 3, GOLD_DARK);
  drawLaurelFlourish(page, x, y, GOLD_DARK);

  const monogram = 'AEC';
  const monoSize = 15;
  const monoW = boldFont.widthOfTextAtSize(monogram, monoSize);
  page.drawText(monogram, { x: x - monoW / 2, y: y - 1, size: monoSize, font: boldFont, color: NAVY });
  page.drawLine({ start: { x: x - 12, y: y - 4 }, end: { x: x + 12, y: y - 4 }, thickness: 0.6, color: GOLD_DARK });

  const seal = 'TRUSTEE SEAL';
  const sealSize = 4;
  const sealW = boldFont.widthOfTextAtSize(seal, sealSize);
  page.drawText(seal, { x: x - sealW / 2, y: y - 11, size: sealSize, font: boldFont, color: NAVY });

  const refSize = 3.8;
  const refW = font.widthOfTextAtSize(referenceNumber, refSize);
  page.drawText(referenceNumber, { x: x - refW / 2, y: y - 17, size: refSize, font, color: GOLD_DARK });
  page.drawCircle({ x, y: y + 9, size: 0.8, color: GOLD_DARK });
}

function drawHeader(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  logoImage: { width: number; height: number; embed: any } | null,
  data: TrustDocumentData
) {
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GOLD });

  if (logoImage) {
    const w = 220;
    const h = w * (logoImage.height / logoImage.width);
    page.drawImage(logoImage.embed, { x: PAGE_W / 2 - w / 2, y: PAGE_H / 2 + 200, width: w, height: h, opacity: 0.08 });
    const sw = 130;
    const sh = sw * (logoImage.height / logoImage.width);
    page.drawImage(logoImage.embed, { x: MARGIN, y: PAGE_H - sh - 24, width: sw, height: sh });
  } else {
    page.drawText('ALDWYCH EUROPEAN CAPITAL', { x: MARGIN, y: PAGE_H - 38, size: 14, font: boldFont, color: NAVY });
  }

  const docTitle = DOC_TITLES[data.documentType];
  const dtWidth = boldFont.widthOfTextAtSize(docTitle, 10);
  page.drawText(docTitle, { x: PAGE_W - MARGIN - dtWidth, y: PAGE_H - 36, size: 10, font: boldFont, color: GOLD_DARK });

  const refLine = `Reference: ${data.referenceNumber}`;
  const rlWidth = font.widthOfTextAtSize(refLine, 9);
  page.drawText(refLine, { x: PAGE_W - MARGIN - rlWidth, y: PAGE_H - 50, size: 9, font, color: TEXT });

  const dateLine = `Issued: ${fmtDate(data.issuedAt)}`;
  const dlWidth = font.widthOfTextAtSize(dateLine, 9);
  page.drawText(dateLine, { x: PAGE_W - MARGIN - dlWidth, y: PAGE_H - 64, size: 9, font, color: TEXT });

  page.drawLine({ start: { x: MARGIN, y: PAGE_H - 90 }, end: { x: PAGE_W - MARGIN, y: PAGE_H - 90 }, thickness: 0.5, color: SOFT_BORDER });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of String(text).split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        line = test;
      } else {
        if (line) out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

// ── Paginated render context ────────────────────────────────────────────────

interface RenderCtx {
  pdfDoc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  logoImage: { width: number; height: number; embed: any } | null;
  data: TrustDocumentData;
  page: PDFPage;
  y: number;
  pages: PDFPage[];
}

const FOOTER_RESERVED = 240;

function newPage(ctx: RenderCtx): void {
  const p = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(p);
  ctx.page = p;
  drawWatermark(p, ctx.boldFont);
  drawHeader(p, ctx.font, ctx.boldFont, ctx.logoImage, ctx.data);
  ctx.y = PAGE_H - 120;
}

function ensureSpace(ctx: RenderCtx, needed: number, bottom = FOOTER_RESERVED): void {
  if (ctx.y - needed < bottom) newPage(ctx);
}

function drawTitleBlock(ctx: RenderCtx): void {
  ensureSpace(ctx, 50);
  ctx.page.drawText(DOC_TITLES[ctx.data.documentType], { x: MARGIN, y: ctx.y, size: 20, font: ctx.boldFont, color: NAVY });
  const subLines = wrapText(DOC_SUBTITLES[ctx.data.documentType], ctx.font, 10, PAGE_W - 2 * MARGIN);
  let sy = ctx.y - 18;
  for (const line of subLines) {
    ctx.page.drawText(line, { x: MARGIN, y: sy, size: 10, font: ctx.font, color: TEXT });
    sy -= 13;
  }
  ctx.y = sy - 18;
}

function drawKeyValueBox(ctx: RenderCtx, title: string, rows: Array<[string, string]>): void {
  const rowH = 22;
  const colValueX = MARGIN + 200;
  const boxH = rows.length * rowH + 28;
  ensureSpace(ctx, boxH + 16);

  ctx.page.drawRectangle({
    x: MARGIN - 4,
    y: ctx.y - boxH,
    width: PAGE_W - 2 * MARGIN + 8,
    height: boxH,
    borderColor: SOFT_BORDER,
    borderWidth: 0.6,
    color: rgb(0.984, 0.984, 0.973),
    opacity: 0.6,
  });
  ctx.page.drawText(title, { x: MARGIN + 4, y: ctx.y - 18, size: 9, font: ctx.boldFont, color: GOLD_DARK });

  let y = ctx.y - 36;
  for (const [label, value] of rows) {
    ctx.page.drawText(label, { x: MARGIN + 4, y, size: 10, font: ctx.font, color: TEXT });
    const wrapped = wrapText(value, ctx.boldFont, 10.5, PAGE_W - MARGIN - colValueX - 4);
    let vy = y;
    for (const line of wrapped) {
      ctx.page.drawText(line, { x: colValueX, y: vy, size: 10.5, font: ctx.boldFont, color: NAVY });
      vy -= 12;
    }
    y -= rowH;
  }
  ctx.y -= boxH + 16;
}

function drawScheduleTable(ctx: RenderCtx): void {
  const dists = ctx.data.distributions || [];
  if (dists.length === 0) return;

  ensureSpace(ctx, 30);
  ctx.page.drawText('DISTRIBUTION SCHEDULE', { x: MARGIN, y: ctx.y, size: 9, font: ctx.boldFont, color: GOLD_DARK });
  ctx.y -= 16;

  const colX = { label: MARGIN, trigger: MARGIN + 150, pct: MARGIN + 360, status: MARGIN + 420 };
  ctx.page.drawText('Tranche', { x: colX.label, y: ctx.y, size: 8.5, font: ctx.boldFont, color: MUTED });
  ctx.page.drawText('Trigger', { x: colX.trigger, y: ctx.y, size: 8.5, font: ctx.boldFont, color: MUTED });
  ctx.page.drawText('Share', { x: colX.pct, y: ctx.y, size: 8.5, font: ctx.boldFont, color: MUTED });
  ctx.page.drawText('Status', { x: colX.status, y: ctx.y, size: 8.5, font: ctx.boldFont, color: MUTED });
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: SOFT_BORDER });
  ctx.y -= 14;

  for (const d of dists) {
    ensureSpace(ctx, 26);
    const labelLines = wrapText(d.label, ctx.font, 9.5, 140);
    ctx.page.drawText(labelLines[0] || 'Tranche', { x: colX.label, y: ctx.y, size: 9.5, font: ctx.boldFont, color: NAVY });
    const trigLines = wrapText(triggerText(d), ctx.font, 9, 200);
    ctx.page.drawText(trigLines[0] || '', { x: colX.trigger, y: ctx.y, size: 9, font: ctx.font, color: TEXT });
    ctx.page.drawText(`${d.percentage}%`, { x: colX.pct, y: ctx.y, size: 9.5, font: ctx.boldFont, color: NAVY });
    const released = d.status === 'released';
    ctx.page.drawText(
      released ? `Released ${fmtMoney(d.releasedAmount || 0, ctx.data.currency)}` : 'Scheduled',
      { x: colX.status, y: ctx.y, size: 8.5, font: ctx.font, color: released ? rgb(0.118, 0.49, 0.251) : MUTED }
    );
    ctx.y -= 14;
    if (trigLines[1]) {
      ctx.page.drawText(trigLines[1], { x: colX.trigger, y: ctx.y, size: 9, font: ctx.font, color: TEXT });
      ctx.y -= 12;
    }
    ctx.y -= 2;
  }
  ctx.y -= 10;
}

function drawClauses(ctx: RenderCtx, title: string, clauses: Array<{ title: string; body: string }>): void {
  ensureSpace(ctx, 24);
  ctx.page.drawText(title, { x: MARGIN, y: ctx.y, size: 9, font: ctx.boldFont, color: GOLD_DARK });
  ctx.y -= 16;
  const maxWidth = PAGE_W - 2 * MARGIN;
  clauses.forEach((c, i) => {
    const lines = wrapText(c.body, ctx.font, 9.5, maxWidth);
    ensureSpace(ctx, 14 + lines.length * 12 + 8);
    ctx.page.drawText(`${i + 1}.  ${c.title}`, { x: MARGIN, y: ctx.y, size: 10.5, font: ctx.boldFont, color: NAVY });
    ctx.y -= 14;
    for (const line of lines) {
      ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 9.5, font: ctx.font, color: TEXT });
      ctx.y -= 12;
    }
    ctx.y -= 8;
  });
}

function drawParagraph(ctx: RenderCtx, title: string | null, text: string): void {
  const lines = wrapText(text, ctx.font, 10, PAGE_W - 2 * MARGIN);
  ensureSpace(ctx, (title ? 16 : 0) + lines.length * 13 + 8);
  if (title) {
    ctx.page.drawText(title, { x: MARGIN, y: ctx.y, size: 9, font: ctx.boldFont, color: GOLD_DARK });
    ctx.y -= 16;
  }
  for (const line of lines) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 10, font: ctx.font, color: TEXT });
    ctx.y -= 13;
  }
  ctx.y -= 8;
}

function drawPageNumbers(ctx: RenderCtx): void {
  if (ctx.pages.length < 2) return;
  ctx.pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${ctx.pages.length}`;
    const w = ctx.font.widthOfTextAtSize(label, 8);
    p.drawText(label, { x: PAGE_W - MARGIN - w, y: PAGE_H - 78, size: 8, font: ctx.font, color: MUTED });
  });
}

async function embedQR(pdfDoc: PDFDocument, verificationUrl: string) {
  const dataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 240,
    color: { dark: '#0d2440', light: '#ffffff' },
  });
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  return pdfDoc.embedPng(bytes);
}

// Documents the settlor executes personally.
const SETTLOR_SIGNED: TrustDocumentType[] = ['deed', 'letter_of_wishes', 'deed_of_revocation'];

function drawFooter(page: PDFPage, font: PDFFont, boldFont: PDFFont, qrImage: any, data: TrustDocumentData) {
  const sigY = 210;
  const sigLineY = sigY - 36;
  const settlorSigned = SETTLOR_SIGNED.includes(data.documentType);

  page.drawText('EXECUTION & AUTHENTICATION', { x: MARGIN, y: sigY, size: 9, font: boldFont, color: GOLD_DARK });

  // Left signature — the Settlor (only for settlor-executed instruments).
  page.drawLine({ start: { x: MARGIN, y: sigLineY }, end: { x: MARGIN + 200, y: sigLineY }, thickness: 0.7, color: NAVY });
  if (settlorSigned) {
    page.drawText(data.settlorName, { x: MARGIN + 4, y: sigLineY + 5, size: 12, font: boldFont, color: NAVY_DEEP });
    page.drawText('Settlor', { x: MARGIN, y: sigLineY - 11, size: 7.5, font, color: TEXT });
  } else {
    page.drawText('Prepared by the Trust Administration Office', { x: MARGIN, y: sigLineY - 11, size: 7.5, font, color: TEXT });
  }
  page.drawText(`Date: ${fmtDate(data.issuedAt)}`, { x: MARGIN, y: sigLineY - 21, size: 7.5, font, color: TEXT });

  // Right signature — the Trustee.
  const rightSigX = PAGE_W - MARGIN - 200;
  page.drawLine({ start: { x: rightSigX, y: sigLineY }, end: { x: rightSigX + 200, y: sigLineY }, thickness: 0.7, color: NAVY });
  page.drawText('Authorised Signatory', { x: rightSigX + 4, y: sigLineY + 5, size: 10, font: boldFont, color: NAVY_DEEP });
  page.drawText('For Aldwych European Capital, as Trustee', { x: rightSigX, y: sigLineY - 11, size: 7.5, font, color: TEXT });
  page.drawText(`Date: ${fmtDate(data.issuedAt)}`, { x: rightSigX, y: sigLineY - 21, size: 7.5, font, color: TEXT });

  // Seal, centered.
  drawSeal(page, font, boldFont, PAGE_W / 2, 78, data.referenceNumber);

  // QR, bottom-right.
  const qrSize = 84;
  const qrX = PAGE_W - MARGIN - qrSize;
  const qrY = 36;
  page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, borderColor: SOFT_BORDER, borderWidth: 0.6, color: rgb(1, 1, 1) });
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText('SCAN TO VERIFY', { x: qrX, y: qrY + qrSize + 6, size: 7, font: boldFont, color: GOLD_DARK });
  page.drawText('aldwycheuropeancapital.com/verify', { x: qrX, y: qrY - 12, size: 6, font, color: TEXT });

  // Reference block, bottom-left.
  page.drawText('SEALED & EXECUTED', { x: MARGIN, y: 96, size: 8, font: boldFont, color: GOLD_DARK });
  page.drawText(`Reference: ${data.referenceNumber}`, { x: MARGIN, y: 84, size: 7, font, color: TEXT });
  page.drawText(`Issued: ${fmtDate(data.issuedAt)}`, { x: MARGIN, y: 74, size: 7, font, color: TEXT });

  page.drawLine({ start: { x: MARGIN, y: 22 }, end: { x: PAGE_W - MARGIN, y: 22 }, thickness: 0.4, color: SOFT_BORDER });
  page.drawText(
    'Aldwych European Capital · 85 Aldwych, London WC2B 4HP · trustees@aldwycheuropeancapital.com · +44 20 3917 8200',
    { x: MARGIN, y: 12, size: 6.5, font, color: MUTED }
  );
  page.drawText('Acting in its capacity as Trustee. This document is the property of Aldwych European Capital.', {
    x: MARGIN,
    y: 4,
    size: 6,
    font,
    color: MUTED,
  });
}

// ── Per-document body renderers ─────────────────────────────────────────────

function partiesRows(data: TrustDocumentData): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['Settlor', data.settlorName],
    ['Trustee', 'Aldwych European Capital'],
    ['Beneficiary', data.beneficiaryName],
    ['Beneficiary D.O.B.', fmtDate(data.beneficiaryDateOfBirth)],
  ];
  if (data.beneficiaryRelationship) rows.push(['Relationship to Settlor', data.beneficiaryRelationship]);
  return rows;
}

function trustFundRows(data: TrustDocumentData): Array<[string, string]> {
  return [
    ['Trust Name', data.trustName],
    ['Trust Fund (Principal)', fmtMoney(data.principalAmount, data.currency)],
    ['Currently Held in Trust', fmtMoney(data.heldBalance, data.currency)],
    ['Funded From', ACCOUNT_LABELS[data.fundingAccount] || data.fundingAccount],
    ['Nature of Trust', data.revocable ? 'Revocable' : 'Irrevocable'],
    ['Date Established', fmtDate(data.fundedAt || data.issuedAt)],
  ];
}

function renderDeed(ctx: RenderCtx): void {
  const d = ctx.data;
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `This Declaration of Trust records that ${d.settlorName} ("the Settlor") has transferred the sum specified below to Aldwych European Capital ("the Trustee") to be held on the trusts and subject to the terms set out in this instrument for the benefit of ${d.beneficiaryName} ("the Beneficiary").`
  );
  drawKeyValueBox(ctx, 'PARTIES', partiesRows(d));
  drawKeyValueBox(ctx, 'THE TRUST FUND', trustFundRows(d));
  drawScheduleTable(ctx);
  drawClauses(ctx, 'TERMS OF THE TRUST', [
    {
      title: 'Constitution of the Trust',
      body: `The Trustee acknowledges receipt of ${fmtMoney(d.principalAmount, d.currency)} (the "Trust Fund") and shall hold the Trust Fund, together with any income and accretions, upon the trusts declared herein.`,
    },
    {
      title: 'Distribution to the Beneficiary',
      body: 'The Trustee shall pay or transfer the Trust Fund to the Beneficiary in the tranches and upon the age or date triggers set out in the Distribution Schedule above. No entitlement to any tranche arises before its stated trigger is reached.',
    },
    {
      title: 'Powers of the Trustee',
      body: 'The Trustee may hold the Trust Fund in cash or invest it in a prudent manner pending distribution, and shall keep proper records and account to the Settlor and the Beneficiary for its administration of the trust.',
    },
    {
      title: d.revocable ? 'Revocation' : 'Irrevocability',
      body: d.revocable
        ? 'This is a revocable trust. The Settlor may revoke it in whole at any time before the Trust Fund is fully distributed, whereupon any undistributed balance shall be returned to the Settlor.'
        : 'This is an irrevocable trust. The Settlor retains no power to revoke, vary or reclaim the Trust Fund, which is held solely for the Beneficiary on the terms stated.',
    },
    {
      title: 'Governing Law',
      body: 'This trust is governed by the laws of England and Wales, and the courts of England and Wales shall have jurisdiction in respect of any matter arising under it.',
    },
  ]);
}

function renderCertificate(ctx: RenderCtx): void {
  const d = ctx.data;
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `Aldwych European Capital certifies that the trust described below has been duly constituted and funded, and is administered by Aldwych European Capital as Trustee for the benefit of ${d.beneficiaryName}.`
  );
  drawKeyValueBox(ctx, 'TRUST PARTICULARS', [
    ['Trust Name', d.trustName],
    ['Trust Reference', d.referenceNumber],
    ['Settlor', d.settlorName],
    ['Beneficiary', d.beneficiaryName],
    ['Trust Fund', fmtMoney(d.principalAmount, d.currency)],
    ['Nature of Trust', d.revocable ? 'Revocable' : 'Irrevocable'],
    ['Date Established', fmtDate(d.fundedAt || d.issuedAt)],
  ]);
  drawScheduleTable(ctx);
  drawParagraph(
    ctx,
    null,
    'The authenticity of this certificate may be confirmed at any time by scanning the verification code below or by contacting the Trust Administration Office quoting the reference above.'
  );
}

function renderFundingReceipt(ctx: RenderCtx): void {
  const d = ctx.data;
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `Aldwych European Capital acknowledges receipt into trust of the funds detailed below from ${d.settlorName}. These funds now form the Trust Fund of "${d.trustName}" and are held by the Trustee for the benefit of ${d.beneficiaryName}.`
  );
  drawKeyValueBox(ctx, 'CONTRIBUTION DETAILS', [
    ['Amount Received', fmtMoney(d.principalAmount, d.currency)],
    ['Received From', `${d.settlorName} — ${ACCOUNT_LABELS[d.fundingAccount] || d.fundingAccount}`],
    ['Date Received', fmtDate(d.fundedAt || d.issuedAt)],
    ['Funding Reference', d.fundingReference || d.referenceNumber],
    ['Trust', `${d.trustName} (${d.referenceNumber})`],
    ['Balance Now Held in Trust', fmtMoney(d.heldBalance, d.currency)],
  ]);
  drawParagraph(
    ctx,
    null,
    'This receipt confirms that the amount stated has been ring-fenced within the trust and will be applied solely in accordance with the trust terms. It is not a demand for payment.'
  );
}

function renderLetterOfWishes(ctx: RenderCtx): void {
  const d = ctx.data;
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `The following expresses the wishes of ${d.settlorName}, the Settlor of "${d.trustName}", to guide the Trustee in administering the trust for ${d.beneficiaryName}. This letter is not legally binding and does not vary the terms of the trust.`
  );
  drawParagraph(ctx, 'THE SETTLOR’S WISHES', d.letterOfWishes && d.letterOfWishes.trim().length > 0
    ? d.letterOfWishes
    : 'The Settlor has not recorded specific wishes. The Trustee shall administer the trust in accordance with the trust deed and in the best interests of the Beneficiary.');
}

function renderDistributionStatement(ctx: RenderCtx): void {
  const d = ctx.data;
  const t = d.releasedTranche;
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `Aldwych European Capital, as Trustee of "${d.trustName}", advises that a distribution has been released to the Beneficiary, ${d.beneficiaryName}, in accordance with the trust's distribution schedule.`
  );
  drawKeyValueBox(ctx, 'DISTRIBUTION DETAILS', [
    ['Beneficiary', d.beneficiaryName],
    ['Milestone', t ? t.label : '—'],
    ['Amount Released', t ? fmtMoney(t.amount, d.currency) : '—'],
    ['Date Released', t ? fmtDate(t.releasedAt) : fmtDate(d.issuedAt)],
    ['Remaining in Trust', fmtMoney(t ? t.remainingBalance : d.heldBalance, d.currency)],
    ['Trust Reference', d.referenceNumber],
  ]);
  drawScheduleTable(ctx);
  drawParagraph(
    ctx,
    null,
    'The amount stated has been paid to the Beneficiary. Any remaining balance continues to be held in trust and will be released as each further milestone is reached.'
  );
}

function renderCompletionStatement(ctx: RenderCtx): void {
  const d = ctx.data;
  const released = (d.distributions || []).filter((x) => x.status === 'released');
  const total = released.reduce((s, x) => s + Number(x.releasedAmount || 0), 0);
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `Aldwych European Capital confirms that the trust "${d.trustName}" has been fully distributed and is now discharged. The final accounting of all distributions made to ${d.beneficiaryName} is set out below.`
  );
  drawKeyValueBox(ctx, 'FINAL ACCOUNTING', [
    ['Trust', `${d.trustName} (${d.referenceNumber})`],
    ['Beneficiary', d.beneficiaryName],
    ['Original Trust Fund', fmtMoney(d.principalAmount, d.currency)],
    ['Total Distributed', fmtMoney(total, d.currency)],
    ['Balance Remaining', fmtMoney(d.heldBalance, d.currency)],
    ['Date Completed', fmtDate(d.completedAt || d.issuedAt)],
  ]);
  drawScheduleTable(ctx);
  drawParagraph(
    ctx,
    null,
    'With the final distribution having been made, the Trustee’s duties in respect of this trust are at an end and the trust is hereby discharged.'
  );
}

function renderDeedOfRevocation(ctx: RenderCtx): void {
  const d = ctx.data;
  drawTitleBlock(ctx);
  drawParagraph(
    ctx,
    null,
    `This deed records that ${d.settlorName}, being the Settlor of the revocable trust "${d.trustName}", has exercised the power of revocation reserved to the Settlor. The trust is hereby revoked and any undistributed balance returned to the Settlor.`
  );
  drawKeyValueBox(ctx, 'REVOCATION DETAILS', [
    ['Trust', `${d.trustName} (${d.referenceNumber})`],
    ['Settlor', d.settlorName],
    ['Beneficiary', d.beneficiaryName],
    ['Amount Returned to Settlor', fmtMoney(d.refundAmount ?? d.heldBalance, d.currency)],
    ['Returned To', ACCOUNT_LABELS[d.fundingAccount] || d.fundingAccount],
    ['Date of Revocation', fmtDate(d.cancelledAt || d.issuedAt)],
  ]);
  if (d.cancellationReason) drawParagraph(ctx, 'REASON', d.cancellationReason);
  drawParagraph(
    ctx,
    null,
    'Upon return of the undistributed balance, the Trustee’s duties in respect of this trust are at an end and the trust is discharged.'
  );
}

const RENDERERS: Record<TrustDocumentType, (ctx: RenderCtx) => void> = {
  deed: renderDeed,
  certificate: renderCertificate,
  funding_receipt: renderFundingReceipt,
  letter_of_wishes: renderLetterOfWishes,
  distribution_statement: renderDistributionStatement,
  completion_statement: renderCompletionStatement,
  deed_of_revocation: renderDeedOfRevocation,
};

export async function generateTrustDocument(data: TrustDocumentData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${DOC_TITLES[data.documentType]} — ${data.referenceNumber}`);
  pdfDoc.setAuthor('Aldwych European Capital');
  pdfDoc.setSubject('Trust Document');
  pdfDoc.setProducer('Aldwych European Capital Document System');
  pdfDoc.setCreator('Aldwych European Capital');
  pdfDoc.setCreationDate(data.issuedAt);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await loadLogoBytes();
  let logoImage: { width: number; height: number; embed: any } | null = null;
  if (logoBytes) {
    try {
      const embed = await pdfDoc.embedPng(logoBytes);
      logoImage = { width: embed.width, height: embed.height, embed };
    } catch (e) {
      console.warn('[trustDocuments] Failed to embed logo:', e);
    }
  }

  const firstPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawWatermark(firstPage, boldFont);
  drawHeader(firstPage, font, boldFont, logoImage, data);

  const ctx: RenderCtx = {
    pdfDoc,
    font,
    boldFont,
    logoImage,
    data,
    page: firstPage,
    y: PAGE_H - 120,
    pages: [firstPage],
  };

  (RENDERERS[data.documentType] || renderCertificate)(ctx);

  const qrImage = await embedQR(pdfDoc, data.verificationUrl);
  drawFooter(ctx.page, font, boldFont, qrImage, data);
  drawPageNumbers(ctx);

  return pdfDoc.save();
}

// Which document types are available for a trust in a given state — used by the
// UI to show the right download buttons.
export function availableTrustDocuments(status: string): TrustDocumentType[] {
  const base: TrustDocumentType[] = ['deed', 'certificate', 'funding_receipt', 'letter_of_wishes'];
  if (status === 'distributing' || status === 'completed') base.push('distribution_statement');
  if (status === 'completed') base.push('completion_statement');
  if (status === 'cancelled') base.push('deed_of_revocation');
  return base;
}

export const TRUST_DOCUMENT_LABELS: Record<TrustDocumentType, string> = {
  deed: 'Declaration of Trust',
  certificate: 'Certificate of Establishment',
  funding_receipt: 'Contribution Receipt',
  letter_of_wishes: 'Letter of Wishes',
  distribution_statement: 'Distribution Statement',
  completion_statement: 'Completion Statement',
  deed_of_revocation: 'Deed of Revocation',
};
