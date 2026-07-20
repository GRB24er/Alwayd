import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import TrustAccount from '@/models/TrustAccount';
import User from '@/models/User';
import {
  generateTrustReference,
  buildDistributions,
  fundTrust,
  sendTrustEstablishedEmail,
} from '@/lib/trustEngine';
import { isSupportedCurrency, normalizeCurrency } from '@/lib/currency';

export const runtime = 'nodejs';

const VALID_ACCOUNTS = ['checking', 'savings', 'investment'] as const;

// GET - list the current user's trusts (as settlor, and as beneficiary)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const [asSettlor, asBeneficiary] = await Promise.all([
      TrustAccount.find({ settlorUserId: session.user.id }).sort({ createdAt: -1 }).limit(100).lean(),
      TrustAccount.find({ beneficiaryUserId: session.user.id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    return NextResponse.json({ success: true, asSettlor, asBeneficiary });
  } catch (error) {
    console.error('GET /api/trusts error:', error);
    return NextResponse.json({ error: 'Failed to fetch trusts' }, { status: 500 });
  }
}

// POST - create and fund a new inheritance trust
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      trustName,
      beneficiaryName,
      beneficiaryDateOfBirth,
      beneficiaryRelationship,
      beneficiaryEmail,
      principalAmount,
      fundingAccount,
      revocable,
      projectedGrowthRate,
      letterOfWishes,
      distributions,
      currency,
    } = body || {};

    // Currency is optional; if provided it must be supported.
    if (currency !== undefined && !isSupportedCurrency(currency)) {
      return NextResponse.json({ error: 'Unsupported currency.' }, { status: 400 });
    }

    // ----- Validation -----
    if (!trustName || String(trustName).trim().length < 2) {
      return NextResponse.json({ error: 'Please give the trust a name.' }, { status: 400 });
    }
    if (!beneficiaryName || String(beneficiaryName).trim().length < 2) {
      return NextResponse.json({ error: 'Beneficiary name is required.' }, { status: 400 });
    }
    const dob = beneficiaryDateOfBirth ? new Date(beneficiaryDateOfBirth) : null;
    if (!dob || isNaN(dob.getTime()) || dob.getTime() > Date.now()) {
      return NextResponse.json({ error: 'A valid beneficiary date of birth is required.' }, { status: 400 });
    }
    const amount = Number(principalAmount);
    if (!amount || isNaN(amount) || amount < 1000) {
      return NextResponse.json({ error: 'Minimum amount to place in trust is 1,000.' }, { status: 400 });
    }
    const account = VALID_ACCOUNTS.includes(fundingAccount) ? fundingAccount : 'savings';

    if (!Array.isArray(distributions) || distributions.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one distribution rule (e.g. release at a certain age).' },
        { status: 400 }
      );
    }
    // Validate each tranche and that percentages sum to 100.
    let pctTotal = 0;
    for (const d of distributions) {
      const pct = Number(d?.percentage);
      if (!pct || pct <= 0 || pct > 100) {
        return NextResponse.json({ error: 'Each distribution needs a percentage between 1 and 100.' }, { status: 400 });
      }
      pctTotal += pct;
      if (d?.triggerType === 'date') {
        const when = d?.triggerDate ? new Date(d.triggerDate) : null;
        if (!when || isNaN(when.getTime())) {
          return NextResponse.json({ error: 'A date-triggered distribution needs a valid date.' }, { status: 400 });
        }
      } else {
        const age = Number(d?.triggerAge);
        if (!age || age < 0 || age > 120) {
          return NextResponse.json({ error: 'An age-triggered distribution needs an age between 0 and 120.' }, { status: 400 });
        }
      }
    }
    if (Math.round(pctTotal) !== 100) {
      return NextResponse.json({ error: 'Distribution percentages must add up to 100%.' }, { status: 400 });
    }

    await connectDB();

    const settlor = await User.findById(session.user.id).select('name email displayCurrency');
    if (!settlor) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Chosen currency, else the settlor's account preference, else the default.
    const trustCurrency = currency
      ? normalizeCurrency(currency)
      : normalizeCurrency((settlor as any).displayCurrency);

    // Link the beneficiary to an existing customer if the email matches, so
    // distributions can credit them directly.
    let beneficiaryUserId: any = null;
    const beneEmail = beneficiaryEmail ? String(beneficiaryEmail).trim().toLowerCase() : undefined;
    if (beneEmail) {
      const match = await User.findOne({ email: beneEmail }).select('_id');
      if (match) beneficiaryUserId = match._id;
    }

    const trust = new TrustAccount({
      referenceNumber: generateTrustReference(),
      settlorUserId: settlor._id,
      settlorName: settlor.name,
      settlorEmail: settlor.email,
      beneficiaryName: String(beneficiaryName).trim(),
      beneficiaryDateOfBirth: dob,
      beneficiaryRelationship: beneficiaryRelationship ? String(beneficiaryRelationship).trim() : undefined,
      beneficiaryEmail: beneEmail,
      beneficiaryUserId,
      trustName: String(trustName).trim(),
      currency: trustCurrency,
      principalAmount: amount,
      fundingAccount: account,
      heldBalance: 0,
      revocable: revocable !== false,
      projectedGrowthRate: projectedGrowthRate ? Number(projectedGrowthRate) : undefined,
      letterOfWishes: letterOfWishes ? String(letterOfWishes).slice(0, 4000) : undefined,
      distributions: buildDistributions(dob, distributions),
      status: 'pending',
    });

    // Fund immediately: ring-fence the principal from the settlor's account.
    // If funds are insufficient this throws before the trust is persisted as
    // active, so we surface a clean 400.
    try {
      await fundTrust(trust);
    } catch (fundErr: any) {
      return NextResponse.json({ error: fundErr?.message || 'Unable to fund trust.' }, { status: 400 });
    }

    // Fire-and-forget: generates the deed, certificate and receipt PDFs and
    // emails them to the settlor.
    sendTrustEstablishedEmail(trust).catch((e: unknown) =>
      console.error('Trust confirmation email failed:', e)
    );

    return NextResponse.json({ success: true, trust });
  } catch (error) {
    console.error('POST /api/trusts error:', error);
    return NextResponse.json({ error: 'Failed to create trust' }, { status: 500 });
  }
}
