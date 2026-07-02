// src/app/verify/[ref]/page.tsx
// Public document verification landing page (reached by scanning QR).

import Link from "next/link";
import Image from "next/image";
import styles from "./verify.module.css";

interface VerifyResponse {
  verified: boolean;
  error?: string;
  issuer?: string;
  issuerEstablished?: string;
  referenceNumber?: string;
  documentType?: string;
  status?: string;
  amount?: number;
  currency?: string;
  verifiedAt?: string;
  // Loan-specific
  borrower?: string;
  loanType?: string;
  termMonths?: number;
  interestRate?: number;
  monthlyPayment?: number;
  issuedAt?: string;
  offerExpiry?: string;
  agreementSignedAt?: string;
  // Transfer receipt
  customer?: string;
  receiptNumber?: string;
  action?: string;
  accountType?: string;
  initiatedAt?: string;
  settledAt?: string;
  // Restriction notice
  reasonCategory?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  liftedAt?: string;
  issuedBy?: string;
  issuedByTitle?: string;
  // Adjustment / reversal
  reversedReference?: string;
}

async function fetchVerification(ref: string): Promise<VerifyResponse> {
  try {
    const base =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const res = await fetch(`${base}/api/verify/${encodeURIComponent(ref)}`, {
      cache: "no-store",
    });
    return (await res.json()) as VerifyResponse;
  } catch {
    return { verified: false, error: "Could not reach verification service." };
  }
}

const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });


export default async function VerifyPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const data = await fetchVerification(ref);

  return (
    <div className={styles.root}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/Logo.png" alt="Aldwych European Capital" width={170} height={42} priority />
          </Link>
          <Link href="/" className={styles.navLink}>Back to Home</Link>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.eyebrow}>Document Verification</div>

        {data.verified ? (
          <div className={`${styles.card} ${styles.verifiedCard}`}>
            <div className={styles.statusBlock}>
              <div className={styles.verifiedIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 36, height: 36 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <h1 className={styles.statusTitle}>Document Verified Genuine</h1>
                <p className={styles.statusSub}>
                  This document was issued by {data.issuer} and matches our official registry.
                </p>
              </div>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span>Issuer</span>
                <strong>{data.issuer} <em>(Est. {data.issuerEstablished})</em></strong>
              </div>
              <div className={styles.detailItem}>
                <span>Reference Number</span>
                <strong>{data.referenceNumber}</strong>
              </div>
              {data.receiptNumber && (
                <div className={styles.detailItem}>
                  <span>Receipt Number</span>
                  <strong>{data.receiptNumber}</strong>
                </div>
              )}
              <div className={styles.detailItem}>
                <span>Document Type</span>
                <strong>{data.documentType}</strong>
              </div>
              <div className={styles.detailItem}>
                <span>Status</span>
                <strong className={styles.statusBadge}>{data.status?.replace(/_/g, " ").toUpperCase()}</strong>
              </div>

              {/* Person / entity — loan uses "borrower", everything else uses "customer" */}
              {data.borrower && !data.customer && (
                <div className={styles.detailItem}>
                  <span>Borrower</span>
                  <strong>{data.borrower}</strong>
                </div>
              )}
              {data.customer && (
                <div className={styles.detailItem}>
                  <span>Account Holder</span>
                  <strong>{data.customer}</strong>
                </div>
              )}

              {/* ── Loan-specific fields ── */}
              {data.loanType && (
                <div className={styles.detailItem}>
                  <span>Facility Type</span>
                  <strong>{data.loanType}</strong>
                </div>
              )}
              <div className={styles.detailItem}>
                <span>Amount</span>
                <strong>{data.amount !== undefined ? fmtMoney(data.amount, data.currency || "USD") : "—"}</strong>
              </div>
              {data.termMonths !== undefined && (
                <div className={styles.detailItem}>
                  <span>Term</span>
                  <strong>{data.termMonths} months</strong>
                </div>
              )}
              {data.interestRate !== undefined && (
                <div className={styles.detailItem}>
                  <span>Interest Rate</span>
                  <strong>{data.interestRate}% APR</strong>
                </div>
              )}
              {data.monthlyPayment !== undefined && (
                <div className={styles.detailItem}>
                  <span>Monthly Payment</span>
                  <strong>{fmtMoney(data.monthlyPayment, data.currency || "USD")}</strong>
                </div>
              )}

              {/* ── Transfer-specific fields ── */}
              {data.accountType && (
                <div className={styles.detailItem}>
                  <span>Account</span>
                  <strong>{data.accountType.charAt(0).toUpperCase() + data.accountType.slice(1)}</strong>
                </div>
              )}
              {data.initiatedAt && (
                <div className={styles.detailItem}>
                  <span>Initiated</span>
                  <strong>{fmtDate(data.initiatedAt)}</strong>
                </div>
              )}
              {data.settledAt && (
                <div className={styles.detailItem}>
                  <span>Settled</span>
                  <strong>{fmtDate(data.settledAt)}</strong>
                </div>
              )}

              {/* ── Restriction-specific fields ── */}
              {data.reasonCategory && (
                <div className={styles.detailItem}>
                  <span>Reason</span>
                  <strong>{data.reasonCategory}</strong>
                </div>
              )}
              {data.effectiveFrom && (
                <div className={styles.detailItem}>
                  <span>Effective From</span>
                  <strong>{fmtDate(data.effectiveFrom)}</strong>
                </div>
              )}
              {data.effectiveUntil && (
                <div className={styles.detailItem}>
                  <span>Effective Until</span>
                  <strong>{fmtDate(data.effectiveUntil)}</strong>
                </div>
              )}
              {data.liftedAt && (
                <div className={styles.detailItem}>
                  <span>Lifted</span>
                  <strong>{fmtDate(data.liftedAt)}</strong>
                </div>
              )}
              {data.issuedBy && (
                <div className={styles.detailItem}>
                  <span>Issued By</span>
                  <strong>{data.issuedBy}{data.issuedByTitle ? `, ${data.issuedByTitle}` : ""}</strong>
                </div>
              )}

              {/* ── Adjustment / reversal ── */}
              {data.reversedReference && (
                <div className={styles.detailItem}>
                  <span>Original Reference</span>
                  <strong>{data.reversedReference}</strong>
                </div>
              )}

              {/* ── Common date fields ── */}
              {data.issuedAt && (
                <div className={styles.detailItem}>
                  <span>Issued</span>
                  <strong>{fmtDate(data.issuedAt)}</strong>
                </div>
              )}
              {data.offerExpiry && (
                <div className={styles.detailItem}>
                  <span>Offer Valid Until</span>
                  <strong>{fmtDate(data.offerExpiry)}</strong>
                </div>
              )}
              {data.agreementSignedAt && (
                <div className={styles.detailItem}>
                  <span>Agreement Signed</span>
                  <strong>{fmtDate(data.agreementSignedAt)}</strong>
                </div>
              )}
            </div>

            <div className={styles.verifyStamp}>
              <div className={styles.stampInner}>
                <span>VERIFIED</span>
                <strong>{data.verifiedAt ? fmtDate(data.verifiedAt) : ""}</strong>
              </div>
            </div>

            <p className={styles.notice}>
              This electronic verification confirms the authenticity of the document associated with the reference
              above. For questions about this document, contact{" "}
              <a href="mailto:support@aldwycheuropeancapital.com">support@aldwycheuropeancapital.com</a>.
            </p>
          </div>
        ) : (
          <div className={`${styles.card} ${styles.unverifiedCard}`}>
            <div className={styles.statusBlock}>
              <div className={styles.unverifiedIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 36, height: 36 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <h1 className={styles.statusTitle}>Document Not Verified</h1>
                <p className={styles.statusSub}>
                  {data.error || "We could not verify this document in our registry."}
                </p>
              </div>
            </div>

            <p className={styles.notice}>
              If you received this document and believe it should be valid, please contact our verification team
              at <a href="mailto:support@aldwycheuropeancapital.com">support@aldwycheuropeancapital.com</a> with
              the reference number <strong>{ref}</strong>.
            </p>
          </div>
        )}

        <div className={styles.footer}>
          <Link href="/">Aldwych European Capital</Link>
          <span>·</span>
          <Link href="/terms">Terms</Link>
          <span>·</span>
          <Link href="/privacy">Privacy</Link>
          <span>·</span>
          <Link href="/support">Support</Link>
        </div>
      </main>
    </div>
  );
}
