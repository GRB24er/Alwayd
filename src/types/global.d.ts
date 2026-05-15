declare module '@/lib/constants' {
  export const OWNER_EMAIL: string;
}

declare module '@/models/User' {
  const User: any;
  export default User;
}

declare module '@/models/Transaction' {
  const Transaction: any;
  export default Transaction;
}

declare module '@/lib/mongodb' {
  const dbConnect: () => Promise<void>;
  export default dbConnect;
  export const db: any;
}

declare module '@/lib/mail' {
  export const transporter: any;
  export const sendTransactionEmail: any;
  export const sendWelcomeEmail: any;
}

// src/types/global.d.ts
// Additional type declarations can be added here

declare module '@/lib/mail' {
  export const transporter: any;
  export const sendTransactionEmail: any;
  export const sendWelcomeEmail: any;
  export const sendOTPEmail: any;
  export const sendPasswordResetEmail: any;
  export const testSMTPConnection: any;
  export function sendBankStatementEmail(
    to: string,
    transactions: {
      date: Date;
      type: string;
      currency: string;
      amount: number;
      description: string;
      reference?: string;
    }[]
  ): Promise<void>;
  export function sendSimpleEmail(
    to: string | string[],
    subject: string,
    text: string,
    html?: string
  ): Promise<any>;
}
