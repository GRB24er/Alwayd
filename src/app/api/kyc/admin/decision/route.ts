// Admin KYC decision endpoint. Approves or rejects a case and updates the user's tier.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import { approve, reject } from "@/lib/kyc";
import { v, validate } from "@/lib/validators";

interface DecisionInput {
  caseId: string;
  decision: "approve" | "reject";
  level?: "tier_1" | "tier_2" | "tier_3";
  reason?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<DecisionInput>(body, {
    caseId: v.string({ min: 1, max: 100 }),
    decision: v.enum(["approve", "reject"] as const),
    level: v.optional(v.enum(["tier_1", "tier_2", "tier_3"] as const)),
    reason: v.optional(v.string({ max: 1000 })),
  });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  await connectDB();

  try {
    if (parsed.value.decision === "approve") {
      if (!parsed.value.level) {
        return NextResponse.json({ error: "level required when approving" }, { status: 400 });
      }
      const kyc = await approve({
        caseId: parsed.value.caseId,
        reviewerId: session.user.id || "admin",
        reviewerEmail: session.user.email || undefined,
        level: parsed.value.level,
      });
      return NextResponse.json({
        success: true,
        case: {
          id: kyc._id.toString(),
          status: kyc.status,
          level: kyc.level,
          approvedAt: kyc.approvedAt,
          expiresAt: kyc.expiresAt,
        },
      });
    } else {
      if (!parsed.value.reason) {
        return NextResponse.json({ error: "reason required when rejecting" }, { status: 400 });
      }
      const kyc = await reject({
        caseId: parsed.value.caseId,
        reviewerId: session.user.id || "admin",
        reviewerEmail: session.user.email || undefined,
        reason: parsed.value.reason,
      });
      return NextResponse.json({
        success: true,
        case: {
          id: kyc._id.toString(),
          status: kyc.status,
          level: kyc.level,
          rejectionReason: kyc.rejectionReason,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "KYC decision failed" }, { status: err.statusCode || 500 });
  }
}
