// src/app/admin/transfers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import styles from "./transfers.module.css";

// Path: src/app/dashboard/admin/transfers/page.tsx

interface Transfer {
  _id: string;
  reference: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  type: string;
  amount: number;
  status: string;
  accountType: string;
  description: string;
  createdAt: string;
  metadata?: {
    recipientName?: string;
    recipientBank?: string;
    recipientAccount?: string;
    recipientAccountFull?: string;
    recipientRoutingFull?: string;
    transferSpeed?: string;
    fee?: number;
    totalAmount?: number;
    verificationRequired?: boolean;
    verificationCode?: string;
    verificationCompleted?: boolean;
    userConfirmedReceipt?: boolean;
  };
}

export default function AdminTransfersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'verification' | 'completed'>('pending');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchTransfers();
    }
  }, [status, filter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/transfers?filter=${filter}`);
      const data = await response.json();
      
      if (data.success) {
        setTransfers(data.transfers || []);
      } else {
        setError(data.error || "Failed to load transfers");
      }
    } catch (err) {
      setError("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCode = (code: string) => {
    const cleaned = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    if (formatted.replace(/-/g, '').length <= 16) {
      setVerificationCode(formatted);
    }
  };

  const openCodeModal = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setVerificationCode("");
    setAdminNotes("");
    setShowCodeModal(true);
    setError("");
    setSuccess("");
  };

  const handleAttachCode = async () => {
    if (!selectedTransfer) return;
    
    const cleanCode = verificationCode.replace(/-/g, '');
    if (cleanCode.length !== 16) {
      setError("Please enter a valid 16-digit code");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch('/api/admin/transfers/attach-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTransfer._id,
          verificationCode: cleanCode,
          adminNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Verification code attached! User has been notified via email.");
        setShowCodeModal(false);
        fetchTransfers();
      } else {
        setError(data.error || "Failed to attach code");
      }
    } catch (err) {
      setError("Failed to attach code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (transfer: Transfer) => {
    if (!confirm(`Approve transfer ${transfer.reference} for ${formatCurrency(transfer.amount)}?`)) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/transactions/${transfer._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Transfer approved! Balance has been deducted.");
        fetchTransfers();
      } else {
        setError(data.error || "Failed to approve transfer");
      }
    } catch (err) {
      setError("Failed to approve transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (transfer: Transfer) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/transactions/${transfer._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Transfer rejected.");
        fetchTransfers();
      } else {
        setError(data.error || "Failed to reject transfer");
      }
    } catch (err) {
      setError("Failed to reject transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (transfer: Transfer) => {
    if (transfer.status === 'completed') {
      return <span className={`${styles.badge} ${styles.completed}`}>Completed</span>;
    }
    if (transfer.status === 'rejected') {
      return <span className={`${styles.badge} ${styles.rejected}`}>Rejected</span>;
    }
    if (transfer.metadata?.verificationCompleted) {
      return <span className={`${styles.badge} ${styles.verified}`}>Verified - Ready</span>;
    }
    if (transfer.metadata?.verificationCode) {
      return <span className={`${styles.badge} ${styles.awaiting}`}>Awaiting User Verification</span>;
    }
    return <span className={`${styles.badge} ${styles.pending}`}>Pending - Needs Code</span>;
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <AdminSidebar />
        <div className={styles.mainContent}>
          <div className={styles.loadingScreen}>
            <div className={styles.spinner}></div>
            <p>Loading transfers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <AdminSidebar />
      
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <div>
            <h1>Transfer Management</h1>
            <p>Manage external transfers and attach verification codes</p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchTransfers}>
            🔄 Refresh
          </button>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}
        {success && <div className={styles.successAlert}>{success}</div>}

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button 
            className={`${styles.filterTab} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`${styles.filterTab} ${filter === 'verification' ? styles.active : ''}`}
            onClick={() => setFilter('verification')}
          >
            Awaiting Verification
          </button>
          <button 
            className={`${styles.filterTab} ${filter === 'completed' ? styles.active : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button 
            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>

        {/* Transfers List */}
        <div className={styles.transfersList}>
          {transfers.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No transfers found</p>
            </div>
          ) : (
            transfers.map(transfer => (
              <div key={transfer._id} className={styles.transferCard}>
                <div className={styles.transferHeader}>
                  <div className={styles.transferRef}>
                    <span className={styles.refLabel}>Reference</span>
                    <strong>{transfer.reference}</strong>
                  </div>
                  {getStatusBadge(transfer)}
                </div>

                <div className={styles.transferBody}>
                  <div className={styles.transferAmount}>
                    {formatCurrency(transfer.amount)}
                    {transfer.metadata?.fee && transfer.metadata.fee > 0 && (
                      <span className={styles.feeTag}>+ {formatCurrency(transfer.metadata.fee)} fee</span>
                    )}
                  </div>

                  <div className={styles.transferDetails}>
                    <div className={styles.detailRow}>
                      <span>User:</span>
                      <strong>{transfer.userId?.name || 'Unknown'} ({transfer.userId?.email})</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>From:</span>
                      <strong>{transfer.accountType}</strong>
                    </div>
                    {transfer.metadata?.recipientName && (
                      <>
                        <div className={styles.detailRow}>
                          <span>To:</span>
                          <strong>{transfer.metadata.recipientName}</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Bank:</span>
                          <strong>{transfer.metadata.recipientBank}</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Account:</span>
                          <strong>{transfer.metadata.recipientAccountFull || transfer.metadata.recipientAccount}</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Routing:</span>
                          <strong>{transfer.metadata.recipientRoutingFull || '****'}</strong>
                        </div>
                      </>
                    )}
                    <div className={styles.detailRow}>
                      <span>Speed:</span>
                      <strong>{transfer.metadata?.transferSpeed || 'standard'}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Date:</span>
                      <strong>{formatDate(transfer.createdAt)}</strong>
                    </div>
                    {transfer.metadata?.verificationCode && (
                      <div className={styles.detailRow}>
                        <span>Code:</span>
                        <strong className={styles.codeDisplay}>
                          {formatCode(transfer.metadata.verificationCode)}
                        </strong>
                      </div>
                    )}
                    {transfer.metadata?.userConfirmedReceipt && (
                      <div className={styles.detailRow}>
                        <span>User Confirmed:</span>
                        <strong className={styles.confirmedBadge}>✓ Receipt Confirmed</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.transferActions}>
                  {transfer.status === 'pending' && !transfer.metadata?.verificationCode && (
                    <button 
                      className={styles.attachBtn}
                      onClick={() => openCodeModal(transfer)}
                    >
                      🔐 Attach Verification Code
                    </button>
                  )}
                  
                  {transfer.metadata?.verificationCompleted && transfer.status === 'pending' && (
                    <>
                      <button 
                        className={styles.approveBtn}
                        onClick={() => handleApprove(transfer)}
                        disabled={submitting}
                      >
                        ✓ Approve & Deduct Balance
                      </button>
                      <button 
                        className={styles.rejectBtn}
                        onClick={() => handleReject(transfer)}
                        disabled={submitting}
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}

                  {transfer.metadata?.verificationCode && !transfer.metadata?.verificationCompleted && (
                    <span className={styles.waitingNote}>
                      Waiting for user to complete verification...
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Attach Code Modal */}
        {showCodeModal && selectedTransfer && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>Attach Verification Code</h2>
                <button className={styles.closeBtn} onClick={() => setShowCodeModal(false)}>×</button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalInfo}>
                  <p><strong>Reference:</strong> {selectedTransfer.reference}</p>
                  <p><strong>Amount:</strong> {formatCurrency(selectedTransfer.amount)}</p>
                  <p><strong>User:</strong> {selectedTransfer.userId?.name}</p>
                  <p><strong>Recipient:</strong> {selectedTransfer.metadata?.recipientName}</p>
                </div>

                <div className={styles.inputGroup}>
                  <label>Verification Code (16 digits)</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={handleCodeChange}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className={styles.codeInput}
                    maxLength={19}
                  />
                  <span className={styles.hint}>Enter the Rewarble gift card code</span>
                </div>

                <div className={styles.inputGroup}>
                  <label>Admin Notes (Optional)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Any notes about this transfer..."
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                {error && <div className={styles.modalError}>{error}</div>}

                <div className={styles.warningBox}>
                  <span>⚠️</span>
                  <p>Once attached, the user will receive an email with instructions to complete verification. They will enter this code on the external verification portal.</p>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => setShowCodeModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={styles.submitBtn}
                  onClick={handleAttachCode}
                  disabled={submitting || verificationCode.replace(/-/g, '').length !== 16}
                >
                  {submitting ? 'Attaching...' : 'Attach Code & Notify User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}