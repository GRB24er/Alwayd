export type WSEventType =
  | "balance:update"
  | "transaction:new"
  | "transaction:update"
  | "transfer:status"
  | "notification"
  | "heartbeat"
  | "auth:required"
  | "auth:ok"
  | "auth:failed";

export interface WSMessage<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: number;
}

export interface BalanceUpdatePayload {
  checking: number;
  savings: number;
  investment: number;
  total: number;
}

export interface TransactionPayload {
  _id: string;
  reference: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  date: string;
  accountType: string;
  currency?: string;
}

export interface TransferStatusPayload {
  reference: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  amount: number;
  recipientName?: string;
  message?: string;
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  category: "transaction" | "transfer" | "security" | "general";
}

export function createWSMessage<T>(type: WSEventType, payload: T): WSMessage<T> {
  return { type, payload, timestamp: Date.now() };
}
