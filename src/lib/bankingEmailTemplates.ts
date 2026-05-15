// src/lib/bankingEmailTemplates.ts

export interface BankingEmailData {
  recipientName: string;
  recipientEmail: string;
  transactionReference: string;
  transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  amount: number;
  currency: string;
  description: string;
  date: Date;
  accountType: 'checking' | 'savings' | 'investment';
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'declined';
  customMessage?: string;
  declineReason?: string;
}

export function generateCreditEmail(data: BankingEmailData): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency
  }).format(data.amount);

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency
  }).format(data.balanceAfter);

  const formattedDate = new Date(data.date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0;
          opacity: 0.95;
          font-size: 16px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #333;
        }
        .transaction-alert {
          background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .amount-display {
          font-size: 36px;
          font-weight: bold;
          color: #2d3748;
          margin: 10px 0;
        }
        .transaction-details {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #718096;
          font-weight: 500;
        }
        .detail-value {
          color: #2d3748;
          font-weight: 600;
          text-align: right;
        }
        .balance-section {
          background: #fff;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .balance-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        .new-balance {
          font-size: 24px;
          font-weight: bold;
          color: #48bb78;
        }
        .security-notice {
          background: #fef5e7;
          border-left: 4px solid #f39c12;
          padding: 15px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .footer {
          background: #2d3748;
          color: #cbd5e0;
          padding: 30px;
          text-align: center;
          font-size: 14px;
        }
        .footer a {
          color: #90cdf4;
          text-decoration: none;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Account Credited</h1>
          <p>Transaction Successful</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear ${data.recipientName},
          </div>
          
          <div class="transaction-alert">
            <p style="margin: 0; color: #2d3748; font-size: 18px;">Your account has been credited</p>
            <div class="amount-display">+${formattedAmount}</div>
          </div>
          
          <div class="transaction-details">
            <h3 style="margin-top: 0; color: #2d3748;">Transaction Details</h3>
            <div class="detail-row">
              <span class="detail-label">Reference Number</span>
              <span class="detail-value">${data.transactionReference}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transaction Type</span>
              <span class="detail-value">${data.transactionType.toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description</span>
              <span class="detail-value">${data.description}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date & Time</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Account</span>
              <span class="detail-value">${data.accountType.charAt(0).toUpperCase() + data.accountType.slice(1)} Account</span>
            </div>
          </div>
          
          <div class="balance-section">
            <h3 style="margin-top: 0; color: #2d3748;">Account Balance</h3>
            <div class="balance-row">
              <span>Previous Balance:</span>
              <span>${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.balanceBefore)}</span>
            </div>
            <div class="balance-row">
              <span>Transaction Amount:</span>
              <span style="color: #48bb78;">+${formattedAmount}</span>
            </div>
            <div class="balance-row">
              <span>Available Balance:</span>
              <span class="new-balance">${formattedBalance}</span>
            </div>
          </div>
          
          ${data.customMessage ? `
          <div style="background: #edf2f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Note:</strong> ${data.customMessage}
          </div>
          ` : ''}
          
          <div class="security-notice">
            <strong>Security Notice:</strong> This transaction has been processed securely. If you did not authorize this transaction, please contact us immediately.
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" class="button">View Account</a>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>For assistance, contact our support team at support@yourbank.com</p>
          <p style="margin-top: 20px;">© ${new Date().getFullYear()} Your Bank. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateDebitEmail(data: BankingEmailData): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency
  }).format(data.amount);

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency
  }).format(data.balanceAfter);

  const formattedDate = new Date(data.date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .transaction-alert {
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .amount-display {
          font-size: 36px;
          font-weight: bold;
          color: #e53e3e;
          margin: 10px 0;
        }
        .transaction-details {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #718096;
          font-weight: 500;
        }
        .detail-value {
          color: #2d3748;
          font-weight: 600;
          text-align: right;
        }
        .balance-section {
          background: #fff;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .new-balance {
          font-size: 24px;
          font-weight: bold;
          color: #2d3748;
        }
        .security-notice {
          background: #fef5e7;
          border-left: 4px solid #f39c12;
          padding: 15px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .footer {
          background: #2d3748;
          color: #cbd5e0;
          padding: 30px;
          text-align: center;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Account Debited</h1>
          <p>Transaction Processed</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear ${data.recipientName},
          </div>
          
          <div class="transaction-alert">
            <p style="margin: 0; color: #2d3748; font-size: 18px;">Your account has been debited</p>
            <div class="amount-display">-${formattedAmount}</div>
          </div>
          
          <div class="transaction-details">
            <h3 style="margin-top: 0; color: #2d3748;">Transaction Details</h3>
            <div class="detail-row">
              <span class="detail-label">Reference Number</span>
              <span class="detail-value">${data.transactionReference}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transaction Type</span>
              <span class="detail-value">${data.transactionType.toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description</span>
              <span class="detail-value">${data.description}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date & Time</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Account</span>
              <span class="detail-value">${data.accountType.charAt(0).toUpperCase() + data.accountType.slice(1)} Account</span>
            </div>
          </div>
          
          <div class="balance-section">
            <h3 style="margin-top: 0; color: #2d3748;">Account Balance</h3>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
              <span>Previous Balance:</span>
              <span>${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.balanceBefore)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
              <span>Transaction Amount:</span>
              <span style="color: #e53e3e;">-${formattedAmount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
              <span>Available Balance:</span>
              <span class="new-balance">${formattedBalance}</span>
            </div>
          </div>
          
          ${data.customMessage ? `
          <div style="background: #edf2f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Note:</strong> ${data.customMessage}
          </div>
          ` : ''}
          
          <div class="security-notice">
            <strong>Important:</strong> If you did not authorize this transaction, please contact our support team immediately at 1-800-XXX-XXXX.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>For assistance, contact our support team at support@yourbank.com</p>
          <p style="margin-top: 20px;">© ${new Date().getFullYear()} Your Bank. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateTransactionStatusEmail(
  data: BankingEmailData,
  status: 'approved' | 'declined' | 'pending'
): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency
  }).format(data.amount);

  const statusConfig = {
    approved: {
      header: 'Transaction Approved',
      headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      statusColor: '#48bb78',
      statusText: 'APPROVED',
      message: 'Your transaction has been approved and will be processed shortly.'
    },
    declined: {
      header: 'Transaction Declined',
      headerBg: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
      statusColor: '#f56565',
      statusText: 'DECLINED',
      message: 'Your transaction could not be processed at this time.'
    },
    pending: {
      header: 'Transaction Pending',
      headerBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      statusColor: '#ed8936',
      statusText: 'PENDING REVIEW',
      message: 'Your transaction is being reviewed and will be processed soon.'
    }
  };

  const config = statusConfig[status];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
          background: ${config.headerBg};
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 40px 30px;
        }
        .status-badge {
          display: inline-block;
          padding: 10px 20px;
          background: ${config.statusColor}20;
          color: ${config.statusColor};
          border-radius: 25px;
          font-weight: bold;
          margin: 20px 0;
        }
        .transaction-details {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${config.header}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${data.recipientName},</p>
          
          <p>${config.message}</p>
          
          <div style="text-align: center;">
            <span class="status-badge">${config.statusText}</span>
          </div>
          
          <div class="transaction-details">
            <h3>Transaction Information</h3>
            <div class="detail-row">
              <span>Reference</span>
              <span><strong>${data.transactionReference}</strong></span>
            </div>
            <div class="detail-row">
              <span>Amount</span>
              <span><strong>${formattedAmount}</strong></span>
            </div>
            <div class="detail-row">
              <span>Description</span>
              <span>${data.description}</span>
            </div>
            ${status === 'declined' && data.declineReason ? `
            <div class="detail-row">
              <span>Reason</span>
              <span>${data.declineReason}</span>
            </div>
            ` : ''}
          </div>
          
          ${data.customMessage ? `
          <div style="background: #edf2f7; padding: 15px; border-radius: 8px;">
            <strong>Additional Information:</strong> ${data.customMessage}
          </div>
          ` : ''}
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
        
        <div style="background: #2d3748; color: #cbd5e0; padding: 30px; text-align: center; font-size: 14px;">
          <p>© ${new Date().getFullYear()} Your Bank. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}