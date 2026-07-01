import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const NAVY = rgb(0.0509, 0.1411, 0.2509);
const NAVY_DEEP = rgb(0.031, 0.094, 0.188);
const GOLD = rgb(0.7882, 0.6627, 0.3843);
const TEXT = rgb(0.2, 0.2, 0.2);
const MUTED = rgb(0.45, 0.45, 0.45);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
const TABLE_HEADER_BG = rgb(0.96, 0.96, 0.96);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const RED = rgb(0.72, 0.2, 0.2);
const GREEN_DARK = rgb(0.063, 0.55, 0.35);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_LEFT = 48;
const MARGIN_RIGHT = 48;
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const HEADER_HEIGHT = 130;
const FOOTER_HEIGHT = 60;

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

const fmtMoney = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: ccy,
    minimumFractionDigits: 2,
  }).format(Math.abs(n));

const fmtMoneyRaw = (n: number, ccy = "USD") => {
  const formatted = fmtMoney(n, ccy);
  return n < 0 ? `-${formatted}` : formatted;
};

const fmtDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

const fmtDateLong = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth)
    t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
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
  const paths = [
    path.join(process.cwd(), "assets", "images", "logo-full.png"),
    path.resolve(__dirname, "..", "assets", "images", "logo-full.png"),
  ];
  for (const p of paths) {
    try {
      return await fs.readFile(p);
    } catch {
      continue;
    }
  }
  return null;
}

function generateDocumentHash(data: StatementData): string {
  const payload = JSON.stringify({
    holder: data.accountHolder.name,
    account: data.account.number,
    period: data.period.label,
    closing: data.summary.closingBalance,
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16).toUpperCase();
}

// Column layout for transaction table (BMO-style)
const COL = {
  date: { x: MARGIN_LEFT, w: 55 },
  desc: { x: MARGIN_LEFT + 55, w: 205 },
  debit: { x: MARGIN_LEFT + 260, w: 100 },
  credit: { x: MARGIN_LEFT + 360, w: 90 },
  balance: { x: MARGIN_LEFT + 450, w: CONTENT_W - 450 + MARGIN_LEFT },
};

interface PageCtx {
  pdf: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  logo: { width: number; height: number; embed: PDFImage } | null;
  data: StatementData;
  docHash: string;
  generatedAt: Date;
}

function drawGoldTopBar(page: PDFPage) {
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 4,
    width: PAGE_W,
    height: 4,
    color: GOLD,
  });
}

function drawHeader(page: PDFPage, ctx: PageCtx, pageNum: number, pageCount: number) {
  const { font, bold, logo, data } = ctx;

  drawGoldTopBar(page);

  // Navy header band
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 4 - 36,
    width: PAGE_W,
    height: 36,
    color: NAVY_DEEP,
  });

  // Product title in header band (right-aligned, like BMO's "Everyday Banking")
  const productTitle = "Private Banking";
  const ptW = bold.widthOfTextAtSize(productTitle, 16);
  page.drawText(productTitle, {
    x: PAGE_W - MARGIN_RIGHT - ptW,
    y: PAGE_H - 30,
    size: 16,
    font: bold,
    color: GOLD,
  });

  // Logo or bank name (left side of header band)
  if (logo) {
    const sw = 120;
    const sh = sw * (logo.height / logo.width);
    page.drawImage(logo.embed, {
      x: MARGIN_LEFT,
      y: PAGE_H - 4 - 36 + (36 - sh) / 2,
      width: sw,
      height: sh,
    });
  } else {
    page.drawText("ALDWYCH EUROPEAN CAPITAL", {
      x: MARGIN_LEFT + 4,
      y: PAGE_H - 28,
      size: 11,
      font: bold,
      color: WHITE,
    });
  }

  // Thin gold line under header band
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 4 - 36 - 1.5,
    width: PAGE_W,
    height: 1.5,
    color: GOLD,
  });

  const infoStartY = PAGE_H - 58;

  // Bank branch address (top-left, below header)
  page.drawText("Your office address:", {
    x: MARGIN_LEFT,
    y: infoStartY,
    size: 7,
    font: bold,
    color: TEXT,
  });
  const branchAddr = data.bankInfo.branchAddress || "Aldwych House, 71-91 Aldwych";
  page.drawText(branchAddr, {
    x: MARGIN_LEFT,
    y: infoStartY - 11,
    size: 8,
    font,
    color: TEXT,
  });
  page.drawText("London WC2B 4HN, United Kingdom", {
    x: MARGIN_LEFT,
    y: infoStartY - 22,
    size: 8,
    font,
    color: TEXT,
  });

  // Customer mailing address (left, lower)
  const addrY = infoStartY - 52;
  page.drawText(data.accountHolder.name.toUpperCase(), {
    x: MARGIN_LEFT + 10,
    y: addrY,
    size: 9,
    font: bold,
    color: TEXT,
  });
  if (data.accountHolder.addressLine1) {
    page.drawText(data.accountHolder.addressLine1.toUpperCase(), {
      x: MARGIN_LEFT + 10,
      y: addrY - 13,
      size: 9,
      font,
      color: TEXT,
    });
  }
  if (data.accountHolder.addressLine2) {
    page.drawText(data.accountHolder.addressLine2.toUpperCase(), {
      x: MARGIN_LEFT + 10,
      y: addrY - 26,
      size: 9,
      font,
      color: TEXT,
    });
  }

  // Right-side info block (BMO-style: branch info, phone, etc.)
  const rightX = PAGE_W - MARGIN_RIGHT - 160;
  let ry = infoStartY;

  page.drawText("Your Office", {
    x: rightX,
    y: ry,
    size: 7.5,
    font: bold,
    color: TEXT,
  });
  ry -= 11;
  page.drawText(data.bankInfo.branchName || "PRIVATE BANKING OFFICE", {
    x: rightX,
    y: ry,
    size: 8,
    font,
    color: TEXT,
  });
  if (data.bankInfo.transitNumber) {
    ry -= 11;
    page.drawText(`Account reference: ${data.bankInfo.transitNumber}`, {
      x: rightX,
      y: ry,
      size: 8,
      font,
      color: TEXT,
    });
  }

  ry -= 18;
  page.drawText("For questions about your", {
    x: rightX,
    y: ry,
    size: 7.5,
    font: bold,
    color: TEXT,
  });
  ry -= 10;
  page.drawText("statement call", {
    x: rightX,
    y: ry,
    size: 7.5,
    font: bold,
    color: TEXT,
  });
  ry -= 11;
  page.drawText(data.bankInfo.phone || "+44 (0)20 7946 0000", {
    x: rightX,
    y: ry,
    size: 8,
    font,
    color: TEXT,
  });

  ry -= 16;
  page.drawText("Online Banking", {
    x: rightX,
    y: ry,
    size: 7.5,
    font: bold,
    color: TEXT,
  });
  ry -= 11;
  page.drawText(data.bankInfo.website || "www.aldwycheuropeancapital.com", {
    x: rightX,
    y: ry,
    size: 8,
    font,
    color: TEXT,
  });

  ry -= 16;
  page.drawText("Your Plan", {
    x: rightX,
    y: ry,
    size: 7.5,
    font: bold,
    color: TEXT,
  });
  ry -= 11;
  page.drawText(data.bankInfo.plan || "Private Banking Premier", {
    x: rightX,
    y: ry,
    size: 8,
    font,
    color: TEXT,
  });
}

function drawStatementTitle(
  page: PDFPage,
  ctx: PageCtx,
  startY: number
): number {
  const { font, bold, data } = ctx;
  let y = startY;

  // Main title (BMO: "Your Everyday Banking statement")
  const title = `Your ${data.account.type} Statement`;
  page.drawText(title, {
    x: MARGIN_LEFT,
    y,
    size: 16,
    font: bold,
    color: BLACK,
  });
  y -= 18;

  // Period subtitle
  page.drawText(`For the period ending ${fmtDateLong(data.period.endDate)}`, {
    x: MARGIN_LEFT,
    y,
    size: 10,
    font,
    color: TEXT,
  });
  y -= 28;

  return y;
}

function drawAccountSummary(
  page: PDFPage,
  ctx: PageCtx,
  startY: number
): number {
  const { font, bold, data } = ctx;
  const ccy = data.account.currency;
  let y = startY;

  // Section heading
  page.drawText("Summary of your account", {
    x: MARGIN_LEFT,
    y,
    size: 13,
    font: bold,
    color: BLACK,
  });
  y -= 24;

  // Summary table header row
  const colWidths = [160, 90, 90, 90, 70];
  const colX = [
    MARGIN_LEFT,
    MARGIN_LEFT + 160,
    MARGIN_LEFT + 250,
    MARGIN_LEFT + 340,
    MARGIN_LEFT + 430,
  ];
  const headerLabels = [
    ["", ""],
    ["Opening", "balance ($)"],
    ["Total amounts", "deducted ($)"],
    ["Total amounts", "added ($)"],
    ["Closing", `balance ($)`],
  ];
  const mathSymbols = ["", "", "-", "+", "="];

  // Column headers (two-line, right-aligned except first)
  for (let i = 1; i < headerLabels.length; i++) {
    const [line1, line2] = headerLabels[i];
    const w1 = font.widthOfTextAtSize(line1, 7.5);
    const w2 = font.widthOfTextAtSize(line2, 7.5);
    const cx = colX[i] + colWidths[i] - 4;
    page.drawText(line1, {
      x: cx - w1,
      y: y + 10,
      size: 7.5,
      font,
      color: TEXT,
    });
    page.drawText(line2, {
      x: cx - w2,
      y: y,
      size: 7.5,
      font,
      color: TEXT,
    });
  }

  // Math symbols between columns
  for (let i = 2; i < mathSymbols.length; i++) {
    if (mathSymbols[i]) {
      page.drawText(mathSymbols[i], {
        x: colX[i] - 8,
        y: y + 4,
        size: 10,
        font: bold,
        color: TEXT,
      });
    }
  }

  // "Account" label
  page.drawText("Account", {
    x: MARGIN_LEFT,
    y: y,
    size: 7.5,
    font: bold,
    color: TEXT,
  });

  y -= 8;

  // Divider line under headers
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_W - MARGIN_RIGHT, y },
    thickness: 1,
    color: BLACK,
  });
  y -= 14;

  // Account row
  const accLabel = `${data.account.name}`;
  const accNum = `# ${data.account.number}`;
  page.drawText(accLabel, {
    x: MARGIN_LEFT,
    y,
    size: 8.5,
    font,
    color: TEXT,
  });
  page.drawText(accNum, {
    x: MARGIN_LEFT,
    y: y - 12,
    size: 8.5,
    font,
    color: TEXT,
  });

  const summaryValues = [
    fmtMoneyRaw(data.summary.openingBalance, ccy),
    fmtMoney(data.summary.totalDebits, ccy),
    fmtMoney(data.summary.totalCredits, ccy),
    fmtMoneyRaw(data.summary.closingBalance, ccy),
  ];

  for (let i = 0; i < summaryValues.length; i++) {
    const val = summaryValues[i];
    const vw = font.widthOfTextAtSize(val, 8.5);
    page.drawText(val, {
      x: colX[i + 1] + colWidths[i + 1] - 4 - vw,
      y: y - 4,
      size: 8.5,
      font,
      color: TEXT,
    });
  }

  y -= 30;

  return y;
}

function drawTransactionTableHeader(
  page: PDFPage,
  ctx: PageCtx,
  startY: number,
  continued = false
): number {
  const { font, bold } = ctx;
  let y = startY;

  // Section heading
  const heading = continued
    ? "Here's what happened in your account (continued)"
    : "Here's what happened in your account";
  page.drawText(heading, {
    x: MARGIN_LEFT,
    y,
    size: 13,
    font: bold,
    color: BLACK,
  });
  y -= 22;

  // Column headers
  const headers = [
    { label: "Date", x: COL.date.x, align: "left" as const },
    { label: "Description", x: COL.desc.x, align: "left" as const },
    {
      label: "Amounts deducted",
      label2: "from your account ($)",
      x: COL.debit.x + COL.debit.w,
      align: "right" as const,
    },
    {
      label: "Amounts added",
      label2: "to your account ($)",
      x: COL.credit.x + COL.credit.w,
      align: "right" as const,
    },
    {
      label: "Balance ($)",
      x: COL.balance.x + COL.balance.w,
      align: "right" as const,
    },
  ];

  for (const h of headers) {
    if (h.align === "right") {
      const w1 = bold.widthOfTextAtSize(h.label, 7.5);
      page.drawText(h.label, {
        x: h.x - w1,
        y: h.label2 ? y + 10 : y + 4,
        size: 7.5,
        font: bold,
        color: TEXT,
      });
      if (h.label2) {
        const w2 = bold.widthOfTextAtSize(h.label2, 7.5);
        page.drawText(h.label2, {
          x: h.x - w2,
          y,
          size: 7.5,
          font: bold,
          color: TEXT,
        });
      }
    } else {
      page.drawText(h.label, {
        x: h.x,
        y: y + 4,
        size: 7.5,
        font: bold,
        color: TEXT,
      });
    }
  }

  y -= 10;

  // Bold line under column headers
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_W - MARGIN_RIGHT, y },
    thickness: 1.5,
    color: BLACK,
  });
  y -= 6;

  return y;
}

function drawAccountSubheader(
  page: PDFPage,
  ctx: PageCtx,
  startY: number,
  continued = false
): number {
  const { font, bold, data } = ctx;
  let y = startY;

  // Account name and number row
  const accLine = `${data.account.name} # ${data.account.number}`;
  page.drawText(accLine, {
    x: COL.desc.x,
    y,
    size: 8.5,
    font: bold,
    color: TEXT,
  });

  if (continued) {
    const contText = "(continued)";
    const cw = font.widthOfTextAtSize(contText, 8.5);
    page.drawText(contText, {
      x: COL.balance.x + COL.balance.w - cw,
      y,
      size: 8.5,
      font,
      color: TEXT,
    });
  }

  y -= 16;

  if (!continued) {
    // Owner line
    page.drawText("Owner:", {
      x: MARGIN_LEFT,
      y,
      size: 8,
      font,
      color: TEXT,
    });
    y -= 12;
    page.drawText(data.accountHolder.name.toUpperCase(), {
      x: MARGIN_LEFT,
      y,
      size: 8.5,
      font: bold,
      color: TEXT,
    });
    y -= 18;
  }

  return y;
}

function drawDottedLine(page: PDFPage, y: number) {
  const startX = MARGIN_LEFT;
  const endX = PAGE_W - MARGIN_RIGHT;
  const dashLen = 1.5;
  const gapLen = 2;
  let x = startX;
  while (x < endX) {
    const segEnd = Math.min(x + dashLen, endX);
    page.drawLine({
      start: { x, y },
      end: { x: segEnd, y },
      thickness: 0.3,
      color: LIGHT_GRAY,
    });
    x = segEnd + gapLen;
  }
}

function drawTransactionRow(
  page: PDFPage,
  ctx: PageCtx,
  tx: StatementTransaction,
  y: number,
  isOpening = false,
  isClosing = false
): number {
  const { font, bold, data } = ctx;
  const ccy = data.account.currency;
  const rowFont = isOpening || isClosing ? bold : font;
  const fontSize = 8.5;

  // Date
  if (!isClosing) {
    page.drawText(fmtDate(tx.date), {
      x: COL.date.x,
      y,
      size: fontSize,
      font: rowFont,
      color: TEXT,
    });
  } else {
    page.drawText(fmtDate(tx.date), {
      x: COL.date.x,
      y,
      size: fontSize,
      font: bold,
      color: TEXT,
    });
  }

  // Description (may wrap)
  const descLines = wrapText(tx.description, rowFont, fontSize, COL.desc.w - 8);
  for (let i = 0; i < descLines.length; i++) {
    page.drawText(descLines[i], {
      x: COL.desc.x,
      y: y - i * 12,
      size: fontSize,
      font: rowFont,
      color: TEXT,
    });
  }

  // Debit amount
  if (tx.debit && tx.debit > 0) {
    const debitStr = fmtMoney(tx.debit, ccy);
    const dw = font.widthOfTextAtSize(debitStr, fontSize);
    page.drawText(debitStr, {
      x: COL.debit.x + COL.debit.w - dw,
      y,
      size: fontSize,
      font: isClosing ? bold : font,
      color: TEXT,
    });
  }

  // Credit amount
  if (tx.credit && tx.credit > 0) {
    const creditStr = fmtMoney(tx.credit, ccy);
    const cw = font.widthOfTextAtSize(creditStr, fontSize);
    page.drawText(creditStr, {
      x: COL.credit.x + COL.credit.w - cw,
      y,
      size: fontSize,
      font: isClosing ? bold : font,
      color: TEXT,
    });
  }

  // Balance (right-aligned)
  if (!isClosing) {
    const balStr = fmtMoneyRaw(tx.balance, ccy);
    const bw = font.widthOfTextAtSize(balStr, fontSize);
    page.drawText(balStr, {
      x: COL.balance.x + COL.balance.w - bw,
      y,
      size: fontSize,
      font: rowFont,
      color: tx.balance < 0 ? RED : TEXT,
    });
  }

  const rowHeight = Math.max(descLines.length * 12, 12) + 8;
  return y - rowHeight;
}

function drawFooter(
  page: PDFPage,
  ctx: PageCtx,
  pageNum: number,
  pageCount: number,
  showContinued = false
) {
  const { font, bold, logo } = ctx;

  if (showContinued) {
    const contText = "continued";
    const cw = font.widthOfTextAtSize(contText, 8);
    page.drawText(contText, {
      x: PAGE_W - MARGIN_RIGHT - cw,
      y: FOOTER_HEIGHT + 16,
      size: 8,
      font,
      color: TEXT,
    });
  }

  // Page number (left)
  page.drawText(`Page ${pageNum} of ${pageCount}`, {
    x: MARGIN_LEFT,
    y: 24,
    size: 8,
    font,
    color: TEXT,
  });

  // Bottom navy bar with bank branding
  page.drawRectangle({
    x: PAGE_W - 200,
    y: 14,
    width: 200 - MARGIN_RIGHT + 20,
    height: 24,
    color: NAVY_DEEP,
  });

  // Gold accent on the bar
  page.drawRectangle({
    x: PAGE_W - 200,
    y: 38,
    width: 200 - MARGIN_RIGHT + 20,
    height: 2,
    color: GOLD,
  });

  // Bank name in footer bar
  const bankName = "Aldwych European Capital";
  const bnW = bold.widthOfTextAtSize(bankName, 8);
  page.drawText(bankName, {
    x: PAGE_W - MARGIN_RIGHT + 20 - 10 - bnW,
    y: 22,
    size: 8,
    font: bold,
    color: WHITE,
  });

  // Bottom gold line
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: 3,
    color: GOLD,
  });
}

function drawDisclaimerAndInfo(
  page: PDFPage,
  ctx: PageCtx,
  startY: number
): number {
  const { font, bold } = ctx;
  let y = startY;

  // Error reporting disclaimer (like BMO)
  const disclaimer =
    "Please report any errors, omissions or irregularities in writing within 30 days of the statement date after which this statement shall be deemed accurate except for any amount credited to your account in error.";
  const lines = wrapText(disclaimer, font, 7.5, CONTENT_W);
  for (const line of lines) {
    page.drawText(line, {
      x: MARGIN_LEFT,
      y,
      size: 7.5,
      font,
      color: TEXT,
    });
    y -= 10;
  }

  y -= 10;

  // Registration numbers
  page.drawText("Registration numbers", {
    x: MARGIN_LEFT,
    y,
    size: 8,
    font: bold,
    color: TEXT,
  });
  y -= 12;
  page.drawText(
    "FCA Registration — 09876543     PRA Registration — AEC/2024/0091",
    {
      x: MARGIN_LEFT,
      y,
      size: 8,
      font,
      color: TEXT,
    }
  );
  y -= 20;

  return y;
}

export async function generateStatementPDF(
  data: StatementData
): Promise<Uint8Array> {
  const generatedAt = new Date();
  const docHash = generateDocumentHash(data);

  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `Account Statement — ${data.accountHolder.name} — ${data.period.label}`
  );
  pdf.setAuthor("Aldwych European Capital — Private Banking");
  pdf.setSubject(`Statement for ${data.account.name} ${data.account.number}`);
  pdf.setProducer("Aldwych European Capital");
  pdf.setCreationDate(generatedAt);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await loadLogoBytes();
  let logo: PageCtx["logo"] = null;
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

  const ctx: PageCtx = { pdf, font, bold, logo, data, docHash, generatedAt };

  // Build all pages
  const pages: PDFPage[] = [];
  let currentPage = pdf.addPage([PAGE_W, PAGE_H]);
  pages.push(currentPage);

  // Page 1: header + summary + start of transactions
  drawHeader(currentPage, ctx, 1, 1); // page count updated later
  let y = PAGE_H - HEADER_HEIGHT - 72;
  y = drawStatementTitle(currentPage, ctx, y);
  y = drawAccountSummary(currentPage, ctx, y);

  // Transaction table
  y -= 8;
  y = drawTransactionTableHeader(currentPage, ctx, y, false);
  y = drawAccountSubheader(currentPage, ctx, y, false);

  // Opening balance row
  if (data.transactions.length > 0) {
    const openingTx: StatementTransaction = {
      date: data.period.startDate,
      description: "Opening balance",
      balance: data.summary.openingBalance,
    };
    y = drawTransactionRow(currentPage, ctx, openingTx, y, true, false);
    drawDottedLine(currentPage, y + 6);
    y -= 2;
  }

  // Transaction rows
  for (let i = 0; i < data.transactions.length; i++) {
    const tx = data.transactions[i];

    // Check if we need a new page
    if (y < FOOTER_HEIGHT + 80) {
      // New page needed
      currentPage = pdf.addPage([PAGE_W, PAGE_H]);
      pages.push(currentPage);

      drawGoldTopBar(currentPage);

      // Continuation header (simpler than page 1)
      y = PAGE_H - 30;
      y = drawTransactionTableHeader(currentPage, ctx, y, true);
      y = drawAccountSubheader(currentPage, ctx, y, true);
    }

    y = drawTransactionRow(currentPage, ctx, tx, y, false, false);
    drawDottedLine(currentPage, y + 6);
    y -= 2;
  }

  // Closing totals row
  if (y < FOOTER_HEIGHT + 60) {
    currentPage = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(currentPage);
    drawGoldTopBar(currentPage);
    y = PAGE_H - 30;
    y = drawTransactionTableHeader(currentPage, ctx, y, true);
    y = drawAccountSubheader(currentPage, ctx, y, true);
  }

  // Separator before closing
  page_drawLine(currentPage, y + 4);
  const closingTx: StatementTransaction = {
    date: data.period.endDate,
    description: "Closing totals",
    debit: data.summary.totalDebits,
    credit: data.summary.totalCredits,
    balance: data.summary.closingBalance,
  };
  y = drawTransactionRow(currentPage, ctx, closingTx, y, false, true);

  y -= 16;

  // Disclaimer
  if (y < FOOTER_HEIGHT + 80) {
    currentPage = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(currentPage);
    drawGoldTopBar(currentPage);
    y = PAGE_H - 40;
  }
  y = drawDisclaimerAndInfo(currentPage, ctx, y);

  // Draw footers on all pages
  const totalPages = pages.length;
  for (let i = 0; i < pages.length; i++) {
    const isLast = i === pages.length - 1;
    drawFooter(pages[i], ctx, i + 1, totalPages, !isLast);
  }

  return await pdf.save();
}

function page_drawLine(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_W - MARGIN_RIGHT, y },
    thickness: 0.8,
    color: BLACK,
  });
}
