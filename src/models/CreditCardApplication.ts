// src/models/CreditCardApplication.ts
import mongoose from 'mongoose';

const creditCardApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicationNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Personal Information
  personalInfo: {
    firstName: String,
    lastName: String,
    middleName: String,
    dateOfBirth: Date,
    ssn: String,
    mothersMaidenName: String,
    email: String,
    phone: String,
    alternatePhone: String,
    currentAddress: {
      street: String,
      apartment: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
      yearsAtAddress: Number,
      monthsAtAddress: Number,
      residenceType: {
        type: String,
        enum: ['own', 'rent', 'live_with_parents', 'other']
      },
      monthlyPayment: Number
    },
    identification: {
      type: { type: String, enum: ['passport', 'drivers_license', 'state_id'] },
      number: String,
      issueDate: Date,
      expiryDate: Date,
      issuingState: String
    }
  },
  
  // Employment Information
  employmentInfo: {
    status: {
      type: String,
      enum: ['employed', 'self_employed', 'unemployed', 'student', 'retired'],
      required: true
    },
    employer: String,
    jobTitle: String,
    yearsEmployed: Number,
    monthsEmployed: Number,
    workPhone: String,
    annualIncome: Number,
    otherIncome: Number,
    otherIncomeSource: String
  },
  
  // Financial Information
  financialInfo: {
    monthlyRent: Number,
    monthlyMortgage: Number,
    existingCards: [{
      issuer: String,
      creditLimit: Number,
      currentBalance: Number
    }],
    loans: [{
      type: { type: String, enum: ['auto', 'student', 'personal', 'mortgage', 'other'] },
      lender: String,
      balance: Number,
      monthlyPayment: Number
    }],
    totalMonthlyDebtPayments: Number,
    bankruptcy: Boolean,
    bankruptcyDate: Date,
    foreclosure: Boolean,
    foreclosureDate: Date,
    repossession: Boolean,
    repossessionDate: Date
  },
  
  // Card Preferences
  cardPreferences: {
    cardType: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'basic', 'student', 'secured', 'business'],
      default: 'basic'
    },
    requestedCreditLimit: Number,
    purposeOfCard: [String],
    balanceTransferAmount: Number
  },
  
  // Application Status
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'documents_pending',
      'under_review',
      'credit_check_pending',
      'credit_check_completed',
      'manual_review',
      'approved',
      'declined',
      'withdrawn',
      'expired'
    ],
    default: 'draft'
  },
  
  // Workflow
  workflow: {
    submittedAt: Date,
    lastUpdatedAt: Date,
    assignedTo: String,
    assignedAt: Date,
    
    decision: {
      type: { type: String, enum: ['approved', 'declined'] },
      madeBy: String,
      madeAt: Date,
      reason: String,
      conditions: [String]
    },
    
    approval: {
      creditLimit: Number,
      interestRate: Number,
      annualFee: Number,
      issuer: { type: String, default: 'Visa' },
      
      cardDetails: {
        cardType: String,
        cardNumber: String,
        expiryDate: Date,
        cvv: String,
        pin: String,
        activatedAt: Date,
        isActive: { type: Boolean, default: false }
      },
      
      termsAccepted: Boolean,
      termsAcceptedAt: Date,
      cardShipped: Boolean,
      cardShippedAt: Date,
      cardDelivered: Boolean,
      cardDeliveredAt: Date
    }
  },
  
  // Compliance
  compliance: {
    consentToCreditCheck: Boolean,
    consentDate: Date,
    ipAddress: String,
    userAgent: String
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// FIX: Check if model exists before creating
const CreditCardApplication = mongoose.models.CreditCardApplication || 
  mongoose.model('CreditCardApplication', creditCardApplicationSchema);

export default CreditCardApplication;