import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Cron Job API Endpoint for Auto-Completing Delivered Orders
 *
 * This endpoint should be called every hour by a cron service
 * (e.g., Vercel Cron, cron-job.org, etc.)
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

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request - invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Auto-complete cron job started at', new Date().toISOString());

    // Call the database function to auto-complete orders
    const { data, error } = await supabaseAdmin.rpc('auto_complete_delivered_orders');

    if (error) {
      console.error('❌ Auto-complete function error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Query to see how many orders were affected (completed in last hour)
    const { data: completedOrders, error: queryError } = await supabaseAdmin
      .from('orders')
      .select('id, status, delivered_at, updated_at')
      .eq('status', 'completed')
      .not('delivered_at', 'is', null)
      .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    const affectedCount = completedOrders?.length || 0;

    console.log(`✅ Auto-complete job completed. ${affectedCount} orders processed.`);

    return NextResponse.json({
      success: true,
      message: 'Auto-complete job executed successfully',
      ordersProcessed: affectedCount,
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
