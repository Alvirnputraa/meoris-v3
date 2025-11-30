import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function json(data: any, init?: number | ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...(typeof init === 'number' ? { status: init } : init),
  })
}

// GET - Fetch user addresses
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return json({ error: 'User ID diperlukan' }, 400)
    }

    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch addresses error:', error)
      return json({ error: 'Gagal memuat alamat' }, 500)
    }

    return json({ addresses })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan' }, 500)
  }
}

// POST - Create new address
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, nama, phone, street, provinsi, kabupaten, kecamatan, kelurahan, postal, isDefault } = body

    if (!userId || !nama || !phone || !street || !provinsi || !kabupaten || !kecamatan || !kelurahan || !postal) {
      return json({ error: 'Data alamat tidak lengkap' }, 400)
    }

    // If this is set as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    const { data: newAddress, error } = await supabase
      .from('user_addresses')
      .insert({
        user_id: userId,
        nama,
        phone,
        street,
        provinsi,
        kabupaten,
        kecamatan,
        kelurahan,
        postal,
        is_default: isDefault || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert address error:', error)
      return json({ error: 'Gagal menyimpan alamat' }, 500)
    }

    return json({ address: newAddress })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan' }, 500)
  }
}

// PATCH - Update address
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { addressId, userId, nama, phone, street, provinsi, kabupaten, kecamatan, kelurahan, postal, isDefault } = body

    console.log('PATCH /api/user/addresses - Request:', { addressId, userId, isDefault })

    if (!addressId || !userId) {
      return json({ error: 'Address ID dan User ID diperlukan' }, 400)
    }

    // Build update object
    const updateData: any = {}
    if (nama !== undefined) updateData.nama = nama
    if (phone !== undefined) updateData.phone = phone
    if (street !== undefined) updateData.street = street
    if (provinsi !== undefined) updateData.provinsi = provinsi
    if (kabupaten !== undefined) updateData.kabupaten = kabupaten
    if (kecamatan !== undefined) updateData.kecamatan = kecamatan
    if (kelurahan !== undefined) updateData.kelurahan = kelurahan
    if (postal !== undefined) updateData.postal = postal
    if (isDefault !== undefined) updateData.is_default = isDefault

    // If setting as default, unset other defaults first
    if (isDefault) {
      console.log('Unsetting other default addresses for user:', userId)
      const { data: unsetData, error: unsetError } = await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', addressId)
        .select()

      console.log('Unset result:', { unsetData, unsetError })
    }

    console.log('Updating address with data:', updateData)

    const { data: updatedAddress, error } = await supabase
      .from('user_addresses')
      .update(updateData)
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Update address error:', error)
      return json({ error: 'Gagal mengupdate alamat' }, 500)
    }

    console.log('Address updated successfully:', updatedAddress)
    return json({ address: updatedAddress })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan' }, 500)
  }
}

// DELETE - Delete address
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const addressId = searchParams.get('addressId')
    const userId = searchParams.get('userId')

    if (!addressId || !userId) {
      return json({ error: 'Address ID dan User ID diperlukan' }, 400)
    }

    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId)

    if (error) {
      console.error('Delete address error:', error)
      return json({ error: 'Gagal menghapus alamat' }, 500)
    }

    return json({ ok: true })
  } catch (e) {
    console.error('Error:', e)
    return json({ error: 'Terjadi kesalahan' }, 500)
  }
}
