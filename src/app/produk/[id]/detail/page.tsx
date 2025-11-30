"use client";
import Image from 'next/image'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import FloatingChat from '@/components/FloatingChat'
import { useEffect, useMemo, useState } from 'react'
import { keranjangDb, produkDb, homepageSection2DealsDb } from '@/lib/database'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { useProductCache } from '@/lib/ProductCacheContext'
import { DealsCacheProvider, useDealsCache } from '@/lib/DealsCacheContext'
import type { Produk } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useParams, useRouter } from 'next/navigation'
import { useChatContext } from '@/lib/chat-context'

function ProductDetailPageContent() {
  const params = useParams<{ id: string }>()
  // Convert UUID without dashes back to standard UUID format
  const rawId = params.id
  const id = rawId.length === 32 && !rawId.includes('-')
    ? `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`
    : rawId
  const { getProductById, products: allCachedProducts, isCacheReady } = useProductCache()
  const [product, setProduct] = useState<Produk | null>(null)
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const { openChat } = useChatContext()
  const sizes = useMemo(() => (
    [product?.size1, product?.size2, product?.size3, product?.size4, product?.size5].filter(Boolean) as string[]
  ), [product])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [qty, setQty] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<'desc' | 'info'>('desc')
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const { items: cartHookItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, isFavorite, count: favoritesCount } = useFavorites()
  const { deals: allDeals } = useDealsCache()
  const [productLoading, setProductLoading] = useState<boolean>(true)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [carouselIndex, setCarouselIndex] = useState<number>(0)
  const [productDeal, setProductDeal] = useState<any>(null)
  const [showTopBar, setShowTopBar] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showMobileAccountMenu, setShowMobileAccountMenu] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Handle mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when mobile sidebar dropdown is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen])

  // Handle search
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

  // Helper function to format product URL without dashes
  const formatProductUrl = (productId: string) => {
    return `/produk/${productId.replace(/-/g, '')}/detail`;
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
  // State untuk deteksi mobile
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Galeri berdasarkan photo1-3 untuk desktop, photo1,photo3,preview_photo untuk mobile
  const images = isMobile
    ? [product?.photo1, product?.photo3, product?.preview_photo].filter(Boolean) as string[]
    : [product?.photo1, product?.photo3, product?.photo2].filter(Boolean) as string[]

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
    try {
      if (!user) {
        if (isLoading) return
        router.push(`/login?redirect=/produk/${id}/detail`)
        return
      }
      if (!product || addingCart) return
      setAddingCart(true)

      await keranjangDb.addItem(user.id, product.id, qty, selectedSize ?? undefined)

      // Refresh cart data
      await refresh()

      // Show success notification
      showNotification('Produk berhasil ditambahkan ke keranjang!', 'success')

      // Open cart sidebar after adding item
      setTimeout(() => {
        window.dispatchEvent(new Event('openCartSidebar'))
      }, 300)
    } catch (e) {
      console.error('Gagal menambahkan ke keranjang', e)
      showNotification('Gagal menambahkan ke keranjang', 'error')
    } finally {
      setAddingCart(false)
    }
  }

  // Close size guide
  const handleCloseSizeGuideSidebar = () => {
    setIsSizeGuideOpen(false)
  }

  return (
    productLoading ? (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : (
    <main>
      {/* Top black bar - Same as user/purchase */}
      <div className="fixed top-0 left-0 right-0 w-full bg-black h-8 md:h-10 z-[59]">
        <div className="w-full max-w-[1160px] mx-auto h-full flex items-center justify-between px-6 md:px-8 lg:px-10">
          <p className="font-belleza text-white text-xs md:text-sm overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-typing">
              <span className="font-bold">Dapatkan potongan diskon dan pengiriman</span> - <span
                className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => {
                  router.push('/#voucher-section');
                }}
              >cek disini</span>
            </span>
          </p>
          <style jsx>{`
            @keyframes typing {
              0% {
                width: 0;
              }
              30.4% {
                width: 100%;
              }
              100% {
                width: 100%;
              }
            }

            @keyframes wipeOut {
              0%, 91.3% {
                width: 0;
              }
              100% {
                width: 100%;
              }
            }

            .animate-typing {
              overflow: hidden;
              white-space: nowrap;
              animation: typing 11.5s steps(55, end) infinite;
              display: inline-block;
              max-width: fit-content;
              position: relative;
            }

            .animate-typing::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              height: 100%;
              width: 0;
              background-color: black;
              animation: wipeOut 11.5s ease-out infinite;
            }
          `}</style>

          {/* Top Menu Links - Desktop Only */}
          <div className="hidden md:flex items-center gap-3 md:gap-4">
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  router.push('/user/purchase?pesanan-saya=all');
                }
              }}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              LACAK PESANAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  router.push('/user/purchase?view=notifications');
                }
              }}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              NOTIFIKASI
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button onClick={openChat} className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer">
              FAQ & BANTUAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect width="20" height="7" fill="#FF0000"/>
              <rect y="7" width="20" height="7" fill="#FFFFFF"/>
            </svg>
          </div>

          {/* Indonesian Flag - Mobile Only */}
          <div className="md:hidden flex items-center">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect width="20" height="7" fill="#FF0000"/>
              <rect y="7" width="20" height="7" fill="#FFFFFF"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Header component - Same as homepage */}
      <Header variant="docs" topBarVisible={true} />

      {/* Mobile Header (only visible on mobile) */}
      <div className="md:hidden fixed top-8 left-0 right-0 z-[60] bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Animated Hamburger Menu */}
          <button
            type="button"
            aria-label={isMobileSidebarOpen ? "Tutup menu" : "Buka menu"}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative w-10 h-10 flex items-center justify-center"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-center items-center">
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'rotate-45 translate-y-[3px]' : 'mb-1'}`}></span>
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100 mb-1'}`}></span>
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? '-rotate-45 -translate-y-[3px]' : ''}`}></span>
            </div>
          </button>

          {/* Right: 4 Icons */}
          <div className="flex items-center gap-2">
            {/* Search Icon */}
            <button
              type="button"
              aria-label="Cari"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsSearchOpen(true)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Voucher Icon */}
            <button
              type="button"
              aria-label="Voucher"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => window.dispatchEvent(new Event('openVoucherSidebar'))}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Favorite Icon */}
            <button
              type="button"
              aria-label="Favorit"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => window.dispatchEvent(new Event('openFavoriteSidebar'))}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart Icon */}
            <button
              type="button"
              aria-label="Keranjang"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => window.dispatchEvent(new Event('openCartSidebar'))}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: breadcrumb & title */}
      <section className="relative overflow-hidden bg-transparent pt-[84px] md:pt-[130px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10 py-12 md:py-16 flex flex-col items-center justify-center">
          <h1 className="font-cormorant text-2xl md:text-3xl text-gray-100">Produk</h1>
          <div className="mt-3 font-belleza text-sm text-gray-100">
            <span className="text-gray-100">Produk</span>
            <span className="mx-1">&gt;</span>
            <span className="uppercase">{shortId}</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Detail</span>
          </div>
        </div>
      </section>
      {/* Section 3: main product content */}
      <section className="bg-white py-10 md:py-14">
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
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
              <div className="relative w-full aspect-square border border-gray-200 bg-white overflow-hidden order-1 lg:order-2">
                {/* Discount percentage badge - rectangular design for product detail page */}
                {productDeal?.harga_diskon && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded shadow-lg z-10">
                    -{Math.round(((Number(product?.harga || 0) - Number(productDeal.harga_diskon)) / Number(product?.harga || 0)) * 100)}%
                  </div>
                )}
                {gallery.length > 0 ? (
                  <div className="relative w-full h-full">
                    {gallery.map((src, i) => {
                      // On mobile, photo1 & photo3 use object-contain, preview_photo uses object-cover
                      // On desktop, photo1 & photo3 use object-contain, photo2 uses object-cover
                      const isPhoto2 = src === product?.photo2;
                      const isPreviewPhoto = src === product?.preview_photo;
                      const useObjectCover = isMobile ? isPreviewPhoto : isPhoto2;

                      return (
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
                            className={`select-none ${useObjectCover ? 'object-cover' : 'object-contain'}`}
                          />
                        </div>
                      );
                    })}
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
                      <p>
                        Dapatkan diskon pengiriman{' '}
                        <Link href="/home" className="text-black font-semibold underline hover:text-gray-800 transition-colors">
                          disini
                        </Link>
                        {' '}dan anda dapat melakukan pengembalian maksimal 2 hari setelah barang diterima.
                      </p>
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
          <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
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
                  {relatedProducts.map((prod: any) => {
                    // Check if product has flash sale deal - sekarang menggunakan data dari DealsCacheContext
                    const deal = allDeals.find((d: any) => d.produk_id === prod.id)
                    const hasDiscount = !!deal

                    return (
                      <Link
                        key={prod.id}
                        href={`/produk/${prod.id.replace(/-/g, '')}/detail`}
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
                          {/* Discount Badge */}
                          {hasDiscount && deal.discountPercentage && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
                              -{deal.discountPercentage}%
                            </div>
                          )}
                        </div>

                        {/* Product Name */}
                        <h3 className="font-cormorant text-sm md:text-base text-black mb-1 line-clamp-2 group-hover:underline">
                          {prod.nama_produk}
                        </h3>

                        {/* Product Price */}
                        {hasDiscount && deal.new ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="font-belleza text-xs text-gray-500 line-through">
                              {deal.old}
                            </p>
                            <p className="font-belleza text-sm md:text-base text-red-600 font-bold">
                              {deal.new}
                            </p>
                          </div>
                        ) : (
                          <p className="font-belleza text-sm md:text-base text-black font-semibold">
                            Rp {Number(prod.harga || 0).toLocaleString('id-ID')}
                          </p>
                        )}
                      </Link>
                    )
                  })}
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
      <footer className="bg-black py-6 md:py-16 mt-auto">
        <div className="w-full flex justify-center md:justify-end">
          <div className="w-full max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
            {/* Mobile: Black Background Layout */}
            <div className="grid grid-cols-1 md:hidden gap-4">
              {/* Brand + contact */}
              <div className="space-y-3">
                <div className="-ml-1">
                  <Image
                    src="/logo/logo2.png"
                    alt="MEORIS"
                    width={120}
                    height={40}
                    className="object-contain brightness-0 invert"
                  />
                </div>
                <ul className="space-y-2 font-belleza text-gray-300">
                  <li className="grid grid-cols-[20px_1fr] items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                    <span className="text-xs leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                    <span className="text-xs">+6289695971729</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-xs">info@meoris.id</span>
                  </li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-white whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-white"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-300 text-xs">
                  <li><a href="#" className="hover:underline hover:text-white cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan & Hubungi Kami</a></li>
                  <li><a href="/terms-condition" className="hover:underline hover:text-white">Syarat & Ketentuan</a></li>
                  <li><a href="/privacy-policy" className="hover:underline hover:text-white">Kebijakan Privasi</a></li>
                </ul>
              </div>

              {/* My Account */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-white whitespace-nowrap">Akun Saya</h4>
                <div className="mt-1 w-10 h-[2px] bg-white"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-300 text-xs">
                  <li><Link href="/user/purchase?view=profile" className="hover:underline hover:text-white">Detail Akun</Link></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openCartSidebar')); }}>Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openFavoriteSidebar')); }}>Favorit</a></li>
                  <li><Link href="/produk/pesanan" className="hover:underline hover:text-white">Pesanan</Link></li>
                </ul>
              </div>
            </div>

            {/* Desktop/Tablet redesigned footer */}
            <div className="hidden md:block">
              <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-12">
                {/* Brand + social */}
                <div className="space-y-5 lg:col-span-1">
                  <div className="ml-0 md:-ml-2">
                    <Image
                      src="/logo/logo2.png"
                      alt="MEORIS"
                      width={150}
                      height={50}
                      className="object-contain brightness-0 invert"
                    />
                  </div>
                  <p className="font-belleza text-white text-sm max-w-xs">
                    Sandal berkualitas dengan desain elegan dan nyaman dipakai setiap hari.
                  </p>
                </div>

                {/* Belanja */}
                <div className="pb-3 md:pb-4">
                  <h4 className="font-cormorant text-xl text-white">Belanja</h4>
                  <div className="mt-2 w-10 h-[2px] bg-white"></div>
                  <ul className="mt-4 space-y-3 font-belleza text-white">
                    <li><Link href="/produk" className="hover:opacity-80">Semua Produk</Link></li>
                  </ul>
                </div>

                {/* Bantuan & Layanan */}
                <div className="pb-3 md:pb-4">
                  <h4 className="font-cormorant text-xl text-white">Bantuan &amp; Layanan</h4>
                  <div className="mt-2 w-10 h-[2px] bg-white"></div>
                  <ul className="mt-4 space-y-3 font-belleza text-white">
                    <li><a href="#" className="hover:opacity-80 cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan &amp; Hubungi Kami</a></li>
                    <li><Link href="/terms-condition" className="hover:opacity-80">Syarat &amp; Ketentuan</Link></li>
                    <li><Link href="/privacy-policy" className="hover:opacity-80">Kebijakan Privasi</Link></li>
                  </ul>
                </div>

                {/* Akun Saya */}
                <div className="pb-3 md:pb-4">
                  <h4 className="font-cormorant text-xl text-white">Akun Saya</h4>
                  <div className="mt-2 w-10 h-[2px] bg-white"></div>
                  <ul className="mt-4 space-y-3 font-belleza text-white">
                    <li><Link href="/user/purchase?view=profile" className="hover:opacity-80">Detail Akun</Link></li>
                    <li><a href="#" aria-label="Buka keranjang" className="hover:opacity-80 cursor-pointer" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openCartSidebar')); }}>Keranjang</a></li>
                    <li><a href="#" aria-label="Buka favorit" className="hover:opacity-80 cursor-pointer" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openFavoriteSidebar')); }}>Favorit</a></li>
                    <li><Link href="/produk/pesanan" className="hover:opacity-80">Pesanan</Link></li>
                  </ul>
                </div>

                {/* Kontak (alamat + telepon + email) */}
                <div className="pb-3 md:pb-4">
                  <h4 className="font-cormorant text-xl text-white">Kontak</h4>
                  <div className="mt-2 w-10 h-[2px] bg-white"></div>
                  <ul className="mt-4 space-y-3 font-belleza text-white">
                    <li className="grid grid-cols-[28px_1fr] items-start gap-3">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                      <span className="text-sm leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                    </li>
                    <li className="grid grid-cols-[28px_1fr] items-center gap-3">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                      <span>+6289695971729</span>
                    </li>
                    <li className="grid grid-cols-[28px_1fr] items-center gap-3">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span>info@meoris.id</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom bar (desktop only) */}
              <div className="mt-10 border-t border-white/30 pt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-white/80 text-sm">
                <p className="font-belleza">&copy; {new Date().getFullYear()} MEORIS. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {/* Mobile Dropdown Menu Navigation */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[58] bg-black/30 transition-opacity duration-200 ease-out animate-fadeIn"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown Panel - Full Width & Height */}
          <div className="md:hidden fixed top-[88px] left-0 right-0 bottom-0 z-[59] bg-white shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out animate-slideDown">
            {/* User Profile Card - Compact */}
            {user && (
              <div className="px-4 pt-5 pb-3 bg-white">
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {mounted && user ? ((user as any)?.nama || user.email) : 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu - Vertical List */}
            <nav className="py-2">
              <ul className="font-belleza">
                <li className="animate-menu-item">
                  <Link
                    href="/home"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Home</span>
                  </Link>
                </li>

                <li className="animate-menu-item">
                  <Link
                    href="/produk"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Produk</span>
                  </Link>
                </li>

                <li className="animate-menu-item">
                  <Link
                    href="/user/purchase?view=purchase"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Pesanan</span>
                  </Link>
                </li>

                {/* Divider */}
                <li className="my-2 animate-menu-item">
                  <div className="border-t border-gray-200"></div>
                </li>

                {/* Informasi Akun with Submenu */}
                {user ? (
                  <>
                    <li className="animate-menu-item">
                      <button
                        onClick={() => setShowMobileAccountMenu(!showMobileAccountMenu)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-sm font-medium">Informasi Akun</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-gray-400 transition-transform duration-200 ${showMobileAccountMenu ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Submenu */}
                      {showMobileAccountMenu && (
                        <ul className="bg-gray-50 py-1">
                          <li>
                            <Link
                              href="/user/purchase?view=profile"
                              onClick={() => setIsMobileSidebarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 pl-14 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors duration-200"
                            >
                              <span className="text-sm">Informasi Akun</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/user/purchase?view=address"
                              onClick={() => setIsMobileSidebarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 pl-14 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors duration-200"
                            >
                              <span className="text-sm">Alamat</span>
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>

                    {/* Logout Button */}
                    <li className="animate-menu-item">
                      <button
                        onClick={() => {
                          logout();
                          setIsMobileSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors duration-200"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </li>
                  </>
                ) : (
                  <li className="animate-menu-item">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 bg-black hover:bg-gray-900 text-white transition-colors duration-200 mx-4 my-2 rounded-lg justify-center"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm font-medium">Login</span>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </>
      )}

      {/* Size Guide Sidebar */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={() => setIsSizeGuideOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col transform transition-transform duration-500 ease-out animate-slideInRight overflow-y-auto">
            <button type="button" aria-label="Tutup panduan ukuran" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110" onClick={() => setIsSizeGuideOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between mb-6">
              <span className="font-cormorant text-xl md:text-2xl text-black">Panduan Ukuran</span>
            </div>

            <div className="space-y-6">
              {/* Size Guide Table */}
              <div>
                <h3 className="font-belleza font-semibold text-black mb-3">Tabel Ukuran Sepatu</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-sm font-belleza">Ukuran</th>
                        <th className="border border-gray-300 px-4 py-2 text-sm font-belleza">CM</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">38</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">24</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">39</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">24.5</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">40</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">25</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">41</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">26</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">42</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">27</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">43</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">27.5</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">44</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">28</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">45</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-center">29</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* How to Measure */}
              <div>
                <h3 className="font-belleza font-semibold text-black mb-3">Cara Mengukur Kaki</h3>
                <ol className="space-y-2 text-sm text-gray-700 font-belleza list-decimal list-inside">
                  <li>Letakkan kaki Anda di atas selembar kertas</li>
                  <li>Tandai ujung jari kaki terpanjang dan tumit</li>
                  <li>Ukur jarak antara kedua tanda (dalam cm)</li>
                  <li>Tambahkan 0.5-1 cm untuk kenyamanan</li>
                  <li>Cocokkan dengan tabel ukuran di atas</li>
                </ol>
              </div>

              {/* Tips */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-belleza font-semibold text-black mb-2">Tips Memilih Ukuran</h3>
                <ul className="space-y-1 text-sm text-gray-700 font-belleza list-disc list-inside">
                  <li>Ukur kaki di sore hari (kaki sedikit membengkak)</li>
                  <li>Jika ragu, pilih ukuran yang lebih besar</li>
                  <li>Pertimbangkan jenis kaus kaki yang akan digunakan</li>
                  <li>Untuk sepatu formal, ukuran bisa lebih pas</li>
                  <li>Untuk sepatu olahraga, beri ruang ekstra 0.5-1 cm</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Search Sidebar */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={() => setIsSearchOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col transform transition-transform duration-500 ease-out animate-slideInRight">
            <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110" onClick={() => setIsSearchOpen(false)}>
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
                    <Link key={product.id} href={formatProductUrl(product.id)} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer">
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
      <FloatingChat />
    </main>
    )
  )
}

export default function ProductDetailPage() {
  return (
    <DealsCacheProvider>
      <ProductDetailPageContent />
    </DealsCacheProvider>
  );
}
