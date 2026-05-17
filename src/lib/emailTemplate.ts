// Brand-styled HTML email wrapper. Every admin-composed message goes through
// this so a free-form note from a compliance officer still looks like
// official correspondence from the bank instead of a plain-text reply.
//
// The template is table-based (the only layout primitive that survives Outlook
// and most webmail clients without breaking). Brand colours mirror the in-app
// CSS variables so the email feels consistent with the customer portal.

const BRAND = {
  name: "Aldwych European Capital",
  tagline: "European Private Banking Excellence",
  established: "1897",
  domain: "aldwychcapital.com",
  supportEmail: "support@aldwychcapital.com",
  complianceEmail: "compliance@aldwychcapital.com",
  navy: "#1a1f2e",
  navyDeep: "#12151f",
  gold: "#c9a962",
  goldLight: "#d4b978",
  goldDark: "#a8935f",
  cream: "#faf9f7",
  text: "#1a1f2e",
  textMuted: "#6b7280",
  border: "#e5e7eb",
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailComposerInput {
  recipientName?: string;
  subject: string;
  // Body in plain text or simple HTML (paragraphs, links, lists). We sanitize
  // and normalize either way and produce both a multipart HTML + plain-text version.
  body: string;
  bodyIsHtml?: boolean;
  // Optional call-to-action button under the body.
  cta?: { label: string; url: string };
  // Tagging line under the body (e.g. "Re: Application #12345")
  tag?: string;
  // Sender block (officer name + title) shown above the signature
  senderName?: string;
  senderTitle?: string;
  senderDepartment?: string;
  // Hide the marketing footer on operational / formal notices
  hideMarketingFooter?: boolean;
}

// Convert plain-text body into safe paragraphs with linkification.
// We don't run a full HTML sanitizer because admins should be able to write
// rich messages; instead we only allow a strict tag whitelist if bodyIsHtml.
function normalizeBody(body: string, asHtml: boolean): string {
  if (asHtml) {
    return whitelistHtml(body);
  }
  const escaped = escapeHtml(body.trim());
  const linked = escaped.replace(
    /\bhttps?:\/\/[^\s<>"']+/g,
    (m) => `<a href="${m}" style="color:${BRAND.goldDark};text-decoration:underline;">${m}</a>`
  );
  return linked
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.6;">${p.replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Very conservative HTML whitelist: keeps inline formatting but strips
// scripts, styles, iframes, event handlers, and dangerous attrs.
function whitelistHtml(html: string): string {
  let out = html;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<object[\s\S]*?<\/object>/gi, "");
  out = out.replace(/<embed[\s\S]*?<\/embed>/gi, "");
  out = out.replace(/<link[^>]*>/gi, "");
  out = out.replace(/<meta[^>]*>/gi, "");
  out = out.replace(/ on[a-z]+="[^"]*"/gi, "");
  out = out.replace(/ on[a-z]+='[^']*'/gi, "");
  out = out.replace(/javascript:/gi, "");
  return out;
}

function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderEmail(input: EmailComposerInput): RenderedEmail {
  const body = normalizeBody(input.body, !!input.bodyIsHtml);
  const greeting = input.recipientName
    ? `<p style="margin:0 0 18px;color:${BRAND.text};font-size:15px;line-height:1.6;">Dear ${escapeHtml(input.recipientName)},</p>`
    : "";
  const tag = input.tag
    ? `<div style="margin:0 0 18px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:${BRAND.goldDark};font-weight:600;">${escapeHtml(input.tag)}</div>`
    : "";
  const cta = input.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr>
          <td style="border-radius:8px;background:${BRAND.navy};">
            <a href="${escapeHtml(input.cta.url)}" target="_blank" style="display:inline-block;padding:14px 28px;color:${BRAND.gold};font-size:14px;font-weight:600;font-family:Helvetica,Arial,sans-serif;text-decoration:none;letter-spacing:0.02em;">
              ${escapeHtml(input.cta.label)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const senderBlock = (() => {
    const name = input.senderName || "The Aldwych Team";
    const title = input.senderTitle || "Customer Service";
    const dept = input.senderDepartment ? `<div style="font-size:12px;color:${BRAND.textMuted};">${escapeHtml(input.senderDepartment)}</div>` : "";
    return `
      <p style="margin:24px 0 0;color:${BRAND.text};font-size:14px;line-height:1.6;">Kind regards,</p>
      <div style="margin-top:6px;">
        <div style="font-size:15px;font-weight:600;color:${BRAND.navy};">${escapeHtml(name)}</div>
        <div style="font-size:13px;color:${BRAND.textMuted};">${escapeHtml(title)}</div>
        ${dept}
      </div>`;
  })();

  const marketingFooter = input.hideMarketingFooter
    ? ""
    : `
      <p style="margin:0;font-size:11px;color:${BRAND.textMuted};line-height:1.6;">
        You're receiving this email as a registered customer of ${BRAND.name}.
        For account inquiries, contact us at
        <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.goldDark};text-decoration:none;">${BRAND.supportEmail}</a>.
      </p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(plainTextFromHtml(body).slice(0, 120))}</span>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(26,31,46,0.08);">
          <!-- Gold top band -->
          <tr><td style="height:5px;background:${BRAND.gold};font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Header / Wordmark -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size:11px;letter-spacing:0.18em;color:${BRAND.goldDark};font-weight:700;text-transform:uppercase;margin-bottom:4px;">${BRAND.name}</div>
                    <div style="font-size:11px;color:${BRAND.textMuted};">${BRAND.tagline} · Est. ${BRAND.established}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:${BRAND.border};margin:16px 0 0;"></div></td></tr>

          <!-- Subject heading -->
          <tr>
            <td style="padding:28px 40px 0;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.navy};line-height:1.3;">${escapeHtml(input.subject)}</h1>
              ${tag}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:8px 40px 24px;">
              ${greeting}
              ${body}
              ${cta}
              ${senderBlock}
            </td>
          </tr>

          <!-- Footer divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:${BRAND.border};margin:0 0 24px;"></div></td></tr>

          <!-- Compliance footer -->
          <tr>
            <td style="padding:0 40px 28px;">
              ${marketingFooter}
              <p style="margin:14px 0 0;font-size:10px;color:${BRAND.textMuted};line-height:1.6;">
                ${BRAND.name} plc — Registered in England and Wales.<br>
                Authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority and the Prudential Regulation Authority.<br>
                Registered office: Aldwych House, 71-91 Aldwych, London WC2B 4HN, United Kingdom.
              </p>
            </td>
          </tr>

          <!-- Bottom gold band -->
          <tr><td style="height:3px;background:linear-gradient(90deg,${BRAND.gold},${BRAND.goldDark});font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>

        <div style="font-size:10px;color:#9ca3af;padding:14px 0 0;max-width:640px;text-align:center;">
          This email was sent from a monitored address. Please do not share personal account information by email.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Generate the plain-text fallback from the source body so it's always
  // legible even when the recipient blocks HTML.
  const text = [
    input.recipientName ? `Dear ${input.recipientName},` : null,
    input.tag,
    plainTextFromHtml(body),
    input.cta ? `${input.cta.label}: ${input.cta.url}` : null,
    "",
    "Kind regards,",
    input.senderName || "The Aldwych Team",
    input.senderTitle ? input.senderTitle : "",
    input.senderDepartment ? input.senderDepartment : "",
    "",
    "—",
    `${BRAND.name} · ${BRAND.tagline}`,
    `Support: ${BRAND.supportEmail}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: input.subject, html, text };
}
