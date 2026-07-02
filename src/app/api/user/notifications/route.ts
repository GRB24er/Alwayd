// src/app/api/user/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { displayDescription } from "@/lib/channels";
import mongoose from "mongoose";

// Notification Schema
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { 
    type: String, 
    enum: ["transaction", "security", "account", "system", "promotion"],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unread") === "true";

    // Build query
    const query: any = { userId: user._id };
    if (unreadOnly) {
      query.read = false;
    }

    // Fetch notifications
    let notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // If no stored notifications, generate from recent transactions
    if (notifications.length === 0) {
      const recentTransactions = await Transaction.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      notifications = recentTransactions.map((tx: any) => ({
        _id: tx._id,
        userId: user._id,
        type: "transaction",
        title: getTransactionTitle(tx.type, tx.status),
        message: getTransactionMessage(tx),
        read: tx.status === "completed" || tx.status === "approved",
        data: {
          transactionId: tx._id,
          reference: tx.reference,
          amount: tx.amount,
          type: tx.type,
          status: tx.status
        },
        createdAt: tx.createdAt
      }));
    }

    // Count unread
    const unreadCount = await Notification.countDocuments({ userId: user._id, read: false });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error: any) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST - Create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, data } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Type, title, and message are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notification = await Notification.create({
      userId: user._id,
      type,
      title,
      message,
      data: data || {},
      read: false
    });

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error: any) {
    console.error("Notification create error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (markAllRead) {
      await Notification.updateMany(
        { userId: user._id, read: false },
        { $set: { read: true } }
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: user._id },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read"
    });

  } catch (error: any) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await Notification.findOneAndDelete({ _id: notificationId, userId: user._id });

    return NextResponse.json({
      success: true,
      message: "Notification deleted"
    });

  } catch (error: any) {
    console.error("Notification delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}

// Helper functions
function getTransactionTitle(type: string, status: string): string {
  const statusText = status === "pending" ? "Pending" : status === "approved" ? "Approved" : "Completed";
  
  switch (type) {
    case "deposit":
      return `Deposit ${statusText}`;
    case "withdraw":
    case "withdrawal":
      return `Withdrawal ${statusText}`;
    case "transfer-in":
      return `Transfer Received`;
    case "transfer-out":
      return `Transfer ${statusText}`;
    case "payment":
      return `Payment ${statusText}`;
    default:
      return `Transaction ${statusText}`;
  }
}

function getTransactionMessage(tx: any): string {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: tx.currency || "USD"
  }).format(Math.abs(tx.amount));

  switch (tx.type) {
    case "deposit":
      return `A deposit of ${amount} has been ${tx.status === "pending" ? "initiated" : "credited"} to your ${tx.accountType} account.`;
    case "withdraw":
    case "withdrawal":
      return `A withdrawal of ${amount} from your ${tx.accountType} account is ${tx.status}.`;
    case "transfer-in":
      return `You received a transfer of ${amount} to your ${tx.accountType} account.`;
    case "transfer-out":
      return `Your transfer of ${amount} from ${tx.accountType} is ${tx.status}.`;
    case "payment":
      return `Your payment of ${amount} is ${tx.status}.`;
    default:
      return `Transaction of ${amount} - ${displayDescription(tx.description, tx.type) || "No description"}`;
  }
}