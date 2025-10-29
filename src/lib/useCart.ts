"use client";
import { useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { keranjangDb } from './database'
import { supabase } from './supabase'

export function useCart() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)

  const load = async () => {
    if (!user) { setItems([]); return }
    try {
      setLoading(true)
      const data = await keranjangDb.getByUserId(user.id)
      setItems(data || [])
    } finally { setLoading(false) }
  }

  const loadCount = async () => {
    if (!user) { setCount(0); return }
    try {
      // Lightweight count-only query (no join)
      const { count, error } = await supabase
        .from('keranjang')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (error) throw error
      setCount(count || 0)
      // cache for fast initial paint after refresh
      try { localStorage.setItem(`cart_count_${user.id}`, String(count || 0)) } catch {}
    } catch {
      // Fallback: load list then derive count by length
      await load()
      const fallback = (items || []).length
      setCount(fallback)
      try { if (user) localStorage.setItem(`cart_count_${user.id}`, String(fallback)) } catch {}
    }
  }

  useEffect(() => {
    // seed from cache to avoid 0 flash on refresh
    if (user) {
      try {
        const cached = localStorage.getItem(`cart_count_${user.id}`)
        if (cached !== null) setCount(Number(cached) || 0)
      } catch {}
    } else {
      setCount(0)
    }
    load(); loadCount()
  }, [user])

  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`cart-badge-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'keranjang', filter: `user_id=eq.${user.id}` }, () => {
        load(); loadCount()
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [user])

  useEffect(() => {
    // Keep count in sync if items change via non-realtime path
    const len = (items || []).length
    setCount(len)
    try { if (user) localStorage.setItem(`cart_count_${user.id}`, String(len)) } catch {}
  }, [items])

  return { items, count, loading, refresh: async () => { await load(); await loadCount() } }
}
