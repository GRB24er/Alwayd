// src/lib/trustEngine.ts
// Business logic for inheritance / age-contingent trusts.
//
//   - reference generation
//   - resolving a distribution's vesting date (age applied to the beneficiary's
//     date of birth, or an explicit calendar date)
//   - funding a newly created trust (ring-fence the principal from the settlor)
//   - the maturity engine that releases matured tranches to the beneficiary
//   - cancelling a revocable trust and returning the remaining principal
//
// Money movements mirror the rest of the codebase: a Transaction row is written
// and the affected User rollup balance is updated in the same pass.

import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import TrustAccount, {
  ITrustAccount,
  ITrustDistribution,
  AccountBucket,
} from '@/models/TrustAccount';
import { sendSimpleEmail } from '@/lib/mail';
import {
  generateTrustDocument,
  TrustDocumentData,
  TrustDocumentType,
  TRUST_DOCUMENT_LABELS,
} from '@/lib/trustDocuments';
import { verificationUrlFor } from '@/lib/siteUrl';

const BALANCE_FIELD: Record<AccountBucket, 'checkingBalance' | 'savingsBalance' | 'investmentBalance'> = {
  checking: 'checkingBalance',
  savings: 'savingsBalance',
  investment: 'investmentBalance',
};

export function generateTrustReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRB-${ts}-${rand}`;
}

export function generateTrustPayoutReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRP-${ts}-${rand}`;
}

// Round to cents to avoid floating-point drift on money.
function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Maps a trust record into the data a trustee document needs. `extra` carries
// document-specific fields (e.g. the tranche for a distribution statement).
export function buildTrustDocumentData(
  trust: ITrustAccount,
  documentType: TrustDocumentType,
  extra?: Partial<TrustDocumentData>
): TrustDocumentData {
  return {
    referenceNumber: trust.referenceNumber,
    documentType,
    issuedAt: new Date(),
    verificationUrl: verificationUrlFor(trust.referenceNumber),
    trustName: trust.trustName,
    settlorName: trust.settlorName,
    settlorEmail: trust.settlorEmail,
    beneficiaryName: trust.beneficiaryName,
    beneficiaryDateOfBirth: trust.beneficiaryDateOfBirth,
    beneficiaryRelationship: trust.beneficiaryRelationship,
    currency: trust.currency || 'USD',
    principalAmount: trust.principalAmount,
    heldBalance: trust.heldBalance,
    fundingAccount: trust.fundingAccount,
    revocable: trust.revocable,
    distributions: trust.distributions.map((d) => ({
      label: d.label,
      triggerType: d.triggerType,
      triggerAge: d.triggerAge,
      triggerDate: d.triggerDate,
      percentage: d.percentage,
      status: d.status,
      releasedAmount: d.releasedAmount,
      releasedAt: d.releasedAt,
    })),
    fundedAt: trust.fundedAt,
    fundingReference: trust.fundingReference,
    letterOfWishes: trust.letterOfWishes,
    completedAt: trust.completedAt,
    cancelledAt: trust.cancelledAt,
    cancellationReason: trust.cancellationReason,
    ...extra,
  };
}

async function trustDocAttachment(
  trust: ITrustAccount,
  documentType: TrustDocumentType,
  extra?: Partial<TrustDocumentData>
): Promise<{ filename: string; content: Uint8Array } | null> {
  try {
    const pdf = await generateTrustDocument(buildTrustDocumentData(trust, documentType, extra));
    return {
      filename: `Aldwych-${documentType}-${trust.referenceNumber}.pdf`,
      content: pdf,
    };
  } catch (e) {
    console.error(`Failed to generate ${documentType} for ${trust.referenceNumber}:`, e);
    return null;
  }
}

// Add whole years to a date, clamping 29 Feb -> 28 Feb on non-leap years.
function addYears(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  const targetYear = d.getFullYear() + years;
  d.setFullYear(targetYear);
  // If the month rolled over (e.g. Feb 29 -> Mar 1), pull back to end of Feb.
  if (d.getMonth() !== date.getMonth()) {
    d.setDate(0);
  }
  return d;
}

// The calendar date a distribution tranche vests on.
export function resolveTriggerDate(
  trust: Pick<ITrustAccount, 'beneficiaryDateOfBirth'>,
  dist: ITrustDistribution
): Date | null {
  if (dist.triggerType === 'date') {
    return dist.triggerDate ? new Date(dist.triggerDate) : null;
  }
  if (dist.triggerType === 'age' && typeof dist.triggerAge === 'number') {
    return addYears(new Date(trust.beneficiaryDateOfBirth), dist.triggerAge);
  }
  return null;
}

// Normalise distributions coming from a client into stored tranches: resolve
// age triggers to concrete dates and default status to scheduled.
export function buildDistributions(
  beneficiaryDateOfBirth: Date,
  input: Array<Partial<ITrustDistribution>>
): ITrustDistribution[] {
  return input.map((raw, i) => {
    const triggerType: ITrustDistribution['triggerType'] = raw.triggerType === 'date' ? 'date' : 'age';
    const dist: ITrustDistribution = {
      label: (raw.label && String(raw.label).trim()) || `Tranche ${i + 1}`,
      triggerType,
      triggerAge: triggerType === 'age' ? Number(raw.triggerAge) : undefined,
      triggerDate: triggerType === 'date' && raw.triggerDate ? new Date(raw.triggerDate) : undefined,
      percentage: Number(raw.percentage) || 0,
      status: 'scheduled',
      note: raw.note ? String(raw.note).slice(0, 500) : undefined,
    };
    // Freeze the concrete vesting date now so schedules are stable & auditable.
    const resolved = resolveTriggerDate({ beneficiaryDateOfBirth } as ITrustAccount, dist);
    if (resolved) dist.triggerDate = resolved;
    return dist;
  });
}

// ---------------------------------------------------------------------------
// Funding: debit the settlor's chosen account and ring-fence the principal.
// Throws on insufficient funds. Call inside the create handler.
// ---------------------------------------------------------------------------
export async function fundTrust(trust: ITrustAccount): Promise<void> {
  const settlor: any = await User.findById(trust.settlorUserId);
  if (!settlor) throw new Error('Settlor not found');

  const field = BALANCE_FIELD[trust.fundingAccount];
  const current = Number(settlor[field] || 0);
  if (trust.principalAmount > current) {
    throw new Error('Insufficient funds in the selected account to fund this trust');
  }

  const reference = generateTrustPayoutReference();
  settlor[field] = money(current - trust.principalAmount);
  await settlor.save();

  await Transaction.create({
    userId: settlor._id,
    type: 'transfer-out',
    currency: trust.currency || 'USD',
    amount: trust.principalAmount,
    date: new Date(),
    description: `Trust funding — ${trust.trustName} (${trust.referenceNumber})`,
    status: 'completed',
    posted: true,
    postedAt: new Date(),
    accountType: trust.fundingAccount,
    reference,
    category: 'trust',
    channel: 'trust',
  });

  trust.heldBalance = trust.principalAmount;
  trust.fundedAt = new Date();
  trust.activatedAt = new Date();
  trust.status = 'active';
  trust.fundingReference = reference;
  await trust.save();
}

// ---------------------------------------------------------------------------
// Maturity engine: release any tranche whose trigger date has arrived.
// Safe to run repeatedly (idempotent per tranche via the `status` guard).
// ---------------------------------------------------------------------------
interface ReleaseSummary {
  processedTrusts: number;
  releasedTranches: number;
  totalReleased: number;
  errors: string[];
}

export async function runTrustDistributions(now: Date = new Date()): Promise<ReleaseSummary> {
  await connectDB();

  const summary: ReleaseSummary = {
    processedTrusts: 0,
    releasedTranches: 0,
    totalReleased: 0,
    errors: [],
  };

  const trusts = await TrustAccount.find({
    status: { $in: ['active', 'distributing'] },
    'distributions.status': 'scheduled',
  });

  for (const trust of trusts) {
    try {
      const changed = await releaseDueTranches(trust, now, summary);
      if (changed) summary.processedTrusts += 1;
    } catch (err: any) {
      summary.errors.push(`${trust.referenceNumber}: ${err?.message || err}`);
    }
  }

  return summary;
}

async function releaseDueTranches(
  trust: ITrustAccount,
  now: Date,
  summary: ReleaseSummary
): Promise<boolean> {
  let changed = false;

  // Determine which scheduled tranches are due, in chronological order.
  const dueIndexes = trust.distributions
    .map((d, i) => ({ d, i, when: resolveTriggerDate(trust, d) }))
    .filter((x) => x.d.status === 'scheduled' && x.when && x.when.getTime() <= now.getTime())
    .sort((a, b) => (a.when!.getTime() - b.when!.getTime()));

  for (const { d, i } of dueIndexes) {
    const remainingScheduled = trust.distributions.filter((t) => t.status === 'scheduled').length;
    // Last scheduled tranche sweeps whatever principal remains, so rounding
    // never leaves a few cents stranded in the trust.
    let amount =
      remainingScheduled === 1
        ? money(trust.heldBalance)
        : money((trust.principalAmount * d.percentage) / 100);
    if (amount > trust.heldBalance) amount = money(trust.heldBalance);

    const reference = generateTrustPayoutReference();
    await payBeneficiary(trust, amount, reference);

    trust.distributions[i].status = 'released';
    trust.distributions[i].releasedAmount = amount;
    trust.distributions[i].releasedAt = now;
    trust.distributions[i].releaseReference = reference;
    trust.markModified('distributions');

    trust.heldBalance = money(trust.heldBalance - amount);
    changed = true;
    summary.releasedTranches += 1;
    summary.totalReleased += amount;
  }

  if (changed) {
    const anyScheduled = trust.distributions.some((t) => t.status === 'scheduled');
    if (!anyScheduled || trust.heldBalance <= 0) {
      trust.status = 'completed';
      trust.completedAt = now;
    } else {
      trust.status = 'distributing';
    }
    await trust.save();
    await notifyDistribution(trust).catch((e) =>
      console.error('Trust distribution email failed:', e)
    );
  }

  return changed;
}

// Credit the beneficiary. If they are an existing customer we credit their
// checking account and write a matching transaction; otherwise we record an
// external payout the trustee settles off-platform.
async function payBeneficiary(
  trust: ITrustAccount,
  amount: number,
  reference: string
): Promise<void> {
  if (trust.beneficiaryUserId) {
    const beneficiary: any = await User.findById(trust.beneficiaryUserId);
    if (beneficiary) {
      beneficiary.checkingBalance = money(Number(beneficiary.checkingBalance || 0) + amount);
      await beneficiary.save();

      await Transaction.create({
        userId: beneficiary._id,
        type: 'transfer-in',
        currency: trust.currency || 'USD',
        amount,
        date: new Date(),
        description: `Trust distribution — ${trust.trustName} (${trust.referenceNumber})`,
        status: 'completed',
        posted: true,
        postedAt: new Date(),
        accountType: 'checking',
        reference,
        category: 'trust',
        channel: 'trust',
      });
      return;
    }
  }

  // External beneficiary: record the payout against the settlor's trust so the
  // movement is traceable even though no in-platform account is credited.
  await Transaction.create({
    userId: trust.settlorUserId,
    type: 'transfer-out',
    currency: trust.currency || 'USD',
    amount,
    date: new Date(),
    description: `Trust distribution to ${trust.beneficiaryName} — ${trust.trustName} (${trust.referenceNumber})`,
    status: 'completed',
    posted: true,
    postedAt: new Date(),
    accountType: 'savings',
    reference,
    category: 'trust',
    channel: 'trust',
  });
}

// ---------------------------------------------------------------------------
// Cancellation: return the remaining principal to the settlor. Only permitted
// for revocable trusts that have not completed.
// ---------------------------------------------------------------------------
export async function cancelTrust(trust: ITrustAccount, reason: string): Promise<void> {
  if (!trust.revocable) {
    throw new Error('This trust is irrevocable and cannot be cancelled');
  }
  if (trust.status === 'completed' || trust.status === 'cancelled') {
    throw new Error(`Trust is already ${trust.status}`);
  }

  const refund = money(trust.heldBalance);
  if (refund > 0) {
    const settlor: any = await User.findById(trust.settlorUserId);
    if (settlor) {
      const field = BALANCE_FIELD[trust.fundingAccount];
      settlor[field] = money(Number(settlor[field] || 0) + refund);
      await settlor.save();

      await Transaction.create({
        userId: settlor._id,
        type: 'transfer-in',
        currency: trust.currency || 'USD',
        amount: refund,
        date: new Date(),
        description: `Trust cancellation refund — ${trust.trustName} (${trust.referenceNumber})`,
        status: 'completed',
        posted: true,
        postedAt: new Date(),
        accountType: trust.fundingAccount,
        reference: generateTrustPayoutReference(),
        category: 'trust',
        channel: 'trust',
      });
    }
  }

  trust.heldBalance = 0;
  trust.status = 'cancelled';
  trust.cancelledAt = new Date();
  trust.cancellationReason = reason;
  await trust.save();

  await notifyRevocation(trust, refund).catch((e) =>
    console.error('Trust revocation email failed:', e)
  );
}

async function notifyDistribution(trust: ITrustAccount): Promise<void> {
  const released = trust.distributions.filter((d) => d.status === 'released');
  const last = released[released.length - 1];
  if (!last) return;

  const amountStr = `${trust.currency} ${Number(last.releasedAmount || 0).toLocaleString()}`;
  const subject = `Trust distribution released — ${trust.trustName}`;
  const html = `
    <p>A scheduled distribution from <strong>${trust.trustName}</strong>
    (${trust.referenceNumber}) has been released. The formal distribution
    statement is attached.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#64748b;">Beneficiary</td><td style="padding:6px 0;font-weight:600;">${trust.beneficiaryName}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Tranche</td><td style="padding:6px 0;">${last.label}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Amount released</td><td style="padding:6px 0;font-weight:600;">${amountStr}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Remaining in trust</td><td style="padding:6px 0;">${trust.currency} ${trust.heldBalance.toLocaleString()}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="padding:6px 0;">${trust.status}</td></tr>
    </table>
  `;
  const text = `A distribution of ${amountStr} from ${trust.trustName} (${trust.referenceNumber}) has been released to ${trust.beneficiaryName}.`;

  const recipients = [trust.settlorEmail, trust.beneficiaryEmail].filter(Boolean) as string[];
  if (!recipients.length) return;

  const attachments: Array<{ filename: string; content: Uint8Array }> = [];
  const statement = await trustDocAttachment(trust, 'distribution_statement', {
    releasedTranche: {
      label: last.label,
      amount: Number(last.releasedAmount || 0),
      releasedAt: last.releasedAt || new Date(),
      remainingBalance: trust.heldBalance,
    },
  });
  if (statement) attachments.push(statement);

  // When the trust has just completed, include the final accounting too.
  if (trust.status === 'completed') {
    const completion = await trustDocAttachment(trust, 'completion_statement');
    if (completion) attachments.push(completion);
  }

  await sendSimpleEmail(recipients, subject, text, html, attachments);
}

// Sent (fire-and-forget) when a trust is established, with the deed and the
// contribution receipt attached.
export async function sendTrustEstablishedEmail(trust: ITrustAccount): Promise<void> {
  const attachments: Array<{ filename: string; content: Uint8Array }> = [];
  for (const type of ['deed', 'certificate', 'funding_receipt'] as TrustDocumentType[]) {
    const doc = await trustDocAttachment(trust, type);
    if (doc) attachments.push(doc);
  }

  const scheduleHtml = trust.distributions
    .map((d) => {
      const trig = d.triggerType === 'age' ? `at age ${d.triggerAge}` : `on ${new Date(d.triggerDate as Date).toLocaleDateString()}`;
      return `${d.label} — ${d.percentage}% ${trig}`;
    })
    .join('<br>');

  const html = `
    <p>Dear ${trust.settlorName},</p>
    <p>Your inheritance trust <strong>${trust.trustName}</strong> has been established and funded.
    The Declaration of Trust, Certificate of Establishment and Contribution Receipt are attached.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#64748b;">Reference</td><td style="padding:6px 0;font-weight:600;">${trust.referenceNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Beneficiary</td><td style="padding:6px 0;">${trust.beneficiaryName}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Principal</td><td style="padding:6px 0;font-weight:600;">${trust.currency} ${trust.principalAmount.toLocaleString()}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Distributions</td><td style="padding:6px 0;">${scheduleHtml}</td></tr>
    </table>
    <p>Funds will be released automatically to the beneficiary as each milestone is reached.</p>
  `;
  const text = `Your trust "${trust.trustName}" (${trust.referenceNumber}) for ${trust.beneficiaryName} has been established and funded with ${trust.currency} ${trust.principalAmount.toLocaleString()}.`;

  const recipients = [trust.settlorEmail].filter(Boolean) as string[];
  if (recipients.length) {
    await sendSimpleEmail(recipients, `Trust established — ${trust.referenceNumber}`, text, html, attachments);
  }
}

// Sent when a revocable trust is cancelled, with the deed of revocation attached.
async function notifyRevocation(trust: ITrustAccount, refund: number): Promise<void> {
  const doc = await trustDocAttachment(trust, 'deed_of_revocation', { refundAmount: refund });
  const attachments = doc ? [doc] : undefined;
  const html = `
    <p>Dear ${trust.settlorName},</p>
    <p>Your trust <strong>${trust.trustName}</strong> (${trust.referenceNumber}) has been revoked.
    ${refund > 0 ? `The undistributed balance of ${trust.currency} ${refund.toLocaleString()} has been returned to your ${trust.fundingAccount} account.` : ''}
    The Deed of Revocation is attached.</p>
  `;
  const text = `Your trust "${trust.trustName}" (${trust.referenceNumber}) has been revoked.`;
  const recipients = [trust.settlorEmail].filter(Boolean) as string[];
  if (recipients.length) {
    await sendSimpleEmail(recipients, `Trust revoked — ${trust.referenceNumber}`, text, html, attachments);
  }
}
