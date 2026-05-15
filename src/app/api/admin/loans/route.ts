import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import { sendSimpleEmail } from '@/lib/mail';

export const runtime = 'nodejs';

// GET - fetch all loan applications (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const query: Record<string, unknown> = {};
    if (status && status !== 'all') query.status = status;
    const loans = await Loan.find(query)
      .populate('userId', 'name email country')
      .sort({ applicationDate: -1 })
      .limit(200);
    return NextResponse.json({ success: true, loans });
  } catch (error) {
    console.error('Admin GET loans error:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

// PATCH - approve, reject, or update a loan application (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const body = await req.json();
    const { loanId, action, adminNotes, interestRate, approvedAmount, term, adminMessage } = body;
    if (!loanId || !action) {
      return NextResponse.json({ error: 'Loan ID and action are required.' }, { status: 400 });
    }
    const loan = await Loan.findById(loanId).populate('userId', 'name email');
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found.' }, { status: 404 });
    }
    const applicant = loan.userId as unknown as { name: string; email: string };

    if (action === 'approve') {
      const rate = interestRate || 4.9;
      const amount = approvedAmount || loan.amount;
      const months = term || loan.term;
      const monthlyRate = rate / 100 / 12;
      const monthly = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      const total = monthly * months;
      const offerExpiry = new Date();
      offerExpiry.setDate(offerExpiry.getDate() + 14);

      loan.status = 'approved';
      loan.approvedAt = new Date();
      loan.reviewedAt = new Date();
      loan.interestRate = rate;
      loan.amount = amount;
      loan.term = months;
      loan.monthlyPayment = Math.round(monthly * 100) / 100;
      loan.totalRepayable = Math.round(total * 100) / 100;
      loan.remainingBalance = amount;
      loan.offerExpiry = offerExpiry;
      if (adminNotes) loan.adminNotes = adminNotes;
      if (adminMessage) {
        if (!loan.messages) loan.messages = [];
        loan.messages.push({ from: 'admin', message: adminMessage, sentAt: new Date(), read: false });
      }
      await loan.save();

      // Email applicant
      await sendSimpleEmail(
        applicant.email,
        `Loan Application Approved — ${loan.referenceNumber}`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d2440; padding: 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #c9a962; margin: 0;">Loan Application Approved</h2>
          </div>
          <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
            <p style="color: #0d2440; font-size: 16px;">Dear ${applicant.name},</p>
            <p style="color: #475569;">We are pleased to inform you that your loan application has been <strong style="color: #10b981;">approved</strong>.</p>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Reference</td><td style="padding: 8px 0; font-weight: 700; color: #0d2440;">${loan.referenceNumber}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Approved Amount</td><td style="padding: 8px 0; font-weight: 700; color: #0d2440;">€${amount.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Interest Rate</td><td style="padding: 8px 0; color: #0d2440;">${rate}% APR</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Monthly Payment</td><td style="padding: 8px 0; color: #0d2440;">€${monthly.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Offer Valid Until</td><td style="padding: 8px 0; color: #0d2440;">${offerExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
              </table>
            </div>
            <p style="color: #475569;">Please log in to your dashboard to review and sign your loan agreement.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Aldwych European Capital — support@aldwycheuropeancapital.com</p>
          </div>
        </div>
        `
      );
    } else if (action === 'reject') {
      loan.status = 'rejected';
      loan.reviewedAt = new Date();
      if (adminNotes) loan.adminNotes = adminNotes;
      if (adminMessage) {
        if (!loan.messages) loan.messages = [];
        loan.messages.push({ from: 'admin', message: adminMessage, sentAt: new Date(), read: false });
      }
      await loan.save();

      await sendSimpleEmail(
        applicant.email,
        `Loan Application Update — ${loan.referenceNumber}`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d2440; padding: 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #c9a962; margin: 0;">Application Update</h2>
          </div>
          <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
            <p style="color: #0d2440;">Dear ${applicant.name},</p>
            <p style="color: #475569;">After careful review, we are unable to approve your current application (Ref: ${loan.referenceNumber}) at this time.</p>
            ${adminNotes ? `<p style="color: #475569;"><strong>Reason:</strong> ${adminNotes}</p>` : ''}
            <p style="color: #475569;">You are welcome to reapply in the future or contact our team to discuss alternative options.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Aldwych European Capital — support@aldwycheuropeancapital.com</p>
          </div>
        </div>
        `
      );
    } else if (action === 'under_review') {
      loan.status = 'under_review';
      loan.reviewedAt = new Date();
      if (adminNotes) loan.adminNotes = adminNotes;
      await loan.save();
    } else if (action === 'message') {
      if (!adminMessage) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
      if (!loan.messages) loan.messages = [];
      loan.messages.push({ from: 'admin', message: adminMessage, sentAt: new Date(), read: false });
      await loan.save();
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, loan });
  } catch (error) {
    console.error('Admin PATCH loan error:', error);
    return NextResponse.json({ error: 'Failed to update loan.' }, { status: 500 });
  }
}
