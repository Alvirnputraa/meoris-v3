"use client";
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, produkDb } from '@/lib/database'

type Submission = {
  id: string
  user_id: string
  payment_method: string | null
  payment_reference: string | null
  payment_details: any | null
  total: number
  status: string
  created_at: string
  payment_expired_at: string | null
  shipping_address?: any | null
  items?: any[] | null
  order_summary?: any | null
}

function TransactionHistoryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = (searchParams?.get('status') || '').toLowerCase()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Submission[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const perPage = 5
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTxn, setSelectedTxn] = useState<Submission | null>(null)
  const [mounted, setMounted] = useState(false)
  const [splash, setSplash] = useState(true)

  // Map internal status -> label yang ditampilkan
  const formatStatus = (s: string) => {
    const key = (s || '').toLowerCase()
    if (key === 'submitted' || key === 'draft') return 'Belum Dibayar'
    if (key === 'pending') return 'Tertunda'
    if (key === 'paid' || key === 'success') return 'Dibayar'
    if (key === 'cancelled' || key === 'canceled') return 'Dibatalkan'
    if (key === 'failed') return 'Gagal'
    return s || '-'
  }

  // Header states (match my-account behavior)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { items: cartItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  // Avoid hydration mismatch by rendering after mount only
  useEffect(() => { setMounted(true) }, [])
  // Short splash
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  // Sync cart to local view
  useEffect(() => {
    setViewItems(cartItems || [])
  }, [cartItems])

  useEffect(() => {
    if (isCartOpen && user) {
      refresh()
    }
  }, [isCartOpen, user, refresh])

  const handleFavoriteCheckbox = (favoriteId: string, checked: boolean) => {
    setSelectedFavorites(prev => {
      const ns = new Set(prev)
      if (checked) ns.add(favoriteId); else ns.delete(favoriteId)
      return ns
    })
  }

  const handleCloseFavSidebar = () => {
    setIsFavOpen(false)
    setSelectedFavorites(new Set())
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setHasSearched(true)
    try {
      const results = await produkDb.search(searchQuery.trim())
      setSearchResults(results || [])
    } catch (e) {
      console.error('Error searching products:', e)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      setRemovingId(itemId)
      setViewItems((items) => items.filter((it: any) => it.id !== itemId))
      await keranjangDb.removeItem(itemId)
    } catch (e) {
      console.error('Gagal menghapus item keranjang', e)
    } finally {
      setRemovingId(null)
    }
  }

  const normalize = (s: string) => (s || '').toLowerCase()
  const isPaid = (s: string) => {
    const k = normalize(s); return k === 'paid' || k === 'success'
  }
  const isFailed = (s: string) => normalize(s) === 'failed'
  const isPendingLike = (s: string) => {
    const k = normalize(s); return k === 'submitted' || k === 'draft' || k === 'pending'
  }

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('checkout_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      let list = (data || []) as Submission[]
      if (statusFilter === 'paid') {
        list = list.filter((x) => isPaid(x.status || ''))
      } else if (statusFilter === 'failed' || statusFilter === 'gagal') {
        list = list.filter((x) => isFailed(x.status || ''))
      } else if (statusFilter === 'pending' || statusFilter === 'tertunda') {
        list = list.filter((x) => isPendingLike(x.status || ''))
      }
      setItems(list)
    } catch (e) {
      console.error('Gagal memuat transaksi:', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user, statusFilter])

  useEffect(() => {
    load()
    setCurrentPage(1)
  }, [load])

  // Realtime subscription: refresh list on any change for this user
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('realtime:checkout_submissions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checkout_submissions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Re-run loader to keep filters consistent
        load()
      })
      .subscribe()

    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [user, load])

  if (!mounted) return null
  if (isLoading || !user) return null

  const showSplash = mounted && splash
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const startIdx = (currentPage - 1) * perPage
  const endIdx = startIdx + perPage
  const pagedItems = items.slice(startIdx, endIdx)

  return (
    !mounted ? null : showSplash ? (
      <div className="min-h-screen bg-white flex items-center justify-center font-belleza">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
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

        {/* Desktop header (fixed) - match my-account */}
        <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-10 py-3">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
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
              <div className="relative" onMouseEnter={() => setUserMenuOpen(true)} onMouseLeave={() => setUserMenuOpen(false)}>
                <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${userMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                  <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                  <Link href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</Link>
                  <Link href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile header (fixed) */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
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
              <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="flex-grow">
        {/* Section 1: breadcrumb & title (match my-account) */}
        <section className="relative overflow-hidden bg-transparent pt-[76px]">
          <div className="absolute inset-0 -z-10 bg-center bg-cover bg-fixed" aria-hidden="true" style={{ backgroundImage: 'url(/images/bg22.png)' }} />
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center">
            <h1 className="font-cormorant text-3xl md:text-4xl text-gray-200 text-center">History Transaksi</h1>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-200 font-belleza">
              <Link href="/" className="hover:underline">Beranda</Link>
              <span>&gt;</span>
              <span className="text-gray-200">History Transaksi</span>
            </div>
          </div>
        </section>

        {/* Search sidebar */}
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
                <input type="text" placeholder="Cari produk" value={searchQuery} onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHasSearched(false)
                  setSearchResults([])
                }} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                <div className="mt-3"><button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()} className="w-full rounded-none bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition disabled:opacity-50">{searchLoading ? 'Mencari...' : 'Cari'}</button></div>
              </div>
              <div className="mt-6"><p className="font-cormorant text-black">Hasil pencarian</p></div>
              <div className="mt-4 flex-1 overflow-y-auto space-y-5">
                {searchLoading ? (
                  <p className="text-sm text-gray-600">Mencari produk...</p>
                ) : hasSearched ? (
                  searchResults.length > 0 ? (
                    searchResults.map((product: any) => (
                      <Link key={product.id} href={`/produk/${product.id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer" onClick={handleCloseSearchSidebar}>
                        <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                          {product.photo1 ? (<Image src={product.photo1} alt={product.nama_produk} fill sizes="64px" className="object-cover" />) : (<Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />)}
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

        {/* Cart sidebar */}
        {isCartOpen && (
          <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} aria-hidden="true" />
            <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
              <button type="button" aria-label="Tutup keranjang" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsCartOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="flex items-center justify-between"><span className="font-cormorant text-xl md:text-2xl text-black">Item Keranjang</span></div>
              <div className="mt-6 flex-1 overflow-y-auto">
                <div className="space-y-5">
                  {(!viewItems || viewItems.length === 0) ? (<p className="text-sm text-gray-600">Keranjang kosong</p>) : (
                    viewItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                          {item.produk?.photo1 ? (<Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />) : (<Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-belleza text-gray-900 truncate">{item.produk?.nama_produk || 'Produk'}</p>
                          <p className="font-belleza text-sm text-gray-700 mt-1"><span className="text-black">{item.quantity} x</span> Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')} {item.size ? <span className="ml-2 text-gray-500">Uk: {item.size}</span> : null}</p>
                        </div>
                        <button type="button" aria-label="Hapus item" className="p-2 rounded hover:bg-gray-100 text-black disabled:opacity-50" onClick={() => handleRemoveCartItem(item.id)} disabled={removingId === item.id}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2">
                  <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {cartItems?.reduce((sum:any, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
                  <div className="mt-4"><Link href="/produk/detail-checkout" onClick={(e) => { if (viewItems.length === 0) e.preventDefault() }} className={`inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm transition w-full ${viewItems.length === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:opacity-90'}`}>Checkout</Link></div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Favorites sidebar */}
        {isFavOpen && (
          <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/40" onClick={handleCloseFavSidebar} aria-hidden="true" />
            <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6">
              <button type="button" aria-label="Tutup favorit" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={handleCloseFavSidebar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="flex items-center justify-between"><span className="font-cormorant text-xl md:text-2xl text-black">Favorit</span></div>
              <div className="mt-6 flex-1 overflow-y-auto space-y-5">
                {(!favorites || favorites.length === 0) ? (<p className="text-sm text-gray-600">Belum ada favorit</p>) : (
                  favorites.map((favorite: any) => (
                    <Link key={favorite.id} href={`/produk/${favorite.produk_id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer" onClick={handleCloseFavSidebar}>
                      <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        {favorite.produk?.photo1 ? (<Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />) : (<Image src="/images/test1p.png" alt="Produk favorit" fill sizes="64px" className="object-cover" />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-belleza text-gray-900 truncate">{favorite.produk?.nama_produk || 'Produk'}</p>
                        <p className="font-belleza text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString('id-ID')}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}
        {/* Section 2: daftar transaksi VA */}
        <section className="bg-white py-6 md:py-10 min-h-[55vh] md:min-h-[60vh]">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between mb-1 md:mb-4">
              <div className="font-cormorant text-lg text-black">Transaksi</div>
              <div className="hidden md:flex items-center gap-2 text-sm">
                <Link href="/histori/transaksi" className={`px-3 py-1 border ${!statusFilter ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Semua</Link>
                <Link href="/histori/transaksi?status=pending" className={`px-3 py-1 border ${(statusFilter === 'pending' || statusFilter === 'tertunda') ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Tertunda</Link>
                <Link href="/histori/transaksi?status=paid" className={`px-3 py-1 border ${statusFilter === 'paid' ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Dibayar</Link>
                <Link href="/histori/transaksi?status=failed" className={`px-3 py-1 border ${statusFilter === 'failed' ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Gagal</Link>
              </div>
            </div>
            {/* Mobile tabs beneath the label, aligned to right */}
            <div className="md:hidden mt-3 mb-3 flex justify-end gap-2 text-sm">
              <Link href="/histori/transaksi" className={`px-3 py-1 border ${!statusFilter ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Semua</Link>
              <Link href="/histori/transaksi?status=pending" className={`px-3 py-1 border ${(statusFilter === 'pending' || statusFilter === 'tertunda') ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Tertunda</Link>
              <Link href="/histori/transaksi?status=paid" className={`px-3 py-1 border ${statusFilter === 'paid' ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Dibayar</Link>
              <Link href="/histori/transaksi?status=failed" className={`px-3 py-1 border ${statusFilter === 'failed' ? 'bg-black text-white' : 'border-gray-300 text-black'}`}>Gagal</Link>
            </div>

            <div className="hidden md:grid grid-cols-12 bg-gray-100 px-4 py-3 font-cormorant text-gray-900 text-sm md:text-base">
              <div className="col-span-2">Reference</div>
              <div className="col-span-3">Metode</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-3 text-right">Aksi</div>
            </div>

            {loading ? (
              <div className="hidden md:grid grid-cols-12 items-center px-4 py-6 border-b border-gray-200">
                <div className="col-span-12 font-belleza text-gray-700">Memuat transaksi...</div>
              </div>
            ) : items.length === 0 ? (
              <div className="hidden md:grid grid-cols-12 items-center px-4 py-6 border-b border-gray-200">
                <div className="col-span-12 font-belleza text-gray-700 text-center">Belum ada transaksi.</div>
              </div>
            ) : (
              pagedItems.map((t) => {
                const details = (t.payment_details || {}) as any
                const amount = Number((t as any).total || 0)
                const status = (t.status || 'submitted')
                const checkoutUrl = details?.checkout_url || details?.tripay?.checkout_url
                // Ambil 8 digit pertama dari reference
                const shortReference = (t.payment_reference || t.id).substring(0, 8)
                return (
                  <div key={t.id} className="hidden md:grid grid-cols-12 items-center px-4 py-4 border-b border-gray-200">
                    <div className="col-span-2 font-cormorant text-gray-900">#{shortReference}</div>
                    <div className="col-span-3 font-belleza text-gray-900">{t.payment_method || '-'}</div>
                    <div className="col-span-2 font-belleza text-gray-900">{formatStatus(status)}</div>
                    <div className="col-span-2 font-belleza text-gray-900 text-right">Rp {amount.toLocaleString('id-ID')}</div>
                    <div className="col-span-3 text-right space-x-2">
                      {status !== 'paid' && checkoutUrl ? (
                        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Bayar</a>
                      ) : null}
                      <button
                        onClick={() => {
                          const s = (t.status || '').toLowerCase()
                          if (s === 'paid' || s === 'success') {
                            router.push(`/payment/${t.id}/succes`)
                          } else if (s === 'failed') {
                            router.push(`/payment/${t.id}/failed`)
                          } else {
                            // Default: arahkan ke pending untuk semua status lain (belum bayar, submitted, draft, pending, cancelled)
                            router.push(`/payment/${t.id}/pending`)
                          }
                        }}
                        className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm ${(['paid','success','failed'].includes((t.status || '').toLowerCase())) ? 'bg-black text-white border border-black hover:opacity-90' : 'border border-gray-300 text-black hover:bg-gray-50'}`}
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                )
              })
            )}

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {pagedItems.map((t) => {
                const details = (t.payment_details || {}) as any
                const amount = Number((t as any).total || 0)
                const status = (t.status || 'submitted')
                const checkoutUrl = details?.checkout_url || details?.tripay?.checkout_url
                const statusKey = (status || '').toLowerCase()
                const forceRight = statusKey === 'paid' || statusKey === 'failed'
                // Ambil 8 digit pertama dari reference
                const shortReference = (t.payment_reference || t.id).substring(0, 8)
                return (
                  <div key={t.id} className="border border-gray-200 p-3 text-sm space-y-2 rounded-none">
                    <div className="flex items-center justify-between">
                      <span className="font-cormorant text-gray-900">Reference</span>
                      <span className="font-belleza text-gray-800">{shortReference}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-cormorant text-gray-900">Metode</span>
                      <span className="font-belleza text-gray-800">{t.payment_method || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-cormorant text-gray-900">Status</span>
                      <span className="font-belleza text-gray-800">{formatStatus(status)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-cormorant text-gray-900">Total</span>
                      <span className="font-belleza text-gray-800">Rp {amount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="pt-1 space-y-2">
                      {status !== 'paid' && checkoutUrl ? (
                        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-none bg-black text-white px-3 py-2 text-sm hover:opacity-90">Bayar</a>
                      ) : null}
                      <button
                        onClick={() => {
                          const s = (t.status || '').toLowerCase()
                          if (s === 'paid' || s === 'success') {
                            router.push(`/payment/${t.id}/succes`)
                          } else if (s === 'failed') {
                            router.push(`/payment/${t.id}/failed`)
                          } else {
                            // Default: arahkan ke pending untuk semua status lain (belum bayar, submitted, draft, pending, cancelled)
                            router.push(`/payment/${t.id}/pending`)
                          }
                        }}
                        className="inline-flex w-full items-center justify-center rounded-none px-3 py-2 text-sm border border-gray-300 text-black hover:bg-gray-50"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {!loading && items.length > 0 && (
              <div className="mt-4 flex w-full items-center justify-center gap-2 px-4">
                <button
                  aria-label="Halaman sebelumnya"
                  className={currentPage === 1 ? "inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-300 cursor-not-allowed" : "inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-black hover:bg-gray-50"}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className="px-2 text-sm text-gray-700">{currentPage} / {totalPages}</div>
                <button
                  aria-label="Halaman berikutnya"
                  className={currentPage >= totalPages ? "inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-300 cursor-not-allowed" : "inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-black hover:bg-gray-50"}
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Detail Modal */}
        {detailOpen && selectedTxn && (
          <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDetailOpen(false)} aria-hidden="true" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-white shadow-2xl rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-cormorant text-lg text-black">Detail Transaksi</h3>
                  <button onClick={() => setDetailOpen(false)} aria-label="Tutup" className="p-2 hover:bg-gray-100 rounded text-black">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Reference</div>
                      <div className="font-belleza text-gray-900">{selectedTxn.payment_reference || selectedTxn.id}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Metode</div>
                      <div className="font-belleza text-gray-900">{selectedTxn.payment_method || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div className="font-belleza text-gray-900">{formatStatus(selectedTxn.status || 'submitted')}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total</div>
                      <div className="font-belleza text-gray-900">Rp {Number((selectedTxn as any).total || 0).toLocaleString('id-ID')}</div>
                    </div>
                  </div>

                  {/* Alamat Pengiriman */}
                  {selectedTxn.shipping_address && (
                    <div className="border border-gray-200">
                      <div className="px-3 py-2 bg-gray-50 font-cormorant text-black">Alamat Pengiriman</div>
                      <div className="px-3 py-3 text-sm text-gray-800 space-y-1">
                        <div>{selectedTxn.shipping_address.nama} ({selectedTxn.shipping_address.telepon})</div>
                        <div>{selectedTxn.shipping_address.alamat}</div>
                        <div>{selectedTxn.shipping_address.kota}, {selectedTxn.shipping_address.provinsi} {selectedTxn.shipping_address.kode_pos}</div>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {Array.isArray(selectedTxn.items) && selectedTxn.items.length > 0 && (
                    <div className="border border-gray-200">
                      <div className="px-3 py-2 bg-gray-50 font-cormorant text-black">Item Pesanan</div>
                      <div className="divide-y divide-gray-200 text-sm">
                        {selectedTxn.items!.map((it: any, idx: number) => (
                          <div key={idx} className="px-3 py-2 flex items-center justify-between">
                            <div className="text-gray-900">
                              {(it.nama_produk || 'Produk')}{it.size ? ` - ${it.size}` : ''}
                              <div className="text-gray-600">{Number(it.quantity || 1)} x Rp {Number(it.harga_satuan || 0).toLocaleString('id-ID')}</div>
                            </div>
                            <div className="text-gray-900">Rp {Number((it.harga_satuan || 0) * (it.quantity || 1)).toLocaleString('id-ID')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aksi */}
                  <div className="flex items-center justify-end gap-2">
                    {(() => {
                      const details = (selectedTxn?.payment_details || {}) as any
                      const checkoutUrl = details?.checkout_url || details?.tripay?.checkout_url
                      const isPaid = (selectedTxn?.status || '').toLowerCase() === 'paid'
                      return !isPaid && checkoutUrl ? (
                        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm hover:opacity-90">Bayar</a>
                      ) : null
                    })()}
                    <button onClick={() => setDetailOpen(false)} className="inline-flex items-center justify-center rounded-md border border-gray-300 text-black px-4 py-2 text-sm hover:bg-gray-50">Tutup</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                    <li><Link href="/docs/notifikasi" className="hover:underline">Notifikasi</Link></li>
                  </ul>
                </div>

                {/* Help & Support */}
                <div className="pb-2">
                  <h4 className="font-cormorant text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                  <div className="mt-1 w-10 h-[2px] bg-black"></div>
                  <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                    <li><Link href="/docs/pengembalian" className="hover:underline">Pengembalian</Link></li>
                    <li><Link href="/docs/syarat&ketentuan" className="hover:underline">Syarat & Ketentuan</Link></li>
                    <li><Link href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</Link></li>
                  </ul>
                </div>

                {/* My Account */}
                <div className="pb-2">
                  <h4 className="font-cormorant text-base text-black whitespace-nowrap">Akun Saya</h4>
                  <div className="mt-1 w-10 h-[2px] bg-black"></div>
                  <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                    <li><Link href="/my-account" className="hover:underline">Detail Akun</Link></li>
                    <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>Keranjang</a></li>
                    <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
                    <li><Link href="/produk/pesanan" className="hover:underline">Pesanan</Link></li>
                  </ul>
                </div>
              </div>

              {/* Desktop: Right aligned */}
              <div className="hidden md:flex items-center justify-end">
                <div className="font-belleza text-gray-600 text-sm flex items-center flex-wrap justify-end gap-x-2">
                  <span className="font-cormorant font-bold text-black">MEORIS</span>
                  <span className="text-xs tracking-[0.2em] uppercase text-gray-500">Footwear</span>
                  <span className="text-gray-300 mx-1">•</span>
                  <Link href="/docs/notifikasi" className="hover:text-black transition-colors">Notifikasi</Link>
                  <span className="text-gray-300">•</span>
                  <Link href="/docs/pengembalian" className="hover:text-black transition-colors">Pengembalian</Link>
                  <span className="text-gray-300">•</span>
                  <Link href="/docs/syarat&ketentuan" className="hover:text-black transition-colors">Syarat & Ketentuan</Link>
                  <span className="text-gray-300">•</span>
                  <Link href="/docs/kebijakan-privacy" className="hover:text-black transition-colors">Kebijakan Privasi</Link>
                  <span className="text-gray-300">•</span>
                  <Link href="/my-account" className="hover:text-black transition-colors">Detail Akun</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    )
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TransactionHistoryPage />
    </Suspense>
  )
}

