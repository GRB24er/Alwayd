// src/app/transfers/internal/page.tsx
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

// Icons
const Icons = {
  checking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  savings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/>
      <path d="M3 21h18"/>
      <path d="M12 7v4"/>
      <path d="M10 9h4"/>
    </svg>
  ),
  investment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'24px',height:'24px',color:'#c9a962'}}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  internal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}>
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <line x1="12" y1="17" x2="12" y2="17.01"/>
    </svg>
  ),
  standard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px',color:'#c9a962'}}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  express: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px',color:'#c9a962'}}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  wire: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'28px',height:'28px',color:'#c9a962'}}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px',color:'#f59e0b'}}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  arrowLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px'}}>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
};

export default function TransferPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(1);
  
  const [userBalances, setUserBalances] = useState<UserBalances>({
    checking: 0,
    savings: 0,
    investment: 0
  });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [formData, setFormData] = useState({
    fromAccount: "checking",
    toAccount: "",
    recipientName: "",
    recipientAccount: "",
    recipientBank: "",
    recipientRoutingNumber: "",
    amount: "",
    description: "",
    transferType: "external",
    transferSpeed: "standard"
  });

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserData();
    }
  }, [session]);

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
        setUserEmail(session?.user?.email || "");
      } else {
        setError("Failed to load account balances");
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError("Failed to load account information");
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

  const validateAmount = () => {
    const amount = parseFloat(formData.amount);
    const available = getAvailableBalance();
    
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return false;
    }
    
    if (amount > available) {
      setError(`Insufficient funds. Available balance: ${formatBalance(available)}`);
      return false;
    }
    
    return true;
  };

  // Idempotency key prevents a double-click from creating two transfers; the
  // server stores the (key, endpoint) pair and replays the original response.
  function generateIdempotencyKey(): string {
    const buf = new Uint8Array(16);
    (typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto).getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  const handleInternalTransfer = async () => {
    if (!validateAmount()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/transfers/internal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": generateIdempotencyKey(),
        },
        body: JSON.stringify({
          fromAccount: formData.fromAccount,
          toAccount: formData.toAccount,
          amount: String(formData.amount),
          description: formData.description || "Internal Transfer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setSuccess("Transfer completed successfully!");
      await fetchUserData();
      
      setTimeout(() => {
        router.push("/transactions");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExternalTransfer = async () => {
    if (!validateAmount()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/transfers/external", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": generateIdempotencyKey(),
        },
        body: JSON.stringify({
          fromAccount: formData.fromAccount,
          recipientName: formData.recipientName,
          recipientAccount: formData.recipientAccount,
          recipientBank: formData.recipientBank,
          recipientRoutingNumber: formData.recipientRoutingNumber,
          amount: String(formData.amount),
          description: formData.description || `Transfer to ${formData.recipientName}`,
          transferSpeed: formData.transferSpeed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setSuccess("Transfer initiated! Pending approval. You will receive a confirmation email.");
      await fetchUserData();
      
      setTimeout(() => {
        router.push("/transactions");
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.transferType === "internal") {
      await handleInternalTransfer();
    } else {
      await handleExternalTransfer();
    }
  };

  const nextStep = () => {
    setError("");
    
    if (step === 1) {
      if (!formData.fromAccount) {
        setError("Please select a source account");
        return;
      }
    } else if (step === 2) {
      if (formData.transferType === "internal") {
        if (!formData.toAccount || formData.toAccount === formData.fromAccount) {
          setError("Please select a different destination account");
          return;
        }
      } else {
        if (!formData.recipientName || !formData.recipientAccount || !formData.recipientBank) {
          setError("Please fill in all recipient details");
          return;
        }
      }
    } else if (step === 3) {
      if (!validateAmount()) return;
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const getAccountIcon = (type: string) => {
    switch(type) {
      case 'checking': return Icons.checking;
      case 'savings': return Icons.savings;
      case 'investment': return Icons.investment;
      default: return Icons.checking;
    }
  };

  if (fetchingBalance) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading account information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      
      <div className={styles.main}>
        <header className={styles.header}>
          <Header />
        </header>
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1>Transfer Money</h1>
              <p>Send money between your accounts or to other banks</p>
            </div>
            <div className={styles.balanceSummary}>
              <span>Total Available: {formatBalance(userBalances.checking + userBalances.savings)}</span>
            </div>
          </div>

          {/* Transfer Type Selection */}
          <div className={styles.transferTypeSelector}>
            <button
              className={formData.transferType === "internal" ? styles.active : ""}
              onClick={() => {
                setFormData({...formData, transferType: "internal"});
                setStep(1);
                setError("");
              }}
            >
              {Icons.internal}
              Between My Accounts
            </button>
            <button
              className={formData.transferType === "external" ? styles.active : ""}
              onClick={() => {
                setFormData({...formData, transferType: "external"});
                setStep(1);
                setError("");
              }}
            >
              {Icons.external}
              To Another Bank
            </button>
          </div>

          {/* Progress Steps */}
          <div className={styles.progressSteps}>
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepLabel}>From</div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepLabel}>
                {formData.transferType === "internal" ? "To" : "Recipient"}
              </div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepLabel}>Amount</div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 4 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepLabel}>Review</div>
            </div>
          </div>

          {/* Form Card */}
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit}>
              
              {/* Step 1: Select Source Account */}
              {step === 1 && (
                <div className={styles.stepContent}>
                  <h3>Select Source Account</h3>
                  <p className={styles.stepDescription}>Choose which account to transfer from</p>
                  
                  <div className={styles.accountOptions}>
                    {/* Checking Account */}
                    <div 
                      className={`${styles.accountOption} ${formData.fromAccount === "checking" ? styles.selected : ''}`}
                      onClick={() => setFormData({...formData, fromAccount: "checking"})}
                    >
                      <div className={styles.accountIcon}>{Icons.checking}</div>
                      <div className={styles.accountInfo}>
                        <div className={styles.accountName}>Checking Account</div>
                        <div className={styles.accountNumber}>****1234</div>
                      </div>
                      <div className={styles.accountBalance}>
                        <div className={styles.balanceLabel}>Available</div>
                        <div className={styles.balanceAmount}>
                          {formatBalance(userBalances.checking)}
                        </div>
                      </div>
                    </div>

                    {/* Savings Account */}
                    <div 
                      className={`${styles.accountOption} ${formData.fromAccount === "savings" ? styles.selected : ''}`}
                      onClick={() => setFormData({...formData, fromAccount: "savings"})}
                    >
                      <div className={styles.accountIcon}>{Icons.savings}</div>
                      <div className={styles.accountInfo}>
                        <div className={styles.accountName}>Savings Account</div>
                        <div className={styles.accountNumber}>****5678</div>
                      </div>
                      <div className={styles.accountBalance}>
                        <div className={styles.balanceLabel}>Available</div>
                        <div className={styles.balanceAmount}>
                          {formatBalance(userBalances.savings)}
                        </div>
                      </div>
                    </div>

                    {/* Investment Account */}
                    {userBalances.investment > 0 && (
                      <div 
                        className={`${styles.accountOption} ${formData.fromAccount === "investment" ? styles.selected : ''}`}
                        onClick={() => setFormData({...formData, fromAccount: "investment"})}
                      >
                        <div className={styles.accountIcon}>{Icons.investment}</div>
                        <div className={styles.accountInfo}>
                          <div className={styles.accountName}>Investment Account</div>
                          <div className={styles.accountNumber}>****9012</div>
                        </div>
                        <div className={styles.accountBalance}>
                          <div className={styles.balanceLabel}>Available</div>
                          <div className={styles.balanceAmount}>
                            {formatBalance(userBalances.investment)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Destination */}
              {step === 2 && (
                <div className={styles.stepContent}>
                  {formData.transferType === "internal" ? (
                    <>
                      <h3>Select Destination Account</h3>
                      <p className={styles.stepDescription}>Choose which account to transfer to</p>
                      
                      <div className={styles.accountOptions}>
                        {formData.fromAccount !== "checking" && (
                          <div 
                            className={`${styles.accountOption} ${formData.toAccount === "checking" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, toAccount: "checking"})}
                          >
                            <div className={styles.accountIcon}>{Icons.checking}</div>
                            <div className={styles.accountInfo}>
                              <div className={styles.accountName}>Checking Account</div>
                              <div className={styles.accountNumber}>****1234</div>
                            </div>
                            <div className={styles.accountBalance}>
                              <div className={styles.balanceLabel}>Current Balance</div>
                              <div className={styles.balanceAmount}>
                                {formatBalance(userBalances.checking)}
                              </div>
                            </div>
                          </div>
                        )}

                        {formData.fromAccount !== "savings" && (
                          <div 
                            className={`${styles.accountOption} ${formData.toAccount === "savings" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, toAccount: "savings"})}
                          >
                            <div className={styles.accountIcon}>{Icons.savings}</div>
                            <div className={styles.accountInfo}>
                              <div className={styles.accountName}>Savings Account</div>
                              <div className={styles.accountNumber}>****5678</div>
                            </div>
                            <div className={styles.accountBalance}>
                              <div className={styles.balanceLabel}>Current Balance</div>
                              <div className={styles.balanceAmount}>
                                {formatBalance(userBalances.savings)}
                              </div>
                            </div>
                          </div>
                        )}

                        {formData.fromAccount !== "investment" && userBalances.investment >= 0 && (
                          <div 
                            className={`${styles.accountOption} ${formData.toAccount === "investment" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, toAccount: "investment"})}
                          >
                            <div className={styles.accountIcon}>{Icons.investment}</div>
                            <div className={styles.accountInfo}>
                              <div className={styles.accountName}>Investment Account</div>
                              <div className={styles.accountNumber}>****9012</div>
                            </div>
                            <div className={styles.accountBalance}>
                              <div className={styles.balanceLabel}>Current Balance</div>
                              <div className={styles.balanceAmount}>
                                {formatBalance(userBalances.investment)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Recipient Information</h3>
                      <p className={styles.stepDescription}>Enter the recipient's banking details</p>
                      
                      <div className={styles.inputGrid}>
                        <div className={styles.inputGroup}>
                          <label>Recipient Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={formData.recipientName}
                            onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                            required
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.inputGroup}>
                          <label>Account Number</label>
                          <input
                            type="text"
                            placeholder="1234567890"
                            value={formData.recipientAccount}
                            onChange={(e) => setFormData({...formData, recipientAccount: e.target.value})}
                            required
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.inputGroup}>
                          <label>Bank Name</label>
                          <input
                            type="text"
                            placeholder="Chase Bank"
                            value={formData.recipientBank}
                            onChange={(e) => setFormData({...formData, recipientBank: e.target.value})}
                            required
                            className={styles.input}
                          />
                        </div>
                        
                        <div className={styles.inputGroup}>
                          <label>Routing Number</label>
                          <input
                            type="text"
                            placeholder="021000021"
                            value={formData.recipientRoutingNumber}
                            onChange={(e) => setFormData({...formData, recipientRoutingNumber: e.target.value})}
                            required
                            className={styles.input}
                          />
                        </div>
                      </div>

                      <div className={styles.transferSpeed}>
                        <label>Transfer Speed</label>
                        <div className={styles.speedOptions}>
                          <div 
                            className={`${styles.speedOption} ${formData.transferSpeed === "standard" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, transferSpeed: "standard"})}
                          >
                            <span className={styles.speedIcon}>{Icons.standard}</span>
                            <span className={styles.speedName}>Standard</span>
                            <span className={styles.speedTime}>3-5 days • Free</span>
                          </div>
                          <div 
                            className={`${styles.speedOption} ${formData.transferSpeed === "express" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, transferSpeed: "express"})}
                          >
                            <span className={styles.speedIcon}>{Icons.express}</span>
                            <span className={styles.speedName}>Express</span>
                            <span className={styles.speedTime}>1-2 days • $15</span>
                          </div>
                          <div 
                            className={`${styles.speedOption} ${formData.transferSpeed === "wire" ? styles.selected : ''}`}
                            onClick={() => setFormData({...formData, transferSpeed: "wire"})}
                          >
                            <span className={styles.speedIcon}>{Icons.wire}</span>
                            <span className={styles.speedName}>Wire</span>
                            <span className={styles.speedTime}>Same day • $30</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Amount */}
              {step === 3 && (
                <div className={styles.stepContent}>
                  <h3>Transfer Amount</h3>
                  <p className={styles.stepDescription}>How much would you like to transfer?</p>
                  
                  <div className={styles.amountSection}>
                    <div className={styles.availableBalance}>
                      <span>Available Balance:</span>
                      <strong>{formatBalance(getAvailableBalance())}</strong>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Amount</label>
                      <div className={styles.amountInput}>
                        <span className={styles.currencySymbol}>$</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          required
                          min="0.01"
                          step="0.01"
                          max={getAvailableBalance()}
                          className={styles.amountField}
                        />
                      </div>
                      
                      <div className={styles.quickAmounts}>
                        {[50, 100, 500, 1000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            className={styles.quickAmountBtn}
                            onClick={() => {
                              if (amt <= getAvailableBalance()) {
                                setFormData({...formData, amount: amt.toString()});
                              }
                            }}
                            disabled={amt > getAvailableBalance()}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className={styles.inputGroup}>
                      <label>Description (Optional)</label>
                      <textarea
                        placeholder="What is this transfer for?"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className={styles.textarea}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className={styles.stepContent}>
                  <h3>Review Transfer</h3>
                  <p className={styles.stepDescription}>Please confirm your transfer details</p>
                  
                  <div className={styles.reviewCard}>
                    <div className={styles.reviewSection}>
                      <h4>From</h4>
                      <div className={styles.reviewItem}>
                        <span>Account</span>
                        <strong>{formData.fromAccount.charAt(0).toUpperCase() + formData.fromAccount.slice(1)}</strong>
                      </div>
                      <div className={styles.reviewItem}>
                        <span>Current Balance</span>
                        <strong>{formatBalance(getAvailableBalance())}</strong>
                      </div>
                    </div>
                    
                    <div className={styles.reviewSection}>
                      <h4>To</h4>
                      {formData.transferType === "internal" ? (
                        <>
                          <div className={styles.reviewItem}>
                            <span>Account</span>
                            <strong>{formData.toAccount.charAt(0).toUpperCase() + formData.toAccount.slice(1)}</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.reviewItem}>
                            <span>Recipient</span>
                            <strong>{formData.recipientName}</strong>
                          </div>
                          <div className={styles.reviewItem}>
                            <span>Account</span>
                            <strong>****{formData.recipientAccount.slice(-4)}</strong>
                          </div>
                          <div className={styles.reviewItem}>
                            <span>Bank</span>
                            <strong>{formData.recipientBank}</strong>
                          </div>
                          <div className={styles.reviewItem}>
                            <span>Speed</span>
                            <strong>{formData.transferSpeed.charAt(0).toUpperCase() + formData.transferSpeed.slice(1)}</strong>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className={styles.reviewSection}>
                      <h4>Transfer Details</h4>
                      <div className={styles.reviewAmount}>
                        {formatBalance(parseFloat(formData.amount || "0"))}
                      </div>
                      {formData.description && (
                        <div className={styles.reviewDescription}>
                          "{formData.description}"
                        </div>
                      )}
                      <div className={styles.reviewItem}>
                        <span>New Balance ({formData.fromAccount})</span>
                        <strong>{formatBalance(getAvailableBalance() - parseFloat(formData.amount || "0"))}</strong>
                      </div>
                    </div>
                    
                    {formData.transferType === "external" && (
                      <div className={styles.warningBox}>
                        <span className={styles.warningIcon}>{Icons.warning}</span>
                        <p>External transfers require approval and may take {
                          formData.transferSpeed === "wire" ? "same day" :
                          formData.transferSpeed === "express" ? "1-2 business days" :
                          "3-5 business days"
                        } to complete.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error and Success Messages */}
              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              {/* Navigation Buttons */}
              <div className={styles.navigationButtons}>
                {step > 1 && (
                  <button 
                    type="button"
                    onClick={prevStep}
                    className={styles.backButton}
                    disabled={loading}
                  >
                    {Icons.arrowLeft}
                    Back
                  </button>
                )}
                
                {step < 4 ? (
                  <button 
                    type="button"
                    onClick={nextStep}
                    className={styles.continueButton}
                  >
                    Continue
                    {Icons.arrowRight}
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner}></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        {Icons.lock}
                        Confirm Transfer
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <footer className={styles.footer}>
          <Footer />
        </footer>
      </div>
    </div>
  );
}