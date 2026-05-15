// src/app/api/transfers/internal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

// Internal Transfer Interface
interface InternalTransferRequest {
  fromAccount: 'checking' | 'savings' | 'investment';
  toAccount: 'checking' | 'savings' | 'investment';
  amount: number | string;
  description?: string;
  transferType?: 'instant' | 'scheduled';
  scheduledDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('💸 Internal transfer initiated');
    
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ Unauthorized internal transfer attempt');
      return NextResponse.json(
        { 
          success: false,
          error: "Unauthorized - Please login" 
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: InternalTransferRequest = await request.json();
    console.log('📥 Internal transfer request:', {
      fromAccount: body.fromAccount,
      toAccount: body.toAccount,
      amount: body.amount,
      userEmail: session.user.email
    });
    
    const { 
      fromAccount,
      toAccount,
      amount,
      description,
      transferType = 'instant',
      scheduledDate
    } = body;

    // Validation
    if (!fromAccount || !toAccount) {
      return NextResponse.json(
        { 
          success: false,
          error: "Both source and destination accounts are required" 
        },
        { status: 400 }
      );
    }

    if (fromAccount === toAccount) {
      return NextResponse.json(
        { 
          success: false,
          error: "Cannot transfer to the same account" 
        },
        { status: 400 }
      );
    }

    // Validate and parse amount
    const transferAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^0-9.-]/g, '')) 
      : Number(amount);
      
    console.log('💰 Internal transfer amount:', transferAmount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      console.log('❌ Invalid amount:', amount);
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid amount. Please enter a valid number greater than 0" 
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();
    console.log('🗄️ Database connected');

    // Find and validate user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      console.log('❌ User not found:', session.user.email);
      return NextResponse.json(
        { 
          success: false,
          error: "User account not found" 
        },
        { status: 404 }
      );
    }

    console.log('👤 User found:', user._id);

    // Get balance fields
    const balanceFieldMap: { [key: string]: keyof typeof user } = {
      'checking': 'checkingBalance',
      'savings': 'savingsBalance',
      'investment': 'investmentBalance'
    };

    const fromBalanceField = balanceFieldMap[fromAccount];
    const toBalanceField = balanceFieldMap[toAccount];

    if (!fromBalanceField || !toBalanceField) {
      console.log('❌ Invalid account type');
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid account type. Must be checking, savings, or investment" 
        },
        { status: 400 }
      );
    }

    // Check sufficient funds
    const currentFromBalance = Number(user[fromBalanceField] || 0);
    console.log('💰 Current balance check:', {
      fromAccount,
      currentBalance: currentFromBalance,
      requiredAmount: transferAmount,
      hasSufficientFunds: currentFromBalance >= transferAmount
    });
    
    if (transferAmount > currentFromBalance) {
      return NextResponse.json(
        { 
          success: false,
          error: "Insufficient funds",
          details: {
            available: currentFromBalance,
            requested: transferAmount,
            shortfall: transferAmount - currentFromBalance
          }
        },
        { status: 400 }
      );
    }

    // Generate unique reference number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const transferRef = `INT-${timestamp}-${random}`;
    
    console.log('📖 Generated internal transfer reference:', transferRef);

    // Use MongoDB session for transaction consistency
    const mongoSession = await User.startSession();
    
    try {
      await mongoSession.withTransaction(async () => {
        console.log('🔄 Starting internal transfer database transaction');

        const currentToBalance = Number(user[toBalanceField] || 0);
        const newFromBalance = currentFromBalance - transferAmount;
        const newToBalance = currentToBalance + transferAmount;

        // Create transfer-out transaction
        const transferOutTransaction = new Transaction({
          userId: user._id,
          type: 'transfer-out',
          currency: 'USD',
          amount: transferAmount,
          description: description?.trim() || `Transfer to ${toAccount}`,
          status: 'completed',
          accountType: fromAccount,
          posted: true,
          postedAt: new Date(),
          reference: transferRef,
          channel: 'online',
          origin: 'internal_transfer',
          date: new Date(),
          metadata: {
            fromAccount,
            toAccount,
            transferType,
            scheduledDate,
            isInternalTransfer: true
          }
        });

        await transferOutTransaction.save({ session: mongoSession });
        console.log('💾 Transfer-out transaction saved:', transferOutTransaction._id);

        // Create transfer-in transaction
        const transferInTransaction = new Transaction({
          userId: user._id,
          type: 'transfer-in',
          currency: 'USD',
          amount: transferAmount,
          description: description?.trim() || `Transfer from ${fromAccount}`,
          status: 'completed',
          accountType: toAccount,
          posted: true,
          postedAt: new Date(),
          reference: transferRef,
          channel: 'online',
          origin: 'internal_transfer',
          date: new Date(),
          metadata: {
            fromAccount,
            toAccount,
            transferType,
            scheduledDate,
            isInternalTransfer: true
          }
        });

        await transferInTransaction.save({ session: mongoSession });
        console.log('💾 Transfer-in transaction saved:', transferInTransaction._id);

        // Update user balances
        const updateFields = {
          [fromBalanceField]: newFromBalance,
          [toBalanceField]: newToBalance
        };
        
        await User.findByIdAndUpdate(
          user._id, 
          { $set: updateFields },
          { session: mongoSession }
        );

        console.log('💰 Balances updated:', {
          [fromBalanceField]: { old: currentFromBalance, new: newFromBalance },
          [toBalanceField]: { old: currentToBalance, new: newToBalance }
        });

        // Add to user's transaction history
        const userTransactionEntries = [
          {
            _id: transferOutTransaction._id,
            type: 'transfer-out',
            amount: transferAmount,
            description: `Transfer to ${toAccount}`,
            date: new Date(),
            balanceAfter: newFromBalance,
            status: 'completed',
            reference: transferRef,
            account: fromAccount
          },
          {
            _id: transferInTransaction._id,
            type: 'transfer-in',
            amount: transferAmount,
            description: `Transfer from ${fromAccount}`,
            date: new Date(),
            balanceAfter: newToBalance,
            status: 'completed',
            reference: transferRef,
            account: toAccount
          }
        ];

        await User.findByIdAndUpdate(
          user._id,
          {
            $push: {
              transactions: {
                $each: userTransactionEntries,
                $position: 0,
                $slice: 100 // Keep only last 100 transactions
              }
            }
          },
          { session: mongoSession }
        );

        console.log('📝 User transaction history updated');
      });

      await mongoSession.endSession();
      console.log('✅ Internal transfer database transaction completed successfully');

      // Get updated balances
      const updatedUser = await User.findById(user._id);
      
      // Prepare response data
      const responseData = {
        success: true,
        message: `Transfer completed successfully!`,
        transferReference: transferRef,
        transfer: {
          type: 'internal',
          from: fromAccount,
          to: toAccount,
          amount: transferAmount,
          description: description || 'Internal Transfer',
          reference: transferRef,
          status: 'completed',
          date: new Date().toISOString()
        },
        balances: {
          checking: updatedUser?.checkingBalance || 0,
          savings: updatedUser?.savingsBalance || 0,
          investment: updatedUser?.investmentBalance || 0
        },
        changes: {
          [fromAccount]: {
            previous: currentFromBalance,
            new: updatedUser?.[balanceFieldMap[fromAccount]] || 0
          },
          [toAccount]: {
            previous: Number(user[balanceFieldMap[toAccount]] || 0),
            new: updatedUser?.[balanceFieldMap[toAccount]] || 0
          }
        }
      };

      console.log('✅ Internal transfer completed:', {
        reference: transferRef,
        from: fromAccount,
        to: toAccount,
        amount: transferAmount
      });

      return NextResponse.json(responseData, { status: 200 });

    } catch (dbError: any) {
      await mongoSession.abortTransaction();
      await mongoSession.endSession();
      
      console.error('💥 Internal transfer database transaction failed:', {
        error: dbError.message,
        stack: dbError.stack,
        transferRef
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to process internal transfer. Please try again.",
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          reference: transferRef
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('💥 Internal transfer error:', {
      message: error.message,
      stack: error.stack,
      userEmail: (await getServerSession(authOptions))?.user?.email
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Fetch internal transfer history
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching internal transfer history');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          error: "Unauthorized" 
        },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: "User not found" 
        },
        { status: 404 }
      );
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const accountType = searchParams.get('account');

    // Build query for internal transfers
    const query: any = {
      userId: user._id,
      origin: 'internal_transfer'
    };

    if (accountType) {
      query.accountType = accountType;
    }

    console.log('🔍 Internal transfer query:', query);

    // Get internal transfers
    const internalTransfers = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Group transfers by reference (each internal transfer has 2 transactions)
    const transfersByRef: { [key: string]: any[] } = {};
    internalTransfers.forEach((tx: any) => {
      if (!transfersByRef[tx.reference]) {
        transfersByRef[tx.reference] = [];
      }
      transfersByRef[tx.reference].push(tx);
    });

    // Format grouped transfers
    const formattedTransfers = Object.entries(transfersByRef).map(([ref, txs]) => {
      const outTx = txs.find(tx => tx.type === 'transfer-out');
      const inTx = txs.find(tx => tx.type === 'transfer-in');
      
      return {
        reference: ref,
        date: outTx?.date || inTx?.date,
        amount: outTx?.amount || inTx?.amount,
        fromAccount: outTx?.accountType || outTx?.metadata?.fromAccount,
        toAccount: inTx?.accountType || inTx?.metadata?.toAccount,
        description: outTx?.description || inTx?.description,
        status: outTx?.status || inTx?.status,
        transactions: txs.map(tx => ({
          id: tx._id.toString(),
          type: tx.type,
          account: tx.accountType,
          amount: tx.amount,
          posted: tx.posted,
          postedAt: tx.postedAt
        }))
      };
    });

    console.log(`📋 Found ${formattedTransfers.length} internal transfers`);

    return NextResponse.json({
      success: true,
      internalTransfers: formattedTransfers,
      total: formattedTransfers.length,
      currentBalances: {
        checking: user.checkingBalance || 0,
        savings: user.savingsBalance || 0,
        investment: user.investmentBalance || 0
      }
    });

  } catch (error: any) {
    console.error('💥 Get internal transfers error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch internal transfer history",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}