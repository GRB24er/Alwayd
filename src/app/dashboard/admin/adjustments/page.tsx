// Admin console for manual debit/credit adjustments and transaction reversals.
// Tabbed:
//   1. New adjustment — pick customer, account, direction, amount, reason.
//   2. Reverse a transaction — search by reference, post a contra-entry.
//   3. History — recent adjustments & reversals with PDF download links.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import styles from "./adjustments.module.css";

type Tab = "adjust" | "reverse" | "history";

const REASON_OPTIONS = [
  { value: "fee_refund", label: "Fee Refund" },
  { value: "fee_charge", label: "Fee Charge" },
  { value: "interest_payment", label: "Interest Payment" },
  { value: "interest_correction", label: "Interest Correction" },
  { value: "promotion_credit", label: "Promotional Credit" },
  { value: "court_ordered_seizure", label: "Court-Ordered Seizure" },
  { value: "court_ordered_credit", label: "Court-Ordered Credit" },
  { value: "error_correction", label: "Error Correction" },
  { value: "regulatory_adjustment", label: "Regulatory Adjustment" },
  { value: "manual_credit", label: "Manual Credit" },
  { value: "manual_debit", label: "Manual Debit" },
  { value: "goodwill_credit", label: "Goodwill Credit" },
  { value: "other", label: "Other Adjustment" },
];

export default function AdminAdjustmentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("adjust");

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
          <h1>Adjustments &amp; Reversals</h1>
          <p className={styles.muted}>
            Manually credit or debit a customer account, or reverse a previously posted transaction.
            Every action is double-entry posted to the ledger, audited, and produces a signed PDF receipt.
          </p>
        </header>

        <nav className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "adjust" ? styles.tabActive : ""}`} onClick={() => setTab("adjust")}>
            New adjustment
          </button>
          <button className={`${styles.tab} ${tab === "reverse" ? styles.tabActive : ""}`} onClick={() => setTab("reverse")}>
            Reverse transaction
          </button>
          <button className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`} onClick={() => setTab("history")}>
            Recent history
          </button>
        </nav>

        {tab === "adjust" && <AdjustTab />}
        {tab === "reverse" && <ReverseTab />}
        {tab === "history" && <HistoryTab />}
      </main>
    </div>
  );
}

// ─── Adjust Tab ──────────────────────────────────────────────────────────
function AdjustTab() {
  const [emailOrId, setEmailOrId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [accountType, setAccountType] = useState<"checking" | "savings" | "investment">("checking");
  const [amount, setAmount] = useState("");
  const [reasonCategory, setReasonCategory] = useState("manual_credit");
  const [reasonNote, setReasonNote] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [issuerTitle, setIssuerTitle] = useState("Operations Officer");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [allowOverdraft, setAllowOverdraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const lookupUser = async () => {
    setError(null);
    setSearching(true);
    setUser(null);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(emailOrId)}`);
      const data = await res.json();
      const list = data.users || data.data || [];
      const found = list.find(
        (u: any) =>
          u.email?.toLowerCase() === emailOrId.toLowerCase() ||
          u._id === emailOrId ||
          u.id === emailOrId
      );
      if (!found) setError("No customer found");
      else setUser(found);
    } catch (err: any) {
      setError(err?.message || "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/accounts/${user._id || user.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          accountType,
          amount,
          reasonCategory,
          reasonNote,
          legalBasis: legalBasis || undefined,
          issuerTitle,
          notifyCustomer,
          allowOverdraft,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || JSON.stringify(data.errors) || "Adjustment failed");
      } else {
        setResult(data.transaction);
      }
    } catch (err: any) {
      setError(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2>Adjustment posted</h2>
        <dl className={styles.summary}>
          <div><dt>Reference</dt><dd className={styles.mono}>{result.reference}</dd></div>
          <div><dt>Direction</dt><dd className={`${styles.pill} ${result.direction === "credit" ? styles.pillCredit : styles.pillDebit}`}>{result.direction}</dd></div>
          <div><dt>Amount</dt><dd>${result.amount.toLocaleString()}</dd></div>
          <div><dt>Account</dt><dd>{result.accountType}</dd></div>
          <div><dt>Balance before</dt><dd>${result.balanceBefore.toLocaleString()}</dd></div>
          <div><dt>Balance after</dt><dd><strong>${result.balanceAfter.toLocaleString()}</strong></dd></div>
        </dl>
        <div className={styles.actionsRow}>
          <a href={result.documentUrl} target="_blank" rel="noreferrer" className={styles.btnPrimary}>
            Download receipt PDF
          </a>
          <button onClick={() => { setResult(null); setAmount(""); setReasonNote(""); }} className={styles.btnSecondary}>
            New adjustment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formCard}>
      {!user ? (
        <>
          <h3>Find customer</h3>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label>Customer email or user ID</label>
            <input
              value={emailOrId}
              onChange={(e) => setEmailOrId(e.target.value)}
              placeholder="customer@example.com"
              onKeyDown={(e) => e.key === "Enter" && lookupUser()}
            />
          </div>
          <button className={styles.btnPrimary} onClick={lookupUser} disabled={!emailOrId || searching}>
            {searching ? "Searching…" : "Continue"}
          </button>
        </>
      ) : (
        <>
          <div className={styles.customerCard}>
            <div>
              <strong>{user.name}</strong>
              <div className={styles.muted}>{user.email}</div>
              {user.accountNumber && <div className={styles.muted}>Account: ••••{String(user.accountNumber).slice(-4)}</div>}
            </div>
            <button className={styles.linkBtn} onClick={() => setUser(null)}>Change customer</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Direction</label>
              <div className={styles.segGroup}>
                <button type="button"
                  className={`${styles.segBtn} ${direction === "credit" ? styles.segActive : ""}`}
                  onClick={() => { setDirection("credit"); setReasonCategory("manual_credit"); }}
                >
                  Credit (add funds)
                </button>
                <button type="button"
                  className={`${styles.segBtn} ${direction === "debit" ? styles.segActive : ""}`}
                  onClick={() => { setDirection("debit"); setReasonCategory("manual_debit"); }}
                >
                  Debit (remove funds)
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label>Account</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as any)}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Amount (USD)</label>
            <div className={styles.amountInput}>
              <span>$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Reason category</label>
            <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
              {REASON_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>Reason details (appears on the receipt PDF)</label>
            <textarea
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Describe the specific facts that justify this entry."
            />
            <small className={styles.muted}>{reasonNote.length} / 4000</small>
          </div>

          <div className={styles.field}>
            <label>Legal / regulatory basis (optional)</label>
            <input
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder="e.g. Court Order #12345, Regulation E §1005.10"
            />
          </div>

          <div className={styles.field}>
            <label>Issuer title (printed on receipt)</label>
            <input value={issuerTitle} onChange={(e) => setIssuerTitle(e.target.value)} />
          </div>

          <label className={styles.checkbox}>
            <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
            <span>Email the customer a copy of this receipt</span>
          </label>

          {direction === "debit" && (
            <label className={styles.checkbox}>
              <input type="checkbox" checked={allowOverdraft} onChange={(e) => setAllowOverdraft(e.target.checked)} />
              <span>Allow overdraft (proceed even if it creates a negative balance)</span>
            </label>
          )}

          <div className={styles.actionsRow}>
            <button className={styles.btnSecondary} onClick={() => setUser(null)} disabled={submitting}>
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={submit}
              disabled={!amount || Number(amount) <= 0 || reasonNote.length < 10 || submitting}
            >
              {submitting ? "Posting…" : `Post ${direction} adjustment`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Reverse Tab ─────────────────────────────────────────────────────────
function ReverseTab() {
  const [reference, setReference] = useState("");
  const [tx, setTx] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState("error_correction");
  const [issuerTitle, setIssuerTitle] = useState("Operations Officer");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const find = async () => {
    setError(null);
    setSearching(true);
    setTx(null);
    try {
      const res = await fetch(`/api/admin/transactions?search=${encodeURIComponent(reference)}`);
      const data = await res.json();
      const list = data.transactions || data.data || [];
      const found = list.find(
        (t: any) => t.reference === reference || t._id === reference || t.id === reference
      );
      if (!found) {
        setError("No transaction found with that reference");
        return;
      }
      if (found.status !== "approved" && found.status !== "completed") {
        setError(`Cannot reverse a transaction in status "${found.status}"`);
        return;
      }
      if (found.reversedAt) {
        setError(`This transaction has already been reversed (${found.reversedByReference})`);
        return;
      }
      setTx(found);
    } catch (err: any) {
      setError(err?.message || "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/transactions/${tx._id || tx.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          reasonCategory,
          issuerTitle,
          notifyCustomer: notify,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Reversal failed");
      } else {
        setResult(data.reversal);
      }
    } catch (err: any) {
      setError(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2>Reversal posted</h2>
        <p className={styles.muted}>The original transaction is preserved unchanged; a contra-entry has been posted to the ledger.</p>
        <dl className={styles.summary}>
          <div><dt>Reversal reference</dt><dd className={styles.mono}>{result.reference}</dd></div>
          <div><dt>Reverses</dt><dd className={styles.mono}>{result.reversesReference}</dd></div>
          <div><dt>Amount</dt><dd>${result.amount.toLocaleString()}</dd></div>
          <div><dt>Account</dt><dd>{result.accountType}</dd></div>
          <div><dt>Balance before</dt><dd>${result.balanceBefore.toLocaleString()}</dd></div>
          <div><dt>Balance after</dt><dd><strong>${result.balanceAfter.toLocaleString()}</strong></dd></div>
        </dl>
        <div className={styles.actionsRow}>
          <a href={result.documentUrl} target="_blank" rel="noreferrer" className={styles.btnPrimary}>
            Download reversal notice PDF
          </a>
          <button onClick={() => { setResult(null); setReference(""); setReason(""); setTx(null); }} className={styles.btnSecondary}>
            New reversal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formCard}>
      {!tx ? (
        <>
          <h3>Find transaction</h3>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label>Transaction reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. WIRE-LX84JZ-A3F7B2 or DEP-202605-X8Y9Z1"
              onKeyDown={(e) => e.key === "Enter" && find()}
            />
          </div>
          <button className={styles.btnPrimary} onClick={find} disabled={!reference || searching}>
            {searching ? "Searching…" : "Find"}
          </button>
        </>
      ) : (
        <>
          <div className={styles.txCard}>
            <div className={styles.txRow}>
              <span className={styles.txLabel}>Reference</span>
              <span className={styles.mono}>{tx.reference}</span>
            </div>
            <div className={styles.txRow}>
              <span className={styles.txLabel}>Type</span>
              <span>{tx.type}</span>
            </div>
            <div className={styles.txRow}>
              <span className={styles.txLabel}>Amount</span>
              <span><strong>${Number(tx.amount).toLocaleString()}</strong> {tx.currency || "USD"}</span>
            </div>
            <div className={styles.txRow}>
              <span className={styles.txLabel}>Account</span>
              <span>{tx.accountType}</span>
            </div>
            <div className={styles.txRow}>
              <span className={styles.txLabel}>Description</span>
              <span>{tx.description}</span>
            </div>
            <div className={styles.txRow}>
              <span className={styles.txLabel}>Posted</span>
              <span>{tx.postedAt ? new Date(tx.postedAt).toLocaleString() : "—"}</span>
            </div>
            <button className={styles.linkBtn} onClick={() => setTx(null)}>Change transaction</button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label>Reason for reversal (recorded in audit + on the notice)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Explain why this transaction is being reversed (e.g. duplicate posting, customer dispute upheld, fraud confirmed)."
            />
            <small className={styles.muted}>{reason.length} / 4000</small>
          </div>

          <div className={styles.field}>
            <label>Reason category</label>
            <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
              <option value="error_correction">Error Correction</option>
              <option value="duplicate_posting">Duplicate Posting</option>
              <option value="customer_dispute_upheld">Customer Dispute Upheld</option>
              <option value="fraud_confirmed">Fraud Confirmed</option>
              <option value="chargeback">Chargeback</option>
              <option value="regulatory_directive">Regulatory Directive</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>Issuer title (printed on notice)</label>
            <input value={issuerTitle} onChange={(e) => setIssuerTitle(e.target.value)} />
          </div>

          <label className={styles.checkbox}>
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>Email the customer a copy of the reversal notice</span>
          </label>

          <div className={styles.actionsRow}>
            <button className={styles.btnSecondary} onClick={() => setTx(null)} disabled={submitting}>
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={submit}
              disabled={reason.length < 10 || submitting}
            >
              {submitting ? "Posting reversal…" : "Post reversal"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── History Tab ─────────────────────────────────────────────────────────
function HistoryTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/transactions?origin=admin_adjustment,reversal&limit=100")
      .then((r) => r.json())
      .then((data) => setRows(data.transactions || data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const recent = useMemo(
    () => rows.filter((r) => r.origin === "admin_adjustment" || r.origin === "reversal"),
    [rows]
  );

  if (loading) return <div className={styles.empty}>Loading…</div>;
  if (recent.length === 0) return <div className={styles.empty}>No adjustments or reversals yet.</div>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Kind</th>
            <th>Customer</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Posted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {recent.map((tx) => (
            <tr key={tx._id || tx.id}>
              <td className={styles.mono}>{tx.reference}</td>
              <td>
                <span className={`${styles.pill} ${tx.origin === "reversal" ? styles.pillReversal : tx.type.includes("credit") ? styles.pillCredit : styles.pillDebit}`}>
                  {tx.origin === "reversal" ? "Reversal" : tx.type.includes("credit") ? "Credit" : "Debit"}
                </span>
              </td>
              <td>{tx.userEmail || tx.user?.email || tx.userName || "—"}</td>
              <td>{tx.accountType}</td>
              <td><strong>${Number(tx.amount).toLocaleString()}</strong></td>
              <td>{tx.postedAt ? new Date(tx.postedAt).toLocaleDateString() : "—"}</td>
              <td>
                <a
                  href={`/api/admin/transactions/${tx._id || tx.id}/document`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.action}
                >
                  Receipt
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
