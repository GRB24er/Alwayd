// Idempotency middleware. Wrap a money-moving handler so retries return the cached response
// instead of re-charging. Keyed by header + endpoint; mismatched bodies for the same key are rejected.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import IdempotencyKey from "@/models/IdempotencyKey";
import { logger } from "@/lib/logger";

const TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyResult<T> {
  cached: boolean;
  response: NextResponse<T> | NextResponse;
}

function hashBody(body: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
}

export interface RunIdempotentOpts<T> {
  request: NextRequest;
  endpoint: string;
  userId: string | null;
  body: unknown;
  // Header name to look at; defaults to Idempotency-Key.
  headerName?: string;
  // If true, missing key is allowed (we just skip the cache). Default false for money endpoints.
  optional?: boolean;
  handler: () => Promise<NextResponse<T> | NextResponse>;
}

export async function runIdempotent<T>(
  opts: RunIdempotentOpts<T>
): Promise<NextResponse<T> | NextResponse> {
  const headerName = opts.headerName || "idempotency-key";
  const rawKey = opts.request.headers.get(headerName);

  if (!rawKey) {
    if (opts.optional) return await opts.handler();
    return NextResponse.json(
      {
        success: false,
        error: `Missing ${headerName} header. Money-moving requests must include a unique idempotency key.`,
      },
      { status: 400 }
    );
  }

  const key = rawKey.trim();
  if (key.length < 8 || key.length > 200) {
    return NextResponse.json(
      { success: false, error: "Idempotency key must be 8-200 chars" },
      { status: 400 }
    );
  }

  await connectDB();
  const requestHash = hashBody(opts.body);

  // Try to claim the key. Upsert with status=in_flight; if it already exists, we read it back.
  const existing = await IdempotencyKey.findOne({ key, endpoint: opts.endpoint });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      logger.warn("idempotency.body_mismatch", { key, endpoint: opts.endpoint });
      return NextResponse.json(
        {
          success: false,
          error: "Idempotency key reused with a different request body",
        },
        { status: 422 }
      );
    }
    if (existing.status === "completed") {
      logger.info("idempotency.replay", { key, endpoint: opts.endpoint });
      return NextResponse.json(existing.responseBody, {
        status: existing.statusCode || 200,
        headers: { "x-idempotent-replay": "true" },
      });
    }
    if (existing.status === "in_flight") {
      return NextResponse.json(
        { success: false, error: "Request with this idempotency key is still processing" },
        { status: 409 }
      );
    }
    // status === 'failed' -> let them retry by treating as fresh
  }

  try {
    await IdempotencyKey.updateOne(
      { key, endpoint: opts.endpoint },
      {
        $setOnInsert: {
          key,
          endpoint: opts.endpoint,
          userId: opts.userId,
          requestHash,
          status: "in_flight",
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      },
      { upsert: true }
    );
  } catch (err: any) {
    // Duplicate key race: someone else just claimed it. Treat as in-flight.
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Concurrent request with same idempotency key" },
        { status: 409 }
      );
    }
    throw err;
  }

  let response: NextResponse<T> | NextResponse;
  try {
    response = await opts.handler();
  } catch (err) {
    await IdempotencyKey.updateOne(
      { key, endpoint: opts.endpoint },
      { $set: { status: "failed", completedAt: new Date() } }
    );
    throw err;
  }

  // Cache the response body. NextResponse body is a stream; clone the JSON we already produced
  // by re-reading via the response object.
  let body: any = null;
  try {
    body = await response.clone().json();
  } catch {
    body = null;
  }

  await IdempotencyKey.updateOne(
    { key, endpoint: opts.endpoint },
    {
      $set: {
        status: "completed",
        statusCode: response.status,
        responseBody: body,
        completedAt: new Date(),
      },
    }
  );

  return response;
}
