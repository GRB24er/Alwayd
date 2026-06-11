export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  accountNumber: string;
  routingNumber: string;
}

export interface Balances {
  checking: number;
  savings: number;
  investment: number;
  total: number;
}

export type AccountType = "checking" | "savings" | "investment";

export type TxType =
  | "deposit"
  | "withdraw"
  | "transfer-in"
  | "transfer-out"
  | "fee"
  | "interest"
  | "adjustment-credit"
  | "adjustment-debit";

export type TxStatus = "pending" | "completed" | "approved" | "rejected" | "processing";

export interface Transaction {
  _id: string;
  reference: string;
  type: TxType;
  amount: number;
  rawAmount?: number;
  description?: string;
  status: TxStatus;
  date: string;
  createdAt?: string;
  accountType: AccountType;
  posted?: boolean;
  currency?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardData {
  balances: Balances;
  transactions: Transaction[];
  user: User;
}

export interface TransferPayload {
  type: "internal" | "external" | "wire" | "international";
  fromAccount: AccountType;
  toAccount?: AccountType;
  amount: string;
  currency?: string;
  description?: string;
  recipientName?: string;
  recipientAccountNumber?: string;
  recipientRoutingNumber?: string;
  recipientSwiftBic?: string;
  recipientBank?: string;
  recipientCountry?: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TransactionDetail: { transaction: Transaction };
  TransferForm: { type?: string };
  AccountDetail: { accountType: AccountType };
};
