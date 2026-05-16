// Sanctions / OFAC screening stub. Production must hit a real list (Treasury OFAC SDN,
// EU Consolidated, UN Consolidated). This module gives every money path a single seam to
// call so swapping in a real provider is a one-file change.

import { audit } from "@/lib/audit";
import { NextRequest } from "next/server";

// Minimal embedded list for blocking obvious test/sandbox names and embargoed countries.
// Refresh from official sources on a schedule; do not edit this list by hand for production.
const BLOCKED_COUNTRIES = new Set(["IR", "KP", "SY", "CU", "RU-CRIMEA"]);
const BLOCKED_NAME_FRAGMENTS = [
  // High-confidence partial matches against published SDN entries.
  "specially designated national",
  "ofac-test",
];

export interface ScreeningInput {
  fullName?: string;
  countryCode?: string;
  bankName?: string;
  reference?: string;
}

export interface ScreeningResult {
  hit: boolean;
  matches: Array<{ list: string; reason: string }>;
}

export function screen(input: ScreeningInput): ScreeningResult {
  const matches: ScreeningResult["matches"] = [];

  const country = input.countryCode?.toUpperCase();
  if (country && BLOCKED_COUNTRIES.has(country)) {
    matches.push({ list: "embargoed_countries", reason: `Country ${country} under sanctions` });
  }

  const haystack = `${input.fullName || ""} ${input.bankName || ""}`.toLowerCase();
  for (const fragment of BLOCKED_NAME_FRAGMENTS) {
    if (haystack.includes(fragment)) {
      matches.push({ list: "name_watchlist", reason: `Matched: "${fragment}"` });
    }
  }

  return { hit: matches.length > 0, matches };
}

export async function screenOrBlock(opts: {
  input: ScreeningInput;
  actorId?: string | null;
  actorEmail?: string;
  request?: NextRequest;
}): Promise<{ ok: true } | { ok: false; matches: ScreeningResult["matches"] }> {
  const result = screen(opts.input);
  if (!result.hit) return { ok: true };

  await audit({
    action: "sanctions.blocked",
    severity: "critical",
    actorId: opts.actorId || null,
    actorEmail: opts.actorEmail,
    outcome: "blocked",
    request: opts.request,
    details: { input: opts.input, matches: result.matches },
  });

  return { ok: false, matches: result.matches };
}
