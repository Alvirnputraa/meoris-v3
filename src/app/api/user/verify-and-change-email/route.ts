import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

function json(data: any, init?: number | ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...(typeof init === 'number' ? { status: init } : init),
  })
}

function hashCode(code: string, pepper: string) {
  return crypto.createHash('sha256').update(`${code}:${pepper}`).digest('hex')
}

export async function POST(req: Request) {
  try {
    const { code, currentEmail, newEmail, userId } = await req.json()

    if (!code || !currentEmail || !newEmail || !userId) {
      return json({ error: 'Data tidak lengkap' }, 400)
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      return json({ error: 'Format email baru tidak valid' }, 400)
    }

    // Check 1: Check if new email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .maybeSingle()

    if (existingUser) {
      console.log('Email already exists in users table:', newEmail)
      return json({ error: 'Email sudah digunakan oleh akun lain' }, 400)
    }

    // Check 2: Check if new email already exists in Supabase Auth
    // Try to get user by email - if found, email is already in use
    try {
      const { data: authUserCheck } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000, // Check first 1000 users
      })

      if (authUserCheck?.users) {
        const emailExistsInAuth = authUserCheck.users.some(
          (u) => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== userId
        )

        if (emailExistsInAuth) {
          console.log('Email already exists in auth system:', newEmail)
          return json({ error: 'Email sudah digunakan oleh akun lain' }, 400)
        }
      }
    } catch (authCheckErr) {
      console.error('Error checking email in auth system:', authCheckErr)
      // Continue even if check fails - the auth update will fail anyway if email exists
    }

    // Verify code
    const pepper = process.env.VERIFICATION_CODE_PEPPER || process.env.JWT_SECRET || 'dev_pepper'
    const codeHash = hashCode(code, pepper)

    const { data: verification, error: verifyError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', currentEmail)
      .eq('purpose', 'change_email')
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (verifyError || !verification) {
      return json({ error: 'Kode verifikasi tidak valid atau sudah kadaluarsa' }, 400)
    }

    // Check attempts
    if (verification.attempts >= verification.max_attempts) {
      return json({ error: 'Maksimal percobaan tercapai' }, 400)
    }

    // Mark code as used
    await supabase
      .from('email_verifications')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verification.id)

    // Update user email in Supabase Auth (use admin client with service role key)
    console.log('Attempting to update user email in auth system...')
    console.log('User ID:', userId)
    console.log('New Email:', newEmail)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
    })

    if (authError) {
      console.error('Auth update error - Full error object:', JSON.stringify(authError, null, 2))
      console.error('Auth update error - Message:', authError.message)
      console.error('Auth update error - Status:', authError.status)
      return json({
        error: 'Gagal mengupdate email di sistem auth',
        details: authError.message
      }, 500)
    }

    console.log('Auth update successful:', authData)

    // Update user email in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ email: newEmail })
      .eq('id', userId)

    if (updateError) {
      console.error('Users table update error:', updateError)
      return json({ error: 'Gagal mengupdate email di database' }, 500)
    }

    return json({ ok: true, message: 'Email berhasil diubah' })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan saat mengubah email' }, 500)
  }
}
