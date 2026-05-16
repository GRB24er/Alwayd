// Know-Your-Customer case. One per user (latest active), with a state machine that
// drives whether the customer can transact at higher limits, perform international
// wires, or open new products.
//
// PII fields (full name, DOB, ID numbers, address) are stored as opaque ciphertext
// strings (see lib/crypto). Mongoose only sees a string; the app encrypts before
// write and decrypts on demand at the boundary where the value is needed.

import mongoose, { Document, Model, Schema } from "mongoose";

export type KycStatus =
  | "not_started"
  | "info_pending"       // basic identity submitted, awaiting documents
  | "documents_pending"  // documents uploaded, awaiting review
  | "in_review"          // assigned to a reviewer
  | "approved"
  | "rejected"
  | "expired";           // approval older than retention window; refresh required

export type KycLevel =
  | "tier_0" // unverified — view-only
  | "tier_1" // basic — small in-bank transfers
  | "tier_2" // verified ID — domestic external transfers, debit cards
  | "tier_3"; // enhanced due diligence — wires, international, large balances

export type IdDocumentType = "passport" | "drivers_license" | "national_id" | "residence_permit";

export interface IKycDocument {
  type: "id_front" | "id_back" | "selfie" | "proof_of_address" | "source_of_funds";
  storageKey: string; // path/key in object storage; NOT a public URL
  uploadedAt: Date;
  reviewerNote?: string;
}

export interface IKycCase extends Document {
  userId: mongoose.Types.ObjectId;
  status: KycStatus;
  level: KycLevel;

  // PII (encrypted)
  fullNameEnc?: string;
  dobEnc?: string;
  idNumberEnc?: string;
  idNumberSearchHash?: string;
  idDocumentType?: IdDocumentType;
  idIssuingCountry?: string;
  idExpiry?: Date;
  nationality?: string;

  // Address (encrypted)
  addressLine1Enc?: string;
  addressLine2Enc?: string;
  city?: string;
  postalCode?: string;
  countryOfResidence?: string;

  // Risk attributes
  isPep: boolean;        // Politically Exposed Person — requires senior approval
  isSanctioned: boolean; // Hit on sanctions list at submission
  sourceOfFunds?: string;
  expectedMonthlyVolume?: number;

  // Workflow
  submittedAt?: Date;
  reviewerId?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date; // typically approvedAt + 2 years; UI nudges to renew before this

  // Documents
  documents: IKycDocument[];

  createdAt: Date;
  updatedAt: Date;
}

const KycDocumentSchema = new Schema<IKycDocument>(
  {
    type: { type: String, enum: ["id_front", "id_back", "selfie", "proof_of_address", "source_of_funds"], required: true },
    storageKey: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    reviewerNote: { type: String },
  },
  { _id: false }
);

const KycCaseSchema = new Schema<IKycCase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["not_started", "info_pending", "documents_pending", "in_review", "approved", "rejected", "expired"],
      default: "not_started",
      index: true,
    },
    level: {
      type: String,
      enum: ["tier_0", "tier_1", "tier_2", "tier_3"],
      default: "tier_0",
      index: true,
    },

    fullNameEnc: { type: String },
    dobEnc: { type: String },
    idNumberEnc: { type: String },
    idNumberSearchHash: { type: String, index: true, sparse: true },
    idDocumentType: { type: String, enum: ["passport", "drivers_license", "national_id", "residence_permit"] },
    idIssuingCountry: { type: String },
    idExpiry: { type: Date },
    nationality: { type: String, index: true },

    addressLine1Enc: { type: String },
    addressLine2Enc: { type: String },
    city: { type: String },
    postalCode: { type: String },
    countryOfResidence: { type: String, index: true },

    isPep: { type: Boolean, default: false, index: true },
    isSanctioned: { type: Boolean, default: false, index: true },
    sourceOfFunds: { type: String },
    expectedMonthlyVolume: { type: Number },

    submittedAt: { type: Date },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    expiresAt: { type: Date, index: true },

    documents: { type: [KycDocumentSchema], default: [] },
  },
  { timestamps: true }
);

KycCaseSchema.index({ userId: 1, status: 1 });

const KycCase: Model<IKycCase> = mongoose.models.KycCase || mongoose.model<IKycCase>("KycCase", KycCaseSchema);
export default KycCase;
