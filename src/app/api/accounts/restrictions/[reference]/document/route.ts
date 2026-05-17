// Customer download of their own restriction PDF. Authorized only for the
// account holder named on the restriction.

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
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reference } = await params;
  await connectDB();

  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const r = await AccountRestriction.findOne({ referenceNumber: reference, userId: user._id });
  if (!r) return NextResponse.json({ error: "Restriction not found" }, { status: 404 });

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
