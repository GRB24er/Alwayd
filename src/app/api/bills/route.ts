// src/app/api/bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

// Bill Schema (embedded in User or separate collection)
const BillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  payee: { type: String, required: true },
  accountNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["paid", "scheduled", "pending", "overdue"], 
    default: "pending" 
  },
  category: { type: String, default: "Other" },
  lastPaid: { type: Date },
  autopay: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: true });

const Bill = mongoose.models.Bill || mongoose.model("Bill", BillSchema);

// GET - Fetch user's bills
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const bills = await Bill.find({ userId: user._id })
      .sort({ dueDate: 1 })
      .lean();

    // Update overdue status
    const now = new Date();
    const updatedBills = bills.map(bill => {
      if (bill.status === "pending" && new Date(bill.dueDate) < now) {
        return { ...bill, status: "overdue" };
      }
      return bill;
    });

    // Calculate stats
    const totalDue = updatedBills
      .filter(b => b.status === "pending" || b.status === "overdue")
      .reduce((sum, b) => sum + b.amount, 0);

    const autopayCount = updatedBills.filter(b => b.autopay).length;
    const upcomingCount = updatedBills.filter(b => b.status === "pending").length;
    const overdueCount = updatedBills.filter(b => b.status === "overdue").length;

    return NextResponse.json({
      success: true,
      bills: updatedBills,
      stats: {
        totalDue,
        autopayCount,
        upcomingCount,
        overdueCount,
        totalBills: bills.length
      }
    });

  } catch (error: any) {
    console.error("Bills fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

// POST - Create new bill/payee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { payee, accountNumber, amount, dueDate, category, autopay, notes } = body;

    if (!payee || !accountNumber || !amount || !dueDate) {
      return NextResponse.json(
        { error: "Payee, account number, amount, and due date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const bill = await Bill.create({
      userId: user._id,
      payee: payee.trim(),
      accountNumber: accountNumber.trim(),
      amount: Math.abs(Number(amount)),
      dueDate: new Date(dueDate),
      category: category || "Other",
      autopay: autopay || false,
      notes: notes || "",
      status: "pending"
    });

    return NextResponse.json({
      success: true,
      message: "Bill added successfully",
      bill
    });

  } catch (error: any) {
    console.error("Bill create error:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}

// PUT - Update bill
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { billId, ...updates } = body;

    if (!billId) {
      return NextResponse.json({ error: "Bill ID required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const bill = await Bill.findOneAndUpdate(
      { _id: billId, userId: user._id },
      { $set: updates },
      { new: true }
    );

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Bill updated",
      bill
    });

  } catch (error: any) {
    console.error("Bill update error:", error);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}

// DELETE - Remove bill
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("id");

    if (!billId) {
      return NextResponse.json({ error: "Bill ID required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await Bill.findOneAndDelete({ _id: billId, userId: user._id });

    if (!result) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Bill deleted"
    });

  } catch (error: any) {
    console.error("Bill delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete bill" },
      { status: 500 }
    );
  }
}