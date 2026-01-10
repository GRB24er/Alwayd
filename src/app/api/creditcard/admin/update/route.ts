// src/app/api/creditcard/admin/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import CreditCardApplication from '@/models/CreditCardApplication';
import User from '@/models/User';

const ADMIN_EMAILS = [
  'admin@horizonbank.com',
  'your-email@example.com',
];

const authOptions = {
  secret: '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2',
};

const CARD_ISSUERS = {
  platinum: { issuer: 'Visa', prefix: '4532' },
  gold: { issuer: 'Mastercard', prefix: '5425' },
  silver: { issuer: 'Discover', prefix: '6011' },
  basic: { issuer: 'Visa', prefix: '4532' },
  student: { issuer: 'Discover', prefix: '6011' },
  secured: { issuer: 'Mastercard', prefix: '5425' },
  business: { issuer: 'American Express', prefix: '3782' }
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const isAdmin = user?.role === 'admin' || ADMIN_EMAILS.includes(session.user.email.toLowerCase());

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { applicationNumber, action, reason, creditLimit, interestRate, annualFee } = data;

    if (!applicationNumber || !action) {
      return NextResponse.json(
        { success: false, error: 'Application number and action are required' },
        { status: 400 }
      );
    }

    const application: any = await CreditCardApplication.findOne({ applicationNumber });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (!application.workflow) {
      application.workflow = {};
    }

    if (action === 'approve') {
      application.status = 'approved';
      
      application.workflow.decision = {
        type: 'approved',
        madeBy: session.user.email,
        madeAt: new Date(),
        reason: reason || 'Application approved',
        conditions: []
      };

      const cardType = application.cardPreferences?.cardType || 'basic';
      const issuerInfo = CARD_ISSUERS[cardType as keyof typeof CARD_ISSUERS] || CARD_ISSUERS.basic;

      const cardNumber = generateCardNumber(issuerInfo.prefix);
      const cvv = generateCVV();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);

      application.workflow.approval = {
        creditLimit: creditLimit || 5000,
        interestRate: interestRate || 18.99,
        annualFee: annualFee || 0,
        issuer: issuerInfo.issuer,
        cardDetails: {
          cardType: cardType,
          cardNumber: cardNumber,
          expiryDate: expiryDate,
          cvv: cvv,
          pin: '',
          isActive: false,
          activatedAt: undefined
        },
        termsAccepted: false,
        cardShipped: false,
        cardDelivered: false
      };

    } else if (action === 'reject') {
      application.status = 'declined';
      
      application.workflow.decision = {
        type: 'declined',
        madeBy: session.user.email,
        madeAt: new Date(),
        reason: reason || 'Application declined',
        conditions: []
      };

    } else if (action === 'request_documents') {
      application.status = 'documents_pending';
      
    } else if (action === 'manual_review') {
      application.status = 'manual_review';
    }

    application.workflow.lastUpdatedAt = new Date();
    await application.save();

    return NextResponse.json({
      success: true,
      message: `Application ${action}d successfully`,
      data: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        decision: application.workflow.decision,
        issuer: application.workflow.approval?.issuer
      }
    });

  } catch (error: any) {
    console.error('❌ Admin update application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}

function generateCardNumber(prefix: string): string {
  let number = prefix;
  const remainingDigits = 16 - prefix.length;
  
  for (let i = 0; i < remainingDigits; i++) {
    number += Math.floor(Math.random() * 10);
  }
  
  return number;
}

function generateCVV(): string {
  return Math.floor(100 + Math.random() * 900).toString();
}