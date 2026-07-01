import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  verified: boolean("verified").default(false).notNull(),
  kycStatus: mysqlEnum("kycStatus", ["none", "pending", "approved", "rejected"]).default("none").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Accounts ───────────────────────────────────────────────────────────────

export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountNumber: varchar("accountNumber", { length: 20 }).notNull().unique(),
  routingNumber: varchar("routingNumber", { length: 12 }),
  type: mysqlEnum("type", ["checking", "savings", "investment"]).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  balance: decimal("balance", { precision: 18, scale: 2 }).default("0.00").notNull(),
  availableBalance: decimal("availableBalance", { precision: 18, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  interestRate: decimal("interestRate", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("accounts_userId_idx").on(table.userId),
  index("accounts_type_idx").on(table.type),
]);

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── Transactions ───────────────────────────────────────────────────────────

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  userId: int("userId").notNull(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  type: mysqlEnum("type", [
    "deposit",
    "withdrawal",
    "transfer-in",
    "transfer-out",
    "payment",
    "fee",
    "interest",
    "refund",
  ]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["pending", "posted", "completed", "failed", "reversed"]).default("pending").notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 18, scale: 2 }),
  transferId: int("transferId"),
  metadata: text("metadata"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("txn_accountId_idx").on(table.accountId),
  index("txn_userId_idx").on(table.userId),
  index("txn_date_idx").on(table.date),
  index("txn_status_idx").on(table.status),
  index("txn_type_idx").on(table.type),
]);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Transfers ──────────────────────────────────────────────────────────────

export const transfers = mysqlTable("transfers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 64 }),
  type: mysqlEnum("type", ["internal", "external", "wire", "international"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),
  fromAccountId: int("fromAccountId").notNull(),
  toAccountId: int("toAccountId"),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  fee: decimal("fee", { precision: 18, scale: 2 }).default("0.00").notNull(),
  description: text("description"),
  recipientName: varchar("recipientName", { length: 256 }),
  recipientAccount: varchar("recipientAccount", { length: 34 }),
  recipientBank: varchar("recipientBank", { length: 256 }),
  recipientRoutingNumber: varchar("recipientRoutingNumber", { length: 12 }),
  swiftCode: varchar("swiftCode", { length: 11 }),
  country: varchar("country", { length: 2 }),
  failureReason: text("failureReason"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("xfer_userId_idx").on(table.userId),
  index("xfer_status_idx").on(table.status),
  uniqueIndex("xfer_idempotency_idx").on(table.idempotencyKey),
]);

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;

// ─── Beneficiaries ──────────────────────────────────────────────────────────

export const beneficiaries = mysqlTable("beneficiaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  nickname: varchar("nickname", { length: 64 }),
  accountNumber: varchar("accountNumber", { length: 34 }).notNull(),
  routingNumber: varchar("routingNumber", { length: 12 }),
  bankName: varchar("bankName", { length: 256 }),
  swiftCode: varchar("swiftCode", { length: 11 }),
  country: varchar("country", { length: 2 }).default("US").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("bene_userId_idx").on(table.userId),
]);

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type InsertBeneficiary = typeof beneficiaries.$inferInsert;

// ─── Scheduled Payments ─────────────────────────────────────────────────────

export const scheduledPayments = mysqlTable("scheduled_payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromAccountId: int("fromAccountId").notNull(),
  beneficiaryId: int("beneficiaryId"),
  type: mysqlEnum("type", ["internal", "external", "wire", "international"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  description: text("description"),
  frequency: mysqlEnum("frequency", ["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]).notNull(),
  nextRunAt: timestamp("nextRunAt").notNull(),
  lastRunAt: timestamp("lastRunAt"),
  endsAt: timestamp("endsAt"),
  isActive: boolean("isActive").default(true).notNull(),
  runCount: int("runCount").default(0).notNull(),
  maxRuns: int("maxRuns"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("sched_userId_idx").on(table.userId),
  index("sched_nextRun_idx").on(table.nextRunAt),
  index("sched_active_idx").on(table.isActive),
]);

export type ScheduledPayment = typeof scheduledPayments.$inferSelect;
export type InsertScheduledPayment = typeof scheduledPayments.$inferInsert;

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 64 }).notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  resourceId: varchar("resourceId", { length: 64 }),
  detail: text("detail"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("audit_userId_idx").on(table.userId),
  index("audit_action_idx").on(table.action),
  index("audit_resource_idx").on(table.resource),
  index("audit_createdAt_idx").on(table.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
