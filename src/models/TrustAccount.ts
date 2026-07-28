// src/models/TrustAccount.ts
// Aldwych European Capital — Inheritance / Testamentary Trust Model
//
// Models the arrangement a private-banking client (the SETTLOR) sets up when
// they want to "leave money" to someone (the BENEFICIARY) that is only handed
// over once the beneficiary reaches a certain age or a certain date — e.g.
// "hold £250,000 for my daughter and release it to her when she turns 25", or
// in staged tranches ("a third at 21, a third at 25, the rest at 30").
//
// While the trust is running the bank acts as TRUSTEE and ring-fences the
// principal (it is debited from the settlor's account at funding time and held
// against the trust). When a distribution's trigger is reached the maturity
// engine (src/lib/trustEngine.ts) releases that tranche to the beneficiary.
//
// The distribution schedule is the machine-readable form of the trust deed:
// each tranche carries its own trigger (an age applied to the beneficiary's
// date of birth, or an explicit calendar date) and a share of the principal.

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type TrustStatus =
  | 'pending'      // Created & funded, awaiting trustee acceptance / activation
  | 'active'       // Funded and holding; no tranche released yet
  | 'distributing' // At least one tranche released, more still scheduled
  | 'completed'    // All tranches released
  | 'cancelled';   // Revoked (revocable trusts only); principal returned

// How a single distribution tranche is triggered.
export type TriggerType =
  | 'age'   // Beneficiary reaches `triggerAge` (computed from date of birth)
  | 'date'; // A fixed calendar date is reached

export type DistributionStatus = 'scheduled' | 'released' | 'skipped';

export type AccountBucket = 'checking' | 'savings' | 'investment';

// A single scheduled hand-over of part (or all) of the principal.
export interface ITrustDistribution {
  label: string;                    // e.g. "On 25th birthday" / "First tranche"
  triggerType: TriggerType;
  triggerAge?: number;              // required when triggerType === 'age'
  triggerDate?: Date;               // resolved/explicit date the tranche vests
  percentage: number;               // share of principal, 0–100
  status: DistributionStatus;
  releasedAmount?: number;
  releasedAt?: Date;
  releaseReference?: string;        // Transaction reference for the payout
  note?: string;
}

export interface ITrustAccount extends Document {
  referenceNumber: string;

  // ----- Settlor (the person leaving the money) -----
  settlorUserId: Types.ObjectId;
  settlorName: string;
  settlorEmail: string;

  // ----- Beneficiary (who eventually receives it) -----
  beneficiaryName: string;
  beneficiaryDateOfBirth: Date;
  beneficiaryRelationship?: string; // e.g. "Daughter", "Grandson", "Nephew"
  beneficiaryEmail?: string;
  // Set when the beneficiary email matches an existing customer, so the
  // engine can credit their account directly on distribution.
  beneficiaryUserId?: Types.ObjectId | null;

  // ----- Trust terms -----
  trustName: string;                // Friendly label, e.g. "Emma's Education Trust"
  currency: string;                 // 'USD'
  principalAmount: number;          // Amount placed into trust at funding
  fundingAccount: AccountBucket;    // Settlor account the principal came from
  heldBalance: number;              // Principal not yet distributed
  revocable: boolean;               // If true, settlor may cancel & reclaim funds
  projectedGrowthRate?: number;     // Informational annual %, for projections only
  letterOfWishes?: string;          // Free-text guidance from the settlor

  distributions: ITrustDistribution[];

  // ----- Lifecycle -----
  status: TrustStatus;
  fundedAt?: Date;
  activatedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  fundingReference?: string;        // Transaction reference for the initial debit

  adminNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TrustDistributionSchema = new Schema<ITrustDistribution>(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    triggerType: { type: String, enum: ['age', 'date'], required: true },
    triggerAge: { type: Number, min: 0, max: 120 },
    triggerDate: { type: Date },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['scheduled', 'released', 'skipped'],
      default: 'scheduled',
    },
    releasedAmount: { type: Number },
    releasedAt: { type: Date },
    releaseReference: { type: String },
    note: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const TrustAccountSchema = new Schema<ITrustAccount>(
  {
    referenceNumber: { type: String, required: true, unique: true, index: true },

    settlorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    settlorName: { type: String, required: true },
    settlorEmail: { type: String, required: true },

    beneficiaryName: { type: String, required: true, trim: true, maxlength: 120 },
    beneficiaryDateOfBirth: { type: Date, required: true },
    beneficiaryRelationship: { type: String, trim: true, maxlength: 60 },
    beneficiaryEmail: { type: String, trim: true, lowercase: true },
    beneficiaryUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    trustName: { type: String, required: true, trim: true, maxlength: 120 },
    // Display currency for trust documents and UI. The underlying ledger
    // (Transaction rows) is denominated in the bank's base unit; this only
    // governs presentation. Defaults to the ledger's base unit (USD), matching
    // the account-wide displayCurrency default on User.
    currency: { type: String, default: 'USD' },
    principalAmount: { type: Number, required: true, min: 0 },
    fundingAccount: {
      type: String,
      enum: ['checking', 'savings', 'investment'],
      default: 'savings',
    },
    heldBalance: { type: Number, required: true, min: 0 },
    revocable: { type: Boolean, default: true },
    projectedGrowthRate: { type: Number, min: 0, max: 100 },
    letterOfWishes: { type: String, maxlength: 4000 },

    distributions: { type: [TrustDistributionSchema], default: [] },

    status: {
      type: String,
      enum: ['pending', 'active', 'distributing', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    fundedAt: { type: Date },
    activatedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 1000 },

    fundingReference: { type: String },

    adminNotes: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

TrustAccountSchema.index({ settlorUserId: 1, createdAt: -1 });
TrustAccountSchema.index({ status: 1, 'distributions.status': 1 });

const TrustAccount: Model<ITrustAccount> =
  (mongoose.models.TrustAccount as Model<ITrustAccount>) ||
  mongoose.model<ITrustAccount>('TrustAccount', TrustAccountSchema);

export default TrustAccount;

export const TRUST_STATUS_LABELS: Record<TrustStatus, string> = {
  pending: 'Pending Activation',
  active: 'Active — Holding',
  distributing: 'Distributing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
