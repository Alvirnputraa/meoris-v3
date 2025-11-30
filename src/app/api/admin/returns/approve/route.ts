import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { returnId, adminId } = body;

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

    // Check if already approved
    if (returnData.status === 'approved') {
      return NextResponse.json({ error: 'Return already approved' }, { status: 400 });
    }

    // Update return status to approved
    const { error: updateError } = await supabaseAdmin
      .from('returns')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', returnId);

    if (updateError) {
      console.error('Error updating return:', updateError);
      return NextResponse.json({ error: 'Failed to approve return' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Return request approved successfully'
    });
  } catch (error: any) {
    console.error('Error in approve return API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
