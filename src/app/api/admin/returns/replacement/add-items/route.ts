import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { returnId, adminId, items } = body;

    // Validate input
    if (!returnId || !adminId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', adminId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate each item
    for (const item of items) {
      if (!item.product_id || !item.product_name || !item.product_size || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({
          error: 'Invalid item data. Each item must have product_id, product_name, product_size, and quantity > 0'
        }, { status: 400 });
      }
    }

    // Check if return exists and is in correct status
    const { data: returnData, error: fetchError } = await supabaseAdmin
      .from('returns')
      .select('id, status, validasi')
      .eq('id', returnId)
      .single();

    if (fetchError || !returnData) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Must be validating or approved status
    if (returnData.status !== 'approved' && returnData.status !== 'validating') {
      return NextResponse.json({ error: 'Return must be in validating or approved status' }, { status: 400 });
    }

    // Delete existing replacement items for this return (in case of re-adding)
    await supabaseAdmin
      .from('replacement_items')
      .delete()
      .eq('return_id', returnId);

    // Insert new replacement items
    const itemsToInsert = items.map((item: any) => ({
      return_id: returnId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_size: item.product_size,
      quantity: item.quantity,
      product_photo: item.product_photo || null,
      product_price: item.product_price || null
    }));

    const { data: insertedItems, error: insertError } = await supabaseAdmin
      .from('replacement_items')
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting replacement items:', insertError);
      return NextResponse.json({ error: 'Failed to add replacement items' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Replacement items added successfully',
      items: insertedItems
    });
  } catch (error: any) {
    console.error('Error in add replacement items API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
