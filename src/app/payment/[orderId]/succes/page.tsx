"use client";
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, produkDb } from '@/lib/database'
// import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { formatPaymentMethod } from '@/lib/paymentMethodFormatter'

type LoadedOrder = {
  id: string
  payment_method: string | null
  payment_reference: string | null
  total_amount: number | null
  status?: string | null
  shipping_address_json: any | null
  checkout_submission_id?: string | null
  order_items?: Array<{
    id: string
    quantity: number
    size?: string | null
    harga_satuan?: number | null
    produk?: { nama_produk?: string | null; photo1?: string | null; harga?: number | null } | null
  }>
}

type CheckoutSubmission = {
  subtotal: number
  shipping_cost: number
  total: number
  order_summary: {
    discount?: number
    voucher_code?: string
  }
}

// Helper function to format orderId with dashes for UUID format
function formatUUID(id: string): string {
  // If already has dashes, return as is
  if (id.includes('-')) return id

  // If no dashes, format as UUID: 8-4-4-4-12
  if (id.length === 32) {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
  }

  return id
}

export default function PaymentSuccessByIdPage() {
  const params = useParams<{ orderId: string }>()
  const rawOrderId = params.orderId
  const orderId = formatUUID(rawOrderId) // Format to UUID with dashes for database query
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Header states (match histori/transaksi)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { items: cartItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])

  const [order, setOrder] = useState<LoadedOrder | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [splash, setSplash] = useState(true)
  const [checkoutSubmission, setCheckoutSubmission] = useState<CheckoutSubmission | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => { setViewItems(cartItems || []) }, [cartItems])
  useEffect(() => { if (isCartOpen && user) { refresh() } }, [isCartOpen, user, refresh])
  useEffect(() => { const t = setTimeout(() => setSplash(false), 800); return () => clearTimeout(t) }, [])

  const isPaid = (s?: string | null) => {
    const k = (s || '').toLowerCase()
    return k === 'paid' || k === 'success'
  }

  useEffect(() => {
    if (isLoading) return
    if (!rawOrderId) return
    if (!loadingOrder) {
      const s = order?.status || null
      if (!isPaid(s)) {
        router.replace(`/payment/${rawOrderId}/pending`)
      }
    }
  }, [isLoading, loadingOrder, order?.status, rawOrderId, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!orderId || !user) return
      setLoadingOrder(true)
      try {
        const sel = `
            id,
            payment_method,
            payment_reference,
            total_amount,
            status,
            shipping_address_json,
            checkout_submission_id,
            order_items(
              *,
              produk:produk_id ( nama_produk, photo1, harga )
            )
          `
        const { data, error } = await supabase
          .from('orders')
          .select(sel)
          .or(`id.eq.${orderId},checkout_submission_id.eq.${orderId}`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        const row: any = Array.isArray(data) ? data[0] : (data as any)
        if (error || !row) {
          return
        }
        if (!cancelled) {
          setOrder({
            id: row.id,
            payment_method: row.payment_method ?? null,
            payment_reference: row.payment_reference ?? null,
            total_amount: Number(row.total_amount || 0),
            status: row.status ?? null,
            shipping_address_json: row.shipping_address_json || null,
            checkout_submission_id: row.checkout_submission_id ?? null,
            order_items: row.order_items || []
          })

          // Load checkout submission data for breakdown
          if (row.checkout_submission_id) {
            const { data: csData } = await supabase
              .from('checkout_submissions')
              .select('subtotal, shipping_cost, total, order_summary')
              .eq('id', row.checkout_submission_id)
              .single()

            if (csData) {
              setCheckoutSubmission({
                subtotal: Number(csData.subtotal || 0),
                shipping_cost: Number(csData.shipping_cost || 0),
                total: Number(csData.total || 0),
                order_summary: csData.order_summary || {}
              })
            }
          }
        }
      } finally {
        if (!cancelled) setLoadingOrder(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId, user, router])

  const handleFavoriteCheckbox = (favoriteId: string, checked: boolean) => {
    setSelectedFavorites(prev => {
      const ns = new Set(prev)
      if (checked) ns.add(favoriteId); else ns.delete(favoriteId)
      return ns
    })
  }
  const handleCloseFavSidebar = () => { setIsFavOpen(false); setSelectedFavorites(new Set()) }
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setHasSearched(true)
    try { setSearchResults(await produkDb.search(searchQuery.trim()) || []) } finally { setSearchLoading(false) }
  }
  const handleCloseSearchSidebar = () => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); setHasSearched(false) }
  const handleRemoveCartItem = async (itemId: string) => {
    try { setRemovingId(itemId); setViewItems((items) => items.filter((it: any) => it.id !== itemId)); await keranjangDb.removeItem(itemId) } finally { setRemovingId(null) }
  }

  if (isLoading) return null

  const displayRef = order?.payment_reference || order?.id || '-'
  const displayMethod = order?.payment_method || '-'
  const displayTotal = Number(order?.total_amount || 0)
  const rawId = order?.id || orderId
  const shortId = (rawId || '').toString().replace(/-/g, '').slice(0, 8) || '-'

  return (
    (splash || (loadingOrder && !order)) ? (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : (
    <main>
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

      {/* Search sidebar */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseSearchSidebar} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={handleCloseSearchSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between"><span className="font-heading text-xl md:text-2xl text-black">Cari Produk</span></div>
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
                  className="w-full rounded-none bg-black text-white px-4 py-2 font-body text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {searchLoading ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>
            <div className="mt-6">
              <p className="font-heading text-black">Hasil pencarian</p>
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
                        <p className="font-body text-gray-900 truncate">{product.nama_produk}</p>
                        <p className="font-body text-sm text-gray-700 mt-1">Rp {Number(product.harga || 0).toLocaleString('id-ID')}</p>
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
            <div className="flex items-center justify-between"><span className="font-heading text-xl md:text-2xl text-black">Item Keranjang</span></div>
            <div className="mt-6 space-y-5">
              {viewItems.length === 0 ? (<p className="text-sm text-gray-600">Keranjang kosong</p>) : (
                viewItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {item.produk?.photo1 ? (<Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />) : (<Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-gray-900 truncate">{item.produk?.nama_produk || 'Produk'}</p>
                      <p className="font-body text-sm text-gray-700 mt-1"><span className="text-black">{item.quantity} x</span> Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}{item.size ? <span className="ml-2 text-gray-500">Uk: {item.size}</span> : null}</p>
                    </div>
                    <button type="button" aria-label="Hapus item" className="p-2 rounded hover:bg-gray-100 text-black disabled:opacity-50" onClick={() => handleRemoveCartItem(item.id)} disabled={removingId === item.id}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-4">
              <p className="font-heading text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <Link
                  href="/produk/detail-checkout"
                  className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-body text-sm hover:opacity-90 transition w-full"
                  onClick={() => {
                    setIsCartOpen(false);
                  }}
                >
                  Checkout
                </Link>
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
            <div className="flex items-center justify-between"><span className="font-heading text-xl md:text-2xl text-black">Favorit</span></div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-5">
              {favoritesLoading && (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Memuat favorit...</p>
              ) : (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Belum ada favorit</p>
              ) : (
                favorites.map((favorite: any) => (
                  <Link key={favorite.id} href={`/produk/${favorite.produk_id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer">
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {favorite.produk?.photo1 ? (
                        <Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk favorit" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-gray-900 truncate">{favorite.produk?.nama_produk || 'Produk'}</p>
                      <p className="font-body text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString('id-ID')}</p>
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

      {/* Section 1 - Modern Minimalist Design */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          {/* Success Icon & Message */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-200 animate-[bounce_1s_ease-in-out]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-2">Pembayaran Berhasil</h1>
            <p className="font-body text-gray-600">Terima kasih atas pembelian Anda</p>
          </div>

          {/* Order Details Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 mb-6">
            {/* Order Info */}
            <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-body text-sm text-gray-500">ID Pesanan</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{shortId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-sm text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-900">{displayRef}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-sm text-gray-500">Metode Pembayaran</span>
                <span className="font-body text-sm font-medium text-gray-900">{formatPaymentMethod(displayMethod)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-sm text-gray-500">Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Dibayar
                </span>
              </div>
            </div>

            {/* Total with Dropdown */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer group py-3 px-4 -mx-4 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setShowBreakdown(!showBreakdown)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-body text-base font-semibold text-gray-900">Total Pembayaran</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <span className="font-heading text-xl font-bold text-gray-900">Rp {displayTotal.toLocaleString('id-ID')}</span>
              </div>

              {/* Breakdown Dropdown with smooth animation */}
              <div className={`overflow-hidden transition-all duration-300 ${showBreakdown ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                {checkoutSubmission && (
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm text-gray-600">Subtotal Produk</span>
                      <span className="font-body text-sm text-gray-900">Rp {(checkoutSubmission.subtotal - checkoutSubmission.shipping_cost).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm text-gray-600">Biaya Pengiriman</span>
                      <span className="font-body text-sm text-gray-900">Rp {checkoutSubmission.shipping_cost.toLocaleString('id-ID')}</span>
                    </div>
                    {checkoutSubmission.order_summary?.discount && checkoutSubmission.order_summary.discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm text-green-700">
                          Diskon {checkoutSubmission.order_summary.voucher_code ? `(${checkoutSubmission.order_summary.voucher_code})` : ''}
                        </span>
                        <span className="font-body text-sm font-semibold text-green-600">-Rp {checkoutSubmission.order_summary.discount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link
              href="/user/purchase?pesanan-saya=all"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-black text-white px-6 py-3.5 font-medium text-sm hover:bg-gray-900 transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Lacak Pesanan
            </Link>
            <Link
              href="/home"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white text-gray-900 px-6 py-3.5 font-medium text-sm hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Beranda
            </Link>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="font-body text-sm text-blue-900 leading-relaxed">
              Invoice dan detail pesanan telah dikirim ke email Anda
            </p>
          </div>
        </div>
      </section>
    </main>
    )
  )
}
