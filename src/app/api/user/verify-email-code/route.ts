import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

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
    const { code, email, userId } = await req.json()

    if (!code || !email || !userId) {
      return json({ error: 'Data tidak lengkap' }, 400)
    }

    // Verify code
    const pepper = process.env.VERIFICATION_CODE_PEPPER || process.env.JWT_SECRET || 'dev_pepper'
    const codeHash = hashCode(code, pepper)

    const { data: verification, error: verifyError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('purpose', 'change_email')
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (verifyError || !verification) {
      console.error('Verification error:', verifyError)
      return json({ error: 'Kode verifikasi tidak valid atau sudah kadaluarsa' }, 400)
    }

    // Check attempts
    if (verification.attempts >= verification.max_attempts) {
      return json({ error: 'Maksimal percobaan tercapai. Silakan minta kode baru.' }, 400)
    }

    // Increment attempts (but don't mark as used yet)
    await supabase
      .from('email_verifications')
      .update({ attempts: verification.attempts + 1 })
      .eq('id', verification.id)

    return json({ ok: true, message: 'Kode verifikasi valid' })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan saat memverifikasi kode' }, 500)
  }
}
