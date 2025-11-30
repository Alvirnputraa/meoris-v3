import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voucherCode, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (!voucherCode) {
      return NextResponse.json(
        { success: false, message: 'Kode voucher tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Call claim_voucher function
    const { data, error } = await supabaseAdmin.rpc('claim_voucher', {
      p_user_id: userId,
      p_voucher_code: voucherCode
    });

    if (error) {
      console.error('Error claiming voucher:', error);
      return NextResponse.json(
        { success: false, message: 'Terjadi kesalahan saat claim voucher' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in claim voucher API:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
