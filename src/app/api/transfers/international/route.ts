// International wire transfer. The previous handler:
//   - Hard-coded a regex for SWIFT and nothing else
//   - Took recipientCountry as free text (no validation)
//   - Skipped IBAN mod-97, length-per-country, sanctions screening
//   - Used JS floats for the amount and fees
//   - Had no idempotency, rate-limit, KYC gating, or limit enforcement
//
// This rewrite validates fields per the destination country's actual rail
// (IBAN for SEPA, SWIFT+IBAN for most, IFSC for India, BSB for Australia,
// CLABE for Mexico, etc.), screens for sanctions, requires KYC tier_3 for
// international wires, enforces server-side daily limits, supports a real
// Idempotency-Key, and audit-logs every state change.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail } from "@/lib/mail";
import { runIdempotent } from "@/lib/idempotency";
import { check as rateLimitCheck, POLICIES } from "@/lib/rateLimit";
import { v, validate, firstValidationError } from "@/lib/validators";
import type { ValidationResult } from "@/lib/validators";
import { enforceLimit } from "@/lib/limits";
import { screenOrBlock } from "@/lib/sanctions";
import { audit } from "@/lib/audit";
import { toMinor, fromMinor, toNumber, gte, add } from "@/lib/decimal";
import { logger } from "@/lib/logger";
import { lookupCountry, isEmbargoedCountry } from "@/lib/countries";
import { bankingProfileFor } from "@/lib/bankingCodes";
import { canPerformAction } from "@/lib/kyc";
import { assertAccountActive } from "@/lib/accountStatus";

const ACCOUNT_VALUES = ["checking", "savings", "investment"] as const;
type AccountType = (typeof ACCOUNT_VALUES)[number];

const SPEED_VALUES = ["standard", "express", "instant"] as const;
type Speed = (typeof SPEED_VALUES)[number];

const SPEED_BASE_FEE: Record<Speed, number> = {
  standard: 25,
  express: 45,
  instant: 75,
};
const EDD_SURCHARGE = 15;

const MIN_AMOUNT = 50;
const MAX_AMOUNT = 250_000;

interface BaseBody {
  fromAccount: AccountType;
  recipientName: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientPostalCode?: string;
  recipientCountry: string;
  recipientPhone?: string;
  recipientEmail?: string;
  bankName: string;
  bankAddress: string;
  bankCity?: string;
  amount: string;
  sourceCurrency?: string;
  targetCurrency?: string;
  purpose: string;
  sourceOfFunds: string;
  relationship: string;
  reference?: string;
  transferSpeed?: Speed;
  intermediaryBank?: string;
  intermediarySwift?: string;
  complianceAccepted?: boolean;
  iban?: string;
  swiftBic?: string;
  accountNumber?: string;
  sortCodeUk?: string;
  bsbAu?: string;
  ifscIn?: string;
  clabeMx?: string;
  transitCa?: string;
  bankCodeGeneric?: string;
  branchCodeGeneric?: string;
  taxId?: string;
  purposeCodeRbi?: string;
}

export async function POST(request: NextRequest) {
  const log = logger.child({ route: "transfers/international" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const base = validate<BaseBody>(body, {
    fromAccount: v.enum(ACCOUNT_VALUES),
    recipientName: v.string({ min: 2, max: 200 }),
    recipientAddress: v.string({ min: 4, max: 500 }),
    recipientCity: v.optional(v.string({ max: 200 })),
    recipientPostalCode: v.optional(v.string({ max: 30 })),
    recipientCountry: v.countryCode(),
    recipientPhone: v.optional(v.string({ max: 30 })),
    recipientEmail: v.optional(v.email()),
    bankName: v.string({ min: 2, max: 200 }),
    bankAddress: v.string({ min: 4, max: 500 }),
    bankCity: v.optional(v.string({ max: 200 })),
    amount: v.amountString(),
    sourceCurrency: v.optional(v.string({ pattern: /^[A-Z]{3}$/ })),
    targetCurrency: v.optional(v.string({ pattern: /^[A-Z]{3}$/ })),
    purpose: v.string({ min: 3, max: 300 }),
    sourceOfFunds: v.string({ min: 3, max: 200 }),
    relationship: v.string({ min: 1, max: 100 }),
    reference: v.optional(v.string({ max: 100 })),
    transferSpeed: v.optional(v.enum(SPEED_VALUES)),
    intermediaryBank: v.optional(v.string({ max: 200 })),
    intermediarySwift: v.optional(v.swiftBic()),
    complianceAccepted: v.optional(v.bool()),
    iban: v.optional(v.string({ max: 34 })),
    swiftBic: v.optional(v.string({ max: 11 })),
    accountNumber: v.optional(v.string({ max: 34 })),
    sortCodeUk: v.optional(v.string({ max: 8 })),
    bsbAu: v.optional(v.string({ max: 7 })),
    ifscIn: v.optional(v.string({ max: 11 })),
    clabeMx: v.optional(v.string({ max: 18 })),
    transitCa: v.optional(v.string({ max: 9 })),
    bankCodeGeneric: v.optional(v.string({ max: 20 })),
    branchCodeGeneric: v.optional(v.string({ max: 20 })),
    taxId: v.optional(v.string({ max: 20 })),
    purposeCodeRbi: v.optional(v.string({ max: 10 })),
  });
  if (!base.ok) {
    return NextResponse.json(
      { success: false, error: firstValidationError(base.errors), errors: base.errors },
      { status: 400 }
    );
  }

  const country = lookupCountry(base.value.recipientCountry);
  if (!country) {
    return NextResponse.json({ success: false, error: "Unknown destination country" }, { status: 400 });
  }
  if (isEmbargoedCountry(base.value.recipientCountry)) {
    return NextResponse.json(
      { success: false, error: `Transfers to ${country.name} are prohibited under sanctions` },
      { status: 451 }
    );
  }

  const profile = bankingProfileFor(base.value.recipientCountry);
  const railCheck = validateRailFields(base.value, profile.fields, country.iso2);
  if (!railCheck.ok) {
    return NextResponse.json(
      { success: false, error: firstValidationError(railCheck.errors), errors: railCheck.errors },
      { status: 400 }
    );
  }

  const amountMinor = toMinor(base.value.amount);
  const amountNumber = toNumber(amountMinor);
  if (amountNumber < MIN_AMOUNT) {
    return NextResponse.json({ success: false, error: `Minimum international wire is $${MIN_AMOUNT}` }, { status: 422 });
  }
  if (amountNumber > MAX_AMOUNT) {
    return NextResponse.json(
      { success: false, error: `International wires above $${MAX_AMOUNT.toLocaleString()} require manual review` },
      { status: 422 }
    );
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const gate = await canPerformAction(user._id.toString(), "international_wire");
  if (!gate.allowed) {
    await audit({
      action: "transfer.wire.initiated",
      actorId: user._id.toString(),
      actorEmail: user.email,
      outcome: "blocked",
      severity: "warning",
      request,
      details: { reason: "kyc_insufficient", required: gate.required, current: gate.current },
    });
    return NextResponse.json(
      { success: false, error: gate.reason, requiredKycLevel: gate.required, currentKycLevel: gate.current },
      { status: 403 }
    );
  }

  const rl = await rateLimitCheck(`intl:${user._id}`, POLICIES.transferInitiate);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many international transfer attempts" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }
    );
  }

  return runIdempotent({
    request,
    endpoint: "transfers/international",
    userId: user._id.toString(),
    body,
    handler: async () => {
      const status = await assertAccountActive(user._id.toString(), base.value.fromAccount);
      if (!status.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Account ${status.status}: ${status.reasonNote}`,
            accountStatus: status.status,
            restrictionReference: status.referenceNumber,
            documentUrl: status.documentUrl,
          },
          { status: 423 }
        );
      }

      const screening = await screenOrBlock({
        input: {
          fullName: base.value.recipientName,
          bankName: base.value.bankName,
          countryCode: base.value.recipientCountry,
          beneficiaryAddress: base.value.recipientAddress,
        },
        actorId: user._id.toString(),
        actorEmail: user.email,
        request,
      });
      if (!screening.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "Transfer blocked by compliance screening. Contact support.",
            sanctionsMatches: screening.matches,
          },
          { status: 451 }
        );
      }

      const speed: Speed = base.value.transferSpeed || "standard";
      let fee = SPEED_BASE_FEE[speed];
      if (country.sanctions === "enhanced_due_diligence") fee += EDD_SURCHARGE;

      const feeMinor = toMinor(fee.toString());
      const totalMinor = add(amountMinor, feeMinor);
      const totalNumber = toNumber(totalMinor);

      const balanceField =
        base.value.fromAccount === "savings"
          ? "savingsBalance"
          : base.value.fromAccount === "investment"
          ? "investmentBalance"
          : "checkingBalance";
      const currentMinor = toMinor(String((user as any)[balanceField] || 0));
      if (!gte(currentMinor, totalMinor)) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient funds (including fees)",
            details: {
              available: toNumber(currentMinor),
              transferAmount: amountNumber,
              fee,
              totalRequired: totalNumber,
              shortfall: toNumber(totalMinor - currentMinor),
            },
          },
          { status: 422 }
        );
      }

      const limit = await enforceLimit({
        userId: user._id.toString(),
        amount: totalNumber,
        kind: "transfer",
        accountType: base.value.fromAccount,
        actorEmail: user.email,
        request,
      });
      if (!limit.allowed) {
        return NextResponse.json(
          { success: false, error: limit.message, reason: limit.reason },
          { status: 422 }
        );
      }

      const ref = `IWR-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

      const wireTx = await Transaction.create({
        userId: user._id,
        type: "transfer-out",
        currency: "USD",
        amount: amountNumber,
        amountMinor: fromMinor(amountMinor),
        description: `International wire to ${base.value.recipientName} (${country.name})`,
        status: "pending",
        accountType: base.value.fromAccount,
        posted: false,
        ledgerPosted: false,
        reference: ref,
        channel: "online",
        origin: "wire_transfer",
        metadata: {
          wireType: "international",
          rail: profile.primaryRail,
          targetCurrency: base.value.targetCurrency || country.currency,
          recipientName: base.value.recipientName,
          recipientAddress: base.value.recipientAddress,
          recipientCity: base.value.recipientCity,
          recipientPostalCode: base.value.recipientPostalCode,
          recipientCountry: country.iso2,
          recipientCountryName: country.name,
          recipientPhone: base.value.recipientPhone,
          recipientEmail: base.value.recipientEmail,
          bankName: base.value.bankName,
          bankAddress: base.value.bankAddress,
          bankCity: base.value.bankCity,
          railFields: railCheck.value,
          intermediaryBank: base.value.intermediaryBank,
          intermediarySwift: base.value.intermediarySwift,
          purposeOfTransfer: base.value.purpose,
          sourceOfFunds: base.value.sourceOfFunds,
          relationship: base.value.relationship,
          transferSpeed: speed,
          fee,
          totalAmount: totalNumber,
          sanctionsScreened: true,
          sanctionsWarnings: screening.warnings,
        },
      });

      if (fee > 0) {
        await Transaction.create({
          userId: user._id,
          type: "fee",
          currency: "USD",
          amount: fee,
          amountMinor: fromMinor(feeMinor),
          description: `International wire fee (${speed})`,
          status: "pending",
          accountType: base.value.fromAccount,
          posted: false,
          ledgerPosted: false,
          reference: `${ref}-FEE`,
          channel: "online",
          origin: "wire_transfer",
          metadata: { linkedReference: ref, wireType: "international" },
        });
      }

      await audit({
        action: "transfer.wire.initiated",
        actorId: user._id.toString(),
        actorEmail: user.email,
        outcome: "success",
        request,
        resourceId: ref,
        details: {
          rail: profile.primaryRail,
          country: country.iso2,
          amount: amountNumber,
          fee,
          speed,
        },
      });

      try {
        await sendTransactionEmail(user.email, {
          name: user.name || "Customer",
          transaction: wireTx,
          subject: "International Wire Initiated - Pending Approval",
        });
      } catch (err: any) {
        log.warn("intl.email_failed", { err: err?.message });
      }

      return NextResponse.json(
        {
          success: true,
          message: `International wire to ${country.name} initiated. Awaiting approval.`,
          wireReference: ref,
          transfer: {
            type: "international",
            rail: profile.primaryRail,
            from: base.value.fromAccount,
            to: {
              name: base.value.recipientName,
              bank: base.value.bankName,
              country: country.iso2,
              countryName: country.name,
            },
            amount: amountNumber,
            fee,
            total: totalNumber,
            sourceCurrency: base.value.sourceCurrency || "USD",
            targetCurrency: base.value.targetCurrency || country.currency,
            reference: ref,
            status: "pending",
            transferSpeed: speed,
            estimatedDelivery: estimatedDelivery(speed),
            sanctionsWarnings: screening.warnings,
            date: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    },
  });
}

function estimatedDelivery(speed: Speed): string {
  if (speed === "instant") return "Within minutes (eligible corridors)";
  if (speed === "express") return "1-2 business days";
  return "3-5 business days";
}

function validateRailFields(
  body: BaseBody,
  fields: { kind: string; required: boolean; label: string }[],
  country: string
): ValidationResult<Record<string, string>> {
  const schema: Record<string, any> = {};
  const inputAlias: Record<string, any> = {};

  for (const f of fields) {
    switch (f.kind) {
      case "iban":
        schema.iban = f.required ? v.iban({ country }) : v.optional(v.iban({ country }));
        inputAlias.iban = body.iban;
        break;
      case "swift_bic":
        schema.swiftBic = f.required ? v.swiftBic() : v.optional(v.swiftBic());
        inputAlias.swiftBic = body.swiftBic;
        break;
      case "account_number":
        schema.accountNumber = f.required ? v.accountNumber() : v.optional(v.accountNumber());
        inputAlias.accountNumber = body.accountNumber;
        break;
      case "routing_number_aba":
        schema.routingNumberAba = f.required ? v.routingNumber() : v.optional(v.routingNumber());
        inputAlias.routingNumberAba = (body as any).routingNumberAba ?? (body as any).routingNumber;
        break;
      case "sort_code_uk":
        schema.sortCodeUk = f.required ? v.sortCodeUk() : v.optional(v.sortCodeUk());
        inputAlias.sortCodeUk = body.sortCodeUk;
        break;
      case "bsb_au":
        schema.bsbAu = f.required ? v.bsbAu() : v.optional(v.bsbAu());
        inputAlias.bsbAu = body.bsbAu;
        break;
      case "ifsc_in":
        schema.ifscIn = f.required ? v.ifscIn() : v.optional(v.ifscIn());
        inputAlias.ifscIn = body.ifscIn;
        break;
      case "clabe_mx":
        schema.clabeMx = f.required ? v.clabeMx() : v.optional(v.clabeMx());
        inputAlias.clabeMx = body.clabeMx;
        break;
      case "transit_ca":
        schema.transitCa = f.required ? v.transitCa() : v.optional(v.transitCa());
        inputAlias.transitCa = body.transitCa;
        break;
      case "bank_code_generic":
        schema.bankCodeGeneric = f.required
          ? v.string({ min: 1, max: 20 })
          : v.optional(v.string({ max: 20 }));
        inputAlias.bankCodeGeneric = body.bankCodeGeneric;
        break;
      case "branch_code_generic":
        schema.branchCodeGeneric = f.required
          ? v.string({ min: 1, max: 20 })
          : v.optional(v.string({ max: 20 }));
        inputAlias.branchCodeGeneric = body.branchCodeGeneric;
        break;
      case "tax_id":
        if (country === "BR") {
          schema.taxId = f.required ? v.brTaxId() : v.optional(v.brTaxId());
        } else {
          schema.taxId = f.required
            ? v.string({ min: 3, max: 30 })
            : v.optional(v.string({ max: 30 }));
        }
        inputAlias.taxId = body.taxId;
        break;
      case "purpose_code":
        schema.purposeCodeRbi = f.required ? v.rbiPurposeCode() : v.optional(v.rbiPurposeCode());
        inputAlias.purposeCodeRbi = body.purposeCodeRbi;
        break;
    }
  }

  return validate<Record<string, string>>(inputAlias, schema);
}
