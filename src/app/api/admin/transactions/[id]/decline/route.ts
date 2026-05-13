// src/app/api/admin/transactions/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the transaction ID from params
    const { id: transactionId } = await params;
    const body = await req.json();

    const {
      reason,
      adminNotes,
      adminId
    } = body;
    
    // Find the transaction to reject
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Check if already processed
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: `Transaction already ${transaction.status}` },
        { status: 400 }
      );
    }
    
    // Find the user for this transaction
    const user = await User.findById(transaction.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this transaction' },
        { status: 404 }
      );
    }
    
    // Update transaction to rejected
    transaction.status = 'rejected';
    transaction.rejectedBy = adminId || session.user.email || 'admin';
    transaction.rejectedAt = new Date();
    transaction.rejectionReason = reason || 'Administrative review';
    transaction.adminNotes = adminNotes;
    await transaction.save();
    
    // Send rejection email
    if (user.email) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Transaction Rejected</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { margin-top: 20px; padding: 10px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Transaction Rejected</h1>
              </div>
              <div class="content">
                <p>Dear ${user.name},</p>
                <p>Your transaction has been rejected.</p>
                <p><strong>Transaction Details:</strong></p>
                <ul>
                  <li><strong>Amount:</strong> ${transaction.currency || 'USD'} ${transaction.amount.toLocaleString()}</li>
                  <li><strong>Type:</strong> ${transaction.type}</li>
                  <li><strong>Reference:</strong> ${transaction.reference || transaction._id}</li>
                  <li><strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}</li>
                  <li><strong>Reason:</strong> ${reason || 'Administrative review'}</li>
                </ul>
                ${adminNotes ? `<p><strong>Additional Notes:</strong> ${adminNotes}</p>` : ''}
                <p>If you have questions about this decision, please contact support.</p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        await sendTransactionEmail(user.email, {
          name: user.name,
          subject: 'Transaction Rejected',
          html: emailHtml,
          transaction: transaction
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Continue even if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transaction rejected successfully',
      transaction: {
        _id: transaction._id,
        status: 'rejected',
        rejectedAt: transaction.rejectedAt,
        rejectionReason: transaction.rejectionReason,
        type: transaction.type,
        amount: transaction.amount
      }
    });
    
  } catch (error: any) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject transaction', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check if transaction can be rejected
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: transactionId } = await params;
    
    const transaction = await Transaction.findById(transactionId)
      .populate('userId', 'name email accountNumber');
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      canReject: transaction.status === 'pending',
      transaction: {
        _id: transaction._id,
        status: transaction.status,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        user: transaction.userId
      }
    });
    
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}