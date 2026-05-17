// Admin listing of restrictions across all users. Supports filtering by status,
// action, and userId, and pagination.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AccountRestriction from "@/models/AccountRestriction";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "50", 10));
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
  const status = searchParams.get("status");
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");

  const query: any = {};
  if (status) query.status = status;
  if (action) query.action = action;
  if (userId) query.userId = userId;

  const [rows, total] = await Promise.all([
    AccountRestriction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AccountRestriction.countDocuments(query),
  ]);

  // Bulk-load user info for the rows so the UI doesn't need to fan out.
  const userIds = [...new Set(rows.map((r: any) => r.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } })
    .select({ name: 1, email: 1, accountNumber: 1, accountStatus: 1 })
    .lean();
  const userMap = new Map<string, any>(users.map((u: any) => [u._id.toString(), u]));

  return NextResponse.json({
    success: true,
    total,
    limit,
    skip,
    restrictions: rows.map((r: any) => {
      const u = userMap.get(r.userId.toString());
      return {
        id: r._id.toString(),
        referenceNumber: r.referenceNumber,
        action: r.action,
        status: r.status,
        reasonCategory: r.reasonCategory,
        reasonNote: r.internalOnly ? "[restricted]" : r.reasonNote,
        legalBasis: r.legalBasis,
        affectedAccounts: r.affectedAccounts,
        effectiveFrom: r.effectiveFrom,
        effectiveUntil: r.effectiveUntil,
        issuedByName: r.issuedByName,
        issuedByEmail: r.issuedByEmail,
        customerNotifiedAt: r.customerNotifiedAt,
        liftedAt: r.liftedAt,
        liftReason: r.liftReason,
        createdAt: r.createdAt,
        documentUrl: `/api/admin/restrictions/${r.referenceNumber}/document`,
        user: u
          ? {
              id: r.userId.toString(),
              name: u.name,
              email: u.email,
              accountNumber: u.accountNumber,
              accountStatus: u.accountStatus,
            }
          : { id: r.userId.toString(), name: "(deleted user)" },
      };
    }),
  });
}
