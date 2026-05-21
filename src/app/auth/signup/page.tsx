// app/(auth)/signup/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./signup.module.css";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dob: string;
  nationality: string;
  idType: string;
  idNumber: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  employmentStatus: string;
  monthlyIncome: string;
  purpose: string;
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
};

const countries = [
  "United Kingdom", "Germany", "France", "Switzerland", "Austria",
  "Netherlands", "Belgium", "Luxembourg", "Ireland", "Italy", "Spain", 
  "Portugal", "Sweden", "Norway", "Denmark", "Finland", "United States",
  "Canada", "Japan", "Singapore", "Hong Kong", "South Korea",
  "Australia", "New Zealand", "United Arab Emirates","United States of America"
];

const employmentOptions = [
  "Executive/CEO", "Director/VP", "Senior Manager", "Professional",
  "Self-employed", "Entrepreneur", "Investor", "Retired", "Other"
];

const incomeRanges = [
  "Under €50,000", "€50,000 - €100,000", "€100,000 - €250,000", 
  "€250,000 - €500,000", "€500,000 - €1,000,000", "€1,000,000 - €5,000,000", "Over €5,000,000"
];

const accountPurposes = [
  "Private Banking", "Wealth Management", "Investment Portfolio", 
  "Corporate Banking", "International Banking", "Family Office", "Other"
];

export default function SignUpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    nationality: "",
    idType: "passport",
    idNumber: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
    employmentStatus: "",
    monthlyIncome: "",
    purpose: "",
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  // Logo URL from Imgur
  const LOGO_URL = "https://i.imgur.com/sndDIPM.png";

  useEffect(() => {
    const calculateStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 12) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;
      if (password.length >= 16) strength += 1;
      return strength;
    };
    setPasswordStrength(calculateStrength(form.password));
  }, [form.password]);

  useEffect(() => {
    const checkEmail = async () => {
      if (form.email.includes('@')) {
        const exists = form.email === 'test@aldwychcapital.com';
        setEmailExists(exists);
      }
    };
    
    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [form.email]);

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const validateStep = (step: number) => {
    setErrorMsg("");
    
    switch (step) {
      case 1:
        if (!form.firstName.trim()) {
          setErrorMsg("First name is required");
          return false;
        }
        if (!form.lastName.trim()) {
          setErrorMsg("Last name is required");
          return false;
        }
        if (!form.email || emailExists) {
          setErrorMsg(emailExists ? "This email is already associated with an existing account" : "Valid email is required");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          setErrorMsg("Please enter a valid email address");
          return false;
        }
        if (passwordStrength < 4) {
          setErrorMsg("Password must meet all security requirements");
          return false;
        }
        if (form.password !== form.confirmPassword) {
          setErrorMsg("Passwords do not match");
          return false;
        }
        break;
        
      case 2:
        const age = calculateAge(form.dob);
        if (age < 21) {
          setErrorMsg("You must be at least 21 years old to open an account");
          return false;
        }
        if (!form.nationality) {
          setErrorMsg("Please select your nationality");
          return false;
        }
        if (!form.idNumber.trim()) {
          setErrorMsg("Government-issued ID number is required");
          return false;
        }
        break;
        
      case 3:
        if (!form.address.trim() || !form.city.trim() || !form.postalCode.trim() || !form.country) {
          setErrorMsg("All residential address fields are required");
          return false;
        }
        if (!/^\+\d{10,15}$/.test(form.phone)) {
          setErrorMsg("Phone number must include country code (e.g., +44 for UK)");
          return false;
        }
        break;
        
      case 4:
        if (!form.employmentStatus || !form.monthlyIncome || !form.purpose) {
          setErrorMsg("Please complete all financial profile fields");
          return false;
        }
        if (!form.terms || !form.privacy) {
          setErrorMsg("You must accept the terms and privacy policy");
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setErrorMsg("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) return;
    
    setLoading(true);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2500));

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(data.message || "Registration failed. Please try again.");
      return;
    }

    // Successful registration
    router.push("/auth/signin?registered=1");
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "#ef4444";
    if (passwordStrength <= 3) return "#f59e0b";
    if (passwordStrength <= 4) return "#eab308";
    if (passwordStrength <= 5) return "#22c55e";
    return "#10b981";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return "Inadequate";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Strong";
    if (passwordStrength <= 5) return "Excellent";
    return "Exceptional";
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>01</div>
              <h2 className={styles.stepTitle}>Personal Details</h2>
              <p className={styles.stepSubtitle}>Begin your private banking journey</p>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="firstName">First Name</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    placeholder="John"
                    autoComplete="given-name"
                    className={styles.input}
                  />
                </div>
              </div>
              
              <div className={styles.formField}>
                <label htmlFor="lastName">Last Name</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Smith"
                    autoComplete="family-name"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="email">Email Address</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>✉️</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="john.smith@aldwychcapital.com"
                  autoComplete="email"
                  className={`${styles.input} ${emailExists ? styles.inputError : ''}`}
                />
              </div>
              {emailExists && <span className={styles.fieldError}>⚠️ This email is already associated with an existing account</span>}
            </div>

            <div className={styles.formField}>
              <label htmlFor="password">Create Secure Password</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🔐</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 12 characters with mixed case, numbers, and symbols"
                  autoComplete="new-password"
                  className={styles.input}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              
              {form.password && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthLabel}>
                    Security Level: <strong style={{ color: getPasswordStrengthColor() }}>
                      {getPasswordStrengthText()}
                    </strong>
                  </div>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div 
                        key={i}
                        className={`${styles.strengthBar} ${i <= passwordStrength ? styles.strengthBarActive : ''}`}
                        style={{ 
                          backgroundColor: i <= passwordStrength ? getPasswordStrengthColor() : undefined 
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div className={styles.passwordReqs}>
                <div className={`${styles.reqItem} ${form.password.length >= 12 ? styles.reqMet : ''}`}>
                  <span className={styles.reqIcon}>
                    {form.password.length >= 12 ? '✓' : '○'}
                  </span>
                  Minimum 12 characters
                </div>
                <div className={`${styles.reqItem} ${/[a-z]/.test(form.password) ? styles.reqMet : ''}`}>
                  <span className={styles.reqIcon}>
                    {/[a-z]/.test(form.password) ? '✓' : '○'}
                  </span>
                  Lowercase letter
                </div>
                <div className={`${styles.reqItem} ${/[A-Z]/.test(form.password) ? styles.reqMet : ''}`}>
                  <span className={styles.reqIcon}>
                    {/[A-Z]/.test(form.password) ? '✓' : '○'}
                  </span>
                  Uppercase letter
                </div>
                <div className={`${styles.reqItem} ${/[0-9]/.test(form.password) ? styles.reqMet : ''}`}>
                  <span className={styles.reqIcon}>
                    {/[0-9]/.test(form.password) ? '✓' : '○'}
                  </span>
                  Number
                </div>
                <div className={`${styles.reqItem} ${/[^A-Za-z0-9]/.test(form.password) ? styles.reqMet : ''}`}>
                  <span className={styles.reqIcon}>
                    {/[^A-Za-z0-9]/.test(form.password) ? '✓' : '○'}
                  </span>
                  Special character
                </div>
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>✅</span>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`${styles.input} ${form.confirmPassword && form.password !== form.confirmPassword ? styles.inputError : ''}`}
                />
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <span className={styles.fieldError}>⚠️ Passwords do not match</span>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && (
                <span className={styles.fieldSuccess}>✓ Passwords match</span>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>02</div>
              <h2 className={styles.stepTitle}>Identity Verification</h2>
              <p className={styles.stepSubtitle}>Regulatory compliance and security</p>
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="dob">Date of Birth</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>📅</span>
                <input
                  id="dob"
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split('T')[0]}
                  className={styles.input}
                />
              </div>
              {form.dob && calculateAge(form.dob) < 21 && (
                <span className={styles.fieldError}>⚠️ Must be 21 or older to open a private banking account</span>
              )}
              {form.dob && calculateAge(form.dob) >= 21 && (
                <span className={styles.fieldSuccess}>✓ Age verified ({calculateAge(form.dob)} years old)</span>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="nationality">Nationality</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🌍</span>
                <select
                  id="nationality"
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Select your nationality</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="idType">Document Type</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>📄</span>
                  <select
                    id="idType"
                    name="idType"
                    value={form.idType}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  >
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="driving_license">Driving License</option>
                    <option value="residence_permit">Residence Permit</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="idNumber">Document Number</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>🔢</span>
                  <input
                    id="idNumber"
                    type="text"
                    name="idNumber"
                    value={form.idNumber}
                    onChange={handleChange}
                    required
                    placeholder="Enter government-issued ID number"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>🏛️</div>
              <div className={styles.infoContent}>
                <h4 className={styles.infoTitle}>Regulatory Compliance</h4>
                <p className={styles.infoText}>
                  All information is encrypted and processed in compliance with global banking regulations.
                  Your privacy and security are our highest priorities.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>03</div>
              <h2 className={styles.stepTitle}>Contact Information</h2>
              <p className={styles.stepSubtitle}>Where we'll reach you</p>
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="address">Residential Address</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🏠</span>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  placeholder="123 Park Avenue, Apt 4B"
                  autoComplete="street-address"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="city">City</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>🏙️</span>
                  <input
                    id="city"
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    placeholder="London"
                    autoComplete="address-level2"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="postalCode">Postal Code</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>📮</span>
                  <input
                    id="postalCode"
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    required
                    placeholder="SW1A 1AA"
                    autoComplete="postal-code"
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="country">Country of Residence</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>📍</span>
                <select
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Select your country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="phone">Mobile Phone</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>📱</span>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="e.g. +353 1 234 5678"
                  autoComplete="tel"
                  className={styles.input}
                />
              </div>
              <p className={styles.fieldHint}>
                Include country code. This number will be used for two-factor authentication and security alerts.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>04</div>
              <h2 className={styles.stepTitle}>Financial Profile</h2>
              <p className={styles.stepSubtitle}>Final step to activate your account</p>
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="employmentStatus">Employment Status</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>💼</span>
                <select
                  id="employmentStatus"
                  name="employmentStatus"
                  value={form.employmentStatus}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Select employment status</option>
                  {employmentOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="monthlyIncome">Annual Income Range</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>💰</span>
                <select
                  id="monthlyIncome"
                  name="monthlyIncome"
                  value={form.monthlyIncome}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Select income range</option>
                  {incomeRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="purpose">Primary Account Purpose</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🎯</span>
                <select
                  id="purpose"
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  required
                  className={styles.input}
                >
                  <option value="">Select primary purpose</option>
                  {accountPurposes.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.agreements}>
              <h3 className={styles.agreementsTitle}>Legal Agreements</h3>
              
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="terms"
                  checked={form.terms}
                  onChange={handleChange}
                  required
                />
                <span className={styles.checkmark}></span>
                <span className={styles.checkboxLabel}>
                  I accept the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</a> and 
                  acknowledge that this is a legally binding agreement.
                </span>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="privacy"
                  checked={form.privacy}
                  onChange={handleChange}
                  required
                />
                <span className={styles.checkmark}></span>
                <span className={styles.checkboxLabel}>
                  I accept the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and 
                  consent to the processing of my personal data for account management and regulatory compliance.
                </span>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="marketing"
                  checked={form.marketing}
                  onChange={handleChange}
                />
                <span className={styles.checkmark}></span>
                <span className={styles.checkboxLabel}>
                  I would like to receive updates, market insights, and exclusive offers from Aldwych Capital.
                </span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarContent}>
            {/* Logo */}
            <div className={styles.logoContainer}>
              <Link href="/" className={styles.logoLink}>
                <Image
                  src={LOGO_URL}
                  alt="Aldwych European Capital"
                  width={580}
                  height={100}
                  className={styles.logoImage}
                  priority
                  unoptimized
                />
              </Link>
            </div>

            {/* Progress Steps */}
            <div className={styles.progressSteps}>
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className={styles.progressStep}>
                  <div className={`${styles.progressStepIcon} ${currentStep >= step ? styles.active : ''} ${currentStep === step ? styles.current : ''}`}>
                    {step}
                  </div>
                  <div className={styles.progressStepInfo}>
                    <div className={styles.progressStepTitle}>
                      {step === 1 && "Personal Details"}
                      {step === 2 && "Identity Verification"}
                      {step === 3 && "Contact Information"}
                      {step === 4 && "Financial Profile"}
                    </div>
                    <div className={styles.progressStepDesc}>
                      {step === 1 && "Basic information"}
                      {step === 2 && "Regulatory compliance"}
                      {step === 3 && "Residential details"}
                      {step === 4 && "Account purpose"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className={styles.benefits}>
              <h3 className={styles.benefitsTitle}>Why Choose Aldwych Capital?</h3>
              <div className={styles.benefitsGrid}>
                <div className={styles.benefit}>
                  <div className={styles.benefitIcon}>🏛️</div>
                  <div className={styles.benefitContent}>
                    <h4>Private Banking</h4>
                    <p>Exclusive services for discerning clients</p>
                  </div>
                </div>
                <div className={styles.benefit}>
                  <div className={styles.benefitIcon}>🌍</div>
                  <div className={styles.benefitContent}>
                    <h4>Global Access</h4>
                    <p>Banking services across 25+ countries</p>
                  </div>
                </div>
                <div className={styles.benefit}>
                  <div className={styles.benefitIcon}>🔐</div>
                  <div className={styles.benefitContent}>
                    <h4>Bank-Grade Security</h4>
                    <p>256-bit AES encryption</p>
                  </div>
                </div>
                <div className={styles.benefit}>
                  <div className={styles.benefitIcon}>⚡</div>
                  <div className={styles.benefitContent}>
                    <h4>24/7 Relationship Manager</h4>
                    <p>Dedicated personal support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className={styles.main}>
          <div className={styles.mainHeader}>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>Private Account Application</h1>
              <p className={styles.pageSubtitle}>
                Complete this form to begin your journey with Aldwych Capital. 
                Estimated completion time: 5-7 minutes.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className={`${styles.message} ${styles.errorMessage}`}>
              <div className={styles.messageIcon}>⚠️</div>
              <div className={styles.messageContent}>
                <strong>Action Required</strong>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {renderStep()}
            
            <div className={styles.actions}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className={styles.backButton}
                >
                  ← Previous Step
                </button>
              )}
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className={styles.nextButton}
                >
                  Continue to Step {currentStep + 1} →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !form.terms || !form.privacy}
                  className={`${styles.submitButton} ${loading ? styles.loading : ''}`}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Processing Application...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className={styles.footer}>
            <p className={styles.footerText}>
              Already have an account?{' '}
              <Link href="/auth/signin" className={styles.signInLink}>
                Access your account →
              </Link>
            </p>
            <div className={styles.securityBadges}>
              <div className={styles.badge}>
                <span className={styles.badgeIcon}>🛡️</span>
                <span className={styles.badgeText}>256-bit SSL</span>
              </div>
              <div className={styles.badge}>
                <span className={styles.badgeIcon}>✅</span>
                <span className={styles.badgeText}>SOC 2 Type II</span>
              </div>
              <div className={styles.badge}>
                <span className={styles.badgeIcon}>🔐</span>
                <span className={styles.badgeText}>2FA Required</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}