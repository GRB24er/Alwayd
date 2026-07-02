// Streams the adjustment / reversal receipt PDF for a transaction. Generated
// on demand from the Transaction record + the user's current balance trail.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { generateAdjustmentDocument } from "@/lib/adjustmentDocument";
import { verificationUrlFor } from "@/lib/siteUrl";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  await connectDB();
  const tx = await Transaction.findById(id);
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  // Only adjustments and reversals get this receipt format.
  if (tx.origin !== "admin_adjustment" && tx.origin !== "reversal") {
    return NextResponse.json(
      { error: "This transaction does not have an adjustment receipt format. Try the standard transaction-detail endpoint." },
      { status: 400 }
    );
  }

  const user = await User.findById(tx.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const md = (tx.metadata || {}) as any;
  const isReversal = tx.origin === "reversal";
  const isCredit = String(tx.type).includes("credit");
  const kind = isReversal ? "reversal" : isCredit ? "adjustment_credit" : "adjustment_debit";

  // Best-effort balance read for the receipt. We can't reconstruct historical
  // balance-after on demand without a snapshot, so we use the current balance
  // (matches what was shown when the receipt was first issued).
  const accountType = (tx.accountType as "checking" | "savings" | "investment") || "checking";
  const balanceField =
    accountType === "savings" ? "savingsBalance" : accountType === "investment" ? "investmentBalance" : "checkingBalance";
  const balanceAfter = Number((user as any)[balanceField] || 0);
  const balanceBefore = isCredit ? balanceAfter - Number(tx.amount) : balanceAfter + Number(tx.amount);

  const bytes = await generateAdjustmentDocument({
    kind: kind as any,
    reference: tx.reference || tx._id.toString(),
    amount: Number(tx.amount),
    currency: tx.currency || "USD",
    accountType,
    balanceBefore,
    balanceAfter,
    reasonCategory: md.reasonCategory || (isReversal ? "Error Correction" : "Manual Adjustment"),
    reasonNote: md.reasonNote || md.reversalReason || tx.adminNotes || "",
    legalBasis: md.legalBasis,
    issuedAt: (tx.postedAt as Date) || (tx.createdAt as Date),
    issuedByName: md.issuedByName || tx.approvedBy || "Operations Officer",
    issuedByTitle: md.issuerTitle || "Operations Officer",
    reversedReference: md.originalReference,
    reversedAt: (tx.postedAt as Date) || (tx.createdAt as Date),
    reversedDescription: md.originalDescription,
    reversedOriginalDate: md.originalDate,
    customer: {
      name: user.name,
      email: user.email,
      accountNumber: user.accountNumber,
    },
    verificationUrl: verificationUrlFor(tx.reference),
  });

  return new NextResponse(bytes as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${tx.reference || tx._id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
