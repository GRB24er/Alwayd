// src/app/api/creditcard/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import CreditCardApplication from '@/models/CreditCardApplication';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get application number from query params
    const { searchParams } = new URL(req.url);
    const applicationNumber = searchParams.get('applicationNumber');

    if (!applicationNumber) {
      return NextResponse.json(
        { success: false, error: 'Application number is required' },
        { status: 400 }
      );
    }

    // Find application
    const application = await CreditCardApplication.findOne({
      applicationNumber,
      userId: user._id
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Return sanitized data (hide sensitive info)
    return NextResponse.json({
      success: true,
      data: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        cardType: application.cardPreferences?.cardType,
        submittedAt: application.workflow?.submittedAt,
        lastUpdatedAt: application.workflow?.lastUpdatedAt,
        decision: application.workflow?.decision,
        approval: application.workflow?.approval ? {
          creditLimit: application.workflow.approval.creditLimit,
          interestRate: application.workflow.approval.interestRate,
          cardType: application.workflow.approval.cardDetails?.cardType,
          isActive: application.workflow.approval.cardDetails?.isActive
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Get application status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch application status' },
      { status: 500 }
    );
  }
}