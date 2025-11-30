"use client";
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, produkDb } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { formatPaymentMethod } from '@/lib/paymentMethodFormatter'

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [userMenuOpenDesktop, setUserMenuOpenDesktop] = useState(false)
  const [userMenuOpenMobile, setUserMenuOpenMobile] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [copyNotification, setCopyNotification] = useState<{ show: boolean; success: boolean; message: string }>({ show: false, success: true, message: '' })
  const { items: cartItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [orderMeta, setOrderMeta] = useState<{ created_at?: string | null; status?: string | null; shipping_status?: string | null; shipping_method?: string | null; shipping_resi?: string | null; payment_method?: string | null; total_amount?: number | null; shipping_address_json?: any | null; checkout_submission_id?: string | null; shipping_cost?: number | null; order_summary?: any | null; delivered_at?: string | null }>({})
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [orderLoading, setOrderLoading] = useState<boolean>(true)
  const [detailSplash, setDetailSplash] = useState<boolean>(true)
  const [mounted, setMounted] = useState<boolean>(false)

  // Limit full-screen loading to a short splash on first render
  useEffect(() => {
    const t = setTimeout(() => setDetailSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFavoriteCheckbox = (favoriteId: string, checked: boolean) => {
    setSelectedFavorites(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(favoriteId); else newSet.delete(favoriteId);
      return newSet;
    });
  };

  const handleCloseFavSidebar = () => {
    setIsFavOpen(false);
    setSelectedFavorites(new Set());
  };

  useEffect(() => {
    setViewItems(cartItems || [])
  }, [cartItems])

  useEffect(() => {
    if (isCartOpen) {
      refresh()
    }
  }, [isCartOpen, refresh])

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  // Load order meta (created_at, shipping_status) for header sentence
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!orderId || !user) return
      try {
        setOrderLoading(true)
        const { data, error } = await supabase
          .from('orders')
          .select(`
            user_id,
            created_at,
            status,
            shipping_status,
            shipping_resi,
            payment_method,
            total_amount,
            shipping_address_json,
            checkout_submission_id,
            delivered_at,
            order_items (
              *,
              produk:produk_id (
                nama_produk,
                photo1,
                harga
              )
            ),
            checkout_submissions:checkout_submission_id ( shipping_method, shipping_cost, order_summary )
          `)
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single()
        if (error || !data) {
          if (!cancelled) router.replace('/produk/pesanan')
          return
        }
        const shipping_method = (data as any)?.checkout_submissions?.shipping_method || null
        const shipping_cost = Number((data as any)?.checkout_submissions?.shipping_cost || 0)
        const order_summary = (data as any)?.checkout_submissions?.order_summary || null
        const items = (data as any)?.order_items || []
        if (!cancelled) {
          setOrderMeta({
            created_at: (data as any)?.created_at,
            status: (data as any)?.status,
            shipping_status: (data as any)?.shipping_status,
            shipping_method,
            shipping_resi: (data as any)?.shipping_resi,
            payment_method: (data as any)?.payment_method,
            total_amount: Number((data as any)?.total_amount || 0),
            shipping_address_json: (data as any)?.shipping_address_json || null,
            checkout_submission_id: (data as any)?.checkout_submission_id || null,
            shipping_cost,
            order_summary,
            delivered_at: (data as any)?.delivered_at || null
          })
          setOrderItems(items)
        }
      } catch (e) {
        if (!cancelled) setOrderMeta({})
      } finally {
        if (!cancelled) setOrderLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId, user?.id])

  // Realtime: subscribe to orders updates for this orderId
  useEffect(() => {
    if (!orderId) return
    const ch = supabase
      .channel(`order-meta-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload: any) => {
        const row = payload?.new || payload?.old
        if (!row) return
        setOrderMeta((prev) => ({
          ...prev,
          created_at: row.created_at ?? prev.created_at ?? null,
          status: row.status ?? prev.status ?? null,
          shipping_status: row.shipping_status ?? prev.shipping_status ?? null,
          shipping_resi: row.shipping_resi ?? prev.shipping_resi ?? null,
          payment_method: row.payment_method ?? prev.payment_method ?? null,
          total_amount: typeof row.total_amount !== 'undefined' ? Number(row.total_amount || 0) : (prev.total_amount ?? 0),
          shipping_address_json: typeof row.shipping_address_json !== 'undefined' ? (row.shipping_address_json || null) : (prev.shipping_address_json ?? null),
          checkout_submission_id: row.checkout_submission_id ?? prev.checkout_submission_id ?? null,
          delivered_at: row.delivered_at ?? prev.delivered_at ?? null
        }))
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [orderId])

  // Realtime: subscribe to checkout_submissions for shipping_method updates
  useEffect(() => {
    const subId = orderMeta?.checkout_submission_id
    if (!subId) return
    const ch = supabase
      .channel(`order-submission-${subId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkout_submissions', filter: `id=eq.${subId}` }, (payload: any) => {
        const row = payload?.new || payload?.old
        if (!row) return
        setOrderMeta((prev) => ({
          ...prev,
          shipping_method: row.shipping_method ?? prev.shipping_method ?? null,
          shipping_cost: typeof row.shipping_cost !== 'undefined' ? Number(row.shipping_cost || 0) : (prev.shipping_cost ?? 0),
          order_summary: typeof row.order_summary !== 'undefined' ? (row.order_summary || null) : (prev.order_summary ?? null)
        }))
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [orderMeta?.checkout_submission_id])

  const showSplash = mounted && (isLoading || (!!user?.id && orderLoading && detailSplash))

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      setRemovingId(itemId)
      setViewItems((items) => items.filter((it: any) => it.id !== itemId))
      await keranjangDb.removeItem(itemId)
    } finally {
      setRemovingId(null)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const results = await produkDb.search(searchQuery.trim());
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    !mounted ? null : showSplash ? (
      <div className="min-h-screen bg-white flex items-center justify-center font-belleza">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : !user ? (
      <div className="min-h-screen bg-white font-belleza" />
    ) : (
    <main className="min-h-screen flex flex-col font-belleza">
      {/* Left sidebar (menu) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-full w-80 md:w-96 max-w-[75%] bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-2xl overflow-hidden transform transition-transform">
            {/* Header dengan gradient */}
            <div className="relative bg-gradient-to-r from-black via-gray-900 to-black p-4 pt-6">
              <button
                type="button"
                aria-label="Tutup menu"
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer transition-all hover:scale-110"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Brand Logo */}
              <div className="mt-2">
                <span className="font-cormorant text-2xl font-bold text-white tracking-wider">MEORIS</span>
                <div className="mt-0.5 text-[10px] tracking-[0.3em] uppercase text-gray-300">Footwear</div>
              </div>

              {/* User Profile Card */}
              {user && (
                <div className="mt-4 p-2.5 rounded-lg bg-white/10 backdrop-blur border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-xs">
                      {(user as any)?.nama?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{(user as any)?.nama || 'User'}</p>
                      <p className="text-[10px] text-gray-300 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="p-3 pt-5">
              <ul className="space-y-1 font-belleza">
                <li>
                  <Link
                    href="/home"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Beranda</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/produk"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Produk</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/my-account"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Informasi Akun</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pengembalian"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Pengembalian Barang</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>

                {/* Divider */}
                <li className="py-1.5">
                  <div className="border-t border-gray-300"></div>
                </li>

                <li>
                  <Link
                    href="/produk/pesanan"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Pesanan</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/histori/transaksi"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">History Transaksi</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
              </ul>

              {/* Logout Button */}
              {user && (
                <div className="mt-4 pt-3 border-t border-gray-300">
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      // Add logout handler here if needed
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg text-xs"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Right panels: Search, Cart, Favorite */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseSearchSidebar} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={handleCloseSearchSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Cari Produk</span>
            </div>
            <div className="mt-6">
              <input
                type="text"
                placeholder="Cari produk"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHasSearched(false)
                  setSearchResults([])
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40"
              />
              <div className="mt-3">
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="w-full rounded-none bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {searchLoading ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>
            <div className="mt-6">
              <p className="font-cormorant text-black">Hasil pencarian</p>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-5">
              {searchLoading ? (
                <p className="text-sm text-gray-600">Mencari produk...</p>
              ) : hasSearched ? (
                searchResults.length > 0 ? (
                  searchResults.map((product: any) => (
                    <Link key={product.id} href={`/produk/${product.id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer">
                      <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        {product.photo1 ? (
                          <Image src={product.photo1} alt={product.nama_produk} fill sizes="64px" className="object-cover" />
                        ) : (
                          <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-belleza text-gray-900 truncate">{product.nama_produk}</p>
                        <p className="font-belleza text-sm text-gray-700 mt-1">Rp {Number(product.harga || 0).toLocaleString('id-ID')}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">Tidak ada hasil untuk "{searchQuery}"</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Masukkan kata kunci untuk mencari produk</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup keranjang" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsCartOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Item Keranjang</span>
            </div>
            <div className="mt-6 space-y-5">
              {cartLoading && viewItems.length === 0 ? (
                <p className="text-sm text-gray-600">Memuat keranjang...</p>
              ) : viewItems.length === 0 ? (
                <p className="text-sm text-gray-600">Keranjang kosong</p>
              ) : (
                viewItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {item.produk?.photo1 ? (
                        <Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-belleza text-gray-900 truncate">{item.produk?.nama_produk || 'Produk'}</p>
                      <p className="font-belleza text-sm text-gray-700 mt-1"><span className="text-black">{item.quantity} x</span> Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}{item.size ? <span className="ml-2 text-gray-500">Uk: {item.size}</span> : null}</p>
                    </div>
                    <button type="button" aria-label="Hapus item" className="p-2 rounded hover:bg-gray-100 text-black disabled:opacity-50" onClick={() => handleRemoveCartItem(item.id)} disabled={removingId === item.id}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-4">
              <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <Link href="/produk/detail-checkout" className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full">
                  Checkout
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {isFavOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseFavSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6">
            <button
              type="button"
              aria-label="Tutup favorit"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={handleCloseFavSidebar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Favorit</span>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-5">
              {favoritesLoading && (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Memuat favorit...</p>
              ) : (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Belum ada favorit</p>
              ) : (
                favorites.map((favorite) => (
                  <Link key={favorite.id} href={`/produk/${favorite.produk_id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer">
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {favorite.produk?.photo1 ? (
                        <Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk favorit" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-belleza text-gray-900 truncate">{favorite.produk?.nama_produk || 'Produk'}</p>
                      <p className="font-belleza text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Hapus item"
                      className="p-2 rounded hover:bg-gray-100 text-black"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await toggleFavorite(favorite.produk_id);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop header */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-10 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black" onClick={() => setIsSidebarOpen(true)}>
              <Image src="/images/sidebar.png" alt="Menu" width={28} height={28} />
            </button>
            <Link href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-cormorant font-bold text-2xl tracking-wide text-black">MEORIS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#" aria-label="Favorit" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
            </a>
            <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="9" cy="21" r="1" fill="currentColor"/>
                <circle cx="20" cy="21" r="1" fill="currentColor"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
            </a>
            <div className="relative" onMouseEnter={() => setUserMenuOpenDesktop(true)} onMouseLeave={() => setUserMenuOpenDesktop(false)}>
              <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${userMenuOpenDesktop ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                <Link href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</Link>
                <Link href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black" onClick={() => setIsSidebarOpen(true)}>
              <Image src="/images/sidebar.png" alt="Menu" width={28} height={28} />
            </button>
            <Link href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-cormorant font-bold text-xl tracking-wide text-black">MEORIS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#" aria-label="Favorit" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
            </a>
            <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="9" cy="21" r="1" fill="currentColor"/>
                <circle cx="20" cy="21" r="1" fill="currentColor"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
            </a>
            <div className="relative" onMouseEnter={() => setUserMenuOpenMobile(true)} onMouseLeave={() => setUserMenuOpenMobile(false)}>
              <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${userMenuOpenMobile ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                <Link href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</Link>
                <Link href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content wrapper with flex-1 to push footer down */}
      <div className="flex-1 flex flex-col">
      {/* Section 1: breadcrumb & title */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div className="absolute inset-0 -z-10 bg-center bg-cover" aria-hidden="true" style={{ backgroundImage: 'url(/images/bg22.png)' }} />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8 flex flex-col items-center justify-center text-gray-100">
          <h1 className="font-cormorant text-2xl md:text-3xl text-gray-100">Detail Pesanan</h1>
          <div className="mt-2 font-belleza text-xs md:text-sm text-gray-100">
            <span>Beranda</span>
            <span className="mx-1">&gt;</span>
            <span>Pesanan</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">{orderId.replace(/-/g, '').slice(0, 8)}</span>
          </div>
        </div>
      </section>

      {/* Section 2: order details - Single Vertical Card */}
      <section className="bg-white py-4 md:py-8">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {/* Single Vertical Card */}
          <div className="border border-gray-300 bg-gradient-to-br from-white to-gray-50 shadow-sm">
            {/* Header: Order ID & Date */}
            <div className="bg-gradient-to-r from-gray-900 to-black px-3 md:px-4 py-2 md:py-2.5">
              {(() => {
                const displayId = orderId ? orderId.replace(/-/g, '').slice(0, 8) : ''
                const createdAt = orderMeta?.created_at ? new Date(orderMeta.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'
                return (
                  <div className="flex items-center justify-between">
                    <p className="font-belleza text-xs md:text-sm text-white">
                      <span className="font-semibold">#{displayId}</span> <span className="text-gray-400">•</span> {createdAt}
                    </p>
                  </div>
                )
              })()}
            </div>

            {/* Informasi Pengiriman */}
            <div className="px-3 md:px-4 py-3 md:py-3.5 border-b border-gray-200">
              <h2 className="font-cormorant text-base md:text-lg text-black mb-2 md:mb-2.5">Informasi Pengiriman</h2>

              {/* Ekspedisi */}
              <div className="mb-2 md:mb-2.5">
                <div className="text-[11px] md:text-xs text-gray-600 font-belleza mb-1">Ekspedisi</div>
                <div className="flex items-center gap-2 font-belleza text-xs md:text-sm text-gray-900">
                  {(() => {
                    const m = (orderMeta?.shipping_method || '').toLowerCase()
                    if (m.includes('j&t')) {
                      return <Image src="/images/j&t.png" alt="J&T" width={24} height={24} className="w-6 h-6 md:w-7 md:h-7" />
                    }
                    if (m.includes('jne')) {
                      return <Image src="/images/jne.png" alt="JNE" width={24} height={24} className="w-6 h-6 md:w-7 md:h-7" />
                    }
                    return null
                  })()}
                  <span>{orderMeta?.shipping_method || 'Belum ditentukan'}</span>
                </div>
              </div>

              {/* Nomor Resi */}
              <div className="mb-2 md:mb-2.5">
                <div className="text-[11px] md:text-xs text-gray-600 font-belleza mb-1">Nomor Resi</div>
                <div className="flex items-center gap-2 font-belleza text-xs md:text-sm text-gray-900">
                  <span className="select-all flex-1">{orderMeta?.shipping_resi || 'Belum tersedia'}</span>
                  <button
                    type="button"
                    aria-label="Salin nomor resi"
                    className="p-1 rounded hover:bg-gray-200 text-black transition-colors shrink-0"
                    onClick={async () => {
                      try {
                        if (orderMeta?.shipping_resi) {
                          await navigator.clipboard.writeText(orderMeta.shipping_resi)
                          setCopyNotification({ show: true, success: true, message: 'Nomor resi berhasil disalin!' })
                          setTimeout(() => setCopyNotification({ show: false, success: true, message: '' }), 3000)
                        }
                      } catch (err) {
                        setCopyNotification({ show: true, success: false, message: 'Gagal menyalin nomor resi' })
                        setTimeout(() => setCopyNotification({ show: false, success: true, message: '' }), 3000)
                      }
                    }}
                    disabled={!orderMeta?.shipping_resi}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-4 md:h-4">
                      <path d="M9 9h10v11H9z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Button Lacak Pesanan */}
              <div className="mt-2">
                {(() => {
                  const resi = orderMeta?.shipping_resi || ''
                  const placeholder = ['Pesanan sedang disiapkan','Pesanan belum dikirim ke jasa kirim', 'Belum tersedia']
                  const disabled = !resi || placeholder.includes(resi) || resi.length < 6
                  if (disabled) {
                    return (
                      <button
                        type="button"
                        className="w-full md:w-auto rounded-none bg-gray-300 text-gray-600 px-4 py-1.5 md:py-2 font-belleza text-xs md:text-sm cursor-not-allowed"
                        disabled
                      >
                        Lacak Pesanan - Belum Tersedia
                      </button>
                    )
                  }
                  return (
                    <Link
                      href={`/produk/pesanan/${orderId}/lacak`}
                      target="_blank"
                      className="inline-flex items-center justify-center w-full md:w-auto rounded-none bg-black text-white px-4 py-1.5 md:py-2 font-belleza text-xs md:text-sm hover:opacity-90 transition-opacity"
                    >
                      Lacak Pesanan
                    </Link>
                  )
                })()}
              </div>
            </div>

            {/* Alamat Pengiriman */}
            <div className="px-3 md:px-4 py-3 md:py-3.5 border-b border-gray-200">
              <h2 className="font-cormorant text-base md:text-lg text-black mb-2 md:mb-2.5">Alamat Pengiriman</h2>

              {orderMeta?.shipping_address_json ? (
                <div className="space-y-2">
                  {/* Nama */}
                  <div>
                    <div className="text-[11px] md:text-xs text-gray-600 font-belleza mb-0.5">Nama</div>
                    <div className="font-belleza text-xs md:text-sm text-gray-900">
                      {orderMeta.shipping_address_json.nama}
                    </div>
                  </div>

                  {/* No Telepon */}
                  {orderMeta.shipping_address_json.telepon ? (
                    <div>
                      <div className="text-[11px] md:text-xs text-gray-600 font-belleza mb-0.5">No Telepon</div>
                      <div className="font-belleza text-xs md:text-sm text-gray-900">
                        {orderMeta.shipping_address_json.telepon}
                      </div>
                    </div>
                  ) : null}

                  {/* Alamat */}
                  <div>
                    <div className="text-[11px] md:text-xs text-gray-600 font-belleza mb-0.5">Alamat</div>
                    <div className="font-belleza text-xs md:text-sm text-gray-900 leading-relaxed">
                      {[
                        orderMeta.shipping_address_json.alamat || null,
                        orderMeta.shipping_address_json.kelurahan ? `Kel. ${orderMeta.shipping_address_json.kelurahan}` : null,
                        orderMeta.shipping_address_json.kecamatan ? `Kec. ${orderMeta.shipping_address_json.kecamatan}` : null,
                        orderMeta.shipping_address_json.kota || orderMeta.shipping_address_json.kabupaten || null,
                        orderMeta.shipping_address_json.provinsi || null,
                        orderMeta.shipping_address_json.kode_pos || null,
                        'Indonesia'
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-belleza text-gray-600 text-xs md:text-sm text-center py-3">
                  Belum ada alamat pengiriman
                </div>
              )}
            </div>

            {/* Detail Pesanan */}
            <div className="px-3 md:px-4 py-3 md:py-3.5 border-b border-gray-200">
              <h2 className="font-cormorant text-base md:text-lg text-black mb-2 md:mb-2.5">Detail Pesanan</h2>

              {orderItems && orderItems.length > 0 ? (
                <div className="space-y-2">
                  {orderItems.map((it: any) => {
                    const name = it?.produk?.nama_produk || it?.nama_produk || 'Produk'
                    const qty = Number(it?.quantity || 0)
                    const size = it?.size ? ` (Ukuran: ${it.size})` : ''
                    const lineTotal = Number(it?.price || 0) * qty
                    return (
                      <div key={it.id} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                        <div className="font-belleza text-xs md:text-sm text-black mb-0.5">
                          {name}{size}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-belleza text-[11px] md:text-xs text-gray-600">
                            Jumlah: {qty}
                          </div>
                          <div className="font-belleza text-xs md:text-sm text-gray-900 font-semibold">
                            Rp {lineTotal.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Summary */}
                  <div className="pt-2 mt-2 border-t-2 border-gray-300 space-y-1.5">
                    {/* Pembayaran */}
                    <div className="flex items-center justify-between">
                      <div className="font-belleza text-xs md:text-sm text-gray-700">Pembayaran</div>
                      <div className="font-belleza text-xs md:text-sm text-gray-900">
                        {formatPaymentMethod(orderMeta?.payment_method)}
                      </div>
                    </div>

                    {/* Subtotal Produk */}
                    <div className="flex items-center justify-between">
                      <div className="font-belleza text-xs md:text-sm text-gray-600">Subtotal Produk</div>
                      <div className="font-belleza text-xs md:text-sm text-gray-800">
                        Rp {(() => {
                          const subtotalProduk = orderItems.reduce((sum, it: any) => {
                            return sum + (Number(it?.price || 0) * Number(it?.quantity || 0))
                          }, 0)
                          return subtotalProduk.toLocaleString('id-ID')
                        })()}
                      </div>
                    </div>

                    {/* Biaya Pengiriman */}
                    <div className="flex items-center justify-between">
                      <div className="font-belleza text-xs md:text-sm text-gray-600">Biaya Pengiriman</div>
                      <div className="font-belleza text-xs md:text-sm text-gray-800">
                        Rp {Number(orderMeta?.shipping_cost || 0).toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Potongan Voucher (hanya tampil jika ada voucher) */}
                    {orderMeta?.order_summary?.discount && Number(orderMeta.order_summary.discount) > 0 ? (
                      <div className="flex items-center justify-between">
                        <div className="font-belleza text-xs md:text-sm text-green-600">
                          Potongan Voucher
                          {orderMeta?.order_summary?.voucher_code ? ` (${orderMeta.order_summary.voucher_code})` : ''}
                        </div>
                        <div className="font-belleza text-xs md:text-sm text-green-600">
                          - Rp {Number(orderMeta.order_summary.discount).toLocaleString('id-ID')}
                        </div>
                      </div>
                    ) : null}

                    {/* Total */}
                    <div className="flex items-center justify-between">
                      <div className="font-belleza text-xs md:text-sm text-gray-700 font-bold">Total</div>
                      <div className="font-belleza text-sm md:text-base text-gray-900 font-bold">
                        Rp {Number(orderMeta?.total_amount || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-belleza text-gray-600 text-xs md:text-sm text-center py-3">
                  Tidak ada item
                </div>
              )}
            </div>

            {/* Footer: Payment Deadline Warning, Delivered Warning & Ajukan Pengembalian */}
            {(() => {
              const isPending = orderMeta?.status === 'pending' || orderMeta?.status === 'belum bayar'
              const isDelivered = orderMeta?.shipping_status === 'Terkirim' || (orderMeta as any)?.status === 'delivered'
              const deliveredAt = (orderMeta as any)?.delivered_at
              const createdAt = orderMeta?.created_at

              // Calculate payment deadline for pending orders (24 hours from created_at)
              let paymentDeadline = null
              if (isPending && createdAt) {
                const created = new Date(createdAt)
                let deadline = new Date(created.getTime() + (24 * 60 * 60 * 1000)) // Add 24 hours

                // Round UP to next hour (:00) because cron runs every hour at :00
                if (deadline.getMinutes() > 0 || deadline.getSeconds() > 0) {
                  deadline.setHours(deadline.getHours() + 1)
                }
                deadline.setMinutes(0)
                deadline.setSeconds(0)
                deadline.setMilliseconds(0)

                paymentDeadline = deadline.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) + ' pukul ' + deadline.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })
              }

              // Calculate remaining days for return window (2 days from delivered)
              let daysRemaining = null
              let autoCompleteDate = null
              if (isDelivered && deliveredAt) {
                const delivered = new Date(deliveredAt)
                let deadline = new Date(delivered.getTime() + (2 * 24 * 60 * 60 * 1000)) // Add 2 days

                // Round UP to next hour (:00) because cron runs every hour at :00
                if (deadline.getMinutes() > 0 || deadline.getSeconds() > 0) {
                  deadline.setHours(deadline.getHours() + 1)
                }
                deadline.setMinutes(0)
                deadline.setSeconds(0)
                deadline.setMilliseconds(0)

                autoCompleteDate = deadline.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) + ' pukul ' + deadline.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })

                const now = new Date()
                const timeRemaining = deadline.getTime() - now.getTime()
                const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
                daysRemaining = Math.ceil(hoursRemaining / 24)
              }

              return (
                <div className="px-3 md:px-4 py-3 md:py-3.5 bg-gray-50">
                  {/* Payment Deadline Warning - Only for pending/belum bayar status */}
                  {isPending && paymentDeadline && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-belleza text-xs md:text-sm text-yellow-800 font-semibold">
                            Selesaikan pembayaran Anda
                          </p>
                          <p className="font-belleza text-xs text-yellow-700 mt-1">
                            Batas waktu pembayaran Anda sampai <span className="font-semibold">{paymentDeadline}</span>
                          </p>
                          <p className="font-belleza text-xs text-yellow-600 mt-1">
                            Pesanan akan dibatalkan otomatis jika tidak dibayar sebelum batas waktu.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivered Warning */}
                  {isDelivered && autoCompleteDate && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-belleza text-xs md:text-sm text-green-800 font-semibold">
                            Pesanan Anda telah terkirim
                          </p>
                          <p className="font-belleza text-xs text-green-700 mt-1">
                            Pesanan akan terselesaikan otomatis pada <span className="font-semibold">{autoCompleteDate}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ajukan Pengembalian Button - only show if within 2 day window or not delivered yet */}
                  {(!isDelivered || (daysRemaining !== null && daysRemaining > 0)) && (
                    <Link
                      href={`/permintaan-returns/${orderId}`}
                      className="inline-flex items-center justify-center w-full rounded-none border-2 border-blue-600 bg-white text-blue-600 px-4 py-1.5 md:py-2 font-belleza text-xs md:text-sm hover:bg-blue-50 transition-colors"
                    >
                      Ajukan Pengembalian
                    </Link>
                  )}

                  {/* If return window expired */}
                  {isDelivered && daysRemaining !== null && daysRemaining <= 0 && (
                    <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg text-center">
                      <p className="font-belleza text-xs md:text-sm text-gray-600">
                        Masa pengajuan pengembalian telah berakhir
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </section>
      </div>

      {/* Footer (compact mobile version) */}
      <footer className="bg-white py-6 md:py-4 mt-auto">
        <div className="w-full flex justify-center md:justify-end">
          <div className="w-full max-w-6xl md:max-w-7xl px-4 md:px-6">
            {/* Mobile: Original Layout */}
            <div className="grid grid-cols-1 md:hidden gap-4">
              {/* Brand + contact */}
              <div className="space-y-3">
                <div className="-ml-1">
                  <span className="font-cormorant font-bold text-xl tracking-wide text-black">MEORIS</span>
                  <div className="mt-1 text-[9px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
                </div>
                <ul className="space-y-2 font-belleza text-gray-700">
                  <li className="grid grid-cols-[20px_1fr] items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                    <span className="text-xs leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                    <span className="text-xs">+6289695971729</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-xs">info@meoris.erdanpee.com</span>
                  </li>
                </ul>
              </div>

              {/* Information */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Informasi</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><a href="/user/purchase?view=notifications" className="hover:underline">Notifikasi</a></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><a href="/pengembalian" className="hover:underline">Pengembalian</a></li>
                  <li><a href="/terms-condition" className="hover:underline">Syarat & Ketentuan</a></li>
                  <li><a href="/privacy-policy" className="hover:underline">Kebijakan Privasi</a></li>
                </ul>
              </div>

              {/* My Account */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Akun Saya</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><a href="/my-account" className="hover:underline">Detail Akun</a></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
                  <li><a href="/produk/pesanan" className="hover:underline">Pesanan</a></li>
                </ul>
              </div>
            </div>

            {/* Desktop: Right aligned */}
            <div className="hidden md:flex items-center justify-end">
              <div className="font-belleza text-gray-600 text-sm flex items-center flex-wrap justify-end gap-x-2">
                <span className="font-cormorant font-bold text-black">MEORIS</span>
                <span className="text-xs tracking-[0.2em] uppercase text-gray-500">Footwear</span>
                <span className="text-gray-300 mx-1">•</span>
                <a href="/user/purchase?view=notifications" className="hover:text-black transition-colors">Notifikasi</a>
                <span className="text-gray-300">•</span>
                <a href="/pengembalian" className="hover:text-black transition-colors">Pengembalian</a>
                <span className="text-gray-300">•</span>
                <a href="/terms-condition" className="hover:text-black transition-colors">Syarat & Ketentuan</a>
                <span className="text-gray-300">•</span>
                <a href="/privacy-policy" className="hover:text-black transition-colors">Kebijakan Privasi</a>
                <span className="text-gray-300">•</span>
                <a href="/my-account" className="hover:text-black transition-colors">Detail Akun</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Copy Notification Popup */}
      {copyNotification.show && (
        <div className="fixed top-20 md:top-24 right-4 z-[100] animate-slideInRight">
          <div className={`rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[280px] ${
            copyNotification.success
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {copyNotification.success ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
            <span className="font-belleza text-sm">{copyNotification.message}</span>
          </div>
        </div>
      )}
    </main>
    )
  )
}
