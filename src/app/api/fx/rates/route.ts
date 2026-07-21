// src/app/api/fx/rates/route.ts
// Public FX snapshot: base currency + live mid-market rates for display
// conversion. Cached in-process (see fx.ts); safe to call frequently.

import { NextResponse } from "next/server";
import { getFxRates } from "@/lib/fx";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getFxRates();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, max-age=1800" },
    });
  } catch (error) {
    console.error("GET /api/fx/rates error:", error);
    return NextResponse.json(
      { base: "USD", rates: { USD: 1 }, asOf: new Date().toISOString(), source: "fallback" },
      { status: 200 }
    );
  }
}
