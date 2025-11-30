import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Cron Job API Endpoint for Auto-Canceling Pending/Unpaid Orders
 *
 * This endpoint should be called every hour by a cron service
 * (e.g., Vercel Cron, cron-job.org, etc.)
 *
 * Logic: Cancel orders with status 'pending' or 'belum bayar' that are older than 24 hours
 *
 * Security: Protected by CRON_SECRET environment variable
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check if request is from localhost (for local cron jobs)
    const host = request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    // Skip auth check for localhost, otherwise require CRON_SECRET
    if (!isLocalhost && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request - invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Auto-cancel pending orders cron job started at', new Date().toISOString());

    // Call the database function to auto-cancel pending orders
    const { data, error } = await supabaseAdmin.rpc('auto_cancel_pending_orders');

    if (error) {
      console.error('❌ Auto-cancel function error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Get the count from the function result
    const affectedCount = data?.[0]?.cancelled_count || 0;

    console.log(`✅ Auto-cancel job completed. ${affectedCount} pending orders cancelled.`);

    return NextResponse.json({
      success: true,
      message: 'Auto-cancel pending orders job executed successfully',
      ordersCancelled: affectedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST method for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
