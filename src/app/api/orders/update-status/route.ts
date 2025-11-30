import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { orderId, userId } = await request.json();

    console.log('[update-status] Received:', { orderId, userId });

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: 'Order ID and User ID are required' },
        { status: 400 }
      );
    }

    // First, verify the order belongs to the user and hasn't been updated yet
    const { data: orderCheck, error: checkError } = await supabaseAdmin
      .from('orders')
      .select('id, has_been_updated, user_id')
      .eq('order_number', orderId)
      .eq('user_id', userId)
      .single();

    console.log('[update-status] Order check:', { orderCheck, checkError });

    if (checkError) {
      console.error('[update-status] Check error:', checkError);
      return NextResponse.json(
        { error: `Database error: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (!orderCheck) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if order has already been updated
    if (orderCheck.has_been_updated) {
      return NextResponse.json(
        { error: 'Order has already been updated. Multiple updates are not allowed.' },
        { status: 400 }
      );
    }

    // Update the order status
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        has_been_updated: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderCheck.id)
      .eq('user_id', userId)
      .select()
      .single();

    console.log('[update-status] Update result:', { data, error });

    if (error) {
      console.error('[update-status] Error updating:', error);
      return NextResponse.json(
        { error: `Failed to update: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      data
    });

  } catch (error: any) {
    console.error('[update-status] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
