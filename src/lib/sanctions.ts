// Sanctions / OFAC screening. Production must hit a real list (US OFAC SDN,
// EU Consolidated, UN Consolidated, UK OFSI). This module gives every money
// path a single seam to call so swapping in a real provider is a one-file change.
//
// The embedded data here mirrors high-confidence buckets so the screen is useful
// out-of-the-box: embargoed/restricted country list from lib/countries (kept in
// sync there), plus name-fragment watchlist for the most common SDN entries.
// Refresh from official sources on a schedule for production use.

import { audit } from "./audit";
import { NextRequest } from "next/server";
import { lookupCountry, isEmbargoedCountry, isRestrictedCountry, requiresEnhancedDueDiligence } from "./countries";

// Common SDN name fragments. Real production should use Treasury OFAC's
// downloadable XML feed; this list reflects high-profile, persistent entries.
const SDN_NAME_FRAGMENTS = [
  // Test entries — should always block in any environment.
  "ofac-test",
  "specially designated national",
  // High-confidence persistent SDN entries (post-1990 OFAC publications).
  "al-qaida", "al qaeda", "isis", "islamic state",
  "taliban", "hizballah", "hezbollah",
  "kim jong-un", "kim jong un",
  "wagner group", "concord management",
];

// Designated terrorist orgs and entities that bank automatically refuses.
const ENTITY_DENYLIST = [
  "fsb of russia", "russian federal security service",
  "irgc", "islamic revolutionary guard corps",
  "korea united development bank",
];

// Politically Exposed Person (PEP) keyword indicators. A hit doesn't block —
// it triggers enhanced review and the KYC case is flagged isPep=true.
const PEP_TITLE_KEYWORDS = [
  "minister", "deputy minister", "head of state", "head of government",
  "ambassador", "supreme court", "central bank governor",
  "senator", "member of parliament", "mp ",
  "general (mil)", "admiral (mil)",
];

export interface ScreeningInput {
  fullName?: string;
  countryCode?: string;
  bankName?: string;
  reference?: string;
  beneficiaryAddress?: string;
}

export type MatchType = "embargo" | "restricted" | "edd" | "sdn_name" | "entity_denylist" | "pep";

export interface ScreeningMatch {
  list: string;
  type: MatchType;
  reason: string;
  severity: "critical" | "warning" | "info";
}

export interface ScreeningResult {
  hit: boolean;
  blocking: boolean; // true if any critical match — caller must refuse the transaction
  matches: ScreeningMatch[];
}

export function screen(input: ScreeningInput): ScreeningResult {
  const matches: ScreeningMatch[] = [];

  const country = input.countryCode?.toUpperCase();
  if (country) {
    const c = lookupCountry(country);
    if (!c) {
      matches.push({
        list: "iso_3166",
        type: "edd",
        reason: `Unknown country code "${country}"`,
        severity: "warning",
      });
    } else if (isEmbargoedCountry(country)) {
      matches.push({
        list: "embargoed_countries",
        type: "embargo",
        reason: `Country ${c.name} (${country}) is under full sanctions`,
        severity: "critical",
      });
    } else if (isRestrictedCountry(country)) {
      matches.push({
        list: "restricted_countries",
        type: "restricted",
        reason: `Country ${c.name} (${country}) is under restrictive sanctions; case-by-case review`,
        severity: "critical",
      });
    } else if (requiresEnhancedDueDiligence(country)) {
      matches.push({
        list: "edd_countries",
        type: "edd",
        reason: `Country ${c.name} (${country}) requires enhanced due diligence`,
        severity: "warning",
      });
    }
  }

  const haystack = `${input.fullName || ""} ${input.bankName || ""} ${input.beneficiaryAddress || ""}`.toLowerCase();

  for (const fragment of SDN_NAME_FRAGMENTS) {
    if (haystack.includes(fragment)) {
      matches.push({
        list: "ofac_sdn",
        type: "sdn_name",
        reason: `Matched OFAC SDN fragment: "${fragment}"`,
        severity: "critical",
      });
    }
  }
  for (const entity of ENTITY_DENYLIST) {
    if (haystack.includes(entity)) {
      matches.push({
        list: "entity_denylist",
        type: "entity_denylist",
        reason: `Matched bank entity denylist: "${entity}"`,
        severity: "critical",
      });
    }
  }
  for (const title of PEP_TITLE_KEYWORDS) {
    if (haystack.includes(title)) {
      matches.push({
        list: "pep_indicators",
        type: "pep",
        reason: `PEP title indicator detected: "${title.trim()}"`,
        severity: "warning",
      });
    }
  }

  const blocking = matches.some((m) => m.severity === "critical");
  return { hit: matches.length > 0, blocking, matches };
}

// Convenience: screen and, if blocking, write an audit entry and return a structured "blocked" result.
export async function screenOrBlock(opts: {
  input: ScreeningInput;
  actorId?: string | null;
  actorEmail?: string;
  request?: NextRequest;
}): Promise<{ ok: true; warnings: ScreeningMatch[] } | { ok: false; matches: ScreeningMatch[] }> {
  const result = screen(opts.input);

  if (result.blocking) {
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

  // Non-blocking but noteworthy hits still get logged for compliance review.
  if (result.matches.length > 0) {
    await audit({
      action: "sanctions.blocked",
      severity: "warning",
      actorId: opts.actorId || null,
      actorEmail: opts.actorEmail,
      outcome: "success",
      request: opts.request,
      details: { input: opts.input, matches: result.matches, note: "non-blocking; logged for EDD" },
    });
  }

  return { ok: true, warnings: result.matches };
}
