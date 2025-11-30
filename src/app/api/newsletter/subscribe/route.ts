import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('newsletter_subscriptions')
      .select('id, is_active')
      .eq('email', trimmedEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which is fine
      console.error('Error checking existing subscription:', checkError);
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat memeriksa email' },
        { status: 500 }
      );
    }

    if (existingSubscription) {
      if (existingSubscription.is_active) {
        return NextResponse.json(
          { error: 'Email ini sudah terdaftar untuk newsletter' },
          { status: 409 }
        );
      } else {
        // Reactivate subscription
        const { data: updatedSubscription, error: updateError } = await supabase
          .from('newsletter_subscriptions')
          .update({
            is_active: true,
            subscribed_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error reactivating subscription:', updateError);
          return NextResponse.json(
            { error: 'Gagal mengaktifkan kembali langganan' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Email berhasil diaktifkan kembali untuk newsletter',
          data: updatedSubscription,
        });
      }
    }

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabase
      .from('newsletter_subscriptions')
      .insert([
        {
          email: trimmedEmail,
          is_active: true,
          subscribed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating subscription:', insertError);
      return NextResponse.json(
        { error: 'Gagal menyimpan email. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email berhasil didaftarkan untuk newsletter',
      data: newSubscription,
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
