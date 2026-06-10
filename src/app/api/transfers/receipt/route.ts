// Streams the official Funds Transfer Receipt PDF for one of the caller's own
// transfers. Available the moment an instruction is accepted (status pending —
// receipt stamps PROCESSING) and after settlement (stamps COMPLETED). Rejected
// instructions never get a receipt; they get a rejection notice via email.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import mongoose from "mongoose";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { audit } from "@/lib/audit";
import {
  generateTransferReceipt,
  TransferReceiptData,
  TransferReceiptParty,
} from "@/lib/transferReceipt";

const RECEIPT_TYPES = new Set(["transfer-in", "transfer-out"]);

// Shape of the Transaction document fields this route reads. The model's
// ambient declaration types the model itself as `any` (src/types/global.d.ts),
// so we pin down what we rely on here.
interface TransferTxDoc {
  _id: { toString(): string };
  userId: { toString(): string };
  type: string;
  status: string;
  origin?: string;
  amount?: number;
  amountMinor?: string;
  currency?: string;
  accountType?: string;
  reference?: string;
  description?: string;
  channel?: string;
  date?: Date;
  createdAt?: Date;
  postedAt?: Date | null;
  approvedAt?: Date | null;
  reviewedAt?: Date | null;
  metadata?: Record<string, unknown> & {
    wireType?: string;
    transferSpeed?: string;
    rail?: string;
    fee?: number;
    wireFee?: number;
    totalAmount?: number;
    fromAccount?: string;
    toAccount?: string;
    senderName?: string;
    senderBank?: string;
    senderCountry?: string;
    recipientName?: string;
    recipientAccountLast4?: string;
    recipientBank?: string;
    recipientRoutingNumber?: string;
    recipientRoutingLast4?: string;
    recipientSwiftBic?: string;
    recipientCountry?: string;
    recipientAddress?: string;
    purposeOfTransfer?: string;
    purpose?: string;
  };
}

function maskAccount(n?: string): string {
  if (!n) return "";
  return `••••${n.slice(-4)}`;
}

function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin
  );
}

// The rail and display name of the transfer, derived from how it was booked.
function describeTransfer(tx: TransferTxDoc): { kind: string; rail: string } {
  const md = tx.metadata || {};
  switch (tx.origin) {
    case "wire_transfer":
      return md.wireType === "international"
        ? { kind: "International Wire Transfer", rail: "SWIFT" }
        : { kind: "Domestic Wire Transfer", rail: "FEDWIRE" };
    case "external_transfer":
      return md.transferSpeed === "express"
        ? { kind: "External Transfer (Same-Day ACH)", rail: "ACH" }
        : { kind: "External Bank Transfer", rail: md.rail || "ACH" };
    case "internal_transfer":
      return { kind: "Internal Account Transfer", rail: "BOOK TRANSFER" };
    default:
      return { kind: "Funds Transfer", rail: md.rail || "BANK TRANSFER" };
  }
}

const ACCOUNT_LABEL: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  investment: "Investment",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference")?.trim();
    const id = searchParams.get("id")?.trim();
    if (!reference && !id) {
      return NextResponse.json(
        { success: false, error: "Provide a transaction reference or id" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Ownership is part of the query — a receipt can only ever be issued to
    // the account holder, regardless of what reference is supplied.
    let tx: TransferTxDoc | null = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      tx = await Transaction.findOne({ _id: id, userId: user._id });
    } else if (reference) {
      // Internal transfers expose the group reference; the debit leg is the
      // customer's copy of record.
      tx = await Transaction.findOne({
        userId: user._id,
        $or: [{ reference }, { reference: `${reference}-OUT` }],
      });
    }

    if (!tx) {
      return NextResponse.json({ success: false, error: "Transfer not found" }, { status: 404 });
    }
    if (!RECEIPT_TYPES.has(tx.type)) {
      return NextResponse.json(
        { success: false, error: "Receipts are only issued for funds transfers" },
        { status: 422 }
      );
    }
    if (tx.status === "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "This transfer was rejected and did not settle, so no receipt can be issued. Contact support for a rejection notice.",
        },
        { status: 409 }
      );
    }

    const md = tx.metadata || {};
    const settled = tx.status === "completed" || tx.status === "approved";
    const { kind, rail } = describeTransfer(tx);
    const isCredit = tx.type === "transfer-in";

    const amount = Number(tx.amount) || 0;
    const fee = Number(md.wireFee ?? md.fee ?? 0) || 0;
    const totalSettled = isCredit ? amount : Number(md.totalAmount ?? amount + fee);

    const initiatedAt = tx.date || tx.createdAt || new Date();
    const completedAt = tx.postedAt || tx.approvedAt || (settled ? tx.reviewedAt : null) || null;

    const accountType = tx.accountType || "checking";
    const holderParty = (acct: string): TransferReceiptParty => ({
      name: user.name,
      accountMasked: maskAccount(user.accountNumber),
      accountType: ACCOUNT_LABEL[acct] || acct || "—",
      bankName: "Aldwych European Capital",
    });

    let sender: TransferReceiptParty;
    let beneficiary: TransferReceiptParty;
    if (tx.origin === "internal_transfer") {
      // On the IN leg tx.accountType is the destination, so the source comes
      // from metadata; the OUT leg carries both and agrees with tx.accountType.
      sender = holderParty((md.fromAccount as string) || (isCredit ? "" : accountType));
      beneficiary = holderParty(isCredit ? accountType : (md.toAccount as string) || "");
    } else if (isCredit) {
      // Incoming funds: the account holder is the beneficiary; show whatever
      // the booking recorded about the remitter.
      sender = {
        name: (md.senderName as string) || md.recipientName || "External remitter",
        bankName: (md.senderBank as string) || md.recipientBank,
        country: (md.senderCountry as string) || md.recipientCountry,
      };
      beneficiary = holderParty(accountType);
    } else {
      sender = holderParty(accountType);
      beneficiary = {
        name: md.recipientName || "—",
        accountMasked: md.recipientAccountLast4 ? `••••${md.recipientAccountLast4}` : undefined,
        bankName: md.recipientBank,
        routingMasked: md.recipientRoutingNumber
          ? `••••${String(md.recipientRoutingNumber).slice(-4)}`
          : md.recipientRoutingLast4
            ? `••••${md.recipientRoutingLast4}`
            : undefined,
        swiftBic: md.recipientSwiftBic,
        country: md.recipientCountry,
        address: md.recipientAddress,
      };
    }

    const receiptNumber = `RCP-${tx.reference || tx._id.toString()}`;
    const generatedAt = new Date();

    // Digest over exactly what the receipt asserts, so a reprint after
    // settlement (different status/timestamps) carries a different digest.
    const integrityHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          receiptNumber,
          reference: tx.reference,
          userId: tx.userId.toString(),
          type: tx.type,
          amountMinor: tx.amountMinor || String(amount),
          currency: tx.currency,
          fee,
          totalSettled,
          status: settled ? "completed" : "processing",
          initiatedAt: new Date(initiatedAt).toISOString(),
          completedAt: completedAt ? new Date(completedAt).toISOString() : null,
        })
      )
      .digest("hex");

    const data: TransferReceiptData = {
      receiptNumber,
      reference: tx.reference || tx._id.toString(),
      status: settled ? "completed" : "processing",
      direction: isCredit ? "credit" : "debit",
      transferKind: kind,
      rail,
      channel: tx.channel === "online" ? "Online Banking" : tx.channel || "Online Banking",
      amount,
      currency: tx.currency || "USD",
      fee: isCredit ? 0 : fee,
      totalSettled,
      initiatedAt: new Date(initiatedAt),
      completedAt: completedAt ? new Date(completedAt) : null,
      purpose: md.purposeOfTransfer || md.purpose,
      narrative: tx.description,
      sender,
      beneficiary,
      integrityHash,
      verificationUrl: `${baseUrl(request)}/verify/${encodeURIComponent(tx.reference || tx._id.toString())}`,
      generatedAt,
    };

    const bytes = await generateTransferReceipt(data);

    await audit({
      action: "transfer.receipt.generated",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "success",
      request,
      resourceId: tx.reference || tx._id.toString(),
      details: { receiptNumber, status: data.status, amount, currency: data.currency },
    });

    const filename = `Aldwych-Transfer-Receipt-${(tx.reference || tx._id.toString()).replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Transfer receipt error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
