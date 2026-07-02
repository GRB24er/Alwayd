// Admin console for issuing, lifting, and reviewing account restrictions
// (freeze / block / closure). Lists every restriction with status, downloads
// the official PDF notice, and opens a modal to issue a new one or lift an
// existing active one.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import styles from "./restrictions.module.css";

type Action = "freeze" | "block" | "close";
type Status = "active" | "lifted" | "superseded";

interface RestrictionRow {
  id: string;
  referenceNumber: string;
  action: Action;
  status: Status;
  reasonCategory: string;
  reasonNote: string;
  legalBasis?: string;
  affectedAccounts: string[];
  effectiveFrom: string;
  effectiveUntil?: string;
  issuedByName: string;
  issuedByEmail: string;
  customerNotifiedAt?: string;
  liftedAt?: string;
  liftReason?: string;
  createdAt: string;
  documentUrl: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    accountNumber?: string;
    accountStatus?: string;
  };
}

const REASON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "aml_review", label: "Anti-Money-Laundering Review" },
  { value: "suspected_fraud", label: "Suspected Fraudulent Activity" },
  { value: "unusual_activity", label: "Unusual Account Activity" },
  { value: "court_order", label: "Court Order / Legal Process" },
  { value: "regulatory_request", label: "Regulatory Authority Request" },
  { value: "sanctions_screening_hit", label: "Sanctions Screening Match" },
  { value: "kyc_lapsed", label: "KYC Verification Lapsed" },
  { value: "kyc_failed", label: "KYC Verification Failure" },
  { value: "customer_request", label: "Customer-Initiated Hold" },
  { value: "chargeback_dispute", label: "Active Chargeback / Dispute" },
  { value: "deceased", label: "Deceased Account Holder" },
  { value: "operational_error", label: "Operational Review" },
  { value: "other", label: "Other (describe in notes)" },
];

const ACTION_BADGE: Record<Action, { label: string; color: string }> = {
  freeze: { label: "FROZEN", color: "#92400e" },
  block: { label: "BLOCKED", color: "#991b1b" },
  close: { label: "CLOSED", color: "#374151" },
};

export default function AdminRestrictionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [rows, setRows] = useState<RestrictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "lifted" | "superseded">("active");
  const [issueOpen, setIssueOpen] = useState(false);
  const [liftTarget, setLiftTarget] = useState<RestrictionRow | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && !["admin", "superadmin"].includes((session?.user as any)?.role)) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const load = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/restrictions" : `/api/admin/restrictions?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRows(data.restrictions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { active: 0, lifted: 0, superseded: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <main className={styles.main}>
        <header className={styles.head}>
          <div>
            <h1>Account Restrictions</h1>
            <p className={styles.muted}>
              Issue, lift, and review freezes / blocks / closures. Every action generates a signed
              PDF notice and is recorded in the audit log.
            </p>
          </div>
          <button className={styles.primary} onClick={() => setIssueOpen(true)}>
            Issue restriction
          </button>
        </header>

        <div className={styles.filters}>
          {(["active", "lifted", "superseded", "all"] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filter} ${filter === f ? styles.filterActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
              {f !== "all" && counts[f as keyof typeof counts] !== undefined && (
                <span className={styles.count}>{counts[f as keyof typeof counts]}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No restrictions found for this filter.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Action</th>
                  <th>Reason</th>
                  <th>Affected</th>
                  <th>Issued</th>
                  <th>Until</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.mono}>{r.referenceNumber}</td>
                    <td>
                      <div className={styles.userCell}>
                        <strong>{r.user.name || "(unknown)"}</strong>
                        <span className={styles.muted}>{r.user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{ background: ACTION_BADGE[r.action].color }}
                      >
                        {ACTION_BADGE[r.action].label}
                      </span>
                    </td>
                    <td>{labelForReason(r.reasonCategory)}</td>
                    <td>{r.affectedAccounts.join(", ")}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>{r.effectiveUntil ? new Date(r.effectiveUntil).toLocaleDateString() : "Indefinite"}</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles[`status_${r.status}`]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <a href={r.documentUrl} target="_blank" rel="noreferrer" className={styles.action}>
                        Notice PDF
                      </a>
                      {r.status === "active" && r.action !== "close" && (
                        <button
                          className={`${styles.action} ${styles.lift}`}
                          onClick={() => setLiftTarget(r)}
                        >
                          Lift
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {issueOpen && <IssueModal onClose={() => setIssueOpen(false)} onIssued={load} />}
        {liftTarget && (
          <LiftModal target={liftTarget} onClose={() => setLiftTarget(null)} onLifted={load} />
        )}
      </main>
    </div>
  );
}

function labelForReason(key: string): string {
  return REASON_OPTIONS.find((o) => o.value === key)?.label || key;
}

// ─── Issue Modal ─────────────────────────────────────────────────────────
function IssueModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [step, setStep] = useState<"lookup" | "form">("lookup");
  const [emailOrId, setEmailOrId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState<Action>("freeze");
  const [reasonCategory, setReasonCategory] = useState("aml_review");
  const [reasonNote, setReasonNote] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [issuerTitle, setIssuerTitle] = useState("Compliance Officer");
  const [affected, setAffected] = useState<string[]>(["all"]);
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<any>(null);

  const lookupUser = async () => {
    setError(null);
    setSearching(true);
    try {
      // Use the existing admin users endpoint to search.
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(emailOrId)}`);
      const data = await res.json();
      const list = data.users || data.data || [];
      const found = list.find(
        (u: any) =>
          u.email?.toLowerCase() === emailOrId.toLowerCase() ||
          u._id === emailOrId ||
          u.id === emailOrId
      );
      if (!found) {
        setError("No customer found matching that email or ID");
      } else {
        setUser(found);
        setStep("form");
      }
    } catch (err: any) {
      setError(err?.message || "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/accounts/${user._id || user.id}/restrict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reasonCategory,
          reasonNote,
          legalBasis: legalBasis || undefined,
          affectedAccounts: affected,
          effectiveUntil: effectiveUntil || undefined,
          internalOnly,
          notifyCustomer,
          issuerTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || JSON.stringify(data.errors) || "Failed to issue");
        return;
      }
      setIssued(data.restriction);
      onIssued();
    } catch (err: any) {
      setError(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (issued) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h2>Restriction issued</h2>
          <p>
            Document reference: <code>{issued.referenceNumber}</code>
          </p>
          <div className={styles.modalActions}>
            <a href={issued.documentUrl} target="_blank" rel="noreferrer" className={styles.primary}>
              Download notice PDF
            </a>
            <button onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHead}>
          <h2>Issue account restriction</h2>
          <button className={styles.close} onClick={onClose}>×</button>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {step === "lookup" ? (
          <>
            <p className={styles.muted}>Find the customer to apply the restriction to.</p>
            <label className={styles.field}>
              <span>Customer email or user ID</span>
              <input
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="customer@example.com"
              />
            </label>
            <div className={styles.modalActions}>
              <button onClick={onClose}>Cancel</button>
              <button className={styles.primary} onClick={lookupUser} disabled={!emailOrId || searching}>
                {searching ? "Searching…" : "Continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.customerCard}>
              <strong>{user.name}</strong>
              <span className={styles.muted}>{user.email}</span>
              {user.accountNumber && (
                <span className={styles.muted}>Account: ••••{String(user.accountNumber).slice(-4)}</span>
              )}
            </div>

            <label className={styles.field}>
              <span>Action</span>
              <select value={action} onChange={(e) => setAction(e.target.value as Action)}>
                <option value="freeze">Freeze (suspend outgoing; allow viewing & deposits)</option>
                <option value="block">Block (full lockdown of all access)</option>
                <option value="close">Close (permanent termination of account)</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Reason category</span>
              <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Reason note (appears verbatim on the notice unless internal-only)</span>
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Describe the specific facts that justify this action."
              />
              <small className={styles.muted}>{reasonNote.length} / 4000</small>
            </label>

            <label className={styles.field}>
              <span>Legal / regulatory basis (optional)</span>
              <input
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                placeholder="e.g. Bank Secrecy Act §314(b), Court Order #12345, OFAC SDN match"
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>Affected accounts</span>
                <select
                  multiple
                  value={affected}
                  onChange={(e) =>
                    setAffected(Array.from(e.target.selectedOptions, (o) => o.value))
                  }
                  size={4}
                >
                  <option value="all">All accounts</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Effective until (optional)</span>
                <input
                  type="datetime-local"
                  value={effectiveUntil}
                  onChange={(e) => setEffectiveUntil(e.target.value)}
                />
                <small className={styles.muted}>Leave blank for indefinite</small>
              </label>
            </div>

            <label className={styles.field}>
              <span>Issuer title (printed on notice)</span>
              <input value={issuerTitle} onChange={(e) => setIssuerTitle(e.target.value)} />
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={internalOnly}
                onChange={(e) => setInternalOnly(e.target.checked)}
              />
              <span>
                Internal only — hide the detailed reason from the customer-visible portion (e.g. court
                order gag rule). PDF notice still references the matter generically.
              </span>
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
              />
              <span>Email the customer a copy of this notice now</span>
            </label>

            <div className={styles.modalActions}>
              <button onClick={() => setStep("lookup")}>Back</button>
              <button
                className={styles.primary}
                onClick={submit}
                disabled={!reasonNote || reasonNote.length < 10 || submitting}
              >
                {submitting ? "Issuing…" : `Issue ${action}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Lift Modal ──────────────────────────────────────────────────────────
function LiftModal({
  target,
  onClose,
  onLifted,
}: {
  target: RestrictionRow;
  onClose: () => void;
  onLifted: () => void;
}) {
  const [liftReason, setLiftReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/accounts/${target.user.id}/lift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: target.referenceNumber,
          liftReason,
          notifyCustomer: notify,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to lift");
        return;
      }
      onLifted();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHead}>
          <h2>Lift restriction</h2>
          <button className={styles.close} onClick={onClose}>×</button>
        </header>

        <div className={styles.customerCard}>
          <strong>{target.user.name}</strong>
          <span className={styles.muted}>{target.user.email}</span>
          <span className={styles.mono}>{target.referenceNumber}</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <label className={styles.field}>
          <span>Justification (recorded in audit log)</span>
          <textarea
            value={liftReason}
            onChange={(e) => setLiftReason(e.target.value)}
            rows={4}
            placeholder="Explain why the restriction is being lifted (resolution, escalation outcome, etc.)"
          />
        </label>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>Email the customer that the restriction has been lifted</span>
        </label>

        <div className={styles.modalActions}>
          <button onClick={onClose}>Cancel</button>
          <button
            className={styles.primary}
            onClick={submit}
            disabled={!liftReason || liftReason.length < 10 || submitting}
          >
            {submitting ? "Lifting…" : "Lift restriction"}
          </button>
        </div>
      </div>
    </div>
  );
}
