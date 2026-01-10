// src/lib/mail.ts - ALDWYCH EUROPEAN CAPITAL - HOSTINGER SMTP
import nodemailer, { Transporter, SentMessageInfo } from "nodemailer";

/** ==============================
 * HOSTINGER SMTP CONFIGURATION
 * ============================== */
const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SMTP_SECURE = true;
const SMTP_USER = "support@aldwycheuropeancapital.com";
const SMTP_PASS = "Valmont15#Benjamin2010";

// Brand Configuration
const BRAND_NAME = "Aldwych European Capital";
const BRAND_SHORT = "Aldwych Capital";
const BRAND_DOMAIN = "aldwychcapital.com";
const BRAND_TAGLINE = "European Private Banking Excellence";
const BRAND_YEAR_FOUNDED = "1897";

// Brand Colors
const BRAND_COLORS = {
  gold: "#c9a962",
  goldDark: "#a8935f",
  goldLight: "#d4b978",
  navy: "#1a1f2e",
  navyLight: "#252b3d",
  cream: "#faf9f7",
  white: "#ffffff",
  textPrimary: "#1a1f2e",
  textSecondary: "#5a6170",
  textMuted: "#8a8f9c",
  success: "#10b981",
  successDark: "#047857",
  warning: "#f59e0b",
  warningDark: "#92400e",
  error: "#ef4444",
  errorDark: "#dc2626",
};

// Email Configuration
const FROM_DISPLAY = `${BRAND_NAME} <${SMTP_USER}>`;
const ENVELOPE_FROM = SMTP_USER;
const REPLY_TO = SMTP_USER;
const SUPPORT_EMAIL = `support@${BRAND_DOMAIN}`;
const LIST_UNSUBSCRIBE = `<mailto:${SMTP_USER}?subject=Unsubscribe>`;

// Connection Pool Settings
const POOL_CONFIG = {
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 10,
};

// Timeout Settings
const TIMEOUT_CONFIG = {
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
};

let cachedTransporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    ...POOL_CONFIG,
    ...TIMEOUT_CONFIG,
    logger: false,
    debug: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
  });

  try {
    if (cachedTransporter) {
      await cachedTransporter.verify();
      console.log("[mail] ✅ Hostinger SMTP connection verified successfully");
    }
  } catch (err) {
    console.error("[mail] ❌ Hostinger SMTP verification failed:", err);
  }

  return cachedTransporter as Transporter;
}

/** ==============================
 * EMAIL TEMPLATE HELPERS
 * ============================== */
function getEmailHeader(title: string, subtitle?: string): string {
  return `
    <div style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.navyLight} 100%); padding: 40px 30px; text-align: center; border-bottom: 4px solid ${BRAND_COLORS.gold};">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.gold}; letter-spacing: 0.05em;">${BRAND_NAME.toUpperCase()}</h1>
      <p style="margin: 8px 0 0; font-size: 12px; color: rgba(255,255,255,0.7); letter-spacing: 0.15em; text-transform: uppercase;">${BRAND_TAGLINE}</p>
      ${subtitle ? `<p style="margin: 20px 0 0; font-size: 18px; color: ${BRAND_COLORS.white}; font-weight: 600;">${title}</p>` : ''}
      ${subtitle ? `<p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">${subtitle}</p>` : `<p style="margin: 20px 0 0; font-size: 20px; color: ${BRAND_COLORS.white}; font-weight: 600;">${title}</p>`}
    </div>
  `;
}

function getEmailFooter(): string {
  const year = new Date().getFullYear();
  return `
    <div style="background: ${BRAND_COLORS.navy}; padding: 30px; text-align: center; border-top: 1px solid rgba(201,169,98,0.3);">
      <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: ${BRAND_COLORS.gold};">${BRAND_NAME}</p>
      <p style="margin: 0 0 5px; font-size: 12px; color: rgba(255,255,255,0.6);">European Private Banking Since ${BRAND_YEAR_FOUNDED}</p>
      <p style="margin: 0 0 15px; font-size: 12px; color: rgba(255,255,255,0.5);">Authorised and regulated by the Financial Conduct Authority</p>
      <div style="margin: 15px 0; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.4);">
          This is an automated message from ${BRAND_NAME}. Please do not reply directly to this email.
        </p>
      </div>
      <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.4);">
        © ${year} ${BRAND_NAME}. All rights reserved.
      </p>
    </div>
  `;
}

function getEmailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${BRAND_NAME}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.cream}; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.textPrimary};">
      <div style="max-width: 600px; margin: 0 auto; background-color: ${BRAND_COLORS.white}; box-shadow: 0 4px 24px rgba(26,31,46,0.12);">
        ${content}
      </div>
    </body>
    </html>
  `;
}

/** ==============================
 * TRANSACTION HELPERS
 * ============================== */
type TxLike = {
  _id?: any;
  userId?: any;
  reference?: string;
  type?: string;
  currency?: string;
  amount?: number | string;
  description?: string;
  status?: string;
  date?: Date | string;
  accountType?: "checking" | "savings" | "investment" | string;
  posted?: boolean;
  postedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  channel?: string;
  origin?: string;
  editedDateByAdmin?: boolean;
  toObject?: () => any;
};

type NormalizedTx = {
  _id: string;
  userId: string;
  reference: string;
  type: string;
  currency: string;
  amount: number;
  description: string;
  status: string;
  date: Date;
  accountType: "checking" | "savings" | "investment" | string;
  posted: boolean;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  channel?: string;
  origin?: string;
  editedDateByAdmin: boolean;
};

function toDate(val: any, fallback = new Date()): Date {
  const d = val instanceof Date ? val : new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
}

function normalizeTx(input: TxLike): NormalizedTx {
  const raw = typeof input?.toObject === "function" ? (input.toObject() as TxLike) : input;

  return {
    _id: String(raw._id ?? ""),
    userId: String(raw.userId ?? ""),
    reference: String(raw.reference ?? ""),
    type: String(raw.type ?? "deposit"),
    currency: String(raw.currency ?? "USD"),
    amount:
      typeof raw.amount === "string"
        ? Number(raw.amount.replace(/[^\d.-]/g, "")) || 0
        : Number(raw.amount ?? 0),
    description: String(raw.description ?? "Bank transaction"),
    status: String(raw.status ?? "pending"),
    date: toDate(raw.date),
    accountType: (raw.accountType as any) ?? "checking",
    posted: Boolean(raw.posted ?? false),
    postedAt: raw.postedAt ? toDate(raw.postedAt) : null,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    channel: raw.channel,
    origin: raw.origin,
    editedDateByAdmin: Boolean(raw.editedDateByAdmin ?? false),
  };
}

function statusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "completed") return "Completed";
  if (s === "pending_verification") return "Pending Verification";
  if (s === "rejected") return "Rejected";
  if (s === "processing") return "Processing";
  return "Pending";
}

function getStatusColors(label: string): { bg: string; text: string } {
  switch (label) {
    case "Completed":
      return { bg: "#dcfce7", text: "#166534" };
    case "Rejected":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "Processing":
      return { bg: "#dbeafe", text: "#1e40af" };
    default:
      return { bg: "#fef3c7", text: "#92400e" };
  }
}

function isCredit(type: string): boolean {
  const t = (type || "").toLowerCase();
  return t.includes("deposit") || t.includes("transfer-in") || t.includes("interest") || t.includes("adjustment-credit") || t.includes("credit");
}

function isDebit(type: string): boolean {
  const t = (type || "").toLowerCase();
  return t.includes("withdraw") || t.includes("transfer-out") || t.includes("fee") || t.includes("adjustment-debit") || t.includes("debit");
}

function fmtAmount(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  }
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** ==============================
 * CORE SENDER WITH RETRIES
 * ============================== */
const TRANSIENT_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ESOCKET",
  "EPIPE",
  "ENOTFOUND",
  "EHOSTUNREACH",
]);

async function sendWithRetry(
  options: Parameters<Transporter["sendMail"]>[0],
  maxAttempts = 3
): Promise<SentMessageInfo & { failed?: boolean; error?: string; skipped?: boolean }> {
  const transporter = await getTransporter();
  let attempt = 0;
  let lastErr: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const info = await transporter.sendMail(options);
      console.log(`[mail] ✅ Email sent (attempt ${attempt}/${maxAttempts}): ${info.messageId}`);
      return info;
    } catch (err: any) {
      lastErr = err;
      const code = err?.code || err?.responseCode || "";
      const message = err?.message || String(err);
      const transient =
        TRANSIENT_CODES.has(code) ||
        /timed?out/i.test(message) ||
        /connection.*closed/i.test(message);

      console.warn(`[mail] ⚠️ Send attempt ${attempt} failed:`, {
        code,
        message: message.substring(0, 200),
        transient,
      });

      if (
        /EAUTH|ENVELOPE|EENVELOPE|EADDR/i.test(code) ||
        /auth/i.test(message) ||
        /invalid.*recipient/i.test(message) ||
        /user.*not.*found/i.test(message)
      ) {
        console.error("[mail] ❌ Permanent error, not retrying");
        break;
      }

      if (attempt < maxAttempts && transient) {
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[mail] 🔄 Retrying in ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }

  console.error("[mail] ❌ Final failure:", lastErr?.code || "", lastErr?.message || lastErr);

  return {
    accepted: [],
    rejected: [options.to].flat(),
    envelope: { from: ENVELOPE_FROM, to: options.to as any },
    messageId: "FAILED-" + Date.now(),
    failed: true,
    error: lastErr?.message || String(lastErr),
    response: lastErr?.response || undefined,
  } as any;
}

/** ==============================
 * PUBLIC APIs - ALL EXPORTS
 * ============================== */

// 1) Transaction Email
export async function sendTransactionEmail(
  to: string | string[],
  args: { name?: string; transaction: TxLike }
) {
  const recipientList = Array.isArray(to) ? to : [to].filter(Boolean);
  if (recipientList.length === 0) {
    console.warn("[mail] No recipients provided");
    return {
      accepted: [],
      rejected: [],
      skipped: true as const,
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now(),
    };
  }

  const tx = normalizeTx(args.transaction);
  const label = statusLabel(tx.status);
  const statusColors = getStatusColors(label);
  const signedAmount = (isCredit(tx.type) ? "+" : isDebit(tx.type) ? "-" : "") + fmtAmount(tx.amount, tx.currency);
  const amountColor = isCredit(tx.type) ? BRAND_COLORS.success : BRAND_COLORS.error;
  const subject = `Transaction ${label}: ${tx.description || tx.type} ${signedAmount}`;
  const greetingName = args.name || "Valued Client";

  const content = `
    ${getEmailHeader("Transaction Notification", `Your transaction is now ${label.toLowerCase()}`)}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${greetingName},</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        We are writing to confirm that a recent transaction on your account has been processed. Please find the details below.
      </p>
      
      <div style="background: ${BRAND_COLORS.cream}; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid rgba(201,169,98,0.2);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Reference</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 600; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">${tx.reference || String(tx._id)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Description</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">${tx.description}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Type</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; text-transform: capitalize; border-bottom: 1px solid rgba(201,169,98,0.15);">${tx.type.replace(/-/g, " ")}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Amount</td>
            <td style="padding: 12px 0; font-weight: 700; font-size: 20px; text-align: right; color: ${amountColor}; border-bottom: 1px solid rgba(201,169,98,0.15);">${signedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Status</td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">
              <span style="display: inline-block; padding: 6px 16px; background: ${statusColors.bg}; color: ${statusColors.text}; border-radius: 20px; font-size: 13px; font-weight: 600;">${label}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Date & Time</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">${fmtDate(tx.date)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Account</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; text-transform: capitalize;">${tx.accountType} Account</td>
          </tr>
        </table>
      </div>
      
      <div style="background: linear-gradient(135deg, rgba(201,169,98,0.1) 0%, rgba(201,169,98,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.gold}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.textPrimary};">Security Notice:</strong> If you did not authorize this transaction, please contact our Private Client Services immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a> or call our 24/7 concierge line.
        </p>
      </div>
      
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        Thank you for banking with ${BRAND_NAME}.
      </p>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear ${greetingName},

We are writing to confirm that a recent transaction on your account has been processed.

TRANSACTION DETAILS
-------------------
Reference: ${tx.reference || String(tx._id)}
Description: ${tx.description}
Type: ${tx.type}
Amount: ${signedAmount}
Status: ${label}
Date & Time: ${fmtDate(tx.date)}
Account: ${tx.accountType}

SECURITY NOTICE
If you did not authorize this transaction, please contact our Private Client Services immediately at ${SUPPORT_EMAIL}.

Thank you for banking with ${BRAND_NAME}.

---
${BRAND_NAME}
European Private Banking Since ${BRAND_YEAR_FOUNDED}
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: recipientList },
      to: recipientList,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Transaction-Reference": tx.reference || String(tx._id),
        "X-Transaction-Type": String(tx.type),
        "X-Transaction-Status": label,
        "X-Priority": "2",
      },
    },
    3
  );
}

// 2) Welcome Email
export async function sendWelcomeEmail(to: string, opts?: any) {
  try {
    const name = (opts?.name as string) || "Valued Client";
    const subject = `Welcome to ${BRAND_NAME}`;

    const content = `
      ${getEmailHeader("Welcome to Private Banking", "Your journey to financial excellence begins")}
      <div style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${name},</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
          On behalf of the entire team at ${BRAND_NAME}, I am delighted to welcome you to our distinguished family of private banking clients.
        </p>
        <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
          Since ${BRAND_YEAR_FOUNDED}, we have been privileged to serve discerning individuals and families who demand excellence in their financial affairs. Your trust in choosing us as your private banking partner is something we do not take lightly.
        </p>
        
        <div style="background: ${BRAND_COLORS.cream}; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid rgba(201,169,98,0.2);">
          <h3 style="margin: 0 0 20px; font-size: 18px; color: ${BRAND_COLORS.navy}; font-weight: 700;">Your Private Banking Benefits</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 12px 0; vertical-align: top; width: 30px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">Dedicated Relationship Manager</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Your personal point of contact for all banking matters</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">24/7 Concierge Service</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Round-the-clock assistance for urgent matters</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">Preferential Rates & Terms</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Exclusive pricing on all banking services</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">Global Portfolio Access</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Manage your wealth from anywhere in the world</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://${BRAND_DOMAIN}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); color: ${BRAND_COLORS.navy}; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(201,169,98,0.3);">
            Access Your Portfolio
          </a>
        </div>
        
        <p style="margin: 30px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          Should you have any questions or require assistance, please do not hesitate to contact your dedicated relationship manager or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>.
        </p>
        
        <p style="margin: 30px 0 0; font-size: 14px; color: ${BRAND_COLORS.textPrimary};">
          With warm regards,<br><br>
          <strong>The Private Banking Team</strong><br>
          <span style="color: ${BRAND_COLORS.gold};">${BRAND_NAME}</span>
        </p>
      </div>
      ${getEmailFooter()}
    `;

    const text = `
Dear ${name},

Welcome to ${BRAND_NAME}

On behalf of the entire team, I am delighted to welcome you to our distinguished family of private banking clients.

Since ${BRAND_YEAR_FOUNDED}, we have been privileged to serve discerning individuals and families who demand excellence in their financial affairs.

YOUR PRIVATE BANKING BENEFITS
- Dedicated Relationship Manager
- 24/7 Concierge Service
- Preferential Rates & Terms
- Global Portfolio Access

Should you have any questions, please contact us at ${SUPPORT_EMAIL}.

With warm regards,
The Private Banking Team
${BRAND_NAME}

---
${BRAND_NAME}
European Private Banking Since ${BRAND_YEAR_FOUNDED}
© ${new Date().getFullYear()} All rights reserved.
    `.trim();

    return sendWithRetry(
      {
        from: FROM_DISPLAY,
        replyTo: REPLY_TO,
        envelope: { from: ENVELOPE_FROM, to: [to] },
        to,
        subject,
        text,
        html: getEmailWrapper(content),
        headers: {
          "List-Unsubscribe": LIST_UNSUBSCRIBE,
          "X-Priority": "3",
        },
      },
      3
    );
  } catch (error) {
    console.error("[mail] sendWelcomeEmail error:", error);
    return {
      accepted: [],
      rejected: [to],
      messageId: "FAILED-" + Date.now(),
      failed: true,
      error: String(error),
    } as any;
  }
}

// 3) OTP Email
export async function sendOTPEmail(
  to: string,
  code: string,
  type: string,
  expiryMinutes: number = 10
) {
  const typeLabels: Record<string, string> = {
    login: "Login Verification",
    transfer: "Transfer Authorization",
    profile_update: "Profile Update Verification",
    card_application: "Card Application",
    password_reset: "Password Reset",
    transaction_approval: "Transaction Approval",
    wire_transfer: "Wire Transfer Authorization",
    beneficiary_add: "Beneficiary Authorization",
  };

  const typeLabel = typeLabels[type] || "Verification";
  const subject = `${BRAND_SHORT} - ${typeLabel} Code: ${code}`;
  const expiryTime = new Date(Date.now() + expiryMinutes * 60000);

  const content = `
    ${getEmailHeader("Verification Code", typeLabel)}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear Valued Client,</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        You have requested a verification code for <strong>${typeLabel.toLowerCase()}</strong>. Please use the code below to proceed with your request.
      </p>
      
      <div style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.navyLight} 100%); border-radius: 16px; padding: 40px; margin: 30px 0; text-align: center; border: 2px solid ${BRAND_COLORS.gold};">
        <p style="margin: 0 0 15px; font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.15em;">Your Verification Code</p>
        <p style="margin: 0; font-size: 48px; font-weight: 800; color: ${BRAND_COLORS.gold}; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</p>
        <p style="margin: 20px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
          Valid until <strong style="color: ${BRAND_COLORS.gold};">${expiryTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong>
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.error}; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
        <p style="margin: 0 0 15px; font-size: 15px; font-weight: 700; color: ${BRAND_COLORS.errorDark};">⚠️ Security Warning</p>
        <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.textSecondary}; font-size: 14px;">
          <li style="margin-bottom: 8px;"><strong>Never share</strong> this code with anyone, including bank staff</li>
          <li style="margin-bottom: 8px;">${BRAND_NAME} will <strong>never</strong> ask for this code via phone, SMS, or email</li>
          <li style="margin-bottom: 8px;">This code expires in <strong>${expiryMinutes} minutes</strong></li>
          <li>If you did not request this code, please <strong>ignore this email</strong> and contact us immediately</li>
        </ul>
      </div>
      
      <div style="background: ${BRAND_COLORS.cream}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid rgba(201,169,98,0.2);">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.textPrimary};">Need assistance?</strong> Contact our Private Client Services at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a> or call our 24/7 concierge line.
        </p>
      </div>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear Valued Client,

${typeLabel.toUpperCase()}

You have requested a verification code for ${typeLabel.toLowerCase()}.

Your verification code is: ${code}

This code expires at ${expiryTime.toLocaleTimeString()}.

SECURITY WARNING
- Never share this code with anyone, including bank staff
- ${BRAND_NAME} will never ask for this code via phone, SMS, or email
- This code expires in ${expiryMinutes} minutes
- If you did not request this code, please ignore this email and contact us immediately

Need assistance? Contact us at ${SUPPORT_EMAIL}

---
${BRAND_NAME}
European Private Banking Since ${BRAND_YEAR_FOUNDED}
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "1",
        "X-OTP-Type": type,
        "X-OTP-Expiry": expiryTime.toISOString(),
      },
    },
    3
  );
}

// 4) Bank Statement Email
export async function sendBankStatementEmail(
  to: string,
  optsOrBuffer?: any,
  filename?: string,
  name?: string,
  periodStart?: any,
  periodEnd?: any
) {
  let attachment: { filename: string; content: any } | undefined;
  let periodText = "";
  let displayName = name || "Valued Client";

  if (optsOrBuffer && (optsOrBuffer instanceof Buffer || typeof (optsOrBuffer as any)?.byteLength === "number")) {
    attachment = { filename: filename || "statement.pdf", content: optsOrBuffer };
    if (periodStart && periodEnd) {
      periodText = `${new Date(periodStart).toLocaleDateString("en-GB")} - ${new Date(periodEnd).toLocaleDateString("en-GB")}`;
    }
  } else if (optsOrBuffer && typeof optsOrBuffer === "object") {
    displayName = optsOrBuffer.name || displayName;
    periodText = optsOrBuffer.periodText || periodText;
    if (optsOrBuffer.attachmentBuffer) {
      attachment = {
        filename: optsOrBuffer.attachmentFilename || "statement.pdf",
        content: optsOrBuffer.attachmentBuffer,
      };
    }
  }

  const subject = `${BRAND_SHORT} - Account Statement${periodText ? ` (${periodText})` : ""}`;

  const content = `
    ${getEmailHeader("Account Statement", periodText || "Your latest statement is ready")}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${displayName},</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        Please find attached your account statement${periodText ? ` for the period ${periodText}` : ""}. This document provides a comprehensive summary of all transactions and account activity.
      </p>
      
      <div style="background: ${BRAND_COLORS.cream}; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid rgba(201,169,98,0.2); text-align: center;">
        <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 12px; line-height: 60px; margin-bottom: 15px;">
          <span style="font-size: 28px;">📄</span>
        </div>
        <p style="margin: 0 0 5px; font-size: 16px; font-weight: 700; color: ${BRAND_COLORS.textPrimary};">Statement Attached</p>
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">${attachment?.filename || "statement.pdf"}</p>
      </div>
      
      <div style="background: linear-gradient(135deg, rgba(201,169,98,0.1) 0%, rgba(201,169,98,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.gold}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.textPrimary};">Important:</strong> Please review your statement carefully. If you notice any discrepancies or have questions, contact your dedicated relationship manager or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>.
        </p>
      </div>
      
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        Thank you for banking with ${BRAND_NAME}.
      </p>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear ${displayName},

ACCOUNT STATEMENT${periodText ? ` - ${periodText}` : ""}

Please find attached your account statement${periodText ? ` for the period ${periodText}` : ""}. This document provides a comprehensive summary of all transactions and account activity.

Please review your statement carefully. If you notice any discrepancies or have questions, contact us at ${SUPPORT_EMAIL}.

Thank you for banking with ${BRAND_NAME}.

---
${BRAND_NAME}
European Private Banking Since ${BRAND_YEAR_FOUNDED}
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html: getEmailWrapper(content),
      attachments: attachment ? [attachment] : undefined,
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "3",
      },
    },
    3
  );
}

// 5) Password Reset Email
export async function sendPasswordResetEmail(to: string, resetLink: string, name?: string) {
  const displayName = name || "Valued Client";
  const subject = `${BRAND_SHORT} - Password Reset Request`;

  const content = `
    ${getEmailHeader("Password Reset", "Secure your account")}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${displayName},</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        We received a request to reset the password for your ${BRAND_NAME} account. Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); color: ${BRAND_COLORS.navy}; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(201,169,98,0.3);">
          Reset Password
        </a>
      </div>
      
      <p style="margin: 20px 0; font-size: 13px; color: ${BRAND_COLORS.textMuted}; text-align: center;">
        This link will expire in 1 hour for security reasons.
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.error}; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.errorDark};">Did not request this?</strong><br>
          If you did not request a password reset, please ignore this email or contact our security team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>. Your account remains secure.
        </p>
      </div>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear ${displayName},

PASSWORD RESET REQUEST

We received a request to reset the password for your ${BRAND_NAME} account.

Click the link below to create a new password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email or contact our security team at ${SUPPORT_EMAIL}.

---
${BRAND_NAME}
European Private Banking Since ${BRAND_YEAR_FOUNDED}
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "1",
      },
    },
    3
  );
}

// 6) Simple Email Utility
export async function sendSimpleEmail(
  to: string | string[],
  subject: string,
  text: string,
  html?: string
) {
  const recipientList = Array.isArray(to) ? to : [to].filter(Boolean);
  if (recipientList.length === 0) {
    return {
      accepted: [],
      rejected: [],
      skipped: true as const,
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now(),
    };
  }

  const content = `
    ${getEmailHeader("Message from " + BRAND_SHORT)}
    <div style="padding: 40px 30px;">
      <div style="font-size: 15px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.8;">
        ${html || text.replace(/\n/g, "<br>")}
      </div>
    </div>
    ${getEmailFooter()}
  `;

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: recipientList },
      to: recipientList,
      subject: `${BRAND_SHORT} - ${subject}`,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "3",
      },
    },
    3
  );
}

// 7) Export Transporter Proxy
export const transporter = {
  async sendMail(options: Parameters<Transporter["sendMail"]>[0]) {
    try {
      const t = await getTransporter();
      return await t.sendMail(options);
    } catch (error) {
      console.error("[mail] transporter.sendMail error:", error);
      return {
        accepted: [],
        rejected: [options.to].flat(),
        messageId: "FAILED-" + Date.now(),
        failed: true,
        error: String(error),
      } as any;
    }
  },
};

// 8) Test SMTP Connection
export async function testSMTPConnection(): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    console.log("[mail] ✅ Hostinger SMTP test successful");
    return true;
  } catch (error) {
    console.error("[mail] ❌ Hostinger SMTP test failed:", error);
    return false;
  }
}

// Default Export
export default {
  sendTransactionEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendBankStatementEmail,
  sendPasswordResetEmail,
  sendSimpleEmail,
  testSMTPConnection,
  transporter,
};