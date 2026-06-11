import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbOk = false;

  try {
    const conn = await dbConnect();
    if (conn) {
      await (conn as any).connection.db.admin().ping();
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }

  const latency = Date.now() - start;
  const status = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbOk ? 'connected' : 'unreachable',
      },
      latencyMs: latency,
    },
    { status }
  );
}
