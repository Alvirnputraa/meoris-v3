"use client";
import Image from 'next/image'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, produkDb } from '@/lib/database'
import { supabase } from '@/lib/supabase'

function OrdersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
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
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [ordersFirstLoad, setOrdersFirstLoad] = useState<boolean>(true)
  const [ordersSplash, setOrdersSplash] = useState<boolean>(true)
  const [userMenuOpenDesktop, setUserMenuOpenDesktop] = useState(false)
  const [userMenuOpenMobile, setUserMenuOpenMobile] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const perPage = 5
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'price-asc' | 'price-desc' | 'shipping' | 'delivered'>('date-desc')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [copyToast, setCopyToast] = useState<{ show: boolean; success: boolean; message: string }>({ show: false, success: true, message: '' })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Limit full-screen loading to a short splash on first load
  useEffect(() => {
    const t = setTimeout(() => setOrdersSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  // Handle checkbox selection in favorites
  const handleFavoriteCheckbox = (favoriteId: string, checked: boolean) => {
    setSelectedFavorites(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(favoriteId);
      } else {
        newSet.delete(favoriteId);
      }
      return newSet;
    });
  };

  // Clear selected favorites when sidebar closes
  const handleCloseFavSidebar = () => {
    setIsFavOpen(false);
    setSelectedFavorites(new Set());
  };

  // Sinkronkan tampilan lokal dengan data hook agar bisa optimistik tanpa flicker
  useEffect(() => {
    setViewItems(cartItems || [])
  }, [cartItems])

  useEffect(() => {
    if (isCartOpen) {
      refresh()
    }
  }, [isCartOpen, refresh])

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      setRemovingId(itemId)
      // Optimistic: hilangkan dari tampilan dulu
      setViewItems((items) => items.filter((it: any) => it.id !== itemId))
      await keranjangDb.removeItem(itemId)
      // Jangan panggil refresh untuk menghindari flicker; realtime akan menyinkronkan
    } catch (e) {
      console.error('Gagal menghapus item keranjang', e)
    } finally {
      setRemovingId(null)
    }
  }

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const results = await produkDb.search(searchQuery.trim());
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Clear search when sidebar closes
  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  const showSplash = isLoading || (!!user?.id && ordersFirstLoad && ordersLoading && ordersSplash)

  // Load paid orders for current user (with items)
  useEffect(() => {
    let cancelled = false
    async function loadOrders() {
      if (!user?.id) return
      setOrdersLoading(true)
      setOrdersError(null)
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              produk:produk_id (
                id,
                nama_produk,
                photo1,
                harga
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })

        if (error) throw error

        const mapped = (data || []).map((o: any) => {
          const items = Array.isArray(o.order_items) ? o.order_items : []
          const itemCount = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0)
          const total = Number(o.total_amount || 0)
          // Format date and total for display
          const dateStr = new Date(o.created_at).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric'
          })
          const totalStr = `Rp ${total.toLocaleString('id-ID')} untuk ${itemCount} item`
          const statusLabel = (o.status || '').toLowerCase() === 'paid' ? 'dibayar' : (o.status || '')
          // Display ID must come from orders.id (UUID). Use first 8 hex chars from UUID (no dashes)
          const rawId = String(o.id || '')
          const hexId = rawId.replace(/-/g, '')
          const displayId = hexId.slice(0, 8)
          const shippingLabel = (o.shipping_status as string) || 'Pesanan sedang disiapkan'
          return {
            id: o.id,
            displayId,
            date: dateStr,
            status: o.status,
            statusLabel,
            shippingLabel,
            total: totalStr,
            raw: o
          }
        })
        if (!cancelled) setOrders(mapped)
      } catch (e: any) {
        console.error('Gagal memuat pesanan:', e)
        if (!cancelled) setOrdersError('Gagal memuat pesanan')
      } finally {
        if (!cancelled) {
          setOrdersLoading(false)
          setOrdersFirstLoad(false)
        }
      }
    }
    loadOrders()
    return () => { cancelled = true }
  }, [user?.id])

  // Reset to first page when orders list changes or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [orders.length, sortBy, activeFilter])

  // Filter and sort orders
  const filteredAndSortedOrders = (() => {
    let filtered = [...orders]

    // Apply filters
    if (sortBy === 'shipping') {
      const shippingStatuses = [
        'Menunggu pesanan diserahkan ke pihak jasa kirim',
        'Menunggu penjemputan kurir',
        'Kurir menuju lokasi penjemputan',
        'Pesanan telah diserahkan ke jasa kirim',
        'Dalam Pengiriman',
        'Pesanan sedang dikemas'
      ]
      filtered = filtered.filter(o => shippingStatuses.some(status => o.shippingLabel.includes(status)))
    } else if (sortBy === 'delivered') {
      filtered = filtered.filter(o => o.shippingLabel === 'Terkirim')
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.raw.created_at).getTime() - new Date(a.raw.created_at).getTime()
      } else if (sortBy === 'date-asc') {
        return new Date(a.raw.created_at).getTime() - new Date(b.raw.created_at).getTime()
      } else if (sortBy === 'price-asc') {
        return Number(a.raw.total_amount || 0) - Number(b.raw.total_amount || 0)
      } else if (sortBy === 'price-desc') {
        return Number(b.raw.total_amount || 0) - Number(a.raw.total_amount || 0)
      }
      return 0
    })

    return filtered
  })()

  const totalPages = Math.max(1, Math.ceil((filteredAndSortedOrders?.length || 0) / perPage))
  const pagedOrders = filteredAndSortedOrders.slice((currentPage - 1) * perPage, currentPage * perPage)

  return (
    showSplash ? (
      <div className="min-h-screen bg-white flex items-center justify-center font-belleza">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : !user ? (
      <div className="min-h-screen bg-white font-belleza" />
    ) : (
    <main className="min-h-screen flex flex-col font-belleza">
      {/* Toast Notification */}
      {copyToast.show && (
        <div className="fixed top-20 right-6 z-[80] animate-slide-in-right">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-2 ${
            copyToast.success
              ? 'bg-green-50 border-green-500 text-green-800'
              : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            {copyToast.success ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-belleza text-sm font-medium">{copyToast.message}</span>
            <button
              onClick={() => setCopyToast({ show: false, success: true, message: '' })}
              className="ml-2 hover:opacity-70 transition-opacity"
              aria-label="Tutup notifikasi"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* Right panels: Search, Cart, Fav (same as other pages) */}
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
                  setHasSearched(false) // Reset hasSearched when user types
                  setSearchResults([]) // Clear previous search results
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
                        <p className="font-belleza text-sm text-gray-700 mt-1">
                          Rp {Number(product.harga || 0).toLocaleString("id-ID")}
                        </p>
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
              {viewItems.length === 0 ? (
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
                    <button
                      type="button"
                      aria-label="Hapus item"
                      className="p-2 rounded hover:bg-gray-100 text-black disabled:opacity-50"
                      onClick={() => handleRemoveCartItem(item.id)}
                      disabled={removingId === item.id}
                    >
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
                {viewItems.length === 0 ? (
                  <button
                    disabled
                    className="inline-flex items-center justify-center rounded-none border border-gray-300 bg-gray-300 text-gray-500 px-4 py-2 font-belleza text-sm cursor-not-allowed w-full"
                  >
                    Checkout
                  </button>
                ) : (
                  <Link
                    href="/produk/detail-checkout"
                    className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full"
                    onClick={() => {
                      setIsCartOpen(false);
                    }}
                  >
                    Checkout
                  </Link>
                )}
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
                        <Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || "Produk"} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk favorit" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-belleza text-gray-900 truncate">{favorite.produk?.nama_produk || "Produk"}</p>
                      <p className="font-belleza text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString("id-ID")}</p>
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

      {/* Section 1: breadcrumb & title */}
      <div className="flex-grow">
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-gray-100">
          <h1 className="font-cormorant text-3xl md:text-4xl text-gray-100">Pesanan</h1>
          <div className="mt-3 font-belleza text-sm text-gray-100">
            <span>Beranda</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Pesanan</span>
          </div>
        </div>
      </section>

      {/* Section 2: orders table */}
      <section className="bg-white py-8 md:py-12 min-h-[55vh] md:min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Filter & Sort Bar (Desktop Only) */}
          <div className="hidden md:flex items-center justify-between mb-8 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-cormorant text-lg text-gray-900">Filter & Urutkan</span>
              {filteredAndSortedOrders.length !== orders.length && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {filteredAndSortedOrders.length} dari {orders.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
                <button
                  onClick={() => { setSortBy('date-desc'); setActiveFilter('all'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'all'
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-black'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => { setSortBy('shipping'); setActiveFilter('shipping'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'shipping'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-600'
                  }`}
                >
                  Dalam Pengiriman
                </button>
                <button
                  onClick={() => { setSortBy('delivered'); setActiveFilter('delivered'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'delivered'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-green-600'
                  }`}
                >
                  Terkirim
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="appearance-none bg-gradient-to-r from-white to-gray-50 border-2 border-gray-300 hover:border-black hover:from-gray-50 hover:to-white text-gray-900 text-sm font-semibold px-5 py-2.5 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md min-w-[160px] text-left"
                >
                  {sortBy === 'date-desc' ? 'Terbaru' : sortBy === 'date-asc' ? 'Terlama' : sortBy === 'price-desc' ? 'Harga Tertinggi' : 'Harga Terendah'}
                </button>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-600">
                  <svg className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('date-desc');
                        setActiveFilter('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        sortBy === 'date-desc'
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Terbaru
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('date-asc');
                        setActiveFilter('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        sortBy === 'date-asc'
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Terlama
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('price-desc');
                        setActiveFilter('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        sortBy === 'price-desc'
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Harga Tertinggi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('price-asc');
                        setActiveFilter('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        sortBy === 'price-asc'
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Harga Terendah
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Modern Card Grid */}
          {ordersLoading ? (
            <div className="hidden md:flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                <p className="mt-3 font-belleza text-gray-700">Memuat pesanan...</p>
              </div>
            </div>
          ) : ordersError ? (
            <div className="hidden md:flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-3 font-belleza text-red-600">{ordersError}</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="hidden md:flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-3 font-belleza text-gray-700">Belum ada pesanan.</p>
                <Link href="/produk" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm hover:opacity-90 transition">
                  Mulai Belanja
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <div className="hidden md:grid md:grid-cols-1 gap-4">
              {pagedOrders.map((o) => {
                const items = Array.isArray(o.raw.order_items) ? o.raw.order_items : []
                const firstItem = items[0]
                const remainingCount = items.length - 1

                return (
                  <div key={o.id} className="group bg-white border-2 border-gray-200 hover:border-black transition-all duration-300 shadow-sm hover:shadow-lg px-5 py-2">
                    <div className="flex items-center gap-6">
                      {/* Product Thumbnail */}
                      <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 overflow-hidden">
                        {firstItem?.produk?.photo1 ? (
                          <Image
                            src={firstItem.produk.photo1}
                            alt={firstItem.produk?.nama_produk || 'Produk'}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        {remainingCount > 0 && (
                          <div className="absolute top-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 font-bold">
                            +{remainingCount}
                          </div>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Product Name */}
                        <div className="flex items-center gap-2">
                          <h2 className="font-belleza text-base font-semibold text-gray-900 truncate">
                            {firstItem?.produk?.nama_produk || 'Produk'}
                          </h2>
                          {remainingCount > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold whitespace-nowrap">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              {remainingCount}+
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-belleza text-sm text-gray-600">ID Pesanan</span>
                          <span className="font-cormorant text-base font-medium text-gray-900">#{o.displayId}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(o.displayId).then(() => {
                                setCopyToast({ show: true, success: true, message: 'ID Pesanan berhasil disalin!' })
                                setTimeout(() => setCopyToast({ show: false, success: true, message: '' }), 3000)
                              }).catch(() => {
                                setCopyToast({ show: true, success: false, message: 'Gagal menyalin ID Pesanan' })
                                setTimeout(() => setCopyToast({ show: false, success: false, message: '' }), 3000)
                              })
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors group"
                            title="Salin ID Pesanan"
                            aria-label="Salin ID Pesanan"
                          >
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-belleza">{o.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-4 py-2 bg-gray-100 rounded-md text-gray-700 text-sm font-medium">
                            <span className="font-belleza">{o.shippingLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total & Actions */}
                      <div className="flex flex-col items-end gap-3 pl-6 border-l-2 border-gray-200">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 font-belleza mb-1">Total Pembayaran</div>
                          <div className="font-cormorant text-xl font-bold text-gray-900">{o.total.split(' untuk ')[0]}</div>
                          <div className="text-xs text-gray-600 font-belleza mt-0.5">{o.total.split(' untuk ')[1]}</div>
                        </div>

                        <Link
                          href={`/produk/pesanan/${o.id}`}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors group-hover:scale-105 duration-300"
                        >
                          <span>Lihat Detail</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Rows (mobile cards) */}
          <div className="md:hidden space-y-3">
            {ordersLoading ? (
              <div className="border border-gray-200 p-3 text-sm rounded-none text-black">Memuat pesanan...</div>
            ) : ordersError ? (
              <div className="border border-gray-200 p-3 text-sm rounded-none text-red-600">{ordersError}</div>
            ) : orders.length === 0 ? (
              <div className="border border-gray-200 p-3 text-sm rounded-none text-center text-black">Belum ada pesanan.</div>
          ) : (
            pagedOrders.map((o) => (
              <div key={o.id} className="border border-gray-200 p-3 text-sm space-y-2 rounded-none">
                  <div className="flex items-center justify-between">
                    <span className="font-cormorant text-gray-900">Order</span>
                    <span className="font-belleza text-gray-800">#{o.displayId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-cormorant text-gray-900">Date</span>
                    <span className="font-belleza text-gray-800">{o.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-cormorant text-gray-900">Status Pengiriman</span>
                    <span className="font-belleza text-gray-800">{o.shippingLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-cormorant text-gray-900">Total</span>
                    <span className="font-belleza text-gray-800">{o.total}</span>
                  </div>
                  <div className="pt-1">
                    <Link href={`/produk/pesanan/${o.id}`} className="inline-flex w-full items-center justify-center rounded-none bg-black text-white px-3 py-2 text-sm hover:opacity-90">Lihat</Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pager icons */}
          {(!ordersLoading && filteredAndSortedOrders.length > 0 && totalPages > 1) && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                aria-label="Halaman Sebelumnya"
                className={`w-10 h-10 grid place-items-center rounded-full border-2 transition-all ${
                  currentPage === 1
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-400 text-gray-700 hover:bg-black hover:text-white hover:border-black cursor-pointer'
                }`}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="px-4 py-2 bg-gray-100 rounded-md">
                <span className="font-belleza text-sm font-medium text-gray-900">
                  Halaman {currentPage} dari {totalPages}
                </span>
              </div>

              <button
                type="button"
                aria-label="Halaman Berikutnya"
                className={`w-10 h-10 grid place-items-center rounded-full border-2 transition-all ${
                  currentPage >= totalPages
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-400 text-gray-700 hover:bg-black hover:text-white hover:border-black cursor-pointer'
                }`}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
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
                  <li><Link href="/user/purchase?view=notifications" className="hover:underline">Notifikasi</Link></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><Link href="/pengembalian" className="hover:underline">Pengembalian</Link></li>
                  <li><Link href="/terms-condition" className="hover:underline">Syarat & Ketentuan</Link></li>
                  <li><Link href="/privacy-policy" className="hover:underline">Kebijakan Privasi</Link></li>
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
                <Link href="/user/purchase?view=notifications" className="hover:text-black transition-colors">Notifikasi</Link>
                <span className="text-gray-300">•</span>
                <Link href="/pengembalian" className="hover:text-black transition-colors">Pengembalian</Link>
                <span className="text-gray-300">•</span>
                <Link href="/terms-condition" className="hover:text-black transition-colors">Syarat & Ketentuan</Link>
                <span className="text-gray-300">•</span>
                <Link href="/privacy-policy" className="hover:text-black transition-colors">Kebijakan Privasi</Link>
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

export default dynamic(() => Promise.resolve(OrdersPage), { ssr: false })




