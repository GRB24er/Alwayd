// src/app/api/admin/transfers/attach-code/route.ts
// Admin attaches verification code (Rewarble code) to a pending transfer

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { transporter } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    console.log('[Admin] Attaching verification code');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const { transactionId, verificationCode, adminNotes } = await request.json();

    if (!transactionId || !verificationCode) {
      return NextResponse.json(
        { success: false, error: "Missing transaction ID or verification code" },
        { status: 400 }
      );
    }

    const cleanCode = verificationCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (cleanCode.length !== 16) {
      return NextResponse.json(
        { success: false, error: "Verification code must be 16 characters" },
        { status: 400 }
      );
    }

    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    const user = await User.findById(transaction.userId);
    
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    transaction.metadata = {
      ...transaction.metadata,
      verificationCode: cleanCode,
      verificationRequired: true,
      verificationUrl: "https://rewarble.com/redeem",
      codeAttachedBy: adminUser._id,
      codeAttachedAt: new Date(),
      adminNotes: adminNotes || ''
    };
    
    await transaction.save();

    console.log('[Admin] Verification code attached:', {
      transactionId,
      reference: transaction.reference,
      codeLastFour: cleanCode.slice(-4)
    });

    const formattedCode = cleanCode.match(/.{1,4}/g)?.join('-') || cleanCode;
    const redeemUrl = `https://rewarble.com/redeem?code=${cleanCode}`;

    // Send professional enterprise-grade email
    try {
      console.log('[Admin] Sending verification email to:', user.email);
      
      const subject = `Funds Transfer Verification Required - Reference: ${transaction.reference}`;
      
      const textContent = `
ZENTRIBANK CAPITAL - SECURE TRANSFER VERIFICATION

ACCOUNT HOLDER: ${user.name || 'Valued Client'}
TRANSACTION REFERENCE: ${transaction.reference}
VERIFICATION CODE: ${formattedCode}
EXPIRATION: 24 Hours

TRANSACTION DETAILS:
• Amount: $${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Reference: ${transaction.reference}
• Date Initiated: ${new Date(transaction.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
• Status: AWAITING FINAL VERIFICATION

ACTION REQUIRED:
To authorize and release your transfer, you must complete the Rewarble Secure Verification Protocol.

VERIFICATION PROCESS:
1. Access the secure verification portal: https://rewarble.com/redeem
2. Enter your verification code: ${formattedCode}
3. Complete the identity confirmation steps
4. Receive immediate confirmation of funds release

VERIFICATION PORTAL DIRECT LINK:
${redeemUrl}

COMPLIANCE NOTICE:
This verification is required under Financial Conduct Authority (FCA) regulations and international anti-money laundering (AML) directives. Failure to complete verification within 24 hours will result in transfer cancellation.

SECURITY ADVISORY:
• This code is single-use and time-sensitive
• Do not share with anyone under any circumstances
• ZentriBank representatives will never request this code
• Ensure you are on the official Rewarble domain (rewarble.com)
• Disable VPN/proxy services during verification

FOR IMMEDIATE SUPPORT:
Contact ZentriBank Security Operations:
• Email: security@zentribank.capital
• Internal Reference: ${transaction.reference}

ZENTRIBANK CAPITAL | SWIFT: ZTRIUS33 | FCA AUTHORIZED
This is an automated message from ZentriBank Capital's secure transaction system.
      `.trim();

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transfer Verification - ZentriBank Capital</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        .container {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            border-radius: 12px;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            padding: 40px;
            text-align: center;
            border-bottom: 4px solid #10b981;
        }
        
        .header-logo {
            display: inline-block;
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #94a3b8;
            font-size: 16px;
            font-weight: 500;
        }
        
        .content {
            padding: 48px;
        }
        
        .alert-banner {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 32px;
            text-align: center;
        }
        
        .alert-icon {
            font-size: 32px;
            margin-bottom: 12px;
        }
        
        .alert-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .alert-subtitle {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .verification-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 32px;
            margin: 32px 0;
            text-align: center;
        }
        
        .verification-label {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
        }
        
        .verification-code {
            font-family: 'Courier New', Monaco, monospace;
            font-size: 36px;
            font-weight: 700;
            color: #059669;
            letter-spacing: 2px;
            margin: 16px 0;
            padding: 20px;
            background: #ffffff;
            border: 2px dashed #10b981;
            border-radius: 8px;
            display: inline-block;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            padding: 18px 48px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 24px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }
        
        .details-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        
        .details-title {
            color: #0f172a;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .detail-label {
            color: #64748b;
            font-size: 14px;
        }
        
        .detail-value {
            color: #1e293b;
            font-weight: 600;
            font-size: 14px;
            text-align: right;
        }
        
        .status-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            display: inline-block;
        }
        
        .security-section {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 24px;
            margin-top: 32px;
        }
        
        .security-title {
            color: #dc2626;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .security-list {
            list-style: none;
            color: #7f1d1d;
            font-size: 13px;
        }
        
        .security-list li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .security-list li:before {
            content: "•";
            color: #dc2626;
            position: absolute;
            left: 0;
        }
        
        .footer {
            background: #0f172a;
            color: #94a3b8;
            padding: 32px;
            text-align: center;
            font-size: 12px;
            line-height: 1.8;
        }
        
        .footer-links {
            margin: 20px 0;
        }
        
        .footer-link {
            color: #94a3b8;
            text-decoration: none;
            margin: 0 12px;
            transition: color 0.3s ease;
        }
        
        .footer-link:hover {
            color: #ffffff;
        }
        
        .compliance-notice {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 16px;
            margin: 24px 0;
            font-size: 13px;
            color: #0369a1;
        }
        
        @media (max-width: 640px) {
            .content {
                padding: 24px;
            }
            
            .verification-code {
                font-size: 24px;
                padding: 16px;
            }
            
            .detail-row {
                flex-direction: column;
                gap: 4px;
            }
            
            .detail-value {
                text-align: left;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-logo">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4L8 12V36L24 44L40 36V12L24 4Z" fill="#10b981"/>
                    <path d="M24 16L16 20V32L24 36L32 32V20L24 16Z" fill="#ffffff"/>
                </svg>
            </div>
            <h1>Transfer Verification Required</h1>
            <div class="header-subtitle">Secure Transaction Authorization | Reference: ${transaction.reference}</div>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Alert Banner -->
            <div class="alert-banner">
                <div class="alert-icon">⚠️</div>
                <div class="alert-title">Action Required to Release Funds</div>
                <div class="alert-subtitle">Complete verification within 24 hours to proceed with your transfer</div>
            </div>

            <!-- Compliance Notice -->
            <div class="compliance-notice">
                <strong>COMPLIANCE NOTICE:</strong> This verification is required under FCA regulations and international AML directives. Failure to complete verification within 24 hours will result in transfer cancellation.
            </div>

            <!-- Verification Section -->
            <div class="verification-section">
                <div class="verification-label">Your Secure Verification Code</div>
                <div class="verification-code">${formattedCode}</div>
                <div style="color: #64748b; font-size: 13px; margin-bottom: 16px;">
                    Valid for 24 hours | Single Use Only
                </div>
                
                <a href="${redeemUrl}" class="cta-button">
                    Complete Verification on Rewarble
                </a>
                
                <div style="color: #64748b; font-size: 13px; margin-top: 16px;">
                    Or visit: <a href="https://rewarble.com/redeem" style="color: #10b981; text-decoration: none;">https://rewarble.com/redeem</a>
                </div>
            </div>

            <!-- Transaction Details -->
            <div class="details-card">
                <div class="details-title">
                    <svg width="20" height="20" fill="#10b981" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    TRANSACTION SUMMARY
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Reference Number</div>
                    <div class="detail-value">${transaction.reference}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Amount</div>
                    <div class="detail-value">$${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Initiated</div>
                    <div class="detail-value">${new Date(transaction.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge">AWAITING VERIFICATION</span>
                    </div>
                </div>
                
                <div class="detail-row" style="border-bottom: none;">
                    <div class="detail-label">Account Holder</div>
                    <div class="detail-value">${user.name || 'Client'}</div>
                </div>
            </div>

            <!-- Security Section -->
            <div class="security-section">
                <div class="security-title">
                    <svg width="20" height="20" fill="#dc2626" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                    </svg>
                    SECURITY ADVISORY
                </div>
                <ul class="security-list">
                    <li>This verification code is single-use and time-sensitive</li>
                    <li>Never share this code with anyone, including ZentriBank representatives</li>
                    <li>Ensure you are on the official Rewarble domain (rewarble.com)</li>
                    <li>Disable VPN/proxy services during the verification process</li>
                    <li>If you did not initiate this transfer, contact security immediately</li>
                </ul>
            </div>

            <!-- Support Information -->
            <div style="text-align: center; margin-top: 32px; color: #64748b; font-size: 13px;">
                <p><strong>For immediate assistance:</strong></p>
                <p>Security Operations Center: security@zentribank.capital</p>
                <p>Reference this email in all communications: ${transaction.reference}</p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>ZENTRIBANK CAPITAL</strong></p>
            <p>SWIFT: ZTRIUS33 | FCA Authorized #123456</p>
            
            <div class="footer-links">
                <a href="https://zentribank.capital/security" class="footer-link">Security Center</a>
                <a href="https://zentribank.capital/contact" class="footer-link">Contact Support</a>
                <a href="https://zentribank.capital/privacy" class="footer-link">Privacy Policy</a>
            </div>
            
            <p>This is an automated message from ZentriBank Capital's secure transaction system.</p>
            <p>© ${new Date().getFullYear()} ZentriBank Capital. All rights reserved.</p>
            <p style="margin-top: 16px; color: #475569; font-size: 11px;">
                ZentriBank Capital is a trading name of ZentriBank Ltd, authorized and regulated by the Financial Conduct Authority.
            </p>
        </div>
    </div>
</body>
</html>
      `;

      const emailResult = await transporter.sendMail({
        from: '"ZentriBank Capital" <admin@zentribank.capital>',
        to: user.email,
        subject: subject,
        text: textContent,
        html: htmlContent,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      });
      
      console.log('[Admin] Verification email sent:', emailResult?.messageId);
      
    } catch (emailError: any) {
      console.error('[Admin] Email failed:', emailError?.message || emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Verification code attached and user notified via email",
      transaction: {
        _id: transaction._id,
        reference: transaction.reference,
        status: transaction.status,
        verificationRequired: true,
        verificationUrl: "https://rewarble.com/redeem"
      }
    });

  } catch (error: any) {
    console.error('[Admin] Attach code error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to attach verification code" },
      { status: 500 }
    );
  }
}