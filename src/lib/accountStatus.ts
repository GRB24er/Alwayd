// Helpers around the User.accountStatus field. Every money-moving endpoint
// MUST call assertAccountActive() before touching balances; a frozen or
// blocked account is locked from outbound activity even if balance + KYC + limits
// would otherwise allow it.

import crypto from "crypto";
import connectDB from "./mongodb";
import User from "@/models/User";
import AccountRestriction, {
  IAccountRestriction,
  RestrictionAction,
  RestrictionReasonCategory,
  AffectedAccount,
} from "@/models/AccountRestriction";
import { audit } from "./audit";
import { logger } from "./logger";

const log = logger.child({ module: "accountStatus" });

export type AccountStatus = "active" | "frozen" | "blocked" | "closed";

// Returned by assertAccountActive: either ok, or a structured reason a money
// endpoint can pass straight to the response body.
export type AccountStatusAssertion =
  | { ok: true }
  | {
      ok: false;
      status: Exclude<AccountStatus, "active">;
      reasonCategory: RestrictionReasonCategory;
      reasonNote: string;
      referenceNumber: string;
      effectiveFrom: Date;
      effectiveUntil?: Date | null;
      documentUrl: string;
    };

const ACTION_TO_STATUS: Record<RestrictionAction, Exclude<AccountStatus, "active">> = {
  freeze: "frozen",
  block: "blocked",
  close: "closed",
};

// Generate a human-readable reference: prefix tied to action, year-month, 6 random hex chars.
// e.g. FRZ-202605-A3F7B2, BLK-202605-9D1E04, CLS-202605-7B2C8F.
export function makeRestrictionReference(action: RestrictionAction): string {
  const prefix = action === "freeze" ? "FRZ" : action === "block" ? "BLK" : "CLS";
  const ym = new Date().toISOString().slice(0, 7).replace("-", "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ym}-${rand}`;
}

// Get the user's currently-active restriction (if any). Active means status='active'
// AND (effectiveUntil is null OR effectiveUntil > now). If multiple are active for
// some reason, the most severe + most recent wins.
export async function getActiveRestriction(userId: string): Promise<IAccountRestriction | null> {
  const now = new Date();
  const rows = await AccountRestriction.find({
    userId,
    status: "active",
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .limit(10);
  if (rows.length === 0) return null;

  // Severity ordering: close > block > freeze
  const severity: Record<RestrictionAction, number> = { close: 3, block: 2, freeze: 1 };
  rows.sort((a, b) => {
    const s = (severity[b.action] || 0) - (severity[a.action] || 0);
    if (s !== 0) return s;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return rows[0];
}

export async function assertAccountActive(
  userId: string,
  accountType?: "checking" | "savings" | "investment"
): Promise<AccountStatusAssertion> {
  const active = await getActiveRestriction(userId);
  if (!active) return { ok: true };

  // If the restriction targets specific accounts and this transaction is on
  // a different one, allow it through.
  if (accountType && !active.affectedAccounts.includes("all") && !active.affectedAccounts.includes(accountType)) {
    return { ok: true };
  }

  return {
    ok: false,
    status: ACTION_TO_STATUS[active.action],
    reasonCategory: active.reasonCategory,
    reasonNote: active.internalOnly
      ? "Account access is restricted. Please contact support."
      : active.reasonNote,
    referenceNumber: active.referenceNumber,
    effectiveFrom: active.effectiveFrom,
    effectiveUntil: active.effectiveUntil,
    documentUrl: `/api/accounts/restrictions/${active.referenceNumber}/document`,
  };
}

// Issue a new restriction. Creates the AccountRestriction row, supersedes any
// older active restriction of equal-or-lesser severity on the same accounts,
// and updates the denormalized User.accountStatus field.
export async function issueRestriction(opts: {
  userId: string;
  action: RestrictionAction;
  reasonCategory: RestrictionReasonCategory;
  reasonNote: string;
  legalBasis?: string;
  affectedAccounts?: AffectedAccount[];
  effectiveFrom?: Date;
  effectiveUntil?: Date | null;
  internalOnly?: boolean;
  issuedById: string;
  issuedByEmail: string;
  issuedByName: string;
  issuedByTitle?: string;
}): Promise<IAccountRestriction> {
  await connectDB();

  const reference = makeRestrictionReference(opts.action);

  // Mark any existing active restrictions of equal-or-lesser severity as superseded.
  const severity = { freeze: 1, block: 2, close: 3 } as const;
  const sevThreshold = severity[opts.action];
  const existingActive = await AccountRestriction.find({
    userId: opts.userId,
    status: "active",
  });
  for (const r of existingActive) {
    if ((severity[r.action] || 0) <= sevThreshold) {
      r.status = "superseded";
      await r.save();
    }
  }

  const restriction = await AccountRestriction.create({
    userId: opts.userId,
    referenceNumber: reference,
    action: opts.action,
    status: "active",
    reasonCategory: opts.reasonCategory,
    reasonNote: opts.reasonNote,
    legalBasis: opts.legalBasis,
    affectedAccounts: opts.affectedAccounts && opts.affectedAccounts.length > 0
      ? opts.affectedAccounts
      : ["all"],
    effectiveFrom: opts.effectiveFrom || new Date(),
    effectiveUntil: opts.effectiveUntil ?? null,
    internalOnly: !!opts.internalOnly,
    issuedById: opts.issuedById,
    issuedByEmail: opts.issuedByEmail,
    issuedByName: opts.issuedByName,
    issuedByTitle: opts.issuedByTitle,
  });

  // Sync the denormalized User field for fast reads.
  const newStatus = ACTION_TO_STATUS[opts.action];
  await User.updateOne(
    { _id: opts.userId },
    {
      $set: {
        accountStatus: newStatus,
        accountStatusReason: opts.reasonNote.slice(0, 500),
        accountStatusSetAt: new Date(),
        accountStatusRestrictionRef: reference,
      },
    }
  );

  await audit({
    action: "admin.balance_adjustment",
    actorId: opts.issuedById,
    actorEmail: opts.issuedByEmail,
    actorRole: "admin",
    targetUserId: opts.userId,
    outcome: "success",
    severity: opts.action === "close" ? "critical" : "warning",
    resourceId: reference,
    details: {
      operation: "issue_restriction",
      action: opts.action,
      reasonCategory: opts.reasonCategory,
      affectedAccounts: restriction.affectedAccounts,
      effectiveUntil: restriction.effectiveUntil,
    },
  });

  log.info("restriction.issued", {
    userId: opts.userId,
    reference,
    action: opts.action,
    reasonCategory: opts.reasonCategory,
  });

  return restriction;
}

export async function liftRestriction(opts: {
  restrictionId: string;
  liftedById: string;
  liftedByEmail: string;
  liftReason: string;
}): Promise<IAccountRestriction> {
  await connectDB();

  const r = await AccountRestriction.findById(opts.restrictionId);
  if (!r) throw Object.assign(new Error("Restriction not found"), { statusCode: 404 });
  if (r.status !== "active") {
    throw Object.assign(new Error(`Cannot lift a restriction in status ${r.status}`), {
      statusCode: 409,
    });
  }
  if (r.action === "close") {
    throw Object.assign(new Error("Closed accounts cannot be re-opened via lift; re-onboarding required"), {
      statusCode: 422,
    });
  }

  r.status = "lifted";
  r.liftedAt = new Date();
  r.liftedById = opts.liftedById as any;
  r.liftedByEmail = opts.liftedByEmail;
  r.liftReason = opts.liftReason;
  await r.save();

  // If no other active restriction remains for this user, set status back to active.
  const stillActive = await getActiveRestriction(r.userId.toString());
  if (!stillActive) {
    await User.updateOne(
      { _id: r.userId },
      {
        $set: { accountStatus: "active" },
        $unset: {
          accountStatusReason: "",
          accountStatusSetAt: "",
          accountStatusRestrictionRef: "",
        },
      }
    );
  } else {
    await User.updateOne(
      { _id: r.userId },
      {
        $set: {
          accountStatus: ACTION_TO_STATUS[stillActive.action],
          accountStatusReason: stillActive.reasonNote.slice(0, 500),
          accountStatusSetAt: stillActive.effectiveFrom,
          accountStatusRestrictionRef: stillActive.referenceNumber,
        },
      }
    );
  }

  await audit({
    action: "admin.balance_adjustment",
    actorId: opts.liftedById,
    actorEmail: opts.liftedByEmail,
    actorRole: "admin",
    targetUserId: r.userId.toString(),
    outcome: "success",
    resourceId: r.referenceNumber,
    details: { operation: "lift_restriction", liftReason: opts.liftReason },
  });

  log.info("restriction.lifted", {
    userId: r.userId.toString(),
    reference: r.referenceNumber,
  });
  return r;
}
