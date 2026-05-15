"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import styles from "./track.module.css";

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
  disbursedAt?: string;
  interestRate?: number;
  monthlyPayment?: number;
  totalRepayable?: number;
  remainingBalance?: number;
  nextPaymentDate?: string;
  offerExpiry?: string;
  adminNotes?: string;
  businessName?: string;
  messages?: LoanMessage[];
  documents?: LoanDoc[];
}

const STATUS_STEPS = [
  { key: "pending", label: "Application Submitted", desc: "Your application has been received." },
  { key: "under_review", label: "Under Review", desc: "Our underwriting team is reviewing your application." },
  { key: "approved", label: "Offer Issued", desc: "Your loan has been approved. Review your offer." },
  { key: "disbursed", label: "Agreement Signed", desc: "Agreement executed. Funds being transferred." },
  { key: "active", label: "Funds Disbursed", desc: "Funds have been transferred to your account." },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0, under_review: 1, approved: 2, disbursed: 3, active: 4, closed: 5
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending Review", color: "#92400e", bg: "#fef3c7" },
  under_review: { label: "Under Review", color: "#1e40af", bg: "#dbeafe" },
  approved: { label: "Approved", color: "#065f46", bg: "#d1fae5" },
  rejected: { label: "Not Approved", color: "#991b1b", bg: "#fee2e2" },
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

export default function LoanTrackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState<"progress" | "documents" | "messages" | "details">("progress");
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; size: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState("id_document");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") fetchLoans();
  }, [status]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedLoan?.messages]);

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/loans");
      const data = await res.json();
      if (data.success && data.loans) {
        setLoans(data.loans);
        if (data.loans.length > 0 && !selectedLoan) {
          setSelectedLoan(data.loans[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLoan) return;
    setSendingMsg(true);
    try {
      const res = await fetch("/api/loans/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId: selectedLoan._id, message: newMessage.trim() })
      });
      if (res.ok) {
        setNewMessage("");
        await fetchLoans();
        const updated = loans.find(l => l._id === selectedLoan._id);
        if (updated) setSelectedLoan(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const key = uploadDocType + "_" + Date.now();
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[key] || 0;
        if (current >= 100) {
          clearInterval(interval);
          setUploadedDocs(prev2 => ({
            ...prev2,
            [key]: { name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + " MB" }
          }));
          return prev;
        }
        return { ...prev, [key]: current + 25 };
      });
    }, 200);
  };

  const getStepStatus = (loan: Loan, stepKey: string) => {
    const currentOrder = STATUS_ORDER[loan.status] ?? 0;
    const stepOrder = STATUS_ORDER[stepKey] ?? 0;
    if (loan.status === "rejected") return stepKey === "pending" ? "done" : "none";
    if (currentOrder > stepOrder) return "done";
    if (currentOrder === stepOrder) return "current";
    return "upcoming";
  };

  if (loading) {
    return (
      <div className={styles.root}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Loan Applications</h1>
              <p className={styles.pageDesc}>Track your applications, upload documents, and communicate with our team.</p>
            </div>
            <Link href="/apply" className={styles.applyBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}><path d="M12 5v14M5 12h14" /></svg>
              New Application
            </Link>
          </div>

          {loans.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "48px", height: "48px" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3>No Applications Yet</h3>
              <p>Start your loan application to access financing for your business or personal needs.</p>
              <Link href="/apply" className={styles.emptyBtn}>Apply for a Loan</Link>
            </div>
          ) : (
            <div className={styles.trackLayout}>
              {/* Loan List */}
              <div className={styles.loanList}>
                <div className={styles.loanListHeader}>My Applications ({loans.length})</div>
                {loans.map(loan => {
                  const statusInfo = STATUS_LABELS[loan.status] || STATUS_LABELS.pending;
                  return (
                    <div
                      key={loan._id}
                      className={`${styles.loanListItem} ${selectedLoan?._id === loan._id ? styles.loanListItemActive : ""}`}
                      onClick={() => { setSelectedLoan(loan); setActiveTab("progress"); }}
                    >
                      <div className={styles.loanListItemTop}>
                        <div className={styles.loanListRef}>{loan.referenceNumber}</div>
                        <div className={styles.loanListStatus} style={{ color: statusInfo.color, background: statusInfo.bg }}>
                          {statusInfo.label}
                        </div>
                      </div>
                      <div className={styles.loanListType}>{LOAN_TYPE_LABELS[loan.type] || loan.type}</div>
                      <div className={styles.loanListAmount}>{fmt(loan.amount)}</div>
                      <div className={styles.loanListDate}>{new Date(loan.applicationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                  );
                })}
              </div>

              {/* Loan Detail */}
              {selectedLoan && (
                <div className={styles.loanDetail}>
                  {/* Detail Header */}
                  <div className={styles.detailHeader}>
                    <div className={styles.detailHeaderLeft}>
                      <div className={styles.detailRef}>{selectedLoan.referenceNumber}</div>
                      <div className={styles.detailType}>{LOAN_TYPE_LABELS[selectedLoan.type] || selectedLoan.type}</div>
                    </div>
                    <div className={styles.detailHeaderRight}>
                      <div className={styles.detailAmount}>{fmt(selectedLoan.amount)}</div>
                      <div
                        className={styles.detailStatus}
                        style={{
                          color: STATUS_LABELS[selectedLoan.status]?.color || "#374151",
                          background: STATUS_LABELS[selectedLoan.status]?.bg || "#f3f4f6"
                        }}
                      >
                        {STATUS_LABELS[selectedLoan.status]?.label || selectedLoan.status}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className={styles.tabs}>
                    {(["progress", "documents", "messages", "details"] as const).map(tab => (
                      <button
                        key={tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab === "progress" && "Application Progress"}
                        {tab === "documents" && "Documents"}
                        {tab === "messages" && (
                          <>
                            Secure Messages
                            {(selectedLoan.messages?.filter(m => m.from === "admin" && !m.read).length || 0) > 0 && (
                              <span className={styles.unreadBadge}>{selectedLoan.messages?.filter(m => m.from === "admin" && !m.read).length}</span>
                            )}
                          </>
                        )}
                        {tab === "details" && "Loan Details"}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Progress */}
                  {activeTab === "progress" && (
                    <div className={styles.tabContent}>
                      {selectedLoan.status === "rejected" ? (
                        <div className={styles.rejectedBanner}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ width: "24px", height: "24px" }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                          <div>
                            <div className={styles.rejectedTitle}>Application Not Approved</div>
                            {selectedLoan.adminNotes && <div className={styles.rejectedReason}>{selectedLoan.adminNotes}</div>}
                            <div className={styles.rejectedNote}>You may reapply or contact our team for guidance.</div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.progressTimeline}>
                          {STATUS_STEPS.map((step, i) => {
                            const stepStatus = getStepStatus(selectedLoan, step.key);
                            return (
                              <div key={step.key} className={styles.timelineItem}>
                                <div className={styles.timelineLeft}>
                                  <div className={`${styles.timelineDot} ${stepStatus === "done" ? styles.timelineDotDone : stepStatus === "current" ? styles.timelineDotCurrent : styles.timelineDotUpcoming}`}>
                                    {stepStatus === "done" ? (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: "12px", height: "12px" }}><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : stepStatus === "current" ? (
                                      <div className={styles.timelinePulse} />
                                    ) : (
                                      <span>{i + 1}</span>
                                    )}
                                  </div>
                                  {i < STATUS_STEPS.length - 1 && (
                                    <div className={`${styles.timelineLine} ${stepStatus === "done" ? styles.timelineLineDone : ""}`} />
                                  )}
                                </div>
                                <div className={styles.timelineContent}>
                                  <div className={`${styles.timelineLabel} ${stepStatus === "current" ? styles.timelineLabelCurrent : stepStatus === "done" ? styles.timelineLabelDone : styles.timelineLabelUpcoming}`}>
                                    {step.label}
                                  </div>
                                  <div className={styles.timelineDesc}>{step.desc}</div>
                                  {stepStatus === "current" && selectedLoan.status === "approved" && (
                                    <div className={styles.timelineAction}>
                                      <div className={styles.offerAlert}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2" style={{ width: "16px", height: "16px" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        <span>Your loan offer is ready. Review and sign your agreement.</span>
                                      </div>
                                      {selectedLoan.offerExpiry && (
                                        <div className={styles.offerExpiry}>
                                          Offer expires: {new Date(selectedLoan.offerExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Offer Summary if approved */}
                      {(selectedLoan.status === "approved" || selectedLoan.status === "active" || selectedLoan.status === "disbursed") && selectedLoan.interestRate && (
                        <div className={styles.offerSummary}>
                          <h4 className={styles.offerSummaryTitle}>Loan Offer Summary</h4>
                          <div className={styles.offerSummaryGrid}>
                            <div className={styles.offerSummaryItem}>
                              <span>Approved Amount</span>
                              <strong>{fmt(selectedLoan.amount)}</strong>
                            </div>
                            <div className={styles.offerSummaryItem}>
                              <span>Interest Rate</span>
                              <strong>{selectedLoan.interestRate}% APR</strong>
                            </div>
                            <div className={styles.offerSummaryItem}>
                              <span>Monthly Payment</span>
                              <strong>{selectedLoan.monthlyPayment ? fmt(selectedLoan.monthlyPayment) : "—"}</strong>
                            </div>
                            <div className={styles.offerSummaryItem}>
                              <span>Total Repayable</span>
                              <strong>{selectedLoan.totalRepayable ? fmt(selectedLoan.totalRepayable) : "—"}</strong>
                            </div>
                            <div className={styles.offerSummaryItem}>
                              <span>Term</span>
                              <strong>{selectedLoan.term} months</strong>
                            </div>
                            {selectedLoan.nextPaymentDate && (
                              <div className={styles.offerSummaryItem}>
                                <span>Next Payment</span>
                                <strong>{new Date(selectedLoan.nextPaymentDate).toLocaleDateString("en-GB")}</strong>
                              </div>
                            )}
                          </div>

                          <div className={styles.documentDownloads}>
                            <div className={styles.documentDownloadsTitle}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.8" style={{ width: "18px", height: "18px" }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              Official Documents
                            </div>
                            <p className={styles.documentDownloadsDesc}>
                              Each document carries our embossed seal, watermark, and a verifiable QR code.
                            </p>
                            <div className={styles.documentDownloadsRow}>
                              <a
                                href={`/api/loans/${selectedLoan._id}/document?type=offer`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.documentDownloadBtn}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Loan Offer (PDF)
                              </a>
                              <a
                                href={`/api/loans/${selectedLoan._id}/document?type=agreement`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.documentDownloadBtn}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Facility Agreement (PDF)
                              </a>
                              {(selectedLoan.status === "disbursed" || selectedLoan.status === "active") && (
                                <a
                                  href={`/api/loans/${selectedLoan._id}/document?type=disbursement`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.documentDownloadBtn}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  Disbursement Receipt (PDF)
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Documents */}
                  {activeTab === "documents" && (
                    <div className={styles.tabContent}>
                      <div className={styles.docsSection}>
                        <div className={styles.docsSectionHeader}>
                          <h4>Uploaded Documents</h4>
                          <button className={styles.uploadNewBtn} onClick={() => fileInputRef.current?.click()}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Upload Document
                          </button>
                        </div>

                        <div className={styles.docTypeSelect}>
                          <label>Document Type</label>
                          <select value={uploadDocType} onChange={e => setUploadDocType(e.target.value)} className={styles.docTypeInput}>
                            <option value="id_document">Government-Issued ID</option>
                            <option value="proof_of_address">Proof of Address</option>
                            <option value="bank_statements">Bank Statements</option>
                            <option value="financial_statements">Financial Statements</option>
                            <option value="business_registration">Business Registration</option>
                            <option value="business_plan">Business Plan</option>
                            <option value="other">Other Document</option>
                          </select>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
                        />

                        {/* Existing docs from DB */}
                        {selectedLoan.documents && selectedLoan.documents.length > 0 ? (
                          <div className={styles.docsList}>
                            {selectedLoan.documents.map((doc, i) => (
                              <div key={i} className={styles.docItem}>
                                <div className={styles.docItemIcon}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "20px", height: "20px" }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                  </svg>
                                </div>
                                <div className={styles.docItemInfo}>
                                  <div className={styles.docItemName}>{doc.name}</div>
                                  <div className={styles.docItemMeta}>{doc.key.replace(/_/g, " ")} · {doc.size}</div>
                                </div>
                                <div className={styles.docItemStatus}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: "16px", height: "16px" }}><polyline points="20 6 9 17 4 12" /></svg>
                                  Uploaded
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.noDocsState}>
                            <p>No documents uploaded yet. Upload your ID and proof of address to proceed.</p>
                          </div>
                        )}

                        {/* In-progress uploads */}
                        {Object.entries(uploadProgress).map(([key, progress]) => (
                          progress < 100 ? (
                            <div key={key} className={styles.uploadingItem}>
                              <div className={styles.uploadingLabel}>Uploading...</div>
                              <div className={styles.uploadingBar}>
                                <div className={styles.uploadingFill} style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          ) : uploadedDocs[key] ? (
                            <div key={key} className={styles.docItem}>
                              <div className={styles.docItemIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "20px", height: "20px" }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                </svg>
                              </div>
                              <div className={styles.docItemInfo}>
                                <div className={styles.docItemName}>{uploadedDocs[key].name}</div>
                                <div className={styles.docItemMeta}>{uploadDocType.replace(/_/g, " ")} · {uploadedDocs[key].size}</div>
                              </div>
                              <div className={styles.docItemStatus} style={{ color: "#10b981" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: "16px", height: "16px" }}><polyline points="20 6 9 17 4 12" /></svg>
                                Uploaded
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab: Messages */}
                  {activeTab === "messages" && (
                    <div className={styles.tabContent}>
                      <div className={styles.messagesSection}>
                        <div className={styles.messagesHeader}>
                          <h4>Secure Messaging</h4>
                          <p>Communicate directly with your relationship manager regarding this application.</p>
                        </div>
                        <div className={styles.messagesList}>
                          {(!selectedLoan.messages || selectedLoan.messages.length === 0) ? (
                            <div className={styles.noMessages}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "32px", height: "32px" }}>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              <p>No messages yet. Send a message to our team below.</p>
                            </div>
                          ) : (
                            selectedLoan.messages.map((msg, i) => (
                              <div key={i} className={`${styles.messageItem} ${msg.from === "client" ? styles.messageItemClient : styles.messageItemAdmin}`}>
                                <div className={styles.messageBubble}>
                                  <div className={styles.messageFrom}>
                                    {msg.from === "admin" ? "Aldwych European Capital" : "You"}
                                  </div>
                                  <div className={styles.messageText}>{msg.message}</div>
                                  <div className={styles.messageTime}>
                                    {new Date(msg.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                        <div className={styles.messageCompose}>
                          <textarea
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className={styles.messageInput}
                            rows={3}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          />
                          <button className={styles.messageSendBtn} onClick={handleSendMessage} disabled={sendingMsg || !newMessage.trim()}>
                            {sendingMsg ? "Sending..." : (
                              <>
                                Send
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Details */}
                  {activeTab === "details" && (
                    <div className={styles.tabContent}>
                      <div className={styles.detailsGrid}>
                        <div className={styles.detailsItem}>
                          <span>Reference Number</span>
                          <strong>{selectedLoan.referenceNumber}</strong>
                        </div>
                        <div className={styles.detailsItem}>
                          <span>Loan Type</span>
                          <strong>{LOAN_TYPE_LABELS[selectedLoan.type] || selectedLoan.type}</strong>
                        </div>
                        <div className={styles.detailsItem}>
                          <span>Amount Requested</span>
                          <strong>{fmt(selectedLoan.amount)}</strong>
                        </div>
                        <div className={styles.detailsItem}>
                          <span>Repayment Term</span>
                          <strong>{selectedLoan.term} months</strong>
                        </div>
                        <div className={styles.detailsItem}>
                          <span>Application Date</span>
                          <strong>{new Date(selectedLoan.applicationDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
                        </div>
                        <div className={styles.detailsItem}>
                          <span>Status</span>
                          <strong style={{ color: STATUS_LABELS[selectedLoan.status]?.color }}>{STATUS_LABELS[selectedLoan.status]?.label || selectedLoan.status}</strong>
                        </div>
                        {selectedLoan.businessName && (
                          <div className={styles.detailsItem}>
                            <span>Business Name</span>
                            <strong>{selectedLoan.businessName}</strong>
                          </div>
                        )}
                        {selectedLoan.interestRate && (
                          <div className={styles.detailsItem}>
                            <span>Interest Rate</span>
                            <strong>{selectedLoan.interestRate}% APR</strong>
                          </div>
                        )}
                        {selectedLoan.monthlyPayment && (
                          <div className={styles.detailsItem}>
                            <span>Monthly Payment</span>
                            <strong>{fmt(selectedLoan.monthlyPayment)}</strong>
                          </div>
                        )}
                        {selectedLoan.totalRepayable && (
                          <div className={styles.detailsItem}>
                            <span>Total Repayable</span>
                            <strong>{fmt(selectedLoan.totalRepayable)}</strong>
                          </div>
                        )}
                        {selectedLoan.approvedAt && (
                          <div className={styles.detailsItem}>
                            <span>Approved Date</span>
                            <strong>{new Date(selectedLoan.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
                          </div>
                        )}
                        <div className={styles.detailsItemFull}>
                          <span>Purpose</span>
                          <strong>{selectedLoan.purpose}</strong>
                        </div>
                        {selectedLoan.adminNotes && (
                          <div className={styles.detailsItemFull}>
                            <span>Notes from Aldwych</span>
                            <strong>{selectedLoan.adminNotes}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
