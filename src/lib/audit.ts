// Audit logger. Writes immutable records for every privileged or money-moving action.
// Failures here log but do NOT block the caller — losing audit on a successful txn is bad,
// but blocking a customer because the audit collection had a hiccup is worse. Alert on it.

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import AuditLog, { AuditAction, AuditSeverity } from "@/models/AuditLog";
import { logger } from "@/lib/logger";

export interface AuditContext {
  action: AuditAction;
  actorId?: string | null;
  actorEmail?: string;
  actorRole?: string;
  targetUserId?: string | null;
  resourceId?: string;
  outcome: "success" | "failure" | "blocked";
  severity?: AuditSeverity;
  details?: Record<string, any>;
  request?: NextRequest;
  requestId?: string;
}

function extractIp(req?: NextRequest): string | undefined {
  if (!req) return undefined;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || undefined;
}

export async function audit(ctx: AuditContext): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      action: ctx.action,
      severity: ctx.severity || (ctx.outcome === "blocked" ? "warning" : "info"),
      actorId: ctx.actorId || null,
      actorEmail: ctx.actorEmail,
      actorRole: ctx.actorRole,
      targetUserId: ctx.targetUserId || null,
      resourceId: ctx.resourceId,
      ipAddress: extractIp(ctx.request),
      userAgent: ctx.request?.headers.get("user-agent") || undefined,
      requestId: ctx.requestId || ctx.request?.headers.get("x-request-id") || undefined,
      outcome: ctx.outcome,
      details: ctx.details,
      occurredAt: new Date(),
    });
  } catch (err: any) {
    logger.error("audit.write_failed", {
      action: ctx.action,
      outcome: ctx.outcome,
      err: err?.message,
    });
  }
}
