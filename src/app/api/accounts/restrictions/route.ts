// Customer-facing view of their own restrictions. Returns current account
// status, the active restriction (if any), and the history of past
// restrictions on the account.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import AccountRestriction from "@/models/AccountRestriction";
import { getActiveRestriction } from "@/lib/accountStatus";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const active = await getActiveRestriction(user._id.toString());
  const history = await AccountRestriction.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const sanitize = (r: any) => ({
    referenceNumber: r.referenceNumber,
    action: r.action,
    status: r.status,
    reasonCategory: r.reasonCategory,
    // Internal-only restrictions hide the verbose reason from the customer
    // but still show the category so they know who to contact about it.
    reasonNote: r.internalOnly ? "Account access is restricted. Please contact our compliance team." : r.reasonNote,
    affectedAccounts: r.affectedAccounts,
    effectiveFrom: r.effectiveFrom,
    effectiveUntil: r.effectiveUntil,
    issuedByName: r.issuedByName,
    issuedByTitle: r.issuedByTitle,
    createdAt: r.createdAt,
    liftedAt: r.liftedAt,
    liftReason: r.liftReason,
    documentUrl: `/api/accounts/restrictions/${r.referenceNumber}/document`,
  });

  return NextResponse.json({
    success: true,
    accountStatus: user.accountStatus || "active",
    active: active ? sanitize(active) : null,
    history: history.map(sanitize),
  });
}
