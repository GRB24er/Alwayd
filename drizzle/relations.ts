import { relations } from "drizzle-orm";
import {
  users,
  accounts,
  transactions,
  transfers,
  beneficiaries,
  scheduledPayments,
  auditLogs,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  transfers: many(transfers),
  beneficiaries: many(beneficiaries),
  scheduledPayments: many(scheduledPayments),
  auditLogs: many(auditLogs),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  transfer: one(transfers, { fields: [transactions.transferId], references: [transfers.id] }),
}));

export const transfersRelations = relations(transfers, ({ one, many }) => ({
  user: one(users, { fields: [transfers.userId], references: [users.id] }),
  fromAccount: one(accounts, { fields: [transfers.fromAccountId], references: [accounts.id] }),
  transactions: many(transactions),
}));

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  user: one(users, { fields: [beneficiaries.userId], references: [users.id] }),
}));

export const scheduledPaymentsRelations = relations(scheduledPayments, ({ one }) => ({
  user: one(users, { fields: [scheduledPayments.userId], references: [users.id] }),
  fromAccount: one(accounts, { fields: [scheduledPayments.fromAccountId], references: [accounts.id] }),
  beneficiary: one(beneficiaries, { fields: [scheduledPayments.beneficiaryId], references: [beneficiaries.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
