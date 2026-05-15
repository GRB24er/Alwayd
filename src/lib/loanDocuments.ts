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

function drawSeal(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  x: number,
  y: number,
  referenceNumber: string
) {
  const outerR = 52;
  const innerR = 40;

  // Outer ring
  page.drawCircle({ x, y, size: outerR, borderColor: GOLD, borderWidth: 2.5, color: undefined, opacity: 0.85 });
  // Inner ring
  page.drawCircle({ x, y, size: innerR, borderColor: GOLD_DARK, borderWidth: 1, color: undefined, opacity: 0.7 });
  // Subtle fill
  page.drawCircle({ x, y, size: innerR - 2, color: GOLD, opacity: 0.06 });

  // Top arc text
  const topText = 'ALDWYCH EUROPEAN CAPITAL';
  const topSize = 6;
  const topW = boldFont.widthOfTextAtSize(topText, topSize);
  page.drawText(topText, {
    x: x - topW / 2,
    y: y + outerR - 8,
    size: topSize,
    font: boldFont,
    color: GOLD_DARK,
  });

  // Bottom arc text
  const bottomText = 'EST. 1897 · LONDON';
  const bottomSize = 6;
  const bottomW = boldFont.widthOfTextAtSize(bottomText, bottomSize);
  page.drawText(bottomText, {
    x: x - bottomW / 2,
    y: y - outerR + 4,
    size: bottomSize,
    font: boldFont,
    color: GOLD_DARK,
  });

  // Center monogram
  page.drawText('AEC', {
    x: x - 13,
    y: y + 4,
    size: 16,
    font: boldFont,
    color: NAVY,
  });

  // "OFFICIAL SEAL" under monogram
  const seal = 'OFFICIAL SEAL';
  const sealSize = 5;
  const sealW = boldFont.widthOfTextAtSize(seal, sealSize);
  page.drawText(seal, {
    x: x - sealW / 2,
    y: y - 8,
    size: sealSize,
    font: boldFont,
    color: NAVY,
  });

  // Reference under seal
  const refSize = 5;
  const refW = font.widthOfTextAtSize(referenceNumber, refSize);
  page.drawText(referenceNumber, {
    x: x - refW / 2,
    y: y - 18,
    size: refSize,
    font,
    color: GOLD_DARK,
  });
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
  const footerY = 130;

  // Signature block (left)
  page.drawText('SIGNATURE & EXECUTION', {
    x: MARGIN,
    y: footerY,
    size: 9,
    font: boldFont,
    color: GOLD_DARK,
  });

  page.drawLine({
    start: { x: MARGIN, y: footerY - 36 },
    end: { x: MARGIN + 220, y: footerY - 36 },
    thickness: 0.7,
    color: NAVY,
  });

  if (data.agreementSignature) {
    page.drawText(data.agreementSignature, {
      x: MARGIN + 4,
      y: footerY - 22,
      size: 14,
      font: boldFont,
      color: NAVY_DEEP,
    });
  }

  page.drawText('Borrower Signature', {
    x: MARGIN,
    y: footerY - 48,
    size: 8,
    font,
    color: TEXT,
  });

  if (data.agreementSignedAt) {
    page.drawText(`Signed: ${fmtDate(data.agreementSignedAt)}`, {
      x: MARGIN,
      y: footerY - 60,
      size: 8,
      font,
      color: TEXT,
    });
  }

  // For the Lender — pre-signed
  page.drawText('For Aldwych European Capital', {
    x: MARGIN + 260,
    y: footerY - 48,
    size: 8,
    font,
    color: TEXT,
  });
  page.drawLine({
    start: { x: MARGIN + 260, y: footerY - 36 },
    end: { x: MARGIN + 460, y: footerY - 36 },
    thickness: 0.7,
    color: NAVY,
  });
  page.drawText('Authorised Signatory', {
    x: MARGIN + 264,
    y: footerY - 22,
    size: 11,
    font: boldFont,
    color: NAVY_DEEP,
  });
  page.drawText(`Date: ${fmtDate(data.issuedAt)}`, {
    x: MARGIN + 260,
    y: footerY - 60,
    size: 8,
    font,
    color: TEXT,
  });

  // QR code bottom-right
  const qrSize = 80;
  page.drawImage(qrImage, {
    x: PAGE_W - MARGIN - qrSize,
    y: 36,
    width: qrSize,
    height: qrSize,
  });

  page.drawText('Scan to verify', {
    x: PAGE_W - MARGIN - qrSize,
    y: 30,
    size: 7,
    font: boldFont,
    color: GOLD_DARK,
  });
  page.drawText('this document', {
    x: PAGE_W - MARGIN - qrSize,
    y: 22,
    size: 7,
    font,
    color: TEXT,
  });

  // Seal mid-bottom
  drawSeal(page, font, boldFont, PAGE_W / 2 - 30, 76, data.referenceNumber);

  // Bottom footer line
  page.drawLine({
    start: { x: MARGIN, y: 14 },
    end: { x: PAGE_W - MARGIN, y: 14 },
    thickness: 0.4,
    color: SOFT_BORDER,
  });

  const footerLine = `Aldwych European Capital · 85 Aldwych, London WC2B 4HP · support@aldwycheuropeancapital.com · +44 20 3917 8200`;
  page.drawText(footerLine, {
    x: MARGIN,
    y: 4,
    size: 6.5,
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
