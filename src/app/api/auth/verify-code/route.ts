import { NextResponse, NextRequest } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

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
    const { email, code } = await req.json()
    if (!email || !code) return json({ error: 'Data tidak lengkap' }, 400)

    // Find latest active verification for this email/purpose
    const { data: row, error } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('purpose', 'signup')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !row) {
      return json({ error: 'Kode tidak ditemukan atau sudah kedaluwarsa' }, 400)
    }

    const pepper = process.env.VERIFICATION_CODE_PEPPER || process.env.JWT_SECRET || 'dev_pepper'
    const submittedHash = hashCode(code, pepper)

    if (!safeEqual(submittedHash, row.code_hash)) {
      const newAttempts = (row.attempts || 0) + 1
      if (newAttempts >= (row.max_attempts || 5)) {
        await supabase
          .from('email_verifications')
          .update({ attempts: newAttempts, used_at: new Date().toISOString() })
          .eq('id', row.id)
        return json({ error: 'Terlalu banyak percobaan. Minta kode baru.' }, 400)
      } else {
        await supabase
          .from('email_verifications')
          .update({ attempts: newAttempts })
          .eq('id', row.id)
        return json({ error: 'Kode salah' }, 400)
      }
    }

    // Success: mark as used
    await supabase
      .from('email_verifications')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Verifikasi gagal' }, 500)
  }
}
