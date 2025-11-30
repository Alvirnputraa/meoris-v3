import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function json(data: any, init?: number | ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...(typeof init === 'number' ? { status: init } : init),
  })
}

export async function POST(req: Request) {
  try {
    const { userId, phone, gender, nama } = await req.json()

    if (!userId) {
      return json({ error: 'User ID diperlukan' }, 400)
    }

    // Build update object dynamically
    const updateData: any = {}

    if (phone !== undefined) {
      // Validate phone format (basic validation)
      if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
        return json({ error: 'Format nomor telepon tidak valid' }, 400)
      }
      updateData.phone = phone || null
    }

    if (gender !== undefined) {
      if (gender && !['male', 'female', 'other'].includes(gender)) {
        return json({ error: 'Nilai gender tidak valid' }, 400)
      }
      updateData.gender = gender || null
    }

    if (nama !== undefined) {
      updateData.nama = nama
    }

    if (Object.keys(updateData).length === 0) {
      return json({ error: 'Tidak ada data yang diupdate' }, 400)
    }

    // Update user in database
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Update error:', updateError)
      return json({ error: 'Gagal mengupdate profil' }, 500)
    }

    return json({ ok: true, message: 'Profil berhasil diupdate' })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan saat mengupdate profil' }, 500)
  }
}
