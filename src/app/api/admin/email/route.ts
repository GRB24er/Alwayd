// Admin "sent items" — list of every email composed and dispatched, with
// status, recipient, and a body preview.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AdminEmail from "@/models/AdminEmail";

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
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.trim();

  const query: any = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { recipientEmail: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
    ];
  }

  const [rows, total] = await Promise.all([
    AdminEmail.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select({ bodyHtmlPreview: 0 }) // omit the heavy field from the list view
      .lean(),
    AdminEmail.countDocuments(query),
  ]);

  return NextResponse.json({
    success: true,
    total,
    limit,
    skip,
    emails: rows.map((r: any) => ({
      id: r._id.toString(),
      recipientEmail: r.recipientEmail,
      recipientUserId: r.recipientUserId?.toString(),
      cc: r.cc,
      bcc: r.bcc,
      subject: r.subject,
      preview: r.bodyText?.slice(0, 200),
      category: r.category,
      status: r.status,
      errorReason: r.errorReason,
      senderEmail: r.senderEmail,
      senderName: r.senderName,
      sentAt: r.sentAt,
      createdAt: r.createdAt,
    })),
  });
}
