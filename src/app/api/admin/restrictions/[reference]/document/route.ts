// Admin PDF download. Generates the official notice on the fly from the
// AccountRestriction record so the document always reflects the latest state
// (e.g. shows a lift addendum once lifted, in a future enhancement).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AccountRestriction from "@/models/AccountRestriction";
import User from "@/models/User";
import { generateRestrictionNotice } from "@/lib/restrictionDocument";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reference } = await params;
  await connectDB();

  const r = await AccountRestriction.findOne({ referenceNumber: reference });
  if (!r) return NextResponse.json({ error: "Restriction not found" }, { status: 404 });

  const user = await User.findById(r.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const bytes = await generateRestrictionNotice({
    restriction: r,
    customer: {
      name: user.name,
      email: user.email,
      accountNumber: user.accountNumber,
      routingNumber: user.routingNumber,
    },
    verificationUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/verify/${reference}`,
  });

  return new NextResponse(bytes as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
