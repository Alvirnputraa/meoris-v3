import { NextResponse, NextRequest } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { userDb } from '@/lib/database'

function json(data: any, init?: number | ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...(typeof init === 'number' ? { status: init } : init),
  })
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function hashCode(code: string, pepper: string) {
  return crypto.createHash('sha256').update(`${code}:${pepper}`).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json()
    if (!email || !code || !newPassword) {
      return json({ error: 'Data tidak lengkap' }, 400)
    }

    if (newPassword.length < 6) {
      return json({ error: 'Password minimal 6 karakter' }, 400)
    }

    // Verify the code one more time before resetting password
    const { data: row, error } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('purpose', 'reset_password')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !row) {
      return json({ error: 'Kode tidak valid atau sudah kedaluwarsa' }, 400)
    }

    const pepper = process.env.VERIFICATION_CODE_PEPPER || process.env.JWT_SECRET || 'dev_pepper'
    const submittedHash = hashCode(code, pepper)

    if (!safeEqual(submittedHash, row.code_hash)) {
      return json({ error: 'Kode tidak valid' }, 400)
    }

    // Check if user exists
    let user
    try {
      user = await userDb.getByEmail(email)
    } catch (error: any) {
      return json({ error: 'User tidak ditemukan' }, 404)
    }

    // Update user password
    try {
      await userDb.updatePassword(user.id, newPassword)
    } catch (error: any) {
      console.error('Failed to update password:', error)
      return json({ error: 'Gagal mengupdate password' }, 500)
    }

    // Mark verification code as used
    await supabase
      .from('email_verifications')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)

    // Log successful password reset (optional)
    console.log(`Password reset successful for user: ${email}`)

    return json({ ok: true })
  } catch (e) {
    console.error('Reset password error:', e)
    return json({ error: 'Gagal reset password' }, 500)
  }
}