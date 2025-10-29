import { supabase } from './supabase'
import type { User, Produk, Keranjang, Favorit, Order, OrderItem } from './supabase'

// =============================================
// USER FUNCTIONS
// =============================================

export const userDb = {
  // Create new user
  async create(email: string, password: string, nama: string) {
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password, nama }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user by email
  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  },

  // Get user by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Update user
  async update(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },

  // Update user password specifically
  async updatePassword(id: string, newPassword: string) {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// =============================================
// PRODUK FUNCTIONS
// =============================================

export const produkDb = {
  // Get all products
  async getAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get product by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Get products by category
  async getByCategory(kategori: string, limit = 20) {
    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .eq('kategori', kategori)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Search products with exact substring matching (nama_produk only)
  async search(query: string, limit = 20) {
    const searchTerm = query.trim()
    
    if (searchTerm.length === 0) return []
    
    // Get all products first
    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .limit(100)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Strict client-side filtering - case insensitive, ONLY search in nama_produk
    const filteredData = data?.filter(product => {
      const productName = (product.nama_produk || '').toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      
      // Only match if the exact search string appears in nama_produk
      return productName.includes(searchLower)
    }) || []

    return filteredData.slice(0, limit)
  },

  // Create new product
  async create(produk: Omit<Produk, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('produk')
      .insert([produk])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update product
  async update(id: string, updates: Partial<Produk>) {
    const { data, error } = await supabase
      .from('produk')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete product
  async delete(id: string) {
    const { error } = await supabase
      .from('produk')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

// =============================================
// KERANJANG (CART) FUNCTIONS
// =============================================

export const keranjangDb = {
  // Get user cart
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('keranjang')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          photo1,
          harga
        )
      `)
      .eq('user_id', userId)

    if (error) throw error
    
    // For each cart item, check if there's a discount price
    const cartWithDiscounts = await Promise.all(
      (data || []).map(async (item: any) => {
        try {
          // Check if product has active deal
          const { data: dealData } = await supabase
            .from('homepage_section2_deals')
            .select('harga_diskon, discount_percentage')
            .eq('produk_id', item.produk_id)
            .eq('is_active', true)
            .maybeSingle()
          
          // If there's a discount, use it, otherwise use original price
          const finalPrice = dealData?.harga_diskon || item.produk?.harga
          
          return {
            ...item,
            produk: {
              ...item.produk,
              harga: finalPrice
            }
          }
        } catch (e) {
          // If no deal found, return original price
          return item
        }
      })
    )
    
    return cartWithDiscounts
  },

  // Add item to cart
  async addItem(userId: string, produkId: string, quantity = 1, size?: string) {
    // Cek apakah item dengan kombinasi (user_id, produk_id, size) sudah ada
    let query = supabase
      .from('keranjang')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('produk_id', produkId) as any
    query = size ? query.eq('size', size) : query.is('size', null)
    const { data: existing, error: selError } = await query.single()

    if (existing) {
      // Update quantity: tambah dengan jumlah baru
      const newQty = (existing.quantity || 0) + (quantity || 0)
      const { data, error } = await supabase
        .from('keranjang')
        .update({ quantity: newQty })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      // Jika tidak ditemukan, error PGRST116 berarti no rows; insert baru
      if (selError && selError.code !== 'PGRST116') throw selError
      const { data, error } = await supabase
        .from('keranjang')
        .insert({
          user_id: userId,
          produk_id: produkId,
          quantity,
          size
        })
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  // Update cart item quantity
  async updateQuantity(id: string, quantity: number) {
    const { data, error } = await supabase
      .from('keranjang')
      .update({ quantity })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Remove item from cart
  async removeItem(id: string) {
    const { error } = await supabase
      .from('keranjang')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  // Clear user cart
  async clearCart(userId: string) {
    const { error } = await supabase
      .from('keranjang')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return true
  }
}

// =============================================
// FAVORIT (WISHLIST) FUNCTIONS
// =============================================

export const favoritDb = {
  // Get user favorites
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('favorit')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          photo1,
          harga
        )
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data
  },

  // Add to favorites
  async add(userId: string, produkId: string) {
    const { data, error } = await supabase
      .from('favorit')
      .insert([{ user_id: userId, produk_id: produkId }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Remove from favorites
  async remove(id: string) {
    const { error } = await supabase
      .from('favorit')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  // Check if product is in favorites
  async isFavorite(userId: string, produkId: string) {
    const { data, error } = await supabase
      .from('favorit')
      .select('id')
      .eq('user_id', userId)
      .eq('produk_id', produkId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }
}

// =============================================
// ORDER FUNCTIONS
// =============================================

export const orderDb = {
  // Create new order
  async create(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user orders
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get order with items
  async getWithItems(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          produk:produk_id (
            nama_produk,
            photo1
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error
    return data
  }
}

// =============================================
// VOUCHER FUNCTIONS
// =============================================

export const voucherDb = {
  // Validate voucher by code
  async validateVoucher(voucherCode: string) {
    const { data, error } = await supabase
      .from('voucher')
      .select('*')
      .eq('voucher', voucherCode.toUpperCase())
      .gt('expired', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Get all active vouchers
  async getActiveVouchers() {
    const { data, error } = await supabase
      .from('voucher')
      .select('*')
      .gt('expired', new Date().toISOString())
      .order('total_potongan', { ascending: false })

    if (error) throw error
    return data
  }
}

// =============================================
// PRA-CHECKOUT FUNCTIONS
// =============================================

export const praCheckoutDb = {
  // Create new pra-checkout with items
  async create(userId: string, cartItems: any[], voucherCode?: string, discountAmount = 0) {
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.produk?.harga || 0) * Number(item.quantity || 1)), 0)
    const totalAmount = Math.max(0, subtotal - discountAmount)

    // Create pra-checkout header
    const { data: praCheckout, error: headerError } = await supabase
      .from('pra_checkout')
      .insert([{
        user_id: userId,
        subtotal,
        voucher_code: voucherCode || null,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: 'draft'
      }])
      .select()
      .single()

    if (headerError) throw headerError

    // Create pra-checkout items
    const itemsToInsert = cartItems.map(item => ({
      pra_checkout_id: praCheckout.id,
      produk_id: item.produk_id,
      quantity: item.quantity,
      size: item.size || null,
      harga_satuan: Number(item.produk?.harga || 0),
      subtotal_item: Number(item.produk?.harga || 0) * Number(item.quantity || 1)
    }))

    const { data: items, error: itemsError } = await supabase
      .from('pra_checkout_items')
      .insert(itemsToInsert)
      .select()

    if (itemsError) throw itemsError

    return { praCheckout, items }
  },

  // Get pra-checkout by ID with items
  async getById(id: string) {
    const { data, error } = await supabase
      .from('pra_checkout')
      .select(`
        *,
        pra_checkout_items (
          *,
          produk:produk_id (
            id,
            nama_produk,
            photo1,
            harga
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Get user's pra-checkout records
  async getByUserId(userId: string, status = 'draft') {
    const { data, error } = await supabase
      .from('pra_checkout')
      .select(`
        *,
        pra_checkout_items (
          *,
          produk:produk_id (
            id,
            nama_produk,
            photo1,
            harga
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Update pra-checkout status
  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('pra_checkout')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete pra-checkout
  async delete(id: string) {
    const { error } = await supabase
      .from('pra_checkout')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

// =============================================
// CHECKOUT SUBMISSIONS FUNCTIONS
// =============================================

export const checkoutSubmissionDb = {
  // Create checkout submission snapshot
  async create(payload: {
    user_id: string
    pra_checkout_id: string
    shipping_address: any
    shipping_method: string
    order_summary: any
    subtotal: number
    shipping_cost: number
    total: number
    items: any[]
    status?: string
  }) {
    const { data, error } = await supabase
      .from('checkout_submissions')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update by id
  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('checkout_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get by id (optional helper)
  async getById(id: string) {
    const { data, error } = await supabase
      .from('checkout_submissions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}

// =============================================
// ONGKIR FUNCTIONS
// =============================================

export const ongkirDb = {
  // Get ongkir by ekspedisi name (RLS disabled so anon client works)
  async getByEkspedisi(ekspedisi: string) {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .ilike('ekspedisi', ekspedisi)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  },

  // Get all ongkir records for checkout UI
  async getAll() {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// =============================================
// RETURNS FUNCTIONS
// =============================================

export const returnsDb = {
  // Create a new return request
  async create(payload: {
    user_id: string
    order_id?: string | null
    order_number?: string | null
    reason: string
    description?: string | null
    photo_paths?: string[]
    video_paths?: string[]
    status?: string
    notes?: string | null
  }) {
    const { data, error } = await supabase
      .from('returns')
      .insert([
        {
          ...payload,
          photo_paths: payload.photo_paths || [],
          video_paths: payload.video_paths || []
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Fetch return requests for a user
  async listByUser(userId: string) {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// =============================================
// HOMEPAGE DEALS (PROMOS) FUNCTIONS
// =============================================
export const homepageDealsDb = {
  // Get active homepage deals (publicly selectable via RLS)
  async getActive(limit = 10) {
    const { data, error } = await supabase
      .from('homepage_deals')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  // Get all deals (admin/internal usage; will be constrained by RLS for anon)
  async getAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('homepage_deals')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .range(offset, offset + limit - 1)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Create a deal entry
  async create(payload: {
    produk_id: string
    discount_price?: number | null
    left_poster_img1_url?: string | null
    left_poster_img2_url?: string | null
    right_card_img_url?: string | null
    order_index?: number
    is_active?: boolean
    start_at?: string | null
    end_at?: string | null
  }) {
    const { data, error } = await supabase
      .from('homepage_deals')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update a deal entry
  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('homepage_deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a deal entry
  async delete(id: string) {
    const { error } = await supabase
      .from('homepage_deals')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}

// =============================================
// HOMEPAGE SECTION 2 DEALS FUNCTIONS
// =============================================
export const homepageSection2DealsDb = {
  // Get active deals with product data
  async getActive(limit = 10) {
    const { data, error } = await supabase
      .from('homepage_section2_deals')
      .select(`
        id,
        produk_id,
        harga_diskon,
        discount_percentage,
        urutan_tampilan,
        is_active,
        mulai_tayang,
        selesai_tayang,
        created_at,
        updated_at,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .eq('is_active', true)
      .order('urutan_tampilan', { ascending: true })
      .limit(limit)

    if (error) {
      throw error
    }
    
    return data || []
  },

  // Get all deals (admin/internal usage)
  async getAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('homepage_section2_deals')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .range(offset, offset + limit - 1)
      .order('urutan_tampilan', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Create a new deal
  async create(payload: {
    produk_id: string
    harga_diskon?: number | null
    discount_percentage?: number | null
    urutan_tampilan?: number
    is_active?: boolean
    mulai_tayang?: string | null
    selesai_tayang?: string | null
  }) {
    const { data, error } = await supabase
      .from('homepage_section2_deals')
      .insert([payload])
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  // Update a deal
  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('homepage_section2_deals')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  // Delete a deal
  async delete(id: string) {
    const { error } = await supabase
      .from('homepage_section2_deals')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  // Get active deal by product ID
  async getByProductId(produkId: string) {
    const { data, error } = await supabase
      .from('homepage_section2_deals')
      .select(`
        *,
        produk:produk_id (
          id,
          nama_produk,
          deskripsi,
          photo1,
          photo2,
          harga,
          size1,
          size2,
          size3,
          size4,
          size5,
          kategori
        )
      `)
      .eq('produk_id', produkId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }
}
