import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

function json(data: any, init?: number | ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...(typeof init === 'number' ? { status: init } : init),
  })
}

function generateCode() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}

function hashCode(code: string, pepper: string) {
  return crypto.createHash('sha256').update(`${code}:${pepper}`).digest('hex')
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Email tidak valid' }, 400)
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return json({ error: 'RESEND_API_KEY tidak terkonfigurasi' }, 500)
    }

    // Store code in DB (hashed)
    const pepper = process.env.VERIFICATION_CODE_PEPPER || process.env.JWT_SECRET || 'dev_pepper'
    const codeHash = hashCode(code, pepper)

    // Invalidate previous active codes for this email/purpose
    try {
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('purpose', 'signup')
        .is('used_at', null)
    } catch {}

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const userAgent = req.headers.get('user-agent') || undefined
    const insertRes = await supabase
      .from('email_verifications')
      .insert({
        email,
        purpose: 'signup',
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
        max_attempts: 5,
        ip: ip as any,
        user_agent: userAgent,
      })
      .select('id')
      .single()
    if (insertRes.error) {
      return json({ error: 'Gagal menyimpan kode' }, 500)
    }

    // Send email via Resend API
    const from = process.env.RESEND_FROM || 'Meoris <no-reply@meoris-noreply.erdanpee.com>'
    const subject = 'Kode Pendaftaran Meoris'
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Kode Pendaftaran Meoris</title>
      <style>
        /* Basic email-safe resets */
        body { margin:0; padding:0; background:#f6f7f9; }
        img { border:0; outline:none; text-decoration:none; }
        table { border-collapse:collapse; }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f6f7f9;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="background:#000000;padding:16px 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;letter-spacing:1px;color:#ffffff;">MEORIS</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 20px 8px 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#111111;font-size:18px;font-weight:700;">Kode Pendaftaran Meoris</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#333333;font-size:14px;line-height:20px;">
                    <p style="margin:12px 0 0 0;">Halo,</p>
                    <p style="margin:8px 0 0 0;">Gunakan kode berikut untuk menyelesaikan pendaftaran akun Anda di Meoris.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:16px 20px 4px 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#111111;font-size:28px;font-weight:800;letter-spacing:8px;">${code}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 20px 0 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#555555;font-size:12px;line-height:18px;">
                    <p style="margin:0;">Kode berlaku selama <strong>5 menit</strong>. Demi keamanan, jangan bagikan kode ini kepada siapa pun.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  <hr style="border:none;border-top:1px solid #eee;margin:0;" />
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#777777;font-size:12px;line-height:18px;margin-top:12px;">
                    <p style="margin:0;">Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.</p>
                  </div>
                </td>
              </tr>
            </table>
            <div style="font-family:Arial,Helvetica,sans-serif;color:#9aa0a6;font-size:11px;line-height:16px;margin-top:12px;">
              &copy; ${new Date().getFullYear()} Meoris. Semua hak dilindungi.
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>`

    // Using fetch to Resend REST API
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], subject, html }),
    })

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Gagal mengirim kode' }, 500)
  }
}
