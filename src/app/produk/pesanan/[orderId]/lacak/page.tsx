"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/useCart";
import { useFavorites } from "@/lib/useFavorites";
import { keranjangDb, produkDb } from "@/lib/database";

type TrackingEvent = {
  status?: string
  description?: string
  timestamp?: string
  location?: string
}

export default function LacakPengirimanPage() {
  const params = useParams<{ orderId: string }>()
  const orderId = params.orderId
  // Header/shared states
  const { user, hydrated, isLoading } = useAuth()
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
  const { items: cartItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waybill, setWaybill] = useState<string | null>(null)
  const [courier, setCourier] = useState<string | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [splash, setSplash] = useState(true)

  function toCourierCode(method?: string | null) {
    const m = (method || '').toLowerCase()
    if (m.includes('j&t') || m.includes('jnt')) return 'jnt'
    if (m.includes('jne')) return 'jne'
    if (m.includes('sicepat') || m.includes('si cepat')) return 'sicepat'
    return ''
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString('id-ID', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const courierLogo = useMemo(() => {
    const c = (courier || '').toLowerCase()
    if (c === 'sicepat') return '/images/sicepat.png'
    if (c === 'jne') return '/images/jne.png'
    if (c === 'jnt' || c === 'j&t') return '/images/j&t.png'
    return null
  }, [courier])

  // Mount + short splash to avoid hydration mismatch and show a brief loading
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  const load = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
          .from('orders')
          .select('id, user_id, shipping_resi, checkout_submission_id, checkout_submissions:checkout_submission_id ( shipping_method )')
          .eq('id', orderId)
          .eq('user_id', user?.id || '')
          .single()
        if (error || !data) {
          router.replace('/produk/pesanan')
          return
        }
        const resi = (data as any)?.shipping_resi || ''
        const method = (data as any)?.checkout_submissions?.shipping_method || ''
        const code = toCourierCode(method)
        setWaybill(resi)
        setCourier(code)
        const placeholder = ['Sedang dikemas','Pesanan belum dikirim ke jasa kirim']
        if (!resi || placeholder.includes(resi) || resi.length < 6 || !code) {
          setError('Nomor resi atau ekspedisi belum tersedia')
          return
        }
        const resp = await fetch('/api/tracking/biteship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waybill: resi, courier: code })
        })
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}))
          throw new Error(j?.error || 'Gagal mengambil data tracking')
        }
        const json = await resp.json()
        setSummary(json?.data || json)
        const rawHistory = (json?.data?.history || json?.history || []) as any[]
        // Normalize Biteship fields -> UI shape
        const evs: TrackingEvent[] = rawHistory.map((h: any) => ({
          status: h?.status,
          description: h?.description ?? h?.note,
          timestamp: h?.timestamp ?? h?.updated_at,
          location: h?.location || h?.location_name || undefined,
        }))
        // Sort latest first
        evs.sort((a, b) => {
          const ta = a.timestamp ? Date.parse(a.timestamp) : 0
          const tb = b.timestamp ? Date.parse(b.timestamp) : 0
          return tb - ta
        })
        setEvents(evs)
      } catch (e: any) {
        setError(e?.message || 'Gagal memuat tracking')
      } finally {
        setLoading(false)
      }
  }, [orderId, supabase, user?.id, router])

  useEffect(() => {
    if (!hydrated) return
    if (!user) return
    load()
  }, [load, hydrated, user])

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      const next = `/produk/pesanan/${orderId}/lacak`
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [hydrated, user, orderId, router])

  // Header helpers
  useEffect(() => {
    setViewItems(cartItems || [])
  }, [cartItems])

  useEffect(() => {
    if (isCartOpen && user) {
      refresh()
    }
  }, [isCartOpen, user, refresh])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const results = await produkDb.search(searchQuery.trim())
      setSearchResults(results || [])
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
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

  const showSplash = mounted && splash

  return (
    !mounted ? null : showSplash ? (
      <div className="min-h-screen bg-white flex items-center justify-center font-belleza">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : (
    <div className="font-belleza">
    {/* Desktop header (fixed) */}
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
        <div className="flex items-center gap-4">
          <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }}>
            <Image src="/images/search.png" alt="Search" width={28} height={28} />
          </a>
          <a href="#" aria-label="Favorit" className="relative" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
            <Image src="/images/favorit.png" alt="Favorit" width={28} height={28} />
            <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
          </a>
          <a href="#" aria-label="Keranjang" className="relative" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
            <Image src="/images/cart.png" alt="Cart" width={28} height={28} />
            <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
          </a>
          <div className="relative" onMouseEnter={() => setUserMenuOpenDesktop(true)} onMouseLeave={() => setUserMenuOpenDesktop(false)}>
            <Link href="/my-account" aria-label="Akun">
              <Image src="/images/user.png" alt="User" width={36} height={36} />
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
        <div className="flex items-center gap-4">
          <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }}>
            <Image src="/images/search.png" alt="Search" width={26} height={26} />
          </a>
          <a href="#" aria-label="Favorit" className="relative" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
            <Image src="/images/favorit.png" alt="Favorit" width={26} height={26} />
            <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
          </a>
          <a href="#" aria-label="Keranjang" className="relative" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
            <Image src="/images/cart.png" alt="Cart" width={26} height={26} />
            <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
          </a>
          <div className="relative" onMouseEnter={() => setUserMenuOpenMobile(true)} onMouseLeave={() => setUserMenuOpenMobile(false)}>
            <Link href="/my-account" aria-label="Akun">
              <Image src="/images/user.png" alt="User" width={26} height={26} />
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

    {/* Sidebars & overlays */}
    {isSidebarOpen && (
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
        <aside className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-2xl p-6">
          <div className="mt-6 md:mt-8 flex items-center justify-between">
            <span className="font-cormorant text-3xl md:text-4xl font-bold text-black">MEORIS</span>
            <button type="button" aria-label="Tutup menu" className="p-2 rounded hover:opacity-80 text-black cursor-pointer" onClick={() => setIsSidebarOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <nav className="mt-10 md:mt-12">
            <ul className="space-y-2 font-belleza text-gray-800">
              <li>
                <a href="/home" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M3 10.5l9-7 9 7V20a2 2 0 0 1-2 2h-5v-6h-4v6H5a2 2 0 0 1-2-2v-9.5z" fill="currentColor"/>
                    </svg>
                  </span>
                  <span className="font-cormorant text-base flex-1">Beranda</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </li>
              <li>
                <a href="/my-account" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-9 9a9 9 0 1118 0H3z" fill="currentColor"/></svg>
                  </span>
                  <span className="font-cormorant text-base flex-1">Informasi Akun</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </li>
              <li>
                <a href="/produk/pesanan" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 2h12a1 1 0 011 1v18l-7-3-7 3V3a1 1 0 011-1z" fill="currentColor"/></svg>
                  </span>
                  <span className="font-cormorant text-base flex-1">History Pesanan</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </li>
              <li>
                <a href="/histori/transaksi" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6zm6 5h4v-2H9v2z" fill="currentColor"/></svg>
                  </span>
                  <span className="font-cormorant text-base flex-1">History Transaksi</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    )}
    {isSearchOpen && (
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={() => setIsSearchOpen(false)} aria-hidden="true" />
        <aside className="absolute right-0 top-0 h-full w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
          <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsSearchOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="flex items-center justify-between">
            <span className="font-cormorant text-xl md:text-2xl text-black">Cari Produk</span>
          </div>
          <div className="mt-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk"
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
            ) : searchResults.length > 0 ? (
              searchResults.map((product: any) => (
                <Link key={product.id} href={`/produk/${product.id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer" onClick={() => setIsSearchOpen(false)}>
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
                      Rp {Number(product.harga || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </Link>
              ))
            ) : searchQuery ? (
              <p className="text-sm text-gray-600">Tidak ada hasil untuk "{searchQuery}"</p>
            ) : (
              <p className="text-sm text-gray-600">Masukkan kata kunci untuk mencari produk</p>
            )}
          </div>
        </aside>
      </div>
    )}

    {isFavOpen && (
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={() => setIsFavOpen(false)} aria-hidden="true" />
        <aside className="absolute right-0 top-0 h-full w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
          <button type="button" aria-label="Tutup favorit" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsFavOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="flex items-center justify-between">
            <span className="font-cormorant text-xl md:text-2xl text-black">Favorit</span>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto">
            <div className="space-y-5">
              {favoritesLoading && favorites.length === 0 ? (
                <p className="text-sm text-gray-600">Memuat favorit...</p>
              ) : favorites.length === 0 ? (
                <p className="text-sm text-gray-600">Belum ada favorit</p>
              ) : (
                favorites.map((favorite: any) => (
                  <Link key={favorite.id} href={`/produk/${favorite.produk_id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer" onClick={() => setIsFavOpen(false)}>
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {favorite.produk?.photo1 ? (
                        <Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-belleza text-gray-900 truncate">{favorite.produk?.nama_produk || 'Produk'}</p>
                      <p className="font-belleza text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <button type="button" aria-label="Hapus item" className="p-2 rounded hover:bg-gray-100 text-black" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await toggleFavorite(favorite.produk_id); }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </Link>
                ))
              )}
            </div>
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
          <div className="mt-6 flex-1 overflow-y-auto">
            <div className="space-y-5">
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2">
              <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <Link href="/produk/detail-checkout" className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full" onClick={() => setIsCartOpen(false)}>
                  Checkout
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    )}

    {/* Main content paddings to clear fixed header */}
    <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12 pt-[60px] md:pt-[76px] font-belleza">
      {!hydrated || !user ? (
        <div className="text-sm text-gray-600">Mengalihkan ke halaman login...</div>
      ) : (<>
      <div className="flex items-center justify-between mt-6 md:mt-8 mb-6">
        <h1 className="font-cormorant text-2xl md:text-3xl text-black">Lacak Pengiriman</h1>
      </div>
      {(waybill || courier) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {courierLogo ? (
              <Image src={courierLogo} alt={courier || 'kurir'} width={40} height={40} className="h-10 w-10 object-contain" />
            ) : null}
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Nomor Resi</div>
              <div className="font-mono text-base text-black truncate">{waybill}</div>
              <div className="text-xs text-gray-600">Kurir: <span className="uppercase">{courier}</span></div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => { if (waybill) navigator.clipboard?.writeText(waybill).catch(() => {}) }}
              className="px-3 py-1.5 text-sm bg-black text-white hover:bg-gray-900 border border-black rounded-none">
              Salin Resi
            </button>
            <button
              onClick={() => load()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-none">
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Summary Card */}
      {summary ? (
        <div className="mb-6 rounded-md border border-gray-200 p-4 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-800 tracking-wide">{String(summary?.status || '').replaceAll('_',' ').toUpperCase()}</div>
              {summary?.message ? (
                <div className="mt-2 text-sm text-gray-700">{summary.message}</div>
              ) : null}
            </div>
            <div className="text-xs text-right text-gray-600">
              {summary?.destination?.contact_name ? (<div>Tujuan: <span className="font-medium text-black">{summary.destination.contact_name}</span></div>) : null}
              {summary?.destination?.address ? (<div className="truncate max-w-xs">{summary.destination.address}</div>) : null}
            </div>
          </div>
        </div>
      ) : null}
      {loading ? (
        <p className="text-gray-700">Memuat tracking...</p>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : events.length === 0 ? (
        <p className="text-gray-700">Belum ada riwayat pengiriman.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((ev, idx) => (
            <li key={idx}>
              <div className="rounded-md border border-gray-200 p-3 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-black truncate">{ev.status || ev.description || 'Peristiwa'}</div>
                  <div className="text-xs text-gray-600 whitespace-nowrap">{formatTime(ev.timestamp)}</div>
                </div>
                {ev.location ? (<div className="mt-1 text-xs text-gray-600">{ev.location}</div>) : null}
                {ev.description && ev.description !== ev.status ? (
                  <div className="mt-1 text-xs text-gray-700">{ev.description}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      </>
      )}

    </main>
    {/* Section 2: Footer, separated from main for easier width control */}
    <section>
      <footer className="bg-white py-6 md:py-4">
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
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0  0 1 2.09 4.18 2 2 0  0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
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
                  <li><a href="/docs/notifikasi" className="hover:underline">Notifikasi</a></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><a href="/docs/pengembalian" className="hover:underline">Pengembalian</a></li>
                  <li><a href="/docs/syarat&ketentuan" className="hover:underline">Syarat & Ketentuan</a></li>
                  <li><a href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</a></li>
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
                <a href="/docs/notifikasi" className="hover:text-black transition-colors">Notifikasi</a>
                <span className="text-gray-300">•</span>
                <a href="/docs/pengembalian" className="hover:text-black transition-colors">Pengembalian</a>
                <span className="text-gray-300">•</span>
                <a href="/docs/syarat&ketentuan" className="hover:text-black transition-colors">Syarat & Ketentuan</a>
                <span className="text-gray-300">•</span>
                <a href="/docs/kebijakan-privacy" className="hover:text-black transition-colors">Kebijakan Privasi</a>
                <span className="text-gray-300">•</span>
                <a href="/my-account" className="hover:text-black transition-colors">Detail Akun</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </section>
    </div>
    )
  )
}

