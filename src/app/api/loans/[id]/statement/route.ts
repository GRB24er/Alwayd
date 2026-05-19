// src/app/api/loans/[id]/statement/route.ts
// GET: produces a "Statement of Account" PDF for a given calendar month.
// Owner-only (admins can also fetch via the same handler). Calculates
// opening balance, payments received, interest accrued, principal repaid,
// closing balance, and lists the next three upcoming payments.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import User from '@/models/User';
import { generateLoanDocument, LoanStatementData, LoanStatementPayment, LoanStatementUpcoming } from '@/lib/loanDocuments';

export const runtime = 'nodejs';

function buildBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return host ? `${proto}://${host}` : 'https://aldwycheuropeancapital.com';
}

function parsePeriod(input: string | null): { start: Date; end: Date; label: string } {
  // Accepts YYYY-MM (e.g. 2026-05). Falls back to current month.
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-11
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    const [y, m] = input.split('-').map(Number);
    if (y >= 1970 && m >= 1 && m <= 12) {
      year = y;
      month = m - 1;
    }
  }
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - 1);
  const label = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { start, end, label };
}

function inPeriod(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    await connectDB();

    const me = await User.findById(session.user.id).select('role name email');
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const loan = await Loan.findById(id).populate('userId', 'name email');
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const isOwner = String((loan.userId as any)?._id || loan.userId) === String(session.user.id);
    const isAdmin = me.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['disbursed', 'active', 'closed'].includes(loan.status)) {
      return NextResponse.json(
        { error: 'Statements are only available once a loan is disbursed.' },
        { status: 409 }
      );
    }
    if (!loan.schedule || loan.schedule.length === 0) {
      return NextResponse.json({ error: 'This loan has no repayment schedule.' }, { status: 409 });
    }

    const { searchParams } = new URL(req.url);
    const { start, end, label } = parsePeriod(searchParams.get('period'));

    // Schedule rows whose due date falls in the period.
    const scheduleInPeriod = loan.schedule.filter((r) => inPeriod(new Date(r.dueDate), start, end));

    // Opening balance = the balance carried into the period. Use the
    // pre-payment balance of the first row in the period (i.e. balance
    // of the previous row, or original principal for period 1).
    let openingBalance = loan.amount;
    if (scheduleInPeriod.length > 0) {
      const firstInPeriod = scheduleInPeriod[0];
      const previous = loan.schedule.find((r) => r.period === firstInPeriod.period - 1);
      openingBalance = previous ? previous.balance : loan.amount;
    }

    // Closing balance = the balance after the last row in the period
    // (or unchanged opening balance if no rows are in this period).
    const closingBalance = scheduleInPeriod.length > 0
      ? scheduleInPeriod[scheduleInPeriod.length - 1].balance
      : openingBalance;

    // Payments received in the period (paid rows with paidAt in period).
    const paymentsReceived: LoanStatementPayment[] = loan.schedule
      .filter((r) => r.paid && r.paidAt && inPeriod(new Date(r.paidAt), start, end))
      .map((r) => ({
        period: r.period,
        paidAt: new Date(r.paidAt as Date),
        amount: r.payment,
      }));

    // Interest accrued = sum of interest for rows whose due date is in
    // the period.
    const interestAccrued = Math.round(scheduleInPeriod.reduce((s, r) => s + r.interest, 0) * 100) / 100;
    const principalRepaid = Math.round(
      loan.schedule
        .filter((r) => r.paid && r.paidAt && inPeriod(new Date(r.paidAt), start, end))
        .reduce((s, r) => s + r.principal, 0) * 100
    ) / 100;

    // Next 3 upcoming unpaid payments after the period end.
    const upcoming: LoanStatementUpcoming[] = loan.schedule
      .filter((r) => !r.paid && new Date(r.dueDate).getTime() > end.getTime())
      .slice(0, 3)
      .map((r) => ({ period: r.period, dueDate: new Date(r.dueDate), payment: r.payment, balance: r.balance }));

    const nextRow = loan.schedule.find((r) => !r.paid);
    const statement: LoanStatementData = {
      periodLabel: label,
      periodStart: start,
      periodEnd: end,
      openingBalance: Math.round(openingBalance * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      paymentsReceived,
      interestAccrued,
      principalRepaid,
      nextPaymentDue: nextRow ? new Date(nextRow.dueDate) : undefined,
      nextPaymentAmount: nextRow ? nextRow.payment : undefined,
      upcoming,
    };

    const applicant = loan.userId as unknown as { name: string };
    const baseUrl = buildBaseUrl(req);

    const pdf = await generateLoanDocument({
      referenceNumber: loan.referenceNumber,
      documentType: 'statement',
      borrowerName: applicant?.name || 'Borrower',
      loanType: loan.type,
      amount: loan.amount,
      termMonths: loan.term,
      interestRate: loan.interestRate,
      monthlyPayment: loan.monthlyPayment,
      totalRepayable: loan.totalRepayable,
      issuedAt: new Date(),
      statement,
      verificationUrl: `${baseUrl}/verify/${encodeURIComponent(loan.referenceNumber)}`,
    });

    const periodSlug = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const filename = `Aldwych-statement-${loan.referenceNumber}-${periodSlug}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/loans/[id]/statement error:', error);
    return NextResponse.json({ error: 'Failed to generate statement' }, { status: 500 });
  }
}
