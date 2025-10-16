"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, praCheckoutDb, produkDb, checkoutSubmissionDb, userDb, ongkirDb } from '@/lib/database'
import { useSearchParams, useRouter } from 'next/navigation'

function CheckoutContent() {
  const { user, isLoading } = useAuth()
  const formRef = useRef<HTMLFormElement | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const praCheckoutId = searchParams?.get('pra_checkout_id')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [userMenuOpenDesktop, setUserMenuOpenDesktop] = useState(false)
  const [userMenuOpenMobile, setUserMenuOpenMobile] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { items: cartItems, count: cartCount, loading: cartLoading } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [praCheckoutData, setPraCheckoutData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('QRIS')
  const [paymentChannels, setPaymentChannels] = useState<any[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string>('J&T Express')
  const [ongkirAmount, setOngkirAmount] = useState<number>(0)
  const [ongkirLoading, setOngkirLoading] = useState(false)
  const [ongkirOptions, setOngkirOptions] = useState<Record<string, number>>({})
  // Toast state for notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [toastShow, setToastShow] = useState(false)
  const channelLogos: Record<string, string> = {
    QRIS: '/images/QRIS.png',
    BRIVA: '/images/BRI.png',
    BNIVA: '/images/BNI.png',
    MANDIRIVA: '/images/MANDIRI.png',
    MANDIRI: '/images/MANDIRI.png'
  }

  // Avoid hydration mismatch: render only after client mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // Pagination for Produk yang Dipesan (summary list)
  const [summaryPage, setSummaryPage] = useState<number>(1)
  const summaryPerPage = 2
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])
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

  // Load pra-checkout data jika ada pra_checkout_id
  useEffect(() => {
    const loadPraCheckout = async () => {
      if (praCheckoutId && user) {
        setLoading(true)
        try {
          const data = await praCheckoutDb.getById(praCheckoutId)
          setPraCheckoutData(data)
          
          // Map pra_checkout_items ke format yang sama dengan cart items
          const mappedItems = data.pra_checkout_items.map((item: any) => ({
            id: item.id,
            produk_id: item.produk_id,
            quantity: item.quantity,
            size: item.size,
            produk: item.produk
          }))
          setViewItems(mappedItems)
        } catch (error) {
          console.error('Error loading pra-checkout data:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadPraCheckout()
  }, [praCheckoutId, user])

  const normalizeEkspedisiKey = (value: string) =>
    value.replace(/\s*Express$/i, '').trim().toLowerCase()

  // Load ongkir data once and cache it for all options
  useEffect(() => {
    const loadAllOngkir = async () => {
      setOngkirLoading(true)
      try {
        const data = await ongkirDb.getAll()
        const mapped: Record<string, number> = {}

        data.forEach((item: any) => {
          if (!item?.ekspedisi) return
          const key = normalizeEkspedisiKey(item.ekspedisi)
          const amount = Number(item.ongkir)
          mapped[key] = Number.isNaN(amount) ? 0 : amount
        })

        setOngkirOptions(mapped)
      } catch (error) {
        console.error('Error loading ongkir list:', error)
        setOngkirOptions({})
      } finally {
        setOngkirLoading(false)
      }
    }

    loadAllOngkir()
  }, [])

  // Update selected ongkir amount whenever options or selection change
  useEffect(() => {
    if (!selectedShipping) return
    const key = normalizeEkspedisiKey(selectedShipping)
    const amount = ongkirOptions[key]
    setOngkirAmount(typeof amount === 'number' ? amount : 0)
  }, [selectedShipping, ongkirOptions])

  const renderOngkirPrice = (label: string, isSelected: boolean) => {
    if (ongkirLoading) {
      return <span className="font-belleza text-xs text-gray-500">Loading...</span>
    }

    const key = normalizeEkspedisiKey(label)
    const amount = ongkirOptions[key]

    if (typeof amount === 'number') {
      return <span className="font-belleza text-xs font-medium text-black">Rp {amount.toLocaleString('id-ID')}</span>
    }

    return <span className="font-belleza text-xs text-gray-500">-</span>
  }

  // Load Tripay channels (optional; fallback to minimal static list if fails)
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const res = await fetch('/api/tripay/channels')
        if (!res.ok) throw new Error('Failed to load channels')
        const json = await res.json()
        const list = Array.isArray(json?.data) ? json.data : []
        setPaymentChannels(list.filter((c: any) => c.active))
        // Prefer QRIS if available
        const qris = list.find((c: any) => c.code?.toUpperCase() === 'QRIS')
        if (qris) setPaymentMethod('QRIS')
      } catch {
        // Fallback minimal list
        setPaymentChannels([
          { code: 'QRIS', name: 'QRIS' },
          { code: 'BRIVA', name: 'BRI Virtual Account' },
          { code: 'BNIVA', name: 'BNI Virtual Account' },
          { code: 'MANDIRIVA', name: 'Mandiri Virtual Account' }
        ])
      }
    }
    loadChannels()
  }, [])

  // Fill checkout fields from saved user address
  const handleUseMyAddress = async () => {
    try {
      if (!user) return
      const u: any = await userDb.getById(user.id)
      const f = formRef.current
      if (!f || !u) return
      // Require all main address fields to be present
      const required = [
        u.shipping_nama,
        u.shipping_phone,
        u.shipping_street,
        u.shipping_kabupaten || u.shipping_kecamatan,
        u.shipping_provinsi,
        u.shipping_postal_code
      ]
      const hasAllRequired = required.every((v: any) => !!(v && String(v).trim()))
      if (!hasAllRequired) {
        setToast({ type: 'error', message: 'Anda belum mempunyai alamat yang tersimpan' })
        setTimeout(() => setToastShow(true), 10)
        setTimeout(() => setToastShow(false), 2300)
        setTimeout(() => setToast(null), 2600)
        return
      }
      const shippingNama = (u.shipping_nama || '').toString().trim()
      const parts = shippingNama.split(/\s+/)
      const first = parts.shift() || ''
      const last = parts.join(' ')
      const assignments: Record<string, string> = {
        first_name: first,
        last_name: last,
        email: user.email || '',
        phone: (u.shipping_phone || '').toString(),
        address: (u.shipping_street || '').toString(),
        city: (u.shipping_kabupaten || u.shipping_kecamatan || '').toString(),
        province: (u.shipping_provinsi || '').toString(),
        postal_code: (u.shipping_postal_code || '')
          .toString()
          .replace(/[^0-9]/g, '')
          .slice(0, 5)
      }
      Object.entries(assignments).forEach(([name, val]) => {
        const el = f.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null
        if (el) el.value = val
      })
      // Show success toast
      setToast({ type: 'success', message: 'Alamat berhasil digunakan' })
      setTimeout(() => setToastShow(true), 10)
      setTimeout(() => setToastShow(false), 2300)
      setTimeout(() => setToast(null), 2600)
    } catch (e) {
      console.error('Gagal mengisi alamat dari profil', e)
      setToast({ type: 'error', message: 'Gagal menggunakan alamat' })
      setTimeout(() => setToastShow(true), 10)
      setTimeout(() => setToastShow(false), 2300)
      setTimeout(() => setToast(null), 2600)
    }
  }

  // Sinkronkan tampilan lokal dengan data hook agar bisa optimistik tanpa flicker (jika tidak ada pra_checkout_id)
  useEffect(() => {
    if (!praCheckoutId) {
      setViewItems(cartItems || [])
    }
  }, [cartItems, praCheckoutId])

  // Reset summary page when item count changes
  useEffect(() => {
    setSummaryPage(1)
  }, [viewItems.length])

  if (!mounted) return null
  if (isLoading) return null
  if (!user) return null
  const handleRemoveCartItem = async (itemId: string) => {
    try {
      setRemovingId(itemId)
      // Optimistic: hilangkan dari tampilan dulu
      setViewItems((items) => items.filter((it: any) => it.id !== itemId))
      await keranjangDb.removeItem(itemId)
      // Jangan panggil refresh untuk menghindari flicker; realtime akan menyinkronkan
    } catch (e) {
      console.error('Gagal menghapus item keranjang', e)
      // Revert optimistic update jika error
      setViewItems(cartItems || [])
    } finally {
      setRemovingId(null)
    }
  }

  // (removed duplicate redirect effect to keep hooks order stable)

  // Gunakan data dari pra_checkout jika ada, atau hitung dari cart items
  const subtotal = praCheckoutData ? Number(praCheckoutData.subtotal) : viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0)
  const discountAmount = praCheckoutData ? Number(praCheckoutData.discount_amount || 0) : 0
  const shippingCost = ongkirAmount
  const subtotalWithShipping = subtotal + shippingCost
  const totalAmount = praCheckoutData ? Number(praCheckoutData.total_amount) + shippingCost : subtotalWithShipping
  const voucherCode = praCheckoutData?.voucher_code

  // Handle search functionality (match behavior from product detail page)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setHasSearched(true)
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

  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  return (
    <main className="min-h-screen flex flex-col font-belleza">
      {/* Left sidebar (menu) */}
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
                  <Link href="/home" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 10.5l9-7 9 7V20a2 2 0 0 1-2 2h-5v-6h-4v6H5a2 2 0 0 1-2-2v-9.5z" fill="currentColor"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base flex-1">Beranda</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/my-account" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-9 9a9 9 0 1118 0H3z" fill="currentColor"/></svg>
                    </span>
                    <span className="font-cormorant text-base flex-1">Informasi Akun</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/produk/pesanan" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 2h12a1 1 0 011 1v18l-7-3-7 3V3a1 1 0 011-1z" fill="currentColor"/></svg>
                    </span>
                    <span className="font-cormorant text-base flex-1">History Pesanan</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/histori/transaksi" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6zm6 5h4v-2H9v2z" fill="currentColor"/></svg>
                    </span>
                    <span className="font-cormorant text-base flex-1">History Transaksi</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      )}

      {/* Search sidebar (enhanced, matches product detail) */}
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
                    <Link key={product.id} href={`/produk/${product.id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer" onClick={handleCloseSearchSidebar}>
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

      {/* Toast notification */}
      {toast && (
        <div className={`fixed right-4 top-16 md:top-20 z-[80] px-4 py-3 rounded shadow-md text-white font-belleza transition-all duration-300 transform ${toastShow ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'} ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
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
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Favorit</span>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-5">
              {(!favorites || favorites.length === 0) ? (
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
              <span className="font-cormorant text-2xl tracking-wide text-black">MEORIS</span>
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
                <Image src="/images/user.png" alt="User" width={28} height={28} />
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
              <span className="font-cormorant text-xl tracking-wide text-black">MEORIS</span>
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

      {/* Cart sidebar */}
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
              <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {subtotal.toLocaleString('id-ID')}</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <Link
                  href="/produk/detail-checkout"
                  className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full"
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

      {/* Content wrapper */}
      <div className="flex-grow">
      {/* Section 1: breadcrumb & title */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-gray-100">
          <h1 className="font-cormorant text-3xl md:text-4xl text-gray-100">Checkout</h1>
          <div className="mt-3 font-belleza text-sm text-gray-100">
            <span>Produk</span>
            <span className="mx-1">&gt;</span>
            <span>Keranjang</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Checkout</span>
          </div>
        </div>
      </section>

      {/* Section 2: Checkout form */}
      <section className="bg-white py-8 md:py-10">
        <form ref={formRef} onSubmit={async (e) => {
          e.preventDefault()
          if (!user) {
            alert('Silakan login terlebih dahulu')
            return
          }
          if (!praCheckoutId) {
            alert('pra_checkout_id tidak ditemukan. Kembali ke keranjang dan coba lagi.')
            return
          }
          try {
            setSubmitLoading(true)
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            const firstName = (fd.get('first_name') as string || '').trim()
            const lastName = (fd.get('last_name') as string || '').trim()
            const email = (fd.get('email') as string || '').trim()
            const phone = (fd.get('phone') as string || '').trim()
            const address = (fd.get('address') as string || '').trim()
            const city = (fd.get('city') as string || '').trim()
            const province = (fd.get('province') as string || '').trim()
            const postalCode = (fd.get('postal_code') as string || '').trim()
            const shippingMethod = (fd.get('shipping_method') as string) || 'J&T Express'

            // minimal validation
            if (!firstName || !lastName || !email || !phone || !address || !city || !province || !postalCode) {
              alert('Lengkapi data alamat pengiriman terlebih dahulu')
              setSubmitLoading(false)
              return
            }

            const shipping_address = {
              nama: `${firstName} ${lastName}`.trim(),
              telepon: phone,
              email,
              alamat: address,
              provinsi: province,
              kota: city,
              kabupaten: city,
              kecamatan: '',
              kelurahan: '',
              kode_pos: postalCode,
              catatan: ''
            }

            const order_summary = {
              discount: discountAmount || 0,
              voucher_code: voucherCode || null
            }

            const items = (viewItems || []).map((it: any) => ({
              produk_id: it.produk_id,
              nama_produk: it.produk?.nama_produk,
              size: it.size || null,
              quantity: Number(it.quantity || 1),
              harga_satuan: Number(it.produk?.harga || 0)
            }))

            const payload = {
              user_id: user.id,
              pra_checkout_id: praCheckoutId,
              shipping_address,
              shipping_method: shippingMethod,
              order_summary,
              subtotal: Number(subtotalWithShipping),
              shipping_cost: Number(shippingCost),
              total: Number(totalAmount),
              items
            }

            if (Number(payload.total) <= 0) {
              alert('Total pembayaran 0 tidak dapat diproses. Silakan periksa voucher/discount Anda.')
              setSubmitLoading(false)
              return
            }
            const created = await checkoutSubmissionDb.create(payload as any)
            console.log('checkout_submissions created:', created)

            // Call Tripay sandbox to create payment and get checkout URL
            const resp = await fetch('/api/tripay/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchantRef: created.id, // use submission id as reference
                amount: Math.round(payload.total),
                customer: {
                  name: shipping_address.nama,
                  email: shipping_address.email,
                  phone: shipping_address.telepon
                },
                items: (() => {
                  const detailed = items.map((it: any) => ({
                    sku: '',
                    name: `${it.nama_produk}${it.size ? ' - ' + String(it.size) : ''}`,
                    price: Math.round(Number(it.harga_satuan || 0)),
                    quantity: Number(it.quantity || 1)
                  }))
                  const detailedSum = detailed.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0)
                  const totalRounded = Math.round(Number(payload.total || 0))
                  // Jika ada voucher sehingga jumlah items != total, kirim satu baris ringkasan agar tidak mismatch
                  if (totalRounded !== detailedSum) {
                    return [{ sku: '', name: 'Pembelian Produk', price: totalRounded, quantity: 1 }]
                  }
                  return detailed
                })(),
                method: paymentMethod,
                // Kembali ke halaman pending spesifik submission; halaman tersebut auto-redirect ke sukses/gagal.
                returnUrl: `${window.location.origin}/payment/${created.id}/pending`
              })
            })

            if (!resp.ok) {
              const err = await resp.json().catch(() => ({}))
              console.error('Tripay error:', err)
              alert('Gagal membuat transaksi pembayaran. Silakan coba lagi.')
              setSubmitLoading(false)
              return
            }

            const pay = await resp.json()
            const url = pay.checkout_url
            if (url) {
              // Persist Tripay info into checkout_submissions.order_summary
              const tripayInfo = {
                reference: pay.reference,
                method: paymentMethod,
                amount: Number(payload.total),
                checkout_url: url,
                pay_code: pay?.data?.pay_code || null,
                qr_url: pay?.data?.qr_url || pay?.data?.qr_string || null,
                expired_time: pay?.data?.expired_time || null
              }
              const mergedOrderSummary = { ...(payload.order_summary || {}), payment_method: paymentMethod, tripay: tripayInfo }
              try {
                const expiredIso = pay?.data?.expired_time ? new Date(pay.data.expired_time * 1000).toISOString() : null
                await checkoutSubmissionDb.update(created.id, {
                  order_summary: mergedOrderSummary,
                  payment_method: paymentMethod,
                  payment_reference: pay?.reference || null,
                  payment_details: {
                    provider: 'tripay',
                    ...tripayInfo
                  },
                  payment_expired_at: expiredIso
                })
              } catch (e) {
                console.warn('Gagal menyimpan info Tripay ke checkout_submissions:', e)
                // tetap redirect walau gagal menyimpan metadata
              }
              window.location.href = url
              return
            } else {
              alert('Gagal mendapatkan halaman pembayaran.')
            }
          } catch (err: any) {
            console.error('Gagal mengirim checkout_submissions', err)
            alert('Gagal mengirim checkout. Pastikan kebijakan RLS sudah benar untuk tabel checkout_submissions.')
          } finally {
            setSubmitLoading(false)
          }
        }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Left side: Billing Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cormorant text-xl md:text-2xl text-black">Alamat Pengiriman</h2>
                <button type="button" onClick={handleUseMyAddress} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a3 3 0 100-6 3 3 0 000 6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s-6-4.5-6-9a6 6 0 1112 0c0 4.5-6 9-6 9z" />
                  </svg>
                  Gunakan alamat saya
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg p-5 bg-gray-50/50 min-h-[360px]">

                {/* Personal Information */}
                <div className="mb-6">
                  <h3 className="font-belleza text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Informasi Penerima
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-belleza text-sm text-gray-700 mb-1">Nama Depan *</label>
                        <input name="first_name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                      </div>
                      <div>
                        <label className="block font-belleza text-sm text-gray-700 mb-1">Nama Belakang *</label>
                        <input name="last_name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-belleza text-sm text-gray-700 mb-1">Email *</label>
                      <input name="email" type="email" required defaultValue={user?.email} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                    </div>
                    <div>
                      <label className="block font-belleza text-sm text-gray-700 mb-1">Nomor Telepon *</label>
                      <input name="phone" type="tel" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="mb-6">
                  <h3 className="font-belleza text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Alamat Lengkap
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block font-belleza text-sm text-gray-700 mb-1">Alamat Lengkap *</label>
                      <textarea name="address" required rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white resize-none" placeholder="Jl. Contoh No. 123, RT/RW 001/002"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-belleza text-sm text-gray-700 mb-1">Kota *</label>
                        <input name="city" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                      </div>
                      <div>
                        <label className="block font-belleza text-sm text-gray-700 mb-1">Provinsi *</label>
                        <input name="province" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-belleza text-sm text-gray-700 mb-1">Kode Pos *</label>
                        <input name="postal_code" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 bg-white" />
                      </div>
                      <div>
                        <label className="block font-belleza text-sm text-gray-700 mb-1">Negara</label>
                        <input type="text" value="Indonesia" readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black bg-gray-100 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right side: Order Summary */}
            <div>
              <h2 className="font-cormorant text-xl md:text-2xl text-black mb-4">Ringkasan Pesanan</h2>
              
              {/* Order items */}
              <div className="border border-gray-300 rounded-lg p-5 mb-4 bg-gray-50/50 min-h-[300px]">
                <h3 className="font-cormorant text-base text-black mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Produk yang Dipesan
                </h3>
                <div className="space-y-3 min-h-[200px]">
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil((viewItems?.length || 0) / summaryPerPage))
                    const page = Math.min(summaryPage, totalPages)
                    const start = (page - 1) * summaryPerPage
                    const end = start + summaryPerPage
                    const paged = (viewItems || []).slice(start, end)
                    return paged
                  })().map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0 rounded-md">
                        {item.produk?.photo1 ? (
                          <Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover rounded-md" />
                        ) : (
                          <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover rounded-md" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-belleza text-gray-900 font-medium truncate">{item.produk?.nama_produk || 'Produk'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-belleza text-sm text-gray-600">
                            {item.quantity} x Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}
                          </span>
                          {item.size && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Ukuran: {item.size}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-belleza text-gray-900 font-semibold">Rp {(Number(item.produk?.harga || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {(viewItems?.length || 0) > summaryPerPage && (
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      aria-label="Sebelumnya"
                      className={summaryPage === 1 ? "inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-300 cursor-not-allowed" : "inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-black hover:bg-gray-50"}
                      onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                      disabled={summaryPage === 1}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <div className="px-1 text-xs text-gray-700">
                      {summaryPage} / {Math.max(1, Math.ceil((viewItems?.length || 0) / summaryPerPage))}
                    </div>
                    <button
                      type="button"
                      aria-label="Berikutnya"
                      className={(summaryPage >= Math.max(1, Math.ceil((viewItems?.length || 0) / summaryPerPage))) ? "inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-300 cursor-not-allowed" : "inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-black hover:bg-gray-50"}
                      onClick={() => setSummaryPage((p) => Math.min(Math.max(1, Math.ceil((viewItems?.length || 0) / summaryPerPage)), p + 1))}
                      disabled={summaryPage >= Math.max(1, Math.ceil((viewItems?.length || 0) / summaryPerPage))}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                )}
              </div>


              {/* Shipping section */}
              <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50/50 min-h-[260px]">
                <h3 className="font-cormorant text-base text-black mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Pengiriman
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-black transition-colors">
                    <input 
                      type="radio" 
                      name="shipping_method" 
                      value="J&T Express" 
                      className="w-4 h-4 accent-black" 
                      checked={selectedShipping === 'J&T Express'}
                      onChange={(e) => setSelectedShipping(e.target.value)}
                    />
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                        <Image src="/images/j&t.png" alt="J&T Express" width={48} height={24} className="object-contain" />
                        <div>
                          <span className="font-belleza text-gray-900 text-sm">J&T Express</span>
                          <p className="text-[11px] text-gray-600 mt-0.5">Estimasi 2-3 hari kerja</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {renderOngkirPrice('J&T Express', selectedShipping === 'J&T Express')}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-black transition-colors">
                    <input 
                      type="radio" 
                      name="shipping_method" 
                      value="JNE" 
                      className="w-4 h-4 accent-black"
                      checked={selectedShipping === 'JNE'}
                      onChange={(e) => setSelectedShipping(e.target.value)}
                    />
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                        <Image src="/images/jne.png" alt="JNE" width={48} height={24} className="object-contain" />
                        <div>
                          <span className="font-belleza text-gray-900 text-sm">JNE</span>
                          <p className="text-[11px] text-gray-600 mt-0.5">Estimasi 3-5 hari kerja</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {renderOngkirPrice('JNE', selectedShipping === 'JNE')}
                      </div>
                    </div>
                  </label>
                </div>
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-[11px] text-blue-800 font-medium">Info Pengiriman</p>
                        <p className="text-[11px] text-blue-700 mt-0.5">Pengiriman setiap hari khusus untuk pesanan di bawah pukul 15.00 WIB.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment method moved below as full-width */}
            </div>
          </div>

          {/* Payment Method - Full width below the grid */}
          <div className="mt-8">
            <div className="border border-gray-300">
              <div className="bg-gray-50 px-4 py-3">
                <h3 className="font-cormorant text-lg text-black">Metode Pembayaran</h3>
              </div>
              <div className="px-4 py-4">
                <div className="space-y-3">
                  {paymentChannels.length > 0 ? (
                    paymentChannels.map((ch: any) => (
                      <label key={ch.code} className="flex items-center gap-3 p-2 text-sm bg-white border border-gray-200 rounded-md cursor-pointer hover:border-black transition-colors">
                        <input
                          type="radio"
                          name="payment_method"
                          value={ch.code}
                          checked={paymentMethod === ch.code}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 accent-black"
                        />
                        <div className="flex items-center justify-between flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-belleza text-gray-900">{ch.name} ({ch.code})</span>
                          </div>
                          {channelLogos[(ch.code || '').toUpperCase()] && (
                            <Image
                              src={channelLogos[(ch.code || '').toUpperCase()]}
                              alt={`${ch.name} logo`}
                              width={56}
                              height={20}
                              className="object-contain"
                            />
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">Memuat metode pembayaran...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          

          {/* Detail Order - Full width below the grid */}
          <div className="mt-8">
            <div className="border border-gray-300">
              <div className="bg-gray-50 px-4 py-3">
                <h3 className="font-cormorant text-lg text-black">Detail Order</h3>
              </div>
              
              {/* Header */}
              <div className="bg-gray-100 px-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="font-belleza text-sm font-medium text-black">Product</span>
                  <span className="font-belleza text-sm font-medium text-black">Subtotal</span>
                </div>
              </div>

              {/* Products */}
              <div className="px-4 py-3 space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <span className="font-belleza text-sm text-gray-500">Memuat data pesanan...</span>
                  </div>
                ) : viewItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="font-belleza text-sm text-black">
                      {item.produk?.nama_produk || 'Produk'} × {item.quantity}
                    </span>
                    <span className="font-belleza text-sm text-black">
                      Rp {(Number(item.produk?.harga || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
                <div className="border-b border-gray-300 mt-2"></div>
              </div>

              {/* Biaya Jasa Kirim */}
              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-belleza text-sm text-black">Biaya Jasa Kirim</span>
                  {ongkirLoading ? (
                    <span className="font-belleza text-sm text-gray-500">Loading...</span>
                  ) : (
                    <span className="font-belleza text-sm text-black">Rp {shippingCost.toLocaleString('id-ID')}</span>
                  )}
                </div>
                <div className="border-b border-gray-300 mt-2"></div>
              </div>

              {/* Subtotal */}
              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-belleza text-sm font-medium text-black">Subtotal</span>
                  <span className="font-belleza text-sm font-medium text-black">Rp {subtotalWithShipping.toLocaleString('id-ID')}</span>
                </div>
                <div className="border-b border-gray-300 mt-2"></div>
              </div>

              {/* Potongan Voucher (jika ada) */}
              {discountAmount > 0 && (
                <div className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="font-belleza text-sm text-black">Potongan Voucher ({voucherCode})</span>
                    <span className="font-belleza text-sm text-green-600">-Rp {discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-b border-gray-300 mt-2"></div>
                </div>
              )}

              {/* Total */}
              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-belleza text-sm font-bold text-black">Total</span>
                  <span className="font-belleza text-sm font-bold text-black">Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Place order button */}
            <div className="mt-4">
              <button type="submit" disabled={submitLoading} className="w-full bg-black text-white py-4 px-6 font-belleza text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                {submitLoading ? 'Memproses...' : 'Lanjutkan Pembayaran'}
              </button>
            </div>
          </div>
        </div>
        </form>
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
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}

