"use client";
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, produkDb } from '@/lib/database'
import { useAuth } from '@/lib/auth-context'

export default function DocsPage({ initialActive }: { initialActive?: 'terms' | 'privacy' | 'returns' | 'notif' } = {}) {
   const { user } = useAuth()
   const [isSidebarOpen, setIsSidebarOpen] = useState(false)
   const [isSearchOpen, setIsSearchOpen] = useState(false)
   const [isCartOpen, setIsCartOpen] = useState(false)
   const [isFavOpen, setIsFavOpen] = useState(false)
   const [userMenuOpenDesktop, setUserMenuOpenDesktop] = useState(false)
   const [userMenuOpenMobile, setUserMenuOpenMobile] = useState(false)
   const [removingId, setRemovingId] = useState<string | null>(null)
   const router = useRouter()
   const [active, setActive] = useState<'terms' | 'privacy' | 'returns' | 'notif'>(initialActive ?? 'terms')
   const [searchQuery, setSearchQuery] = useState('')
   const [searchResults, setSearchResults] = useState<any[]>([])
   const [searchLoading, setSearchLoading] = useState(false)
   const [hasSearched, setHasSearched] = useState(false)
   const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
   const { items: cartItems, count: cartCount, loading: cartLoading, refresh } = useCart()
   const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
   const [viewItems, setViewItems] = useState<any[]>([])
   const [docsSplash, setDocsSplash] = useState(true)

  // Short splash to avoid jank on first paint
  useEffect(() => {
    const t = setTimeout(() => setDocsSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  function tabToSlug(tab: 'terms' | 'privacy' | 'returns' | 'notif'): string {
    switch (tab) {
      case 'terms': return 'syarat&ketentuan'
      case 'privacy': return 'kebijakan-privacy'
      case 'returns': return 'pengembalian'
      case 'notif': return 'notifikasi'
    }
  }

  function go(tab: 'terms' | 'privacy' | 'returns' | 'notif') {
    setActive(tab)
    router.push(`/docs/${tabToSlug(tab)}`)
  }

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

  const showSplash = docsSplash

  return (
    showSplash ? (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : (
    <main className="min-h-screen flex flex-col">
      {/* Left sidebar (menu) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-2xl p-6">
            <div className="mt-6 md:mt-8 flex items-center justify-between">
              <span className="font-heading text-3xl md:text-4xl font-bold text-black">MEORIS</span>
              <button type="button" aria-label="Tutup menu" className="p-2 rounded hover:opacity-80 text-black cursor-pointer" onClick={() => setIsSidebarOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <nav className="mt-10 md:mt-12">
              <ul className="space-y-2 font-body text-gray-800">
                <li>
                  <Link href="/home" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 10.5l9-7 9 7V20a2 2 0 0 1-2 2h-5v-6h-4v6H5a2 2 0 0 1-2-2v-9.5z" fill="currentColor"/>
                      </svg>
                    </span>
                    <span className="font-heading text-base flex-1">Beranda</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/my-account" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-9 9a9 9 0 1118 0H3z" fill="currentColor"/></svg>
                    </span>
                    <span className="font-heading text-base flex-1">Informasi Akun</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/produk/pesanan" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 2h12a1 1 0 011 1v18l-7-3-7 3V3a1 1 0 011-1z" fill="currentColor"/></svg>
                    </span>
                    <span className="font-heading text-base flex-1">History Pesanan</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/histori/transaksi" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-black">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-gray-700 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v1H3V7zm0 4h18v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6zm6 5h4v-2H9v2z" fill="currentColor"/></svg>
                    </span>
                    <span className="font-heading text-base flex-1">History Transaksi</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
              </ul>
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
              <span className="font-heading text-xl md:text-2xl text-black">Cari Produk</span>
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
                        <p className="font-body text-sm text-gray-700 mt-1">
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
              <span className="font-heading text-xl md:text-2xl text-black">Item Keranjang</span>
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
                      <p className="font-body text-gray-900 truncate">{item.produk?.nama_produk || 'Produk'}</p>
                      <p className="font-body text-sm text-gray-700 mt-1"><span className="text-black">{item.quantity} x</span> Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}{item.size ? <span className="ml-2 text-gray-500">Uk: {item.size}</span> : null}</p>
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
      {isFavOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsFavOpen(false)} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6">
            <button type="button" aria-label="Tutup favorit" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsFavOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-heading text-xl md:text-2xl text-black">Favorit</span>
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
                      <p className="font-body text-gray-900 truncate">{favorite.produk?.nama_produk || "Produk"}</p>
                      <p className="font-body text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString("id-ID")}</p>
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
              <span className="font-heading font-bold text-2xl tracking-wide text-black">MEORIS</span>
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
              <span className="font-heading font-bold text-xl tracking-wide text-black">MEORIS</span>
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

      {/* Content wrapper */}
      <div className="flex-grow">
      {/* Section 1: hero with bg */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div className="absolute inset-0 -z-10 bg-center bg-cover" aria-hidden="true" style={{ backgroundImage: 'url(/images/bg22.png)' }} />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-black">
          <h1 className="font-heading text-3xl md:text-4xl text-gray-200">Dokumen</h1>
          <div className="mt-3 font-body text-sm text-gray-200">
            <span>Beranda</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-200">Dokumen</span>
          </div>
        </div>
      </section>

      {/* Section 2: 20% abu (kiri) + 80% putih (kanan) full width */}
      <section className="p-0 m-0">
        <div className="grid md:grid-cols-[1fr_4fr] w-full min-h-[50vh]">
          {/* Sidebar: hidden on mobile, visible on md+ */}
          <aside className="hidden md:block bg-gray-100">
            <div className="h-full w-full p-5 md:p-6">
              <nav>
                <ul className="space-y-2">
                  <li>
                    <button type="button" onClick={() => go('terms')} aria-pressed={active === 'terms'} className={`w-full flex items-center justify-between text-left px-4 py-3 transition ${active === 'terms' ? 'bg-white' : 'bg-white/50 hover:bg-white'} text-black`}>
                      <span className="font-body">Syarat &amp; Ketentuan</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => go('privacy')} aria-pressed={active === 'privacy'} className={`w-full flex items-center justify-between text-left px-4 py-3 transition ${active === 'privacy' ? 'bg-white' : 'bg-white/50 hover:bg-white'} text-black`}>
                      <span className="font-body">Kebijakan Privacy</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => go('returns')} aria-pressed={active === 'returns'} className={`w-full flex items-center justify-between text-left px-4 py-3 transition ${active === 'returns' ? 'bg-white' : 'bg-white/50 hover:bg-white'} text-black`}>
                      <span className="font-body">Pengembalian</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => go('notif')} aria-pressed={active === 'notif'} className={`w-full flex items-center justify-between text-left px-4 py-3 transition ${active === 'notif' ? 'bg-white' : 'bg-white/50 hover:bg-white'} text-black`}>
                      <span className="font-body">Notifikasi</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>
          <div className="bg-white text-black overflow-y-auto">
            <div className="max-w-6xl w-full mx-auto px-4 py-6 md:px-10 md:py-10 text-black">
              {/* Mobile dropdown for switching docs tabs */}
              <div className="md:hidden mb-4">
                <label htmlFor="docs-select" className="sr-only">Pilih dokumen</label>
                <select
                  id="docs-select"
                  className="w-full border border-black rounded-none px-3 py-2 text-black bg-white"
                  value={active}
                  onChange={(e) => go(e.target.value as 'terms' | 'privacy' | 'returns' | 'notif')}
                >
                  <option value="terms">Syarat &amp; Ketentuan</option>
                  <option value="privacy">Kebijakan Privasi</option>
                  <option value="returns">Pengembalian</option>
                  <option value="notif">Notifikasi</option>
                </select>
              </div>
              {active === 'terms' && (
                <div className="font-body text-gray-800" style={{ textAlign: 'justify' }}>
                  <h2 className="font-heading text-2xl text-black">Syarat &amp; Ketentuan</h2>
                  <p className="mt-1"><strong>Tanggal berlaku:</strong> 20 September 2025</p>
                  <p className="mt-3">Dengan mengakses dan/atau melakukan pembelian di situs Meoris ("Situs") Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat &amp; Ketentuan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan Situs.</p>

                  <h3 className="font-heading text-lg text-black mt-6">1. Definisi</h3>
                  <div className="ml-3 md:ml-6 space-y-2">
                    <p><strong>Meoris</strong> adalah merek dan penyelenggara Situs e‑commerce yang menjual sandal bagi pria dan wanita.</p>
                    <p><strong>Pengguna</strong> adalah setiap orang yang mengakses Situs, membuat akun, dan/atau melakukan transaksi.</p>
                    <p><strong>Pembeli</strong> adalah Pengguna yang melakukan pemesanan produk di Situs.</p>
                    <p><strong>Produk</strong> adalah sandal dan/atau aksesori terkait yang ditawarkan Meoris di Situs.</p>
                    <p><strong>Mitra Logistik/Ekspedisi</strong> adalah pihak ketiga penyedia jasa pengiriman yang bekerja sama dengan Meoris.</p>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">2. Akun dan Keamanan</h3>
                  <div className="ml-3 md:ml-6">
                  <ul className="list-disc pl-5">
                    <li>Untuk bertransaksi, Pengguna dapat diminta membuat akun dan memberikan data yang akurat, lengkap, dan terbaru.</li>
                    <li>Pengguna bertanggung jawab menjaga kerahasiaan kredensial (email, kata sandi, OTP) serta seluruh aktivitas pada akun.</li>
                    <li>Meoris berhak menangguhkan atau menutup akun jika diduga terjadi penyalahgunaan, pelanggaran hukum, atau pelanggaran Syarat &amp; Ketentuan ini.</li>
                    <li>Pengguna setuju menerima komunikasi terkait akun dan transaksi (email/SMS/WhatsApp/push) dari Meoris.</li>
                  </ul>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">3. Layanan</h3>
                  <div className="ml-3 md:ml-6">
                  <ul className="list-disc pl-5">
                    <li>Meoris menyediakan katalog Produk, informasi ketersediaan dan ukuran, serta fasilitas pemesanan, pembayaran, dan pengiriman melalui Mitra Logistik.</li>
                    <li>Ketersediaan stok, gambar, warna, ukuran, dan deskripsi Produk pada Situs sedapat mungkin akurat, namun dapat terjadi perbedaan minor karena pencahayaan layar/perangkat.</li>
                    <li>Meoris dapat sewaktu‑waktu menambah, mengubah, membatasi, atau menghentikan sebagian/seluruh fitur layanan untuk pemeliharaan, pembaruan, atau alasan lain yang wajar.</li>
                  </ul>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">4. Pembayaran</h3>
                  <div className="ml-3 md:ml-6">
                  <ul className="list-disc pl-5">
                    <li>Pembayaran hanya dilakukan melalui metode resmi yang tercantum pada halaman checkout (mis. transfer bank/virtual account, e‑wallet). Meoris tidak menerima pembayaran di luar kanal resmi.</li>
                    <li>Pesanan dianggap terkonfirmasi setelah pembayaran terverifikasi oleh sistem/payment gateway.</li>
                    <li>Harga yang ditampilkan termasuk pajak pertambahan nilai (PPN) bila berlaku dan tidak termasuk biaya pengiriman kecuali dinyatakan lain (mis. promosi gratis ongkir).</li>
                    <li>Dalam hal terjadi kesalahan harga/typographical error, Meoris berhak membatalkan pesanan dan mengembalikan pembayaran penuh yang telah diterima.</li>
                  </ul>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">5. Ketentuan Penggunaan</h3>
                  <div className="ml-3 md:ml-6">
                  <ul className="list-disc pl-5">
                    <li>Pengguna dilarang menggunakan Situs untuk tujuan melanggar hukum; mengganggu keamanan/operabilitas Situs (mis. scraping berlebihan, injeksi); memalsukan identitas; atau memesan untuk tujuan penjualan kembali tanpa izin tertulis.</li>
                    <li>Ulasan/komentar tidak boleh mengandung konten yang melanggar hukum/hak pihak ketiga, SARA, atau materi menyesatkan; Meoris berhak memoderasi.</li>
                    <li>Tautan ke situs pihak ketiga hanya untuk kenyamanan; Meoris tidak mengendalikan dan tidak bertanggung jawab atas konten/layanan pihak ketiga.</li>
                  </ul>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">6. Hak Kekayaan Intelektual</h3>
                  <div className="ml-3 md:ml-6">
                  <ul className="list-disc pl-5">
                    <li>Seluruh logo, nama dagang, desain, foto produk, tata letak, dan konten pada Situs dilindungi oleh hukum kekayaan intelektual Indonesia.</li>
                    <li>Dilarang menyalin, memperbanyak, memodifikasi, menyebarluaskan, atau menggunakan konten Meoris untuk tujuan komersial tanpa persetujuan tertulis.</li>
                    <li>Hak kekayaan intelektual milik pihak ketiga tetap menjadi milik pemiliknya.</li>
                  </ul>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">7. Pengiriman, Penukaran, dan Penghentian Layanan</h3>
                  <div className="ml-3 md:ml-6">
                  <h4 className="font-heading text-lg text-black mt-4">Pengiriman</h4>
                  <ul className="list-disc pl-5">
                    <li>Pesanan diproses pada Hari Kerja setelah pembayaran terverifikasi. Estimasi mengikuti Mitra Logistik dan tujuan.</li>
                    <li>Nomor resi diberikan untuk pelacakan. Risiko beralih ke Pembeli setelah paket diterima sesuai bukti serah terima.</li>
                    <li>Pastikan alamat, nomor telepon, dan penerima benar; kegagalan akibat data tidak akurat menjadi tanggung jawab Pembeli.</li>
                  </ul>
                  <h4 className="font-heading text-lg text-black mt-4">Penukaran &amp; Pengembalian</h4>
                  <ul className="list-disc pl-5">
                    <li>Tukar ukuran: maksimal 7 Hari Kalender sejak diterima, produk belum dipakai, tidak rusak/ternoda, label &amp; kemasan asli lengkap; ketersediaan mengikuti stok.</li>
                    <li>Cacat produksi: ajukan dalam 14 Hari Kalender sejak diterima dengan bukti; opsi perbaikan/penggantian/refund sesuai kebijakan.</li>
                    <li>Biaya kirim balik: tukar ukuran ditanggung Pembeli; cacat/produk salah ditanggung Meoris.</li>
                    <li>Refund dikreditkan ke metode asal 3–10 Hari Kerja setelah verifikasi &amp; QC.</li>
                    <li>Barang promo/clearance/gift/voucher umumnya tidak dapat dikembalikan kecuali cacat produksi.</li>
                  </ul>
                  <p className="mt-3"><strong>Penghentian Layanan</strong> — Meoris berhak menolak/membatalkan pesanan, menonaktifkan akun, atau menghentikan akses jika ada pelanggaran, kecurangan pembayaran, atau instruksi otoritas. Pembayaran yang telah diterima karena kesalahan Meoris akan dikembalikan penuh.</p>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">8. Batas Tanggung Jawab</h3>
                  <div className="ml-3 md:ml-6">
                  <ul className="list-disc pl-5">
                    <li>Situs disediakan "sebagaimana adanya" tanpa jaminan tersirat tentang ketersediaan/akurat/sesuai tujuan.</li>
                    <li>Meoris tidak bertanggung jawab atas kerugian tidak langsung/insidental/khusus/konsekuensial.</li>
                    <li>Batas tanggung jawab maksimal per transaksi setinggi nilai yang dibayarkan Pembeli.</li>
                  </ul>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">9. Perubahan Syarat &amp; Ketentuan</h3>
                  <div className="ml-3 md:ml-6">
                    <p>Meoris dapat mengubah ketentuan ini sewaktu‑waktu. Versi terbaru akan dipublikasikan dengan tanggal berlaku. Penggunaan berkelanjutan dianggap sebagai persetujuan.</p>
                  </div>
                  <h3 className="font-heading text-lg text-black mt-6">10. Hukum yang Berlaku &amp; Penyelesaian Sengketa</h3>
                  <div className="ml-5 md:ml-10">
                    <p>Diatur oleh hukum Republik Indonesia. Sengketa diselesaikan melalui musyawarah; bila gagal, melalui pengadilan negeri yang berwenang.</p>
                  </div>
                </div>
               )}

              {active === 'privacy' && (
                <div className="font-body text-gray-800" style={{ textAlign: 'justify' }}>
                  <h2 className="font-heading text-2xl text-black">Kebijakan Privasi</h2>
                  <p className="mt-1"><strong>Tanggal berlaku:</strong> 20 September 2025</p>
                  <p className="mt-3">Meoris berkomitmen menjaga privasi dan data pribadi setiap Pengguna. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, membagikan, serta melindungi data Anda saat mengakses situs Meoris dan/atau bertransaksi.</p>

                  <h3 className="font-heading text-lg text-black mt-6">1. Informasi yang Kami Kumpulkan</h3>
                  <div className="ml-3 md:ml-6 space-y-3">
                    <p className="font-semibold">A. Data Identitas &amp; Kontak</p>
                    <p>Nama, email, nomor telepon/WhatsApp, alamat pengiriman dan penagihan.</p>

                    <p className="font-semibold">B. Data Akun</p>
                    <p>Email login, kata sandi (disimpan ter‑enkripsi), preferensi akun, daftar alamat, riwayat pesanan.</p>

                    <p className="font-semibold">C. Data Transaksi</p>
                    <p>Produk yang dibeli, ukuran, jumlah, harga, metode pembayaran, status pembayaran, status pengiriman, nomor resi.</p>

                    <p className="font-semibold">G. Data Komunikasi</p>
                    <p>Pesan ke layanan pelanggan, ulasan/komentar, bukti foto/video untuk klaim retur/garansi.</p>

                    <p>Jika Anda memberikan data pihak lain (mis. alamat penerima), pastikan Anda memiliki persetujuan dari pihak tersebut.</p>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">2. Penggunaan Informasi</h3>
                  <div className="ml-3 md:ml-6 space-y-2">
                    <p>Kami menggunakan data untuk:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Memproses pesanan:</strong> verifikasi pembayaran, pemenuhan order, pengiriman, pelacakan, dan dukungan purna jual.</li>
                      <li><strong>Mengelola akun:</strong> autentikasi, keamanan, manajemen preferensi, dan histori transaksi.</li>
                      <li><strong>Layanan pelanggan:</strong> menanggapi pertanyaan, klaim cacat, penukaran/retur.</li>
                      <li><strong>Komunikasi:</strong> notifikasi status pesanan, pembaruan layanan, dan (dengan persetujuan) promosi/penawaran yang relevan.</li>
                      <li><strong>Peningkatan layanan:</strong> analitik penggunaan, pengujian fitur, personalisasi konten/produk yang direkomendasikan.</li>
                      <li><strong>Keamanan &amp; pencegahan fraud:</strong> pendeteksian aktivitas mencurigakan, penegakan S&amp;K, dan kepatuhan hukum.</li>
                      <li><strong>Kewajiban hukum:</strong> perpajakan, akuntansi, dan permintaan sah dari otoritas.</li>
                    </ul>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">3. Pembagian Data kepada Pihak Ketiga</h3>
                  <div className="ml-3 md:ml-6">
                    <p>Kami tidak menjual data pribadi Anda. Kami dapat membagikan data secara terbatas kepada:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li><strong>Mitra Pembayaran</strong> (payment gateway/bank/e‑wallet) untuk memproses transaksi dan pencegahan penipuan.</li>
                      <li><strong>Mitra Logistik</strong> untuk pengiriman, pelacakan, dan penanganan retur.</li>
                      <li><strong>Kepatuhan Hukum</strong> bila diwajibkan oleh peraturan atau permintaan sah dari otoritas.</li>
                    </ul>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">4. Hak Anda atas Data Pribadi</h3>
                  <div className="ml-3 md:ml-6">
                    <p>Sesuai hukum yang berlaku, Anda berhak untuk:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li><strong>Akses:</strong> meminta salinan data pribadi Anda.</li>
                      <li><strong>Perbaikan:</strong> memperbarui data yang tidak akurat/tidak lengkap.</li>
                      <li><strong>Penghapusan:</strong> meminta penghapusan data tertentu (dengan mempertimbangkan kewajiban retensi hukum).</li>
                      <li><strong>Pembatasan &amp; Keberatan:</strong> menolak pemrosesan untuk tujuan tertentu termasuk pemasaran langsung.</li>
                      <li><strong>Portabilitas Data</strong> (sejauh berlaku): meminta data dalam format terstruktur yang lazim digunakan.</li>
                      <li><strong>Menarik Persetujuan</strong> kapan saja untuk pemrosesan yang berdasarkan persetujuan.</li>
                    </ul>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">5. Perubahan Kebijakan</h3>
                  <div className="ml-3 md:ml-6 space-y-2">
                    <p>Kebijakan ini dapat diperbarui sewaktu‑waktu. Versi terbaru beserta tanggal berlaku akan ditampilkan di Situs. Jika perubahannya material, kami dapat memberi pemberitahuan tambahan (email/banner).</p>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">6. Kontak</h3>
                  <div className="ml-3 md:ml-6 space-y-2">
                    <p>Untuk pertanyaan, permintaan hak subjek data, atau keluhan terkait privasi, hubungi:</p>
                    <p><strong>Email:</strong> info@meoris.erdanpee.com</p>
                  </div>
                </div>
              )}

              {active === 'returns' && (
                <div className="font-body text-gray-800" style={{ textAlign: 'justify' }}>
                  <h2 className="font-heading text-2xl text-black">Pengembalian</h2>

                  <h3 className="font-heading text-lg text-black mt-6">Bukti yang perlu disiapkan</h3>
                  <div className="ml-3 md:ml-6 space-y-3">
                    <p>1. Video unboxing (wajib)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Mulai rekam sebelum paket dibuka, tunjukkan segel masih utuh &amp; label resi.</li>
                      <li>Buka perlahan tanpa dipotong‑potong, sampai produk terlihat jelas.</li>
                      <li>Tunjukkan bagian yang bermasalah (kalau ada).</li>
                    </ul>

                    <p>2. Foto pendukung (wajib)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Tampak keseluruhan sandal (kiri &amp; kanan).</li>
                      <li>Close‑up / zoom bagian bermasalah.</li>
                      <li>Foto dus/kemasan + label resi.</li>
                    </ul>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">Cara ajukan</h3>
                  <div className="ml-3 md:ml-6">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Siapkan nomor pesanan dan bukti (video + foto).</li>
                      <li>Hubungi kami via Situs/Email (lihat Kontak di bawah).</li>
                      <li>Tim kami akan cek bukti &amp; konfirmasi langkah berikutnya (ganti barang/refund/solusi lain).</li>
                    </ul>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">Estimasi waktu proses</h3>
                  <div className="ml-3 md:ml-6">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Verifikasi bukti: 1–2 hari kerja.</li>
                      <li>Proses kirim pengganti / refund: 3–10 hari kerja setelah barang kami terima &amp; lolos pengecekan.</li>
                    </ul>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">Yang tidak bisa diproses</h3>
                  <div className="ml-3 md:ml-6">
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Barang sudah dipakai di luar sekadar coba.</li>
                      <li>Label/hangtag hilang, kemasan asli rusak berat.</li>
                      <li>Kerusakan karena salah perawatan.</li>
                      <li>Barang promo tertentu (akan ditandai di halaman produk).</li>
                    </ol>
                  </div>

                  <h3 className="font-heading text-lg text-black mt-6">Opsi Pengambalian</h3>
                  <div className="ml-3 md:ml-6 space-y-1">
                    <p><strong>Email</strong> : info@meoris.erdanpee.com</p>
                    <p className="mt-2"><strong>Situs</strong> : https://meoris.erdanpee.com/permintaan-returns</p>
                  </div>
                </div>
              )}

              {active === 'notif' && (
                <div className="font-body text-gray-800" style={{ textAlign: 'justify' }}>
                  <h2 className="font-heading text-2xl text-black">Notifikasi Email</h2>
                  <p className="mt-2">Dengan berlangganan notifikasi email Meoris, kamu akan menerima info berkala seperti:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Rilis produk baru</li>
                    <li>Diskon &amp; penawaran spesial</li>
                    <li>Kode promo &amp; voucher</li>
                    <li>Ketersediaan ulang (restock) ukuran/model favorit</li>
                  </ul>
                  <p className="mt-3">Frekuensi: maksimal beberapa kali dalam sebulan. Kami berusaha hanya mengirim info yang relevan.</p>
                </div>
              )}
            </div>
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
                  <span className="font-heading font-bold text-xl tracking-wide text-black">MEORIS</span>
                  <div className="mt-1 text-[9px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
                </div>
                <ul className="space-y-2 font-body text-gray-700">
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
                <h4 className="font-heading text-base text-black whitespace-nowrap">Informasi</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><a href="/docs/notifikasi" className="hover:underline">Notifikasi</a></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-heading text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><a href="/docs/pengembalian" className="hover:underline">Pengembalian</a></li>
                  <li><a href="/docs/syarat&ketentuan" className="hover:underline">Syarat & Ketentuan</a></li>
                  <li><a href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</a></li>
                </ul>
              </div>

              {/* My Account */}
              <div className="pb-2">
                <h4 className="font-heading text-base text-black whitespace-nowrap">Akun Saya</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><a href="/my-account" className="hover:underline">Detail Akun</a></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
                  <li><a href="/produk/pesanan" className="hover:underline">Pesanan</a></li>
                </ul>
              </div>
            </div>

            {/* Desktop: Right aligned */}
            <div className="hidden md:flex items-center justify-end">
              <div className="font-body text-gray-600 text-sm flex items-center flex-wrap justify-end gap-x-2">
                <span className="font-heading font-bold text-black">MEORIS</span>
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
  )
}
