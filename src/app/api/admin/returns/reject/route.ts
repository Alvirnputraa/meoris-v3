import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { returnId, adminId, reason } = body;

    // Validate input
    if (!returnId || !adminId) {
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

    // Get return data
    const { data: returnData, error: fetchError } = await supabaseAdmin
      .from('returns')
      .select('*')
      .eq('id', returnId)
      .single();

    if (fetchError || !returnData) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Check if already rejected
    if (returnData.status === 'rejected') {
      return NextResponse.json({ error: 'Return already rejected' }, { status: 400 });
    }

    // Update return status to rejected
    const { error: updateError } = await supabaseAdmin
      .from('returns')
      .update({
        status: 'rejected',
        notes: reason || 'Rejected by admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', returnId);

    if (updateError) {
      console.error('Error updating return:', updateError);
      return NextResponse.json({ error: 'Failed to reject return' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Return request rejected successfully'
    });
  } catch (error: any) {
    console.error('Error in reject return API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
