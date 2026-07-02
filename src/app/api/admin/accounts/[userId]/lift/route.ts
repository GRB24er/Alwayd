// Admin endpoint to lift an active restriction. Requires the restriction
// reference + a justification note that gets written to the audit log.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import AccountRestriction from "@/models/AccountRestriction";
import { liftRestriction } from "@/lib/accountStatus";
import { v, validate } from "@/lib/validators";
import { sendSimpleEmail } from "@/lib/mail";
import { logger } from "@/lib/logger";

interface LiftBody {
  referenceNumber: string;
  liftReason: string;
  notifyCustomer?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const log = logger.child({ route: "admin/accounts/lift" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate<LiftBody>(body, {
    referenceNumber: v.string({ min: 5, max: 50 }),
    liftReason: v.string({ min: 10, max: 2000 }),
    notifyCustomer: v.optional(v.bool()),
  });
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  await connectDB();

  const restriction = await AccountRestriction.findOne({
    referenceNumber: parsed.value.referenceNumber,
    userId,
  });
  if (!restriction) {
    return NextResponse.json({ error: "Restriction not found for this user" }, { status: 404 });
  }

  try {
    const lifted = await liftRestriction({
      restrictionId: restriction._id.toString(),
      liftedById: session.user.id || "admin",
      liftedByEmail: session.user.email || "compliance@aldwychcapital.com",
      liftReason: parsed.value.liftReason,
    });

    if (parsed.value.notifyCustomer !== false) {
      const user = await User.findById(userId);
      if (user) {
        try {
          await sendSimpleEmail(
            user.email,
            `Account Restriction Lifted — ${lifted.referenceNumber}`,
            `The restriction on your account (reference ${lifted.referenceNumber}) has been lifted on ${lifted.liftedAt?.toISOString()}.\n\nReason: ${parsed.value.liftReason}\n\nYour account access has been restored.`,
            `<p>The restriction on your account (reference <strong>${lifted.referenceNumber}</strong>) has been lifted.</p><p>Your account access has been restored.</p>`
          );
        } catch (err: any) {
          log.warn("lift.email_failed", { ref: lifted.referenceNumber, err: err?.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      restriction: {
        id: lifted._id.toString(),
        referenceNumber: lifted.referenceNumber,
        status: lifted.status,
        liftedAt: lifted.liftedAt,
        liftedByEmail: lifted.liftedByEmail,
        liftReason: lifted.liftReason,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lift failed" }, { status: err.statusCode || 500 });
  }
}
