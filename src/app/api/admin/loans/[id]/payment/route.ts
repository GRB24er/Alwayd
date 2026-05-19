// src/app/api/admin/loans/[id]/payment/route.ts
// Admin posts a payment received against an active loan. Marks the
// next outstanding schedule row paid, decrements remainingBalance,
// rolls nextPaymentDate forward, and closes the loan when fully paid.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import { sendSimpleEmail } from '@/lib/mail';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const me = await User.findById(session.user.id);
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const amountIn = Number(body?.amount);
    const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();
    const noteFromAdmin = String(body?.note || '').trim().slice(0, 500);
    const reference = String(body?.reference || '').trim().slice(0, 80);

    if (!amountIn || isNaN(amountIn) || amountIn <= 0) {
      return NextResponse.json({ error: 'A positive payment amount is required.' }, { status: 400 });
    }

    const loan = await Loan.findById(id).populate('userId', 'name email');
    if (!loan) return NextResponse.json({ error: 'Loan not found.' }, { status: 404 });

    if (!['disbursed', 'active'].includes(loan.status)) {
      return NextResponse.json(
        { error: 'Payments can only be posted against active/disbursed loans.' },
        { status: 409 }
      );
    }
    if (!loan.schedule || loan.schedule.length === 0) {
      return NextResponse.json({ error: 'This loan has no schedule.' }, { status: 409 });
    }

    const nextRow = loan.schedule.find((r) => !r.paid);
    if (!nextRow) {
      return NextResponse.json({ error: 'No outstanding payments — loan is fully repaid.' }, { status: 409 });
    }

    // Apply the payment: mark the next outstanding row paid, refresh
    // running balance, and move the next-payment-date pointer forward.
    nextRow.paid = true;
    nextRow.paidAt = paidAt;

    const remainingRows = loan.schedule.filter((r) => !r.paid);
    const newRemainingBalance = remainingRows.length > 0
      ? remainingRows[0].balance + remainingRows[0].principal // pre-payment balance for the next due row
      : 0;
    loan.remainingBalance = Math.max(0, Math.round(newRemainingBalance * 100) / 100);
    loan.nextPaymentDate = remainingRows.length > 0 ? remainingRows[0].dueDate : undefined;

    // Transition to 'active' once at least one payment is posted, and to
    // 'closed' if everything is paid off.
    if (loan.status === 'disbursed') loan.status = 'active';
    if (remainingRows.length === 0) {
      loan.status = 'closed';
      loan.closedAt = new Date();
      loan.remainingBalance = 0;
      loan.nextPaymentDate = undefined;
    }

    // Capture an internal admin note for this payment
    const noteLine = `[${fmtDate(paidAt)}] Payment posted: ${fmtEUR(amountIn)} (period ${nextRow.period}${reference ? `, ref ${reference}` : ''})${noteFromAdmin ? ` — ${noteFromAdmin}` : ''}`;
    loan.adminNotes = loan.adminNotes ? `${loan.adminNotes}\n${noteLine}` : noteLine;

    await loan.save();

    const applicant = loan.userId as unknown as { name: string; email: string };

    await writeAudit({
      event: loan.status === 'closed' ? 'loan.closed' : 'loan.disbursed',
      actorId: String(me._id),
      actorRole: 'admin',
      actorEmail: me.email,
      subjectId: String(loan._id),
      subjectType: 'loan',
      reference: loan.referenceNumber,
      payload: {
        action: 'payment_posted',
        period: nextRow.period,
        amount: amountIn,
        paidAt,
        reference: reference || null,
        remainingBalance: loan.remainingBalance,
        loanClosed: loan.status === 'closed',
      },
      request: req,
    });

    // Receipt email
    const subject = loan.status === 'closed'
      ? `Loan Fully Repaid — ${loan.referenceNumber}`
      : `Payment Received — ${loan.referenceNumber}`;
    const message = loan.status === 'closed'
      ? `Your final payment of ${fmtEUR(amountIn)} has been received and your facility is now fully repaid. Thank you for banking with us.`
      : `We have received your payment of ${fmtEUR(amountIn)} towards period ${nextRow.period}. Your outstanding balance is now ${fmtEUR(loan.remainingBalance || 0)}, and your next payment of ${fmtEUR(remainingRows[0]?.payment || 0)} is due on ${remainingRows[0]?.dueDate ? fmtDate(new Date(remainingRows[0].dueDate)) : 'TBC'}.`;

    sendSimpleEmail(
      applicant.email,
      subject,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d2440; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #c9a962; margin: 0;">${loan.status === 'closed' ? 'Facility Repaid in Full' : 'Payment Received'}</h2>
        </div>
        <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="color: #0d2440;">Dear ${applicant.name},</p>
          <p style="color: #475569;">${message}</p>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Reference</td><td style="padding: 6px 0; font-weight: 700; color: #0d2440;">${loan.referenceNumber}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Amount Received</td><td style="padding: 6px 0; color: #0d2440;">${fmtEUR(amountIn)}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Period</td><td style="padding: 6px 0; color: #0d2440;">${nextRow.period}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Posted</td><td style="padding: 6px 0; color: #0d2440;">${fmtDate(paidAt)}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Outstanding Balance</td><td style="padding: 6px 0; color: #0d2440;">${fmtEUR(loan.remainingBalance || 0)}</td></tr>
            </table>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Aldwych European Capital — support@aldwycheuropeancapital.com</p>
        </div>
      </div>
      `
    ).catch((e) => console.warn('[payment] receipt email failed:', e));

    return NextResponse.json({
      success: true,
      loan: {
        _id: String(loan._id),
        status: loan.status,
        remainingBalance: loan.remainingBalance,
        nextPaymentDate: loan.nextPaymentDate,
        closedAt: loan.closedAt,
        period: nextRow.period,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/loans/[id]/payment error:', error);
    return NextResponse.json({ error: 'Failed to post payment' }, { status: 500 });
  }
}
