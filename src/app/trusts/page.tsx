"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./trusts.module.css";

type TriggerType = "age" | "date";

interface DistributionRow {
  label: string;
  triggerType: TriggerType;
  triggerAge: string;
  triggerDate: string;
  percentage: string;
}

interface Distribution {
  label: string;
  triggerType: TriggerType;
  triggerAge?: number;
  triggerDate?: string;
  percentage: number;
  status: string;
  releasedAmount?: number;
  releasedAt?: string;
}

interface Trust {
  _id: string;
  referenceNumber: string;
  trustName: string;
  beneficiaryName: string;
  beneficiaryDateOfBirth: string;
  beneficiaryRelationship?: string;
  currency: string;
  principalAmount: number;
  heldBalance: number;
  status: string;
  revocable: boolean;
  distributions: Distribution[];
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "Active — Holding",
  distributing: "Distributing",
  completed: "Completed",
  cancelled: "Cancelled",
};

function money(n: number, currency = "USD") {
  return `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const DOC_LABELS: Record<string, string> = {
  deed: "Declaration of Trust",
  certificate: "Certificate of Establishment",
  funding_receipt: "Contribution Receipt",
  letter_of_wishes: "Letter of Wishes",
  distribution_statement: "Distribution Statement",
  completion_statement: "Completion Statement",
  deed_of_revocation: "Deed of Revocation",
};

// Mirrors availableTrustDocuments() on the server so the card shows the right
// download links for the trust's current state.
function docsForStatus(status: string): string[] {
  const base = ["deed", "certificate", "funding_receipt", "letter_of_wishes"];
  if (status === "distributing" || status === "completed") base.push("distribution_statement");
  if (status === "completed") base.push("completion_statement");
  if (status === "cancelled") return ["deed", "certificate", "funding_receipt", "letter_of_wishes", "deed_of_revocation"];
  return base;
}

export default function TrustsPage() {
  const [tab, setTab] = useState<"holdings" | "create">("holdings");
  const [settlorTrusts, setSettlorTrusts] = useState<Trust[]>([]);
  const [beneficiaryTrusts, setBeneficiaryTrusts] = useState<Trust[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ----- create form state -----
  const [form, setForm] = useState({
    trustName: "",
    beneficiaryName: "",
    beneficiaryDateOfBirth: "",
    beneficiaryRelationship: "",
    beneficiaryEmail: "",
    principalAmount: "",
    fundingAccount: "savings",
    revocable: true,
    letterOfWishes: "",
  });
  const [rows, setRows] = useState<DistributionRow[]>([
    { label: "On coming of age", triggerType: "age", triggerAge: "25", triggerDate: "", percentage: "100" },
  ]);

  const pctTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0),
    [rows]
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/trusts");
      if (res.ok) {
        const data = await res.json();
        setSettlorTrusts(data.asSettlor || []);
        setBeneficiaryTrusts(data.asBeneficiary || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateRow(i: number, patch: Partial<DistributionRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { label: "", triggerType: "age", triggerAge: "30", triggerDate: "", percentage: "0" },
    ]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (Math.round(pctTotal) !== 100) {
      setMessage({ type: "err", text: "Distribution percentages must add up to 100%." });
      return;
    }

    const distributions = rows.map((r) => ({
      label: r.label || undefined,
      triggerType: r.triggerType,
      triggerAge: r.triggerType === "age" ? Number(r.triggerAge) : undefined,
      triggerDate: r.triggerType === "date" ? r.triggerDate : undefined,
      percentage: Number(r.percentage),
    }));

    setSubmitting(true);
    try {
      const res = await fetch("/api/trusts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, principalAmount: Number(form.principalAmount), distributions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Could not create trust." });
      } else {
        setMessage({ type: "ok", text: `Trust ${data.trust.referenceNumber} established and funded.` });
        setForm({
          trustName: "",
          beneficiaryName: "",
          beneficiaryDateOfBirth: "",
          beneficiaryRelationship: "",
          beneficiaryEmail: "",
          principalAmount: "",
          fundingAccount: "savings",
          revocable: true,
          letterOfWishes: "",
        });
        setRows([{ label: "On coming of age", triggerType: "age", triggerAge: "25", triggerDate: "", percentage: "100" }]);
        await load();
        setTab("holdings");
      }
    } catch {
      setMessage({ type: "err", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelTrust(id: string) {
    if (!confirm("Cancel this trust and return the remaining principal to your account?")) return;
    try {
      const res = await fetch(`/api/trusts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Could not cancel trust." });
      } else {
        await load();
      }
    } catch {
      setMessage({ type: "err", text: "Network error. Please try again." });
    }
  }

  function renderTrustCard(t: Trust, isSettlor: boolean) {
    return (
      <div key={t._id} className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h3 className={styles.trustName}>{t.trustName}</h3>
            <span className={styles.ref}>{t.referenceNumber}</span>
          </div>
          <span className={`${styles.badge} ${styles["st_" + t.status]}`}>
            {STATUS_LABELS[t.status] || t.status}
          </span>
        </div>

        <div className={styles.metrics}>
          <div>
            <span className={styles.metricLabel}>Principal</span>
            <span className={styles.metricValue}>{money(t.principalAmount, t.currency)}</span>
          </div>
          <div>
            <span className={styles.metricLabel}>Held in trust</span>
            <span className={styles.metricValue}>{money(t.heldBalance, t.currency)}</span>
          </div>
          <div>
            <span className={styles.metricLabel}>Beneficiary</span>
            <span className={styles.metricValue}>
              {t.beneficiaryName}
              {t.beneficiaryRelationship ? ` (${t.beneficiaryRelationship})` : ""}
            </span>
          </div>
        </div>

        <div className={styles.schedule}>
          <div className={styles.scheduleTitle}>Distribution schedule</div>
          {t.distributions.map((d, i) => (
            <div key={i} className={styles.trancheRow}>
              <span className={styles.trancheLabel}>{d.label}</span>
              <span className={styles.trancheTrigger}>
                {d.triggerType === "age"
                  ? `at age ${d.triggerAge}`
                  : d.triggerDate
                  ? `on ${new Date(d.triggerDate).toLocaleDateString()}`
                  : ""}
              </span>
              <span className={styles.tranchePct}>{d.percentage}%</span>
              <span className={`${styles.trancheStatus} ${d.status === "released" ? styles.released : ""}`}>
                {d.status === "released"
                  ? `released ${money(d.releasedAmount || 0, t.currency)}`
                  : "scheduled"}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.documents}>
          <div className={styles.scheduleTitle}>Documents</div>
          <div className={styles.docLinks}>
            {docsForStatus(t.status).map((type) => (
              <a
                key={type}
                className={styles.docLink}
                href={`/api/trusts/${t._id}/document?type=${type}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.docIcon} aria-hidden>
                  ↓
                </span>
                {DOC_LABELS[type]}
              </a>
            ))}
          </div>
        </div>

        {isSettlor && t.revocable && (t.status === "active" || t.status === "pending" || t.status === "distributing") && (
          <div className={styles.cardActions}>
            <button className={styles.cancelBtn} onClick={() => cancelTrust(t._id)}>
              Cancel &amp; reclaim
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>Inheritance &amp; Trusts</h1>
              <p className={styles.subtitle}>
                Set money aside for someone and have it released to them automatically when they
                reach a chosen age or date.
              </p>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "holdings" ? styles.tabActive : ""}`}
              onClick={() => setTab("holdings")}
            >
              My Trusts
            </button>
            <button
              className={`${styles.tab} ${tab === "create" ? styles.tabActive : ""}`}
              onClick={() => setTab("create")}
            >
              Establish a Trust
            </button>
          </div>

          {message && (
            <div className={message.type === "ok" ? styles.alertOk : styles.alertErr}>{message.text}</div>
          )}

          {tab === "holdings" && (
            <div>
              {loading ? (
                <p className={styles.muted}>Loading…</p>
              ) : settlorTrusts.length === 0 && beneficiaryTrusts.length === 0 ? (
                <div className={styles.empty}>
                  <p>You have not established any trusts yet.</p>
                  <button className={styles.primaryBtn} onClick={() => setTab("create")}>
                    Establish your first trust
                  </button>
                </div>
              ) : (
                <>
                  {settlorTrusts.length > 0 && (
                    <section className={styles.section}>
                      <h2 className={styles.sectionTitle}>Trusts you settled</h2>
                      <div className={styles.grid}>{settlorTrusts.map((t) => renderTrustCard(t, true))}</div>
                    </section>
                  )}
                  {beneficiaryTrusts.length > 0 && (
                    <section className={styles.section}>
                      <h2 className={styles.sectionTitle}>Trusts held for you</h2>
                      <div className={styles.grid}>{beneficiaryTrusts.map((t) => renderTrustCard(t, false))}</div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "create" && (
            <form className={styles.form} onSubmit={submit}>
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Trust details</h2>
                <div className={styles.field}>
                  <label>Trust name</label>
                  <input
                    value={form.trustName}
                    onChange={(e) => setForm({ ...form, trustName: e.target.value })}
                    placeholder="e.g. Emma's Education Trust"
                    required
                  />
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Amount to place in trust</label>
                    <input
                      type="number"
                      min={1000}
                      value={form.principalAmount}
                      onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                      placeholder="250000"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Fund from</label>
                    <select
                      value={form.fundingAccount}
                      onChange={(e) => setForm({ ...form, fundingAccount: e.target.value })}
                    >
                      <option value="savings">Savings</option>
                      <option value="checking">Checking</option>
                      <option value="investment">Investment</option>
                    </select>
                  </div>
                </div>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={form.revocable}
                    onChange={(e) => setForm({ ...form, revocable: e.target.checked })}
                  />
                  <span>
                    Revocable — I can cancel this trust and reclaim any undistributed funds. Uncheck
                    for an irrevocable trust.
                  </span>
                </label>
              </div>

              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Beneficiary</h2>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Full name</label>
                    <input
                      value={form.beneficiaryName}
                      onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Relationship</label>
                    <input
                      value={form.beneficiaryRelationship}
                      onChange={(e) => setForm({ ...form, beneficiaryRelationship: e.target.value })}
                      placeholder="e.g. Daughter"
                    />
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Date of birth</label>
                    <input
                      type="date"
                      value={form.beneficiaryDateOfBirth}
                      onChange={(e) => setForm({ ...form, beneficiaryDateOfBirth: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Email (optional)</label>
                    <input
                      type="email"
                      value={form.beneficiaryEmail}
                      onChange={(e) => setForm({ ...form, beneficiaryEmail: e.target.value })}
                      placeholder="If they bank with us, funds credit automatically"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.scheduleHeader}>
                  <h2 className={styles.sectionTitle}>When should it be released?</h2>
                  <span className={pctTotal === 100 ? styles.pctOk : styles.pctBad}>Total: {pctTotal}%</span>
                </div>
                <p className={styles.hint}>
                  Add one rule for a lump sum, or several to stage the payout (e.g. a third at 21, a
                  third at 25, the rest at 30). Percentages must total 100%.
                </p>

                {rows.map((r, i) => (
                  <div key={i} className={styles.trancheEditor}>
                    <div className={styles.field}>
                      <label>Label</label>
                      <input
                        value={r.label}
                        onChange={(e) => updateRow(i, { label: e.target.value })}
                        placeholder="e.g. First tranche"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Trigger</label>
                      <select
                        value={r.triggerType}
                        onChange={(e) => updateRow(i, { triggerType: e.target.value as TriggerType })}
                      >
                        <option value="age">At age</option>
                        <option value="date">On date</option>
                      </select>
                    </div>
                    {r.triggerType === "age" ? (
                      <div className={styles.field}>
                        <label>Age</label>
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={r.triggerAge}
                          onChange={(e) => updateRow(i, { triggerAge: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className={styles.field}>
                        <label>Date</label>
                        <input
                          type="date"
                          value={r.triggerDate}
                          onChange={(e) => updateRow(i, { triggerDate: e.target.value })}
                        />
                      </div>
                    )}
                    <div className={styles.field}>
                      <label>Share %</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={r.percentage}
                        onChange={(e) => updateRow(i, { percentage: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      aria-label="Remove tranche"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button type="button" className={styles.addBtn} onClick={addRow}>
                  + Add another release
                </button>
              </div>

              <div className={styles.formSection}>
                <div className={styles.field}>
                  <label>Letter of wishes (optional)</label>
                  <textarea
                    rows={3}
                    value={form.letterOfWishes}
                    onChange={(e) => setForm({ ...form, letterOfWishes: e.target.value })}
                    placeholder="Guidance for the trustee — not legally binding."
                  />
                </div>
              </div>

              <div className={styles.submitRow}>
                <button className={styles.primaryBtn} type="submit" disabled={submitting}>
                  {submitting ? "Establishing…" : "Establish & fund trust"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
