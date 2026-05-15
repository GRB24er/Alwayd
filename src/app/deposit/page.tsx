// src/app/fund-account/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./fund.module.css";

type FundingMethod = 'wire' | 'crypto' | null;
type CryptoType = 'BTC' | 'ETH' | 'USDT' | 'USDC';

interface PendingDeposit {
  _id: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

export default function FundAccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<FundingMethod>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('USDT');
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState("");
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // ============================================
  // UPDATE THESE WITH YOUR ACTUAL BANK DETAILS
  // ============================================
  const bankDetails = {
    bankName: "ZentriBank Capital",
    accountName: "ZentriBank Capital LLC",
    accountNumber: "8934567821",
    routingNumber: "021000021",
    swiftCode: "ZBNKUS33",
    bankAddress: "100 Wall Street, New York, NY 10005"
  };

  // ============================================
  // UPDATE THESE WITH YOUR ACTUAL CRYPTO WALLETS
  // ============================================
  const cryptoWallets: Record<CryptoType, string> = {
    BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    USDT: "TN7iKQd2iLGpnqfYZ3YwgTWfUA7xqoKu4c",
    USDC: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchPendingDeposits();
    }
  }, [session]);

  const fetchPendingDeposits = async () => {
    try {
      const res = await fetch('/api/transactions/deposit');
      if (res.ok) {
        const data = await res.json();
        setPendingDeposits(data.deposits || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending deposits:', err);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (selectedMethod === 'wire' && parseFloat(amount) < 100) {
      setError("Minimum wire transfer is $100");
      return;
    }

    if (selectedMethod === 'crypto' && parseFloat(amount) < 10) {
      setError("Minimum crypto deposit is $10");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/transactions/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          method: selectedMethod,
          cryptoType: selectedMethod === 'crypto' ? selectedCrypto : null,
          accountType: 'checking'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate deposit');
      }

      setReference(data.reference);
      setSuccess(true);
      setStep(4);
      fetchPendingDeposits();

    } catch (err: any) {
      setError(err.message);
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

  if (status === "loading") {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />

      <div className={styles.mainContent}>
        <Header />

        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <h1>Fund Your Account</h1>
            <p>Add funds to your ZentriBank account securely</p>
          </div>

          {/* Pending Deposits Alert */}
          {pendingDeposits.length > 0 && (
            <div className={styles.pendingAlert}>
              <div className={styles.alertIcon}>⏳</div>
              <div className={styles.alertContent}>
                <h3>Pending Deposits</h3>
                <p>You have {pendingDeposits.length} deposit(s) awaiting confirmation</p>
                <div className={styles.pendingList}>
                  {pendingDeposits.map(dep => (
                    <div key={dep._id} className={styles.pendingItem}>
                      <span>{formatCurrency(dep.amount)}</span>
                      <span className={styles.pendingMethod}>{dep.method === 'wire' ? 'Wire Transfer' : 'Crypto'}</span>
                      <span className={styles.pendingRef}>Ref: {dep.reference}</span>
                      <span className={styles.pendingStatus}>Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={styles.container}>
            {/* Progress Steps */}
            <div className={styles.progressBar}>
              <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
                <span className={styles.stepNum}>1</span>
                <span className={styles.stepLabel}>Method</span>
              </div>
              <div className={styles.progressLine}></div>
              <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>
                <span className={styles.stepNum}>2</span>
                <span className={styles.stepLabel}>Amount</span>
              </div>
              <div className={styles.progressLine}></div>
              <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>
                <span className={styles.stepNum}>3</span>
                <span className={styles.stepLabel}>Transfer</span>
              </div>
              <div className={styles.progressLine}></div>
              <div className={`${styles.progressStep} ${step >= 4 ? styles.active : ''}`}>
                <span className={styles.stepNum}>4</span>
                <span className={styles.stepLabel}>Confirm</span>
              </div>
            </div>

            {/* Step 1: Select Method */}
            {step === 1 && (
              <div className={styles.stepContent}>
                <h2>Select Funding Method</h2>
                <p className={styles.stepDesc}>Choose how you want to add funds to your account</p>

                <div className={styles.methodGrid}>
                  <div
                    className={`${styles.methodCard} ${selectedMethod === 'wire' ? styles.selected : ''}`}
                    onClick={() => setSelectedMethod('wire')}
                  >
                    <div className={styles.methodIcon}>🏦</div>
                    <h3>Bank Wire Transfer</h3>
                    <p>Transfer from your bank account</p>
                    <ul className={styles.methodDetails}>
                      <li>Processing: 1-3 business days</li>
                      <li>No fees from ZentriBank</li>
                      <li>Minimum: $100</li>
                    </ul>
                  </div>

                  <div
                    className={`${styles.methodCard} ${selectedMethod === 'crypto' ? styles.selected : ''}`}
                    onClick={() => setSelectedMethod('crypto')}
                  >
                    <div className={styles.methodIcon}>₿</div>
                    <h3>Cryptocurrency</h3>
                    <p>Deposit using crypto</p>
                    <ul className={styles.methodDetails}>
                      <li>Processing: 10-60 minutes</li>
                      <li>Network fees apply</li>
                      <li>Minimum: $10</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.continueBtn}
                    onClick={() => setStep(2)}
                    disabled={!selectedMethod}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter Amount */}
            {step === 2 && (
              <div className={styles.stepContent}>
                <h2>Enter Amount</h2>
                <p className={styles.stepDesc}>How much would you like to deposit?</p>

                {selectedMethod === 'crypto' && (
                  <div className={styles.cryptoSelector}>
                    <label>Select Cryptocurrency</label>
                    <div className={styles.cryptoOptions}>
                      {(['USDT', 'USDC', 'BTC', 'ETH'] as CryptoType[]).map(crypto => (
                        <button
                          key={crypto}
                          className={`${styles.cryptoBtn} ${selectedCrypto === crypto ? styles.selected : ''}`}
                          onClick={() => setSelectedCrypto(crypto)}
                        >
                          {crypto}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.amountInputWrapper}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={styles.amountInput}
                    min={selectedMethod === 'wire' ? 100 : 10}
                  />
                </div>

                <div className={styles.quickAmounts}>
                  {[100, 500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      className={styles.quickAmountBtn}
                      onClick={() => setAmount(amt.toString())}
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className={styles.amountNote}>
                  <span>💡</span>
                  <span>
                    {selectedMethod === 'wire'
                      ? 'Minimum deposit: $100. No maximum limit.'
                      : `Minimum deposit: $10. Send exact ${selectedCrypto} equivalent.`
                    }
                  </span>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.actions}>
                  <button className={styles.backBtn} onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button
                    className={styles.continueBtn}
                    onClick={() => {
                      if (!amount || parseFloat(amount) <= 0) {
                        setError("Please enter a valid amount");
                        return;
                      }
                      if (selectedMethod === 'wire' && parseFloat(amount) < 100) {
                        setError("Minimum wire transfer is $100");
                        return;
                      }
                      if (selectedMethod === 'crypto' && parseFloat(amount) < 10) {
                        setError("Minimum crypto deposit is $10");
                        return;
                      }
                      setError("");
                      setStep(3);
                    }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Transfer Instructions */}
            {step === 3 && (
              <div className={styles.stepContent}>
                <h2>Complete Your Transfer</h2>
                <p className={styles.stepDesc}>
                  Send {formatCurrency(parseFloat(amount))} using the details below
                </p>

                {selectedMethod === 'wire' && (
                  <div className={styles.transferDetails}>
                    <div className={styles.detailsCard}>
                      <h3>🏦 Wire Transfer Details</h3>
                      <p className={styles.detailsNote}>
                        Use these details to send a wire transfer from your bank
                      </p>

                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Bank Name</span>
                        <div className={styles.detailValue}>
                          <span>{bankDetails.bankName}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(bankDetails.bankName, 'bankName')}
                          >
                            {copied === 'bankName' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Account Name</span>
                        <div className={styles.detailValue}>
                          <span>{bankDetails.accountName}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(bankDetails.accountName, 'accountName')}
                          >
                            {copied === 'accountName' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Account Number</span>
                        <div className={styles.detailValue}>
                          <span className={styles.mono}>{bankDetails.accountNumber}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(bankDetails.accountNumber, 'accountNumber')}
                          >
                            {copied === 'accountNumber' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Routing Number</span>
                        <div className={styles.detailValue}>
                          <span className={styles.mono}>{bankDetails.routingNumber}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(bankDetails.routingNumber, 'routingNumber')}
                          >
                            {copied === 'routingNumber' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>SWIFT Code</span>
                        <div className={styles.detailValue}>
                          <span className={styles.mono}>{bankDetails.swiftCode}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(bankDetails.swiftCode, 'swiftCode')}
                          >
                            {copied === 'swiftCode' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Bank Address</span>
                        <div className={styles.detailValue}>
                          <span>{bankDetails.bankAddress}</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(bankDetails.bankAddress, 'bankAddress')}
                          >
                            {copied === 'bankAddress' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.importantNote}>
                      <h4>⚠️ Important</h4>
                      <ul>
                        <li>Include your account email in the transfer reference/memo</li>
                        <li>Send exactly {formatCurrency(parseFloat(amount))}</li>
                        <li>Wire transfers take 1-3 business days to process</li>
                        <li>Your bank may charge wire transfer fees</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedMethod === 'crypto' && (
                  <div className={styles.transferDetails}>
                    <div className={styles.detailsCard}>
                      <h3>₿ {selectedCrypto} Deposit Address</h3>
                      <p className={styles.detailsNote}>
                        Send {selectedCrypto} to this address
                      </p>

                      <div className={styles.cryptoAddressBox}>
                        <div className={styles.qrPlaceholder}>
                          <span>QR</span>
                        </div>
                        <div className={styles.addressWrapper}>
                          <span className={styles.addressLabel}>{selectedCrypto} Address</span>
                          <code className={styles.cryptoAddress}>
                            {cryptoWallets[selectedCrypto]}
                          </code>
                          <button
                            className={styles.copyAddressBtn}
                            onClick={() => copyToClipboard(cryptoWallets[selectedCrypto], 'crypto')}
                          >
                            {copied === 'crypto' ? '✓ Copied!' : '📋 Copy Address'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.cryptoAmount}>
                        <span>Amount to send:</span>
                        <strong>{formatCurrency(parseFloat(amount))} worth of {selectedCrypto}</strong>
                      </div>
                    </div>

                    <div className={styles.importantNote}>
                      <h4>⚠️ Important</h4>
                      <ul>
                        <li>Only send {selectedCrypto} to this address</li>
                        <li>Sending other tokens will result in permanent loss</li>
                        <li>Minimum 1 network confirmation required</li>
                        <li>Processing time: 10-60 minutes after confirmation</li>
                      </ul>
                    </div>
                  </div>
                )}

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.actions}>
                  <button className={styles.backBtn} onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button
                    className={styles.confirmBtn}
                    onClick={handleSubmitDeposit}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : "I've Sent the Funds →"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && success && (
              <div className={styles.stepContent}>
                <div className={styles.successSection}>
                  <div className={styles.successIcon}>✓</div>
                  <h2>Deposit Request Submitted</h2>
                  <p>Your deposit is being processed</p>

                  <div className={styles.confirmationCard}>
                    <div className={styles.confirmRow}>
                      <span>Reference Number</span>
                      <strong className={styles.mono}>{reference}</strong>
                    </div>
                    <div className={styles.confirmRow}>
                      <span>Amount</span>
                      <strong>{formatCurrency(parseFloat(amount))}</strong>
                    </div>
                    <div className={styles.confirmRow}>
                      <span>Method</span>
                      <strong>{selectedMethod === 'wire' ? 'Wire Transfer' : `Crypto (${selectedCrypto})`}</strong>
                    </div>
                    <div className={styles.confirmRow}>
                      <span>Status</span>
                      <span className={styles.statusPending}>Pending Confirmation</span>
                    </div>
                  </div>

                  <div className={styles.nextSteps}>
                    <h4>What happens next?</h4>
                    <ol>
                      <li>We will verify receipt of your funds</li>
                      <li>Once confirmed, your account will be credited</li>
                      <li>You will receive an email notification</li>
                      <li>
                        Expected time: {selectedMethod === 'wire' ? '1-3 business days' : '10-60 minutes'}
                      </li>
                    </ol>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.secondaryBtn}
                      onClick={() => router.push('/dashboard')}
                    >
                      Go to Dashboard
                    </button>
                    <button
                      className={styles.primaryBtn}
                      onClick={() => {
                        setStep(1);
                        setSelectedMethod(null);
                        setAmount("");
                        setSuccess(false);
                        setReference("");
                      }}
                    >
                      Make Another Deposit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}