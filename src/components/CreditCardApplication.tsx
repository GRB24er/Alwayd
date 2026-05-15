// src/components/CreditCardApplication.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApplicationData {
  personal: any;
  employment: any;
  financial: any;
  preferences: any;
  consent: any;
}

export default function CreditCardApplicationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  
  const [formData, setFormData] = useState<ApplicationData>({
    personal: {
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      ssn: '',
      mothersMaidenName: '',
      email: '',
      phone: '',
      alternatePhone: '',
      currentAddress: {
        street: '',
        apartment: '',
        city: '',
        state: '',
        zipCode: '',
        yearsAtAddress: 0,
        monthsAtAddress: 0,
        residenceType: 'rent',
        monthlyPayment: 0
      },
      identification: {
        type: 'drivers_license',
        number: '',
        issueDate: '',
        expiryDate: '',
        issuingState: ''
      }
    },
    employment: {
      status: 'employed',
      employer: '',
      jobTitle: '',
      yearsEmployed: 0,
      monthsEmployed: 0,
      workPhone: '',
      annualIncome: 0,
      otherIncome: 0,
      otherIncomeSource: ''
    },
    financial: {
      monthlyRent: 0,
      monthlyMortgage: 0,
      existingCards: [],
      loans: [],
      totalMonthlyDebtPayments: 0,
      bankruptcy: false,
      bankruptcyDate: '',
      foreclosure: false,
      repossession: false
    },
    preferences: {
      cardType: 'basic',
      requestedCreditLimit: 5000,
      purposeOfCard: ['purchases'],
      balanceTransferAmount: 0
    },
    consent: {
      consentToCreditCheck: false
    }
  });

  const steps = [
    { number: 1, title: 'Personal Information', key: 'personal' },
    { number: 2, title: 'Employment', key: 'employment' },
    { number: 3, title: 'Financial Information', key: 'financial' },
    { number: 4, title: 'Card Preferences', key: 'preferences' },
    { number: 5, title: 'Review & Submit', key: 'consent' }
  ];

  const cardTypes = [
    { value: 'platinum', name: 'Platinum Card', minIncome: 75000, annualFee: 495 },
    { value: 'gold', name: 'Gold Card', minIncome: 50000, annualFee: 295 },
    { value: 'silver', name: 'Silver Card', minIncome: 35000, annualFee: 95 },
    { value: 'basic', name: 'Basic Card', minIncome: 20000, annualFee: 0 },
    { value: 'student', name: 'Student Card', minIncome: 0, annualFee: 0 }
  ];

  const handleInputChange = (step: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: {
        ...prev[step as keyof ApplicationData],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (step: string, parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: {
        ...prev[step as keyof ApplicationData],
        [parent]: {
          ...prev[step as keyof ApplicationData][parent],
          [field]: value
        }
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    setError('');
    
    switch(step) {
      case 1:
        if (!formData.personal.firstName || !formData.personal.lastName) {
          setError('Please enter your full name');
          return false;
        }
        if (!formData.personal.email) {
          setError('Please enter your email');
          return false;
        }
        if (!formData.personal.phone) {
          setError('Please enter your phone number');
          return false;
        }
        break;
      case 2:
        if (!formData.employment.status) {
          setError('Please select employment status');
          return false;
        }
        if (formData.employment.status === 'employed' && !formData.employment.employer) {
          setError('Please enter employer name');
          return false;
        }
        if (!formData.employment.annualIncome || formData.employment.annualIncome < 0) {
          setError('Please enter your annual income');
          return false;
        }
        break;
      case 5:
        if (!formData.consent.consentToCreditCheck) {
          setError('You must consent to a credit check to proceed');
          return false;
        }
        break;
    }
    
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/creditcard/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalInfo: formData.personal,
          employmentInfo: formData.employment,
          financialInfo: formData.financial,
          cardPreferences: formData.preferences,
          consentToCreditCheck: formData.consent.consentToCreditCheck
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      setSuccess('Application submitted successfully!');
      setApplicationNumber(result.data.applicationNumber);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/accounts/credit-cards');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '50px auto', 
        padding: '40px', 
        background: '#fff', 
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
        <h2 style={{ color: '#10b981', marginBottom: '10px' }}>Application Submitted!</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Your application number is: <strong>{applicationNumber}</strong>
        </p>
        <p style={{ color: '#666' }}>
          We'll review your application and get back to you within 1-2 business days.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '30px', color: '#1e293b' }}>Credit Card Application</h1>

      {/* Progress Steps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        {steps.map((step) => (
          <div key={step.number} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: currentStep >= step.number ? '#D4AF37' : '#e5e7eb',
              color: currentStep >= step.number ? '#fff' : '#9ca3af',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {step.number}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{step.title}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Step Content */}
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Personal Information</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              <input
                type="text"
                placeholder="First Name *"
                value={formData.personal.firstName}
                onChange={(e) => handleInputChange('personal', 'firstName', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
              <input
                type="text"
                placeholder="Last Name *"
                value={formData.personal.lastName}
                onChange={(e) => handleInputChange('personal', 'lastName', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.personal.email}
                onChange={(e) => handleInputChange('personal', 'email', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={formData.personal.phone}
                onChange={(e) => handleInputChange('personal', 'phone', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={formData.personal.dateOfBirth}
                onChange={(e) => handleInputChange('personal', 'dateOfBirth', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Employment */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Employment Information</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              <select
                value={formData.employment.status}
                onChange={(e) => handleInputChange('employment', 'status', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              >
                <option value="employed">Employed</option>
                <option value="self_employed">Self Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
              </select>
              
              {formData.employment.status === 'employed' && (
                <>
                  <input
                    type="text"
                    placeholder="Employer Name *"
                    value={formData.employment.employer}
                    onChange={(e) => handleInputChange('employment', 'employer', e.target.value)}
                    style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
                  />
                  <input
                    type="text"
                    placeholder="Job Title"
                    value={formData.employment.jobTitle}
                    onChange={(e) => handleInputChange('employment', 'jobTitle', e.target.value)}
                    style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
                  />
                </>
              )}
              
              <input
                type="number"
                placeholder="Annual Income *"
                value={formData.employment.annualIncome || ''}
                onChange={(e) => handleInputChange('employment', 'annualIncome', Number(e.target.value))}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Financial Information */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Financial Information</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              <input
                type="number"
                placeholder="Monthly Rent/Mortgage"
                value={formData.financial.monthlyRent || ''}
                onChange={(e) => handleInputChange('financial', 'monthlyRent', Number(e.target.value))}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
              <input
                type="number"
                placeholder="Total Monthly Debt Payments"
                value={formData.financial.totalMonthlyDebtPayments || ''}
                onChange={(e) => handleInputChange('financial', 'totalMonthlyDebtPayments', Number(e.target.value))}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px' }}>
                <input
                  type="checkbox"
                  checked={formData.financial.bankruptcy}
                  onChange={(e) => handleInputChange('financial', 'bankruptcy', e.target.checked)}
                />
                <span>Have you ever filed for bankruptcy?</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 4: Card Preferences */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Card Preferences</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              <select
                value={formData.preferences.cardType}
                onChange={(e) => handleInputChange('preferences', 'cardType', e.target.value)}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              >
                {cardTypes.map(card => (
                  <option key={card.value} value={card.value}>
                    {card.name} - Annual Fee: ${card.annualFee}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                placeholder="Requested Credit Limit"
                value={formData.preferences.requestedCreditLimit || ''}
                onChange={(e) => handleInputChange('preferences', 'requestedCreditLimit', Number(e.target.value))}
                style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Step 5: Review & Consent */}
        {currentStep === 5 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Review & Consent</h2>
            
            <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>Application Summary</h3>
              <p><strong>Name:</strong> {formData.personal.firstName} {formData.personal.lastName}</p>
              <p><strong>Email:</strong> {formData.personal.email}</p>
              <p><strong>Employment:</strong> {formData.employment.status}</p>
              <p><strong>Annual Income:</strong> ${formData.employment.annualIncome?.toLocaleString()}</p>
              <p><strong>Card Type:</strong> {cardTypes.find(c => c.value === formData.preferences.cardType)?.name}</p>
              <p><strong>Requested Limit:</strong> ${formData.preferences.requestedCreditLimit?.toLocaleString()}</p>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', background: '#fef3c7', borderRadius: '8px' }}>
              <input
                type="checkbox"
                checked={formData.consent.consentToCreditCheck}
                onChange={(e) => handleInputChange('consent', 'consentToCreditCheck', e.target.checked)}
                style={{ marginTop: '4px' }}
              />
              <span>
                <strong>I consent to a credit check</strong><br/>
                I authorize Horizon Bank to obtain my credit report and use it to evaluate my application.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          style={{
            padding: '12px 24px',
            background: currentStep === 1 ? '#e5e7eb' : '#fff',
            color: currentStep === 1 ? '#9ca3af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Back
        </button>

        {currentStep < 5 ? (
          <button
            onClick={handleNext}
            style={{
              padding: '12px 24px',
              background: '#D4AF37',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: loading ? '#9ca3af' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
}