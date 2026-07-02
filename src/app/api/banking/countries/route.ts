// Returns the canonical country + banking-rules registry to the frontend so the
// transfer form can render the right field set per country without hard-coding
// anything in React. Sanctions-blocked countries are returned with the flag set
// so the UI can disable selection.

import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/countries";
import { bankingProfileFor } from "@/lib/bankingCodes";

export async function GET() {
  const payload = COUNTRIES.map((c) => {
    const profile = bankingProfileFor(c.iso2);
    return {
      iso2: c.iso2,
      iso3: c.iso3,
      name: c.name,
      currency: c.currency,
      callingCode: c.callingCode,
      region: c.region,
      sanctions: c.sanctions,
      selectable: c.sanctions !== "embargo",
      banking: {
        domesticSystem: profile.domesticSystem,
        primaryRail: profile.primaryRail,
        fields: profile.fields,
      },
    };
  });

  return NextResponse.json(
    { success: true, countries: payload, total: payload.length },
    { headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } }
  );
}
