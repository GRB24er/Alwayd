// Ambient declarations. These keep legacy code compiling while we incrementally
// migrate it to the real, strongly-typed exports in src/models/* and src/lib/*.
// New code should import directly from the source modules, not rely on these `any` shapes.

declare module '@/lib/constants' {
  export const OWNER_EMAIL: string;
  export const ADMIN_EMAILS: string[];
}

declare module '@/models/User' {
  const User: any;
  export default User;
}

declare module '@/models/Transaction' {
  const Transaction: any;
  export default Transaction;
  export type AccountType = 'checking' | 'savings' | 'investment';
  export type Currency = 'USD' | 'BTC';
  export type TxType =
    | 'deposit'
    | 'withdraw'
    | 'transfer-in'
    | 'transfer-out'
    | 'fee'
    | 'interest'
    | 'adjustment-credit'
    | 'adjustment-debit';
  export type TxStatus = 'pending' | 'completed' | 'approved' | 'rejected' | 'pending_verification';
  export function isCreditType(type: TxType): boolean;
  export function isDebitType(type: TxType): boolean;
  export function getBalanceField(accountType: AccountType): string;
}

declare module '@/lib/mongodb' {
  const dbConnect: () => Promise<any>;
  export default dbConnect;
  export const db: any;
  export type AccountType = 'checking' | 'savings' | 'investment';
  export type TxType =
    | 'deposit'
    | 'withdraw'
    | 'transfer-in'
    | 'transfer-out'
    | 'fee'
    | 'interest'
    | 'adjustment-credit'
    | 'adjustment-debit';
  export type TxStatus = 'pending' | 'completed' | 'approved' | 'rejected' | 'pending_verification';
}

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
