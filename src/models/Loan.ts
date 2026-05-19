// src/models/Loan.ts
// Aldwych European Capital - Loan Application Model

import mongoose, { Document, Schema, Types } from 'mongoose';

export type LoanType =
  | 'personal'
  | 'mortgage'
  | 'auto'
  | 'business'
  | 'student'
  | 'contractor'
  | 'sme'
  | 'trade'
  | 'equipment';

export type LoanStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'disbursed'
  | 'closed';

export interface ILoanMessage {
  from: 'client' | 'admin';
  message: string;
  sentAt: Date;
  read: boolean;
}

export interface ILoanDocument {
  key: string;
  name: string;
  size: string;
  url?: string;
  uploadedAt: Date;
}

export interface ILoanScheduleEntry {
  period: number;
  dueDate: Date;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  paid: boolean;
  paidAt?: Date;
}

export interface ILoan extends Document {
  userId: Types.ObjectId;
  referenceNumber: string;
  type: LoanType;
  amount: number;
  purpose: string;
  term: number;
  status: LoanStatus;

  // Applicant snapshot fields
  businessName?: string;
  businessType?: string;
  yearsInBusiness?: string;
  annualRevenue?: number;
  annualProfit?: number;
  existingDebt?: number;
  collateral?: string;
  collateralValue?: number;
  employmentStatus?: string;
  annualIncome?: number;
  creditScore?: string;

  // KYC
  kycData?: Record<string, unknown>;
  kycVerifiedAt?: Date;
  kycVerifiedBy?: Types.ObjectId;

  // Underwriting
  underwriterId?: Types.ObjectId;
  underwriterName?: string;
  riskBand?: 'low' | 'medium' | 'high';

  // Approval / offer fields
  interestRate?: number;
  monthlyPayment?: number;
  totalRepayable?: number;
  remainingBalance?: number;
  nextPaymentDate?: Date;
  offerExpiry?: Date;
  agreementSignedAt?: Date;
  agreementSignature?: string;
  agreementIp?: string;

  // Amortization
  schedule?: ILoanScheduleEntry[];

  // Disbursement
  disbursementBank?: string;
  disbursementAccount?: string;
  disbursementReference?: string;

  // Workflow timestamps
  applicationDate: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  disbursedAt?: Date;
  closedAt?: Date;

  adminNotes?: string;

  messages: ILoanMessage[];
  documents: ILoanDocument[];

  createdAt: Date;
  updatedAt: Date;
}

const LoanMessageSchema = new Schema<ILoanMessage>(
  {
    from: { type: String, enum: ['client', 'admin'], required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
  },
  { _id: false }
);

const LoanDocumentSchema = new Schema<ILoanDocument>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LoanScheduleEntrySchema = new Schema<ILoanScheduleEntry>(
  {
    period: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    payment: { type: Number, required: true },
    interest: { type: Number, required: true },
    principal: { type: Number, required: true },
    balance: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { _id: false }
);

const LoanSchema = new Schema<ILoan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referenceNumber: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['personal', 'mortgage', 'auto', 'business', 'student', 'contractor', 'sme', 'trade', 'equipment'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    purpose: { type: String, required: true, trim: true, maxlength: 2000 },
    term: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'active', 'disbursed', 'closed'],
      default: 'pending',
      index: true,
    },

    businessName: { type: String },
    businessType: { type: String },
    yearsInBusiness: { type: String },
    annualRevenue: { type: Number },
    annualProfit: { type: Number },
    existingDebt: { type: Number },
    collateral: { type: String },
    collateralValue: { type: Number },
    employmentStatus: { type: String },
    annualIncome: { type: Number },
    creditScore: { type: String },

    kycData: { type: Schema.Types.Mixed },
    kycVerifiedAt: { type: Date },
    kycVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    underwriterId: { type: Schema.Types.ObjectId, ref: 'User' },
    underwriterName: { type: String },
    riskBand: { type: String, enum: ['low', 'medium', 'high'] },

    interestRate: { type: Number },
    monthlyPayment: { type: Number },
    totalRepayable: { type: Number },
    remainingBalance: { type: Number },
    nextPaymentDate: { type: Date },
    offerExpiry: { type: Date },
    agreementSignedAt: { type: Date },
    agreementSignature: { type: String },
    agreementIp: { type: String },

    schedule: { type: [LoanScheduleEntrySchema], default: undefined },

    disbursementBank: { type: String },
    disbursementAccount: { type: String },
    disbursementReference: { type: String },

    applicationDate: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    disbursedAt: { type: Date },
    closedAt: { type: Date },

    adminNotes: { type: String },

    messages: { type: [LoanMessageSchema], default: [] },
    documents: { type: [LoanDocumentSchema], default: [] },
  },
  { timestamps: true }
);

LoanSchema.index({ userId: 1, applicationDate: -1 });
LoanSchema.index({ status: 1, applicationDate: -1 });

const Loan = (mongoose.models.Loan as mongoose.Model<ILoan>) || mongoose.model<ILoan>('Loan', LoanSchema);
export default Loan;
