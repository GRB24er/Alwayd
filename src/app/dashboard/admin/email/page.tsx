// Admin email composer. Lets admin send a branded, professionally-styled
// HTML email to any registered customer (selected from search) or any
// ad-hoc address. Live preview of the rendered email on the right.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import styles from "./email.module.css";

type Tab = "compose" | "sent";

interface CustomerHit {
  _id: string;
  name?: string;
  email: string;
}

export default function AdminEmailPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("compose");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && !["admin", "superadmin"].includes((session?.user as any)?.role)) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <main className={styles.main}>
        <header className={styles.head}>
          <h1>Email Center</h1>
          <p className={styles.muted}>
            Send professional, brand-styled correspondence to any customer or external address.
            Every message is logged and audited.
          </p>
        </header>

        <nav className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "compose" ? styles.tabActive : ""}`} onClick={() => setTab("compose")}>
            Compose
          </button>
          <button className={`${styles.tab} ${tab === "sent" ? styles.tabActive : ""}`} onClick={() => setTab("sent")}>
            Sent items
          </button>
        </nav>

        {tab === "compose" ? <ComposeTab /> : <SentTab />}
      </main>
    </div>
  );
}

// ─── Compose ────────────────────────────────────────────────────────────
function ComposeTab() {
  const [recipientMode, setRecipientMode] = useState<"customer" | "email">("customer");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState<"general" | "notice" | "marketing" | "support" | "operational">("general");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [senderTitle, setSenderTitle] = useState("");
  const [senderDepartment, setSenderDepartment] = useState("");
  const [hideMarketingFooter, setHideMarketingFooter] = useState(false);
  const [bodyIsHtml, setBodyIsHtml] = useState(false);

  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Live customer search.
  useEffect(() => {
    if (recipientMode !== "customer") return;
    if (!customerQuery || customerQuery.length < 2) {
      setCustomerHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(customerQuery)}`);
        const data = await res.json();
        setCustomerHits((data.users || data.data || []).slice(0, 8));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [customerQuery, recipientMode]);

  const selectCustomer = (c: CustomerHit) => {
    setRecipientUserId(c._id);
    setRecipientEmail(c.email);
    setRecipientName(c.name || c.email);
    setCustomerQuery(c.email);
    setCustomerHits([]);
  };

  const canSend =
    !!subject.trim() &&
    subject.length >= 3 &&
    body.trim().length >= 1 &&
    (recipientMode === "customer" ? !!recipientUserId : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipientEmail));

  const send = async () => {
    setError(null);
    setSubmitting(true);
    setResult(null);
    try {
      const payload: any = {
        subject,
        body,
        bodyIsHtml,
        category,
        tag: tag || undefined,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        senderTitle: senderTitle || undefined,
        senderDepartment: senderDepartment || undefined,
        hideMarketingFooter,
      };
      if (recipientMode === "customer") payload.recipientUserId = recipientUserId;
      else payload.recipientEmail = recipientEmail;
      const ccList = parseEmailList(cc);
      const bccList = parseEmailList(bcc);
      if (ccList.length) payload.cc = ccList;
      if (bccList.length) payload.bcc = bccList;

      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || JSON.stringify(data.errors) || "Send failed");
      } else {
        setResult(data.email);
        // Clear the form for the next message
        setSubject("");
        setBody("");
        setTag("");
        setCtaLabel("");
        setCtaUrl("");
        setCc("");
        setBcc("");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Build the preview by calling the renderer client-side? We can't — it's
  // server-only. Instead we render an approximation locally so the admin
  // sees what the customer will see.
  const previewHtml = useMemo(
    () => buildPreview({
      subject: subject || "Subject",
      body: body || "Type your message in the editor on the left…",
      bodyIsHtml,
      recipientName,
      tag,
      ctaLabel,
      ctaUrl,
      senderName: "Aldwych Operations",
      senderTitle,
      senderDepartment,
      hideMarketingFooter,
    }),
    [subject, body, bodyIsHtml, recipientName, tag, ctaLabel, ctaUrl, senderTitle, senderDepartment, hideMarketingFooter]
  );

  return (
    <div className={styles.composeLayout}>
      <div className={styles.editorPane}>
        {result && (
          <div className={styles.successBanner}>
            ✓ Email sent to {result.recipientEmail} · <code>{result.id}</code>
            <button className={styles.closeBanner} onClick={() => setResult(null)}>×</button>
          </div>
        )}
        {error && <div className={styles.errorBanner}>{error}</div>}

        <fieldset className={styles.section}>
          <legend>To</legend>

          <div className={styles.segGroup}>
            <button
              type="button"
              className={`${styles.segBtn} ${recipientMode === "customer" ? styles.segActive : ""}`}
              onClick={() => setRecipientMode("customer")}
            >
              Customer
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${recipientMode === "email" ? styles.segActive : ""}`}
              onClick={() => setRecipientMode("email")}
            >
              Any email
            </button>
          </div>

          {recipientMode === "customer" ? (
            <div className={styles.field}>
              <label>Search customer by name or email</label>
              <input
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setRecipientUserId("");
                }}
                placeholder="Start typing…"
              />
              {searching && <small className={styles.muted}>Searching…</small>}
              {customerHits.length > 0 && (
                <ul className={styles.dropdown}>
                  {customerHits.map((c) => (
                    <li key={c._id} onClick={() => selectCustomer(c)}>
                      <strong>{c.name || "(no name)"}</strong>
                      <span className={styles.muted}>{c.email}</span>
                    </li>
                  ))}
                </ul>
              )}
              {recipientUserId && (
                <div className={styles.selectedRecipient}>
                  Selected: <strong>{recipientName}</strong> · {recipientEmail}
                  <button onClick={() => { setRecipientUserId(""); setRecipientEmail(""); setRecipientName(""); }}>×</button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.field}>
              <label>Recipient email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="someone@example.com"
              />
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label>CC (comma-separated)</label>
              <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="optional" />
            </div>
            <div className={styles.field}>
              <label>BCC</label>
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="optional" />
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>Message</legend>

          <div className={styles.field}>
            <label>Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject of your message"
              maxLength={400}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Tag (optional, shown above message)</label>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. Re: Application #12345"
                maxLength={200}
              />
            </div>
            <div className={styles.field}>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
                <option value="general">General</option>
                <option value="notice">Formal notice</option>
                <option value="support">Support reply</option>
                <option value="operational">Operational</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>
              Body
              <small className={styles.muted}>
                {" "}— plain text with blank lines for paragraphs. URLs auto-link.
              </small>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={50000}
              placeholder="Dear Mr. Smith,&#10;&#10;Following up on our conversation last week regarding your wire transfer of 12 May 2026…"
            />
            <small className={styles.muted}>{body.length} / 50,000</small>
          </div>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={bodyIsHtml}
              onChange={(e) => setBodyIsHtml(e.target.checked)}
            />
            <span>Body contains HTML (advanced; will be sanitized)</span>
          </label>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>Call-to-action (optional)</legend>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Button label</label>
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder='e.g. "View statement"'
                maxLength={80}
              />
            </div>
            <div className={styles.field}>
              <label>Button URL</label>
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>Signature</legend>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Your title (printed in signature)</label>
              <input
                value={senderTitle}
                onChange={(e) => setSenderTitle(e.target.value)}
                placeholder="e.g. Senior Operations Officer"
              />
            </div>
            <div className={styles.field}>
              <label>Department</label>
              <input
                value={senderDepartment}
                onChange={(e) => setSenderDepartment(e.target.value)}
                placeholder="e.g. Operations Division"
              />
            </div>
          </div>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={hideMarketingFooter}
              onChange={(e) => setHideMarketingFooter(e.target.checked)}
            />
            <span>Hide marketing footer (use for formal notices)</span>
          </label>
        </fieldset>

        <div className={styles.sendBar}>
          <button className={styles.btnPrimary} onClick={send} disabled={!canSend || submitting}>
            {submitting ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>

      <aside className={styles.previewPane}>
        <div className={styles.previewLabel}>Live preview</div>
        <iframe
          title="Email preview"
          srcDoc={previewHtml}
          className={styles.previewFrame}
        />
      </aside>
    </div>
  );
}

// ─── Sent ───────────────────────────────────────────────────────────────
function SentTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/admin/email?search=${encodeURIComponent(search)}&limit=100`
        : "/api/admin/email?limit=100";
      const res = await fetch(url);
      const data = await res.json();
      setRows(data.emails || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className={styles.sentToolbar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by recipient or subject"
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className={styles.btnSecondary}>Search</button>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>No sent emails yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Sender</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.recipientEmail}</strong>
                    {r.cc && r.cc.length > 0 && <div className={styles.muted}>CC: {r.cc.join(", ")}</div>}
                  </td>
                  <td>
                    <div>{r.subject}</div>
                    <div className={styles.muted}>{r.preview}</div>
                  </td>
                  <td><span className={styles.tagPill}>{r.category}</span></td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[`status_${r.status}`]}`}>{r.status}</span>
                    {r.errorReason && <div className={styles.errorTiny}>{r.errorReason}</div>}
                  </td>
                  <td>{r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"}</td>
                  <td className={styles.muted}>{r.senderEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parseEmailList(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Minimal preview that mirrors the server-side template's look. We don't
// import the server renderer (it pulls in Node-only modules); instead we
// hand-render a representative HTML snippet client-side. The actual email
// the customer receives uses the server template.
function buildPreview(opts: {
  subject: string;
  body: string;
  bodyIsHtml: boolean;
  recipientName: string;
  tag: string;
  ctaLabel: string;
  ctaUrl: string;
  senderName: string;
  senderTitle: string;
  senderDepartment: string;
  hideMarketingFooter: boolean;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = opts.bodyIsHtml
    ? opts.body
    : esc(opts.body)
        .replace(/\bhttps?:\/\/[^\s<>"']+/g, (m) => `<a href="${m}" style="color:#a8935f">${m}</a>`)
        .split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 16px;color:#1a1f2e;font-size:15px;line-height:1.6;">${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
  const greeting = opts.recipientName
    ? `<p style="margin:0 0 18px;color:#1a1f2e;font-size:15px;line-height:1.6;">Dear ${esc(opts.recipientName)},</p>`
    : "";
  const tag = opts.tag
    ? `<div style="margin:0 0 18px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:#a8935f;font-weight:600;">${esc(opts.tag)}</div>`
    : "";
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:8px;background:#1a1f2e;"><a href="${esc(opts.ctaUrl)}" style="display:inline-block;padding:14px 28px;color:#c9a962;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">${esc(opts.ctaLabel)}</a></td></tr></table>`
    : "";
  const footer = opts.hideMarketingFooter
    ? ""
    : `<p style="margin:0;font-size:11px;color:#6b7280;line-height:1.6;">You're receiving this email as a registered customer of Aldwych European Capital. For account inquiries, contact us at <a href="mailto:support@aldwychcapital.com" style="color:#a8935f;text-decoration:none;">support@aldwychcapital.com</a>.</p>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(26,31,46,0.08);">
<tr><td style="height:5px;background:#c9a962;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 8px;">
  <div style="font-size:11px;letter-spacing:0.18em;color:#a8935f;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Aldwych European Capital</div>
  <div style="font-size:11px;color:#6b7280;">European Private Banking Excellence · Est. 1897</div>
</td></tr>
<tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;margin:16px 0 0;"></div></td></tr>
<tr><td style="padding:28px 40px 0;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1a1f2e;line-height:1.3;">${esc(opts.subject)}</h1>
  ${tag}
</td></tr>
<tr><td style="padding:8px 40px 24px;">
  ${greeting}${body}${cta}
  <p style="margin:24px 0 0;color:#1a1f2e;font-size:14px;line-height:1.6;">Kind regards,</p>
  <div style="margin-top:6px;">
    <div style="font-size:15px;font-weight:600;color:#1a1f2e;">${esc(opts.senderName)}</div>
    ${opts.senderTitle ? `<div style="font-size:13px;color:#6b7280;">${esc(opts.senderTitle)}</div>` : ""}
    ${opts.senderDepartment ? `<div style="font-size:12px;color:#6b7280;">${esc(opts.senderDepartment)}</div>` : ""}
  </div>
</td></tr>
<tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;margin:0 0 24px;"></div></td></tr>
<tr><td style="padding:0 40px 28px;">${footer}
<p style="margin:14px 0 0;font-size:10px;color:#6b7280;line-height:1.6;">Aldwych European Capital plc — Registered in England and Wales. Authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority and the Prudential Regulation Authority.</p>
</td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#c9a962,#a8935f);font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
