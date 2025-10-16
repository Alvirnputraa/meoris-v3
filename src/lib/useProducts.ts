import { useState, useEffect } from 'react'
import { produkDb } from './database'

export interface Product {
  id: string
  nama_produk: string
  deskripsi: string | null
  photo1: string | null
  photo2: string | null
  photo3: string | null
  harga: number
  stok: number
  kategori: string | null
  size1: string | null
  size2: string | null
  size3: string | null
  size4: string | null
  size5: string | null
  created_at: string
  updated_at: string
}

export function useProducts(limit: number = 8) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await produkDb.getAll(limit, 0)
        console.log('Produk data (initial):', data)
        setProducts(data)
      } catch (err) {
        console.error('Error fetching products:', err)
        console.error('Env check:', {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        })
        setError('Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [limit])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await produkDb.getAll(limit, 0)
      console.log('Produk data (refetch):', data)
      setProducts(data)
    } catch (err) {
      console.error('Error refetching products:', err)
      console.error('Env check:', {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  return {
    products,
    loading,
    error,
    refetch
  }
}
