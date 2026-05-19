// src/app/api/loans/[id]/sign/route.ts
// Borrower signs the loan agreement. Persists the typed signature, the
// signing date, and the IP. Generates the amortization schedule on the
// first valid signing and moves the loan into the "disbursed" state.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import { buildAmortization } from '@/lib/amortization';
import { writeAudit } from '@/lib/audit';
import { sendSimpleEmail } from '@/lib/mail';

export const runtime = 'nodejs';

function clientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || undefined;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const body = await req.json();
    const signature = String(body?.signature || '').trim();
    if (!signature) {
      return NextResponse.json({ error: 'Signature is required.' }, { status: 400 });
    }
    if (signature.length < 3 || signature.length > 80) {
      return NextResponse.json({ error: 'Signature must be between 3 and 80 characters.' }, { status: 400 });
    }

    await connectDB();
    const loan = await Loan.findOne({ _id: id, userId: session.user.id }).populate('userId', 'name email');
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (loan.status === 'rejected') {
      return NextResponse.json({ error: 'This application was not approved.' }, { status: 409 });
    }
    if (!['approved'].includes(loan.status)) {
      return NextResponse.json(
        { error: 'This loan is not ready for signing. Status: ' + loan.status },
        { status: 409 }
      );
    }
    if (loan.offerExpiry && new Date(loan.offerExpiry).getTime() < Date.now()) {
      return NextResponse.json({ error: 'The offer has expired. Please contact your relationship manager.' }, { status: 410 });
    }
    if (!loan.interestRate) {
      return NextResponse.json({ error: 'Offer terms not finalised. Contact support.' }, { status: 409 });
    }

    const ip = clientIp(req);
    const now = new Date();

    // Generate the amortization schedule from the approved terms.
    const summary = buildAmortization({
      principal: loan.amount,
      annualRatePercent: loan.interestRate,
      termMonths: loan.term,
      startDate: now,
    });

    loan.agreementSignature = signature;
    loan.agreementSignedAt = now;
    loan.agreementIp = ip;
    loan.status = 'disbursed';
    loan.disbursedAt = now;
    loan.nextPaymentDate = summary.firstPaymentDate;
    loan.remainingBalance = loan.amount;
    loan.schedule = summary.schedule.map((r) => ({
      period: r.period,
      dueDate: r.dueDate,
      payment: r.payment,
      interest: r.interest,
      principal: r.principal,
      balance: r.balance,
      paid: false,
    }));

    await loan.save();

    const applicant = loan.userId as unknown as { name: string; email: string };

    // Audit log
    await writeAudit({
      event: 'loan.offer.signed',
      actorId: session.user.id,
      actorRole: 'user',
      actorEmail: applicant.email,
      subjectId: String(loan._id),
      subjectType: 'loan',
      reference: loan.referenceNumber,
      payload: { signature, ip, scheduleEntries: summary.schedule.length },
      request: req,
    });
    await writeAudit({
      event: 'loan.disbursed',
      actorId: session.user.id,
      actorRole: 'system',
      subjectId: String(loan._id),
      subjectType: 'loan',
      reference: loan.referenceNumber,
      payload: { firstPaymentDate: summary.firstPaymentDate, monthlyPayment: summary.monthlyPayment },
    });

    // Confirmation email
    sendSimpleEmail(
      applicant.email,
      `Agreement Executed — Funds On The Way · ${loan.referenceNumber}`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d2440; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #c9a962; margin: 0;">Agreement Executed</h2>
        </div>
        <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="color: #0d2440;">Dear ${applicant.name},</p>
          <p style="color: #475569;">Your loan agreement (Ref: <strong>${loan.referenceNumber}</strong>) has been executed and disbursement is now in progress. Funds will reach your nominated account within 1 business day.</p>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Reference</td><td style="padding: 6px 0; font-weight: 700; color: #0d2440;">${loan.referenceNumber}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Amount</td><td style="padding: 6px 0; color: #0d2440;">€${loan.amount.toLocaleString()}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Monthly Payment</td><td style="padding: 6px 0; color: #0d2440;">€${summary.monthlyPayment.toLocaleString()}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">First Payment Due</td><td style="padding: 6px 0; color: #0d2440;">${summary.firstPaymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Final Payment Due</td><td style="padding: 6px 0; color: #0d2440;">${summary.finalPaymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            </table>
          </div>
          <p style="color: #475569;">A copy of your executed agreement is available from your dashboard. The PDF carries our official seal and a QR code for third-party verification.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Aldwych European Capital — support@aldwycheuropeancapital.com</p>
        </div>
      </div>
      `
    ).catch((e) => console.warn('[loans/sign] disbursement email failed:', e));

    return NextResponse.json({
      success: true,
      loan: {
        _id: loan._id,
        referenceNumber: loan.referenceNumber,
        status: loan.status,
        nextPaymentDate: loan.nextPaymentDate,
        monthlyPayment: loan.monthlyPayment,
      },
      schedule: summary.schedule,
    });
  } catch (error) {
    console.error('POST /api/loans/[id]/sign error:', error);
    return NextResponse.json({ error: 'Failed to record signature' }, { status: 500 });
  }
}
