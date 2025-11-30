"use client";
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import Header from '@/components/layout/Header'
import FloatingChat from '@/components/FloatingChat'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, voucherDb, praCheckoutDb, produkDb, userDb } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export default function CartDetailPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [isVoucherOpen, setIsVoucherOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removingFavId, setRemovingFavId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null)
  const [voucherError, setVoucherError] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const { items: cartItems, count: cartCount, loading: cartLoading, removeItem: removeCartItem } = useCart()
  const [initialCartLoaded, setInitialCartLoaded] = useState(false)
  const [cartReadyToRenderEmpty, setCartReadyToRenderEmpty] = useState(false)
  const { favorites, loading: favoritesLoading, toggleFavorite, removeFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [splash, setSplash] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showTopBar, setShowTopBar] = useState(true)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [selectedLang, setSelectedLang] = useState('Indonesia')
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [userVouchers, setUserVouchers] = useState<any[]>([])
  const [vouchersLoading, setVouchersLoading] = useState(false)
  const [voucherCount, setVoucherCount] = useState(0)

  // Short splash on first paint to avoid layout jank
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  // Ensure initial client render matches SSR markup (null under Suspense)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle scroll to hide/show top bar
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (currentScrollY > 100 && currentScrollY > lastScrollY) {
            setShowTopBar(false);
          } else if (currentScrollY <= 80) {
            setShowTopBar(true);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Tutup sidebar voucher
  const handleCloseVoucherSidebar = () => {
    setIsVoucherOpen(false);
  };

  // Load voucher count on mount (for badge display)
  useEffect(() => {
    const loadVoucherCount = async () => {
      if (!user) return;

      try {
        const { data: userVouchersData, error: userVouchersError } = await supabase
          .from('user_vouchers')
          .select('voucher_id')
          .eq('user_id', user.id)
          .eq('used', false);

        if (userVouchersError) {
          console.error('Error loading voucher count:', userVouchersError);
          setVoucherCount(0);
          return;
        }

        if (!userVouchersData || userVouchersData.length === 0) {
          setVoucherCount(0);
          return;
        }

        // Get voucher details untuk filter expired
        const voucherIds = userVouchersData.map((uv: any) => uv.voucher_id);
        const { data: vouchersData, error: vouchersError } = await supabase
          .from('voucher')
          .select('id, expired, voucher')
          .in('id', voucherIds);

        if (vouchersError || !vouchersData) {
          setVoucherCount(userVouchersData.length);
          return;
        }

        // Get used vouchers to exclude via API route (bypasses RLS)
        let usedVoucherCodes = new Set<string>();

        try {
          const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);

          if (response.ok) {
            const result = await response.json();
            usedVoucherCodes = new Set(result.voucher_codes || []);
          }
        } catch (apiError) {
          console.error('Exception calling API:', apiError);
        }

        // Filter yang belum expired dan belum digunakan
        const now = new Date();
        const validCount = vouchersData.filter((v: any) => {
          if (v.expired && new Date(v.expired) < now) return false;
          if (v.voucher && usedVoucherCodes.has(v.voucher)) return false;
          return true;
        }).length;

        setVoucherCount(validCount);
      } catch (error) {
        console.error('Exception loading voucher count:', error);
        setVoucherCount(0);
      }
    };

    loadVoucherCount();
  }, [user]);

  // Load full voucher details when sidebar opens
  useEffect(() => {
    const loadVouchers = async () => {
      if (!isVoucherOpen || !user) {
        return;
      }

      setVouchersLoading(true);

      try {
        const { data: userVouchersData, error: userVouchersError } = await supabase
          .from('user_vouchers')
          .select('*')
          .eq('user_id', user.id)
          .eq('used', false)
          .order('claimed_at', { ascending: false });

        if (userVouchersError) {
          console.error('Error loading user vouchers:', userVouchersError);
          setUserVouchers([]);
          setVouchersLoading(false);
          return;
        }

        if (!userVouchersData || userVouchersData.length === 0) {
          setUserVouchers([]);
          setVouchersLoading(false);
          return;
        }

        const voucherIds = userVouchersData.map((uv: any) => uv.voucher_id);

        const { data: vouchersData, error: vouchersError } = await supabase
          .from('voucher')
          .select('*')
          .in('id', voucherIds);

        if (vouchersError) {
          console.error('Error loading voucher details:', vouchersError);
          setUserVouchers([]);
          setVouchersLoading(false);
          return;
        }

        // Get used vouchers to exclude via API route
        let usedVoucherCodes = new Set<string>();

        try {
          const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);

          if (response.ok) {
            const result = await response.json();
            usedVoucherCodes = new Set(result.voucher_codes || []);
          }
        } catch (apiError) {
          console.error('Exception calling API:', apiError);
        }

        // Combine user_vouchers with voucher details
        const vouchersMap = new Map(vouchersData?.map((v: any) => [v.id, v]) || []);
        const combinedData = userVouchersData.map((uv: any) => ({
          ...uv,
          voucher: vouchersMap.get(uv.voucher_id)
        }));

        // Filter voucher yang masih valid
        const now = new Date();
        const validVouchers = combinedData.filter((uv: any) => {
          const voucherCode = uv.voucher?.voucher;
          const isExpired = uv.voucher?.expired && new Date(uv.voucher.expired) < now;
          const isUsed = voucherCode && usedVoucherCodes.has(voucherCode);

          if (isExpired) return false;
          if (isUsed) return false;
          return true;
        });

        setUserVouchers(validVouchers);
        setVoucherCount(validVouchers.length);
      } catch (error) {
        console.error('Exception loading vouchers:', error);
        setUserVouchers([]);
      } finally {
        setVouchersLoading(false);
      }
    };

    loadVouchers();
  }, [isVoucherOpen, user]);

  // Sinkronkan tampilan lokal dengan data hook agar bisa optimistik tanpa flicker
  useEffect(() => {
    setViewItems(cartItems || [])
  }, [cartItems])

  // Validasi ulang voucher setiap kali viewItems berubah (REALTIME)
  useEffect(() => {
    // Jika keranjang kosong, reset semua voucher
    if (viewItems.length === 0) {
      setAppliedVoucher(null)
      setVoucherCode('')
      setVoucherError('')
      return
    }

    if (appliedVoucher && viewItems.length > 0) {
      const totalProductsInCart = viewItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
      const minimalPembelian = Number(appliedVoucher.minimal_pembelian) || 1

      if (totalProductsInCart < minimalPembelian) {
        // Reset voucher jika tidak memenuhi syarat
        setAppliedVoucher(null)
        setVoucherCode('')
        setVoucherError(`Voucher ini hanya dapat digunakan untuk minimal ${minimalPembelian} produk pembelian`)
      }
    }
  }, [viewItems, appliedVoucher])

  // Listen for voucher apply event from sidebar
  useEffect(() => {
    const handleApplyVoucherFromSidebar = (event: any) => {
      const voucher = event.detail;

      if (!voucher) return;

      // Validate minimal pembelian
      const totalProductsInCart = viewItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
      const minimalPembelian = Number(voucher.minimal_pembelian) || 1

      if (totalProductsInCart < minimalPembelian) {
        setVoucherError(`Voucher ini hanya dapat digunakan untuk minimal ${minimalPembelian} produk pembelian`)
        setAppliedVoucher(null)
        setVoucherCode('')
      } else {
        // Apply voucher
        setAppliedVoucher(voucher)
        setVoucherCode(voucher.voucher || '')
        setVoucherError('')
      }
    };

    window.addEventListener('applyVoucherFromSidebar', handleApplyVoucherFromSidebar);
    return () => {
      window.removeEventListener('applyVoucherFromSidebar', handleApplyVoucherFromSidebar);
    };
  }, [viewItems])

  // Tandai selesai loading awal agar teks "Memuat keranjang..." tidak muncul terus-menerus
  useEffect(() => {
    if (!cartLoading) setInitialCartLoaded(true)
  }, [cartLoading])
  // Debounce rendering empty state to avoid flashing empty before first data
  useEffect(() => {
    if (!cartLoading) {
      const t = setTimeout(() => setCartReadyToRenderEmpty(true), 250)
      return () => clearTimeout(t)
    } else {
      setCartReadyToRenderEmpty(false)
    }
  }, [cartLoading])

  // cartItems are managed automatically by useCart hook, no manual refresh needed

  const handleRemoveCartItem = async (itemId: string) => {
    // Set removing state for animation
    setRemovingId(itemId)

    // Wait for slide animation to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    // Remove item using optimistic update from hook
    await removeCartItem(itemId)

    // Clear removing state
    setRemovingId(null)
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    // Set removing state for animation
    setRemovingFavId(favoriteId)

    // Wait for slide animation to complete
    await new Promise(resolve => setTimeout(resolve, 300))

    // Remove item using optimistic update from hook
    await removeFavorite(favoriteId)

    // Clear removing state
    setRemovingFavId(null)
  }

  // Search handlers (functional search sidebar)
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

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Masukkan kode voucher')
      return
    }

    setVoucherLoading(true)
    setVoucherError('')

    try {
      const voucher = await voucherDb.validateVoucher(voucherCode.trim())

      if (voucher) {
        // Validasi minimal pembelian
        const totalProductsInCart = viewItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
        const minimalPembelian = Number(voucher.minimal_pembelian) || 1

        if (totalProductsInCart < minimalPembelian) {
          setVoucherError(`Voucher ini hanya dapat digunakan untuk minimal ${minimalPembelian} produk pembelian`)
          setAppliedVoucher(null)
        } else {
          setAppliedVoucher(voucher)
          setVoucherError('')
        }
      } else {
        setVoucherError('Kode voucher tidak valid atau sudah expired')
        setAppliedVoucher(null)
      }
    } catch (error) {
      console.error('Error validating voucher:', error)
      setVoucherError('Kode voucher tidak valid atau sudah expired')
      setAppliedVoucher(null)
    } finally {
      setVoucherLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!user) {
      alert('Silakan login terlebih dahulu')
      return
    }

    if (viewItems.length === 0) {
      alert('Keranjang kosong')
      return
    }

    // Validasi ulang voucher sebelum checkout
    if (appliedVoucher) {
      const totalProductsInCart = viewItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
      const minimalPembelian = Number(appliedVoucher.minimal_pembelian) || 1

      if (totalProductsInCart < minimalPembelian) {
        alert(`Voucher ini hanya dapat digunakan untuk minimal ${minimalPembelian} produk pembelian`)
        setAppliedVoucher(null)
        setVoucherCode('')
        setVoucherError(`Voucher ini hanya dapat digunakan untuk minimal ${minimalPembelian} produk pembelian`)
        return
      }
    }

    try {
      // Check if user has complete address - updated to check user_addresses table
      // First try to get default address from user_addresses
      const { data: userAddresses } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle()

      // Fallback to any address if no default
      const { data: anyAddress } = !userAddresses ? await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle() : { data: null }

      const addressData = userAddresses || anyAddress

      // If still no address from user_addresses, check old shipping columns in users table
      let hasShippingAddress = addressData &&
                               addressData.street &&
                               addressData.provinsi &&
                               addressData.kabupaten &&
                               addressData.kecamatan

      if (!hasShippingAddress) {
        // Fallback: check old shipping columns in users table for backward compatibility
        const userData = await userDb.getById(user.id)
        hasShippingAddress = userData?.shipping_street &&
                             userData?.shipping_provinsi &&
                             userData?.shipping_kabupaten &&
                             userData?.shipping_kecamatan
      }

      if (!hasShippingAddress) {
        setShowAddressModal(true)
        return
      }

      // Create pra-checkout record
      const result = await praCheckoutDb.create(
        user.id,
        viewItems,
        appliedVoucher?.voucher,
        discount
      )

      console.log('Pra-checkout created:', result)

      // Redirect to checkout page with pra-checkout ID
      window.location.href = `/produk/checkout?pra_checkout_id=${result.praCheckout.id}`
    } catch (error) {
      console.error('Error creating pra-checkout:', error)
      alert('Gagal memproses checkout. Silakan coba lagi.')
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return null
  }

  if (!user) {
    return null // Show nothing while redirecting
  }

  const subtotal = viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0)
  const discount = appliedVoucher ? Number(appliedVoucher.total_potongan || 0) : 0
  const total = Math.max(0, subtotal - discount)

  // Tahan splash hingga loading awal keranjang selesai atau ada item untuk ditampilkan
  const showSplash = mounted && (splash || (((viewItems || []).length === 0) && !cartReadyToRenderEmpty))

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
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[75%] bg-white shadow-2xl transform transition-transform duration-500 ease-out overflow-visible">
            {/* Pull-tab close button on the right edge */}
            <button
              type="button"
              aria-label="Tutup menu"
              className="absolute -right-12 top-6 w-14 h-10 bg-black rounded-r-lg rounded-l-none text-white flex items-center justify-center z-10 shadow-md"
              onClick={() => setIsSidebarOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Content wrapper with overflow */}
            <div className="h-full overflow-y-auto">
            {/* Header dengan User Info */}
            <div className="relative bg-gradient-to-r from-black via-gray-900 to-black p-4 pt-6">
              {/* Brand Logo and Notification */}
              <div className="flex items-start justify-between">
                <div className="mt-2">
                  <span className="font-cormorant text-2xl font-bold text-white tracking-wider">MEORIS</span>
                  <div className="mt-0.5 text-[10px] tracking-[0.3em] uppercase text-gray-300">Footwear</div>
                </div>

                {/* Notification Icon */}
                <button
                  type="button"
                  aria-label="Notifikasi"
                  className="relative p-2 mt-1 rounded-lg hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    window.location.href = '/user/purchase?view=notifications';
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
                </button>
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
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition-all duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="text-gray-600 group-hover:text-black">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="flex-1 text-sm">Home</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/produk"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition-all duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="text-gray-600 group-hover:text-black">
                      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="flex-1 text-sm">Produk</span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/user/purchase?view=purchase"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition-all duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="text-gray-600 group-hover:text-black">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="flex-1 text-sm">Pesanan</span>
                  </Link>
                </li>

                {/* Informasi Akun with Dropdown */}
                <li>
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className="w-full group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-black transition-all duration-200"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="text-gray-600 group-hover:text-black">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="flex-1 text-left text-sm">Informasi Akun</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showAccountMenu && (
                      <div className="mt-1 ml-8 space-y-1">
                        <Link
                          href="/user/purchase?view=profile"
                          onClick={() => setIsSidebarOpen(false)}
                          className="block px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Informasi Akun
                        </Link>
                        <Link
                          href="/user/purchase?view=address"
                          onClick={() => setIsSidebarOpen(false)}
                          className="block px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Alamat
                        </Link>
                        {/* Logout Button */}
                        <button
                          onClick={async () => {
                            try {
                              await logout();
                              setIsSidebarOpen(false);
                              router.push('/');
                            } catch (error) {
                              console.error('Logout error:', error);
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              </ul>
            </nav>
            </div>
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
                <Link href="/produk/checkout" className="inline-flex items-center justify-center rounded-none bg-black px-4 py-2 font-belleza text-sm text-white hover:opacity-90 transition w-full">
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

      {/* Voucher Sidebar */}
      {isVoucherOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={handleCloseVoucherSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 transform transition-transform duration-500 ease-out animate-slideInRight flex flex-col">
            {/* Pull-tab close button on the left edge */}
            <button
              type="button"
              aria-label="Tutup voucher"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110"
              onClick={handleCloseVoucherSidebar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between mb-6">
              <span className="font-cormorant text-xl md:text-2xl text-black">Voucher Saya</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {vouchersLoading ? (
                <p className="text-sm text-gray-600">Memuat voucher...</p>
              ) : !user ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 mb-4">Login untuk melihat voucher Anda</p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-2 bg-black text-white rounded-md hover:opacity-90 transition-opacity text-sm"
                    onClick={handleCloseVoucherSidebar}
                  >
                    Login
                  </Link>
                </div>
              ) : userVouchers.length === 0 ? (
                <div className="text-center py-8">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 text-gray-300">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm text-gray-600 mb-4">Belum ada voucher</p>
                  <Link
                    href="/user/purchase?view=vouchers"
                    className="inline-block px-6 py-2 bg-black text-white rounded-md hover:opacity-90 transition-opacity text-sm"
                    onClick={handleCloseVoucherSidebar}
                  >
                    Klaim Voucher
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {userVouchers.map((userVoucher) => {
                    const voucher = userVoucher.voucher;
                    const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                    const isUsed = userVoucher.used;

                    return (
                      <div
                        key={userVoucher.id}
                        className={`flex border rounded overflow-hidden transition-all ${
                          isUsed || isExpired
                            ? 'border-gray-300 bg-gray-50 opacity-60'
                            : 'border-gray-200 bg-white hover:shadow-md'
                        }`}
                      >
                        {/* Left Icon Section */}
                        <div className={`w-20 flex-shrink-0 flex flex-col items-center justify-center relative py-2 ${
                          isUsed || isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                        }`}>
                          {/* Badge */}
                          {!isUsed && !isExpired && (
                            <div className="absolute top-1 left-0 right-0 text-center">
                              <span className="inline-block px-1.5 py-0.5 bg-yellow-400 text-red-700 text-[8px] font-bold rounded">
                                SPESIAL
                              </span>
                            </div>
                          )}

                          {/* Icon */}
                          <div className="text-white mb-1">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                M
                              </text>
                            </svg>
                          </div>

                          {/* Category Label */}
                          <div className="text-white text-center px-1">
                            <div className="text-[8px] font-bold leading-tight">
                              {voucher.type === 'shipping' ? 'ONGKIR' : 'KOLEKSI'}
                            </div>
                            <div className="text-[8px] font-bold leading-tight">
                              {voucher.type === 'shipping' ? 'GRATIS' : 'PILIHAN'}
                            </div>
                          </div>

                          {/* Decorative circles */}
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                        </div>

                        {/* Right Content Section */}
                        <div className="flex-1 p-2.5 flex flex-col justify-between">
                          <div>
                            {/* Title */}
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1 leading-tight line-clamp-2">
                              {voucher.judul_voucher ||
                                (voucher.type === 'shipping'
                                  ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                  : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                )
                              }
                            </h3>

                            {/* Min Purchase */}
                            <p className="text-[10px] text-gray-600 mb-1">
                              Min.Pembelian {voucher.minimal_pembelian || 1} produk
                            </p>

                            {/* Status Badges */}
                            <div className="flex items-center gap-1 mb-1">
                              {isUsed ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-gray-600 bg-gray-200 rounded">
                                  Sudah Digunakan
                                </span>
                              ) : isExpired ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-white bg-red-600 rounded">
                                  Kadaluarsa
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-red-600 border border-red-600 rounded">
                                  Penawaran terbatas
                                </span>
                              )}
                            </div>

                            {/* Expiry Date */}
                            <p className="text-[10px] text-gray-600">
                              Berlaku: <span className="font-medium">{voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} hari</span>
                            </p>
                          </div>

                          {/* Action Button */}
                          {!isUsed && !isExpired && (
                            <div className="mt-1.5 flex justify-end">
                              <button
                                onClick={() => {
                                  // Check if we're on the checkout page
                                  const isCheckoutPage = window.location.pathname === '/produk/detail-checkout';

                                  if (isCheckoutPage) {
                                    // Send event with voucher data to checkout page
                                    const event = new CustomEvent('applyVoucherFromSidebar', {
                                      detail: voucher
                                    });
                                    window.dispatchEvent(event);
                                    handleCloseVoucherSidebar();
                                  } else {
                                    // Navigate to products page for other pages
                                    handleCloseVoucherSidebar();
                                    router.push('/produk');
                                  }
                                }}
                                className="px-3 py-1 border-2 border-red-600 text-red-600 text-[11px] font-semibold rounded hover:bg-red-50 transition-colors"
                              >
                                Pakai
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* View All Link */}
            {user && userVouchers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  href="/user/purchase?view=vouchers"
                  className="block text-center py-2 text-sm font-belleza text-black hover:underline"
                  onClick={handleCloseVoucherSidebar}
                >
                  Lihat Semua Voucher
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowAddressModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 transform transition-all duration-300 scale-100 opacity-100">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {/* Content */}
            <h3 className="font-cormorant text-2xl text-center text-black mb-3">Alamat Belum Lengkap</h3>
            <p className="font-belleza text-center text-gray-600 mb-6">
              Silakan lengkapi alamat pengiriman Anda terlebih dahulu untuk melanjutkan checkout.
            </p>
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddressModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-belleza text-gray-700 hover:bg-gray-50 transition duration-200"
              >
                Nanti
              </button>
              <button
                onClick={() => router.push('/my-account?tab=alamat')}
                className="flex-1 px-4 py-3 bg-black rounded-lg font-belleza text-white hover:opacity-90 transition duration-200"
              >
                Isi Alamat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top black bar */}
      <div className={`fixed left-0 right-0 w-full bg-black h-8 md:h-10 z-[59] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${showTopBar ? 'top-0' : '-top-8 md:-top-10'}`}>
        <div className="w-full max-w-[1160px] mx-auto h-full flex items-center justify-center px-6 md:px-8 lg:px-10">
          <p className="font-belleza text-white text-xs md:text-sm">
            Dapatkan potongan diskon dan pengiriman - <a
              href="/#voucher-section"
              className="font-bold underline hover:text-gray-300 transition-colors cursor-pointer"
            >cek disini</a>
          </p>
        </div>
      </div>

      {/* Language Dropdown Overlay */}
      {showLangDropdown && (
        <div
          className="fixed inset-0 z-[58]"
          onClick={() => setShowLangDropdown(false)}
        />
      )}

      {/* Header component - Always rendered for sidebars, but header bar hidden on mobile */}
      <Header variant="docs" topBarVisible={showTopBar} />

      {/* Mobile Header (only visible on mobile) */}
      <div className={`md:hidden fixed left-0 right-0 z-[60] bg-white border-b border-gray-200 transition-all duration-300 ${showTopBar ? 'top-8' : 'top-0'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Hamburger Menu */}
          <button
            type="button"
            aria-label="Buka menu"
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Image src="/images/sidebar.png" alt="Menu" width={28} height={28} />
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
              onClick={() => setIsVoucherOpen(true)}
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
              onClick={() => setIsFavOpen(true)}
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
              onClick={() => setIsCartOpen(true)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <circle cx="9" cy="21" r="1" fill="currentColor"/>
                <circle cx="20" cy="21" r="1" fill="currentColor"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

      {/* Content wrapper */}
      <div className="flex-grow">
      {/* Section 1: breadcrumb & title */}
      <section className="relative overflow-hidden bg-transparent pt-[84px] md:pt-[130px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10 py-12 md:py-16 flex flex-col items-center justify-center text-center text-gray-100">
          <h1 className="font-cormorant text-2xl md:text-3xl text-gray-100">Keranjang</h1>
          <div className="mt-2 font-belleza text-xs text-gray-100 flex items-center justify-center">
            <span>Produk</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Keranjang</span>
          </div>
        </div>
      </section>

      {/* Section 2: cart table and totals */}
      <section className="bg-white py-10 md:py-14">
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
          {/* Mobile list (<= md) */}
          <div className="md:hidden">
            {!initialCartLoaded && viewItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="font-belleza text-gray-600">Memuat keranjang...</p>
              </div>
            ) : viewItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="font-belleza text-gray-600 text-lg mb-4">Keranjang Kosong</p>
                <Link href="/produk" className="inline-flex items-center gap-2 mt-4 rounded-md bg-black text-white px-4 py-2 hover:opacity-90">
                  Lihat Produk
                </Link>
              </div>
            ) : (
              viewItems.map((item: any) => (
                <div key={item.id} className="px-4 py-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {item.produk?.photo1 ? (
                        <Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-belleza text-gray-900 truncate">{item.produk?.nama_produk || 'Produk'}</div>
                        {item.size ? <span className="text-xs text-gray-500 whitespace-nowrap">Uk: {item.size}</span> : null}
                      </div>
                      <div className="mt-1 font-belleza text-sm text-gray-800">Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-belleza text-sm text-gray-800">Jumlah: {item.quantity || 1}</span>
                        <button
                          type="button"
                          aria-label="Hapus produk"
                          className="p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                          onClick={() => handleRemoveCartItem(item.id)}
                          disabled={removingId === item.id}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-12 bg-gray-100 px-4 py-3 font-cormorant text-gray-900 text-sm md:text-base">
            <div className="col-span-5">Produk</div>
            <div className="col-span-2 text-right">Harga</div>
            <div className="col-span-2 text-center">Ukuran</div>
            <div className="col-span-3 text-right">Jumlah</div>
          </div>
          {/* Cart Items (desktop) */}
          {!initialCartLoaded && viewItems.length === 0 ? (
            <div className="hidden md:block px-4 py-8 text-center">
              <p className="font-belleza text-gray-600">Memuat keranjang...</p>
            </div>
          ) : viewItems.length === 0 ? (
            <div className="hidden md:block px-4 py-8 text-center">
              <p className="font-belleza text-gray-600 text-lg mb-4">Keranjang Kosong</p>
              <Link href="/produk" className="inline-flex items-center gap-2 mt-4 rounded-md bg-black text-white px-4 py-2 hover:opacity-90">
                Lihat Produk
              </Link>
            </div>
          ) : (
            viewItems.map((item: any) => (
              <div key={item.id} className="hidden md:grid grid-cols-12 items-center gap-y-3 px-4 py-4">
                <div className="col-span-5 flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    aria-label="Hapus"
                    className="w-8 h-8 rounded-full border border-gray-300 grid place-items-center text-black hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => handleRemoveCartItem(item.id)}
                    disabled={removingId === item.id}
                  >
                    ×
                  </button>
                  <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                    {item.produk?.photo1 ? (
                      <Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                    ) : (
                      <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="truncate font-belleza text-gray-900">{item.produk?.nama_produk || 'Produk'}</div>
                </div>
                <div className="col-span-2 text-right font-belleza text-gray-900 flex items-center justify-end">
                  Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}
                </div>
                <div className="col-span-2 text-center font-belleza text-gray-900">
                  {item.size || '-'}
                </div>
                <div className="col-span-3 text-right font-belleza text-gray-900">
                  {item.quantity || 1}
                </div>
              </div>
            ))
          )}
          <hr className="border-gray-200 my-3" />

          {/* Coupon and Cart totals row */}
          <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 md:col-span-6">
              {/* Message voucher */}
              <div className="min-h-[32px]">
                {appliedVoucher && (
                  <p className="text-green-600 text-sm font-medium">
                    Selamat, anda mendapatkan potongan harga sebesar Rp {Number(appliedVoucher.total_potongan).toLocaleString('id-ID')}
                  </p>
                )}
                {voucherError && (
                  <p className="text-red-600 text-sm">
                    {voucherError}
                  </p>
                )}
              </div>
            </div>

          {/* Cart totals */}
            <div className="col-span-12 md:col-span-6">
              {/* Button Voucher di atas box */}
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => {
                    const event = new Event('openVoucherSidebar');
                    window.dispatchEvent(event);
                  }}
                  className="rounded bg-black text-white px-4 py-1.5 text-xs font-belleza hover:opacity-90 transition-opacity"
                >
                  Gunakan Voucher
                </button>
              </div>

              {/* Box Subtotal & Total */}
              <div className="border border-gray-300">
                <div className="flex items-center justify-between px-4 py-3 font-belleza text-gray-800">
                  <span>Subtotal</span>
                  <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {appliedVoucher && (
                  <>
                    <hr className="border-gray-300" />
                    <div className="flex items-center justify-between px-4 py-3 font-belleza">
                      <span className="text-gray-800">Potongan Voucher ({appliedVoucher.voucher})</span>
                      <span className="text-green-600">-Rp {discount.toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
                <hr className="border-gray-300" />
                <div className="flex items-center justify-between px-4 py-3 font-belleza text-gray-800 text-base md:text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleCheckout}
                  className="group relative inline-flex w-full items-center justify-center rounded-md bg-black text-white px-5 py-3 font-belleza text-sm md:text-base overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10 flex items-center gap-2">
                    Checkout
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Footer (compact mobile version) */}
      <footer className="bg-white py-6 md:py-4 mt-auto">
        <div className="w-full flex justify-center md:justify-end">
          <div className="w-full max-w-[1160px] px-6 md:px-8 lg:px-10">
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
                  <li><Link href="/user/purchase?view=purchase" className="hover:underline">Pesanan</Link></li>
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
      <FloatingChat />
    </main>
    )
  )
}










