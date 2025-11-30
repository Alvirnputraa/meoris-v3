"use client";
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './auth-context'
import { keranjangDb } from './database'
import { supabase } from './supabase'

export function useCart() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const deletingItemsRef = useRef<Set<string>>(new Set())
  const lastOptimisticUpdateRef = useRef<number>(0)

  const load = useCallback(async () => {
    if (!user) { setItems([]); return }
    try {
      setLoading(true)
      const data = await keranjangDb.getByUserId(user.id)
      // Filter out items that are currently being deleted
      const filteredData = (data || []).filter(item => !deletingItemsRef.current.has(item.id))
      setItems(filteredData)
    } finally { setLoading(false) }
  }, [user])

  const loadCount = useCallback(async () => {
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
    } catch (error) {
      console.error('Error loading cart count:', error)
      // On error, set count to 0
      setCount(0)
    }
  }, [user])

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
  }, [user, load, loadCount])

  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`cart-badge-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'keranjang', filter: `user_id=eq.${user.id}` }, () => {
        // Delay to ensure database operations are fully propagated
        // and don't revert optimistic updates
        setTimeout(() => {
          // Check if an optimistic update happened recently (within 2 seconds)
          const timeSinceOptimistic = Date.now() - lastOptimisticUpdateRef.current
          const hasRecentOptimisticUpdate = timeSinceOptimistic < 2000

          // Only refresh if no pending deletes AND no recent optimistic updates
          if (deletingItemsRef.current.size === 0 && !hasRecentOptimisticUpdate) {
            load(); loadCount()
          } else {
            // Just load items, keep optimistic count
            load()
          }
        }, 100)
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [user, load, loadCount])

  // Listen for cart count updates from other useCart instances (cross-component sync)
  useEffect(() => {
    if (!user) return

    const handleCountUpdate = (event: CustomEvent) => {
      const { count: newCount, userId } = event.detail
      if (userId === user.id) {
        setCount(newCount)
        lastOptimisticUpdateRef.current = Date.now()
      }
    }

    window.addEventListener('cart-count-update', handleCountUpdate as EventListener)
    return () => window.removeEventListener('cart-count-update', handleCountUpdate as EventListener)
  }, [user])

  // Listen for localStorage changes from OTHER TABS (cross-tab sync)
  useEffect(() => {
    if (!user) return

    const handleStorageChange = (event: StorageEvent) => {
      // Only react to cart count changes for this user
      if (event.key === `cart_count_${user.id}` && event.newValue !== null) {
        const newCount = Number(event.newValue) || 0
        setCount(newCount)
        lastOptimisticUpdateRef.current = Date.now()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user])

  const refresh = useCallback(async () => {
    await load();
    await loadCount();
  }, [load, loadCount])

  // Reload only items without reloading count (preserves optimistic count updates)
  const reloadItems = useCallback(async () => {
    await load();
  }, [load])

  const removeItem = useCallback(async (itemId: string) => {
    if (!user) return

    // Store original item for rollback on error
    const originalItem = items.find(item => item.id === itemId)

    // Optimistic update: Remove from UI immediately
    const newCount = Math.max(0, count - 1)
    setItems(prevItems => prevItems.filter(item => item.id !== itemId))
    setCount(newCount)

    // Track when optimistic update happened to prevent realtime from overwriting
    lastOptimisticUpdateRef.current = Date.now()

    // Track as deleting to prevent realtime from adding it back
    deletingItemsRef.current.add(itemId)

    // Update localStorage cache immediately for persistence
    try {
      localStorage.setItem(`cart_count_${user.id}`, String(newCount))
    } catch {}

    // Dispatch custom event to sync all useCart instances
    window.dispatchEvent(new CustomEvent('cart-count-update', { detail: { count: newCount, userId: user.id } }))

    try {
      // Delete from database in background
      await keranjangDb.removeItem(itemId)

      // Keep in deletingItemsRef for a bit longer to prevent flicker
      await new Promise(resolve => setTimeout(resolve, 600))
    } catch (error) {
      console.error('Failed to remove cart item:', error)

      // Rollback on error: restore the item
      if (originalItem) {
        const rollbackCount = count
        setItems(prevItems => [...prevItems, originalItem])
        setCount(rollbackCount)
        // Rollback localStorage cache
        try {
          localStorage.setItem(`cart_count_${user.id}`, String(rollbackCount))
        } catch {}
        // Sync rollback to all instances
        window.dispatchEvent(new CustomEvent('cart-count-update', { detail: { count: rollbackCount, userId: user.id } }))
      }
    } finally {
      // Clean up after animation is complete
      deletingItemsRef.current.delete(itemId)
    }
  }, [user, items, count])

  const updateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (!user || newQuantity < 1) return

    // Store original for rollback
    const originalItem = items.find(item => item.id === itemId)
    if (!originalItem) return

    // Optimistic update
    setItems(prevItems => prevItems.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ))

    try {
      // Update in database
      await supabase
        .from('keranjang')
        .update({ quantity: newQuantity })
        .eq('id', itemId)
    } catch (error) {
      console.error('Failed to update cart quantity:', error)
      // Rollback on error
      setItems(prevItems => prevItems.map(item =>
        item.id === itemId ? originalItem : item
      ))
    }
  }, [user, items])

  const addItem = useCallback(async (productId: string, quantity: number = 1, size?: string) => {
    if (!user) return

    // Optimistic update: Increment count immediately
    setCount(prevCount => prevCount + 1)

    // Track when optimistic update happened
    lastOptimisticUpdateRef.current = Date.now()

    // Update localStorage cache immediately
    try {
      const currentCount = Number(localStorage.getItem(`cart_count_${user.id}`) || 0)
      localStorage.setItem(`cart_count_${user.id}`, String(currentCount + 1))
    } catch {}

    try {
      // Add to database
      await keranjangDb.addItem(user.id, productId, quantity, size)
      // Reload items to get the new item with full product details
      await load()
    } catch (error) {
      console.error('Failed to add cart item:', error)
      // Rollback on error
      setCount(prevCount => Math.max(0, prevCount - 1))
      try {
        const currentCount = Number(localStorage.getItem(`cart_count_${user.id}`) || 0)
        localStorage.setItem(`cart_count_${user.id}`, String(Math.max(0, currentCount - 1)))
      } catch {}
      throw error // Re-throw so caller can handle
    }
  }, [user, load])

  // Synchronous optimistic count increment (for immediate UI feedback before async operation)
  const incrementCount = useCallback(() => {
    if (!user) return
    const newCount = count + 1
    setCount(newCount)
    lastOptimisticUpdateRef.current = Date.now()
    try {
      localStorage.setItem(`cart_count_${user.id}`, String(newCount))
    } catch {}
    // Dispatch custom event to sync all useCart instances
    window.dispatchEvent(new CustomEvent('cart-count-update', { detail: { count: newCount, userId: user.id } }))
  }, [user, count])

  return { items, count, loading, refresh, reloadItems, removeItem, updateQuantity, addItem, incrementCount }
}
