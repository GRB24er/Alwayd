// app/transfers/wire/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./wire.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

// SVG Icons
const Icons = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#c9a962'}}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#f59e0b'}}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'48px',height:'48px',color:'#10b981'}}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px'}}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  arrowLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  print: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}>
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  )
};

interface WireFormData {
  fromAccount: string;
  recipientType: "individual" | "business";
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  recipientCountry: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
  swiftCode?: string;
  amount: string;
  currency: string;
  purpose: string;
  reference: string;
  urgency: "standard" | "expedited";
  notifications: boolean;
}

interface UserBalances {
  checking: number;
  savings: number;
  investment: number;
}

export default function WireTransferPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [submitResponse, setSubmitResponse] = useState<any>(null);
  
  const [userBalances, setUserBalances] = useState<UserBalances>({
    checking: 0,
    savings: 0,
    investment: 0
  });

  const [formData, setFormData] = useState<WireFormData>({
    fromAccount: "checking",
    recipientType: "individual",
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientState: "",
    recipientZip: "",
    recipientCountry: "US",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    swiftCode: "",
    amount: "",
    currency: "USD",
    purpose: "",
    reference: "",
    urgency: "standard",
    notifications: true
  });

  const [errors, setErrors] = useState<Partial<WireFormData>>({});

  // Fetch user balances
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleInputChange = (field: keyof WireFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<WireFormData> = {};
    
    switch(step) {
      case 1:
        if (!formData.recipientName) newErrors.recipientName = "Required";
        if (!formData.recipientAddress) newErrors.recipientAddress = "Required";
        if (!formData.recipientCity) newErrors.recipientCity = "Required";
        if (!formData.recipientCountry) newErrors.recipientCountry = "Required";
        break;
      case 2:
        if (!formData.bankName) newErrors.bankName = "Required";
        if (!formData.routingNumber) newErrors.routingNumber = "Required";
        if (!formData.accountNumber) newErrors.accountNumber = "Required";
        if (formData.recipientCountry !== "US" && !formData.swiftCode) {
          newErrors.swiftCode = "Required for international transfers";
        }
        break;
      case 3:
        if (!formData.amount) newErrors.amount = "Required";
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) newErrors.amount = "Invalid amount";
        if (amount > getAvailableBalance()) newErrors.amount = "Insufficient funds";
        if (!formData.purpose) newErrors.purpose = "Required";
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    setSubmitResponse(null);
    
    try {
      const wireTransferData = {
        fromAccount: formData.fromAccount,
        recipientName: formData.recipientName,
        recipientAccount: formData.accountNumber,
        recipientBank: formData.bankName,
        recipientRoutingNumber: formData.routingNumber,
        recipientBankAddress: `${formData.bankName} Main Branch`,
        recipientAddress: `${formData.recipientAddress}, ${formData.recipientCity}${formData.recipientState ? ', ' + formData.recipientState : ''}${formData.recipientZip ? ' ' + formData.recipientZip : ''}, ${formData.recipientCountry}`,
        amount: parseFloat(formData.amount),
        description: formData.reference || `Wire transfer to ${formData.recipientName}`,
        wireType: formData.recipientCountry === 'US' ? 'domestic' : 'international',
        purposeOfTransfer: formData.purpose,
        urgentTransfer: formData.urgency === 'expedited'
      };

      const response = await fetch('/api/transfers/wire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wireTransferData)
      });

      const data = await response.json();
      setSubmitResponse(data);

      if (data.success) {
        await fetchUserData();
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Wire transfer request failed:', error);
      setSubmitResponse({
        success: false,
        error: 'Network error occurred. Please try again.'
      });
    }
    
    setLoading(false);
  };

  const estimateFee = () => {
    const isInternational = formData.recipientCountry !== "US";
    const isExpedited = formData.urgency === "expedited";
    let fee = isInternational ? 45 : 30;
    if (isExpedited) fee += 25;
    return fee;
  };

  const estimateArrival = () => {
    return formData.urgency === "expedited" ? "Same business day (urgent)" : "Same business day";
  };

  if (fetchingBalance) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
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
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Wire Transfer</h1>
            <p className={styles.heroSubtitle}>
              Send money domestically or internationally with guaranteed delivery
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          
          <div className={styles.steps}>
            {["Recipient", "Bank Details", "Transfer Info", "Review"].map((label, index) => (
              <div 
                key={index}
                className={`${styles.step} ${currentStep > index ? styles.completed : ''} ${currentStep === index + 1 ? styles.active : ''}`}
              >
                <div className={styles.stepNumber}>{index + 1}</div>
                <span className={styles.stepLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.formContainer}>
            {/* Step 1: Recipient Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.stepContent}
              >
                <h2 className={styles.stepTitle}>Recipient Information</h2>
                
                <div className={styles.formSection}>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="recipientType"
                        value="individual"
                        checked={formData.recipientType === "individual"}
                        onChange={(e) => handleInputChange("recipientType", e.target.value)}
                      />
                      <span>{Icons.user} Individual</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="recipientType"
                        value="business"
                        checked={formData.recipientType === "business"}
                        onChange={(e) => handleInputChange("recipientType", e.target.value)}
                      />
                      <span>{Icons.building} Business</span>
                    </label>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>
                        {formData.recipientType === "individual" ? "Full Name" : "Business Name"}
                        <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.recipientName}
                        onChange={(e) => handleInputChange("recipientName", e.target.value)}
                        className={errors.recipientName ? styles.errorInput : ""}
                        placeholder={formData.recipientType === "individual" ? "John Doe" : "ABC Corporation"}
                      />
                      {errors.recipientName && (
                        <span className={styles.errorMessage}>{errors.recipientName}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>
                        Country
                        <span className={styles.required}>*</span>
                      </label>
                      <select
                        value={formData.recipientCountry}
                        onChange={(e) => handleInputChange("recipientCountry", e.target.value)}
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                        <option value="EU">European Union</option>
                        <option value="AU">Australia</option>
                        <option value="JP">Japan</option>
                        <option value="CN">China</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>
                        Street Address
                        <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.recipientAddress}
                        onChange={(e) => handleInputChange("recipientAddress", e.target.value)}
                        className={errors.recipientAddress ? styles.errorInput : ""}
                        placeholder="123 Main Street"
                      />
                      {errors.recipientAddress && (
                        <span className={styles.errorMessage}>{errors.recipientAddress}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>
                        City
                        <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.recipientCity}
                        onChange={(e) => handleInputChange("recipientCity", e.target.value)}
                        className={errors.recipientCity ? styles.errorInput : ""}
                        placeholder="New York"
                      />
                      {errors.recipientCity && (
                        <span className={styles.errorMessage}>{errors.recipientCity}</span>
                      )}
                    </div>

                    {formData.recipientCountry === "US" && (
                      <>
                        <div className={styles.formField}>
                          <label>State</label>
                          <input
                            type="text"
                            value={formData.recipientState}
                            onChange={(e) => handleInputChange("recipientState", e.target.value)}
                            placeholder="NY"
                            maxLength={2}
                          />
                        </div>

                        <div className={styles.formField}>
                          <label>ZIP Code</label>
                          <input
                            type="text"
                            value={formData.recipientZip}
                            onChange={(e) => handleInputChange("recipientZip", e.target.value)}
                            placeholder="10001"
                            maxLength={10}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.btnSecondary}
                    onClick={() => router.push('/dashboard')}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleNext}
                  >
                    Continue {Icons.arrowRight}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Bank Details */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.stepContent}
              >
                <h2 className={styles.stepTitle}>Bank Account Details</h2>
                
                <div className={styles.formSection}>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>
                        Bank Name
                        <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        className={errors.bankName ? styles.errorInput : ""}
                        placeholder="Bank of America"
                      />
                      {errors.bankName && (
                        <span className={styles.errorMessage}>{errors.bankName}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>
                        {formData.recipientCountry === "US" ? "Routing Number (ABA)" : "Bank Code"}
                        <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.routingNumber}
                        onChange={(e) => handleInputChange("routingNumber", e.target.value)}
                        className={errors.routingNumber ? styles.errorInput : ""}
                        placeholder={formData.recipientCountry === "US" ? "021000021" : "BOFAUS3N"}
                        maxLength={9}
                      />
                      {errors.routingNumber && (
                        <span className={styles.errorMessage}>{errors.routingNumber}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>
                        Account Number
                        <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                        className={errors.accountNumber ? styles.errorInput : ""}
                        placeholder="1234567890"
                      />
                      {errors.accountNumber && (
                        <span className={styles.errorMessage}>{errors.accountNumber}</span>
                      )}
                    </div>

                    {formData.recipientCountry !== "US" && (
                      <div className={styles.formField}>
                        <label>
                          SWIFT/BIC Code
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.swiftCode}
                          onChange={(e) => handleInputChange("swiftCode", e.target.value)}
                          className={errors.swiftCode ? styles.errorInput : ""}
                          placeholder="BOFAUS3N"
                          maxLength={11}
                        />
                        {errors.swiftCode && (
                          <span className={styles.errorMessage}>{errors.swiftCode}</span>
                        )}
                      </div>
                    )}

                    <div className={styles.formField}>
                      <label>Account Type</label>
                      <select
                        value={formData.accountType}
                        onChange={(e) => handleInputChange("accountType", e.target.value as "checking" | "savings")}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.infoBox}>
                    <div className={styles.infoIcon}>{Icons.info}</div>
                    <div className={styles.infoContent}>
                      <strong>Where to find these details?</strong>
                      <p>You can find routing and account numbers on checks or bank statements. 
                         SWIFT codes are available on your bank's website or by contacting them directly.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.btnSecondary}
                    onClick={handleBack}
                  >
                    {Icons.arrowLeft} Back
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleNext}
                  >
                    Continue {Icons.arrowRight}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Transfer Details */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.stepContent}
              >
                <h2 className={styles.stepTitle}>Transfer Details</h2>
                
                <div className={styles.formSection}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>
                        From Account
                        <span className={styles.required}>*</span>
                      </label>
                      <select
                        value={formData.fromAccount}
                        onChange={(e) => handleInputChange("fromAccount", e.target.value)}
                      >
                        <option value="checking">Checking - {formatCurrency(userBalances.checking)}</option>
                        <option value="savings">Savings - {formatCurrency(userBalances.savings)}</option>
                        {userBalances.investment > 0 && (
                          <option value="investment">Investment - {formatCurrency(userBalances.investment)}</option>
                        )}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label>
                        Amount
                        <span className={styles.required}>*</span>
                      </label>
                      <div className={styles.amountInput}>
                        <select
                          value={formData.currency}
                          onChange={(e) => handleInputChange("currency", e.target.value)}
                          className={styles.currencySelect}
                        >
                          <option value="USD">USD</option>
                        </select>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => handleInputChange("amount", e.target.value)}
                          className={errors.amount ? styles.errorInput : ""}
                          placeholder="0.00"
                          step="0.01"
                          min="1"
                        />
                      </div>
                      {errors.amount && (
                        <span className={styles.errorMessage}>{errors.amount}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Transfer Speed</label>
                      <select
                        value={formData.urgency}
                        onChange={(e) => handleInputChange("urgency", e.target.value)}
                      >
                        <option value="standard">Standard (${formData.recipientCountry === 'US' ? '30' : '45'})</option>
                        <option value="expedited">Urgent (+$25 fee)</option>
                      </select>
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>
                        Purpose of Transfer
                        <span className={styles.required}>*</span>
                      </label>
                      <select
                        value={formData.purpose}
                        onChange={(e) => handleInputChange("purpose", e.target.value)}
                        className={errors.purpose ? styles.errorInput : ""}
                      >
                        <option value="">Select purpose</option>
                        <option value="personal_transfer">Personal/Family Support</option>
                        <option value="business_payment">Business Payment</option>
                        <option value="real_estate">Purchase/Investment</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.purpose && (
                        <span className={styles.errorMessage}>{errors.purpose}</span>
                      )}
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Reference/Message (Optional)</label>
                      <textarea
                        value={formData.reference}
                        onChange={(e) => handleInputChange("reference", e.target.value)}
                        placeholder="Invoice #12345 or personal message"
                        rows={3}
                        maxLength={140}
                      />
                      <span className={styles.charCount}>
                        {formData.reference.length}/140 characters
                      </span>
                    </div>
                  </div>

                  <div className={styles.feeEstimate}>
                    <h3>Transfer Summary</h3>
                    <div className={styles.feeRow}>
                      <span>Transfer Amount:</span>
                      <strong>{formData.currency} {parseFloat(formData.amount || "0").toFixed(2)}</strong>
                    </div>
                    <div className={styles.feeRow}>
                      <span>Wire Fee:</span>
                      <strong>${estimateFee()}.00</strong>
                    </div>
                    <div className={styles.feeRow}>
                      <span>Estimated Arrival:</span>
                      <strong>{estimateArrival()}</strong>
                    </div>
                    <div className={`${styles.feeRow} ${styles.total}`}>
                      <span>Total Debit:</span>
                      <strong>
                        {formData.currency} {(parseFloat(formData.amount || "0") + estimateFee()).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={formData.notifications}
                      onChange={(e) => handleInputChange("notifications", e.target.checked)}
                    />
                    <label htmlFor="notifications">
                      Send me email notifications about this transfer
                    </label>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.btnSecondary}
                    onClick={handleBack}
                  >
                    {Icons.arrowLeft} Back
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleNext}
                  >
                    Review Transfer {Icons.arrowRight}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.stepContent}
              >
                <h2 className={styles.stepTitle}>Review Wire Transfer</h2>
                
                <div className={styles.reviewContainer}>
                  <div className={styles.reviewSection}>
                    <h3>Recipient Information</h3>
                    <div className={styles.reviewGrid}>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Name:</span>
                        <span className={styles.reviewValue}>{formData.recipientName}</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Address:</span>
                        <span className={styles.reviewValue}>
                          {formData.recipientAddress}, {formData.recipientCity}
                          {formData.recipientState && `, ${formData.recipientState}`}
                          {formData.recipientZip && ` ${formData.recipientZip}`}
                          , {formData.recipientCountry}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.reviewSection}>
                    <h3>Bank Information</h3>
                    <div className={styles.reviewGrid}>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Bank Name:</span>
                        <span className={styles.reviewValue}>{formData.bankName}</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Routing Number:</span>
                        <span className={styles.reviewValue}>{formData.routingNumber}</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Account Number:</span>
                        <span className={styles.reviewValue}>
                          ****{formData.accountNumber.slice(-4)}
                        </span>
                      </div>
                      {formData.swiftCode && (
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>SWIFT Code:</span>
                          <span className={styles.reviewValue}>{formData.swiftCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.reviewSection}>
                    <h3>Transfer Details</h3>
                    <div className={styles.reviewGrid}>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>From:</span>
                        <span className={styles.reviewValue}>{formData.fromAccount} Account</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Amount:</span>
                        <span className={styles.reviewValue}>
                          {formData.currency} {parseFloat(formData.amount || "0").toFixed(2)}
                        </span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Wire Fee:</span>
                        <span className={styles.reviewValue}>${estimateFee()}.00</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Purpose:</span>
                        <span className={styles.reviewValue}>{formData.purpose}</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <span className={styles.reviewLabel}>Delivery:</span>
                        <span className={styles.reviewValue}>{estimateArrival()}</span>
                      </div>
                    </div>
                  </div>

                  {submitResponse && !submitResponse.success && (
                    <div className={styles.warningBox}>
                      <div className={styles.warningIcon}>{Icons.warning}</div>
                      <div className={styles.warningContent}>
                        <strong>Error</strong>
                        <p>{submitResponse.error}</p>
                      </div>
                    </div>
                  )}

                  <div className={styles.warningBox}>
                    <div className={styles.warningIcon}>{Icons.warning}</div>
                    <div className={styles.warningContent}>
                      <strong>Important Notice</strong>
                      <p>Wire transfers cannot be cancelled once submitted. Please verify all information is correct before confirming.</p>
                    </div>
                  </div>

                  <div className={styles.agreementBox}>
                    <input type="checkbox" id="agreement" required />
                    <label htmlFor="agreement">
                      I confirm that all information is correct and authorize this wire transfer. I understand that wire transfers are irreversible.
                    </label>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.btnSecondary}
                    onClick={handleBack}
                    disabled={loading}
                  >
                    {Icons.arrowLeft} Back
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : <>{Icons.lock} Confirm & Send Wire</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Success */}
            {currentStep === 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.successContainer}
              >
                <div className={styles.successIcon}>{Icons.check}</div>
                <h2 className={styles.successTitle}>
                  {submitResponse?.success ? 'Wire Transfer Completed!' : 'Wire Transfer Failed'}
                </h2>
                <p className={styles.successMessage}>
                  {submitResponse?.success ? (
                    <>
                      Your wire transfer of {formData.currency} {parseFloat(formData.amount || "0").toFixed(2)} 
                      to {formData.recipientName} has been successfully completed.
                    </>
                  ) : (
                    <>There was an error processing your wire transfer. Error: {submitResponse?.error}</>
                  )}
                </p>
                
                {submitResponse?.success && (
                  <div className={styles.confirmationBox}>
                    <h3>Confirmation Details</h3>
                    <div className={styles.confirmationItem}>
                      <span>Reference Number:</span>
                      <strong>{submitResponse.wireReference}</strong>
                    </div>
                    <div className={styles.confirmationItem}>
                      <span>Status:</span>
                      <strong>Completed</strong>
                    </div>
                    <div className={styles.confirmationItem}>
                      <span>Amount Debited:</span>
                      <strong>${submitResponse.transfer?.total?.toFixed(2) || '0.00'}</strong>
                    </div>
                    <div className={styles.confirmationItem}>
                      <span>New Balance:</span>
                      <strong>${submitResponse.newBalance?.toFixed(2) || '0.00'}</strong>
                    </div>
                    <div className={styles.confirmationItem}>
                      <span>Expected Delivery:</span>
                      <strong>{estimateArrival()}</strong>
                    </div>
                  </div>
                )}

                <div className={styles.successActions}>
                  <button 
                    className={styles.btnSecondary}
                    onClick={() => window.print()}
                  >
                    {Icons.print} Print Confirmation
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={() => router.push('/dashboard')}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Side Panel */}
          {currentStep < 5 && (
            <div className={styles.sidePanel}>
              <div className={styles.helpSection}>
                <h3>Need Help?</h3>
                <div className={styles.helpItems}>
                  <div className={styles.helpItem}>
                    <span className={styles.helpIcon}>{Icons.phone}</span>
                    <div>
                      <strong>Call Us</strong>
                      <p>+44 20 7946 0958</p>
                    </div>
                  </div>
                  <div className={styles.helpItem}>
                    <span className={styles.helpIcon}>{Icons.chat}</span>
                    <div>
                      <strong>Live Chat</strong>
                      <p>Available 24/7</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.limitsSection}>
                <h3>Wire Transfer Limits</h3>
                <div className={styles.limitItem}>
                  <span>Domestic:</span>
                  <strong>$100,000/day</strong>
                </div>
                <div className={styles.limitItem}>
                  <span>International:</span>
                  <strong>$50,000/day</strong>
                </div>
                <p className={styles.limitNote}>
                  Need higher limits? Contact your relationship manager.
                </p>
              </div>

              <div className={styles.securitySection}>
                <h3>Security Tips</h3>
                <ul>
                  <li>Always verify recipient details</li>
                  <li>Never wire to unknown parties</li>
                  <li>Be aware of wire fraud schemes</li>
                  <li>Contact us if anything seems suspicious</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}