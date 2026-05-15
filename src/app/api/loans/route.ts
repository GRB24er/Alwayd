import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import { sendSimpleEmail } from '@/lib/mail';

export const runtime = 'nodejs';

const VALID_TYPES = [
  'personal',
  'mortgage',
  'auto',
  'business',
  'student',
  'contractor',
  'sme',
  'trade',
  'equipment',
] as const;

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AEC-${ts}-${rand}`;
}

// GET - list current user's loan applications
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const loans = await Loan.find({ userId: session.user.id })
      .sort({ applicationDate: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ success: true, loans });
  } catch (error) {
    console.error('GET /api/loans error:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

// POST - create a new loan application
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      amount,
      purpose,
      term,
      businessName,
      businessType,
      yearsInBusiness,
      annualRevenue,
      annualProfit,
      existingDebt,
      collateral,
      collateralValue,
      employmentStatus,
      annualIncome,
      creditScore,
      kycData,
    } = body || {};

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid loan type.' }, { status: 400 });
    }
    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt < 1000) {
      return NextResponse.json({ error: 'Minimum loan amount is €1,000.' }, { status: 400 });
    }
    if (!purpose || String(purpose).trim().length < 4) {
      return NextResponse.json({ error: 'Please describe the purpose of the loan.' }, { status: 400 });
    }
    const months = Number(term) || 36;

    await connectDB();

    const applicant = await User.findById(session.user.id).select('name email');
    if (!applicant) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const loan = await Loan.create({
      userId: session.user.id,
      referenceNumber: generateReference(),
      type,
      amount: amt,
      purpose: String(purpose).trim(),
      term: months,
      status: 'pending',
      applicationDate: new Date(),
      businessName,
      businessType,
      yearsInBusiness,
      annualRevenue: annualRevenue ? Number(annualRevenue) : undefined,
      annualProfit: annualProfit ? Number(annualProfit) : undefined,
      existingDebt: existingDebt ? Number(existingDebt) : undefined,
      collateral,
      collateralValue: collateralValue ? Number(collateralValue) : undefined,
      employmentStatus,
      annualIncome: annualIncome ? Number(annualIncome) : undefined,
      creditScore,
      kycData,
    });

    // Fire-and-forget confirmation email
    sendSimpleEmail(
      applicant.email,
      `Application Received — ${loan.referenceNumber}`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d2440; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #c9a962; margin: 0;">Application Received</h2>
        </div>
        <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="color: #0d2440;">Dear ${applicant.name},</p>
          <p style="color: #475569;">
            Thank you for submitting your loan application to Aldwych European Capital.
            Your application has been received and is now awaiting review by our underwriting team.
          </p>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Reference</td><td style="padding: 8px 0; font-weight: 700; color: #0d2440;">${loan.referenceNumber}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Amount</td><td style="padding: 8px 0; color: #0d2440;">€${amt.toLocaleString()}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Term</td><td style="padding: 8px 0; color: #0d2440;">${months} months</td></tr>
            </table>
          </div>
          <p style="color: #475569;">You can track the progress of your application from your dashboard at any time.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Aldwych European Capital — support@aldwycheuropeancapital.com</p>
        </div>
      </div>
      `
    ).catch((e: unknown) => console.error('Application email failed:', e));

    return NextResponse.json({ success: true, loan });
  } catch (error) {
    console.error('POST /api/loans error:', error);
    return NextResponse.json({ error: 'Failed to create loan application' }, { status: 500 });
  }
}
