"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/currency";
import styles from "./admintrusts.module.css";

interface Distribution {
  label: string;
  triggerType: "age" | "date";
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
  settlorName: string;
  settlorEmail: string;
  beneficiaryName: string;
  beneficiaryDateOfBirth: string;
  beneficiaryRelationship?: string;
  beneficiaryEmail?: string;
  currency: string;
  principalAmount: number;
  heldBalance: number;
  fundingAccount: string;
  revocable: boolean;
  status: string;
  distributions: Distribution[];
  fundedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

interface CurrencyTotal {
  held: number;
  principal: number;
  count: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  active: { label: "Active — Holding", color: "#065f46", bg: "#d1fae5" },
  distributing: { label: "Distributing", color: "#b45309", bg: "#fef3c7" },
  completed: { label: "Completed", color: "#374151", bg: "#f3f4f6" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2" },
};

const DOC_LABELS: Record<string, string> = {
  deed: "Declaration of Trust",
  certificate: "Certificate",
  funding_receipt: "Contribution Receipt",
  letter_of_wishes: "Letter of Wishes",
  distribution_statement: "Distribution Statement",
  completion_statement: "Completion Statement",
  deed_of_revocation: "Deed of Revocation",
};

function docsForStatus(status: string): string[] {
  const base = ["deed", "certificate", "funding_receipt", "letter_of_wishes"];
  if (status === "distributing" || status === "completed") base.push("distribution_statement");
  if (status === "completed") base.push("completion_statement");
  if (status === "cancelled") return [...base, "deed_of_revocation"];
  return base;
}

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminTrustsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [filtered, setFiltered] = useState<Trust[]>([]);
  const [selected, setSelected] = useState<Trust | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, CurrencyTotal>>({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") fetchTrusts();
  }, [status]);

  useEffect(() => {
    let result = trusts;
    if (filterStatus !== "all") result = result.filter((t) => t.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.trustName.toLowerCase().includes(q) ||
          t.referenceNumber.toLowerCase().includes(q) ||
          t.settlorName.toLowerCase().includes(q) ||
          t.beneficiaryName.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [trusts, filterStatus, search]);

  async function fetchTrusts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trusts");
      if (res.ok) {
        const data = await res.json();
        setTrusts(data.trusts || []);
        setStatusCounts(data.statusCounts || {});
        setTotalsByCurrency(data.totalsByCurrency || {});
      } else if (res.status === 403 || res.status === 401) {
        setBanner({ type: "err", text: "Administrator access required." });
      }
    } catch {
      setBanner({ type: "err", text: "Failed to load trusts." });
    } finally {
      setLoading(false);
    }
  }

  async function runDistributions() {
    if (!confirm("Run the maturity engine now? This releases any tranche whose age/date trigger has passed.")) return;
    setRunning(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/trusts", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const s = data.summary || {};
        setBanner({
          type: "ok",
          text: `Engine run complete — ${s.releasedTranches || 0} tranche(s) released across ${s.processedTrusts || 0} trust(s).`,
        });
        await fetchTrusts();
      } else {
        setBanner({ type: "err", text: data.error || "Failed to run distributions." });
      }
    } catch {
      setBanner({ type: "err", text: "Network error running distributions." });
    } finally {
      setRunning(false);
    }
  }

  const stat = (k: string) => statusCounts[k] || 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>Administration · Trusts &amp; Estates</div>
          <h1 className={styles.pageTitle}>Trust Administration</h1>
          <p className={styles.pageDesc}>
            Trustee console for all inheritance trusts. Amounts are shown in each trust&apos;s own currency,
            matching what the settlor and beneficiary see.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={fetchTrusts} disabled={loading}>
            Refresh
          </button>
          <button className={styles.primaryBtn} onClick={runDistributions} disabled={running}>
            {running ? "Running…" : "Run distributions now"}
          </button>
        </div>
      </div>

      {banner && (
        <div className={banner.type === "ok" ? styles.alertOk : styles.alertErr}>{banner.text}</div>
      )}

      {/* Status stats */}
      <div className={styles.statsRow}>
        {[
          { label: "Total Trusts", value: trusts.length, color: "#0d2440" },
          { label: "Active", value: stat("active"), color: "#065f46" },
          { label: "Distributing", value: stat("distributing"), color: "#b45309" },
          { label: "Completed", value: stat("completed"), color: "#374151" },
          { label: "Cancelled", value: stat("cancelled"), color: "#991b1b" },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Assets under trust, per currency */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <div className={styles.aumRow}>
          <span className={styles.aumTitle}>Assets held in trust</span>
          {Object.entries(totalsByCurrency).map(([cur, t]) => (
            <div key={cur} className={styles.aumCard}>
              <div className={styles.aumValue}>{formatMoney(t.held, cur)}</div>
              <div className={styles.aumMeta}>
                {cur} · {t.count} trust{t.count !== 1 ? "s" : ""} · {formatMoney(t.principal, cur)} settled
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <input
          className={styles.search}
          placeholder="Search by trust, reference, settlor, beneficiary…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filter} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="distributing">Distributing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className={styles.count}>{filtered.length} trust{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No trusts found.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Trust / Reference</th>
                <th>Settlor</th>
                <th>Beneficiary</th>
                <th className={styles.right}>Principal</th>
                <th className={styles.right}>Held</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const si = STATUS_LABELS[t.status] || STATUS_LABELS.pending;
                return (
                  <tr key={t._id}>
                    <td>
                      <div className={styles.trustName}>{t.trustName}</div>
                      <div className={styles.ref}>{t.referenceNumber}</div>
                    </td>
                    <td>{t.settlorName}</td>
                    <td>
                      {t.beneficiaryName}
                      {t.beneficiaryRelationship ? <span className={styles.rel}> ({t.beneficiaryRelationship})</span> : null}
                    </td>
                    <td className={styles.right}>{formatMoney(t.principalAmount, t.currency)}</td>
                    <td className={styles.right}>{formatMoney(t.heldBalance, t.currency)}</td>
                    <td>
                      <span className={styles.badge} style={{ color: si.color, background: si.bg }}>
                        {si.label}
                      </span>
                    </td>
                    <td>
                      <button className={styles.viewBtn} onClick={() => setSelected(t)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div>
                <h2 className={styles.drawerTitle}>{selected.trustName}</h2>
                <span className={styles.ref}>{selected.referenceNumber}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>

            <div className={styles.detailGrid}>
              <div><span>Settlor</span><strong>{selected.settlorName}</strong></div>
              <div><span>Settlor email</span><strong>{selected.settlorEmail}</strong></div>
              <div><span>Beneficiary</span><strong>{selected.beneficiaryName}</strong></div>
              <div><span>Beneficiary D.O.B.</span><strong>{fmtDate(selected.beneficiaryDateOfBirth)}</strong></div>
              <div><span>Principal</span><strong>{formatMoney(selected.principalAmount, selected.currency)}</strong></div>
              <div><span>Held in trust</span><strong>{formatMoney(selected.heldBalance, selected.currency)}</strong></div>
              <div><span>Currency</span><strong>{selected.currency}</strong></div>
              <div><span>Nature</span><strong>{selected.revocable ? "Revocable" : "Irrevocable"}</strong></div>
              <div><span>Funded from</span><strong>{selected.fundingAccount}</strong></div>
              <div><span>Established</span><strong>{fmtDate(selected.fundedAt || selected.createdAt)}</strong></div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Distribution schedule</div>
              {selected.distributions.map((d, i) => (
                <div key={i} className={styles.trancheRow}>
                  <span className={styles.trancheLabel}>{d.label}</span>
                  <span className={styles.trancheTrigger}>
                    {d.triggerType === "age" ? `at age ${d.triggerAge}` : d.triggerDate ? `on ${fmtDate(d.triggerDate)}` : ""}
                  </span>
                  <span className={styles.tranchePct}>{d.percentage}%</span>
                  <span className={d.status === "released" ? styles.released : styles.scheduled}>
                    {d.status === "released" ? `released ${formatMoney(d.releasedAmount || 0, selected.currency)}` : "scheduled"}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Documents</div>
              <div className={styles.docLinks}>
                {docsForStatus(selected.status).map((type) => (
                  <a
                    key={type}
                    className={styles.docLink}
                    href={`/api/trusts/${selected._id}/document?type=${type}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ↓ {DOC_LABELS[type]}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
