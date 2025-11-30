import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { returnId, adminId, validationResult, validationNotes } = body;

    // Validate input
    if (!returnId || !adminId || !validationResult) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(validationResult)) {
      return NextResponse.json({ error: 'Invalid validation result' }, { status: 400 });
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

    // Update validation status
    const updateData: any = {
      validasi: validationResult,
      validation_completed_at: new Date().toISOString(),
      validation_notes: validationNotes || null,
      updated_at: new Date().toISOString()
    };

    if (validationResult === 'approved') {
      updateData.status_validasi = 'Validasi selesai - produk sesuai';
      updateData.status = 'approved'; // Change status to approved when validation approved
    } else {
      updateData.status_validasi = 'Validasi ditolak - produk tidak sesuai';
      updateData.status = 'rejected'; // Also update main status
    }

    const { error: updateError } = await supabaseAdmin
      .from('returns')
      .update(updateData)
      .eq('id', returnId);

    if (updateError) {
      console.error('Error updating validation:', updateError);
      return NextResponse.json({ error: 'Failed to update validation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: validationResult === 'approved'
        ? 'Validation approved. Ready for replacement shipping.'
        : 'Validation rejected. Return request closed.',
      validationResult
    });
  } catch (error: any) {
    console.error('Error in validate return API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
