// src/types/db.d.ts
import { Connection } from 'mongoose';
import { IUser, ITransaction } from '@/types/transaction';

export interface Database {
  getUserById(id: string): Promise<IUser|null>;
  getUserByEmail(email: string): Promise<IUser|null>;
  verifyUser(userId: string): Promise<IUser>;
  deleteUser(userId: string): Promise<IUser>;
  getUsers(): Promise<IUser[]>;

  createTransaction(
    userId: string,
    transactionData: Omit<ITransaction,'date'|'balanceAfter'|'status'|'reference'>,
    initialStatus?: 'pending'|'completed'
  ): Promise<{ user: IUser; transaction: ITransaction }>;

  updateTransactionStatus(
    userId: string,
    transactionReference: string,
    newStatus: 'completed'|'failed'|'reversed'
  ): Promise<ITransaction|undefined>;

  getTransactions(
    userId: string,
    options?: {
      limit?: number;
      page?: number;
      status?: ITransaction['status'];
      type?: ITransaction['type'];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ITransaction[]>;

  createBitcoinTransaction(
    userId: string,
    transactionData: Omit<ITransaction,'date'|'balanceAfter'|'status'|'reference'>,
    initialStatus?: 'pending'|'completed'
  ): Promise<{ user: IUser; transaction: ITransaction }>;
}

declare module '@/lib/mongodb' {
  export const db: Database;
  export default function connectDB(): Promise<Connection>;
}
