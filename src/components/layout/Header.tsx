"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useChatContext } from '@/lib/chat-context'
import { keranjangDb, produkDb, praCheckoutDb } from '@/lib/database'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { supabase } from '@/lib/supabase'

export default function Header({ variant = 'default', hideRightIcons = false, topBarVisible = true }: { variant?: 'default' | 'docs', hideRightIcons?: boolean, topBarVisible?: boolean }) {
  // Helper function to format product URL without dashes
  const formatProductUrl = (productId: string) => {
    return `/produk/${productId.replace(/-/g, '')}/detail`;
  };

  const router = useRouter()
  const { user, logout, hydrated } = useAuth()
  const { openChat } = useChatContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartSidebarLoading, setCartSidebarLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [favSidebarLoading, setFavSidebarLoading] = useState(false)
  const [isVoucherOpen, setIsVoucherOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { items: cartItems, count: cartCount, loading: cartLoading, refresh, removeItem: removeCartItem, updateQuantity: updateCartQuantity } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, removeFavorite, count: favoritesCount } = useFavorites()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [userMenuOpenedByClick, setUserMenuOpenedByClick] = useState(false)
  const [showPurchaseMenu, setShowPurchaseMenu] = useState(false)
  const [purchaseMenuOpenedByClick, setPurchaseMenuOpenedByClick] = useState(false)
  const [userVouchers, setUserVouchers] = useState<any[]>([])
  const [vouchersLoading, setVouchersLoading] = useState(false)
  const [voucherCount, setVoucherCount] = useState(0)
  const isDocs = variant === 'docs'

  // Close search results dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container') && hasSearched) {
        setSearchResults([])
        setHasSearched(false)
      }
    }

    if (hasSearched) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [hasSearched])

  const closeUserMenu = () => {
    setShowUserMenu(false)
    setUserMenuOpenedByClick(false)
  }

  const handleUserButtonClick = () => {
    setShowUserMenu((prev) => {
      if (isDocs && prev && !userMenuOpenedByClick) {
        setUserMenuOpenedByClick(true)
        return true
      }
      const next = !prev
      setUserMenuOpenedByClick(next)
      return next
    })
  }

  const handleUserMenuMouseEnter = () => {
    if (!isDocs) return
    setUserMenuOpenedByClick(false)
    setShowUserMenu(true)
  }

  const handleUserMenuMouseLeave = () => {
    if (!isDocs) return
    closeUserMenu()
  }

  const closePurchaseMenu = () => {
    setShowPurchaseMenu(false)
    setPurchaseMenuOpenedByClick(false)
  }

  const handlePurchaseButtonClick = () => {
    setShowPurchaseMenu((prev) => {
      if (isDocs && prev && !purchaseMenuOpenedByClick) {
        setPurchaseMenuOpenedByClick(true)
        return true
      }
      const next = !prev
      setPurchaseMenuOpenedByClick(next)
      return next
    })
  }

  const handlePurchaseMenuMouseEnter = () => {
    if (!isDocs) return
    setPurchaseMenuOpenedByClick(false)
    setShowPurchaseMenu(true)
  }

  const handlePurchaseMenuMouseLeave = () => {
    if (!isDocs) return
    closePurchaseMenu()
  }

  // Tutup sidebar favorit
  const handleCloseFavSidebar = () => {
    setIsFavOpen(false);
  };

  // Buka sidebar favorit dengan loading animation
  const handleOpenFavSidebar = () => {
    setFavSidebarLoading(true)
    setIsFavOpen(true)
    // Simulate loading animation for smooth UX
    setTimeout(() => {
      setFavSidebarLoading(false)
    }, 800)
  }

  // Tutup sidebar voucher
  const handleCloseVoucherSidebar = () => {
    setIsVoucherOpen(false);
  };

  // Buka sidebar keranjang dengan loading animation
  const handleOpenCartSidebar = () => {
    setCartSidebarLoading(true)
    setIsCartOpen(true)
    // Simulate loading animation for smooth UX
    setTimeout(() => {
      setCartSidebarLoading(false)
    }, 800)
  }

  // Load voucher count on mount (for badge display)
  useEffect(() => {
    const loadVoucherCount = async () => {
      if (!user) return;

      try {
        // Query hanya untuk count, tidak perlu join dengan voucher table
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
        console.log('[Voucher Count Debug] Fetching used vouchers via API for user_id:', user.id);

        let usedVoucherCodes = new Set<string>();

        try {
          const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);

          if (!response.ok) {
            console.error('[Voucher Count Debug] API error:', response.status, response.statusText);
          } else {
            const result = await response.json();
            console.log('[Voucher Count Debug] API success, voucher codes:', result.voucher_codes);
            usedVoucherCodes = new Set(result.voucher_codes || []);
          }
        } catch (apiError) {
          console.error('[Voucher Count Debug] Exception calling API:', apiError);
        }

        console.log('[Voucher Count Debug] Used vouchers:', Array.from(usedVoucherCodes));

        // Filter yang belum expired dan belum digunakan
        const now = new Date();
        const validCount = vouchersData.filter((v: any) => {
          // Check if expired
          if (v.expired && new Date(v.expired) < now) return false;
          // Check if already used
          if (v.voucher && usedVoucherCodes.has(v.voucher)) return false;
          return true;
        }).length;

        console.log('[Voucher Count Debug] Valid count:', validCount, 'Total:', vouchersData.length);

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
        // Query 1: Get user_vouchers
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

        // Query 2: Get voucher details for each user_voucher
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

        // Get used vouchers to exclude via API route (bypasses RLS)
        console.log('[Voucher Debug] Fetching used vouchers via API for user_id:', user.id);

        let usedVoucherCodes = new Set<string>();

        try {
          const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);

          if (!response.ok) {
            console.error('[Voucher Debug] API error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('[Voucher Debug] API error details:', errorText);
          } else {
            const result = await response.json();
            console.log('[Voucher Debug] API success, data:', result);
            console.log('[Voucher Debug] Voucher codes count:', result.count);
            usedVoucherCodes = new Set(result.voucher_codes || []);
          }
        } catch (apiError) {
          console.error('[Voucher Debug] Exception calling API:', apiError);
        }

        console.log('[Voucher Debug] Used voucher codes:', Array.from(usedVoucherCodes));

        // Combine user_vouchers with voucher details
        const vouchersMap = new Map(vouchersData?.map((v: any) => [v.id, v]) || []);
        const combinedData = userVouchersData.map((uv: any) => ({
          ...uv,
          voucher: vouchersMap.get(uv.voucher_id)
        }));

        console.log('[Voucher Debug] All vouchers before filter:', combinedData.map((v: any) => v.voucher?.voucher));

        // Filter voucher yang masih valid (belum expired) dan belum digunakan di client side
        const now = new Date();
        const validVouchers = combinedData.filter((uv: any) => {
          const voucherCode = uv.voucher?.voucher;
          const isExpired = uv.voucher?.expired && new Date(uv.voucher.expired) < now;
          const isUsed = voucherCode && usedVoucherCodes.has(voucherCode);

          console.log(`[Voucher Debug] ${voucherCode}: expired=${isExpired}, used=${isUsed}`);

          // Check if expired
          if (isExpired) return false;
          // Check if already used
          if (isUsed) return false;
          return true;
        });

        console.log('[Voucher Debug] Valid vouchers after filter:', validVouchers.map((v: any) => v.voucher?.voucher));

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

  const handleLogout = async () => {
    try {
      await logout()
      closeUserMenu()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  useEffect(() => {
    if (isCartOpen && user) {
      refresh()
    }
  }, [isCartOpen, user, refresh])

  // Lock body scroll when cart sidebar is open
  useEffect(() => {
    if (isCartOpen) {
      // Save current scroll position and lock
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [isCartOpen])

  // Listen for custom event to open cart sidebar
  useEffect(() => {
    const handleOpenCart = () => {
      setIsCartOpen(true);
    };
    window.addEventListener('openCartSidebar', handleOpenCart);
    return () => {
      window.removeEventListener('openCartSidebar', handleOpenCart);
    };
  }, []);

  // Listen for custom event to open voucher sidebar
  useEffect(() => {
    const handleOpenVoucher = () => {
      setIsVoucherOpen(true);
    };
    window.addEventListener('openVoucherSidebar', handleOpenVoucher);
    return () => {
      window.removeEventListener('openVoucherSidebar', handleOpenVoucher);
    };
  }, []);

  // Listen for custom event to open favorite sidebar
  useEffect(() => {
    const handleOpenFavorite = () => {
      setIsFavOpen(true);
    };
    window.addEventListener('openFavoriteSidebar', handleOpenFavorite);
    return () => {
      window.removeEventListener('openFavoriteSidebar', handleOpenFavorite);
    };
  }, []);

  // Listen for custom event to open sidebar (left menu)
  useEffect(() => {
    const handleOpenSidebar = () => {
      setIsSidebarOpen(true);
    };
    window.addEventListener('openSidebar', handleOpenSidebar);
    return () => {
      window.removeEventListener('openSidebar', handleOpenSidebar);
    };
  }, []);

  // Listen for custom event to open search sidebar
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsSearchOpen(true);
    };
    window.addEventListener('openSearchSidebar', handleOpenSearch);
    return () => {
      window.removeEventListener('openSearchSidebar', handleOpenSearch);
    };
  }, []);

  // Catatan: badge dan isi cart disuplai oleh useCart (realtime + count),
  // sehingga tidak perlu efek manual untuk setCartCount/setCartItems di sini.

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

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return

    setCheckoutLoading(true)
    try {
      // Create pra_checkout from cart items
      const { praCheckout } = await praCheckoutDb.create(user.id, cartItems)

      // Close sidebar and redirect
      setIsCartOpen(false)
      // Use short_id for cleaner, more secure URL
      router.push(`/produk/checkout?id=${praCheckout.short_id}`)
    } catch (error) {
      console.error('Failed to create checkout:', error)
      alert('Gagal membuat checkout. Silakan coba lagi.')
    } finally {
      setCheckoutLoading(false)
    }
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

  const headerClass = isDocs ? `fixed ${topBarVisible ? 'top-8 md:top-10' : 'top-0'} left-0 right-0 z-[60] border-b border-gray-200 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]` : 'bg-white shadow-sm border-b border-gray-200'
  const headerBgStyle = isDocs ? { backgroundColor: '#FFFFFF' } : {}
  const containerClass = (isDocs ? 'w-full flex items-center px-6 md:px-8 lg:px-10 py-3' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6') + ' font-belleza'
  const iconSize = isDocs ? 28 : 20
  const iconBaseClass = 'relative inline-flex items-center'
  const iconButtonClass = isDocs
    ? `inline-flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-black`
    : `${iconBaseClass} p-2 text-gray-600 hover:text-black transition-colors`
  const badgeClass = isDocs
    ? 'absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center'
    : 'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[5px] rounded-full bg-black text-white text-[10px] leading-[18px] text-center'

  return (
    <>
    <header className={`${headerClass} hidden md:block`} style={headerBgStyle}>
      <div className={containerClass}>
        {/* Logo hanya untuk variant default */}
        {!isDocs && (
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Meoris beranda" className="select-none flex items-center space-x-2">
              <Image
                src="/logo/logo.png"
                alt="Meoris Logo"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <span className="text-xs tracking-[0.3em] uppercase text-gray-600 font-belleza">Footwear</span>
            </Link>
          </div>
        )}

        {/* Layout untuk docs variant */}
        {isDocs && !hideRightIcons && (
          <>
            {/* Spacer kiri - untuk balance layout */}
            <div className="flex-1"></div>

            {/* Container untuk search field */}
            <div className="flex flex-col w-full">
              {/* Search field dengan icon di sampingnya */}
              <div className="w-full max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
                <div className="flex items-center gap-15">
                  <Link href="/home" className="cursor-pointer">
                    <Image
                      src="/logo/logo.png"
                      alt="Meoris Logo"
                      width={200}
                      height={48}
                      className="h-12 w-auto object-contain"
                    />
                  </Link>
                  <div className="flex-1 max-w-[710px]">
                    <div className="relative search-container">
                    <input
                      type="text"
                      placeholder="Cari produk..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setHasSearched(false)
                        setSearchResults([])
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full px-4 py-2.5 pr-24 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all placeholder:text-gray-600 text-black"
                    />
                    <button
                      onClick={handleSearch}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black text-white font-belleza text-sm"
                    >
                      {searchLoading ? (
                        <span className="text-sm">Mencari...</span>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>

                  {/* Search Results Dropdown */}
                  {hasSearched && (searchResults.length > 0 || searchLoading) && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 shadow-xl max-h-96 overflow-y-auto z-50">
                      {searchLoading ? (
                        <div className="p-4 text-center text-gray-600">
                          <p className="text-sm">Mencari produk...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="py-2">
                          {searchResults.map((product: any) => (
                            <Link
                              key={product.id}
                              href={formatProductUrl(product.id)}
                              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                setSearchQuery('')
                                setSearchResults([])
                                setHasSearched(false)
                              }}
                            >
                              <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 rounded shrink-0">
                                {product.photo1 ? (
                                  <Image src={product.photo1} alt={product.nama_produk} fill sizes="64px" className="object-cover" />
                                ) : (
                                  <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-belleza text-gray-900 truncate font-medium">{product.nama_produk}</p>
                                <p className="font-belleza text-sm text-gray-700 mt-1">
                                  Rp {Number(product.harga || 0).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      {hasSearched && !searchLoading && searchResults.length === 0 && (
                        <div className="p-4 text-center text-gray-600">
                          <p className="text-sm">Tidak ada hasil untuk "{searchQuery}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  </div>

                  <div className="flex items-center gap-3 ml-12">
                    {/* User */}
                    <div className="relative">
                      <button
                        onClick={handleUserButtonClick}
                        aria-label="Akun"
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                          <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 shadow-lg py-2 z-[70]">
                          {/* Pointer arrow */}
                          <div className="absolute -top-2 right-3 w-0 h-0" style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '8px solid #e5e7eb'
                          }}></div>
                          <div className="absolute -top-1.5 right-3.5 w-0 h-0" style={{
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderBottom: '7px solid white'
                          }}></div>
                          <button
                            onClick={() => {
                              closeUserMenu();
                              if (!user) {
                                router.push('/login');
                              } else {
                                router.push('/user/purchase?view=profile');
                              }
                            }}
                            className="w-full text-left block px-4 py-2 text-sm text-black hover:bg-gray-50"
                          >
                            Informasi Akun
                          </button>
                          <button
                            onClick={() => {
                              closeUserMenu();
                              if (!user) {
                                router.push('/login');
                              } else {
                                router.push('/user/purchase?view=address');
                              }
                            }}
                            className="w-full text-left block px-4 py-2 text-sm text-black hover:bg-gray-50"
                          >
                            Alamat
                          </button>
                          <div className="border-t border-gray-200 my-2"></div>
                          {user ? (
                            <button
                              onClick={handleLogout}
                              className="w-full text-left block px-4 py-2 text-sm text-black hover:bg-gray-50"
                            >
                              Logout
                            </button>
                          ) : (
                            <Link href="/login" className="block px-4 py-2 text-sm text-black hover:bg-gray-50" onClick={closeUserMenu}>Masuk atau Daftar</Link>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Voucher */}
                    <a href="#" aria-label="Voucher" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsVoucherOpen(true); }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                        <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{voucherCount}</span>
                    </a>

                    {/* Favorites */}
                    <a href="#" aria-label="Favorit" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); handleOpenFavSidebar(); }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
                    </a>

                    {/* Cart */}
                    <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); handleOpenCartSidebar(); }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
                  </a>
                </div>
              </div>
            </div>
            </div>

            {/* Spacer kanan - untuk balance layout */}
            <div className="flex-1"></div>
          </>
        )}

        {/* Right side icons - untuk variant default */}
        {!hideRightIcons && !isDocs && (
        <div className="flex items-center gap-3 ml-auto">
          {/* Search icon hanya untuk variant default */}
          <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Voucher */}
          <a href="#" aria-label="Voucher" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsVoucherOpen(true); }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{voucherCount}</span>
          </a>

          {/* Favorites */}
          <a href="#" aria-label="Favorit" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); handleOpenFavSidebar(); }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
          </a>

          {/* Cart */}
          <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
          </a>

          {/* User menu */}
          <div className="relative" onMouseEnter={handleUserMenuMouseEnter} onMouseLeave={handleUserMenuMouseLeave}>
            <Link href="/user/purchase?view=profile" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            {showUserMenu && (
              <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${showUserMenu ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                {/* Pointer arrow */}
                <div className="absolute -top-2 right-3 w-0 h-0" style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid #e5e7eb'
                }}></div>
                <div className="absolute -top-1.5 right-3.5 w-0 h-0" style={{
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderBottom: '7px solid white'
                }}></div>
                <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                <button
                  onClick={() => {
                    closeUserMenu();
                    if (!user) {
                      router.push('/login');
                    } else {
                      router.push('/user/purchase?view=profile');
                    }
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-black hover:bg-gray-50"
                >
                  Informasi Akun
                </button>
                <button
                  onClick={() => {
                    closeUserMenu();
                    if (!user) {
                      router.push('/login');
                    } else {
                      router.push('/user/purchase?view=address');
                    }
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-black hover:bg-gray-50"
                >
                  Alamat
                </button>
                <div className="border-t border-gray-200 my-2"></div>
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-sm text-black hover:bg-gray-50"
                  >
                    Logout
                  </button>
                ) : (
                  <Link href="/login" className="block px-4 py-2 text-sm text-black hover:bg-gray-50" onClick={closeUserMenu}>Masuk atau Daftar</Link>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </header>

      {/* Navigation Bar - Below Header */}
      {isDocs && (
        <div className={`fixed ${topBarVisible ? 'top-[calc(2rem+70px)] md:top-[calc(2.5rem+70px)]' : 'top-[70px]'} left-0 right-0 w-full bg-white border-b border-gray-200 z-[50] hidden md:block transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
          <div className="w-full h-full px-6 md:px-8 lg:px-10 flex items-center justify-center py-2">
            <nav className="flex items-center justify-center gap-12">
              <a href="/produk" className="relative font-belleza font-semibold text-sm text-black uppercase group">
                PRODUK
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
              <a
                href="/home#new-arrivals"
                onClick={(e) => {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/home') {
                    // If already on home page, just scroll
                    e.preventDefault();
                    const element = document.getElementById('new-arrivals');
                    if (element) {
                      const headerOffset = 120;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  } else {
                    // Save scroll target to sessionStorage for cross-page navigation
                    sessionStorage.setItem('scrollToSection', 'new-arrivals');
                  }
                }}
                className="relative font-belleza font-semibold text-sm text-black uppercase group"
              >
                TERBARU
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
              <a href="/produk?gender=Pria" className="relative font-belleza font-semibold text-sm text-black uppercase group">
                PRIA
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
              <a href="/produk?gender=Wanita" className="relative font-belleza font-semibold text-sm text-black uppercase group">
                WANITA
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
              <a href="/produk?gender=Anak" className="relative font-belleza font-semibold text-sm text-black uppercase group">
                ANAK
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
              <a href="/produk?flashSale=true" className="relative font-belleza font-semibold text-sm text-black uppercase group">
                FLASH SALE
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
              <a
                href="/home#voucher-section"
                onClick={(e) => {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/home') {
                    // If already on home page, just scroll
                    e.preventDefault();
                    const element = document.getElementById('voucher-section');
                    if (element) {
                      const headerOffset = 120;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  } else {
                    // Save scroll target to sessionStorage for cross-page navigation
                    sessionStorage.setItem('scrollToSection', 'voucher-section');
                  }
                }}
                className="relative font-belleza font-semibold text-sm text-black uppercase group"
              >
                VOUCHER
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-black transition-all duration-300 ease-out group-hover:w-full"></span>
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {showUserMenu && (!isDocs || userMenuOpenedByClick) && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeUserMenu}
        />
      )}

      {/* Overlay for purchase menu */}
      {showPurchaseMenu && (!isDocs || purchaseMenuOpenedByClick) && (
        <div
          className="fixed inset-0 z-40"
          onClick={closePurchaseMenu}
        />
      )}

      {/* Left Sidebar menu (docs variant) - Modern Design */}
      {isDocs && isSidebarOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-80 md:w-96 max-w-[75%] bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-2xl overflow-y-auto transform transition-transform duration-500 ease-out animate-slideInLeft">
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
                <Image
                  src="/logo/logo.png"
                  alt="Meoris Logo"
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
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
              </ul>

              {/* Logout Button */}
              {user && (
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
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Search Sidebar (docs variant) */}
      {isDocs && isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={handleCloseSearchSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col transform transition-transform duration-500 ease-out animate-slideInRight">
            <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110" onClick={handleCloseSearchSidebar}>
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

      {isCartOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={() => setIsCartOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col transform transition-transform duration-500 ease-out animate-slideInRight">
            <button type="button" aria-label="Tutup keranjang" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110" onClick={() => setIsCartOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-cormorant text-xl md:text-2xl text-black">Item Keranjang</span>
              </div>
            </div>

            <div className="mt-6">
              {/* Loading State - Skeleton untuk seluruh konten */}
              {(cartLoading || cartSidebarLoading) ? (
                <>
                  <div className="space-y-5">
                    {/* Skeleton items */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 shrink-0"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
                    <div className="h-10 bg-gray-300 rounded w-full"></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-5 overflow-hidden">
                    {cartItems.length === 0 ? (
                      <p className="text-sm text-gray-600">Keranjang kosong</p>
                    ) : (
                      cartItems.map((item: any) => (
                        <div
                          key={item.id}
                          className={`border-b border-gray-100 pb-4 transition-all duration-500 ease-in-out overflow-hidden ${removingId === item.id ? 'opacity-0 translate-x-full scale-75 max-h-0 py-0 my-0' : 'opacity-100 translate-x-0 scale-100 max-h-48 py-0'}`}
                        >
                          <div className="flex gap-3">
                            {/* Product Image */}
                            <div className="relative w-20 h-20 overflow-hidden bg-gray-50 shrink-0">
                              {item.produk?.photo1 ? (
                                <Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="80px" className="object-cover" />
                              ) : (
                                <Image src="/images/test1p.png" alt="Produk" fill sizes="80px" className="object-cover" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-belleza text-sm text-gray-900 leading-tight line-clamp-2">{item.produk?.nama_produk || 'Produk'}</p>
                                  <button
                                    type="button"
                                    aria-label="Hapus item"
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
                                    onClick={() => handleRemoveCartItem(item.id)}
                                    disabled={removingId === item.id}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                                {item.size && (
                                  <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                                )}
                              </div>

                              {/* Quantity & Total */}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center border border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                                    disabled={item.quantity <= 1}
                                    className={`w-6 h-6 flex items-center justify-center text-xs transition-colors ${
                                      item.quantity <= 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-gray-900 text-xs font-medium border-x border-gray-200">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <p className="font-belleza text-sm font-medium text-gray-900">Rp {(Number(item.produk?.harga || 0) * item.quantity).toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {cartItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
                    <div className="mt-4 flex flex-col items-stretch gap-3">
                      <button
                        type="button"
                        disabled={cartItems.length === 0 || checkoutLoading}
                        className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                        onClick={handleCheckout}
                      >
                        {checkoutLoading ? (
                          <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Memproses...
                          </div>
                        ) : (
                          'Checkout'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Favorites Sidebar */}
      {isFavOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={handleCloseFavSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col transform transition-transform duration-500 ease-out animate-slideInRight">
            {/* Pull-tab close button on the left edge */}
            <button
              type="button"
              aria-label="Tutup favorit"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110"
              onClick={handleCloseFavSidebar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-cormorant text-xl md:text-2xl text-black">Item Favorit</span>
              </div>
            </div>

            <div className="mt-6">
              {/* Loading State - Skeleton untuk seluruh konten */}
              {(favoritesLoading || favSidebarLoading) ? (
                <>
                  <div className="space-y-5">
                    {/* Skeleton items */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 shrink-0"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : !user ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 mb-4">Login untuk melihat favorit Anda</p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-2 bg-black text-white rounded-md hover:opacity-90 transition-opacity text-sm"
                    onClick={handleCloseFavSidebar}
                  >
                    Login
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-5 overflow-hidden">
                    {favorites.length === 0 ? (
                      <p className="text-sm text-gray-600 text-center">Belum ada favorit</p>
                    ) : (
                      favorites.map((favorite) => (
                        <div
                          key={favorite.id}
                          className={`border-b border-gray-100 pb-4 transition-all duration-500 ease-in-out overflow-hidden ${removingId === favorite.id ? 'opacity-0 translate-x-full scale-75 max-h-0 py-0 my-0' : 'opacity-100 translate-x-0 scale-100 max-h-48 py-0'}`}
                        >
                          <Link
                            href={formatProductUrl(favorite.produk_id)}
                            className="flex gap-3"
                          >
                            {/* Product Image */}
                            <div className="relative w-20 h-20 overflow-hidden bg-gray-50 shrink-0">
                              {favorite.produk?.photo1 ? (
                                <Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || "Produk"} fill sizes="80px" className="object-cover" />
                              ) : (
                                <Image src="/images/test1p.png" alt="Produk favorit" fill sizes="80px" className="object-cover" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-belleza text-sm text-gray-900 leading-tight line-clamp-2">{favorite.produk?.nama_produk || "Produk"}</p>
                                  <button
                                    type="button"
                                    aria-label="Hapus item"
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
                                    disabled={removingId === favorite.id}
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();

                                      // Set removing state for animation
                                      setRemovingId(favorite.id);

                                      // Wait for slide animation to complete
                                      await new Promise(resolve => setTimeout(resolve, 500));

                                      // Remove item using optimistic update from hook
                                      await removeFavorite(favorite.id);

                                      // Clear removing state
                                      setRemovingId(null);
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="mt-2">
                                <p className="font-belleza text-sm font-medium text-gray-900">Rp {Number(favorite.produk?.harga || 0).toLocaleString("id-ID")}</p>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </>
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
                <>
                  <div className="space-y-3">
                    {/* Skeleton voucher cards */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex border rounded overflow-hidden animate-pulse">
                        {/* Left section skeleton */}
                        <div className="w-20 bg-gray-300 shrink-0"></div>
                        {/* Right section skeleton */}
                        <div className="flex-1 p-2.5 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/5"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/5"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
                              {voucher.type === 'shipping' ? 'ONGKIR' : 'VOUCHER'}
                            </div>
                            <div className="text-[8px] font-bold leading-tight">
                              {voucher.type === 'shipping' ? 'GRATIS' : 'DISKON'}
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

                          {/* Action Button - Only show on checkout pages */}
                          {!isUsed && !isExpired && typeof window !== 'undefined' && (window.location.pathname === '/produk/checkout' || window.location.pathname === '/produk/detail-checkout') && (
                            <div className="mt-1.5 flex justify-end">
                              <button
                                onClick={() => {
                                  console.log('[Header Sidebar] Pakai button clicked');
                                  console.log('[Header Sidebar] Voucher data:', voucher);

                                  // Dispatch event to apply voucher
                                  const event = new CustomEvent('applyVoucherFromSidebar', {
                                    detail: voucher
                                  });
                                  window.dispatchEvent(event);
                                  console.log('[Header Sidebar] Event dispatched');
                                  handleCloseVoucherSidebar();
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
    </>
  )
}



































