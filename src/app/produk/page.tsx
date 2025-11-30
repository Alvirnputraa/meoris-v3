"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import Header from "@/components/layout/Header";
import LottiePlayer from "@/components/LottiePlayer";
import { useProductCache } from "@/lib/ProductCacheContext";
import { useFavorites } from "@/lib/useFavorites";
import { useCart } from "@/lib/useCart";
import { produkDb, keranjangDb, homepageSection2DealsDb } from "@/lib/database";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useChatContext } from "@/lib/chat-context";
import { useSearchParams } from "next/navigation";

const curatedTags = [
  "Semua Produk",
];

// Helper function to format product URL without dashes
const formatProductUrl = (productId: string) => {
  return `/produk/${productId.replace(/-/g, '')}/detail`;
};

// Helper function to derive product metadata (same as homepage)
const deriveProductMeta = (product: any) => {
  const name = product?.nama_produk?.toLowerCase() || '';
  let category = 'Collection';
  let badge = 'New';
  let colorway = 'Classic';
  let description = 'Siluet tegas dengan kenyamanan maksimal. Dipadukan dengan insole empuk yang mengikuti bentuk telapak kaki.';

  // Simple badge logic based on product name or other attributes
  if (name.includes('aurora') || name.includes('strappy')) badge = 'Favorit';
  else if (name.includes('noir') || name.includes('slip')) badge = 'Terlaris';
  else if (name.includes('luxe') || name.includes('weave')) badge = 'Limited';
  else if (name.includes('coco') || name.includes('strap')) badge = 'Premium';
  else if (name.includes('zen') || name.includes('form')) badge = 'Baru';
  else if (name.includes('marble') || name.includes('twist')) badge = 'Eksklusif';
  else if (name.includes('sage') || name.includes('curve')) badge = 'Nyaman';
  else if (name.includes('lunar') || name.includes('glow')) badge = 'Glam';

  return { category, badge, colorway, description };
};
// Local cache URL helper for product images (photo1/preview_photo)
const cacheSrc = (url?: string | null) => {
  const s = (url || '').trim();
  if (!s) return null;
  if (s.startsWith('/')) return s; // already local
  // route remote URL via local cache to store under public/images/cache
  return `/api/cache-image?url=${encodeURIComponent(s)}`;
};

function ProdukPageContent() {
  const { products, loading, isCacheReady } = useProductCache(); // Use cache context
  const { toggleFavorite, isFavorite, removeFavorite, count: favoritesCount } = useFavorites();
  const { count: cartCount, removeItem: removeCartItem, incrementCount: incrementCartCount } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { openChat } = useChatContext();
  const searchParams = useSearchParams();
  const [showSplash, setShowSplash] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState('Indonesia');
  const [showVoucherBanner, setShowVoucherBanner] = useState(false);
  const [currentVoucherIndex, setCurrentVoucherIndex] = useState(0);
  const [claimedVouchers, setClaimedVouchers] = useState<Set<string>>(new Set());
  const [claimingVoucher, setClaimingVoucher] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, { main: boolean; preview: boolean }>>({});

  // Mobile states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileAccountMenu, setShowMobileAccountMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState<any[]>([]);
  const [mobileSearchLoading, setMobileSearchLoading] = useState(false);
  const [mobileHasSearched, setMobileHasSearched] = useState(false);

  // Handle mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle URL query parameters for filters
  useEffect(() => {
    if (!searchParams) return;

    // Check for gender filter
    const genderParam = searchParams.get('gender');
    if (genderParam && ['Pria', 'Wanita', 'Anak'].includes(genderParam)) {
      setSelectedGender(genderParam);
    }

    // Check for flash sale filter
    const flashSaleParam = searchParams.get('flashSale');
    if (flashSaleParam === 'true') {
      setShowFlashSaleOnly(true);
    }
  }, [searchParams]);

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
  }, [isMobileSidebarOpen]);

  // Filter states (initialize with useEffect later based on products)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [selectedSizesFilter, setSelectedSizesFilter] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [showFlashSaleOnly, setShowFlashSaleOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Dropdown states
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const availableSizes = ['39', '40', '41', '42', '43'];
  const genderOptions = ['Pria', 'Wanita', 'Anak'];

  // Flash Sale deals state
  const [flashSaleDeals, setFlashSaleDeals] = useState<any[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  // Calculate min and max price from products
  const minPrice = products && products.length > 0 ? Math.min(...products.map((p: any) => Number(p?.harga || 0))) : 0;
  const maxPrice = products && products.length > 0 ? Math.max(...products.map((p: any) => Number(p?.harga || 0))) : 1000000;

  // Function to show notification
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Function to handle image loading
  const handleImageLoad = (productId: string, imageType: 'main' | 'preview') => {
    setImageLoadingStates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [imageType]: false
      }
    }));
  };

  // Initialize image loading state when products change
  useEffect(() => {
    if (products && products.length > 0) {
      const initialStates: Record<string, { main: boolean; preview: boolean }> = {};
      products.forEach((product: any) => {
        initialStates[product.id] = { main: true, preview: true };
      });
      setImageLoadingStates(initialStates);
    }
  }, [products]);

  // Function to handle claim voucher
  const handleClaimVoucher = async (voucherCode: string) => {
    if (!user) {
      showNotification('Silakan login terlebih dahulu', 'error');
      router.push('/login');
      return;
    }

    if (claimedVouchers.has(voucherCode)) {
      showNotification('Anda sudah claim voucher ini', 'error');
      return;
    }

    setClaimingVoucher(voucherCode);

    try {
      const response = await fetch('/api/vouchers/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucherCode,
          userId: user.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification('Berhasil claim voucher! Cek voucher Anda di halaman profil.', 'success');
        setClaimedVouchers(prev => new Set(prev).add(voucherCode));
      } else {
        showNotification(result.message || 'Gagal claim voucher', 'error');
      }
    } catch (error) {
      console.error('Error claiming voucher:', error);
      showNotification('Terjadi kesalahan saat claim voucher', 'error');
    } finally {
      setClaimingVoucher(null);
    }
  };

  // Function to handle size selection
  const handleSizeSelect = (productId: string, size: string) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: prev[productId] === size ? '' : size
    }));
  };

  // Function to add to cart
  const handleAddToCart = async (productId: string) => {
    if (!user) {
      showNotification('Silakan login terlebih dahulu', 'error');
      router.push('/login');
      return;
    }

    const selectedSize = selectedSizes[productId];
    if (!selectedSize) {
      showNotification('Pilih ukuran terlebih dahulu', 'error');
      return;
    }

    // Set loading state
    setAddingToCart(productId);

    // Optimistic UI: Increment count IMMEDIATELY (synchronous)
    incrementCartCount();

    // Optimistic UI: Show success immediately for better UX
    setTimeout(() => {
      showNotification('Produk berhasil ditambahkan ke keranjang!', 'success');
      setAddingToCart(null);
    }, 300);

    // Open cart sidebar quickly
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openCartSidebar'));
    }, 400);

    // Perform actual database operation in background
    try {
      await keranjangDb.addItem(user.id, productId, 1, selectedSize);
    } catch (error) {
      console.error('Error adding to cart:', error);
      // If error occurs, show error notification
      setTimeout(() => {
        showNotification('Terjadi kesalahan, silakan coba lagi', 'error');
      }, 500);
    }
  };

  useEffect(() => {
    // Show splash screen for minimum 800ms
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Update price range when products are loaded
  useEffect(() => {
    if (products && products.length > 0) {
      const min = Math.min(...products.map((p: any) => Number(p?.harga || 0)));
      const max = Math.max(...products.map((p: any) => Number(p?.harga || 0)));
      setPriceRange([min, max]);
    }
  }, [products]);

  // Fetch flash sale deals from homepage_section2_deals table
  useEffect(() => {
    const fetchFlashSaleDeals = async () => {
      setDealsLoading(true);
      try {
        const deals = await homepageSection2DealsDb.getActive(100); // Get up to 100 active deals
        setFlashSaleDeals(deals);
      } catch (error) {
        console.error('Error fetching flash sale deals:', error);
        setFlashSaleDeals([]);
      } finally {
        setDealsLoading(false);
      }
    };

    fetchFlashSaleDeals();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      // Close all filter dropdowns when clicking outside
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown-container')) {
        setShowPriceDropdown(false);
        setShowGenderDropdown(false);
        setShowSortDropdown(false);
      }
    };

    // Close dropdowns on scroll to prevent overlap with header
    const handleScroll = () => {
      setShowPriceDropdown(false);
      setShowGenderDropdown(false);
      setShowSortDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Voucher banner rotation - only when banner is visible
  useEffect(() => {
    if (!showVoucherBanner) return;

    const interval = setInterval(() => {
      setCurrentVoucherIndex((prev) => (prev === 0 ? 1 : 0));
    }, 4000);

    return () => clearInterval(interval);
  }, [showVoucherBanner]);

  // Load claimed vouchers
  useEffect(() => {
    const loadClaimedVouchers = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_vouchers')
          .select('voucher:voucher_id(voucher)')
          .eq('user_id', user.id);

        if (!error && data) {
          const claimed = new Set(data.map((item: any) => item.voucher?.voucher).filter(Boolean));
          setClaimedVouchers(claimed);
        }
      } catch (error) {
        console.error('Error loading claimed vouchers:', error);
      }
    };

    loadClaimedVouchers();
  }, [user]);

  // Debounced search function
  const handleSearchInput = useCallback(async (value: string) => {
    setSearchQuery(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // If empty, clear results
    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Set new timer for debounced search
    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await produkDb.search(value, 10);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch (error) {
        console.error("Error searching products:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce
  }, []);

  // Mobile search handler
  const handleMobileSearch = async () => {
    if (!mobileSearchQuery.trim()) return;
    setMobileSearchLoading(true);
    setMobileHasSearched(true);
    try {
      const results = await produkDb.search(mobileSearchQuery.trim());
      setMobileSearchResults(results || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setMobileSearchResults([]);
    } finally {
      setMobileSearchLoading(false);
    }
  };

  const handleCloseMobileSearch = () => {
    setIsMobileSearchOpen(false);
    setMobileSearchQuery('');
    setMobileSearchResults([]);
    setMobileHasSearched(false);
  };

  // Show loading splash if still loading or splash time not complete
  if (showSplash || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
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

      {/* Overlay untuk close dropdown */}
      {showLangDropdown && (
        <div
          className="fixed inset-0 z-[62]"
          onClick={() => setShowLangDropdown(false)}
        />
      )}

      {/* Header component - Always rendered for sidebars, but header bar hidden on mobile */}
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
              onClick={() => setIsMobileSearchOpen(true)}
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
              onClick={() => {
                window.dispatchEvent(new Event('openVoucherSidebar'));
              }}
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
              onClick={() => {
                window.dispatchEvent(new Event('openFavoriteSidebar'));
              }}
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
              onClick={() => {
                window.dispatchEvent(new Event('openCartSidebar'));
              }}
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

      {/* Mobile Search Sidebar */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseMobileSearch}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button
              type="button"
              aria-label="Tutup pencarian"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={handleCloseMobileSearch}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Cari Produk</span>
            </div>

            <div className="mt-6">
              <input
                type="text"
                placeholder="Cari produk"
                value={mobileSearchQuery}
                onChange={(e) => {
                  setMobileSearchQuery(e.target.value);
                  setMobileHasSearched(false);
                  setMobileSearchResults([]);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleMobileSearch()}
                className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40"
              />
              <div className="mt-3">
                <button
                  onClick={handleMobileSearch}
                  disabled={mobileSearchLoading || !mobileSearchQuery.trim()}
                  className="w-full rounded-none bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {mobileSearchLoading ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="font-cormorant text-black">Hasil pencarian</p>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-5">
              {mobileSearchLoading ? (
                <p className="text-sm text-gray-600">Mencari produk...</p>
              ) : mobileHasSearched ? (
                mobileSearchResults.length > 0 ? (
                  mobileSearchResults.map((product: any) => (
                    <Link
                      key={product.id}
                      href={formatProductUrl(product.id)}
                      className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer"
                      onClick={handleCloseMobileSearch}
                    >
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
                  <p className="text-sm text-gray-600">Tidak ada hasil untuk "{mobileSearchQuery}"</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Masukkan kata kunci untuk mencari produk</p>
              )}
            </div>
          </aside>
        </div>
      )}

      <section className="relative overflow-hidden bg-white pt-[120px] md:pt-[170px] pb-16">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#f8ede4,transparent_55%),radial-gradient(circle_at_bottom,#e7f0ff,transparent_60%)]"
          aria-hidden="true"
        />
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-black/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-gray-500">
                Discover
              </span>
              <h1 className="mt-4 font-cormorant text-3xl md:text-4xl lg:text-[42px] text-black leading-tight">
                Koleksi Sandal Terbaru
              </h1>
              <p className="mt-3 font-belleza text-sm md:text-base text-gray-600 max-w-xl">
                Pilihan siluet elegan dengan material premium untuk menemani langkahmu setiap hari. Temukan warna dan bentuk yang memantulkan karakter personalmu.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {/* Harga Filter */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={(e) => {
                  // Check if clicked on reset icon
                  if ((e.target as HTMLElement).closest('.reset-icon')) {
                    e.stopPropagation();
                    setPriceRange([minPrice, maxPrice]);
                    setShowPriceDropdown(false);
                    return;
                  }
                  setShowPriceDropdown(!showPriceDropdown);
                  setShowGenderDropdown(false);
                  setShowSortDropdown(false);
                  setShowFavoritesOnly(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 transition-colors font-belleza text-[11px] md:text-sm ${
                  showPriceDropdown || (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                <span>Harga</span>
                {(priceRange[0] !== minPrice || priceRange[1] !== maxPrice) ? (
                  <svg className="w-4 h-4 reset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {showPriceDropdown && (
                <div className="absolute top-full left-0 w-80 bg-white border border-gray-200 shadow-xl p-4 z-50">
                  <p className="font-belleza text-sm text-black font-semibold mb-2">Range Harga</p>
                  <p className="font-belleza text-xs text-gray-600 mb-4">
                    Rp {priceRange[0].toLocaleString('id-ID')} - Rp {priceRange[1].toLocaleString('id-ID')}
                  </p>
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    step="10000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([minPrice, Number(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-belleza text-xs text-gray-600">Rp {minPrice.toLocaleString('id-ID')}</span>
                    <span className="font-belleza text-xs text-gray-600">Rp {maxPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gender Filter */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={(e) => {
                  // Check if clicked on reset icon
                  if ((e.target as HTMLElement).closest('.reset-icon')) {
                    e.stopPropagation();
                    setSelectedGender('');
                    setShowGenderDropdown(false);
                    return;
                  }
                  setShowGenderDropdown(!showGenderDropdown);
                  setShowPriceDropdown(false);
                  setShowSortDropdown(false);
                  setShowFavoritesOnly(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 transition-colors font-belleza text-[11px] md:text-sm ${
                  showGenderDropdown || selectedGender
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                <span>Gender</span>
                {selectedGender ? (
                  <svg className="w-4 h-4 reset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {showGenderDropdown && (
                <div className="absolute top-full left-0 w-48 bg-white border border-gray-200 shadow-xl overflow-hidden z-50">
                  {genderOptions.map((gender) => (
                    <button
                      key={gender}
                      onClick={() => {
                        setSelectedGender(selectedGender === gender ? '' : gender);
                        setShowGenderDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 font-belleza text-sm transition-colors ${
                        selectedGender === gender
                          ? 'bg-black text-white'
                          : 'bg-white text-black hover:bg-gray-50'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Flash Sale Toggle */}
            <button
              onClick={(e) => {
                // Check if clicked on reset icon
                if ((e.target as HTMLElement).closest('.reset-icon')) {
                  e.stopPropagation();
                  setShowFlashSaleOnly(false);
                  return;
                }
                setShowFlashSaleOnly(!showFlashSaleOnly);
                setShowFavoritesOnly(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 font-belleza text-[11px] md:text-sm transition-colors ${
                showFlashSaleOnly
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              <span>Flash Sale</span>
              {showFlashSaleOnly ? (
                <svg className="w-4 h-4 reset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : null}
            </button>

            {/* Favorit Filter */}
            <button
              onClick={async (e) => {
                // Check if clicked on reset icon
                if ((e.target as HTMLElement).closest('.reset-icon')) {
                  e.stopPropagation();
                  setShowFavoritesOnly(false);
                  return;
                }

                // Check if user is logged in
                if (!user) {
                  showNotification('Silakan login terlebih dahulu', 'error');
                  router.push('/login');
                  return;
                }

                // Import favoritDb if not already imported
                const { favoritDb } = await import('@/lib/database');

                // Get user's favorites
                const favorites = await favoritDb.getByUserId(user.id);

                if (favorites.length === 0) {
                  showNotification('Anda belum mempunyai produk favorit', 'error');
                  return;
                }

                // Deactivate all other filters when Favorit is activated
                setShowPriceDropdown(false);
                setShowGenderDropdown(false);
                setShowSortDropdown(false);
                setShowFlashSaleOnly(false);
                setPriceRange([minPrice, maxPrice]);
                setSelectedGender('');
                setSortBy('newest');

                setShowFavoritesOnly(!showFavoritesOnly);
              }}
              className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 font-belleza text-[11px] md:text-sm transition-colors ${
                showFavoritesOnly
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              <span>Favorit</span>
              {showFavoritesOnly ? (
                <svg className="w-4 h-4 reset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : null}
            </button>

            {/* Sort Filter */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={(e) => {
                  // Check if clicked on reset icon
                  if ((e.target as HTMLElement).closest('.reset-icon')) {
                    e.stopPropagation();
                    setSortBy('newest');
                    setShowSortDropdown(false);
                    return;
                  }
                  setShowSortDropdown(!showSortDropdown);
                  setShowPriceDropdown(false);
                  setShowGenderDropdown(false);
                  setShowFavoritesOnly(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 transition-colors font-belleza text-[11px] md:text-sm ${
                  showSortDropdown || sortBy !== 'newest'
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                <span>Filter</span>
                {sortBy !== 'newest' ? (
                  <svg className="w-4 h-4 reset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {showSortDropdown && (
                <div className="absolute top-full left-0 w-48 bg-white border border-gray-200 shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setSortBy('newest');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 font-belleza text-sm transition-colors ${
                      sortBy === 'newest'
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-gray-50'
                    }`}
                  >
                    Terbaru
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('oldest');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 font-belleza text-sm transition-colors ${
                      sortBy === 'oldest'
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-gray-50'
                    }`}
                  >
                    Terlama
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start" style={{ alignItems: 'start' }}>
            {loading ? (
              <>
                {/* Skeleton Loading - 12 items */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                  <div key={i} className="group relative flex flex-col bg-white border-t border-l border-r border-transparent overflow-visible">
                    {/* Image Skeleton */}
                    <div className="relative aspect-square overflow-hidden bg-gray-200 animate-pulse"></div>

                    {/* Content Skeleton */}
                    <div className="flex flex-1 flex-col px-4 pt-3 pb-4 relative">
                      {/* Brand */}
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>

                      {/* Title */}
                      <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-3"></div>

                      {/* Divider */}
                      <div className="h-px bg-gray-200 w-full mb-3"></div>

                      {/* Description */}
                      <div className="space-y-2 mb-3">
                        <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                      </div>

                      {/* Price */}
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mb-3"></div>

                      {/* Label */}
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-3"></div>

                      {/* Button */}
                      <div className="mt-4 h-10 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : products && products.length > 0 ? (
              (() => {
                // Apply filters
                let filteredProducts = [...products];

                // Filter by price
                filteredProducts = filteredProducts.filter((product: any) => {
                  const price = Number(product?.harga || 0);
                  return price >= priceRange[0] && price <= priceRange[1];
                });

                // Filter by favorites
                if (showFavoritesOnly) {
                  filteredProducts = filteredProducts.filter((product: any) => {
                    return isFavorite(product?.id);
                  });
                }

                // Filter by gender - using kategori column
                if (selectedGender) {
                  filteredProducts = filteredProducts.filter((product: any) => {
                    const productCategory = (product?.kategori || '').toLowerCase();
                    return productCategory === selectedGender.toLowerCase();
                  });
                }

                // Filter by flash sale - check against homepage_section2_deals table
                if (showFlashSaleOnly) {
                  // Get product IDs that are in flash sale deals
                  const flashSaleProductIds = flashSaleDeals.map((deal: any) => deal.produk_id);

                  filteredProducts = filteredProducts.filter((product: any) => {
                    return flashSaleProductIds.includes(product?.id);
                  });
                }

                // Sort products
                filteredProducts.sort((a: any, b: any) => {
                  const dateA = new Date(a?.created_at || 0).getTime();
                  const dateB = new Date(b?.created_at || 0).getTime();
                  return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
                });

                return filteredProducts.map((product: any, index: number) => {
                const photoSrc = cacheSrc(product?.photo1) ?? '/images/test1p.png';
                const { category, badge, colorway, description } = deriveProductMeta(product);
                // Use detail_label_previw from database if available, otherwise use derived badge
                const displayLabel = product?.detail_label_previw || badge;
                const priceLabel = Number(product?.harga || 0).toLocaleString('id-ID');
                const heartSrc = isFavorite(product.id) ? '/images/fav-u.png' : '/images/favorit.png';
                const isHovered = hoveredProduct === product.id;

                // Check if this product is in flash sale deals and get discount percentage
                const flashSaleDeal = flashSaleDeals.find((deal: any) => deal.produk_id === product.id);
                const discountPercentage = flashSaleDeal?.discount_percentage ?? null;

                // Calculate grid columns based on screen size
                // We'll use a simple approach: assume 4 columns for xl, 3 for lg, 2 for sm, 1 for mobile
                // For simplicity, let's detect if current card is directly below hovered card
                const getColumnsCount = () => {
                  if (typeof window !== 'undefined') {
                    if (window.innerWidth >= 1280) return 4; // xl
                    if (window.innerWidth >= 1024) return 3; // lg
                    if (window.innerWidth >= 640) return 2; // sm
                  }
                  return 1; // mobile
                };

                const columnsCount = getColumnsCount();
                const isDirectlyBelow = hoveredIndex !== null && index === hoveredIndex + columnsCount;

                const isMainImageLoading = imageLoadingStates[product.id]?.main ?? true;
                const isPreviewImageLoading = imageLoadingStates[product.id]?.preview ?? true;

                return (
                  <div
                    key={product.id}
                    className={`group relative flex flex-col bg-white ${isHovered ? 'z-10 border-t border-l border-r border-black' : 'z-0 border-t border-l border-r border-transparent'} overflow-visible`}
                    onMouseEnter={() => {
                      setHoveredProduct(product.id);
                      setHoveredIndex(index);
                    }}
                    onMouseLeave={() => {
                      setHoveredProduct(null);
                      setHoveredIndex(null);
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden bg-white">
                      {/* Skeleton Loading Animation */}
                      {isMainImageLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%]" />
                      )}

                      {/* Discount percentage badge - rectangular design for product page */}
                      {discountPercentage !== null && discountPercentage !== undefined && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded shadow-lg z-10">
                          -{discountPercentage}%
                        </div>
                      )}
                      <Link
                        href={formatProductUrl(product.id)}
                        className="absolute inset-0 block"
                        aria-label={`Lihat detail ${product.nama_produk || 'Produk'}`}
                      >
                        <div className="absolute inset-0">
                          <Image
                            src={photoSrc}
                            alt={product.nama_produk || 'Produk'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-contain transition-transform duration-500 group-hover:scale-105"
                            onLoad={() => handleImageLoad(product.id, 'main')}
                          />
                        </div>
                        <div className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-in-out group-hover:opacity-100">
                          <Image
                            src={cacheSrc(product?.preview_photo) ?? photoSrc}
                            alt={product.nama_produk || 'Produk'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-contain"
                            onLoad={() => handleImageLoad(product.id, 'preview')}
                          />
                        </div>
                      </Link>
                      {/* Category Label */}
                      {product.kategori && (
                        <div className={`absolute top-2 left-2 bg-gray-500 px-2 py-0.5 rounded-r-md z-10 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                          <span className="text-xs font-belleza font-bold uppercase text-white">
                            {product.kategori}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col px-4 pt-3 pb-4 relative">
                      <div className="flex items-center justify-start text-[10px] uppercase tracking-[0.2em] text-gray-400 font-belleza">
                        <span>MEORIS</span>
                      </div>
                      <Link
                        href={formatProductUrl(product.id)}
                        className="mt-2 font-cormorant text-lg md:text-xl text-black leading-snug group-hover:underline line-clamp-2"
                      >
                        {product.nama_produk || 'Produk'}
                      </Link>
                      <div className={`mt-3 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent`} />

                      {/* Container untuk deskripsi dan ukuran dengan transisi smooth */}
                      <div className="mt-2 relative min-h-[48px]">
                        {/* Deskripsi - muncul saat tidak hover */}
                        <div className={`transition-all duration-500 ease-in-out ${
                          isHovered ? 'opacity-0 translate-y-2 absolute' : 'opacity-100 translate-y-0'
                        }`}>
                          <p className="font-belleza text-xs md:text-sm leading-relaxed text-gray-700 line-clamp-2">
                            {description}
                          </p>
                        </div>

                        {/* List Ukuran - muncul saat hover */}
                        <div className={`transition-all duration-500 ease-in-out ${
                          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 absolute'
                        }`}>
                          <div className="flex flex-col gap-1.5">
                            <span className="font-belleza text-xs text-gray-500 uppercase tracking-wider">Ukuran Tersedia</span>
                            <div className="flex flex-wrap gap-2">
                              {[product.size1, product.size2, product.size3, product.size4, product.size5]
                                .filter(size => size && size.trim() !== '')
                                .map((size, idx) => {
                                  const isSelected = selectedSizes[product.id] === size;
                                  return (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSizeSelect(product.id, size);
                                      }}
                                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded border font-belleza text-xs transition-all duration-200 cursor-pointer ${
                                        isSelected
                                          ? 'border-black bg-black text-white'
                                          : 'border-gray-300 text-gray-700 hover:border-black hover:bg-black hover:text-white'
                                      }`}
                                    >
                                      {size}
                                    </button>
                                  );
                                })
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {/* Price Display - Show discount if available */}
                        {discountPercentage !== null && discountPercentage !== undefined ? (
                          <div className="flex items-center gap-2">
                            {/* Discounted Price */}
                            <p className="font-belleza text-base md:text-lg font-semibold text-red-600">
                              Rp {(Number(product?.harga || 0) * (1 - discountPercentage / 100)).toLocaleString('id-ID')}
                            </p>
                            {/* Original Price - Strikethrough */}
                            <p className="font-belleza text-sm text-gray-500 line-through">
                              Rp {priceLabel}
                            </p>
                          </div>
                        ) : (
                          <p className="font-belleza text-base md:text-lg font-semibold text-black">Rp {priceLabel}</p>
                        )}
                        <button
                          type="button"
                          aria-label={isFavorite(product.id) ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                          className="inline-flex items-center justify-center transition hover:scale-110"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const result = await toggleFavorite(product.id);
                            if (result.success) {
                              if (result.action === 'removed') {
                                showNotification('Produk dihapus dari favorit', 'success');
                              } else {
                                showNotification('Produk berhasil ditambahkan ke favorit!', 'success');
                              }
                            } else {
                              showNotification(result.message || 'Gagal mengupdate favorit', 'error');
                            }
                          }}
                        >
                          <Image
                            src={heartSrc}
                            alt="Favorit"
                            width={24}
                            height={24}
                            className="transition"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button - appears on hover as overlay extending downward */}
                    <div className={`absolute left-[-1px] right-[-1px] top-full px-4 pb-4 bg-white ${
                      isHovered ? 'opacity-100 border-l border-r border-b border-black' : 'opacity-0 pointer-events-none border-l border-r border-b border-transparent'
                    } transition-opacity duration-300 ease-in-out`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(product.id);
                        }}
                        disabled={addingToCart === product.id}
                        className="w-full inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg font-belleza text-sm font-medium hover:bg-black/90 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {addingToCart === product.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="animate-pulse">Menambahkan...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Tambah Ke Keranjang
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              });
            })()
            ) : (
              <div className="col-span-full text-center font-belleza text-gray-500 py-12">Tidak ada produk</div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="bg-black py-6 md:py-16">
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
          {/* Mobile compact footer */}
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
                <li><Link href="/terms-condition" className="hover:underline hover:text-white">Syarat & Ketentuan</Link></li>
                <li><Link href="/privacy-policy" className="hover:underline hover:text-white">Kebijakan Privasi</Link></li>
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
          <div className="hidden md:block md:text-white md:[&_a]:text-white md:[&_p]:text-white md:[&_h4]:text-white md:[&_span]:text-white md:[&_li]:text-white md:[&_svg]:text-white md:[&_span.text-black]:text-white md:[&_p.text-black]:text-white md:[&_a.text-black]:text-white md:[&_h4.text-black]:text-white md:[&_div.text-black]:text-white md:[&_a:hover]:opacity-80">
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
                <p className="font-belleza text-gray-700 text-sm max-w-xs">
                  Sandal berkualitas dengan desain elegan dan nyaman dipakai setiap hari.
                </p>
              </div>

              {/* Belanja */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-black">Belanja</h4>
                <div className="mt-2 w-10 h-[2px] bg-black md:bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-gray-700">
                  <li><Link href="/produk" className="hover:underline">Semua Produk</Link></li>
                </ul>
              </div>

              {/* Bantuan & Layanan */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-black">Bantuan &amp; Layanan</h4>
                <div className="mt-2 w-10 h-[2px] bg-black md:bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-gray-700">
                  <li><a href="#" className="hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan &amp; Hubungi Kami</a></li>
                  <li><Link href="/terms-condition" className="hover:underline">Syarat &amp; Ketentuan</Link></li>
                  <li><Link href="/privacy-policy" className="hover:underline">Kebijakan Privasi</Link></li>
                </ul>
              </div>

              {/* Akun Saya */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-black">Akun Saya</h4>
                <div className="mt-2 w-10 h-[2px] bg-black md:bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-gray-700">
                  <li><Link href="/user/purchase?view=profile" className="hover:underline">Detail Akun</Link></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openCartSidebar')); }}>Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openFavoriteSidebar')); }}>Favorit</a></li>
                  <li><Link href="/produk/pesanan" className="hover:underline">Pesanan</Link></li>
                </ul>
              </div>

              {/* Kontak (alamat + telepon + email) */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-black">Kontak</h4>
                <div className="mt-2 w-10 h-[2px] bg-black md:bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-gray-700">
                  <li className="grid grid-cols-[20px_1fr] md:grid-cols-[28px_1fr] items-start gap-3">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-5 h-5 md:w-6 md:h-6"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                    <span className="text-sm leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] md:grid-cols-[28px_1fr] items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-5 h-5 md:w-6 md:h-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                    <span>+6289695971729</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] md:grid-cols-[28px_1fr] items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-5 h-5 md:w-6 md:h-6"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>info@meoris.id</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar (desktop only) */}
            <div className="mt-10 border-t border-gray-200 md:border-white/30 pt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-gray-600 md:text-white/80 text-sm">
              <p className="font-belleza">&copy; {new Date().getFullYear()} MEORIS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Pop-up */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-[100] animate-slide-in-right">
          <div className={`flex items-center gap-3 rounded-lg shadow-lg px-4 py-3 min-w-[300px] ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className={`font-belleza text-sm ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
              className={`ml-auto flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProdukPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    }>
      <ProdukPageContent />
    </Suspense>
  );
}
