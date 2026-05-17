// Immutable record of an account restriction (freeze, block, closure) and any
// subsequent lift. Each `restrict` action creates a new document; lifting an
// active restriction sets `status = lifted` but never mutates the original
// reason / issuer / document reference, so the audit trail is preserved.
//
// The model is queried two ways:
//   - by userId for the user's current effective status (latest active row)
//   - by referenceNumber when serving the PDF notice

import mongoose, { Document, Model, Schema } from "mongoose";

export type RestrictionAction =
  | "freeze"      // Customer can VIEW but cannot transact. Reversible.
  | "block"       // Customer cannot view or transact. Stronger than freeze.
  | "close";      // Account permanently closed. Terminal.

export type RestrictionStatus = "active" | "lifted" | "superseded";

// Reason categories follow common AML / banking-supervision taxonomies.
// Free-form `reasonNote` always accompanies the category.
export type RestrictionReasonCategory =
  | "aml_review"               // Routine AML investigation
  | "suspected_fraud"          // Card / wire / login fraud suspected
  | "unusual_activity"         // Velocity / pattern anomalies
  | "court_order"              // Judicial garnishment / freeze order
  | "regulatory_request"       // Govt. / regulator request (FinCEN, OFAC etc.)
  | "sanctions_screening_hit"  // Sanctions match on customer or counterparty
  | "kyc_lapsed"               // Verification expired or insufficient
  | "kyc_failed"               // Customer failed verification
  | "customer_request"         // Customer asked us to freeze
  | "chargeback_dispute"       // Active dispute pending resolution
  | "deceased"                 // Estate processing
  | "operational_error"        // Internal data / posting issue
  | "other";

export type AffectedAccount = "checking" | "savings" | "investment" | "all";

export interface IAccountRestriction extends Document {
  userId: mongoose.Types.ObjectId;
  // Immutable per-restriction reference, e.g. "FRZ-202605-A3F7B2"
  referenceNumber: string;

  action: RestrictionAction;
  status: RestrictionStatus;

  reasonCategory: RestrictionReasonCategory;
  reasonNote: string;
  legalBasis?: string;
  affectedAccounts: AffectedAccount[];

  effectiveFrom: Date;
  effectiveUntil?: Date | null;

  // Issuer (admin who authorised the restriction)
  issuedById: mongoose.Types.ObjectId;
  issuedByEmail: string;
  issuedByName: string;
  issuedByTitle?: string;

  // Internal-only flag: hides the customer-facing portion (e.g. court order
  // gag rule) — but the document is still generated for regulators / internal.
  internalOnly: boolean;

  // Customer interactions
  customerNotifiedAt?: Date;
  customerNotificationFailureReason?: string;

  // Lift (only set when status === 'lifted')
  liftedAt?: Date | null;
  liftedById?: mongoose.Types.ObjectId | null;
  liftedByEmail?: string;
  liftReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AccountRestrictionSchema = new Schema<IAccountRestriction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referenceNumber: { type: String, required: true, unique: true, index: true },

    action: {
      type: String,
      enum: ["freeze", "block", "close"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "lifted", "superseded"],
      default: "active",
      index: true,
    },

    reasonCategory: {
      type: String,
      enum: [
        "aml_review",
        "suspected_fraud",
        "unusual_activity",
        "court_order",
        "regulatory_request",
        "sanctions_screening_hit",
        "kyc_lapsed",
        "kyc_failed",
        "customer_request",
        "chargeback_dispute",
        "deceased",
        "operational_error",
        "other",
      ],
      required: true,
    },
    reasonNote: { type: String, required: true, maxlength: 4000 },
    legalBasis: { type: String, maxlength: 1000 },
    affectedAccounts: {
      type: [String],
      enum: ["checking", "savings", "investment", "all"],
      default: ["all"],
    },

    effectiveFrom: { type: Date, required: true, default: Date.now, index: true },
    effectiveUntil: { type: Date, default: null },

    issuedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issuedByEmail: { type: String, required: true },
    issuedByName: { type: String, required: true },
    issuedByTitle: { type: String },

    internalOnly: { type: Boolean, default: false },

    customerNotifiedAt: { type: Date },
    customerNotificationFailureReason: { type: String },

    liftedAt: { type: Date, default: null },
    liftedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    liftedByEmail: { type: String },
    liftReason: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

AccountRestrictionSchema.index({ userId: 1, status: 1, action: 1 });
AccountRestrictionSchema.index({ userId: 1, createdAt: -1 });

// Hard-block destructive mutations once a restriction exists; lifts go through
// the dedicated lift() helper which sets fields once.
AccountRestrictionSchema.pre("deleteOne", function () {
  throw new Error("AccountRestriction is immutable; lift the restriction instead");
});
AccountRestrictionSchema.pre("deleteMany", function () {
  throw new Error("AccountRestriction is immutable; lift the restriction instead");
});

const AccountRestriction: Model<IAccountRestriction> =
  mongoose.models.AccountRestriction ||
  mongoose.model<IAccountRestriction>("AccountRestriction", AccountRestrictionSchema);

export default AccountRestriction;

// Display labels for the document + UI. Kept here so the model is the single
// source of truth for the taxonomy.
export const REASON_LABELS: Record<RestrictionReasonCategory, string> = {
  aml_review: "Anti-Money-Laundering Review",
  suspected_fraud: "Suspected Fraudulent Activity",
  unusual_activity: "Unusual Account Activity",
  court_order: "Court Order / Legal Process",
  regulatory_request: "Regulatory Authority Request",
  sanctions_screening_hit: "Sanctions Screening Match",
  kyc_lapsed: "KYC Verification Lapsed",
  kyc_failed: "KYC Verification Failure",
  customer_request: "Customer-Initiated Hold",
  chargeback_dispute: "Active Chargeback / Dispute",
  deceased: "Deceased Account Holder — Estate Processing",
  operational_error: "Operational Review",
  other: "Other (see notice)",
};

export const ACTION_LABELS: Record<RestrictionAction, string> = {
  freeze: "Account Freeze",
  block: "Account Block",
  close: "Account Closure",
};
