"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./apply.module.css";

const STEPS = [
  { id: 1, label: "Account", desc: "Registration" },
  { id: 2, label: "KYC", desc: "Identity Verification" },
  { id: 3, label: "Documents", desc: "Upload Files" },
  { id: 4, label: "Assessment", desc: "Financial Profile" },
  { id: 5, label: "Review", desc: "Underwriting Review" },
  { id: 6, label: "Offer", desc: "Loan Offer" },
  { id: 7, label: "Agreement", desc: "Sign & Accept" },
  { id: 8, label: "Disbursement", desc: "Funds Released" },
];

const LOAN_TYPES = [
  { value: "business", label: "Business Loan", range: "€50K – €5M", rate: "From 4.9% APR" },
  { value: "contractor", label: "Contractor Financing", range: "€25K – €2M", rate: "From 5.4% APR" },
  { value: "sme", label: "SME Expansion Loan", range: "€30K – €3M", rate: "From 5.1% APR" },
  { value: "trade", label: "Trade Finance", range: "€100K – €10M", rate: "From 3.8% APR" },
  { value: "equipment", label: "Equipment Financing", range: "€10K – €1.5M", rate: "From 4.5% APR" },
  { value: "personal", label: "Personal Loan", range: "€5K – €250K", rate: "From 6.9% APR" },
];

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [applicationRef, setApplicationRef] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Step 1 - Account (if not logged in)
  const [accountForm, setAccountForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    country: "", phone: ""
  });

  // Step 2 - KYC
  const [kycForm, setKycForm] = useState({
    dateOfBirth: "", nationality: "", idType: "passport", idNumber: "",
    address: "", city: "", postalCode: "", country: "",
    pepDeclaration: false, sanctionsDeclaration: false
  });

  // Step 3 - Documents
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; size: string; uploaded: boolean }>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Step 4 - Financial Assessment
  const [loanType, setLoanType] = useState("business");
  const [financialForm, setFinancialForm] = useState({
    loanType: "business",
    loanAmount: "",
    loanPurpose: "",
    loanTerm: "36",
    businessName: "",
    businessType: "",
    yearsInBusiness: "",
    annualRevenue: "",
    annualProfit: "",
    existingDebt: "",
    collateral: "none",
    collateralValue: "",
    employmentStatus: "employed",
    annualIncome: "",
    creditScore: "good"
  });

  // Step 7 - Agreement
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  // Loan offer (from step 6)
  const [loanOffer, setLoanOffer] = useState({
    approvedAmount: 0,
    interestRate: 0,
    term: 0,
    monthlyPayment: 0,
    totalRepayable: 0,
    offerExpiry: ""
  });

  useEffect(() => {
    if (status === "authenticated" && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [status]);

  const handleFileUpload = (docType: string, file: File) => {
    setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[docType] || 0;
        if (current >= 100) {
          clearInterval(interval);
          setUploadedDocs(prevDocs => ({
            ...prevDocs,
            [docType]: {
              name: file.name,
              size: (file.size / 1024 / 1024).toFixed(2) + " MB",
              uploaded: true
            }
          }));
          return prev;
        }
        return { ...prev, [docType]: current + 20 };
      });
    }, 200);
  };

  const calculateLoanOffer = () => {
    const amount = parseFloat(financialForm.loanAmount) || 100000;
    const term = parseInt(financialForm.loanTerm) || 36;
    const rateMap: Record<string, number> = {
      business: 4.9, contractor: 5.4, sme: 5.1,
      trade: 3.8, equipment: 4.5, personal: 6.9
    };
    const annualRate = rateMap[financialForm.loanType] || 5.0;
    const monthlyRate = annualRate / 100 / 12;
    const monthly = amount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const total = monthly * term;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    setLoanOffer({
      approvedAmount: amount,
      interestRate: annualRate,
      term,
      monthlyPayment: monthly,
      totalRepayable: total,
      offerExpiry: expiry.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    });
  };

  const handleNextStep = async () => {
    setError("");
    if (currentStep === 1) {
      if (!accountForm.email || !accountForm.password || !accountForm.firstName) {
        setError("Please fill in all required fields.");
        return;
      }
      if (accountForm.password !== accountForm.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${accountForm.firstName} ${accountForm.lastName}`,
            email: accountForm.email,
            password: accountForm.password,
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");
        setCurrentStep(2);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (currentStep === 2) {
      if (!kycForm.dateOfBirth || !kycForm.idNumber || !kycForm.address) {
        setError("Please complete all identity verification fields.");
        return;
      }
      if (!kycForm.pepDeclaration || !kycForm.sanctionsDeclaration) {
        setError("Please confirm the compliance declarations to proceed.");
        return;
      }
    }
    if (currentStep === 3) {
      const required = ["id_document", "proof_of_address"];
      const missing = required.filter(d => !uploadedDocs[d]?.uploaded);
      if (missing.length > 0) {
        setError("Please upload at least your ID document and proof of address.");
        return;
      }
    }
    if (currentStep === 4) {
      if (!financialForm.loanAmount || !financialForm.loanPurpose) {
        setError("Please complete the financial assessment form.");
        return;
      }
      const amount = parseFloat(financialForm.loanAmount);
      if (isNaN(amount) || amount < 5000) {
        setError("Minimum loan amount is €5,000.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: financialForm.loanType,
            amount: parseFloat(financialForm.loanAmount),
            purpose: financialForm.loanPurpose,
            term: parseInt(financialForm.loanTerm),
            employmentStatus: financialForm.employmentStatus,
            annualIncome: parseFloat(financialForm.annualIncome) || 0,
            businessName: financialForm.businessName,
            annualRevenue: parseFloat(financialForm.annualRevenue) || 0,
            kycData: kycForm,
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Application submission failed");
        setApplicationRef(data.loan?.referenceNumber || "AEC-" + Date.now());
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }
    if (currentStep === 5) {
      calculateLoanOffer();
    }
    if (currentStep === 7) {
      if (!agreementAccepted || !signatureName) {
        setError("Please accept the agreement and provide your signature.");
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 8));
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

  const requiredDocs = [
    { key: "id_document", label: "Government-Issued ID", desc: "Passport, national ID card, or driving licence", required: true },
    { key: "proof_of_address", label: "Proof of Address", desc: "Utility bill or bank statement (within 3 months)", required: true },
    { key: "bank_statements", label: "Bank Statements", desc: "Last 6 months of business or personal bank statements", required: false },
    { key: "financial_statements", label: "Financial Statements", desc: "Last 2 years of audited accounts (business loans)", required: false },
    { key: "business_registration", label: "Business Registration", desc: "Certificate of incorporation or business licence", required: false },
    { key: "business_plan", label: "Business Plan / Purpose Statement", desc: "Brief description of loan purpose and repayment plan", required: false },
  ];

  return (
    <div className={styles.applyRoot}>
      {/* Header */}
      <nav className={styles.applyNav}>
        <Link href="/" className={styles.applyNavLogo}>
          <Image src="/images/Logo.png" alt="Aldwych European Capital" width={140} height={35} style={{ objectFit: "contain" }} />
        </Link>
        <div className={styles.applyNavRight}>
          <span className={styles.applyNavSecure}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure Application
          </span>
          {session ? (
            <Link href="/dashboard" className={styles.applyNavLink}>Back to Dashboard</Link>
          ) : (
            <Link href="/auth/signin" className={styles.applyNavLink}>Already have an account?</Link>
          )}
        </div>
      </nav>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressInner}>
          {STEPS.map((step) => (
            <div key={step.id} className={`${styles.progressStep} ${currentStep >= step.id ? styles.progressStepActive : ""} ${currentStep === step.id ? styles.progressStepCurrent : ""}`}>
              <div className={styles.progressDot}>
                {currentStep > step.id ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: "14px", height: "14px" }}><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className={styles.progressLabel}>
                <div className={styles.progressLabelMain}>{step.label}</div>
                <div className={styles.progressLabelSub}>{step.desc}</div>
              </div>
              {step.id < STEPS.length && <div className={`${styles.progressLine} ${currentStep > step.id ? styles.progressLineActive : ""}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.applyContent}>
        <div className={styles.applyCard}>
          {error && <div className={styles.errorBanner}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px", flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>{error}</div>}

          {/* STEP 1: Account Registration */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>01</div>
                <div>
                  <h2 className={styles.stepTitle}>Create Your Account</h2>
                  <p className={styles.stepDesc}>Set up your secure Aldwych European Capital account to begin your application.</p>
                </div>
              </div>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label>First Name <span className={styles.req}>*</span></label>
                  <input type="text" value={accountForm.firstName} onChange={e => setAccountForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Marcus" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name <span className={styles.req}>*</span></label>
                  <input type="text" value={accountForm.lastName} onChange={e => setAccountForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Hoffmann" className={styles.input} />
                </div>
                <div className={styles.formGroupFull}>
                  <label>Email Address <span className={styles.req}>*</span></label>
                  <input type="email" value={accountForm.email} onChange={e => setAccountForm(p => ({ ...p, email: e.target.value }))} placeholder="marcus@company.com" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Password <span className={styles.req}>*</span></label>
                  <input type="password" value={accountForm.password} onChange={e => setAccountForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Confirm Password <span className={styles.req}>*</span></label>
                  <input type="password" value={accountForm.confirmPassword} onChange={e => setAccountForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat password" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Country of Residence</label>
                  <select value={accountForm.country} onChange={e => setAccountForm(p => ({ ...p, country: e.target.value }))} className={styles.input}>
                    <option value="">Select country</option>
                    {["United Kingdom", "Germany", "France", "Netherlands", "Switzerland", "Austria", "Belgium", "Luxembourg", "Ireland", "Italy", "Spain", "Sweden", "Norway", "Denmark", "United States", "Canada", "UAE"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.alreadyHave}>
                Already have an account? <Link href="/auth/signin">Sign in here</Link>
              </div>
            </div>
          )}

          {/* STEP 2: KYC */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>02</div>
                <div>
                  <h2 className={styles.stepTitle}>Identity Verification (KYC)</h2>
                  <p className={styles.stepDesc}>We are required by law to verify your identity before processing any loan application. All information is encrypted and stored securely.</p>
                </div>
              </div>
              <div className={styles.kycBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="2" style={{ width: "16px", height: "16px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                AML/KYC Compliant — Your data is protected under GDPR
              </div>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label>Date of Birth <span className={styles.req}>*</span></label>
                  <input type="date" value={kycForm.dateOfBirth} onChange={e => setKycForm(p => ({ ...p, dateOfBirth: e.target.value }))} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Nationality <span className={styles.req}>*</span></label>
                  <select value={kycForm.nationality} onChange={e => setKycForm(p => ({ ...p, nationality: e.target.value }))} className={styles.input}>
                    <option value="">Select nationality</option>
                    {["British", "German", "French", "Dutch", "Swiss", "Austrian", "Belgian", "Irish", "Italian", "Spanish", "Swedish", "Norwegian", "Danish", "American", "Canadian", "Emirati", "Other"].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>ID Document Type <span className={styles.req}>*</span></label>
                  <select value={kycForm.idType} onChange={e => setKycForm(p => ({ ...p, idType: e.target.value }))} className={styles.input}>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID Card</option>
                    <option value="driving_licence">Driving Licence</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>ID Number <span className={styles.req}>*</span></label>
                  <input type="text" value={kycForm.idNumber} onChange={e => setKycForm(p => ({ ...p, idNumber: e.target.value }))} placeholder="e.g. 123456789" className={styles.input} />
                </div>
                <div className={styles.formGroupFull}>
                  <label>Residential Address <span className={styles.req}>*</span></label>
                  <input type="text" value={kycForm.address} onChange={e => setKycForm(p => ({ ...p, address: e.target.value }))} placeholder="Street address" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>City <span className={styles.req}>*</span></label>
                  <input type="text" value={kycForm.city} onChange={e => setKycForm(p => ({ ...p, city: e.target.value }))} placeholder="London" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Postal Code</label>
                  <input type="text" value={kycForm.postalCode} onChange={e => setKycForm(p => ({ ...p, postalCode: e.target.value }))} placeholder="EC1A 1BB" className={styles.input} />
                </div>
              </div>
              <div className={styles.declarationsSection}>
                <h4 className={styles.declarationsTitle}>Compliance Declarations</h4>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={kycForm.pepDeclaration} onChange={e => setKycForm(p => ({ ...p, pepDeclaration: e.target.checked }))} className={styles.checkbox} />
                  <span>I confirm that I am <strong>not</strong> a Politically Exposed Person (PEP) or closely associated with one, unless declared separately.</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={kycForm.sanctionsDeclaration} onChange={e => setKycForm(p => ({ ...p, sanctionsDeclaration: e.target.checked }))} className={styles.checkbox} />
                  <span>I confirm that I am <strong>not</strong> subject to any international sanctions lists (OFAC, EU, UN) and all funds are from legitimate sources.</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Document Upload */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>03</div>
                <div>
                  <h2 className={styles.stepTitle}>Upload Supporting Documents</h2>
                  <p className={styles.stepDesc}>Upload the required documents to support your application. All files are encrypted and stored securely. Accepted formats: PDF, JPG, PNG (max 10MB each).</p>
                </div>
              </div>
              <div className={styles.docsGrid}>
                {requiredDocs.map((doc) => (
                  <div key={doc.key} className={`${styles.docCard} ${uploadedDocs[doc.key]?.uploaded ? styles.docCardUploaded : ""}`}>
                    <div className={styles.docCardTop}>
                      <div className={styles.docIcon}>
                        {uploadedDocs[doc.key]?.uploaded ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: "24px", height: "24px" }}><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "24px", height: "24px" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        )}
                      </div>
                      <div className={styles.docInfo}>
                        <div className={styles.docLabel}>
                          {doc.label}
                          {doc.required && <span className={styles.docRequired}>Required</span>}
                        </div>
                        <div className={styles.docDesc}>{doc.desc}</div>
                        {uploadedDocs[doc.key]?.uploaded && (
                          <div className={styles.docUploaded}>{uploadedDocs[doc.key].name} · {uploadedDocs[doc.key].size}</div>
                        )}
                      </div>
                    </div>
                    {uploadProgress[doc.key] !== undefined && uploadProgress[doc.key] < 100 && (
                      <div className={styles.uploadProgressBar}>
                        <div className={styles.uploadProgressFill} style={{ width: `${uploadProgress[doc.key]}%` }} />
                      </div>
                    )}
                    {!uploadedDocs[doc.key]?.uploaded && (
                      <button className={styles.uploadBtn} onClick={() => fileInputRefs.current[doc.key]?.click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        Upload File
                      </button>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: "none" }}
                      ref={el => { fileInputRefs.current[doc.key] = el; }}
                      onChange={e => { if (e.target.files?.[0]) handleFileUpload(doc.key, e.target.files[0]); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Financial Assessment */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>04</div>
                <div>
                  <h2 className={styles.stepTitle}>Financial Assessment</h2>
                  <p className={styles.stepDesc}>Provide details about your financing needs and financial profile. This information is used for credit assessment.</p>
                </div>
              </div>
              <h4 className={styles.subSection}>Loan Details</h4>
              <div className={styles.loanTypeGrid}>
                {LOAN_TYPES.map(lt => (
                  <div key={lt.value} className={`${styles.loanTypeCard} ${financialForm.loanType === lt.value ? styles.loanTypeCardSelected : ""}`} onClick={() => setFinancialForm(p => ({ ...p, loanType: lt.value }))}>
                    <div className={styles.loanTypeLabel}>{lt.label}</div>
                    <div className={styles.loanTypeRange}>{lt.range}</div>
                    <div className={styles.loanTypeRate}>{lt.rate}</div>
                  </div>
                ))}
              </div>
              <div className={styles.formGrid2} style={{ marginTop: "24px" }}>
                <div className={styles.formGroup}>
                  <label>Loan Amount (€) <span className={styles.req}>*</span></label>
                  <input type="number" value={financialForm.loanAmount} onChange={e => setFinancialForm(p => ({ ...p, loanAmount: e.target.value }))} placeholder="e.g. 250000" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Repayment Term</label>
                  <select value={financialForm.loanTerm} onChange={e => setFinancialForm(p => ({ ...p, loanTerm: e.target.value }))} className={styles.input}>
                    {["12", "24", "36", "48", "60", "84", "120"].map(t => <option key={t} value={t}>{t} months ({Math.floor(parseInt(t)/12)} year{parseInt(t) >= 24 ? "s" : ""})</option>)}
                  </select>
                </div>
                <div className={styles.formGroupFull}>
                  <label>Purpose of Loan <span className={styles.req}>*</span></label>
                  <textarea value={financialForm.loanPurpose} onChange={e => setFinancialForm(p => ({ ...p, loanPurpose: e.target.value }))} placeholder="Describe how the funds will be used..." className={`${styles.input} ${styles.textarea}`} rows={3} />
                </div>
              </div>
              <h4 className={styles.subSection}>Business Information</h4>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label>Business / Company Name</label>
                  <input type="text" value={financialForm.businessName} onChange={e => setFinancialForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Hoffmann Logistics GmbH" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Business Type</label>
                  <select value={financialForm.businessType} onChange={e => setFinancialForm(p => ({ ...p, businessType: e.target.value }))} className={styles.input}>
                    <option value="">Select type</option>
                    {["Limited Company", "Sole Trader", "Partnership", "LLP", "PLC", "Other"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Years in Business</label>
                  <select value={financialForm.yearsInBusiness} onChange={e => setFinancialForm(p => ({ ...p, yearsInBusiness: e.target.value }))} className={styles.input}>
                    <option value="">Select</option>
                    {["Less than 1 year", "1–2 years", "2–5 years", "5–10 years", "10+ years"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Annual Revenue (€)</label>
                  <input type="number" value={financialForm.annualRevenue} onChange={e => setFinancialForm(p => ({ ...p, annualRevenue: e.target.value }))} placeholder="e.g. 1500000" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Annual Net Profit (€)</label>
                  <input type="number" value={financialForm.annualProfit} onChange={e => setFinancialForm(p => ({ ...p, annualProfit: e.target.value }))} placeholder="e.g. 250000" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Existing Debt / Liabilities (€)</label>
                  <input type="number" value={financialForm.existingDebt} onChange={e => setFinancialForm(p => ({ ...p, existingDebt: e.target.value }))} placeholder="e.g. 50000" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Annual Personal Income (€)</label>
                  <input type="number" value={financialForm.annualIncome} onChange={e => setFinancialForm(p => ({ ...p, annualIncome: e.target.value }))} placeholder="e.g. 120000" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Self-Assessed Credit Profile</label>
                  <select value={financialForm.creditScore} onChange={e => setFinancialForm(p => ({ ...p, creditScore: e.target.value }))} className={styles.input}>
                    <option value="excellent">Excellent (750+)</option>
                    <option value="good">Good (700–749)</option>
                    <option value="fair">Fair (650–699)</option>
                    <option value="poor">Poor (below 650)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Admin Review */}
          {currentStep === 5 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>05</div>
                <div>
                  <h2 className={styles.stepTitle}>Application Under Review</h2>
                  <p className={styles.stepDesc}>Your application has been submitted and is being reviewed by our underwriting team.</p>
                </div>
              </div>
              <div className={styles.reviewCard}>
                <div className={styles.reviewIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5" style={{ width: "48px", height: "48px" }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                {applicationRef && <div className={styles.refNumber}>Reference: <strong>{applicationRef}</strong></div>}
                <h3 className={styles.reviewTitle}>Application Received</h3>
                <p className={styles.reviewDesc}>
                  Your application has been successfully submitted. Our underwriting team will review your documents and financial profile.
                  You will receive an email notification with the outcome within <strong>24–48 business hours</strong>.
                </p>
                <div className={styles.reviewTimeline}>
                  {[
                    { label: "Application Submitted", done: true, time: "Just now" },
                    { label: "Document Verification", done: false, time: "In progress" },
                    { label: "Credit Assessment", done: false, time: "Pending" },
                    { label: "Underwriter Review", done: false, time: "Pending" },
                    { label: "Decision Issued", done: false, time: "24–48 hours" }
                  ].map((item, i) => (
                    <div key={i} className={styles.reviewTimelineItem}>
                      <div className={`${styles.reviewTimelineDot} ${item.done ? styles.reviewTimelineDotDone : ""}`}>
                        {item.done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: "10px", height: "10px" }}><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <div className={styles.reviewTimelineLabel}>{item.label}</div>
                      <div className={styles.reviewTimelineTime}>{item.time}</div>
                    </div>
                  ))}
                </div>
                <p className={styles.reviewNote}>
                  For this demonstration, click "Continue" to proceed to the loan offer stage.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Loan Offer */}
          {currentStep === 6 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>06</div>
                <div>
                  <h2 className={styles.stepTitle}>Your Loan Offer</h2>
                  <p className={styles.stepDesc}>Congratulations. Based on your application and financial assessment, we are pleased to offer you the following facility.</p>
                </div>
              </div>
              <div className={styles.offerCard}>
                <div className={styles.offerHeader}>
                  <div className={styles.offerApproved}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: "28px", height: "28px" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Application Approved
                  </div>
                  <div className={styles.offerExpiry}>Offer valid until: {loanOffer.offerExpiry || "14 days from today"}</div>
                </div>
                <div className={styles.offerGrid}>
                  <div className={styles.offerItem}>
                    <div className={styles.offerItemLabel}>Approved Amount</div>
                    <div className={styles.offerItemValue}>{fmt(loanOffer.approvedAmount || parseFloat(financialForm.loanAmount) || 100000)}</div>
                  </div>
                  <div className={styles.offerItem}>
                    <div className={styles.offerItemLabel}>Interest Rate (APR)</div>
                    <div className={styles.offerItemValue}>{loanOffer.interestRate || 4.9}%</div>
                  </div>
                  <div className={styles.offerItem}>
                    <div className={styles.offerItemLabel}>Repayment Term</div>
                    <div className={styles.offerItemValue}>{loanOffer.term || parseInt(financialForm.loanTerm)} months</div>
                  </div>
                  <div className={styles.offerItem}>
                    <div className={styles.offerItemLabel}>Monthly Payment</div>
                    <div className={styles.offerItemValue}>{fmt(loanOffer.monthlyPayment || 0)}</div>
                  </div>
                  <div className={styles.offerItem}>
                    <div className={styles.offerItemLabel}>Total Repayable</div>
                    <div className={styles.offerItemValue}>{fmt(loanOffer.totalRepayable || 0)}</div>
                  </div>
                  <div className={styles.offerItem}>
                    <div className={styles.offerItemLabel}>Facility Type</div>
                    <div className={styles.offerItemValue}>{LOAN_TYPES.find(l => l.value === financialForm.loanType)?.label || "Business Loan"}</div>
                  </div>
                </div>
                <div className={styles.offerDisclaimer}>
                  This offer is subject to final documentation review and agreement signing. The representative APR shown is based on your application profile. Early repayment is permitted without penalty. Your capital is at risk if you fail to meet repayment obligations.
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Agreement Signing */}
          {currentStep === 7 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNum}>07</div>
                <div>
                  <h2 className={styles.stepTitle}>Loan Agreement</h2>
                  <p className={styles.stepDesc}>Please review the loan agreement carefully before signing. By signing, you agree to the terms and conditions of this facility.</p>
                </div>
              </div>
              <div className={styles.agreementDoc}>
                <div className={styles.agreementDocHeader}>
                  <Image src="/images/Logo.png" alt="Aldwych European Capital" width={120} height={30} style={{ objectFit: "contain" }} />
                  <div className={styles.agreementDocTitle}>LOAN FACILITY AGREEMENT</div>
                  <div className={styles.agreementDocRef}>Reference: {applicationRef || "AEC-" + Date.now()}</div>
                </div>
                <div className={styles.agreementDocBody}>
                  <p><strong>This Loan Facility Agreement</strong> ("Agreement") is entered into between <strong>Aldwych European Capital</strong> ("Lender") and the applicant identified in this application ("Borrower").</p>
                  <p><strong>1. Facility Amount:</strong> {fmt(loanOffer.approvedAmount || parseFloat(financialForm.loanAmount) || 100000)}</p>
                  <p><strong>2. Interest Rate:</strong> {loanOffer.interestRate || 4.9}% APR (fixed for the duration of the facility)</p>
                  <p><strong>3. Repayment Term:</strong> {loanOffer.term || parseInt(financialForm.loanTerm)} months from disbursement date</p>
                  <p><strong>4. Monthly Repayment:</strong> {fmt(loanOffer.monthlyPayment || 0)} payable on the same date each month</p>
                  <p><strong>5. Purpose:</strong> Funds must be used solely for the purpose stated in the application. Any material change in use requires prior written consent from the Lender.</p>
                  <p><strong>6. Early Repayment:</strong> The Borrower may repay the outstanding balance in full or in part at any time without penalty.</p>
                  <p><strong>7. Default:</strong> Failure to make scheduled repayments may result in additional charges, reporting to credit reference agencies, and legal recovery action.</p>
                  <p><strong>8. Governing Law:</strong> This Agreement is governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the English courts.</p>
                  <p><strong>9. Data Protection:</strong> The Lender will process personal data in accordance with its Privacy Policy and applicable GDPR requirements.</p>
                </div>
              </div>
              <div className={styles.signatureSection}>
                <h4 className={styles.signatureTitle}>Digital Signature</h4>
                <div className={styles.formGroup}>
                  <label>Type your full legal name as your digital signature <span className={styles.req}>*</span></label>
                  <input type="text" value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="e.g. Marcus Hoffmann" className={`${styles.input} ${styles.signatureInput}`} />
                </div>
                <label className={styles.checkboxLabel} style={{ marginTop: "16px" }}>
                  <input type="checkbox" checked={agreementAccepted} onChange={e => setAgreementAccepted(e.target.checked)} className={styles.checkbox} />
                  <span>I have read, understood, and agree to the terms of this Loan Facility Agreement. I confirm that all information provided in my application is accurate and complete.</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 8: Disbursement */}
          {currentStep === 8 && (
            <div className={styles.stepContent}>
              <div className={styles.disbursementSuccess}>
                <div className={styles.successIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ width: "56px", height: "56px" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <h2 className={styles.successTitle}>Agreement Signed — Disbursement Initiated</h2>
                <p className={styles.successDesc}>
                  Your loan agreement has been executed. Funds of <strong>{fmt(loanOffer.approvedAmount || parseFloat(financialForm.loanAmount) || 100000)}</strong> will be transferred to your nominated account within <strong>1 business day</strong>.
                </p>
                <div className={styles.disbursementDetails}>
                  <div className={styles.disbursementItem}>
                    <span>Reference</span>
                    <strong>{applicationRef || "AEC-" + Date.now()}</strong>
                  </div>
                  <div className={styles.disbursementItem}>
                    <span>Amount</span>
                    <strong>{fmt(loanOffer.approvedAmount || parseFloat(financialForm.loanAmount) || 100000)}</strong>
                  </div>
                  <div className={styles.disbursementItem}>
                    <span>First Payment Due</span>
                    <strong>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
                  </div>
                  <div className={styles.disbursementItem}>
                    <span>Monthly Payment</span>
                    <strong>{fmt(loanOffer.monthlyPayment || 0)}</strong>
                  </div>
                </div>
                <div className={styles.disbursementActions}>
                  <Link href="/dashboard" className={styles.heroCtaPrimary}>Go to Dashboard</Link>
                  <Link href="/loans" className={styles.heroCtaSecondary} style={{ borderColor: "#0d2440", color: "#0d2440" }}>View My Loans</Link>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          {currentStep < 8 && (
            <div className={styles.stepNav}>
              {currentStep > 1 && (
                <button className={styles.stepNavBack} onClick={() => setCurrentStep(p => p - 1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Back
                </button>
              )}
              <button className={styles.stepNavNext} onClick={handleNextStep} disabled={loading}>
                {loading ? "Processing..." : currentStep === 7 ? "Sign & Accept Agreement" : currentStep === 4 ? "Submit Application" : "Continue"}
                {!loading && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.applySidebar}>
          <div className={styles.sidebarCard}>
            <h4 className={styles.sidebarTitle}>Why Choose Aldwych</h4>
            {[
              { icon: "⚡", text: "48-hour credit decisions" },
              { icon: "🔒", text: "Bank-grade encryption" },
              { icon: "📊", text: "Transparent pricing, no hidden fees" },
              { icon: "🌍", text: "Multi-currency facilities" },
              { icon: "👤", text: "Dedicated relationship manager" },
              { icon: "📋", text: "No early repayment penalties" }
            ].map((item, i) => (
              <div key={i} className={styles.sidebarItem}>
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <div className={styles.sidebarCard}>
            <h4 className={styles.sidebarTitle}>Need Help?</h4>
            <p className={styles.sidebarText}>Our team is available to assist with your application.</p>
            <a href="mailto:support@aldwycheuropeancapital.com" className={styles.sidebarEmail}>
              support@aldwycheuropeancapital.com
            </a>
          </div>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCompliance}>
              <div className={styles.sidebarComplianceBadge}>🔒 SSL Secured</div>
              <div className={styles.sidebarComplianceBadge}>✅ GDPR Compliant</div>
              <div className={styles.sidebarComplianceBadge}>🛡️ AML/KYC Verified</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
