// src/app/api/user/transactions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

type TxLean = {
  _id: any;
  reference?: string;
  description?: string;
  type: string;
  amount: number;
  currency?: string;
  status: string;
  date: Date | string;
  accountType?: string;
  posted?: boolean;
  postedAt?: Date | string | null;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Only fetch what's needed
    const user = await User.findOne({ email: session.user.email })
      .select("_id")
      .lean();
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const raw = await Transaction.find({ userId: user._id })
      .select(
        "_id reference description type amount currency status date accountType posted postedAt"
      )
      .sort({ date: -1, createdAt: -1 })
      .limit(100)
      .lean(); // no generic here to avoid TS2347 elsewhere

    const rows: TxLean[] = raw as unknown as TxLean[];

    return NextResponse.json({
      transactions: rows.map((tx) => ({
        _id: String(tx._id),
        reference: tx.reference,
        description: tx.description,
        amount: tx.amount,
        status: tx.status,
        date: tx.date,
        accountType: tx.accountType,
        type: tx.type,
        currency: tx.currency ?? "USD",
        posted: !!tx.posted,
        postedAt: tx.postedAt ?? null,
      })),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
