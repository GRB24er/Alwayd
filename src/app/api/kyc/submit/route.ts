// KYC identity submission. Encrypts PII before persisting and runs the submitter's
// identity through sanctions screening as part of the case record.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import KycCase from "@/models/KycCase";
import { submitIdentity } from "@/lib/kyc";
import { screen } from "@/lib/sanctions";
import { audit } from "@/lib/audit";
import { v, validate } from "@/lib/validators";
import { lookupCountry } from "@/lib/countries";

interface KycSubmitInput {
  fullName: string;
  dob: string;
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
  expectedMonthlyVolume?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<KycSubmitInput>(body, {
    fullName: v.string({ min: 2, max: 200 }),
    dob: v.string({ pattern: /^\d{4}-\d{2}-\d{2}$/ }),
    nationality: v.countryCode(),
    countryOfResidence: v.countryCode(),
    addressLine1: v.string({ min: 3, max: 500 }),
    city: v.string({ min: 1, max: 200 }),
    postalCode: v.string({ min: 1, max: 30 }),
    idDocumentType: v.enum(["passport", "drivers_license", "national_id", "residence_permit"] as const),
    idIssuingCountry: v.countryCode(),
    idNumber: v.string({ min: 3, max: 60 }),
    idExpiry: v.string({ pattern: /^\d{4}-\d{2}-\d{2}$/ }),
    isPep: v.optional(v.bool()),
    sourceOfFunds: v.optional(v.string({ max: 500 })),
    expectedMonthlyVolume: v.optional(v.amountString()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
  }

  // Sanity checks the validator can't easily express.
  const birth = new Date(parsed.value.dob);
  const ageYears = (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 18) {
    return NextResponse.json({ success: false, error: "Applicant must be 18 or older" }, { status: 422 });
  }
  if (new Date(parsed.value.idExpiry) < new Date()) {
    return NextResponse.json({ success: false, error: "ID document has expired" }, { status: 422 });
  }
  if (!lookupCountry(parsed.value.nationality)) {
    return NextResponse.json({ success: false, error: "Unknown nationality" }, { status: 422 });
  }
  if (!lookupCountry(parsed.value.countryOfResidence)) {
    return NextResponse.json({ success: false, error: "Unknown country of residence" }, { status: 422 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  // Sanctions screen on the submitter — record matches on the case.
  const screening = screen({
    fullName: parsed.value.fullName,
    countryCode: parsed.value.countryOfResidence,
  });
  const isSanctioned = screening.blocking;

  const kyc = await submitIdentity(user._id.toString(), {
    ...parsed.value,
    expectedMonthlyVolume: parsed.value.expectedMonthlyVolume
      ? Number(parsed.value.expectedMonthlyVolume)
      : undefined,
  });

  if (isSanctioned) {
    kyc.isSanctioned = true;
    await kyc.save();
  }

  await audit({
    action: "user.profile_update",
    actorId: user._id.toString(),
    actorEmail: user.email,
    outcome: "success",
    request,
    resourceId: kyc._id.toString(),
    details: {
      kycStatus: kyc.status,
      isSanctioned,
      isPep: kyc.isPep,
      nationality: kyc.nationality,
      countryOfResidence: kyc.countryOfResidence,
    },
  });

  return NextResponse.json({
    success: true,
    case: {
      id: kyc._id.toString(),
      status: kyc.status,
      level: kyc.level,
      isPep: kyc.isPep,
      isSanctioned: kyc.isSanctioned,
      submittedAt: kyc.submittedAt,
    },
    sanctionsWarnings: screening.matches.filter((m) => m.severity !== "critical"),
  });
}

export async function GET(request: NextRequest) {
  void request;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const kyc = await KycCase.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!kyc) {
    return NextResponse.json({
      success: true,
      case: { status: "not_started", level: "tier_0" },
    });
  }
  return NextResponse.json({
    success: true,
    case: {
      id: kyc._id.toString(),
      status: kyc.status,
      level: kyc.level,
      isPep: kyc.isPep,
      isSanctioned: kyc.isSanctioned,
      nationality: kyc.nationality,
      countryOfResidence: kyc.countryOfResidence,
      submittedAt: kyc.submittedAt,
      approvedAt: kyc.approvedAt,
      expiresAt: kyc.expiresAt,
      rejectionReason: kyc.rejectionReason,
      documents: kyc.documents.map((d) => ({ type: d.type, uploadedAt: d.uploadedAt })),
    },
  });
}
