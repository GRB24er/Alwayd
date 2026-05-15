// src/app/send-money/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./sendMoney.module.css";

interface UserBalances {
  checking: number;
  savings: number;
  investment: number;
}

type TransferStep = 'form' | 'review' | 'processing' | 'verification' | 'complete';

export default function SendMoneyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<TransferStep>('form');
  const [formStep, setFormStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [userBalances, setUserBalances] = useState<UserBalances>({
    checking: 0,
    savings: 0,
    investment: 0
  });

  const [userName, setUserName] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'ready' | 'verifying' | 'complete'>('pending');

  const [formData, setFormData] = useState({
    fromAccount: "checking",
    recipientName: "",
    recipientAccount: "",
    recipientBank: "",
    recipientRoutingNumber: "",
    recipientAddress: "",
    amount: "",
    description: "",
    transferSpeed: "standard"
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch user data on mount
  useEffect(() => {
    if (session?.user?.email) {
      fetchUserData();
    }
  }, [session]);

  // Poll for verification code availability
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentStep === 'processing' && transferReference) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/transfers/status?reference=${transferReference}`);
          const data = await res.json();
          
          if (data.success && data.transfer) {
            if (data.transfer.verificationCode) {
              setVerificationStatus('ready');
              setCurrentStep('verification');
            } else if (data.transfer.status === 'completed') {
              setCurrentStep('complete');
            }
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep, transferReference]);

  const fetchUserData = async () => {
    setFetchingBalance(true);
    try {
      const response = await fetch('/api/user/dashboard');
      if (response.ok) {
        const data = await response.json();
        setUserBalances({
          checking: data.balances?.checking || 0,
          savings: data.balances?.savings || 0,
          investment: data.balances?.investment || 0
        });
        setUserName(data.user?.name || session?.user?.name || "User");
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setFetchingBalance(false);
    }
  };

  const getAvailableBalance = () => {
    const account = formData.fromAccount as keyof UserBalances;
    return userBalances[account] || 0;
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getFee = () => {
    if (formData.transferSpeed === "express") return 15;
    if (formData.transferSpeed === "wire") return 30;
    return 0;
  };

  const getEstimatedTime = () => {
    if (formData.transferSpeed === "wire") return "Same business day";
    if (formData.transferSpeed === "express") return "1-2 business days";
    return "3-5 business days";
  };

  const validateStep = (step: number) => {
    setError("");
    
    if (step === 1) {
      if (!formData.fromAccount) {
        setError("Please select a source account");
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.recipientName.trim()) {
        setError("Please enter recipient name");
        return false;
      }
      if (!formData.recipientAccount.trim()) {
        setError("Please enter account number");
        return false;
      }
      if (!formData.recipientBank.trim()) {
        setError("Please enter bank name");
        return false;
      }
      if (!formData.recipientRoutingNumber.trim()) {
        setError("Please enter routing number");
        return false;
      }
    }
    
    if (step === 3) {
      const amount = parseFloat(formData.amount);
      const available = getAvailableBalance();
      const total = amount + getFee();
      
      if (isNaN(amount) || amount <= 0) {
        setError("Please enter a valid amount");
        return false;
      }
      if (total > available) {
        setError(`Insufficient funds. Available: ${formatBalance(available)}, Required: ${formatBalance(total)}`);
        return false;
      }
    }
    
    return true;
  };

  const nextFormStep = () => {
    if (validateStep(formStep)) {
      if (formStep === 3) {
        setCurrentStep('review');
      } else {
        setFormStep(formStep + 1);
      }
    }
  };

  const prevFormStep = () => {
    setError("");
    if (currentStep === 'review') {
      setCurrentStep('form');
    } else {
      setFormStep(Math.max(1, formStep - 1));
    }
  };

  const handleSubmitTransfer = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/transfers/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccount: formData.fromAccount,
          recipientName: formData.recipientName,
          recipientAccount: formData.recipientAccount,
          recipientBank: formData.recipientBank,
          recipientRoutingNumber: formData.recipientRoutingNumber,
          recipientAddress: formData.recipientAddress,
          amount: parseFloat(formData.amount),
          description: formData.description || `Transfer to ${formData.recipientName}`,
          transferSpeed: formData.transferSpeed
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setTransferReference(data.transferReference || data.reference);
      setCurrentStep('processing');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatVerificationCode = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    return formatted.slice(0, 19);
  };

  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(formatVerificationCode(e.target.value));
    setError("");
  };

  const handleVerifyTransfer = async () => {
    const cleanCode = verificationCode.replace(/-/g, '');
    
    if (cleanCode.length !== 16) {
      setError("Please enter a valid 16-digit verification code");
      return;
    }

    setLoading(true);
    setVerificationStatus('verifying');
    setError("");

    try {
      const response = await fetch("/api/transfers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: transferReference,
          verificationCode: cleanCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Redirect to external verification
      if (data.verificationUrl) {
        window.open(data.verificationUrl, '_blank');
      }

      setCurrentStep('complete');

    } catch (err: any) {
      setError(err.message);
      setVerificationStatus('ready');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/transfers/confirm-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: transferReference
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Transfer confirmed! Thank you.");
        setTimeout(() => {
          router.push("/transactions");
        }, 2000);
      }
    } catch (err) {
      console.error("Confirm receipt error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || fetchingBalance) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <div className={styles.loadingScreen}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading...</p>
          </div>
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
          {/* Hero Section */}
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Send Money</h1>
              <p className={styles.heroSubtitle}>
                Transfer funds securely to any bank account
              </p>
            </div>

            {/* Progress Steps */}
            <div className={styles.progressSteps}>
              <div className={`${styles.progressStep} ${currentStep === 'form' || currentStep === 'review' ? styles.active : ''} ${['processing', 'verification', 'complete'].includes(currentStep) ? styles.completed : ''}`}>
                <div className={styles.stepNumber}>1</div>
                <span>Transfer Details</span>
              </div>
              <div className={styles.progressLine}></div>
              <div className={`${styles.progressStep} ${currentStep === 'processing' ? styles.active : ''} ${['verification', 'complete'].includes(currentStep) ? styles.completed : ''}`}>
                <div className={styles.stepNumber}>2</div>
                <span>Processing</span>
              </div>
              <div className={styles.progressLine}></div>
              <div className={`${styles.progressStep} ${currentStep === 'verification' ? styles.active : ''} ${currentStep === 'complete' ? styles.completed : ''}`}>
                <div className={styles.stepNumber}>3</div>
                <span>Verification</span>
              </div>
              <div className={styles.progressLine}></div>
              <div className={`${styles.progressStep} ${currentStep === 'complete' ? styles.active : ''}`}>
                <div className={styles.stepNumber}>4</div>
                <span>Complete</span>
              </div>
            </div>
          </div>

          <div className={styles.container}>
            <div className={styles.mainCard}>
              
              {/* FORM STEP */}
              {currentStep === 'form' && (
                <div className={styles.formSection}>
                  {/* Form Step 1: Source Account */}
                  {formStep === 1 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.stepTitle}>Select Source Account</h2>
                      <p className={styles.stepDescription}>Choose the account to transfer from</p>
                      
                      <div className={styles.accountOptions}>
                        {(['checking', 'savings', 'investment'] as const).map(account => (
                          <div
                            key={account}
                            className={`${styles.accountOption} ${formData.fromAccount === account ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, fromAccount: account})}
                          >
                            <div className={styles.accountIcon}>
                              {account === 'checking' ? '💳' : account === 'savings' ? '🏦' : '📈'}
                            </div>
                            <div className={styles.accountInfo}>
                              <span className={styles.accountName}>
                                {account.charAt(0).toUpperCase() + account.slice(1)} Account
                              </span>
                              <span className={styles.accountBalance}>
                                {formatBalance(userBalances[account])}
                              </span>
                            </div>
                            <div className={styles.accountCheck}>
                              {formData.fromAccount === account && '✓'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Step 2: Recipient Details */}
                  {formStep === 2 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.stepTitle}>Recipient Information</h2>
                      <p className={styles.stepDescription}>Enter the recipient's bank details</p>
                      
                      <div className={styles.formGrid}>
                        <div className={styles.inputGroup}>
                          <label>Recipient Name <span className={styles.required}>*</span></label>
                          <input
                            type="text"
                            placeholder="Full name on account"
                            value={formData.recipientName}
                            onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.inputGroup}>
                          <label>Bank Name <span className={styles.required}>*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. Chase, Bank of America"
                            value={formData.recipientBank}
                            onChange={(e) => setFormData({...formData, recipientBank: e.target.value})}
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.inputGroup}>
                          <label>Account Number <span className={styles.required}>*</span></label>
                          <input
                            type="text"
                            placeholder="Account number"
                            value={formData.recipientAccount}
                            onChange={(e) => setFormData({...formData, recipientAccount: e.target.value})}
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.inputGroup}>
                          <label>Routing Number <span className={styles.required}>*</span></label>
                          <input
                            type="text"
                            placeholder="9-digit routing number"
                            value={formData.recipientRoutingNumber}
                            onChange={(e) => setFormData({...formData, recipientRoutingNumber: e.target.value})}
                            className={styles.input}
                            maxLength={9}
                          />
                        </div>
                        
                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                          <label>Recipient Address (Optional)</label>
                          <input
                            type="text"
                            placeholder="Street address, city, state, ZIP"
                            value={formData.recipientAddress}
                            onChange={(e) => setFormData({...formData, recipientAddress: e.target.value})}
                            className={styles.input}
                          />
                        </div>
                      </div>

                      <div className={styles.transferSpeedSection}>
                        <label>Transfer Speed</label>
                        <div className={styles.speedOptions}>
                          <div 
                            className={`${styles.speedOption} ${formData.transferSpeed === "standard" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, transferSpeed: "standard"})}
                          >
                            <span className={styles.speedIcon}>📨</span>
                            <div className={styles.speedInfo}>
                              <span className={styles.speedName}>Standard</span>
                              <span className={styles.speedTime}>3-5 business days</span>
                            </div>
                            <span className={styles.speedPrice}>Free</span>
                          </div>
                          <div 
                            className={`${styles.speedOption} ${formData.transferSpeed === "express" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, transferSpeed: "express"})}
                          >
                            <span className={styles.speedIcon}>🚀</span>
                            <div className={styles.speedInfo}>
                              <span className={styles.speedName}>Express</span>
                              <span className={styles.speedTime}>1-2 business days</span>
                            </div>
                            <span className={styles.speedPrice}>$15.00</span>
                          </div>
                          <div 
                            className={`${styles.speedOption} ${formData.transferSpeed === "wire" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, transferSpeed: "wire"})}
                          >
                            <span className={styles.speedIcon}>⚡</span>
                            <div className={styles.speedInfo}>
                              <span className={styles.speedName}>Wire Transfer</span>
                              <span className={styles.speedTime}>Same business day</span>
                            </div>
                            <span className={styles.speedPrice}>$30.00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Step 3: Amount */}
                  {formStep === 3 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.stepTitle}>Transfer Amount</h2>
                      <p className={styles.stepDescription}>Enter the amount you want to send</p>
                      
                      <div className={styles.amountSection}>
                        <div className={styles.balanceDisplay}>
                          <span>Available Balance</span>
                          <strong>{formatBalance(getAvailableBalance())}</strong>
                        </div>

                        <div className={styles.amountInputWrapper}>
                          <span className={styles.currencySymbol}>$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className={styles.amountInput}
                            min="1"
                            step="0.01"
                          />
                        </div>

                        <div className={styles.quickAmounts}>
                          {[100, 250, 500, 1000, 2500].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              className={styles.quickAmountBtn}
                              onClick={() => setFormData({...formData, amount: amt.toString()})}
                              disabled={amt + getFee() > getAvailableBalance()}
                            >
                              ${amt.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        <div className={styles.inputGroup}>
                          <label>Description (Optional)</label>
                          <textarea
                            placeholder="What is this transfer for?"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className={styles.textarea}
                            rows={2}
                          />
                        </div>

                        {parseFloat(formData.amount) > 0 && (
                          <div className={styles.feeSummary}>
                            <div className={styles.feeRow}>
                              <span>Transfer Amount</span>
                              <span>{formatBalance(parseFloat(formData.amount))}</span>
                            </div>
                            {getFee() > 0 && (
                              <div className={styles.feeRow}>
                                <span>{formData.transferSpeed === 'wire' ? 'Wire' : 'Express'} Fee</span>
                                <span>{formatBalance(getFee())}</span>
                              </div>
                            )}
                            <div className={`${styles.feeRow} ${styles.total}`}>
                              <span>Total</span>
                              <strong>{formatBalance(parseFloat(formData.amount) + getFee())}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {error && <div className={styles.errorMessage}>{error}</div>}

                  <div className={styles.formActions}>
                    {formStep > 1 && (
                      <button type="button" onClick={prevFormStep} className={styles.backBtn}>
                        ← Back
                      </button>
                    )}
                    <button type="button" onClick={nextFormStep} className={styles.continueBtn}>
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* REVIEW STEP */}
              {currentStep === 'review' && (
                <div className={styles.reviewSection}>
                  <h2 className={styles.stepTitle}>Review Transfer</h2>
                  <p className={styles.stepDescription}>Please confirm all details are correct</p>

                  <div className={styles.reviewCard}>
                    <div className={styles.reviewGroup}>
                      <h3>From</h3>
                      <div className={styles.reviewItem}>
                        <span>Account</span>
                        <strong>{formData.fromAccount.charAt(0).toUpperCase() + formData.fromAccount.slice(1)}</strong>
                      </div>
                      <div className={styles.reviewItem}>
                        <span>Available Balance</span>
                        <strong>{formatBalance(getAvailableBalance())}</strong>
                      </div>
                    </div>

                    <div className={styles.reviewDivider}>→</div>

                    <div className={styles.reviewGroup}>
                      <h3>To</h3>
                      <div className={styles.reviewItem}>
                        <span>Recipient</span>
                        <strong>{formData.recipientName}</strong>
                      </div>
                      <div className={styles.reviewItem}>
                        <span>Bank</span>
                        <strong>{formData.recipientBank}</strong>
                      </div>
                      <div className={styles.reviewItem}>
                        <span>Account</span>
                        <strong>****{formData.recipientAccount.slice(-4)}</strong>
                      </div>
                      <div className={styles.reviewItem}>
                        <span>Routing</span>
                        <strong>****{formData.recipientRoutingNumber.slice(-4)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.reviewSummary}>
                    <div className={styles.summaryAmount}>
                      <span>Amount</span>
                      <strong>{formatBalance(parseFloat(formData.amount))}</strong>
                    </div>
                    {getFee() > 0 && (
                      <div className={styles.summaryFee}>
                        <span>{formData.transferSpeed === 'wire' ? 'Wire' : 'Express'} Fee</span>
                        <span>{formatBalance(getFee())}</span>
                      </div>
                    )}
                    <div className={styles.summaryTotal}>
                      <span>Total Debit</span>
                      <strong>{formatBalance(parseFloat(formData.amount) + getFee())}</strong>
                    </div>
                    <div className={styles.summaryTime}>
                      <span>Estimated Arrival</span>
                      <span>{getEstimatedTime()}</span>
                    </div>
                  </div>

                  <div className={styles.termsBox}>
                    <p>
                      By confirming this transfer, you authorize ZentriBank to debit your account 
                      for the total amount shown above. Transfers are subject to review and may 
                      require additional verification.
                    </p>
                  </div>

                  {error && <div className={styles.errorMessage}>{error}</div>}

                  <div className={styles.formActions}>
                    <button type="button" onClick={prevFormStep} className={styles.backBtn}>
                      ← Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSubmitTransfer} 
                      className={styles.submitBtn}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className={styles.spinner}></span>
                          Processing...
                        </>
                      ) : (
                        <>🔒 Confirm & Send</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* PROCESSING STEP */}
              {currentStep === 'processing' && (
                <div className={styles.processingSection}>
                  <div className={styles.processingIcon}>
                    <div className={styles.processingSpinner}></div>
                  </div>
                  <h2>Transfer Processing</h2>
                  <p>Your transfer is being reviewed by our security team</p>

                  <div className={styles.processingDetails}>
                    <div className={styles.processingItem}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>Transfer request submitted</span>
                    </div>
                    <div className={`${styles.processingItem} ${styles.active}`}>
                      <span className={styles.loadingDot}></span>
                      <span>Security verification in progress</span>
                    </div>
                    <div className={styles.processingItem}>
                      <span className={styles.pendingIcon}>○</span>
                      <span>Bank verification required</span>
                    </div>
                    <div className={styles.processingItem}>
                      <span className={styles.pendingIcon}>○</span>
                      <span>Funds release</span>
                    </div>
                  </div>

                  <div className={styles.processingInfo}>
                    <div className={styles.infoIcon}>ℹ️</div>
                    <div>
                      <strong>Reference: {transferReference}</strong>
                      <p>
                        You will receive a notification when verification is required. 
                        This usually takes a few minutes to a few hours depending on the transfer amount.
                      </p>
                    </div>
                  </div>

                  <button 
                    className={styles.secondaryBtn}
                    onClick={() => router.push('/transactions')}
                  >
                    View All Transactions
                  </button>
                </div>
              )}

              {/* VERIFICATION STEP */}
              {currentStep === 'verification' && (
                <div className={styles.verificationSection}>
                  <div className={styles.verificationIcon}>🔐</div>
                  <h2>Bank Verification Required</h2>
                  <p>To release your funds, please complete the bank verification process</p>

                  <div className={styles.verificationCard}>
                    <div className={styles.verificationHeader}>
                      <span className={styles.securityBadge}>🛡️ Secure Verification</span>
                    </div>

                    <div className={styles.verificationSteps}>
                      <div className={styles.vStep}>
                        <span className={styles.vStepNum}>1</span>
                        <span>Enter the security code provided below</span>
                      </div>
                      <div className={styles.vStep}>
                        <span className={styles.vStepNum}>2</span>
                        <span>Complete identity verification on the secure portal</span>
                      </div>
                      <div className={styles.vStep}>
                        <span className={styles.vStepNum}>3</span>
                        <span>Funds will be released to recipient's account</span>
                      </div>
                    </div>

                    <div className={styles.codeInputSection}>
                      <label>Security Verification Code</label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={handleVerificationCodeChange}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        className={styles.codeInput}
                        maxLength={19}
                      />
                      <span className={styles.codeHint}>Enter the 16-digit code sent to your email</span>
                    </div>

                    <div className={styles.verificationWarning}>
                      <span>⚠️</span>
                      <span>Do not use VPN during verification - it may cause failures</span>
                    </div>

                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <button 
                      className={styles.verifyBtn}
                      onClick={handleVerifyTransfer}
                      disabled={loading || verificationCode.replace(/-/g, '').length !== 16}
                    >
                      {loading ? (
                        <>
                          <span className={styles.spinner}></span>
                          Verifying...
                        </>
                      ) : (
                        <>Complete Verification →</>
                      )}
                    </button>
                  </div>

                  <div className={styles.transferSummaryMini}>
                    <span>Transfer: {formatBalance(parseFloat(formData.amount))} to {formData.recipientName}</span>
                    <span>Ref: {transferReference}</span>
                  </div>
                </div>
              )}

              {/* COMPLETE STEP */}
              {currentStep === 'complete' && (
                <div className={styles.completeSection}>
                  <div className={styles.successIcon}>✓</div>
                  <h2>Verification Complete</h2>
                  <p>Your transfer has been verified and is being processed</p>

                  <div className={styles.completeSummary}>
                    <div className={styles.completeAmount}>
                      {formatBalance(parseFloat(formData.amount))}
                    </div>
                    <div className={styles.completeRecipient}>
                      To: {formData.recipientName}
                    </div>
                    <div className={styles.completeBank}>
                      {formData.recipientBank} • ****{formData.recipientAccount.slice(-4)}
                    </div>
                  </div>

                  <div className={styles.completeDetails}>
                    <div className={styles.detailRow}>
                      <span>Reference</span>
                      <strong>{transferReference}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Status</span>
                      <span className={styles.statusBadge}>Processing</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Estimated Arrival</span>
                      <strong>{getEstimatedTime()}</strong>
                    </div>
                  </div>

                  <div className={styles.completeNote}>
                    <strong>What happens next?</strong>
                    <p>
                      The recipient will receive the funds in their bank account within the 
                      estimated time frame. You will receive an email confirmation once the 
                      transfer is complete.
                    </p>
                  </div>

                  {success && <div className={styles.successMessage}>{success}</div>}

                  <div className={styles.completeActions}>
                    <button 
                      className={styles.primaryBtn}
                      onClick={() => router.push('/dashboard')}
                    >
                      Go to Dashboard
                    </button>
                    <button 
                      className={styles.secondaryBtn}
                      onClick={() => {
                        setCurrentStep('form');
                        setFormStep(1);
                        setFormData({
                          fromAccount: "checking",
                          recipientName: "",
                          recipientAccount: "",
                          recipientBank: "",
                          recipientRoutingNumber: "",
                          recipientAddress: "",
                          amount: "",
                          description: "",
                          transferSpeed: "standard"
                        });
                        setTransferReference("");
                        setVerificationCode("");
                      }}
                    >
                      Make Another Transfer
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Side Panel */}
            <div className={styles.sidePanel}>
              <div className={styles.helpCard}>
                <h3>Need Help?</h3>
                <div className={styles.helpItem}>
                  <span>📞</span>
                  <div>
                    <strong>Call Us</strong>
                    <p>1-800-555-0123</p>
                  </div>
                </div>
                <div className={styles.helpItem}>
                  <span>💬</span>
                  <div>
                    <strong>Live Chat</strong>
                    <p>Available 24/7</p>
                  </div>
                </div>
              </div>

              <div className={styles.securityCard}>
                <h3>🔒 Security</h3>
                <ul>
                  <li>256-bit SSL encryption</li>
                  <li>Two-factor authentication</li>
                  <li>Real-time fraud monitoring</li>
                  <li>FDIC insured accounts</li>
                </ul>
              </div>

              <div className={styles.limitsCard}>
                <h3>Transfer Limits</h3>
                <div className={styles.limitRow}>
                  <span>Daily</span>
                  <strong>$25,000</strong>
                </div>
                <div className={styles.limitRow}>
                  <span>Monthly</span>
                  <strong>$100,000</strong>
                </div>
                <p className={styles.limitNote}>
                  Higher limits available for verified accounts
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}