// src/app/api/statements/send/route.ts
// Sends a statement the customer requested, from the admin console's queue.
//
// The statement itself is built by @/lib/statementEmail, shared with the manual
// send. That module also carries the fix for the maths this route used to do:
// it filtered transactions on the types 'credit' and 'debit', which are not
// members of TxType, so every statement reported zero credits, zero debits and
// labelled every line a withdrawal — over a hardcoded opening balance of 5000.

import { NextRequest, NextResponse } from 'next/server';
import Statement from '@/models/Statement';
import { sendSimpleEmail } from '@/lib/mail';
import { requireAdmin } from '@/lib/statementAuth';
import { buildStatement, type StatementAccountType } from '@/lib/statementEmail';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let statement: any = null;
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
    }

    statement = await Statement.findById(requestId).populate(
      'userId',
      'name email displayCurrency checkingBalance savingsBalance investmentBalance'
    );

    if (!statement) {
      return NextResponse.json({ success: false, error: 'Statement not found' }, { status: 404 });
    }
    if (statement.status === 'sent') {
      return NextResponse.json({ success: false, error: 'Statement already sent' }, { status: 400 });
    }
    if (!statement.userId?.email) {
      return NextResponse.json(
        { success: false, error: 'That request has no customer attached' },
        { status: 409 }
      );
    }

    // Cover the whole of the last day of the period.
    const endDate = new Date(statement.endDate);
    endDate.setHours(23, 59, 59, 999);

    const built = await buildStatement({
      user: statement.userId,
      accountType: statement.accountType as StatementAccountType,
      startDate: new Date(statement.startDate),
      endDate,
    });

    await sendSimpleEmail(statement.userId.email, built.subject, built.text, built.html);

    statement.status = 'sent';
    statement.sentAt = new Date();
    statement.errorMessage = undefined;
    await statement.save();

    await audit({
      action: 'admin.statement_sent',
      actorId: gate.admin?._id?.toString(),
      actorEmail: gate.admin?.email,
      outcome: 'success',
      request: req,
      resourceId: statement._id.toString(),
      details: {
        customer: statement.userId.email,
        accountType: statement.accountType,
        statementNumber: built.statementNumber,
        transactionCount: built.transactionCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Statement ${built.statementNumber} sent to ${statement.userId.email}`,
      statementNumber: built.statementNumber,
      transactionCount: built.transactionCount,
    });
  } catch (error: any) {
    console.error('POST /api/statements/send error:', error);
    // Record the failure so the console's "failed" filter is not always empty.
    if (statement && statement.status !== 'sent') {
      statement.status = 'failed';
      statement.errorMessage = String(error?.message || error).slice(0, 500);
      await statement.save().catch(() => {});
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send statement' },
      { status: 500 }
    );
  }
}
