import { eq, desc, and, sql, between, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  accounts,
  transactions,
  transfers,
  beneficiaries,
  auditLogs,
  type InsertUser,
  type InsertAccount,
  type InsertTransaction,
  type InsertTransfer,
  type InsertBeneficiary,
  type InsertAuditLog,
} from "../drizzle/schema";
import * as relations from "../drizzle/relations";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "firstName", "lastName", "email", "phone", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    (values as any)[field] = value ?? null;
    updateSet[field] = value ?? null;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export async function createAccount(data: InsertAccount) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(accounts).values(data);
  return result[0].insertId;
}

export async function getAccountsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));
}

export async function getAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAccountBalance(id: number, newBalance: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(accounts).set({ balance: newBalance, availableBalance: newBalance }).where(eq(accounts.id, id));
}

export async function getUserBalances(userId: number) {
  const db = await getDb();
  if (!db) return { checking: 0, savings: 0, investment: 0, total: 0 };

  const userAccounts = await getAccountsByUserId(userId);
  const balances = { checking: 0, savings: 0, investment: 0, total: 0 };
  for (const acc of userAccounts) {
    const bal = parseFloat(acc.balance);
    balances[acc.type as keyof typeof balances] += bal;
    balances.total += bal;
  }
  return balances;
}

// ─── Transactions ───────────────────────────────────────────────────────────

function generateReference(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) return undefined;
  const ref = data.reference || generateReference("TXN");
  const result = await db.insert(transactions).values({ ...data, reference: ref });
  return { id: result[0].insertId, reference: ref };
}

export async function getTransactionsByUserId(
  userId: number,
  opts: { page?: number; limit?: number; type?: string; accountType?: string; status?: string; search?: string; from?: string; to?: string } = {},
) {
  const db = await getDb();
  if (!db) return { transactions: [], total: 0 };

  const page = opts.page || 1;
  const limit = opts.limit || 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(transactions.userId, userId)];
  if (opts.type) conditions.push(eq(transactions.type, opts.type as any));
  if (opts.status) conditions.push(eq(transactions.status, opts.status as any));
  if (opts.from && opts.to) conditions.push(between(transactions.date, new Date(opts.from), new Date(opts.to)));
  if (opts.search) conditions.push(like(transactions.description, `%${opts.search}%`));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(transactions).where(where).orderBy(desc(transactions.date)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(where),
  ]);

  return { transactions: rows, total: countResult[0]?.count || 0 };
}

export async function getTransactionByReference(reference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTransactionStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ status: status as any }).where(eq(transactions.id, id));
}

// ─── Transfers ──────────────────────────────────────────────────────────────

export async function createTransfer(data: InsertTransfer) {
  const db = await getDb();
  if (!db) return undefined;
  const ref = data.reference || generateReference("TRF");

  if (data.idempotencyKey) {
    const existing = await db.select().from(transfers).where(eq(transfers.idempotencyKey, data.idempotencyKey)).limit(1);
    if (existing.length > 0) return { id: existing[0].id, reference: existing[0].reference, duplicate: true };
  }

  const result = await db.insert(transfers).values({ ...data, reference: ref });
  return { id: result[0].insertId, reference: ref, duplicate: false };
}

export async function getTransfersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transfers).where(eq(transfers.userId, userId)).orderBy(desc(transfers.createdAt)).limit(50);
}

export async function getTransferByReference(reference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transfers).where(eq(transfers.reference, reference)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTransferStatus(id: number, status: string, failureReason?: string) {
  const db = await getDb();
  if (!db) return;
  const set: Record<string, unknown> = { status };
  if (status === "completed") set.completedAt = new Date();
  if (failureReason) set.failureReason = failureReason;
  await db.update(transfers).set(set).where(eq(transfers.id, id));
}

// ─── Beneficiaries ──────────────────────────────────────────────────────────

export async function createBeneficiary(data: InsertBeneficiary) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(beneficiaries).values(data);
  return result[0].insertId;
}

export async function getBeneficiariesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(beneficiaries).where(eq(beneficiaries.userId, userId)).orderBy(desc(beneficiaries.lastUsedAt));
}

export async function deleteBeneficiary(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(beneficiaries).where(and(eq(beneficiaries.id, id), eq(beneficiaries.userId, userId)));
  return (result[0] as any).affectedRows > 0;
}

export async function updateBeneficiaryLastUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(beneficiaries).set({ lastUsedAt: new Date() }).where(eq(beneficiaries.id, id));
}

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export async function writeAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (err) {
    console.error("[Audit] Failed to write log:", err);
  }
}

export async function getAuditLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}
