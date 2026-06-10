// KYC state machine + gating helpers. Use canPerformAction() in money endpoints to
// gate features by KYC level (e.g. international wires require tier_3).

import connectDB from "./mongodb";
import KycCase, { KycLevel, KycStatus } from "@/models/KycCase";
import User from "@/models/User";
import { audit } from "./audit";
import { encrypt, searchHash } from "./crypto";
import { logger } from "./logger";

const ALLOWED_TRANSITIONS: Record<KycStatus, KycStatus[]> = {
  not_started: ["info_pending"],
  info_pending: ["documents_pending", "rejected"],
  documents_pending: ["in_review", "info_pending", "rejected"],
  in_review: ["approved", "rejected", "documents_pending"],
  approved: ["expired"],
  rejected: ["info_pending"],
  expired: ["info_pending"],
};

export function canTransition(from: KycStatus, to: KycStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export type GatedAction =
  | "view_account"
  | "internal_transfer"
  | "domestic_external_transfer"
  | "domestic_wire"
  | "international_wire"
  | "open_credit_card"
  | "open_investment";

const ACTION_MIN_LEVEL: Record<GatedAction, KycLevel> = {
  view_account: "tier_0",
  internal_transfer: "tier_1",
  domestic_external_transfer: "tier_2",
  domestic_wire: "tier_2",
  international_wire: "tier_3",
  open_credit_card: "tier_2",
  open_investment: "tier_2",
};

const LEVEL_RANK: Record<KycLevel, number> = {
  tier_0: 0,
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

export async function getOrCreateCase(userId: string) {
  await connectDB();
  let kyc = await KycCase.findOne({ userId }).sort({ createdAt: -1 });
  if (!kyc) {
    kyc = await KycCase.create({ userId, status: "not_started", level: "tier_0" });
  }
  if (kyc.expiresAt && kyc.expiresAt < new Date() && kyc.status === "approved") {
    kyc.status = "expired";
    kyc.level = "tier_0";
    await kyc.save();
  }
  return kyc;
}

export async function canPerformAction(userId: string, action: GatedAction): Promise<{ allowed: boolean; required: KycLevel; current: KycLevel; reason?: string }> {
  const kyc = await getOrCreateCase(userId);
  const required = ACTION_MIN_LEVEL[action];

  // The admin "verify account" toggle is the bank's operational identity check
  // and the only approval lever wired to a UI today (KYC cases can be submitted
  // but there is no admin approval surface yet). Treat a verified account
  // holder as fully KYC'd so gated rails remain usable; an explicit KYC case
  // level still takes precedence when it is higher.
  const user: { verified?: boolean } | null = await User.findById(userId).select("verified").lean();
  const verifiedLevel: KycLevel = user?.verified ? "tier_3" : "tier_0";
  const effective: KycLevel =
    LEVEL_RANK[kyc.level] >= LEVEL_RANK[verifiedLevel] ? kyc.level : verifiedLevel;

  const allowed = LEVEL_RANK[effective] >= LEVEL_RANK[required];
  return {
    allowed,
    required,
    current: effective,
    reason: allowed
      ? undefined
      : `This transfer requires identity verification (KYC ${required}; your level is ${effective}). Complete verification on the KYC page or contact support to have your account verified.`,
  };
}

// Submit basic identity. Encrypts PII before persisting and moves the case to
// `documents_pending` if minimum fields are present.
export async function submitIdentity(userId: string, input: {
  fullName: string;
  dob: string; // ISO yyyy-mm-dd
  nationality: string;
  countryOfResidence: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  idDocumentType: "passport" | "drivers_license" | "national_id" | "residence_permit";
  idIssuingCountry: string;
  idNumber: string;
  idExpiry: string;
  isPep?: boolean;
  sourceOfFunds?: string;
  expectedMonthlyVolume?: number;
}) {
  const kyc = await getOrCreateCase(userId);
  if (!canTransition(kyc.status, "info_pending") && kyc.status !== "info_pending" && kyc.status !== "documents_pending") {
    throw Object.assign(new Error(`Cannot submit identity from status ${kyc.status}`), { statusCode: 409 });
  }

  const fullNameEnc = encrypt(input.fullName, { searchable: false }).ciphertext;
  const dobEnc = encrypt(input.dob).ciphertext;
  const idEnc = encrypt(input.idNumber, { searchable: true });

  kyc.fullNameEnc = fullNameEnc;
  kyc.dobEnc = dobEnc;
  kyc.idNumberEnc = idEnc.ciphertext;
  kyc.idNumberSearchHash = idEnc.searchHash;
  kyc.idDocumentType = input.idDocumentType;
  kyc.idIssuingCountry = input.idIssuingCountry.toUpperCase();
  kyc.idExpiry = new Date(input.idExpiry);
  kyc.nationality = input.nationality.toUpperCase();
  kyc.addressLine1Enc = encrypt(input.addressLine1).ciphertext;
  kyc.city = input.city;
  kyc.postalCode = input.postalCode;
  kyc.countryOfResidence = input.countryOfResidence.toUpperCase();
  kyc.isPep = !!input.isPep;
  kyc.sourceOfFunds = input.sourceOfFunds;
  kyc.expectedMonthlyVolume = input.expectedMonthlyVolume;
  kyc.submittedAt = new Date();
  kyc.status = kyc.documents.length > 0 ? "in_review" : "documents_pending";
  await kyc.save();

  logger.info("kyc.identity_submitted", { userId, caseId: kyc._id.toString(), nationality: kyc.nationality });
  return kyc;
}

// Admin approval: moves case to `approved` and bumps user level to the tier matching docs supplied.
export async function approve(opts: {
  caseId: string;
  reviewerId: string;
  level: KycLevel;
  expiresAt?: Date;
  reviewerEmail?: string;
}) {
  const kyc = await KycCase.findById(opts.caseId);
  if (!kyc) throw Object.assign(new Error("KYC case not found"), { statusCode: 404 });
  if (!canTransition(kyc.status, "approved")) {
    throw Object.assign(new Error(`Cannot approve from ${kyc.status}`), { statusCode: 409 });
  }
  kyc.status = "approved";
  kyc.level = opts.level;
  kyc.reviewerId = opts.reviewerId as any;
  kyc.reviewedAt = new Date();
  kyc.approvedAt = new Date();
  kyc.expiresAt = opts.expiresAt || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2y default
  await kyc.save();

  await audit({
    action: "admin.user_verified",
    actorId: opts.reviewerId,
    actorEmail: opts.reviewerEmail,
    targetUserId: kyc.userId.toString(),
    outcome: "success",
    severity: "info",
    resourceId: kyc._id.toString(),
    details: { level: opts.level, expiresAt: kyc.expiresAt },
  });

  return kyc;
}

export async function reject(opts: {
  caseId: string;
  reviewerId: string;
  reason: string;
  reviewerEmail?: string;
}) {
  const kyc = await KycCase.findById(opts.caseId);
  if (!kyc) throw Object.assign(new Error("KYC case not found"), { statusCode: 404 });
  if (!canTransition(kyc.status, "rejected")) {
    throw Object.assign(new Error(`Cannot reject from ${kyc.status}`), { statusCode: 409 });
  }
  kyc.status = "rejected";
  kyc.level = "tier_0";
  kyc.reviewerId = opts.reviewerId as any;
  kyc.reviewedAt = new Date();
  kyc.rejectionReason = opts.reason;
  await kyc.save();

  await audit({
    action: "admin.user_verified",
    actorId: opts.reviewerId,
    actorEmail: opts.reviewerEmail,
    targetUserId: kyc.userId.toString(),
    outcome: "blocked",
    severity: "warning",
    resourceId: kyc._id.toString(),
    details: { rejectionReason: opts.reason },
  });
  return kyc;
}
