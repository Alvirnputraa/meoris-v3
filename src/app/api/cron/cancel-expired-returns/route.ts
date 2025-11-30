import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting auto-cancel expired returns job...');

    // Find expired returns (approved > 2 days ago, no waybill)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredReturns, error: fetchError } = await supabase
      .from('returns')
      .select('id, order_id, order_number, user_id, approved_at')
      .eq('status', 'approved')
      .is('return_waybill', null)
      .not('approved_at', 'is', null)
      .lte('approved_at', twoDaysAgo);

    if (fetchError) {
      console.error('❌ [Cron] Error fetching expired returns:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired returns', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredReturns || expiredReturns.length === 0) {
      console.log('✅ [Cron] No expired returns found');
      return NextResponse.json({
        success: true,
        message: 'No expired returns to cancel',
        expired: 0
      });
    }

    console.log(`📋 [Cron] Found ${expiredReturns.length} expired returns`);

    let cancelledCount = 0;
    let completedCount = 0;

    // Process each expired return
    for (const returnItem of expiredReturns) {
      try {
        // Cancel the return
        const { error: updateReturnError } = await supabase
          .from('returns')
          .update({
            status: 'expired',
            notes: `[AUTO-CANCELLED] Return expired - No shipping arranged within 2 days deadline. Cancelled at: ${new Date().toISOString()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', returnItem.id);

        if (updateReturnError) {
          console.error(`❌ [Cron] Failed to cancel return ${returnItem.id}:`, updateReturnError.message);
          continue;
        }

        cancelledCount++;
        console.log(`✅ [Cron] Cancelled return ${returnItem.id}`);

        // Complete the order
        if (returnItem.order_id) {
          const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', returnItem.order_id)
            .neq('status', 'completed'); // Only update if not already completed

          if (updateOrderError) {
            console.error(`❌ [Cron] Failed to complete order ${returnItem.order_id}:`, updateOrderError.message);
          } else {
            completedCount++;
            console.log(`✅ [Cron] Completed order ${returnItem.order_id}`);
          }
        }
      } catch (error) {
        console.error(`❌ [Cron] Error processing return ${returnItem.id}:`, error);
      }
    }

    console.log(`✅ [Cron] Auto-cancel job completed: ${cancelledCount} returns cancelled, ${completedCount} orders completed`);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${expiredReturns.length} expired returns`,
      expired: expiredReturns.length,
      cancelled: cancelledCount,
      ordersCompleted: completedCount
    });

  } catch (error) {
    console.error('❌ [Cron] Error in cancel-expired-returns:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggering
export async function POST(req: NextRequest) {
  return GET(req);
}
