"use client";
import Image from 'next/image'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { keranjangDb, produkDb, homepageSection2DealsDb } from '@/lib/database'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { useProductCache } from '@/lib/ProductCacheContext'
import type { Produk } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useParams, useRouter } from 'next/navigation'
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { getProductById, products: allCachedProducts, isCacheReady } = useProductCache()
  const [product, setProduct] = useState<Produk | null>(null)
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const sizes = useMemo(() => (
    [product?.size1, product?.size2, product?.size3, product?.size4, product?.size5].filter(Boolean) as string[]
  ), [product])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [qty, setQty] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<'desc' | 'info'>('desc')
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const { items: cartHookItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, isFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [productLoading, setProductLoading] = useState<boolean>(true)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [carouselIndex, setCarouselIndex] = useState<number>(0)
  const [productDeal, setProductDeal] = useState<any>(null)
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
  // Ambil data produk dari cache (INSTANT!)
  useEffect(() => {
    setProductLoading(true)

    // Try cache first (instant if available)
    const cachedProduct = getProductById(id)
    if (cachedProduct) {
      console.log('[ProductDetail] Using cached product - INSTANT!')
      setProduct(cachedProduct)
      setProductLoading(false)
      return
    }

    // Fallback: fetch from database if not in cache (should rarely happen)
    const fetch = async () => {
      try {
        console.log('[ProductDetail] Cache miss, fetching from database...')
        const data = await produkDb.getById(id)
        setProduct(data)
      } catch (e) {
        console.error('Gagal memuat produk', e)
      } finally {
        setProductLoading(false)
      }
    }
    fetch()
  }, [id, getProductById])

  // Fetch product deal data
  useEffect(() => {
    const fetchProductDeal = async () => {
      try {
        const dealData = await homepageSection2DealsDb.getByProductId(id)
        setProductDeal(dealData)
      } catch (error) {
        console.error('Gagal memuat data deal produk:', error)
        setProductDeal(null)
      }
    }
    
    if (id) {
      fetchProductDeal()
    }
  }, [id])

  // Fetch related products from cache (INSTANT!)
  useEffect(() => {
    if (!isCacheReady || allCachedProducts.length === 0) return

    console.log('[ProductDetail] Using cached products for related items - INSTANT!')
    // Filter out current product and get random 8 products
    const filtered = allCachedProducts.filter((p: any) => p.id !== id)
    const shuffled = filtered.sort(() => 0.5 - Math.random())
    setRelatedProducts(shuffled.slice(0, 8))
  }, [id, allCachedProducts, isCacheReady])
  // Full-screen loading UI will be rendered conditionally in JSX below to keep hook order stable
  // Set default size saat data tersedia
  useEffect(() => {
    if (!selectedSize && sizes.length > 0) {
      setSelectedSize(sizes[0])
    }
  }, [sizes, selectedSize])
  // Realtime: dengarkan perubahan pada produk ini
  useEffect(() => {
    const channel = supabase
      .channel(`produk-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produk', filter: `id=eq.${id}` }, (payload: any) => {
        if (payload?.new) {
          setProduct(payload.new as Produk)
        }
      })
      .subscribe()
    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [id])
  // Galeri berdasarkan photo1-3
  const images = [product?.photo1, product?.photo2, product?.photo3].filter(Boolean) as string[]
  // Show no image while loading. After product loads: if it has no images, use a single safe placeholder.
  const gallery = images.length > 0 ? images : ['/images/test1p.png']
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true)
  
  const goPrev = () => {
    setCurrentIndex((i) => (i === 0 ? (gallery.length - 1) : i - 1))
    setIsAutoPlaying(false) // Pause auto-play when user manually navigates
  }
  
  const goNext = () => {
    setCurrentIndex((i) => (i === (gallery.length - 1) ? 0 : i + 1))
    setIsAutoPlaying(false) // Pause auto-play when user manually navigates
  }
  
  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false) // Pause auto-play when user clicks thumbnail
  }
  
  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlaying || gallery.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i === (gallery.length - 1) ? 0 : i + 1))
    }, 4000) // Change image every 4 seconds
    
    return () => clearInterval(interval)
  }, [isAutoPlaying, gallery.length])
  
  // Resume auto-play after 10 seconds of inactivity
  useEffect(() => {
    if (isAutoPlaying) return
    
    const timeout = setTimeout(() => {
      setIsAutoPlaying(true)
    }, 10000) // Resume after 10 seconds
    
    return () => clearTimeout(timeout)
  }, [isAutoPlaying, currentIndex])
  
  const title = product?.nama_produk ?? 'Detail Produk'
  const shortId = (product?.id ?? id)?.split('-')[0] ?? '-'
  const [addingCart, setAddingCart] = useState(false)
  
  // Notification pop-up state (matches /produk page)
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' })
    }, 3000)
  }
  
  const handleAddToCart = async () => {
    let prevSnapshot: any = viewItems
    try {
      if (!user) {
        if (isLoading) return
        router.push(`/login?redirect=/produk/${id}/detail`)
        return
      }
      if (!product || addingCart) return
      setAddingCart(true)
      // Optimistic: buka sidebar dulu agar responsif dan tampilkan item langsung
      setIsCartOpen(true)
      prevSnapshot = viewItems
      const optimisticItem = {
        id: `temp-${Date.now()}`,
        produk_id: product.id,
        produk: {
          nama_produk: product.nama_produk,
          photo1: product.photo1,
          harga: productDeal?.harga_diskon || product.harga
        },
        quantity: qty,
        size: selectedSize ?? null
      } as any
      setViewItems((items) => {
        const list = [...(items || [])]
        const idx = list.findIndex((it: any) => (it.produk_id === product.id) && ((it.size || null) === (selectedSize ?? null)))
        if (idx >= 0) {
          const clone = { ...list[idx], quantity: Number(list[idx]?.quantity || 0) + qty }
          list[idx] = clone
        } else {
          list.unshift(optimisticItem)
        }
        return list
      })
      await keranjangDb.addItem(user.id, product.id, qty, selectedSize ?? undefined)
      // Refresh data cart di background (non-blocking agar label tidak lama di "Menambahkan...")
      try { void refresh() } catch {}
    } catch (e) {
      console.error('Gagal menambahkan ke keranjang', e)
      alert('Gagal menambahkan ke keranjang')
      // Revert ke snapshot jika gagal
      setViewItems(prevSnapshot)
    } finally {
      setAddingCart(false)
    }
  }
  useEffect(() => {
    // Hindari mengganti list optimistik saat proses tambah/hapus sedang berjalan,
    // agar tidak terlihat seperti "refresh" (item hilang-muncul kembali sesaat).
    if (addingCart || removingId) return
    setViewItems(cartHookItems || [])
  }, [cartHookItems, addingCart, removingId])
  useEffect(() => {
    if (isCartOpen && user) {
      refresh()
    }
  }, [isCartOpen, user, refresh])
  const handleRemoveCartItem = async (itemId: string) => {
    // Optimistic UI: hilangkan item
    const prev = viewItems
    setViewItems((items) => items.filter((it: any) => it.id !== itemId))
    try {
      setRemovingId(itemId)
      // Jika item masih optimistik (id sementara), cukup hilangkan dari tampilan
      if (String(itemId).startsWith('temp-')) {
        return
      }
      await keranjangDb.removeItem(itemId)
      // Realtime hook akan menyinkronkan
    } catch (e) {
      const errMsg = (e as any)?.message || (e as any)?.error || JSON.stringify(e || {})
      console.error('Gagal menghapus item keranjang', errMsg)
      // Revert jika gagal
      setViewItems(prev)
    } finally {
      setRemovingId(null)
    }
  }
  // Handle search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
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
  };

  // Close size guide
  const handleCloseSizeGuideSidebar = () => {
    setIsSizeGuideOpen(false);
  };

  // Logout helper
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    productLoading ? (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : (
    <main>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
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
                      <p className="text-sm font-semibold text-white truncate">{(user as any)?.nama || 'User'}</p>
                      <p className="text-xs text-gray-300 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="p-3 pt-5">
              <ul className="space-y-1 font-belleza">
                <li>
                  <a
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
                  </a>
                </li>
                <li>
                  <a
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
                  </a>
                </li>
                <li>
                  <a
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
                  </a>
                </li>
                <li>
                  <a
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
                  </a>
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
              <div className="mt-4 pt-3 border-t border-gray-300">
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg text-xs"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </aside>
        </div>
      )}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40 font-belleza"
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
                <p className="text-sm text-gray-600 font-belleza">Mencari produk...</p>
              ) : searchResults.length > 0 ? (
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
              ) : searchQuery ? (
                <p className="text-sm text-gray-600 font-belleza">Tidak ada hasil untuk "{searchQuery}"</p>
              ) : (
                <p className="text-sm text-gray-600 font-belleza">Masukkan kata kunci untuk mencari produk</p>
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
                <p className="text-sm text-gray-600 font-belleza">Keranjang kosong</p>
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
            {/* Subtotal + actions */}
            <div className="pt-4">
              <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full"
                  onClick={() => {
                    setIsCartOpen(false)
                    router.push('/produk/detail-checkout')
                  }}
                >
                  Checkout
                </button>
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
                <p className="text-sm text-gray-600 font-belleza">Memuat favorit...</p>
              ) : (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600 font-belleza">Belum ada favorit</p>
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
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseSizeGuideSidebar} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup panduan ukuran" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={handleCloseSizeGuideSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Panduan Ukuran</span>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-black"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <h3 className="font-cormorant text-lg text-black">1. Ukur kaki Anda</h3>
                </div>
                <p className="text-sm text-gray-700 font-belleza leading-relaxed">
                  Tempatkan bagian belakang kaki Anda ke dinding di permukaan tanah yang rata. Kemudian ukur jarak dari titik A ke B.
                </p>
                <div className="relative w-full aspect-[4/3]">
                  <Image src="/images/panduan_ukuran.png" alt="Panduan ukuran - titik A ke B" fill sizes="(max-width: 768px) 90vw, 380px" className="object-contain" />
                </div>
                <div className="mt-2 p-3 rounded-md bg-blue-50 border border-blue-100">
                  <p className="text-sm md:text-[13px] text-blue-800 font-belleza">Jarak antara A dan B adalah panjang kaki Anda.</p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-black"><path d="M12 2l3 7h7l-5.5 4 2.5 7-6-4-6 4 2.5-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
                  <h3 className="font-cormorant text-lg text-black">2. Pilih ukuran Anda</h3>
                </div>
                <p className="text-sm text-gray-700 font-belleza leading-relaxed">
                  Lihat tabel konversi ukuran di bawah dan pilih ukuran yang paling dekat dengan panjang kaki Anda.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between px-3 py-2 border border-gray-200">
                    <span className="font-belleza text-sm text-black">39</span>
                    <span className="font-belleza text-sm text-gray-700">24,5 cm</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border border-gray-200">
                    <span className="font-belleza text-sm text-black">40</span>
                    <span className="font-belleza text-sm text-gray-700">25 cm</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border border-gray-200">
                    <span className="font-belleza text-sm text-black">41</span>
                    <span className="font-belleza text-sm text-gray-700">25.5 cm</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border border-gray-200">
                    <span className="font-belleza text-sm text-black">42</span>
                    <span className="font-belleza text-sm text-gray-700">26 cm</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border border-gray-200">
                    <span className="font-belleza text-sm text-black">43</span>
                    <span className="font-belleza text-sm text-gray-700">26.5 cm</span>
                  </div>
                </div>
                <div className="mt-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                  <p className="text-[13px] text-amber-900 font-belleza">Catatan:</p>
                  <ul className="mt-1 list-disc list-inside text-[13px] text-amber-900 font-belleza space-y-1.5">
                    <li>Jika kedua sisi kaki Anda berbeda panjangnya, pilih ukuran berdasarkan sisi yang lebih panjang.</li>
                    <li>Tabel saat ini tidak menyertakan ukuran setengah. Pilih ukuran yang paling dekat dengan panjang kaki Anda.</li>
                  </ul>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
      {/* Desktop header */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-10 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black" onClick={() => setIsSidebarOpen(true)}>
              <Image src="/images/sidebar.png" alt="Menu" width={28} height={28} />
            </button>
            <Link href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-cormorant text-2xl tracking-wide text-black">MEORIS</span>
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
            <div className="relative">
              <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
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
      {/* Section 1: breadcrumb & title */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center">
          <h1 className="font-cormorant text-3xl md:text-4xl text-gray-300">Produk</h1>
          <div className="mt-3 font-belleza text-sm text-gray-300">
            <span className="text-gray-300">Produk</span>
            <span className="mx-1">&gt;</span>
            <span className="uppercase">{shortId}</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-300">Detail</span>
          </div>
        </div>
      </section>
      {/* Section 3: main product content */}
      <section className="bg-white py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left: thumbnails (vertical) + main image */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Thumbnails - Horizontal on mobile/tablet, vertical on desktop */}
              <div className="flex lg:flex-col gap-2 order-2 lg:order-1 justify-center lg:justify-start flex-shrink-0">
                {gallery.slice(0, 6).map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleThumbnailClick(i)}
                    className={`relative w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0 border ${
                      currentIndex === i ? 'border-black border-2' : 'border-gray-300'
                    } bg-gray-100 overflow-hidden hover:border-black transition-all duration-300`}
                    aria-label={`Lihat gambar ${i + 1}`}
                  >
                    <Image src={src} alt={`${title} preview ${i + 1}`} fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>

              {/* Main Image - Increased width with smooth transition */}
              <div className="relative w-full aspect-square border border-gray-200 bg-gray-100 overflow-hidden order-1 lg:order-2">
                {/* Discount percentage badge - rectangular design for product detail page */}
                {productDeal?.harga_diskon && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded shadow-lg z-10">
                    -{Math.round(((Number(product?.harga || 0) - Number(productDeal.harga_diskon)) / Number(product?.harga || 0)) * 100)}%
                  </div>
                )}
                {gallery.length > 0 ? (
                  <div className="relative w-full h-full">
                    {gallery.map((src, i) => (
                      <div
                        key={i}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                          i === currentIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <Image
                          src={src}
                          alt={`${title} ${i + 1}`}
                          fill
                          sizes="(min-width: 1024px) 50vw, 90vw"
                          className="object-contain select-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />
                )}
                {gallery.length > 1 && (
                  <>
                    {/* Left arrow */}
                    <button
                      type="button"
                      aria-label="Gambar sebelumnya"
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {/* Right arrow */}
                    <button
                      type="button"
                      aria-label="Gambar berikutnya"
                      onClick={goNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Right: info */}
            <div>
              {/* Badge BARU */}
              <div className="inline-block mb-3">
                <span className="px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-white border border-gray-300 rounded-full text-black font-belleza">
                  BARU
                </span>
              </div>

              {/* Product Title */}
              <h2 className="font-cormorant text-2xl md:text-3xl lg:text-4xl text-black leading-tight">{title}</h2>
              
              {/* Price */}
              <div className="mt-4">
                {productDeal?.harga_diskon ? (
                  <div className="flex items-center gap-3">
                    <p className="font-belleza text-2xl md:text-3xl text-black">
                      IDR{Number(productDeal.harga_diskon).toLocaleString('id-ID')}
                    </p>
                    <p className="font-belleza text-lg md:text-xl text-gray-500 line-through">
                      IDR{Number(product?.harga || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                ) : (
                  <p className="font-belleza text-2xl md:text-3xl text-black">
                    IDR{Number(product?.harga || 0).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              
              {/* Shipping Info */}
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600 font-belleza">(Belum termasuk ongkir)</p>
                <p className="text-sm text-gray-700 font-belleza">
                  Dikirim dalam 1 hari setelah pemesanan
                </p>
              </div>

              {/* Color Selection - Using sizes as colors for demo */}
              <p className="font-belleza text-sm text-gray-700 mt-6">{product?.deskripsi ?? 'Produk ini dirancang dengan material premium untuk kenyamanan sepanjang hari.'}</p>

              {/* Size Selection */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-belleza text-sm text-black">
                    Ukuran: <span className="font-semibold">Pilih Ukuran:</span>
                  </p>
                  <button className="text-sm text-gray-600 underline hover:text-black transition font-belleza" type="button" onClick={() => setIsSizeGuideOpen(true)}>
                    Panduan Ukuran
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {sizes.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedSize(n)}
                      className={`px-5 py-2.5 text-sm border transition ${
                        selectedSize === n
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 text-black hover:border-black'
                      }`}
                      aria-pressed={selectedSize === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add to Cart Button - Full Width */}
              <div className="mt-6">
                <button
                  className="w-full py-4 bg-[#2d2d2d] text-white font-semibold text-sm tracking-wider uppercase hover:bg-black transition disabled:opacity-60 disabled:cursor-not-allowed font-belleza"
                  onClick={handleAddToCart}
                  disabled={!selectedSize || !product || isLoading || addingCart}
                >
                  {addingCart ? 'MENAMBAHKAN...' : 'TAMBAHKAN KE KERANJANG'}
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="mt-4 flex items-center gap-6">
                <button
                  className="flex items-center gap-2 text-sm text-black hover:opacity-70 transition font-belleza"
                  onClick={async () => {
                    if (!user) {
                      router.push(`/login?redirect=/produk/${id}/detail`);
                      return;
                    }
                    if (!product) return;
                    try {
                      const result = await toggleFavorite(product.id);
                      if (result?.success) {
                        showNotification(
                          result.action === 'added'
                            ? 'Produk berhasil ditambahkan ke favorit!'
                            : 'Produk dihapus dari favorit',
                          'success'
                        );
                      } else {
                        showNotification(result?.message || 'Gagal mengupdate favorit', 'error');
                      }
                    } catch (e) {
                      console.error('Gagal mengupdate favorit', e);
                      showNotification('Gagal mengupdate favorit', 'error');
                    }
                  }}
                >
                  <svg className={`w-5 h-5 ${isFavorite(product?.id ?? '') ? 'text-red-600' : 'text-black'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="1.5" fill={isFavorite(product?.id ?? '') ? 'currentColor' : 'none'}/>
                  </svg>
                  <span>Tambahkan ke Wishlist</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-black hover:opacity-70 transition font-belleza">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span>Dikirim dari kota tasikmalaya</span>
                </button>
              </div>

              {/* Expandable Sections */}
              <div className="mt-8 space-y-3">
                {/* Editor's Note */}
                <div className="border-t border-gray-200 pt-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer list-none"
                    onClick={() => setOpenAccordion(openAccordion === 'editor' ? null : 'editor')}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-gray-500 text-base font-bold transition-transform ${openAccordion === 'editor' ? 'rotate-90' : ''}`}>&gt;</span>
                      <span className="font-cormorant text-base text-black">Editor's Note</span>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${openAccordion === 'editor' ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {openAccordion === 'editor' && (
                    <div className="mt-3 text-sm text-gray-700 font-belleza leading-relaxed">
                      <p>Produk ini dirancang dengan detail yang sempurna untuk memberikan kenyamanan maksimal sepanjang hari.</p>
                    </div>
                  )}
                </div>

                {/* Detail Produk */}
                <div className="border-t border-gray-200 pt-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer list-none"
                    onClick={() => setOpenAccordion(openAccordion === 'detail' ? null : 'detail')}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-gray-500 text-base font-bold transition-transform ${openAccordion === 'detail' ? 'rotate-90' : ''}`}>&gt;</span>
                      <span className="font-cormorant text-base text-black">Detail Produk</span>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${openAccordion === 'detail' ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {openAccordion === 'detail' && (
                    <div className="mt-3 text-sm text-gray-700 font-belleza leading-relaxed space-y-2">
                      <p className="whitespace-pre-line">{product?.deskripsi ?? '-'}</p>
                      <p className="mt-2"><strong>Kategori:</strong> {product?.kategori ?? '-'}</p>
                      <p><strong>Nomor produk:</strong> {shortId}</p>
                      <p><strong>Stok tersedia:</strong> {product?.stok ?? 0}</p>
                    </div>
                  )}
                </div>

                {/* Pengiriman & pengembalian */}
                <div className="border-t border-gray-200 pt-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer list-none"
                    onClick={() => setOpenAccordion(openAccordion === 'shipping' ? null : 'shipping')}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-gray-500 text-base font-bold transition-transform ${openAccordion === 'shipping' ? 'rotate-90' : ''}`}>&gt;</span>
                      <span className="font-cormorant text-base text-black">Pengiriman & pengembalian</span>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${openAccordion === 'shipping' ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {openAccordion === 'shipping' && (
                    <div className="mt-3 text-sm text-gray-700 font-belleza leading-relaxed">
                      <p>Pengiriman gratis untuk pembelian di atas IDR 500,000. Produk dapat dikembalikan dalam 14 hari setelah pembelian.</p>
                    </div>
                  )}
                </div>

                {/* Ukuran & Kesesuaian */}
                <div className="border-t border-b border-gray-200 pt-3 pb-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer list-none"
                    onClick={() => setOpenAccordion(openAccordion === 'sizing' ? null : 'sizing')}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-gray-500 text-base font-bold transition-transform ${openAccordion === 'sizing' ? 'rotate-90' : ''}`}>&gt;</span>
                      <span className="font-cormorant text-base text-black">Ukuran & Kesesuaian</span>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${openAccordion === 'sizing' ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {openAccordion === 'sizing' && (
                    <div className="mt-3 text-sm text-gray-700 font-belleza leading-relaxed">
                      <p>Model ini mengikuti ukuran standar. Kami menyarankan untuk memilih ukuran normal Anda.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: ANDA MUNGKIN JUGA MENYUKAI */}
      {relatedProducts.length > 0 && (
        <section className="bg-white py-12 md:py-16 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            {/* Section Title */}
            <h2 className="font-cormorant text-xl md:text-2xl text-center text-black mb-10 tracking-wide uppercase">
              ANDA MUNGKIN JUGA MENYUKAI
            </h2>

            {/* Carousel Container */}
            <div className="relative px-12 sm:px-14 md:px-16 lg:px-20">
              {/* Navigation Arrows */}
              {relatedProducts.length > 5 && (
                <>
                  <button
                    onClick={() => setCarouselIndex((i) => {
                      const max = Math.max(0, relatedProducts.length - 5);
                      return i <= 0 ? max : i - 1;
                    })}
                    className="absolute left-0 top-[42%] sm:top-[40%] md:top-[38%] lg:top-[36%] -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/30 backdrop-blur flex items-center justify-center hover:bg-black md:hover:scale-105 md:active:scale-95 transition"
                    aria-label="Sebelumnya"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setCarouselIndex((i) => {
                      const max = Math.max(0, relatedProducts.length - 5);
                      return i >= max ? 0 : i + 1;
                    })}
                    className="absolute right-0 top-[42%] sm:top-[40%] md:top-[38%] lg:top-[36%] -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/30 backdrop-blur flex items-center justify-center hover:bg-black md:hover:scale-105 md:active:scale-95 transition"
                    aria-label="Berikutnya"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </>
              )}

              {/* Products Grid */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out gap-4 md:gap-6"
                  style={{ transform: `translateX(-${carouselIndex * (100 / 5)}%)` }}
                >
                  {relatedProducts.map((prod: any) => (
                    <Link
                      key={prod.id}
                      href={`/produk/${prod.id}/detail`}
                      className="flex-shrink-0 w-[calc(50%-8px)] sm:w-[calc(33.333%-16px)] md:w-[calc(20%-19.2px)] group"
                    >
                      {/* Product Image */}
                      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden mb-3">
                        {prod.photo1 ? (
                          <Image
                            src={prod.photo1}
                            alt={prod.nama_produk}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                            className="object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-cormorant text-sm md:text-base text-black mb-1 line-clamp-2 group-hover:underline">
                        {prod.nama_produk}
                      </h3>

                      {/* Product Price */}
                      <p className="font-belleza text-sm md:text-base text-black font-semibold">
                        IDR{Number(prod.harga || 0).toLocaleString('id-ID')}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pagination Dots */}
              {relatedProducts.length > 5 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: Math.ceil(relatedProducts.length / 5) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        Math.floor(carouselIndex / 1) === i
                          ? 'bg-black w-6'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
                  <div className="mt-1 text-[9px] tracking-[0.3em] uppercase text-gray-600 font-belleza">Footwear</div>
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
      {notification.show && (
        <div className="fixed top-20 right-6 z-[100] animate-slide-in-right">
          <div className={`flex items-center gap-3 rounded-lg shadow-lg px-4 py-3 min-w-[300px] ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {notification.type === 'success' ? (
              <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className={`font-belleza text-sm ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
              className={`ml-auto flex-shrink-0 ${notification.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </main>
    )
  )
}
