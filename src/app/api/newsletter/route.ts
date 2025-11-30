import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email tidak valid' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingSubscription } = await supabase
      .from('newsletter_subscriptions')
      .select('id')
      .eq('email', email)
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    // Insert new email subscription
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .insert({ email })
      .select();

    if (error) {
      console.error('Error saving email:', error);
      return NextResponse.json(
        { error: 'Gagal menyimpan email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email berhasil disimpan',
        data: data[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}