// Per-country banking code registry. Defines what identifiers a wire / transfer to that
// country actually requires according to the local clearing system + correspondent-banking norms.
//
// References:
//  - ISO 13616 (IBAN registry)
//  - ISO 9362 (BIC / SWIFT)
//  - FedWire / ABA Nacha (US)
//  - Faster Payments + CHAPS (UK Sort Code)
//  - BSB directory (AU)
//  - IFSC directory (IN, RBI)
//  - CLABE (MX, Banxico)
//  - SPEI mod-97 etc.
//
// When a country isn't in the registry, the form falls back to the "default" entry which
// requires SWIFT/BIC + free-form account number — the lowest common denominator for
// correspondent banking.

import { lookupCountry } from "./countries";

export type FieldKind =
  | "iban"
  | "swift_bic"
  | "account_number"
  | "routing_number_aba"     // US (9 digits, ABA checksum)
  | "sort_code_uk"           // UK (6 digits, ddddDD format)
  | "bsb_au"                 // Australia (6 digits)
  | "ifsc_in"                // India (11 alphanumeric)
  | "clabe_mx"               // Mexico (18 digits, mod-97 checksum)
  | "transit_ca"             // Canada (5 + 3 digits)
  | "bank_code_generic"      // Free-form bank code (3-12 chars)
  | "branch_code_generic"
  | "tax_id"                 // CPF (BR), RFC (MX), etc.
  | "purpose_code";          // Required by some regulators (e.g. India RBI)

export interface BankingFieldSpec {
  kind: FieldKind;
  label: string;
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export interface CountryBankingProfile {
  countryIso2: string;
  // Domestic clearing system used for in-country transfers.
  domesticSystem: string;
  // The single most-important identifier for routing money INTO this country.
  primaryRail: "SEPA" | "SWIFT" | "FEDWIRE_ACH" | "FASTER_PAYMENTS" | "NEFT_RTGS" | "SPEI" | "PIX" | "EFT_CAD" | "BECS_AU" | "JAPAN_ZENGIN" | "CIPS_CNY";
  fields: BankingFieldSpec[];
}

// Country-specific profiles. Add to this list as new corridors are supported.
// Order within each profile doesn't matter; the UI groups by `kind`.
const PROFILES: CountryBankingProfile[] = [
  // ── US: FedWire + ACH ─────────────────────────────────────────────────────
  {
    countryIso2: "US",
    domesticSystem: "FedWire / ACH",
    primaryRail: "FEDWIRE_ACH",
    fields: [
      { kind: "routing_number_aba", label: "ABA Routing Number", placeholder: "9 digits", required: true, helpText: "Found on the bottom-left of US checks" },
      { kind: "account_number", label: "Account Number", required: true },
      { kind: "swift_bic", label: "SWIFT/BIC (for international originator)", required: false },
    ],
  },

  // ── UK: Faster Payments + CHAPS ───────────────────────────────────────────
  {
    countryIso2: "GB",
    domesticSystem: "Faster Payments / CHAPS",
    primaryRail: "FASTER_PAYMENTS",
    fields: [
      { kind: "sort_code_uk", label: "Sort Code", placeholder: "12-34-56", required: true, helpText: "6 digits, optionally with dashes" },
      { kind: "account_number", label: "Account Number", placeholder: "8 digits", required: true },
      { kind: "iban", label: "IBAN", placeholder: "GB29 NWBK 6016 1331 9268 19", required: false, helpText: "Required for SWIFT-originated payments from outside the UK" },
      { kind: "swift_bic", label: "SWIFT/BIC", required: false },
    ],
  },

  // ── SEPA countries: IBAN-only is sufficient for euro payments inside SEPA ─
  // For non-EUR rails or non-SEPA wires we still require SWIFT/BIC.
  ...sepaProfile("AT"), ...sepaProfile("BE"), ...sepaProfile("BG"), ...sepaProfile("CY"),
  ...sepaProfile("CZ"), ...sepaProfile("DE"), ...sepaProfile("DK"), ...sepaProfile("EE"),
  ...sepaProfile("ES"), ...sepaProfile("FI"), ...sepaProfile("FR"), ...sepaProfile("GR"),
  ...sepaProfile("HR"), ...sepaProfile("HU"), ...sepaProfile("IE"), ...sepaProfile("IT"),
  ...sepaProfile("LT"), ...sepaProfile("LU"), ...sepaProfile("LV"), ...sepaProfile("MT"),
  ...sepaProfile("NL"), ...sepaProfile("PL"), ...sepaProfile("PT"), ...sepaProfile("RO"),
  ...sepaProfile("SE"), ...sepaProfile("SI"), ...sepaProfile("SK"),
  ...sepaProfile("CH"), ...sepaProfile("IS"), ...sepaProfile("LI"), ...sepaProfile("NO"),
  ...sepaProfile("MC"), ...sepaProfile("SM"), ...sepaProfile("VA"),

  // ── India: NEFT / IMPS / RTGS ─────────────────────────────────────────────
  {
    countryIso2: "IN",
    domesticSystem: "NEFT / IMPS / RTGS",
    primaryRail: "NEFT_RTGS",
    fields: [
      { kind: "ifsc_in", label: "IFSC Code", placeholder: "HDFC0001234", required: true, helpText: "11 chars: 4 letters + '0' + 6 alphanumeric" },
      { kind: "account_number", label: "Account Number", required: true },
      { kind: "purpose_code", label: "RBI Purpose Code", placeholder: "P0102", required: true, helpText: "Required by Reserve Bank of India for inward remittances" },
      { kind: "swift_bic", label: "SWIFT/BIC", required: true },
    ],
  },

  // ── Australia: BECS / BSB ─────────────────────────────────────────────────
  {
    countryIso2: "AU",
    domesticSystem: "BECS / NPP",
    primaryRail: "BECS_AU",
    fields: [
      { kind: "bsb_au", label: "BSB Number", placeholder: "123-456", required: true, helpText: "6 digits (Bank-State-Branch)" },
      { kind: "account_number", label: "Account Number", required: true },
      { kind: "swift_bic", label: "SWIFT/BIC", required: true, helpText: "Required for incoming international wires" },
    ],
  },

  // ── New Zealand ───────────────────────────────────────────────────────────
  {
    countryIso2: "NZ",
    domesticSystem: "ESAS",
    primaryRail: "SWIFT",
    fields: [
      { kind: "account_number", label: "Account Number", placeholder: "XX-XXXX-XXXXXXX-XXX", required: true, helpText: "NZ account format (16 digits)" },
      { kind: "swift_bic", label: "SWIFT/BIC", required: true },
    ],
  },

  // ── Canada: EFT / Interac ─────────────────────────────────────────────────
  {
    countryIso2: "CA",
    domesticSystem: "EFT / Interac e-Transfer",
    primaryRail: "EFT_CAD",
    fields: [
      { kind: "transit_ca", label: "Transit + Institution Number", placeholder: "12345-001", required: true, helpText: "5-digit transit + 3-digit institution" },
      { kind: "account_number", label: "Account Number", required: true },
      { kind: "swift_bic", label: "SWIFT/BIC", required: true, helpText: "Required for cross-border wires" },
    ],
  },

  // ── Mexico: SPEI + CLABE ──────────────────────────────────────────────────
  {
    countryIso2: "MX",
    domesticSystem: "SPEI",
    primaryRail: "SPEI",
    fields: [
      { kind: "clabe_mx", label: "CLABE", placeholder: "18 digits", required: true, helpText: "Standardized 18-digit account identifier (Banxico)" },
      { kind: "swift_bic", label: "SWIFT/BIC", required: false },
    ],
  },

  // ── Brazil: PIX + tax id ──────────────────────────────────────────────────
  {
    countryIso2: "BR",
    domesticSystem: "PIX / TED / DOC",
    primaryRail: "PIX",
    fields: [
      { kind: "bank_code_generic", label: "Bank Code (Compe)", placeholder: "3 digits", required: true },
      { kind: "branch_code_generic", label: "Agência (Branch)", required: true },
      { kind: "account_number", label: "Conta (Account)", required: true },
      { kind: "tax_id", label: "CPF or CNPJ", placeholder: "11 or 14 digits", required: true, helpText: "Beneficiary's Brazilian tax identification" },
      { kind: "swift_bic", label: "SWIFT/BIC", required: true },
    ],
  },

  // ── Japan: Zengin ─────────────────────────────────────────────────────────
  {
    countryIso2: "JP",
    domesticSystem: "Zengin",
    primaryRail: "JAPAN_ZENGIN",
    fields: [
      { kind: "bank_code_generic", label: "Bank Code (4 digits)", required: true },
      { kind: "branch_code_generic", label: "Branch Code (3 digits)", required: true },
      { kind: "account_number", label: "Account Number (7 digits)", required: true },
      { kind: "swift_bic", label: "SWIFT/BIC", required: true },
    ],
  },

  // ── China: CNAPS / CIPS ───────────────────────────────────────────────────
  {
    countryIso2: "CN",
    domesticSystem: "CNAPS / CIPS",
    primaryRail: "CIPS_CNY",
    fields: [
      { kind: "swift_bic", label: "SWIFT/BIC", required: true },
      { kind: "account_number", label: "Account Number", required: true },
      { kind: "bank_code_generic", label: "CNAPS Code (12 digits)", required: false, helpText: "Required for CNY-denominated wires" },
    ],
  },

  // ── Hong Kong, Singapore: SWIFT + account ─────────────────────────────────
  ...["HK", "SG", "AE", "QA", "BH", "KW", "OM", "SA", "IL", "ZA", "KE", "NG", "EG"].map((iso) => ({
    countryIso2: iso,
    domesticSystem: "Local clearing",
    primaryRail: "SWIFT" as const,
    fields: [
      { kind: "swift_bic" as FieldKind, label: "SWIFT/BIC", required: true },
      { kind: "account_number" as FieldKind, label: "Account Number / IBAN", required: true },
    ],
  })),
];

const REGISTRY = new Map<string, CountryBankingProfile>(PROFILES.map((p) => [p.countryIso2, p]));

// Default profile for any country we haven't mapped specifically.
// SWIFT + free-form account is universally accepted by correspondent banks.
const DEFAULT_PROFILE: Omit<CountryBankingProfile, "countryIso2"> = {
  domesticSystem: "SWIFT correspondent",
  primaryRail: "SWIFT",
  fields: [
    { kind: "swift_bic", label: "SWIFT/BIC", required: true },
    { kind: "account_number", label: "Account Number / IBAN", required: true },
    { kind: "bank_code_generic", label: "Local Bank Code (if applicable)", required: false },
  ],
};

export function bankingProfileFor(iso2: string): CountryBankingProfile {
  const up = iso2.toUpperCase();
  const found = REGISTRY.get(up);
  if (found) return found;
  return { countryIso2: up, ...DEFAULT_PROFILE };
}

export function allBankingProfiles(): CountryBankingProfile[] {
  return PROFILES;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function sepaProfile(iso2: string): CountryBankingProfile[] {
  const c = lookupCountry(iso2);
  if (!c) return [];
  return [{
    countryIso2: iso2,
    domesticSystem: "SEPA",
    primaryRail: "SEPA",
    fields: [
      { kind: "iban", label: "IBAN", required: true, helpText: `Country prefix ${iso2} required` },
      { kind: "swift_bic", label: "SWIFT/BIC", required: false, helpText: "Required only for non-SEPA EUR transfers" },
    ],
  }];
}

// Expected IBAN length per country (ISO 13616 registry). Empty = country has no IBAN.
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24,
  RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23,
  TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};
