import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Buat Supabase client dengan service role untuk bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nama } = body;

    // Validasi input
    if (!email || !password || !nama) {
      return NextResponse.json(
        { error: 'Email, password, dan nama harus diisi' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Step 1: Buat user di Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm email
      user_metadata: {
        full_name: nama
      }
    });

    if (authError) {
      console.error('Auth error:', authError);

      // Check if user already exists
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message || 'Gagal membuat user' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User tidak berhasil dibuat' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Step 2: Insert data ke tabel admin_users
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId,
        email: email,
        nama: nama,
        role: 'admin', // Default role
        is_active: true
      });

    if (adminError) {
      console.error('Admin insert error:', adminError);

      // Jika gagal insert ke admin_users, hapus user dari auth
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: 'Gagal membuat admin user: ' + adminError.message },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json({
      success: true,
      message: 'Admin user berhasil dibuat',
      data: {
        id: userId,
        email: email,
        nama: nama
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}
