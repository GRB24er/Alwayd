// src/app/api/cron/scheduled-transfers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import executeScheduledTransfers from '@/lib/scheduledTransferExecutor';

// This route should be called by a cron job
// For Vercel, add this to vercel.json:
/*
{
  "crons": [{
    "path": "/api/cron/scheduled-transfers",
    "schedule": "0 2 * * *"  // Run daily at 2 AM
  }]
}
*/

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled transfer execution via cron job');
    
    // Execute scheduled transfers
    await executeScheduledTransfers();

    return NextResponse.json({
      success: true,
      message: 'Scheduled transfers executed',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute scheduled transfers',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Also create a vercel.json file in your project root:
// {
//   "crons": [
//     {
//       "path": "/api/cron/scheduled-transfers",
//       "schedule": "0 */6 * * *"
//     }
//   ]
// }