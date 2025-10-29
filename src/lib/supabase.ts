import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Debug: confirm env presence in client
// These logs are safe (booleans only), no secrets shown
console.log('SB URL present?', !!supabaseUrl, 'Key present?', !!supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database tables
export interface User {
  id: string
  email: string
  password: string
  nama: string
  created_at: string
  updated_at: string
  shipping_nama?: string | null
  shipping_phone?: string | null
  shipping_street?: string | null
  shipping_kabupaten?: string | null
  shipping_kecamatan?: string | null
  shipping_kelurahan?: string | null
  shipping_provinsi?: string | null
  shipping_provinsi_id?: string | null
  shipping_kabupaten_id?: string | null
  shipping_kecamatan_id?: string | null
  shipping_kelurahan_id?: string | null
  shipping_postal_code?: string | null
  shipping_negara?: string | null
  shipping_address_json?: any
}

export interface Produk {
  id: string
  nama_produk: string
  deskripsi?: string
  size1?: string
  size2?: string
  size3?: string
  size4?: string
  size5?: string
  photo1?: string
  photo2?: string
  photo3?: string
  harga?: number
  stok?: number
  kategori?: string
  created_at: string
  updated_at: string
}

export interface Keranjang {
  id: string
  user_id: string
  produk_id: string
  quantity: number
  size?: string
  created_at: string
  updated_at: string
}

export interface Favorit {
  id: string
  user_id: string
  produk_id: string
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  total_amount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address?: string
  payment_method?: string
  shipping_status?: string
  shipping_resi?: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  produk_id: string
  quantity: number
  size?: string
  price: number
  created_at: string
}
