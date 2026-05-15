// src/app/api/admin/users/[id]/transaction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionEmail } from '@/lib/mail';
import { generateCreditEmail, generateDebitEmail } from '@/lib/bankingEmailTemplates';

// Helper function to generate reference numbers
function generateReference(type: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const prefixMap: { [key: string]: string } = {
    'deposit': 'DEP',
    'withdraw': 'WTH',
    'transfer-in': 'TRI',
    'transfer-out': 'TRO',
    'interest': 'INT',
    'fee': 'FEE',
    'adjustment-credit': 'ADC',
    'adjustment-debit': 'ADD'
  };
  
  const prefix = prefixMap[type] || 'TRX';
  return `${prefix}-${timestamp}-${random}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // FIXED: Added Promise wrapper
) {
  try {
    await connectDB();
    
    // FIXED: Await params before accessing id
    const { id: userId } = await params;
    const body = await req.json();
    
    const { 
      type, 
      amount, 
      accountType, 
      description, 
      status = 'completed',
      sendEmail = true 
    } = body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine the balance field
    const balanceField = accountType === 'savings' 
      ? 'savingsBalance' 
      : accountType === 'investment' 
      ? 'investmentBalance' 
      : 'checkingBalance';

    // Get current balance
    const currentBalance = user[balanceField] || 0;

    // Calculate new balance
    const isCredit = ['deposit', 'transfer-in', 'interest', 'adjustment-credit'].includes(type);
    const balanceChange = isCredit ? amount : -amount;
    const newBalance = currentBalance + balanceChange;

    // Check for insufficient funds on debit
    if (!isCredit && newBalance < 0) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      );
    }

    // Create reference number
    const reference = generateReference(type);

    // Create the transaction
    const transaction = await Transaction.create({
      userId: user._id,
      type,
      amount,
      description: description || `Admin ${type}`,
      status,
      accountType,
      reference,
      currency: 'USD',
      posted: status === 'completed',
      postedAt: status === 'completed' ? new Date() : null,
      date: new Date(),
      channel: 'admin',
      origin: 'admin_panel'
    });

    // Update user balance if transaction is completed
    if (status === 'completed') {
      user[balanceField] = newBalance;
      await user.save();
    }

    // Send email notification if requested
    let emailSent = false;
    if (sendEmail && user.email) {
      try {
        const emailData = {
          recipientName: user.name,
          recipientEmail: user.email,
          transactionReference: reference,
          transactionType: type as any,
          amount: amount,
          currency: 'USD',
          description: description || `Admin ${type}`,
          date: new Date(),
          accountType: accountType as any,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          status: 'completed' as any
        };

        // Generate appropriate email template
        let emailHtml = '';
        if (isCredit) {
          emailHtml = generateCreditEmail(emailData);
        } else {
          emailHtml = generateDebitEmail(emailData);
        }

        // Send the email
        await sendTransactionEmail(user.email, {
          name: user.name,
          transaction: transaction
        });

        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Transaction processed successfully`,
      transaction: {
        _id: transaction._id.toString(),
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status,
        accountType: transaction.accountType,
        date: transaction.date
      },
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        [balanceField]: newBalance
      },
      previousBalance: currentBalance,
      newBalance: newBalance,
      emailSent
    });

  } catch (error: any) {
    console.error('Transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get all transactions for a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // FIXED: Added Promise wrapper
) {
  try {
    await connectDB();
    
    // FIXED: Await params before accessing id
    const { id: userId } = await params;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all transactions for this user
    const transactions = await Transaction.find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(100);
    
    return NextResponse.json({
      success: true,
      transactions,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        checkingBalance: user.checkingBalance || 0,
        savingsBalance: user.savingsBalance || 0,
        investmentBalance: user.investmentBalance || 0
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching user transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    );
  }
}
