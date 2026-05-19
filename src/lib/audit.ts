// src/lib/audit.ts
// Thin helper around the AuditLog model. Failures are swallowed and
// logged so audit writes never break the surrounding business logic.

import type { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import AuditLog, { AuditEventType } from '@/models/AuditLog';

export interface AuditWriteOptions {
  event: AuditEventType;
  actorId?: string | Types.ObjectId | null;
  actorRole?: 'user' | 'admin' | 'system';
  actorEmail?: string;
  subjectId?: string | Types.ObjectId | null;
  subjectType?: 'loan' | 'user' | 'transaction' | 'document';
  reference?: string;
  payload?: Record<string, unknown>;
  request?: NextRequest;
}

function clientIp(req?: NextRequest): string | undefined {
  if (!req) return undefined;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return undefined;
}

export async function writeAudit(opts: AuditWriteOptions): Promise<void> {
  try {
    await AuditLog.create({
      event: opts.event,
      actorId: opts.actorId ? new Types.ObjectId(String(opts.actorId)) : null,
      actorRole: opts.actorRole || 'system',
      actorEmail: opts.actorEmail,
      subjectId: opts.subjectId ? new Types.ObjectId(String(opts.subjectId)) : null,
      subjectType: opts.subjectType,
      reference: opts.reference,
      ip: clientIp(opts.request),
      userAgent: opts.request?.headers.get('user-agent') || undefined,
      payload: opts.payload,
    });
  } catch (err) {
    console.warn('[audit] Failed to write audit entry:', err);
  }
}
