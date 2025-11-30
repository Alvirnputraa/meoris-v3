import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const FAVORIT_SELECT = `
  *,
  produk:produk_id (
    id,
    nama_produk,
    photo1,
    harga
  )
`

async function getFavoritesByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('favorit')
    .select(FAVORIT_SELECT)
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

async function favoriteExists(userId: string, produkId: string) {
  const { data, error } = await supabaseAdmin
    .from('favorit')
    .select('id')
    .eq('user_id', userId)
    .eq('produk_id', produkId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return !!data
}

async function addFavorite(userId: string, produkId: string) {
  const { data, error } = await supabaseAdmin
    .from('favorit')
    .insert([{ user_id: userId, produk_id: produkId }])
    .select()
    .single()

  if (error) throw error
  return data
}

async function removeFavorite(favoriteId: string, userId: string) {
  // Hard-guard: ensure the favorite belongs to the requesting user
  const { data: favorite, error: fetchError } = await supabaseAdmin
    .from('favorit')
    .select('id, user_id')
    .eq('id', favoriteId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!favorite) {
    return { notFound: true }
  }
  if (favorite.user_id !== userId) {
    return { forbidden: true }
  }

  const { error } = await supabaseAdmin
    .from('favorit')
    .delete()
    .eq('id', favoriteId)

  if (error) throw error
  return { success: true }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get user favorites
    const favorites = await getFavoritesByUserId(userId)

    return NextResponse.json({ success: true, favorites })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, produkId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }
    if (!produkId) {
      return NextResponse.json({ error: 'Missing produkId' }, { status: 400 })
    }

    // Check if already in favorites to prevent duplicates
    const isAlreadyFavorite = await favoriteExists(userId, produkId)
    if (isAlreadyFavorite) {
      return NextResponse.json({ error: 'Product already in favorites' }, { status: 409 })
    }

    // Add to favorit table
    const favorit = await addFavorite(userId, produkId)

    return NextResponse.json({ success: true, favorit })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { favoriteId, userId } = body

    if (!favoriteId) {
      return NextResponse.json({ error: 'Missing favoriteId' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Remove from favorit table
    const result = await removeFavorite(favoriteId, userId)

    if (result.notFound) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }
    if (result.forbidden) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
