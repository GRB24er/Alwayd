// Legacy shim. Most ambient module declarations here were shadowing the real
// exports in src/models/* and src/lib/* with `any`, which silently broke type
// safety across the app. The real source files now provide accurate types
// directly, so we keep only the Database interface that downstream callers depend on.

import type { IUser, ITransaction } from '@/types/transaction';

export interface Database {
  getUserById(id: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  verifyUser(userId: string): Promise<IUser>;
  deleteUser(userId: string): Promise<IUser>;
  getUsers(): Promise<IUser[]>;

  createTransaction(
    userId: string,
    transactionData: Omit<ITransaction, 'date' | 'balanceAfter' | 'status' | 'reference'>,
    initialStatus?: 'pending' | 'completed'
  ): Promise<{ user: IUser; transaction: ITransaction }>;

  updateTransactionStatus(
    userId: string,
    transactionReference: string,
    newStatus: 'completed' | 'failed' | 'reversed'
  ): Promise<ITransaction | undefined>;

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
    transactionData: Omit<ITransaction, 'date' | 'balanceAfter' | 'status' | 'reference'>,
    initialStatus?: 'pending' | 'completed'
  ): Promise<{ user: IUser; transaction: ITransaction }>;
}
