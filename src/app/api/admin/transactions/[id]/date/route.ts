// src/app/api/admin/transactions/[id]/date/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

type Body = {
  date?: string | Date;                 // required
  syncPostedAtWithDate?: boolean;       // default: true if tx.posted === true
  postedAt?: string | Date | null;      // optional explicit postedAt
};

async function handleUpdate(request: NextRequest, context: any) {
  // Next 15: context.params is async
  const { id } = (await context?.params) || {};
  if (!id) return bad(400, "Missing transaction id.");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return bad(401, "Unauthorized");

  const isAdmin =
    (session.user as any)?.isAdmin === true ||
    (session.user as any)?.role === "admin" ||
    (session.user as any)?.role === "superadmin";
  if (!isAdmin) return bad(403, "Forbidden");

  const body = (await request.json().catch(() => ({}))) as Body;

  const rawDate = body?.date;
  if (!rawDate) return bad(400, "New date is required.");
  const newDate = new Date(rawDate);
  if (isNaN(newDate.getTime())) return bad(400, "Invalid date.");

  await connectDB();

  const prev = await Transaction.findById(id).lean();
  if (!prev?._id) return bad(404, "Transaction not found.");

  const updates: Record<string, any> = {
    date: newDate,
    editedDateByAdmin: true,
  };

  if (Object.prototype.hasOwnProperty.call(body, "postedAt")) {
    const p = body.postedAt;
    if (p == null) {
      updates.postedAt = null;
    } else {
      const pd = new Date(p as any);
      if (isNaN(pd.getTime())) return bad(400, "Invalid postedAt.");
      updates.postedAt = pd;
    }
  } else {
    const sync =
      typeof body?.syncPostedAtWithDate === "boolean"
        ? body.syncPostedAtWithDate
        : true;
    if (prev.posted === true && sync) {
      updates.postedAt = newDate;
    }
  }

  const updated = await Transaction.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true }
  ).lean();

  return NextResponse.json(
    { ok: true, message: "Transaction date updated.", transaction: updated },
    { status: 200 }
  );
}

/** Accept BOTH PATCH and POST (some environments/proxies drop PATCH). */
export async function PATCH(req: NextRequest, ctx: any) {
  return handleUpdate(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  return handleUpdate(req, ctx);
}

/** Healthcheck to confirm you’re hitting THIS file locally. */
export async function GET(_req: NextRequest, context: any) {
  const { id } = (await context?.params) || {};
  return NextResponse.json({ ok: true, route: "date", id }, { status: 200 });
}

/** OPTIONS responder (helps if a preflight happens) */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Allow": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/** 405 for the rest */
export function PUT()  { return NextResponse.json({ ok:false, error:"Method Not Allowed" }, { status:405 }); }
export function DELETE(){ return NextResponse.json({ ok:false, error:"Method Not Allowed" }, { status:405 }); }
