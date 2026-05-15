// scripts/processRecurring.ts
// Run via:  npx ts-node scripts/processRecurring.ts
// or add a package.json script:  "recurring": "ts-node scripts/processRecurring.ts"

import dbConnect, { db } from "../src/lib/mongodb";
import User from "../src/models/User";
import { sendTransactionEmail } from "../src/lib/mail";

// Types your User.recurring item might have.
// This is flexible so the script compiles even if your real schema has extras.
type RecurringRule = {
  active?: boolean;
  interval?: "daily" | "weekly" | "monthly";
  // Optional targeting (if you use it)
  dayOfWeek?: number; // 0=Sun..6=Sat (for weekly)
  dayOfMonth?: number; // 1..31 (for monthly)
  // Transaction info
  type?: "deposit" | "withdraw";
  amount?: number | string;
  description?: string;
  currency?: string;
  accountType?: "checking" | "savings" | "investment";
  // Scheduling bookkeeping
  lastRun?: Date | string | null;
};

function normalizeAccountType(v: any): "checking" | "savings" | "investment" {
  const s = String(v || "").toLowerCase();
  if (s === "savings") return "savings";
  if (s === "investment") return "investment";
  return "checking";
}

function normalizeCurrency(v: any): string {
  const s = String(v || "USD").trim().toUpperCase();
  return s || "USD";
}

function normalizeType(v: any): "deposit" | "withdraw" {
  const s = String(v || "").toLowerCase();
  return s === "withdraw" ? "withdraw" : "deposit";
}

function toNumber(n: any): number {
  if (typeof n === "number") return n;
  if (typeof n === "string") {
    const cleaned = n.replace(/[,\s$]/g, "");
    const parsed = Number(cleaned);
    return isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sameYMD(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Decide if a rule should run "today".
 * Keeps this simple and tolerant:
 * - daily: if never run or lastRun was any prior day
 * - weekly: if never run or 7+ days since lastRun; if dayOfWeek is set, only run on that weekday
 * - monthly: if never run or month difference >=1; if dayOfMonth is set, only on that day
 */
function shouldRunToday(rule: RecurringRule, today: Date): boolean {
  if (rule.active === false) return false;

  const lastRun = rule.lastRun ? new Date(rule.lastRun) : null;
  const interval = rule.interval || "monthly";

  if (!lastRun || isNaN(lastRun.getTime())) {
    // never ran -> allow today (subject to optional weekday/day-of-month gates)
    if (interval === "weekly" && typeof rule.dayOfWeek === "number") {
      return today.getDay() === rule.dayOfWeek;
    }
    if (interval === "monthly" && typeof rule.dayOfMonth === "number") {
      return today.getDate() === rule.dayOfMonth;
    }
    return true;
  }

  // Already ran today?
  if (sameYMD(lastRun, today)) return false;

  if (interval === "daily") {
    // Any previous day -> ok
    return true;
  }

  if (interval === "weekly") {
    const sevenDaysLater = addDays(lastRun, 7);
    if (today >= sevenDaysLater) {
      if (typeof rule.dayOfWeek === "number") {
        return today.getDay() === rule.dayOfWeek;
      }
      return true;
    }
    return false;
  }

  // monthly
  const months = monthsBetween(lastRun, today);
  if (months >= 1) {
    if (typeof rule.dayOfMonth === "number") {
      return today.getDate() === rule.dayOfMonth;
    }
    return true;
  }
  return false;
}

async function processRecurringTransactions() {
  await dbConnect();

  // Find users that have recurring rules
  const users = await User.find({ recurring: { $exists: true, $ne: [] } })
    .select("_id email name recurring")
    .lean();

  const today = new Date();

  for (const user of users as any[]) {
    let touchedUser = false;

    for (const rule of (user.recurring || []) as RecurringRule[]) {
      if (!shouldRunToday(rule, today)) continue;

      // Normalize transaction input
      const txType = normalizeType(rule.type);
      const amount = toNumber(rule.amount);
      if (amount <= 0) continue; // skip bad config

      const description =
        (rule.description && String(rule.description).trim()) ||
        (txType === "withdraw" ? "Recurring debit" : "Recurring credit");

      const currency = normalizeCurrency(rule.currency);
      const accountType = normalizeAccountType(rule.accountType);

      // Create transaction (status defaults to 'pending' in createTransaction)
      const { transaction } = await db.createTransaction(
        String(user._id),
        {
          type: txType,
          amount,
          description,
          currency,
          accountType,
          channel: "recurring",
          origin: "system_recurring",
        } as any
      );

      // Update lastRun on the in-memory rule so we can persist after loop
      (rule as any).lastRun = today;

      // Best-effort email; don't crash the script if it fails
      try {
        await sendTransactionEmail(String(user.email), {
          name: user.name,
          transaction,
        });
      } catch (err) {
        console.warn("[recurring] sendTransactionEmail failed (continuing):", err);
      }

      touchedUser = true;
    }

    // Persist lastRun updates if any rule ran
    if (touchedUser) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            recurring: user.recurring,
          },
        }
      );
    }
  }

  console.log("✅ Recurring transactions processed.");
}

// Execute when run as a script
processRecurringTransactions().catch((err) => {
  console.error("❌ Recurring script error:", err);
  process.exitCode = 1;
});