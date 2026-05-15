// src/lib/loanDocuments.ts
// Aldwych European Capital — PDF document generator with embossed logo,
// official seal, watermark, and verifiable QR code.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export type LoanDocumentType = 'offer' | 'agreement' | 'disbursement';

export interface LoanDocumentData {
  referenceNumber: string;
  documentType: LoanDocumentType;
  borrowerName: string;
  borrowerAddress?: string;
  loanType: string;
  amount: number;
  termMonths: number;
  interestRate?: number;
  monthlyPayment?: number;
  totalRepayable?: number;
  purpose?: string;
  issuedAt: Date;
  offerExpiry?: Date;
  agreementSignedAt?: Date;
  agreementSignature?: string;
  /** Public verification URL used in the QR code */
  verificationUrl: string;
}

const NAVY = rgb(0.0509, 0.1411, 0.2509); // #0d2440
const NAVY_DEEP = rgb(0.031, 0.094, 0.188); // #081830
const GOLD = rgb(0.7882, 0.6627, 0.3843); // #c9a962
const GOLD_DARK = rgb(0.6588, 0.5764, 0.3725); // #a8935f
const TEXT = rgb(0.2784, 0.3372, 0.4156); // #475569
const MUTED = rgb(0.5803, 0.6392, 0.7215); // #94a3b8
const SOFT_BORDER = rgb(0.886, 0.91, 0.941); // #e2e8f0

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 48;

const LOAN_TYPE_LABELS: Record<string, string> = {
  business: 'Business Loan',
  contractor: 'Contractor Financing',
  sme: 'SME Expansion Loan',
  trade: 'Trade Finance',
  equipment: 'Equipment Financing',
  personal: 'Personal Loan',
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  student: 'Student Loan',
};

const DOC_TITLES: Record<LoanDocumentType, string> = {
  offer: 'LOAN FACILITY OFFER',
  agreement: 'LOAN FACILITY AGREEMENT',
  disbursement: 'DISBURSEMENT CONFIRMATION',
};

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const p = path.join(process.cwd(), 'public', 'images', 'Logo.png');
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

function drawWatermark(page: PDFPage, font: PDFFont) {
  const text = 'ALDWYCH EUROPEAN CAPITAL';
  const size = 64;
  const w = font.widthOfTextAtSize(text, size);
  // Center diagonally across the page
  page.drawText(text, {
    x: PAGE_W / 2 - w / 2.2,
    y: PAGE_H / 2 - 40,
    size,
    font,
    color: GOLD,
    opacity: 0.06,
    rotate: degrees(-30),
  });

  const sub = '· OFFICIAL · GENUINE · VERIFIED ·';
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

/** Draw text characters spaced along an arc, each rotated to remain
 *  tangent to the circle. `arc='top'` reads left→right across the top,
 *  `arc='bottom'` reads left→right across the bottom (characters upright).
 *  `radius` is the baseline radius for the text. */
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
  letterSpacing: number = 0.6
) {
  // Compute total angular span needed.
  const widths = Array.from(text).map((c) => font.widthOfTextAtSize(c, size) + letterSpacing);
  const totalArcLength = widths.reduce((s, w) => s + w, 0);
  const totalAngle = totalArcLength / radius; // radians

  // Center angle (math convention: 0 = +x, π/2 = +y/top).
  // pdf-lib y-axis goes up, so 'top' = +y direction = 90°.
  const centerAngleRad = arc === 'top' ? Math.PI / 2 : -Math.PI / 2;

  // For top arc: characters laid out from left (high angle) to right (low angle) → start at centerAngle + totalAngle/2, then decrement.
  // For bottom arc: characters laid out from left (low angle going down then up) → start at centerAngle - totalAngle/2 then increment.
  let cursor = arc === 'top' ? centerAngleRad + totalAngle / 2 : centerAngleRad - totalAngle / 2;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const charArc = widths[i] / radius;
    const angle = arc === 'top' ? cursor - charArc / 2 : cursor + charArc / 2;

    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);

    // Tangential rotation in degrees:
    // - top arc: rotation = angle - 90°
    // - bottom arc: rotation = angle + 90° (so character reads right-side-up)
    const rotDeg = (angle * 180) / Math.PI + (arc === 'top' ? -90 : 90);

    page.drawText(ch, {
      x: px,
      y: py,
      size,
      font,
      color,
      rotate: degrees(rotDeg),
    });

    if (arc === 'top') cursor -= charArc;
    else cursor += charArc;
  }
}

/** Decorative 8-pointed star drawn with two overlapping rotated squares
 *  rendered as path strokes. Used as separators between top/bottom text. */
function drawStar(
  page: PDFPage,
  cx: number,
  cy: number,
  r: number,
  color: any
) {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 0.8,
      color,
    });
  }
}

/** Draw an ornamental laurel "swirl" pair flanking the monogram. Each side
 *  is a curved line of small dots from a path so it reads as a wreath
 *  flourish without requiring external assets. */
function drawLaurelFlourish(
  page: PDFPage,
  cx: number,
  cy: number,
  color: any
) {
  // Left flourish: arc of small dots
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const angle = Math.PI - t * Math.PI * 0.55;
    const r = 14 + Math.sin(t * Math.PI) * 3;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle) - 3;
    page.drawCircle({ x, y, size: 0.7, color });
  }
  // Right flourish: mirrored
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const angle = t * Math.PI * 0.55;
    const r = 14 + Math.sin(t * Math.PI) * 3;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle) - 3;
    page.drawCircle({ x, y, size: 0.7, color });
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
  const textR = 41; // baseline radius for arc text
  const innerR = 33;
  const coreR = 29;

  // Outer thin ring
  page.drawCircle({ x, y, size: outerR, borderColor: GOLD, borderWidth: 0.7, color: undefined, opacity: 0.9 });
  // Outer bold ring (the main visible rim)
  page.drawCircle({ x, y, size: ringR, borderColor: GOLD, borderWidth: 2, color: undefined, opacity: 0.95 });
  // Inner thin ring (defines the text band)
  page.drawCircle({ x, y, size: innerR, borderColor: GOLD_DARK, borderWidth: 0.7, color: undefined, opacity: 0.85 });
  // Core ring
  page.drawCircle({ x, y, size: coreR, borderColor: GOLD_DARK, borderWidth: 0.5, color: undefined, opacity: 0.6 });
  // Soft tonal fill in the very middle
  page.drawCircle({ x, y, size: coreR - 1, color: GOLD, opacity: 0.05 });

  // Decorative dots just inside the inner ring (only on the sides so they
  // don't clash with the curved text band above and below).
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    // Skip top and bottom regions where text sits
    const inTop = a > Math.PI * 0.25 && a < Math.PI * 0.75;
    const inBottom = a > Math.PI * 1.25 && a < Math.PI * 1.75;
    if (inTop || inBottom) continue;
    const px = x + (innerR - 2) * Math.cos(a);
    const py = y + (innerR - 2) * Math.sin(a);
    page.drawCircle({ x: px, y: py, size: 0.5, color: GOLD_DARK, opacity: 0.75 });
  }

  // Curved top text
  drawArcText(
    page,
    'ALDWYCH EUROPEAN CAPITAL',
    boldFont,
    5.5,
    GOLD_DARK,
    x,
    y,
    textR,
    'top',
    0.4
  );

  // Curved bottom text
  drawArcText(
    page,
    'EST. 1897 · LONDON',
    boldFont,
    5,
    GOLD_DARK,
    x,
    y,
    textR,
    'bottom',
    0.4
  );

  // Side separator stars (between top and bottom text bands)
  drawStar(page, x - textR - 1.5, y, 3, GOLD_DARK);
  drawStar(page, x + textR + 1.5, y, 3, GOLD_DARK);

  // Laurel flourish above monogram
  drawLaurelFlourish(page, x, y, GOLD_DARK);

  // Center monogram — large, bold, navy
  const monogram = 'AEC';
  const monoSize = 15;
  const monoW = boldFont.widthOfTextAtSize(monogram, monoSize);
  page.drawText(monogram, {
    x: x - monoW / 2,
    y: y - 1,
    size: monoSize,
    font: boldFont,
    color: NAVY,
  });

  // Thin underline beneath monogram
  page.drawLine({
    start: { x: x - 12, y: y - 4 },
    end: { x: x + 12, y: y - 4 },
    thickness: 0.6,
    color: GOLD_DARK,
  });

  // "OFFICIAL SEAL" below underline
  const seal = 'OFFICIAL SEAL';
  const sealSize = 4,
    sealW = boldFont.widthOfTextAtSize(seal, sealSize);
  page.drawText(seal, {
    x: x - sealW / 2,
    y: y - 11,
    size: sealSize,
    font: boldFont,
    color: NAVY,
  });

  // Reference number micro-text below seal label
  const refSize = 3.8;
  const refW = font.widthOfTextAtSize(referenceNumber, refSize);
  page.drawText(referenceNumber, {
    x: x - refW / 2,
    y: y - 17,
    size: refSize,
    font,
    color: GOLD_DARK,
  });

  // Tiny center mark dot above monogram
  page.drawCircle({ x, y: y + 9, size: 0.8, color: GOLD_DARK });
}

function drawHeader(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  logoImage: { width: number; height: number; embed: any } | null,
  data: LoanDocumentData
) {
  // Top gold bar
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: GOLD });

  // Embossed faded logo at top-center (behind everything)
  if (logoImage) {
    const w = 220;
    const h = w * (logoImage.height / logoImage.width);
    page.drawImage(logoImage.embed, {
      x: PAGE_W / 2 - w / 2,
      y: PAGE_H / 2 + 200,
      width: w,
      height: h,
      opacity: 0.08,
    });

    // Small visible logo top-left
    const sw = 130;
    const sh = sw * (logoImage.height / logoImage.width);
    page.drawImage(logoImage.embed, {
      x: MARGIN,
      y: PAGE_H - sh - 24,
      width: sw,
      height: sh,
    });
  } else {
    page.drawText('ALDWYCH EUROPEAN CAPITAL', {
      x: MARGIN,
      y: PAGE_H - 38,
      size: 14,
      font: boldFont,
      color: NAVY,
    });
  }

  // Doc meta top-right
  const docTitle = DOC_TITLES[data.documentType];
  const dtWidth = boldFont.widthOfTextAtSize(docTitle, 10);
  page.drawText(docTitle, {
    x: PAGE_W - MARGIN - dtWidth,
    y: PAGE_H - 36,
    size: 10,
    font: boldFont,
    color: GOLD_DARK,
  });

  const refLine = `Reference: ${data.referenceNumber}`;
  const rlWidth = font.widthOfTextAtSize(refLine, 9);
  page.drawText(refLine, {
    x: PAGE_W - MARGIN - rlWidth,
    y: PAGE_H - 50,
    size: 9,
    font,
    color: TEXT,
  });

  const dateLine = `Issued: ${fmtDate(data.issuedAt)}`;
  const dlWidth = font.widthOfTextAtSize(dateLine, 9);
  page.drawText(dateLine, {
    x: PAGE_W - MARGIN - dlWidth,
    y: PAGE_H - 64,
    size: 9,
    font,
    color: TEXT,
  });

  // Separator line
  page.drawLine({
    start: { x: MARGIN, y: PAGE_H - 90 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - 90 },
    thickness: 0.5,
    color: SOFT_BORDER,
  });
}

function drawTitleBlock(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  data: LoanDocumentData,
  yStart: number
): number {
  const title = DOC_TITLES[data.documentType];
  page.drawText(title, {
    x: MARGIN,
    y: yStart,
    size: 20,
    font: boldFont,
    color: NAVY,
  });

  const subtitle =
    data.documentType === 'agreement'
      ? 'Binding agreement between Aldwych European Capital and the borrower'
      : data.documentType === 'offer'
      ? 'Conditional offer of finance — valid for 14 days from issuance'
      : 'Confirmation of disbursement of approved loan facility';

  page.drawText(subtitle, {
    x: MARGIN,
    y: yStart - 18,
    size: 10,
    font,
    color: TEXT,
  });

  return yStart - 44;
}

function drawTermsTable(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  data: LoanDocumentData,
  yStart: number
): number {
  const colLabelX = MARGIN;
  const colValueX = MARGIN + 200;
  const rowH = 22;

  const rows: Array<[string, string]> = [
    ['Borrower', data.borrowerName],
    ['Loan Type', LOAN_TYPE_LABELS[data.loanType] || data.loanType],
    ['Facility Amount', fmtEUR(data.amount)],
    ['Repayment Term', `${data.termMonths} months`],
  ];

  if (data.interestRate !== undefined) rows.push(['Interest Rate (APR)', `${data.interestRate}%`]);
  if (data.monthlyPayment !== undefined) rows.push(['Monthly Payment', fmtEUR(data.monthlyPayment)]);
  if (data.totalRepayable !== undefined) rows.push(['Total Repayable', fmtEUR(data.totalRepayable)]);
  if (data.offerExpiry) rows.push(['Offer Valid Until', fmtDate(data.offerExpiry)]);
  if (data.agreementSignedAt) rows.push(['Agreement Signed', fmtDate(data.agreementSignedAt)]);

  // Section box
  const boxH = rows.length * rowH + 28;
  page.drawRectangle({
    x: MARGIN - 4,
    y: yStart - boxH,
    width: PAGE_W - 2 * MARGIN + 8,
    height: boxH,
    borderColor: SOFT_BORDER,
    borderWidth: 0.6,
    color: rgb(0.984, 0.984, 0.973),
    opacity: 0.6,
  });

  page.drawText('FACILITY DETAILS', {
    x: MARGIN + 4,
    y: yStart - 18,
    size: 9,
    font: boldFont,
    color: GOLD_DARK,
  });

  let y = yStart - 36;
  for (const [label, value] of rows) {
    page.drawText(label, { x: colLabelX + 4, y, size: 10, font, color: TEXT });
    page.drawText(value, { x: colValueX, y, size: 10.5, font: boldFont, color: NAVY });
    y -= rowH;
  }

  return yStart - boxH - 16;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTerms(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  data: LoanDocumentData,
  yStart: number
): number {
  const clauses = [
    {
      title: 'Facility & Disbursement',
      body: `Aldwych European Capital ("the Lender") agrees to provide the Borrower a facility of ${fmtEUR(data.amount)} for the agreed purpose. Funds shall be disbursed to the Borrower's nominated account within 1 business day of agreement execution.`,
    },
    {
      title: 'Repayment',
      body: `The Borrower shall repay the facility over ${data.termMonths} months by monthly instalments of ${data.monthlyPayment !== undefined ? fmtEUR(data.monthlyPayment) : '[as set out in your offer]'}, payable on the same date each calendar month commencing 30 days after disbursement.`,
    },
    {
      title: 'Interest',
      body: `Interest is charged at ${data.interestRate ?? '[rate]'}% APR, fixed for the duration of the facility. The Total Repayable amount of ${data.totalRepayable !== undefined ? fmtEUR(data.totalRepayable) : '[as set out in your offer]'} represents the full cost of borrowing.`,
    },
    {
      title: 'Early Repayment',
      body: 'The Borrower may repay the outstanding balance in full or in part at any time without penalty. Interest is calculated on the daily outstanding balance.',
    },
    {
      title: 'Default',
      body: 'Failure to make scheduled repayments may result in default interest, reporting to credit reference agencies, and legal recovery action. The Lender will provide written notice before commencing formal recovery.',
    },
    {
      title: 'Governing Law',
      body: 'This document is governed by the laws of England and Wales. Disputes are subject to the exclusive jurisdiction of the English courts, save where applicable consumer protection law requires otherwise.',
    },
  ];

  let y = yStart;
  const maxWidth = PAGE_W - 2 * MARGIN;

  page.drawText('TERMS', {
    x: MARGIN,
    y,
    size: 9,
    font: boldFont,
    color: GOLD_DARK,
  });
  y -= 16;

  for (const c of clauses) {
    page.drawText(c.title, { x: MARGIN, y, size: 10.5, font: boldFont, color: NAVY });
    y -= 14;
    const lines = wrapText(c.body, font, 9.5, maxWidth);
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: TEXT });
      y -= 12;
    }
    y -= 6;
  }

  return y;
}

async function embedQR(pdfDoc: PDFDocument, verificationUrl: string) {
  const dataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 240,
    color: { dark: '#0d2440', light: '#ffffff' },
  });
  const base64 = dataUrl.split(',')[1];
  const bytes = Buffer.from(base64, 'base64');
  return pdfDoc.embedPng(bytes);
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  qrImage: any,
  data: LoanDocumentData
) {
  // Signature row label at the top of the footer area.
  const sigY = 210;
  const sigLineY = sigY - 36;

  page.drawText('SIGNATURE & EXECUTION', {
    x: MARGIN,
    y: sigY,
    size: 9,
    font: boldFont,
    color: GOLD_DARK,
  });

  // Borrower (left)
  page.drawLine({
    start: { x: MARGIN, y: sigLineY },
    end: { x: MARGIN + 200, y: sigLineY },
    thickness: 0.7,
    color: NAVY,
  });
  if (data.agreementSignature) {
    page.drawText(data.agreementSignature, {
      x: MARGIN + 4,
      y: sigLineY + 5,
      size: 13,
      font: boldFont,
      color: NAVY_DEEP,
    });
  }
  page.drawText('Borrower Signature', {
    x: MARGIN,
    y: sigLineY - 11,
    size: 7.5,
    font,
    color: TEXT,
  });
  if (data.agreementSignedAt) {
    page.drawText(`Signed: ${fmtDate(data.agreementSignedAt)}`, {
      x: MARGIN,
      y: sigLineY - 21,
      size: 7.5,
      font,
      color: TEXT,
    });
  }

  // Aldwych (right) — pre-signed authorised signatory
  const rightSigX = PAGE_W - MARGIN - 200;
  page.drawLine({
    start: { x: rightSigX, y: sigLineY },
    end: { x: rightSigX + 200, y: sigLineY },
    thickness: 0.7,
    color: NAVY,
  });
  page.drawText('Authorised Signatory', {
    x: rightSigX + 4,
    y: sigLineY + 5,
    size: 10,
    font: boldFont,
    color: NAVY_DEEP,
  });
  page.drawText('For Aldwych European Capital', {
    x: rightSigX,
    y: sigLineY - 11,
    size: 7.5,
    font,
    color: TEXT,
  });
  page.drawText(`Date: ${fmtDate(data.issuedAt)}`, {
    x: rightSigX,
    y: sigLineY - 21,
    size: 7.5,
    font,
    color: TEXT,
  });

  // Seal centered horizontally, positioned below the signature block in
  // its own dedicated band so it reads as a final executed stamp.
  const sealCx = PAGE_W / 2;
  const sealCy = 78;
  drawSeal(page, font, boldFont, sealCx, sealCy, data.referenceNumber);

  // QR code with framed label, bottom-right
  const qrSize = 84;
  const qrX = PAGE_W - MARGIN - qrSize;
  const qrY = 36;
  page.drawRectangle({
    x: qrX - 4,
    y: qrY - 4,
    width: qrSize + 8,
    height: qrSize + 8,
    borderColor: SOFT_BORDER,
    borderWidth: 0.6,
    color: rgb(1, 1, 1),
  });
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText('SCAN TO VERIFY', {
    x: qrX,
    y: qrY + qrSize + 6,
    size: 7,
    font: boldFont,
    color: GOLD_DARK,
  });
  page.drawText('aldwycheuropeancapital.com/verify', {
    x: qrX,
    y: qrY - 12,
    size: 6,
    font,
    color: TEXT,
  });

  // Reference + issuance label bottom-left, mirroring the QR block on the right
  page.drawText('SEALED & EXECUTED', {
    x: MARGIN,
    y: 96,
    size: 8,
    font: boldFont,
    color: GOLD_DARK,
  });
  page.drawText(`Reference: ${data.referenceNumber}`, {
    x: MARGIN,
    y: 84,
    size: 7,
    font,
    color: TEXT,
  });
  page.drawText(`Issued: ${fmtDate(data.issuedAt)}`, {
    x: MARGIN,
    y: 74,
    size: 7,
    font,
    color: TEXT,
  });
  if (data.offerExpiry) {
    page.drawText(`Valid until: ${fmtDate(data.offerExpiry)}`, {
      x: MARGIN,
      y: 64,
      size: 7,
      font,
      color: TEXT,
    });
  }

  // Bottom footer line
  page.drawLine({
    start: { x: MARGIN, y: 22 },
    end: { x: PAGE_W - MARGIN, y: 22 },
    thickness: 0.4,
    color: SOFT_BORDER,
  });

  const footerLine = `Aldwych European Capital · 85 Aldwych, London WC2B 4HP · support@aldwycheuropeancapital.com · +44 20 3917 8200`;
  page.drawText(footerLine, {
    x: MARGIN,
    y: 12,
    size: 6.5,
    font,
    color: MUTED,
  });
  page.drawText('Authorised and regulated. This document is the property of Aldwych European Capital.', {
    x: MARGIN,
    y: 4,
    size: 6,
    font,
    color: MUTED,
  });
}

export async function generateLoanDocument(data: LoanDocumentData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${DOC_TITLES[data.documentType]} — ${data.referenceNumber}`);
  pdfDoc.setAuthor('Aldwych European Capital');
  pdfDoc.setSubject('Loan Facility Document');
  pdfDoc.setProducer('Aldwych European Capital Document System');
  pdfDoc.setCreator('Aldwych European Capital');
  pdfDoc.setCreationDate(data.issuedAt);

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed logo
  const logoBytes = await loadLogoBytes();
  let logoImage = null;
  if (logoBytes) {
    try {
      const embed = await pdfDoc.embedPng(logoBytes);
      logoImage = { width: embed.width, height: embed.height, embed };
    } catch (e) {
      console.warn('[loanDocuments] Failed to embed logo:', e);
    }
  }

  // Draw watermark first so other content sits on top
  drawWatermark(page, boldFont);

  // Header
  drawHeader(page, font, boldFont, logoImage, data);

  // Title
  let y = PAGE_H - 120;
  y = drawTitleBlock(page, font, boldFont, data, y);

  // Terms table
  y = drawTermsTable(page, font, boldFont, data, y);

  // Purpose paragraph
  if (data.purpose) {
    page.drawText('PURPOSE', { x: MARGIN, y, size: 9, font: boldFont, color: GOLD_DARK });
    y -= 14;
    const purposeLines = wrapText(data.purpose, font, 9.5, PAGE_W - 2 * MARGIN);
    for (const line of purposeLines.slice(0, 3)) {
      page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: TEXT });
      y -= 12;
    }
    y -= 8;
  }

  // Terms clauses
  drawTerms(page, font, boldFont, data, y);

  // Footer: signatures, seal, QR
  const qrImage = await embedQR(pdfDoc, data.verificationUrl);
  drawFooter(page, font, boldFont, qrImage, data);

  return pdfDoc.save();
}
