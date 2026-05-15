"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./adminloans.module.css";

interface LoanMessage {
  from: "client" | "admin";
  message: string;
  sentAt: string;
  read: boolean;
}

interface LoanDoc {
  key: string;
  name: string;
  size: string;
  uploadedAt: string;
}

interface LoanUser {
  _id: string;
  name: string;
  email: string;
  country?: string;
}

interface Loan {
  _id: string;
  referenceNumber: string;
  type: string;
  amount: number;
  purpose: string;
  term: number;
  status: string;
  applicationDate: string;
  reviewedAt?: string;
  approvedAt?: string;
  interestRate?: number;
  monthlyPayment?: number;
  totalRepayable?: number;
  remainingBalance?: number;
  offerExpiry?: string;
  adminNotes?: string;
  businessName?: string;
  annualRevenue?: number;
  annualProfit?: number;
  existingDebt?: number;
  creditScore?: string;
  employmentStatus?: string;
  annualIncome?: number;
  kycData?: Record<string, unknown>;
  messages?: LoanMessage[];
  documents?: LoanDoc[];
  userId: LoanUser | string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
  under_review: { label: "Under Review", color: "#1e40af", bg: "#dbeafe" },
  approved: { label: "Approved", color: "#065f46", bg: "#d1fae5" },
  rejected: { label: "Rejected", color: "#991b1b", bg: "#fee2e2" },
  active: { label: "Active", color: "#065f46", bg: "#d1fae5" },
  disbursed: { label: "Disbursed", color: "#065f46", bg: "#d1fae5" },
  closed: { label: "Closed", color: "#374151", bg: "#f3f4f6" },
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  business: "Business Loan", contractor: "Contractor Financing", sme: "SME Expansion Loan",
  trade: "Trade Finance", equipment: "Equipment Financing", personal: "Personal Loan",
  mortgage: "Mortgage", auto: "Auto Loan", student: "Student Loan"
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

export default function AdminLoansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filtered, setFiltered] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "kyc" | "documents" | "messages" | "action">("overview");
  const [actionForm, setActionForm] = useState({
    action: "approve",
    interestRate: "4.9",
    approvedAmount: "",
    term: "",
    adminNotes: "",
    adminMessage: ""
  });
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, under_review: 0, approved: 0, rejected: 0, active: 0 });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") fetchLoans();
  }, [status]);

  useEffect(() => {
    let result = loans;
    if (filterStatus !== "all") result = result.filter(l => l.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => {
        const user = typeof l.userId === "object" ? l.userId : null;
        return (
          l.referenceNumber.toLowerCase().includes(q) ||
          (user?.name?.toLowerCase().includes(q)) ||
          (user?.email?.toLowerCase().includes(q)) ||
          l.type.toLowerCase().includes(q)
        );
      });
    }
    setFiltered(result);
  }, [loans, filterStatus, searchQuery]);

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/admin/loans");
      const data = await res.json();
      if (data.success) {
        setLoans(data.loans);
        const s = { total: data.loans.length, pending: 0, under_review: 0, approved: 0, rejected: 0, active: 0 };
        data.loans.forEach((l: Loan) => {
          if (l.status in s) (s as Record<string, number>)[l.status]++;
        });
        setStats(s);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedLoan) return;
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const body: Record<string, unknown> = {
        loanId: selectedLoan._id,
        action: actionForm.action,
        adminNotes: actionForm.adminNotes,
        adminMessage: actionForm.adminMessage,
      };
      if (actionForm.action === "approve") {
        body.interestRate = parseFloat(actionForm.interestRate);
        if (actionForm.approvedAmount) body.approvedAmount = parseFloat(actionForm.approvedAmount);
        if (actionForm.term) body.term = parseInt(actionForm.term);
      }
      const res = await fetch("/api/admin/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setActionSuccess(`Application ${actionForm.action === "approve" ? "approved" : actionForm.action === "reject" ? "rejected" : "updated"} successfully.`);
      await fetchLoans();
      if (data.loan) setSelectedLoan(data.loan);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getUser = (loan: Loan): LoanUser | null => {
    return typeof loan.userId === "object" ? loan.userId : null;
  };

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading loan applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/dashboard/admin">Admin</Link>
            <span>/</span>
            <span>Loan Applications</span>
          </div>
          <h1 className={styles.pageTitle}>Loan Applications</h1>
          <p className={styles.pageDesc}>Review, approve, and manage all loan applications.</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchLoans}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: "Total Applications", value: stats.total, color: "#0d2440" },
          { label: "Pending Review", value: stats.pending, color: "#92400e" },
          { label: "Under Review", value: stats.under_review, color: "#1e40af" },
          { label: "Approved", value: stats.approved, color: "#065f46" },
          { label: "Rejected", value: stats.rejected, color: "#991b1b" },
          { label: "Active Loans", value: stats.active, color: "#065f46" },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Left: Application List */}
        <div className={styles.listPanel}>
          <div className={styles.listControls}>
            <input
              type="text"
              placeholder="Search by name, email, reference..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={styles.filterSelect}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="disbursed">Disbursed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className={styles.listCount}>{filtered.length} application{filtered.length !== 1 ? "s" : ""}</div>
          <div className={styles.applicationList}>
            {filtered.length === 0 ? (
              <div className={styles.emptyList}>No applications found.</div>
            ) : (
              filtered.map(loan => {
                const user = getUser(loan);
                const statusInfo = STATUS_LABELS[loan.status] || STATUS_LABELS.pending;
                const unread = loan.messages?.filter(m => m.from === "client" && !m.read).length || 0;
                return (
                  <div
                    key={loan._id}
                    className={`${styles.appItem} ${selectedLoan?._id === loan._id ? styles.appItemActive : ""}`}
                    onClick={() => { setSelectedLoan(loan); setActiveTab("overview"); setActionSuccess(""); setActionError(""); }}
                  >
                    <div className={styles.appItemTop}>
                      <div className={styles.appRef}>{loan.referenceNumber}</div>
                      <div className={styles.appStatus} style={{ color: statusInfo.color, background: statusInfo.bg }}>
                        {statusInfo.label}
                      </div>
                    </div>
                    <div className={styles.appName}>{user?.name || "Unknown"}</div>
                    <div className={styles.appEmail}>{user?.email || ""}</div>
                    <div className={styles.appBottom}>
                      <span className={styles.appType}>{LOAN_TYPE_LABELS[loan.type] || loan.type}</span>
                      <span className={styles.appAmount}>{fmt(loan.amount)}</span>
                    </div>
                    {unread > 0 && <div className={styles.unreadBadge}>{unread} new message{unread > 1 ? "s" : ""}</div>}
                    <div className={styles.appDate}>{new Date(loan.applicationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Application Detail */}
        {selectedLoan ? (
          <div className={styles.detailPanel}>
            {/* Detail Header */}
            <div className={styles.detailHeader}>
              <div className={styles.detailHeaderLeft}>
                <div className={styles.detailRef}>{selectedLoan.referenceNumber}</div>
                <div className={styles.detailType}>{LOAN_TYPE_LABELS[selectedLoan.type] || selectedLoan.type}</div>
                <div className={styles.detailUser}>{getUser(selectedLoan)?.name} · {getUser(selectedLoan)?.email}</div>
              </div>
              <div className={styles.detailHeaderRight}>
                <div className={styles.detailAmount}>{fmt(selectedLoan.amount)}</div>
                <div
                  className={styles.detailStatus}
                  style={{ color: STATUS_LABELS[selectedLoan.status]?.color, background: STATUS_LABELS[selectedLoan.status]?.bg }}
                >
                  {STATUS_LABELS[selectedLoan.status]?.label || selectedLoan.status}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              {(["overview", "kyc", "documents", "messages", "action"] as const).map(tab => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "overview" && "Overview"}
                  {tab === "kyc" && "KYC Data"}
                  {tab === "documents" && "Documents"}
                  {tab === "messages" && (
                    <>
                      Messages
                      {(selectedLoan.messages?.filter(m => m.from === "client" && !m.read).length || 0) > 0 && (
                        <span className={styles.msgBadge}>{selectedLoan.messages?.filter(m => m.from === "client" && !m.read).length}</span>
                      )}
                    </>
                  )}
                  {tab === "action" && "Take Action"}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className={styles.tabContent}>
                <div className={styles.overviewGrid}>
                  <div className={styles.overviewItem}><span>Reference</span><strong>{selectedLoan.referenceNumber}</strong></div>
                  <div className={styles.overviewItem}><span>Loan Type</span><strong>{LOAN_TYPE_LABELS[selectedLoan.type] || selectedLoan.type}</strong></div>
                  <div className={styles.overviewItem}><span>Amount Requested</span><strong>{fmt(selectedLoan.amount)}</strong></div>
                  <div className={styles.overviewItem}><span>Term</span><strong>{selectedLoan.term} months</strong></div>
                  <div className={styles.overviewItem}><span>Application Date</span><strong>{new Date(selectedLoan.applicationDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></div>
                  <div className={styles.overviewItem}><span>Status</span><strong style={{ color: STATUS_LABELS[selectedLoan.status]?.color }}>{STATUS_LABELS[selectedLoan.status]?.label}</strong></div>
                  {selectedLoan.businessName && <div className={styles.overviewItem}><span>Business Name</span><strong>{selectedLoan.businessName}</strong></div>}
                  {selectedLoan.annualRevenue && <div className={styles.overviewItem}><span>Annual Revenue</span><strong>{fmt(selectedLoan.annualRevenue)}</strong></div>}
                  {selectedLoan.annualProfit && <div className={styles.overviewItem}><span>Annual Profit</span><strong>{fmt(selectedLoan.annualProfit)}</strong></div>}
                  {selectedLoan.existingDebt && <div className={styles.overviewItem}><span>Existing Debt</span><strong>{fmt(selectedLoan.existingDebt)}</strong></div>}
                  {selectedLoan.annualIncome && <div className={styles.overviewItem}><span>Annual Income</span><strong>{fmt(selectedLoan.annualIncome)}</strong></div>}
                  {selectedLoan.creditScore && <div className={styles.overviewItem}><span>Credit Profile</span><strong style={{ textTransform: "capitalize" }}>{selectedLoan.creditScore}</strong></div>}
                  {selectedLoan.employmentStatus && <div className={styles.overviewItem}><span>Employment</span><strong>{selectedLoan.employmentStatus}</strong></div>}
                  {selectedLoan.interestRate && <div className={styles.overviewItem}><span>Approved Rate</span><strong>{selectedLoan.interestRate}% APR</strong></div>}
                  {selectedLoan.monthlyPayment && <div className={styles.overviewItem}><span>Monthly Payment</span><strong>{fmt(selectedLoan.monthlyPayment)}</strong></div>}
                  {selectedLoan.adminNotes && <div className={styles.overviewItemFull}><span>Admin Notes</span><strong>{selectedLoan.adminNotes}</strong></div>}
                  <div className={styles.overviewItemFull}><span>Purpose</span><strong>{selectedLoan.purpose}</strong></div>
                </div>
              </div>
            )}

            {/* Tab: KYC */}
            {activeTab === "kyc" && (
              <div className={styles.tabContent}>
                {selectedLoan.kycData ? (
                  <div className={styles.kycSection}>
                    <div className={styles.kycBadge}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2" style={{ width: "16px", height: "16px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      KYC Information Submitted
                    </div>
                    <div className={styles.overviewGrid}>
                      {Object.entries(selectedLoan.kycData).map(([key, value]) => (
                        typeof value === "string" || typeof value === "number" ? (
                          <div key={key} className={styles.overviewItem}>
                            <span>{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</span>
                            <strong>{String(value)}</strong>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.noKyc}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ width: "32px", height: "32px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <p>No KYC data submitted for this application.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Documents */}
            {activeTab === "documents" && (
              <div className={styles.tabContent}>
                {selectedLoan.documents && selectedLoan.documents.length > 0 ? (
                  <div className={styles.docsList}>
                    {selectedLoan.documents.map((doc, i) => (
                      <div key={i} className={styles.docItem}>
                        <div className={styles.docIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "20px", height: "20px" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className={styles.docInfo}>
                          <div className={styles.docName}>{doc.name}</div>
                          <div className={styles.docMeta}>{doc.key.replace(/_/g, " ")} · {doc.size} · {new Date(doc.uploadedAt).toLocaleDateString("en-GB")}</div>
                        </div>
                        <div className={styles.docVerified}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: "14px", height: "14px" }}><polyline points="20 6 9 17 4 12" /></svg>
                          Received
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noKyc}>
                    <p>No documents uploaded by the applicant yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Messages */}
            {activeTab === "messages" && (
              <div className={styles.tabContent}>
                <div className={styles.messagesSection}>
                  <div className={styles.messagesList}>
                    {(!selectedLoan.messages || selectedLoan.messages.length === 0) ? (
                      <div className={styles.noMessages}>No messages on this application.</div>
                    ) : (
                      selectedLoan.messages.map((msg, i) => (
                        <div key={i} className={`${styles.messageItem} ${msg.from === "admin" ? styles.messageItemAdmin : styles.messageItemClient}`}>
                          <div className={styles.messageBubble}>
                            <div className={styles.messageFrom}>{msg.from === "admin" ? "Aldwych (Admin)" : "Applicant"}</div>
                            <div className={styles.messageText}>{msg.message}</div>
                            <div className={styles.messageTime}>{new Date(msg.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className={styles.messageCompose}>
                    <textarea
                      value={actionForm.adminMessage}
                      onChange={e => setActionForm(p => ({ ...p, adminMessage: e.target.value }))}
                      placeholder="Send a message to the applicant..."
                      className={styles.messageInput}
                      rows={3}
                    />
                    <button
                      className={styles.messageSendBtn}
                      disabled={actionLoading || !actionForm.adminMessage.trim()}
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await fetch("/api/admin/loans", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ loanId: selectedLoan._id, action: "message", adminMessage: actionForm.adminMessage })
                          });
                          setActionForm(p => ({ ...p, adminMessage: "" }));
                          await fetchLoans();
                        } finally { setActionLoading(false); }
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Action */}
            {activeTab === "action" && (
              <div className={styles.tabContent}>
                {actionSuccess && <div className={styles.successBanner}>{actionSuccess}</div>}
                {actionError && <div className={styles.errorBanner}>{actionError}</div>}
                <div className={styles.actionSection}>
                  <h4 className={styles.actionTitle}>Take Action on This Application</h4>
                  <div className={styles.actionTypeRow}>
                    {[
                      { value: "approve", label: "Approve", color: "#065f46", bg: "#d1fae5" },
                      { value: "under_review", label: "Mark Under Review", color: "#1e40af", bg: "#dbeafe" },
                      { value: "reject", label: "Reject", color: "#991b1b", bg: "#fee2e2" },
                    ].map(a => (
                      <button
                        key={a.value}
                        className={`${styles.actionTypeBtn} ${actionForm.action === a.value ? styles.actionTypeBtnActive : ""}`}
                        style={actionForm.action === a.value ? { color: a.color, background: a.bg, borderColor: a.color } : {}}
                        onClick={() => setActionForm(p => ({ ...p, action: a.value }))}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>

                  {actionForm.action === "approve" && (
                    <div className={styles.approveFields}>
                      <div className={styles.fieldGroup}>
                        <label>Interest Rate (APR %)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={actionForm.interestRate}
                          onChange={e => setActionForm(p => ({ ...p, interestRate: e.target.value }))}
                          className={styles.fieldInput}
                          placeholder="e.g. 4.9"
                        />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label>Approved Amount (€) — leave blank to use requested amount</label>
                        <input
                          type="number"
                          value={actionForm.approvedAmount}
                          onChange={e => setActionForm(p => ({ ...p, approvedAmount: e.target.value }))}
                          className={styles.fieldInput}
                          placeholder={`Default: ${selectedLoan.amount.toLocaleString()}`}
                        />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label>Term (months) — leave blank to use requested term</label>
                        <input
                          type="number"
                          value={actionForm.term}
                          onChange={e => setActionForm(p => ({ ...p, term: e.target.value }))}
                          className={styles.fieldInput}
                          placeholder={`Default: ${selectedLoan.term} months`}
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.fieldGroup}>
                    <label>Internal Notes (visible to admin only)</label>
                    <textarea
                      value={actionForm.adminNotes}
                      onChange={e => setActionForm(p => ({ ...p, adminNotes: e.target.value }))}
                      className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                      placeholder="Add internal notes about this decision..."
                      rows={3}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Message to Applicant (optional — will be sent via secure messaging)</label>
                    <textarea
                      value={actionForm.adminMessage}
                      onChange={e => setActionForm(p => ({ ...p, adminMessage: e.target.value }))}
                      className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                      placeholder="Optional message to send to the applicant..."
                      rows={3}
                    />
                  </div>

                  <button
                    className={`${styles.submitActionBtn} ${actionForm.action === "reject" ? styles.submitActionBtnReject : ""}`}
                    onClick={handleAction}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : (
                      actionForm.action === "approve" ? "Approve & Send Offer" :
                      actionForm.action === "reject" ? "Reject Application" :
                      "Mark as Under Review"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noSelection}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "48px", height: "48px" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
            <p>Select an application from the list to review it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
