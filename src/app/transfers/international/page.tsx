// src/app/transfers/international/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./international.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

// SVG Icons
const Icons = {
  info: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#c9a962'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>),
  warning: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'18px',height:'18px',color:'#f59e0b'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'48px',height:'48px',color:'#10b981'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  error: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'48px',height:'48px',color:'#ef4444'}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
  lock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  chat: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'16px',height:'16px'}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  print: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>),
  track: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>)
};

interface Country { code: string; name: string; currency: string; emoji?: string; phoneCode?: string; requiresIBAN: boolean; requiresSortCode?: boolean; requiresRoutingNumber?: boolean; }
interface TransferSpeed { id: "standard" | "express" | "instant"; name: string; time: string; fee: number; description: string; }
interface ExchangeRate { from: string; to: string; rate: number; lastUpdated: Date; trend?: "up" | "down" | "stable"; }
interface UserBalances { checking: number; savings: number; investment: number; }

interface InternationalTransferData {
  fromAccount: string; amount: string; sourceCurrency: string; targetCurrency: string;
  recipientName: string; recipientEmail: string; recipientPhone: string; recipientAddress: string;
  recipientCity: string; recipientCountry: string; recipientPostalCode: string; recipientState?: string;
  bankName: string; iban: string; swiftBic: string; sortCode?: string; routingNumber?: string;
  accountNumber?: string; bankAddress: string; bankCity?: string; bankCountry?: string;
  purpose: string; reference: string; transferSpeed: "standard" | "express" | "instant";
  sourceOfFunds: string; relationship: string; complianceAccepted?: boolean;
  intermediaryBank?: string; intermediarySwift?: string;
}

interface TransferResponse { success: boolean; transferReference?: string; transfer?: { status: string; amount: number; fee: number; total: number; }; newBalance?: number; error?: string; }

const COUNTRIES: Country[] = [
  { code: "GB", name: "United Kingdom", currency: "GBP", emoji: "🇬🇧", phoneCode: "+44", requiresIBAN: true, requiresSortCode: true },
  { code: "FR", name: "France", currency: "EUR", emoji: "🇫🇷", phoneCode: "+33", requiresIBAN: true },
  { code: "DE", name: "Germany", currency: "EUR", emoji: "🇩🇪", phoneCode: "+49", requiresIBAN: true },
  { code: "ES", name: "Spain", currency: "EUR", emoji: "🇪🇸", phoneCode: "+34", requiresIBAN: true },
  { code: "IT", name: "Italy", currency: "EUR", emoji: "🇮🇹", phoneCode: "+39", requiresIBAN: true },
  { code: "CA", name: "Canada", currency: "CAD", emoji: "🇨🇦", phoneCode: "+1", requiresIBAN: false, requiresRoutingNumber: true },
  { code: "AU", name: "Australia", currency: "AUD", emoji: "🇦🇺", phoneCode: "+61", requiresIBAN: false },
  { code: "JP", name: "Japan", currency: "JPY", emoji: "🇯🇵", phoneCode: "+81", requiresIBAN: false },
  { code: "CH", name: "Switzerland", currency: "CHF", emoji: "🇨🇭", phoneCode: "+41", requiresIBAN: true },
  { code: "SE", name: "Sweden", currency: "SEK", emoji: "🇸🇪", phoneCode: "+46", requiresIBAN: true },
];

const TRANSFER_SPEEDS: TransferSpeed[] = [
  { id: "standard", name: "Standard", time: "3-5 business days", fee: 25, description: "Low cost option" },
  { id: "express", name: "Express", time: "1-2 business days", fee: 45, description: "Faster delivery" },
  { id: "instant", name: "Instant", time: "Within minutes", fee: 75, description: "Immediate transfer" }
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
];

const TRANSFER_PURPOSES = [
  { value: "family_support", label: "Family Support" },
  { value: "education", label: "Education/Tuition" },
  { value: "personal_transfer", label: "Personal Transfer" },
  { value: "business_payment", label: "Business Payment" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

const RELATIONSHIPS = [
  { value: "family", label: "Family Member" },
  { value: "friend", label: "Friend" },
  { value: "business_partner", label: "Business Partner" },
  { value: "self", label: "Own Account" },
  { value: "other", label: "Other" },
];

const SOURCE_OF_FUNDS = [
  { value: "salary", label: "Salary/Income" },
  { value: "savings", label: "Personal Savings" },
  { value: "business", label: "Business Revenue" },
  { value: "investment", label: "Investment Returns" },
  { value: "other", label: "Other" },
];

export default function InternationalTransferPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingData, setFetchingData] = useState<boolean>(true);
  const [submitResponse, setSubmitResponse] = useState<TransferResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<{field: string; message: string}[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isRateLoading, setIsRateLoading] = useState<boolean>(false);
  const [userBalances, setUserBalances] = useState<UserBalances>({ checking: 0, savings: 0, investment: 0 });
  
  const [formData, setFormData] = useState<InternationalTransferData>({
    fromAccount: "checking", amount: "", sourceCurrency: "USD", targetCurrency: "EUR",
    recipientName: "", recipientEmail: "", recipientPhone: "", recipientAddress: "",
    recipientCity: "", recipientCountry: "", recipientPostalCode: "", recipientState: "",
    bankName: "", iban: "", swiftBic: "", sortCode: "", routingNumber: "",
    accountNumber: "", bankAddress: "", bankCity: "", bankCountry: "",
    purpose: "", reference: "", transferSpeed: "standard",
    sourceOfFunds: "", relationship: "", complianceAccepted: false,
    intermediaryBank: "", intermediarySwift: ""
  });

  useEffect(() => {
    if (session?.user?.email) fetchUserData();
    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchUserData = async () => {
    setFetchingData(true);
    try {
      const response = await fetch('/api/user/dashboard');
      if (response.ok) {
        const data = await response.json();
        setUserBalances({ checking: data.balances?.checking || 0, savings: data.balances?.savings || 0, investment: data.balances?.investment || 0 });
      }
    } catch (error) { console.error('Error fetching user data:', error); }
    finally { setFetchingData(false); }
  };

  const fetchExchangeRates = async () => {
    setIsRateLoading(true);
    try {
      const mockRates: ExchangeRate[] = [
        { from: "USD", to: "EUR", rate: 0.92, lastUpdated: new Date(), trend: "up" },
        { from: "USD", to: "GBP", rate: 0.79, lastUpdated: new Date(), trend: "down" },
        { from: "USD", to: "CAD", rate: 1.36, lastUpdated: new Date(), trend: "stable" },
        { from: "USD", to: "AUD", rate: 1.53, lastUpdated: new Date(), trend: "up" },
        { from: "USD", to: "JPY", rate: 149.50, lastUpdated: new Date(), trend: "down" },
        { from: "USD", to: "CHF", rate: 0.88, lastUpdated: new Date(), trend: "stable" },
        { from: "USD", to: "SEK", rate: 10.45, lastUpdated: new Date(), trend: "up" },
      ];
      setExchangeRates(mockRates);
    } catch (error) { console.error("Failed to fetch exchange rates:", error); }
    finally { setIsRateLoading(false); }
  };

  const getAvailableBalance = () => userBalances[formData.fromAccount as keyof UserBalances] || 0;

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const currencyInfo = CURRENCIES.find(c => c.code === currency);
    return `${currencyInfo?.symbol || '$'}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCurrentExchangeRate = useCallback((): number => {
    const rate = exchangeRates.find(r => r.from === formData.sourceCurrency && r.to === formData.targetCurrency);
    return rate?.rate || 1;
  }, [exchangeRates, formData.sourceCurrency, formData.targetCurrency]);

  const calculateTotal = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const fee = TRANSFER_SPEEDS.find(s => s.id === formData.transferSpeed)?.fee || 0;
    const exchangeRate = getCurrentExchangeRate();
    const convertedAmount = amount * exchangeRate;
    return { sourceAmount: amount, fee, totalDebit: amount + fee, convertedAmount, exchangeRate, estimatedReceive: convertedAmount - (convertedAmount * 0.002) };
  }, [formData.amount, formData.transferSpeed, getCurrentExchangeRate]);

  const handleInputChange = useCallback((field: keyof InternationalTransferData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => prev.filter(e => e.field !== field));
    if (field === 'recipientCountry' && !formData.bankCountry) setFormData(prev => ({ ...prev, bankCountry: value }));
    if (field === 'iban') { const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g)?.join(' ') || value; setFormData(prev => ({ ...prev, iban: formatted })); }
    if (field === 'swiftBic') setFormData(prev => ({ ...prev, swiftBic: value.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
  }, [formData.bankCountry]);

  const validateStep = (step: number): boolean => {
    const errors: {field: string; message: string}[] = [];
    switch (step) {
      case 1:
        if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push({ field: 'amount', message: 'Please enter an amount' });
        if (parseFloat(formData.amount) > getAvailableBalance()) errors.push({ field: 'amount', message: 'Insufficient funds' });
        break;
      case 2:
        if (!formData.recipientName) errors.push({ field: 'recipientName', message: 'Required' });
        if (!formData.recipientCountry) errors.push({ field: 'recipientCountry', message: 'Required' });
        if (!formData.recipientAddress) errors.push({ field: 'recipientAddress', message: 'Required' });
        if (!formData.recipientCity) errors.push({ field: 'recipientCity', message: 'Required' });
        if (!formData.relationship) errors.push({ field: 'relationship', message: 'Required' });
        if (!formData.sourceOfFunds) errors.push({ field: 'sourceOfFunds', message: 'Required' });
        break;
      case 3:
        if (!formData.bankName) errors.push({ field: 'bankName', message: 'Required' });
        const country = COUNTRIES.find(c => c.code === formData.recipientCountry);
        if (country?.requiresIBAN && !formData.iban) errors.push({ field: 'iban', message: 'IBAN is required' });
        if (!formData.swiftBic) errors.push({ field: 'swiftBic', message: 'Required' });
        if (country?.requiresSortCode && !formData.sortCode) errors.push({ field: 'sortCode', message: 'Sort code required' });
        if (!country?.requiresIBAN && !formData.accountNumber) errors.push({ field: 'accountNumber', message: 'Account number required' });
        if (!formData.purpose) errors.push({ field: 'purpose', message: 'Required' });
        break;
      case 4:
        if (!formData.complianceAccepted) errors.push({ field: 'compliance', message: 'You must accept the terms' });
        break;
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNextStep = () => { if (validateStep(currentStep)) { setCurrentStep(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const handlePreviousStep = () => { setCurrentStep(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const getFieldError = (field: string): string | undefined => validationErrors.find(e => e.field === field)?.message;

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setLoading(true);
    setSubmitResponse(null);
    try {
      const transferData = {
        fromAccount: formData.fromAccount, recipientName: formData.recipientName.trim(),
        recipientAccount: formData.accountNumber?.trim() || '',
        recipientIBAN: formData.iban?.replace(/\s/g, '').trim() || undefined,
        recipientSWIFT: formData.swiftBic.toUpperCase().trim(), recipientBank: formData.bankName.trim(),
        recipientBankAddress: formData.bankAddress?.trim() || `${formData.bankName.trim()} Main Branch`,
        recipientAddress: formData.recipientAddress.trim(), recipientCity: formData.recipientCity.trim(),
        recipientCountry: formData.recipientCountry, recipientPostalCode: formData.recipientPostalCode.trim(),
        amount: parseFloat(formData.amount), currency: formData.targetCurrency,
        description: formData.reference?.trim() || `International transfer to ${formData.recipientName.trim()}`,
        purposeOfTransfer: formData.purpose, transferSpeed: formData.transferSpeed === 'instant' ? 'express' : formData.transferSpeed,
      };
      const response = await fetch('/api/transfers/international', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transferData) });
      const data = await response.json();
      setSubmitResponse(data);
      if (data.success) { await fetchUserData(); setCurrentStep(5); }
    } catch (error) { console.error('International transfer request failed:', error); setSubmitResponse({ success: false, error: 'Network error occurred. Please try again.' }); }
    finally { setLoading(false); }
  };

  const stepTitles = ["Amount & Currency", "Recipient Details", "Bank Information", "Review & Confirm"];

  if (fetchingData) return (<div className={styles.wrapper}><Sidebar /><div className={styles.mainContent}><Header /><div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'400px'}}><div className={styles.spinner}></div></div></div></div>);

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>International Money Transfer</h1>
            <p className={styles.pageSubtitle}>Send money worldwide with competitive exchange rates</p>
          </div>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${(currentStep / 4) * 100}%` }}/></div>
            <div className={styles.progressSteps}>
              {stepTitles.map((title, index) => (
                <div key={index} className={`${styles.progressStep} ${currentStep > index ? styles.completed : ''} ${currentStep === index + 1 ? styles.active : ''}`}>
                  <div className={styles.stepCircle}>{currentStep > index + 1 ? '✓' : index + 1}</div>
                  <span className={styles.stepTitle}>{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.formCard}>
            <AnimatePresence mode="wait">
              {/* Step 1 */}
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Transfer Amount & Currency</h2>
                  <div className={styles.currencyConverter}>
                    <div className={styles.converterRow}>
                      <div className={styles.currencyInput}>
                        <label>You Send</label>
                        <div className={styles.inputGroup}>
                          <select value={formData.sourceCurrency} onChange={(e) => handleInputChange("sourceCurrency", e.target.value)} className={styles.currencySelect}>
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          <input type="number" value={formData.amount} onChange={(e) => handleInputChange("amount", e.target.value)} placeholder="Enter amount" min="0.01" step="0.01" className={`${styles.amountInput} ${getFieldError('amount') ? styles.error : ''}`}/>
                        </div>
                        {getFieldError('amount') && <span className={styles.errorMessage}>{getFieldError('amount')}</span>}
                        <span className={styles.fxNote}>Available: {formatCurrency(getAvailableBalance())}</span>
                      </div>
                      <div className={styles.exchangeRate}>
                        <div className={styles.rateInfo}><span className={styles.rateLabel}>Exchange Rate</span><span className={styles.rateValue}>1 {formData.sourceCurrency} = {getCurrentExchangeRate().toFixed(4)} {formData.targetCurrency}</span></div>
                        <div className={styles.rateArrow}>→</div>
                      </div>
                      <div className={styles.currencyInput}>
                        <label>Recipient Gets (estimated)</label>
                        <div className={styles.inputGroup}>
                          <select value={formData.targetCurrency} onChange={(e) => handleInputChange("targetCurrency", e.target.value)} className={styles.currencySelect}>
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          <input type="text" value={calculateTotal.estimatedReceive.toFixed(2)} readOnly className={styles.amountInput} style={{ backgroundColor: '#f8f7f5' }}/>
                        </div>
                        <span className={styles.fxNote}>*After FX margin of 0.2%</span>
                      </div>
                    </div>
                    <div className={styles.feeBreakdown}>
                      <div className={styles.feeItem}><span>Transfer Amount:</span><strong>{formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}</strong></div>
                      <div className={styles.feeItem}><span>Our Fee:</span><strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong></div>
                      <div className={styles.feeItem}><span>Total to be Debited:</span><strong className={styles.totalAmount}>{formatCurrency(calculateTotal.totalDebit, formData.sourceCurrency)}</strong></div>
                    </div>
                  </div>
                  <div className={styles.transferSpeedSection}>
                    <h3>Select Transfer Speed</h3>
                    <div className={styles.speedOptions}>
                      {TRANSFER_SPEEDS.map((speed) => (
                        <div key={speed.id} className={`${styles.speedOption} ${formData.transferSpeed === speed.id ? styles.selected : ''}`} onClick={() => handleInputChange("transferSpeed", speed.id)}>
                          <div className={styles.speedHeader}><span className={styles.speedName}>{speed.name}</span><span className={styles.speedFee}>{formatCurrency(speed.fee, formData.sourceCurrency)}</span></div>
                          <div className={styles.speedTime}>{speed.time}</div>
                          <div className={styles.speedDesc}>{speed.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button className={styles.btnSecondary} onClick={() => router.push('/dashboard')}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={handleNextStep} disabled={!formData.amount || parseFloat(formData.amount) <= 0}>Continue</button>
                  </div>
                </motion.div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Recipient Information</h2>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}><label>Full Name <span className={styles.required}>*</span></label><input type="text" value={formData.recipientName} onChange={(e) => handleInputChange("recipientName", e.target.value)} placeholder="As it appears on bank account" className={getFieldError('recipientName') ? styles.error : ''}/>{getFieldError('recipientName') && <span className={styles.errorMessage}>{getFieldError('recipientName')}</span>}</div>
                    <div className={styles.formField}><label>Country <span className={styles.required}>*</span></label><select value={formData.recipientCountry} onChange={(e) => handleInputChange("recipientCountry", e.target.value)} className={getFieldError('recipientCountry') ? styles.error : ''}><option value="">Select Country</option>{COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>)}</select>{getFieldError('recipientCountry') && <span className={styles.errorMessage}>{getFieldError('recipientCountry')}</span>}</div>
                    <div className={styles.formField}><label>Email Address</label><input type="email" value={formData.recipientEmail} onChange={(e) => handleInputChange("recipientEmail", e.target.value)} placeholder="recipient@email.com"/></div>
                    <div className={styles.formField}><label>Phone Number</label><div className={styles.phoneInput}><span className={styles.phoneCode}>{COUNTRIES.find(c => c.code === formData.recipientCountry)?.phoneCode || '+1'}</span><input type="tel" value={formData.recipientPhone} onChange={(e) => handleInputChange("recipientPhone", e.target.value)} placeholder="234 567 8900"/></div></div>
                    <div className={`${styles.formField} ${styles.fullWidth}`}><label>Street Address <span className={styles.required}>*</span></label><input type="text" value={formData.recipientAddress} onChange={(e) => handleInputChange("recipientAddress", e.target.value)} placeholder="123 Main Street" className={getFieldError('recipientAddress') ? styles.error : ''}/>{getFieldError('recipientAddress') && <span className={styles.errorMessage}>{getFieldError('recipientAddress')}</span>}</div>
                    <div className={styles.formField}><label>City <span className={styles.required}>*</span></label><input type="text" value={formData.recipientCity} onChange={(e) => handleInputChange("recipientCity", e.target.value)} placeholder="London" className={getFieldError('recipientCity') ? styles.error : ''}/>{getFieldError('recipientCity') && <span className={styles.errorMessage}>{getFieldError('recipientCity')}</span>}</div>
                    <div className={styles.formField}><label>Postal Code</label><input type="text" value={formData.recipientPostalCode} onChange={(e) => handleInputChange("recipientPostalCode", e.target.value)} placeholder="SW1A 1AA"/></div>
                    <div className={styles.formField}><label>Your Relationship <span className={styles.required}>*</span></label><select value={formData.relationship} onChange={(e) => handleInputChange("relationship", e.target.value)} className={getFieldError('relationship') ? styles.error : ''}><option value="">Select</option>{RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>{getFieldError('relationship') && <span className={styles.errorMessage}>{getFieldError('relationship')}</span>}</div>
                    <div className={styles.formField}><label>Source of Funds <span className={styles.required}>*</span></label><select value={formData.sourceOfFunds} onChange={(e) => handleInputChange("sourceOfFunds", e.target.value)} className={getFieldError('sourceOfFunds') ? styles.error : ''}><option value="">Select</option>{SOURCE_OF_FUNDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>{getFieldError('sourceOfFunds') && <span className={styles.errorMessage}>{getFieldError('sourceOfFunds')}</span>}</div>
                  </div>
                  <div className={styles.formActions}><button className={styles.btnSecondary} onClick={handlePreviousStep}>Back</button><button className={styles.btnPrimary} onClick={handleNextStep}>Continue</button></div>
                </motion.div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Recipient Bank Details</h2>
                  <div className={styles.bankDetailsInfo}><div className={styles.infoIcon}>{Icons.info}</div><p>Please ensure all bank details are correct. Incorrect information may result in delays.</p></div>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formField} ${styles.fullWidth}`}><label>Bank Name <span className={styles.required}>*</span></label><input type="text" value={formData.bankName} onChange={(e) => handleInputChange("bankName", e.target.value)} placeholder="HSBC Bank" className={getFieldError('bankName') ? styles.error : ''}/>{getFieldError('bankName') && <span className={styles.errorMessage}>{getFieldError('bankName')}</span>}</div>
                    {COUNTRIES.find(c => c.code === formData.recipientCountry)?.requiresIBAN ? (
                      <div className={styles.formField}><label>IBAN <span className={styles.required}>*</span></label><input type="text" value={formData.iban} onChange={(e) => handleInputChange("iban", e.target.value)} placeholder="GB00 XXXX 0000 0000 0000 00" className={getFieldError('iban') ? styles.error : ''}/>{getFieldError('iban') && <span className={styles.errorMessage}>{getFieldError('iban')}</span>}</div>
                    ) : (
                      <div className={styles.formField}><label>Account Number <span className={styles.required}>*</span></label><input type="text" value={formData.accountNumber} onChange={(e) => handleInputChange("accountNumber", e.target.value)} placeholder="1234567890" className={getFieldError('accountNumber') ? styles.error : ''}/>{getFieldError('accountNumber') && <span className={styles.errorMessage}>{getFieldError('accountNumber')}</span>}</div>
                    )}
                    <div className={styles.formField}><label>SWIFT/BIC Code <span className={styles.required}>*</span></label><input type="text" value={formData.swiftBic} onChange={(e) => handleInputChange("swiftBic", e.target.value)} placeholder="HBUKGB4B" maxLength={11} className={getFieldError('swiftBic') ? styles.error : ''}/>{getFieldError('swiftBic') && <span className={styles.errorMessage}>{getFieldError('swiftBic')}</span>}</div>
                    {COUNTRIES.find(c => c.code === formData.recipientCountry)?.requiresSortCode && (
                      <div className={styles.formField}><label>Sort Code <span className={styles.required}>*</span></label><input type="text" value={formData.sortCode} onChange={(e) => handleInputChange("sortCode", e.target.value)} placeholder="00-00-00" maxLength={8} className={getFieldError('sortCode') ? styles.error : ''}/>{getFieldError('sortCode') && <span className={styles.errorMessage}>{getFieldError('sortCode')}</span>}</div>
                    )}
                    <div className={`${styles.formField} ${styles.fullWidth}`}><label>Purpose of Transfer <span className={styles.required}>*</span></label><select value={formData.purpose} onChange={(e) => handleInputChange("purpose", e.target.value)} className={getFieldError('purpose') ? styles.error : ''}><option value="">Select Purpose</option>{TRANSFER_PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>{getFieldError('purpose') && <span className={styles.errorMessage}>{getFieldError('purpose')}</span>}</div>
                    <div className={`${styles.formField} ${styles.fullWidth}`}><label>Reference/Message</label><textarea value={formData.reference} onChange={(e) => handleInputChange("reference", e.target.value)} placeholder="Optional message for recipient" rows={3} maxLength={140}/><span className={styles.charCount}>{formData.reference.length}/140</span></div>
                  </div>
                  <div className={styles.formActions}><button className={styles.btnSecondary} onClick={handlePreviousStep}>Back</button><button className={styles.btnPrimary} onClick={handleNextStep}>Review Transfer</button></div>
                </motion.div>
              )}

              {/* Step 4 */}
              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Review & Confirm Transfer</h2>
                  <div className={styles.reviewSections}>
                    <div className={styles.reviewCard}><h3>Transfer Summary</h3><div className={styles.summaryAmount}><div className={styles.summaryRow}><span>You Send:</span><strong className={styles.primaryAmount}>{formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}</strong></div><div className={styles.summaryRow}><span>Transfer Fee:</span><strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong></div><div className={`${styles.summaryRow} ${styles.total}`}><span>Total Debit:</span><strong>{formatCurrency(calculateTotal.totalDebit, formData.sourceCurrency)}</strong></div><div className={styles.exchangeInfo}><span>Rate: 1 {formData.sourceCurrency} = {getCurrentExchangeRate().toFixed(4)} {formData.targetCurrency}</span></div><div className={`${styles.summaryRow} ${styles.receives}`}><span>Recipient Gets:</span><strong className={styles.primaryAmount}>{formatCurrency(calculateTotal.estimatedReceive, formData.targetCurrency)}</strong></div></div></div>
                    <div className={styles.reviewCard}><h3>Recipient</h3><div className={styles.reviewDetails}><div className={styles.detailRow}><span>Name:</span><strong>{formData.recipientName}</strong></div><div className={styles.detailRow}><span>Location:</span><strong>{formData.recipientCity}, {COUNTRIES.find(c => c.code === formData.recipientCountry)?.name}</strong></div></div></div>
                    <div className={styles.reviewCard}><h3>Bank</h3><div className={styles.reviewDetails}><div className={styles.detailRow}><span>Bank:</span><strong>{formData.bankName}</strong></div>{formData.iban && <div className={styles.detailRow}><span>IBAN:</span><strong>{formData.iban}</strong></div>}{formData.accountNumber && <div className={styles.detailRow}><span>Account:</span><strong>{formData.accountNumber}</strong></div>}<div className={styles.detailRow}><span>SWIFT:</span><strong>{formData.swiftBic}</strong></div></div></div>
                  </div>
                  {submitResponse && !submitResponse.success && <div className={styles.errorAlert}><div className={styles.errorIcon}>{Icons.warning}</div><div><strong>Error:</strong> {submitResponse.error}</div></div>}
                  <div className={styles.complianceSection}><h3>Compliance & Legal</h3><div className={styles.complianceNotice}><input type="checkbox" id="compliance" checked={formData.complianceAccepted} onChange={(e) => handleInputChange("complianceAccepted", e.target.checked)}/><label htmlFor="compliance">I confirm all information is accurate and I accept the terms and conditions of this transfer.</label></div>{getFieldError('compliance') && <span className={styles.errorMessage}>{getFieldError('compliance')}</span>}</div>
                  <div className={styles.formActions}><button className={styles.btnSecondary} onClick={handlePreviousStep} disabled={loading}>Back</button><button className={styles.btnPrimary} onClick={handleSubmit} disabled={loading || !formData.complianceAccepted}>{loading ? <><span className={styles.spinner}></span>Processing...</> : <>{Icons.lock} Confirm & Send</>}</button></div>
                </motion.div>
              )}

              {/* Step 5 */}
              {currentStep === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={styles.successContent}>
                  <div className={styles.successIcon}>{submitResponse?.success ? Icons.check : Icons.error}</div>
                  <h2 className={styles.successTitle}>{submitResponse?.success ? 'Transfer Initiated Successfully!' : 'Transfer Failed'}</h2>
                  <p className={styles.successMessage}>{submitResponse?.success ? <>Your international transfer of {formatCurrency(parseFloat(formData.amount), formData.sourceCurrency)} to {formData.recipientName} has been initiated.</> : <>We couldn&apos;t process your transfer. {submitResponse?.error}</>}</p>
                  {submitResponse?.success && (<><div className={styles.referenceNumber}><span>Reference Number:</span><strong>{submitResponse.transferReference || `INT${Date.now()}`}</strong></div><div className={styles.transferSummarySuccess}><h3>Transfer Details</h3><div className={styles.summaryGrid}><div className={styles.summaryItem}><span>Amount Sent:</span><strong>{formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}</strong></div><div className={styles.summaryItem}><span>Fee:</span><strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong></div><div className={styles.summaryItem}><span>Recipient Gets:</span><strong>{formatCurrency(calculateTotal.estimatedReceive, formData.targetCurrency)}</strong></div><div className={styles.summaryItem}><span>New Balance:</span><strong>{formatCurrency(submitResponse.newBalance || 0, 'USD')}</strong></div></div></div></>)}
                  <div className={styles.successActions}>{submitResponse?.success && <><button className={styles.btnSecondary} onClick={() => window.print()}>{Icons.print} Print Receipt</button><button className={styles.btnSecondary} onClick={() => router.push('/transactions')}>{Icons.track} Track Transfer</button></>}<button className={styles.btnPrimary} onClick={() => router.push('/dashboard')}>{submitResponse?.success ? 'Return to Dashboard' : 'Try Again'}</button></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {currentStep < 5 && (
            <div className={styles.infoSidebar}>
              <div className={styles.exchangeRateCard}><h3>Live Exchange Rates</h3>{isRateLoading ? <div className={styles.rateLoading}><span className={styles.spinner}></span></div> : <div className={styles.ratesList}>{exchangeRates.slice(0, 6).map((rate) => (<div key={`${rate.from}-${rate.to}`} className={styles.rateItem}><span>{rate.from} → {rate.to}</span><div className={styles.rateValue}><strong>{rate.rate.toFixed(4)}</strong>{rate.trend && <span className={`${styles.rateTrend} ${styles[rate.trend]}`}>{rate.trend === 'up' ? '↑' : rate.trend === 'down' ? '↓' : '→'}</span>}</div></div>))}</div>}</div>
              <div className={styles.supportCard}><h3>Need Help?</h3><p>Our specialists are available 24/7</p><button className={styles.supportButton}>{Icons.chat} Live Chat</button><div className={styles.supportContact}><span>Email:</span><strong>support@aldwycheuropeancapital.com</strong></div></div>
              <div className={styles.limitsSection}><h3>Transfer Limits</h3><div className={styles.limitsList}><div className={styles.limitItem}><span>Minimum:</span><strong>$50</strong></div><div className={styles.limitItem}><span>Per Transaction:</span><strong>$25,000</strong></div><div className={styles.limitItem}><span>Daily Limit:</span><strong>$50,000</strong></div></div></div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}