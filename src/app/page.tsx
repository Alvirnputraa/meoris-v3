"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/useCart';
import { useProducts } from '@/lib/useProducts';
import { useFavorites } from '@/lib/useFavorites';
import { useEffect, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import { produkDb, keranjangDb, flashSaleConfigDb, praCheckoutDb } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { DealsCacheProvider, useDealsCache } from '@/lib/DealsCacheContext';
import FlashSaleCountdown from '@/components/FlashSaleCountdown';
import { getHomeCache, setHomeCache, clearHomeCache } from '@/lib/homeCache';
import Script from 'next/script';
import LottiePlayer from '@/components/LottiePlayer';
import FloatingChat from '@/components/FloatingChat';
import { useChatContext } from '@/lib/chat-context';


function PageContent() {
  const router = useRouter();
  const { openChat } = useChatContext();

  // Helper function to remove dashes from UUID
  const formatProductUrl = (productId: string) => {
    return `/produk/${productId.replace(/-/g, '')}/detail`;
  };

  const [phase, setPhase] = useState(0);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [showVoucherBanner, setShowVoucherBanner] = useState(false);
  const [showCopiedNotif, setShowCopiedNotif] = useState(false);
  const [currentVoucherIndex, setCurrentVoucherIndex] = useState(0);
  const [claimedVouchers, setClaimedVouchers] = useState<Set<string>>(new Set());
  const [claimingVoucher, setClaimingVoucher] = useState<string | null>(null);
  const [currentVoucherSlide, setCurrentVoucherSlide] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartSidebarLoading, setCartSidebarLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isFavOpen, setIsFavOpen] = useState(false);
  const [userMenuOpenDesktopTop, setUserMenuOpenDesktopTop] = useState(false);
  const [userMenuOpenDesktopHero, setUserMenuOpenDesktopHero] = useState(false);
  const [userMenuOpenMobile, setUserMenuOpenMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileAccountMenu, setShowMobileAccountMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showNewsletterPopup, setShowNewsletterPopup] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const { items: homeCartItems, loading: homeCartLoading, count: cartCount, refresh, reloadItems, removeItem: removeCartItem, updateQuantity: updateCartQuantity, addItem: addCartItem, incrementCount: incrementCartCount } = useCart();
  const { favorites, loading: favoritesLoading, toggleFavorite, isFavorite, removeFavorite, count: favoritesCount } = useFavorites();
  const { user, hydrated, logout } = useAuth();
  const userHref = !hydrated ? '#' : (user ? '/user/purchase?view=profile' : '/login');
  const preventIfNotHydrated = (e: any) => { if (!hydrated) { e.preventDefault?.(); e.stopPropagation?.(); } };

  // Handle logout
  const handleLogout = async () => {
    if (logout) {
      await logout();
      window.location.href = '/login';
    }
  };

  // Handle navigation to protected pages
  const handleProtectedNavigation = (path: string) => {
    if (!hydrated) return; // Wait for auth to load

    if (user) {
      router.push(path);
    } else {
      router.push('/login');
    }
  };

  // Handle open cart sidebar with loading animation
  const handleOpenCartSidebar = (waitForRefresh = false) => {
    setCartSidebarLoading(true);
    setIsCartOpen(true);

    if (waitForRefresh) {
      // When adding to cart, wait longer to ensure data is refreshed
      setTimeout(() => {
        setCartSidebarLoading(false);
      }, 1200);
    } else {
      setTimeout(() => {
        setCartSidebarLoading(false);
      }, 800);
    }
  };

  // Handle checkout - create pra_checkout and redirect
  const handleCheckout = async () => {
    if (!user || homeCartItems.length === 0) return;

    setCheckoutLoading(true);
    try {
      const { praCheckout } = await praCheckoutDb.create(user.id, homeCartItems);
      setIsCartOpen(false);
      // Use short_id for cleaner, more secure URL
      router.push(`/produk/checkout?id=${praCheckout.short_id}`);
    } catch (error) {
      console.error('Failed to create checkout:', error);
      alert('Gagal membuat checkout. Silakan coba lagi.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Lock body scroll when cart sidebar is open
  useEffect(() => {
    if (isCartOpen) {
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
  }, [isCartOpen]);

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

  // Newsletter popup logic - Show only once every 7 days
  useEffect(() => {
    const NEWSLETTER_STORAGE_KEY = 'meoris_newsletter_closed_at';
    const DAYS_TO_SHOW_AGAIN = 7;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    // Check if newsletter should be shown
    const checkNewsletterStatus = () => {
      try {
        const closedAt = localStorage.getItem(NEWSLETTER_STORAGE_KEY);

        if (!closedAt) {
          // Never shown before, show after 2 seconds
          setTimeout(() => setShowNewsletterPopup(true), 2000);
          return;
        }

        const closedTimestamp = parseInt(closedAt, 10);
        const now = Date.now();
        const daysSinceClosed = (now - closedTimestamp) / MS_PER_DAY;

        if (daysSinceClosed >= DAYS_TO_SHOW_AGAIN) {
          // It's been 7+ days, show again after 2 seconds
          setTimeout(() => setShowNewsletterPopup(true), 2000);
        }
      } catch (error) {
        console.error('Error checking newsletter status:', error);
      }
    };

    checkNewsletterStatus();
  }, []);

  // Lock body scroll when newsletter popup is open
  useEffect(() => {
    if (showNewsletterPopup) {
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
  }, [showNewsletterPopup]);

  // Handle newsletter popup close
  const handleCloseNewsletter = () => {
    try {
      localStorage.setItem('meoris_newsletter_closed_at', Date.now().toString());
      setShowNewsletterPopup(false);
      // Reset form
      setNewsletterEmail('');
      setNewsletterSuccess(false);
      setNewsletterError('');
    } catch (error) {
      console.error('Error saving newsletter close status:', error);
      setShowNewsletterPopup(false);
    }
  };

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newsletterEmail || !newsletterEmail.trim()) {
      setNewsletterError('Email tidak boleh kosong');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setNewsletterError('Format email tidak valid');
      return;
    }

    setNewsletterLoading(true);
    setNewsletterError('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal berlangganan newsletter');
      }

      setNewsletterSuccess(true);
      setNewsletterEmail('');

      // Auto close after 3 seconds on success
      setTimeout(() => {
        handleCloseNewsletter();
      }, 3000);
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      setNewsletterError(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  // Sidebar cart & favorites animation states
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingFavId, setRemovingFavId] = useState<string | null>(null);

  // Flash Sale carousel state
  const [flashSaleIndex, setFlashSaleIndex] = useState(0);

  // Flash Sale config state
  const [flashSaleConfig, setFlashSaleConfig] = useState<any>(null);
  const [flashSaleLoading, setFlashSaleLoading] = useState(true);

  // Vouchers state for section
  const [featuredVouchers, setFeaturedVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [claimingVoucherId, setClaimingVoucherId] = useState<string | null>(null);


// Section 2: dynamic deals from cache
const [dealSlide, setDealSlide] = useState(0);
const { deals, loading: dealsLoading, error: dealsError, refreshDeals } = useDealsCache();

// Posters for left 70% in sync with right slide (static)
const [posters, setPosters] = useState<string[]>([
  '/images/posterr1.png',
  '/images/posterr2.png',
]); // [useState()](src/app/page.tsx:56)

// Notification state used by showNotification
const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
  show: false,
  message: '',
  type: 'success',
}); // [useState()](src/app/page.tsx:61)

// Sizes selection state used by handleSizeSelect
const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({}); // [useState()](src/app/page.tsx:65)

// Hover states for Section 4 (used later)
const [hoveredProduct, setHoveredProduct] = useState<string | null>(null); // [useState()](src/app/page.tsx:67)
const [hoveredIndex, setHoveredIndex] = useState<number | null>(null); // [useState()](src/app/page.tsx:68)

// Add-to-cart state (used later)
const [addingToCart, setAddingToCart] = useState<string | null>(null); // [useState()](src/app/page.tsx:70)

// Newsletter subscription state
const [email, setEmail] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(8);
  const [pageItems, setPageItems] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  // Global page loading state
  const [isPageReady, setIsPageReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [pageError, setPageError] = useState(false);
  const [dataLoadAttempts, setDataLoadAttempts] = useState(0);
  const MAX_LOAD_ATTEMPTS = 3;

  // Latest products for sidebar list
  const [latest, setLatest] = useState<any[]>([]);
  const [latestLoading, setLatestLoading] = useState(false);

  // Function to refresh deals (for manual refresh if needed)
  const handleRefreshDeals = async () => {
    await refreshDeals();
  };

  // Auto-rotate deal slider (super smooth)
  useEffect(() => {
    if (dealsLoading || deals.length === 0) return;
    const t = setInterval(() => {
      setDealSlide((s) => (s + 1) % deals.length);
    }, 3800);
    return () => clearInterval(t);
  }, [dealsLoading, deals.length]);

  // Handle mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-rotate phase slider for Section 1 (3 slides)
  useEffect(() => {
    const t = setInterval(() => {
      setPhase((p) => (p + 1) % 3); // There are 3 slides (0-2)
    }, 4500); // Change every 4.5 seconds for smooth transitions
    return () => clearInterval(t);
  }, []);

  // Fetch flash sale config
  useEffect(() => {
    const fetchFlashSaleConfig = async () => {
      try {
        setFlashSaleLoading(true);
        const config = await flashSaleConfigDb.getActive();
        setFlashSaleConfig(config);
      } catch (error) {
        console.error('Error fetching flash sale config:', error);
      } finally {
        setFlashSaleLoading(false);
      }
    };

    fetchFlashSaleConfig();
  }, []);

  // Fetch featured vouchers (4 latest)
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        setVouchersLoading(true);
        const { data, error } = await supabase
          .from('voucher')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;
        setFeaturedVouchers(data || []);
      } catch (error) {
        console.error('Error fetching vouchers:', error);
        setFeaturedVouchers([]);
      } finally {
        setVouchersLoading(false);
      }
    };

    fetchVouchers();
  }, []);

  // Auto-slide vouchers every 5 seconds (mobile only)
  useEffect(() => {
    if (featuredVouchers.length > 2) {
      const interval = setInterval(() => {
        setCurrentVoucherSlide((prev) => (prev === 0 ? 1 : 0));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [featuredVouchers.length]);

  // Check if all critical data is loaded for page ready state
  useEffect(() => {
    const checkPageReady = () => {
      // Page is ready when:
      // 1. Products are loaded (pageItems or from cache)
      // 2. Latest products are loaded
      // 3. Flash sale config is loaded (or failed)
      // 4. Deals are loaded (or failed)
      const productsReady = !pageLoading && (pageItems.length > 0 || page > 0);
      const latestReady = !latestLoading && (latest.length > 0 || latest.length === 0);
      const flashSaleReady = !flashSaleLoading;
      const dealsReady = !dealsLoading;

      if (productsReady && latestReady && flashSaleReady && dealsReady) {
        // Set ready immediately for smoother experience
        setIsPageReady(true);
      }
    };

    checkPageReady();
  }, [pageLoading, latestLoading, flashSaleLoading, dealsLoading, pageItems.length, latest.length, page]);

  // Hide loader with fade transition after page is ready
  useEffect(() => {
    if (isPageReady) {
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 200); // Allow time for fade transition
      return () => clearTimeout(timer);
    }
  }, [isPageReady]);

  // Force page ready after max 2 seconds to prevent infinite loading
  useEffect(() => {
    const maxLoadTimeout = setTimeout(() => {
      if (!isPageReady) {
        console.warn('[Performance] Max load time (2s) reached, showing page anyway');
        setIsPageReady(true);
      }
    }, 2000);

    return () => clearTimeout(maxLoadTimeout);
  }, [isPageReady]);

  // Handle scroll to section when page loads (supports both hash and sessionStorage)
  useEffect(() => {
    if (!isPageReady) return;

    const scrollToSection = (sectionId: string) => {
      console.log('[Section Scroll] Attempting to scroll to:', sectionId);
      const element = document.getElementById(sectionId);
      console.log('[Section Scroll] Element found:', element);

      if (element) {
        setTimeout(() => {
          const headerOffset = 120; // Height of fixed header
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          console.log('[Section Scroll] Scrolling to position:', offsetPosition);
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }, 300);
      } else {
        console.log('[Section Scroll] Element not found, retrying...');
        // Retry if element not found
        setTimeout(() => {
          const retryElement = document.getElementById(sectionId);
          if (retryElement) {
            const headerOffset = 120;
            const elementPosition = retryElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            console.log('[Section Scroll] Retry scroll to:', offsetPosition);
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          } else {
            console.log('[Section Scroll] Element still not found after retry');
          }
        }, 500);
      }
    };

    // Check sessionStorage first (for cross-page navigation)
    const savedSection = sessionStorage.getItem('scrollToSection');
    console.log('[Section Scroll] Saved section from storage:', savedSection);

    if (savedSection) {
      scrollToSection(savedSection);
      // Clear after use
      sessionStorage.removeItem('scrollToSection');
    } else {
      // Fallback to hash if no sessionStorage
      const hash = window.location.hash;
      console.log('[Section Scroll] Hash from URL:', hash);

      if (hash) {
        const id = hash.replace('#', '');
        scrollToSection(id);
      }
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        scrollToSection(id);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isPageReady]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type });
    }, 3000);
  };

  // Load cart items for sidebar
  useEffect(() => {
    if (!user) {
      setViewItems([]);
      return;
    }
    let cancelled = false;
    const loadCart = async () => {
      try {
        const items = await keranjangDb.getByUserId((user as any).id);
        if (!cancelled) setViewItems(Array.isArray(items) ? items : []);
      } catch (e) {
        if (!cancelled) setViewItems([]);
      }
    };
    loadCart();
    return () => { cancelled = true };
  }, [user, homeCartItems]);
  
  const handleSizeSelect = (productId: string, size: string) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: prev[productId] === size ? '' : size,
    }));
  };
  
  const handleAddToCart = async (productId: string) => {
    if (!user) {
      showNotification('Silakan login terlebih dahulu', 'error');
      window.location.href = '/login';
      return;
    }

    const selectedSize = selectedSizes[productId];
    if (!selectedSize) {
      showNotification('Pilih ukuran terlebih dahulu', 'error');
      return;
    }

    setAddingToCart(productId);

    // Optimistic: show notification and increment count IMMEDIATELY (synchronous)
    showNotification('Produk berhasil ditambahkan ke keranjang!', 'success');
    incrementCartCount(); // This updates badge count instantly before sidebar opens
    setAddingToCart(null);

    // Open cart sidebar with loading animation
    setCartSidebarLoading(true);
    setIsCartOpen(true);

    // Run database operation and minimum loading time in parallel
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 800));
    const addToCartOperation = (async () => {
      try {
        // Add to database and reload items (count already incremented above)
        await keranjangDb.addItem((user as any).id, productId, 1, selectedSize);
        await reloadItems(); // Only reload items, not count (preserves optimistic count)
      } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Terjadi kesalahan, silakan coba lagi', 'error');
      }
    })();

    // Wait for both minimum loading time AND data to be ready
    Promise.all([minLoadingTime, addToCartOperation]).then(() => {
      setCartSidebarLoading(false);
    });
  };

  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false);
  };

  const handleCloseFavSidebar = () => {
    setIsFavOpen(false);
    setSelectedFavorites(new Set());
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('produk')
        .select('*')
        .ilike('nama_produk', `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
      setHasSearched(true);
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    if (!user) return;

    // Set removing state for animation
    setRemovingId(itemId);

    // Wait for slide animation to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Remove item using optimistic update from hook
    await removeCartItem(itemId);

    // Clear removing state
    setRemovingId(null);

    // Show success notification
    showNotification('Item berhasil dihapus dari keranjang', 'success');
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!user) return;

    // Set removing state for animation
    setRemovingFavId(favoriteId);

    // Wait for slide animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Remove item using optimistic update from hook
    await removeFavorite(favoriteId);

    // Clear removing state
    setRemovingFavId(null);
  };

  // Handle claim voucher
  const handleClaimVoucher = async (voucherCode: string) => {
    if (!user) {
      showNotification('Silakan login terlebih dahulu untuk klaim voucher', 'error');
      window.location.href = '/login';
      return;
    }

    // Check if already claimed
    if (claimedVouchers.has(voucherCode)) {
      showNotification('Anda sudah claim voucher ini', 'error');
      return;
    }

    try {
      setClaimingVoucherId(voucherCode);
      setClaimingVoucher(voucherCode);

      const response = await fetch('/api/vouchers/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          voucherCode: voucherCode
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification(data.message || 'Voucher berhasil diklaim!', 'success');
        setClaimedVouchers(prev => new Set(prev).add(voucherCode));
      } else {
        showNotification(data.message || 'Gagal mengklaim voucher', 'error');
      }
    } catch (error) {
      console.error('Error claiming voucher:', error);
      showNotification('Terjadi kesalahan, silakan coba lagi', 'error');
    } finally {
      setClaimingVoucherId(null);
      setClaimingVoucher(null);
    }
  };

  // Handle section newsletter subscription
  const handleSectionNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showNotification('Silakan masukkan email Anda', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmail(''); // Clear the input
        setShowSuccessPopup(true); // Show success popup

        // Hide popup after 5 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 5000);
      } else {
        showNotification(data.error || 'Gagal berlangganan newsletter', 'error');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      showNotification('Terjadi kesalahan, silakan coba lagi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const collectionFilters = [
      'Semua Produk',
      'Best Seller',
      'Koleksi Terbaru',
      'Wedding Series',
      'Eksklusif',
    ];

  const toLabel = (value: unknown, fallback: string): string => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
  };

  const deriveProductMeta = (product: any) => {
    const category = toLabel(product?.kategori ?? product?.koleksi ?? product?.category, 'Signature');
    const badge = toLabel(
      product?.label_produk ?? product?.tag_line ?? product?.badge ?? (product?.diskon ? 'Diskon' : ''),
      category === 'Signature' ? 'Favorit' : category
    );
    const colorway = toLabel(product?.warna ?? product?.color, 'Neutral Tone');
    let description = toLabel(
      product?.deskripsi ?? product?.description ?? product?.short_description ?? '',
      ''
    );
    // Batasi deskripsi maksimal 7 kata
    const words = description.trim().split(/\s+/);
    if (words.length > 7) {
      description = words.slice(0, 7).join(' ') + '...';
    }
    if (!description) {
      description = 'Siluet elegan dengan material premium untuk kenyamanan sepanjang hari.';
    }
    return { category, badge, colorway, description };
  };
// URL normalizer for images (product posters, photo1/preview_photo)
// - Use direct remote URL for Supabase Storage (signed/public) to avoid proxy/caching issues
// - Otherwise, route via local cache endpoint
const cacheSrc = (url?: string | null) => { // [cacheSrc()](src/app/page.tsx:250)
  const s = (url || '').trim();
  if (!s) return null;
  if (s.startsWith('/')) return s; // already local
  try {
    const u = new URL(s);
    // Bypass cache for Supabase Storage signed/public URLs
    if (u.hostname.endsWith('supabase.co') && u.pathname.startsWith('/storage/v1/object')) {
      return s;
    }
  } catch {
    // Not an absolute URL, fallback to cache proxy
  }
  // route remote URL via local cache to store under public/images/cache
  return `/api/cache-image?url=${encodeURIComponent(s)}`;
};

  // Load total count once for page indicator
  useEffect(() => {
    let cancelled = false;
    const loadCount = async () => {
      try {
        const { count } = await supabase
          .from('produk')
          .select('*', { count: 'exact', head: true });
        if (!cancelled) setTotalCount(typeof count === 'number' ? count : 0);
      } catch {
        if (!cancelled) setTotalCount(0);
      }
    };
    loadCount();
    return () => { cancelled = true };
  }, []);

  // Load products for homepage with cache
  useEffect(() => {
    let cancelled = false;
    const loadWithCache = async () => {
      try {
        setPageLoading(true);
        setPageError(false);

        // Try to load from cache first
        const cachedData = getHomeCache();
        if (cachedData && page === 0) {
          // Use cached data immediately
          if (!cancelled) {
            setPageItems(cachedData.pageItems);
            setLatest(cachedData.latest);
            setHasNext(cachedData.pageItems.length === pageSize);
            setIsPageReady(true);
            setPageLoading(false);
            setLatestLoading(false);
          }

          // Still fetch from database in background to check for updates
          try {
            const [freshPageData, freshLatestData] = await Promise.all([
              produkDb.getAll(pageSize, 0),
              produkDb.getAll(10, 0)
            ]);

            if (!cancelled) {
              // Check if data has changed
              const pageDataChanged = JSON.stringify(freshPageData) !== JSON.stringify(cachedData.pageItems);
              const latestDataChanged = JSON.stringify(freshLatestData) !== JSON.stringify(cachedData.latest);

              if (pageDataChanged || latestDataChanged) {
                // Update with fresh data
                setPageItems(Array.isArray(freshPageData) ? freshPageData : []);
                setLatest(Array.isArray(freshLatestData) ? freshLatestData : []);
                setHasNext((freshPageData || []).length === pageSize);

                // Update cache
                setHomeCache(
                  Array.isArray(freshPageData) ? freshPageData : [],
                  Array.isArray(freshLatestData) ? freshLatestData : []
                );
              }
            }
          } catch (bgError) {
            console.error('Background refresh error:', bgError);
            // Keep using cached data on background refresh error
          }
          return;
        }

        // No cache or not first page, load from database
        const offset = page * pageSize;
        const data = await produkDb.getAll(pageSize, offset);

        if (cancelled) return;

        setPageItems(Array.isArray(data) ? data : []);
        setHasNext((data || []).length === pageSize);

        // Cache first page data
        if (page === 0 && Array.isArray(data)) {
          const latestData = await produkDb.getAll(10, 0);
          setHomeCache(data, Array.isArray(latestData) ? latestData : []);
        }

        setIsPageReady(true);
        setDataLoadAttempts(0);
      } catch (e) {
        console.error('Error loading products:', e);
        if (!cancelled) {
          setPageItems([]);
          setHasNext(false);
          setDataLoadAttempts(prev => prev + 1);

          if (dataLoadAttempts + 1 >= MAX_LOAD_ATTEMPTS) {
            setPageError(true);
            showNotification('Tidak dapat menampilkan halaman, silahkan refresh halaman.', 'error');
          }
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };
    loadWithCache();
    return () => { cancelled = true };
  }, [page, pageSize, dataLoadAttempts]);

  // Latest products for sidebar list (Section 4)
  useEffect(() => {
    let cancelled = false;
    const loadLatest = async () => {
      try {
        setLatestLoading(true);
        setPageError(false);

        // Check cache first
        const cachedData = getHomeCache();
        if (cachedData) {
          if (!cancelled) {
            setLatest(cachedData.latest);
            setLatestLoading(false);
            setIsPageReady(true);
          }
          return;
        }

        // Load from database if no cache
        const data = await produkDb.getAll(10, 0);
        if (!cancelled) {
          setLatest(Array.isArray(data) ? data : []);
          setIsPageReady(true);
          setDataLoadAttempts(0);
        }
      } catch (e) {
        console.error('Gagal memuat produk terbaru', e);
        if (!cancelled) {
          setLatest([]);
          setDataLoadAttempts(prev => prev + 1);

          if (dataLoadAttempts + 1 >= MAX_LOAD_ATTEMPTS) {
            setPageError(true);
            showNotification('Tidak dapat menampilkan halaman, silahkan refresh halaman.', 'error');
          }
        }
      } finally {
        if (!cancelled) setLatestLoading(false);
      }
    };
    loadLatest();
    return () => { cancelled = true };
  }, [dataLoadAttempts]);

  // Sticky desktop header - always show on desktop
  useEffect(() => {
    // Always show sticky header on desktop
    setShowSticky(true);
  }, []);

  // Voucher banner on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowVoucherBanner(true);
      } else {
        setShowVoucherBanner(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-slide voucher every 4 seconds with smooth transition
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

  // Handle claim voucher

  // Reveal-on-scroll for section cards
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    // Use different thresholds for mobile vs desktop
    const isMobile = window.innerWidth < 768;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            // Reveal once and keep it visible for smooth UX
            el.classList.add('is-visible');
            obs.unobserve(el);
          }
          // Do not remove visibility on scroll-out to avoid flicker
        });
      },
      // Lower threshold for mobile to ensure content appears
      isMobile
        ? { threshold: 0.01, rootMargin: '20% 0px 0% 0px' }
        : { threshold: 0.05, rootMargin: '30% 0px 0% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [vouchersLoading]);

  // Scroll-driven URL path updates per section
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('section[data-route]'));
    if (sections.length === 0) return;

    let current = window.location.pathname;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!vis) return;
        const el = vis.target as HTMLElement;
        const route = el.getAttribute('data-route');
        if (!route || route === current) return;
        window.history.replaceState(null, '', route);
        current = route;
      },
      { threshold: 0.55, rootMargin: '0px 0px -10% 0px' }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // On initial load, if the path matches a section route, scroll to it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const target = document.querySelector<HTMLElement>(`section[data-route="${path}"]`);
    if (target) {
      // slight delay to ensure layout is ready
      setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          target.scrollIntoView();
        }
      }, 50);
    }
  }, []);

  // Carousel images for Section 1 (desktop)
  const carouselImages = [
    '/images_section1/view1.png',
    '/images_section1/view2.png',
    '/images_section1/view3.png'
  ];

  // Carousel images for Section 1 (mobile)
  const carouselImagesMobile = [
    '/images_section1/mobile/view1.png',
    '/images_section1/mobile/view2.png',
    '/images_section1/mobile/view3.png'
  ];

  return (
      <main className="min-h-screen font-belleza">
      {/* Lottie Script */}
      <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="beforeInteractive" />

      {/* Global Loading Overlay with Lottie - with fade transition */}
      {showLoader && !pageError && (
        <div
          className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-200 ${
            isPageReady ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <LottiePlayer
            autoplay
            loop
            mode="normal"
            src="/images/7iaKJ6872I.json"
            style={{ width: 120, height: 120 }}
          />
        </div>
      )}

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
                      {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{mounted && user ? ((user as any)?.nama || user.email) : 'User'}</p>
                      <p className="text-[10px] text-gray-300 truncate">{mounted && user ? user.email : ''}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="p-3 pt-5">
              <ul className="space-y-1 font-belleza">
                <li>
                  <a href="/" onClick={() => setIsSidebarOpen(false)} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
                  <Link href="/produk" onClick={() => setIsSidebarOpen(false)} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
                  <a href={userHref} onClick={(e) => { preventIfNotHydrated(e); setIsSidebarOpen(false); }} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
                  <Link href="/pengembalian" onClick={() => setIsSidebarOpen(false)} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
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
                  <a href={!hydrated ? '#' : (user ? "/produk/pesanan" : "/login")} onClick={(e) => { preventIfNotHydrated(e); setIsSidebarOpen(false); }} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Pesanan</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </li>
                <li>
                  <a href={!hydrated ? '#' : (user ? "/histori/transaksi" : "/login")} onClick={(e) => { preventIfNotHydrated(e); setIsSidebarOpen(false); }} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">History Transaksi</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
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
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseSearchSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            {/* Pull-tab close button on the left edge */}
            <button
              type="button"
              aria-label="Tutup pencarian"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={handleCloseSearchSidebar}
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
                {(() => {
                  console.log('Search State:', { searchLoading, hasSearched, resultsCount: searchResults.length, query: searchQuery });
                  return null;
                })()}
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
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsCartOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            {/* Pull-tab close button on the left edge */}
            <button
              type="button"
              aria-label="Tutup keranjang"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={() => setIsCartOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
                  <circle cx="9" cy="21" r="1" fill="currentColor"/>
                  <circle cx="20" cy="21" r="1" fill="currentColor"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-cormorant text-xl md:text-2xl text-black">Item Keranjang</span>
              </div>
            </div>

            <div className="mt-6">
              {/* Loading State - Skeleton untuk seluruh konten */}
              {(homeCartLoading || cartSidebarLoading) ? (
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
                    {homeCartItems.length === 0 ? (
                      <p className="text-sm text-gray-600">Keranjang kosong</p>
                    ) : (
                      homeCartItems.map((item: any) => (
                        <div
                          key={item.id}
                          className={`border-b border-gray-100 pb-4 transition-all duration-500 ease-in-out overflow-hidden ${removingId === item.id ? 'opacity-0 translate-x-full scale-75 max-h-0 py-0 my-0' : 'opacity-100 translate-x-0 scale-100 max-h-48 py-0'}`}
                        >
                          <div className="flex gap-3">
                            {/* Product Image */}
                            <div className="relative w-20 h-20 overflow-hidden bg-gray-50 shrink-0">
                              {item.produk?.photo1 ? (
                                <Image src={item.produk.photo1} alt={item.produk?.nama_produk || "Produk"} fill sizes="80px" className="object-cover" />
                              ) : (
                                <Image src="/images/test1p.png" alt="Produk" fill sizes="80px" className="object-cover" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-belleza text-sm text-gray-900 leading-tight line-clamp-2">{item.produk?.nama_produk || "Produk"}</p>
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
                                <p className="font-belleza text-sm font-medium text-gray-900">Rp {(Number(item.produk?.harga || 0) * item.quantity).toLocaleString("id-ID")}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {homeCartItems.reduce((sum:any, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString("id-ID")}</p>
                    <div className="mt-4 flex flex-col items-stretch gap-3">
                      <button
                        type="button"
                        disabled={homeCartItems.length === 0 || checkoutLoading}
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
      {isFavOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseFavSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6">
            {/* Pull-tab close button on the left edge */}
            <button
              type="button"
              aria-label="Tutup favorit"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={() => setIsFavOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Favorit</span>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-5 overflow-hidden">
              {favoritesLoading && favorites.length === 0 ? (
                <p className="text-sm text-gray-600">Memuat favorit...</p>
              ) : favorites.length === 0 ? (
                <p className="text-sm text-gray-600">Belum ada favorit</p>
              ) : (
                favorites.map((favorite) => (
                  <Link
                    key={favorite.id}
                    href={formatProductUrl(favorite.produk_id)}
                    className={`flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer transition-all duration-300 ease-in-out overflow-hidden ${removingFavId === favorite.id ? 'opacity-0 translate-x-full scale-75 max-h-0 py-0 my-0' : 'opacity-100 translate-x-0 scale-100 max-h-32 py-2'}`}
                  >
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
                      className="p-2 rounded hover:bg-gray-100 text-black transition-colors disabled:opacity-50"
                      disabled={removingFavId === favorite.id}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await handleRemoveFavorite(favorite.id);
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

      {/* Top black bar - Same as user/purchase */}
      <div className="fixed top-0 left-0 right-0 w-full bg-black h-8 md:h-10 z-[59]">
        <div className="w-full max-w-[1160px] mx-auto h-full flex items-center justify-between px-6 md:px-8 lg:px-10">
          <p className="font-belleza text-white text-xs md:text-sm overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-typing">
              <span className="font-bold">Dapatkan potongan diskon dan pengiriman</span> - <span
                className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => {
                  // Scroll to voucher section on the same page
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
              onClick={() => handleProtectedNavigation('/user/purchase?pesanan-saya=all')}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              LACAK PESANAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleProtectedNavigation('/user/purchase?view=notifications')}
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
            {/* Search Icon - Scroll to search field */}
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
                  <button
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      handleProtectedNavigation('/user/purchase?view=purchase');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Pesanan</span>
                  </button>
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
                        onClick={async () => {
                          try {
                            await logout();
                            setIsMobileSidebarOpen(false);
                            router.push('/');
                          } catch (error) {
                            console.error('Logout error:', error);
                          }
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

      {/* Section 1: Carousel Banner with 3 Slides */}
      <section className="relative w-full overflow-hidden pt-[84px] md:pt-[130px]" data-route="/home">
        <div className="relative w-full h-[400px] md:h-[35vh] lg:h-[38vh] xl:h-[58vh]">
        {/* Mobile header removed - using Header component instead */}
        <div className="hidden">
          <div className="w-full flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Buka menu"
                className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Image src="/images/sidebar.png" alt="Menu" width={26} height={26} />
              </button>
              <span className="font-cormorant font-bold text-xl tracking-wide text-black select-none">MEORIS</span>
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
              <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); handleOpenCartSidebar(); }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <circle cx="9" cy="21" r="1" fill="currentColor"/>
                  <circle cx="20" cy="21" r="1" fill="currentColor"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
              </a>
              <div className="relative" onMouseEnter={() => setUserMenuOpenMobile(true)} onMouseLeave={() => setUserMenuOpenMobile(false)}>
                <a href={userHref} onClick={preventIfNotHydrated} aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer block">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${userMenuOpenMobile ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                  {mounted && user ? (
                    <>
                      <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || user.email}</div>
                      <a href="/user/purchase?view=profile" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</a>
                      <a href="/user/purchase?view=address" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat Saya</a>
                      <a href="/histori/transaksi" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Histori Transaksi</a>
                    </>
                  ) : (
                    <a href="/login" className="block px-4 py-2 text-sm text-black hover:bg-gray-50 font-medium">Masuk/Daftar</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative w-full h-full">
          {/* Slides - Desktop (Large screens only, 1280px+) */}
          {carouselImages.map((imgSrc, index) => (
            <div
              key={`desktop-${index}`}
              className={`hidden xl:block absolute inset-0 transition-all duration-1000 ease-in-out ${
                phase === index
                  ? 'opacity-100 translate-x-0'
                  : phase < index
                    ? 'opacity-0 translate-x-full'
                    : 'opacity-0 -translate-x-full'
              }`}
            >
              {index === 0 ? (
                <Link href="/produk/d9ab3f1f157940a6982a4d5216f55626/detail" className="block w-full h-full cursor-pointer">
                  <Image
                    src={imgSrc}
                    alt={`Banner Slide ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    priority={index === 0}
                  />
                </Link>
              ) : index === 2 ? (
                <Link href="/produk/3fca5cad216141888d6b23bb84a51370/detail" className="block w-full h-full cursor-pointer">
                  <Image
                    src={imgSrc}
                    alt={`Banner Slide ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    priority={false}
                  />
                </Link>
              ) : (
                <Image
                  src={imgSrc}
                  alt={`Banner Slide ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover object-center"
                  priority={false}
                />
              )}
            </div>
          ))}

          {/* Slides - Mobile & Tablet (up to 1279px) */}
          {carouselImagesMobile.map((imgSrc, index) => (
            <div
              key={`mobile-${index}`}
              className={`xl:hidden absolute inset-0 transition-all duration-1000 ease-in-out ${
                phase === index
                  ? 'opacity-100 translate-x-0'
                  : phase < index
                    ? 'opacity-0 translate-x-full'
                    : 'opacity-0 -translate-x-full'
              }`}
            >
              {index === 0 ? (
                <Link href="/produk/d9ab3f1f157940a6982a4d5216f55626/detail" className="block w-full h-full cursor-pointer">
                  <Image
                    src={imgSrc}
                    alt={`Banner Slide ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain object-top md:object-cover md:object-center"
                    priority={index === 0}
                  />
                </Link>
              ) : index === 2 ? (
                <Link href="/produk/3fca5cad216141888d6b23bb84a51370/detail" className="block w-full h-full cursor-pointer">
                  <Image
                    src={imgSrc}
                    alt={`Banner Slide ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain object-top md:object-cover md:object-center"
                    priority={false}
                  />
                </Link>
              ) : (
                <Image
                  src={imgSrc}
                  alt={`Banner Slide ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-contain object-top md:object-cover md:object-center"
                  priority={false}
                />
              )}

              {/* Label & Button - Only on first slide (index 0) */}
              {index === 0 && (
                <div className="absolute bottom-20 left-4 md:left-8 z-10 flex flex-col items-start gap-2 md:gap-3">
                  {/* Label "Ayo lihat disini" */}
                  <div className="bg-black text-white px-3 md:px-6 py-0.5 md:py-2 inline-flex items-center justify-center transform -rotate-2">
                    <span className="font-belleza text-xs md:text-base tracking-wide">Ayo lihat disini</span>
                  </div>

                  {/* Button Neo Brutalism */}
                  <Link
                    href="/produk"
                    className="inline-block bg-white text-black border-2 md:border-3 border-black px-4 md:px-8 py-1.5 md:py-3 font-bold text-xs md:text-sm uppercase tracking-wide transform hover:translate-x-0.5 hover:translate-y-0.5 transition-transform animate-bounce"
                    style={{ boxShadow: '4px 4px 0px rgba(0, 0, 0, 1)' }}
                  >
                    Lihat Produk
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Section 2: Horizontal Category Bar */}
      <section className="relative bg-white -mt-8 md:mt-3 lg:mt-4" data-route="/home">
        <div className="w-full">
          {/* Full Width Box with Horizontal Labels */}
          <div className="w-full py-3 md:py-4 flex items-center justify-center gap-4 md:gap-8 lg:gap-12 border-y border-gray-300">
            {/* Pria */}
            <Link href="/produk?gender=Pria">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold animate-label-blink cursor-pointer border-2 px-4 py-1" style={{ fontFamily: 'Gildsley, serif' }}>
                Pria
              </h3>
            </Link>

            {/* Wanita */}
            <Link href="/produk?gender=Wanita">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold animate-label-blink cursor-pointer border-2 px-4 py-1" style={{ fontFamily: 'Gildsley, serif' }}>
                Wanita
              </h3>
            </Link>

            {/* Anak */}
            <Link href="/produk?gender=Anak">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold animate-label-blink cursor-pointer border-2 px-4 py-1" style={{ fontFamily: 'Gildsley, serif' }}>
                Anak
              </h3>
            </Link>
          </div>
        </div>
      </section>

        {/* Section 3: New Arrivals */}
        <section id="new-arrivals" className="relative bg-white pt-2 md:pt-3 lg:pt-4 pb-4 md:pb-6 lg:pb-8 reveal-on-scroll-up" data-route="/home" data-reveal>
          <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
            {/* Polygon Background Card Container */}
            <div className="relative overflow-hidden rounded-xl px-4 md:px-6 py-6 md:py-8 lg:py-10">
              {/* Canvas for polygon background */}
              <canvas
                ref={(canvas) => {
                  if (!canvas) return;

                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;

                  const isMobile = () => window.innerWidth < 768;

                  // Seeded random number generator for consistent pattern
                  class SeededRandom {
                    private seed: number;

                    constructor(seed: number) {
                      this.seed = seed;
                    }

                    next() {
                      this.seed = (this.seed * 9301 + 49297) % 233280;
                      return this.seed / 233280;
                    }
                  }

                  const resize = () => {
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    drawPolygons();
                  };

                  const drawPolygons = () => {
                    const w = canvas.width;
                    const h = canvas.height;

                    ctx.clearRect(0, 0, w, h);

                    const cols = 18;
                    const rows = 10;
                    // No jitter for mobile (straight edges), jitter for desktop
                    const jitter = isMobile() ? 0 : 40;

                    // Use seeded random for consistent pattern (seed: 12345)
                    const rng = new SeededRandom(12345);
                    const points: Array<{x: number; y: number}> = [];

                    for (let y = 0; y <= rows; y++) {
                      for (let x = 0; x <= cols; x++) {
                        const px = (x / cols) * w + (rng.next() - 0.5) * jitter;
                        const py = (y / rows) * h + (rng.next() - 0.5) * jitter;
                        points.push({ x: px, y: py });
                      }
                    }

                    const idx = (x: number, y: number) => y * (cols + 1) + x;

                    // Reset random for triangle colors
                    const colorRng = new SeededRandom(54321);

                    for (let y = 0; y < rows; y++) {
                      for (let x = 0; x < cols; x++) {
                        const p1 = points[idx(x, y)];
                        const p2 = points[idx(x + 1, y)];
                        const p3 = points[idx(x, y + 1)];
                        const p4 = points[idx(x + 1, y + 1)];

                        drawTriangle(p1, p2, p3, colorRng);
                        drawTriangle(p3, p2, p4, colorRng);
                      }
                    }
                  };

                  const drawTriangle = (a: {x: number; y: number}, b: {x: number; y: number}, c: {x: number; y: number}, rng: SeededRandom) => {
                    const base = 10 + rng.next() * 45;
                    const light = base + rng.next() * 25;

                    const fill = `rgb(${base},${base},${base})`;
                    const stroke = `rgba(${light},${light},${light},0.25)`;

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineTo(c.x, c.y);
                    ctx.closePath();

                    ctx.fillStyle = fill;
                    ctx.fill();

                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                  };

                  // Initial draw
                  resize();

                  // Only redraw on resize, no animation
                  const resizeObserver = new ResizeObserver(resize);
                  resizeObserver.observe(canvas);

                  return () => resizeObserver.disconnect();
                }}
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 0 }}
              />

              {/* Gradient overlay for depth */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 15% 10%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.18), transparent 60%)',
                  mixBlendMode: 'screen',
                  opacity: 0.5,
                  zIndex: 1
                }}
              />

              {/* Content wrapper with higher z-index */}
              <div className="relative" style={{ zIndex: 2 }}>
              {/* Header */}
              <div className="text-center mb-10 md:mb-12">
                <h2 className="font-cormorant text-2xl md:text-3xl lg:text-4xl text-white font-bold mb-1">
                  NEW ARRIVALS
                </h2>
                <p className="font-belleza text-xs md:text-sm text-gray-200 mb-4">
                  Koleksi Produk Terbaru Kami
                </p>
                {/* Decorative horizontal line */}
                <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
                  <div className="w-2 h-2 rotate-45 bg-gray-300"></div>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300"></div>
                </div>
              </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-4">
              {latestLoading ? (
                // Loading State
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`group h-full ${i > 1 && i <= 3 ? 'hidden md:block lg:block' : i > 3 ? 'hidden lg:block' : ''}`}>
                      <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md">
                        <div className="relative aspect-square bg-gray-200 animate-pulse"></div>
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : latest.length > 0 ? (
                latest.slice(0, 5).map((product: any, index: number) => (
                  <div
                    key={product.id}
                    className={`group h-full ${index > 1 && index <= 3 ? 'hidden md:block lg:block' : index > 3 ? 'hidden lg:block' : ''}`}
                  >
                    <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                      {/* Product Image */}
                      <Link href={formatProductUrl(product.id)}>
                        <div className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer">
                          <Image
                            src={cacheSrc(product?.photo1) || cacheSrc(product?.gambar_urls?.[0]) || '/images/test1p.png'}
                            alt={product.nama_produk || 'Produk'}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                          />
                          {/* New Badge */}
                          <div className="absolute top-2 left-2 bg-gray-500 text-white px-0.5 py-1 text-[10px] font-belleza font-bold uppercase">
                            <span className="rotate-180 tracking-widest" style={{ writingMode: 'vertical-rl' }}>BARU</span>
                          </div>
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <Link href={formatProductUrl(product.id)}>
                          <h3 className="font-cormorant text-sm font-semibold text-gray-900 mb-1 group-hover:text-black transition-colors line-clamp-2 cursor-pointer">
                            {product.nama_produk || 'Produk'}
                          </h3>
                        </Link>
                        <div className="flex flex-col gap-1">
                          <span className="font-belleza text-sm text-black font-bold">
                            Rp {product.harga?.toLocaleString('id-ID') || '0'}
                          </span>
                          <Link href={formatProductUrl(product.id)}>
                            <button className="w-full bg-black text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors duration-300">
                              Lihat
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // No Products
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-200 text-lg">Tidak ada produk terbaru</p>
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Flash Sale Products */}
<section className="relative bg-white pb-2 md:pb-3 lg:pb-4 reveal-on-scroll-up" data-route="/home" data-reveal>
  <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
    {/* Flash Sale Card with body.png background */}
    <div className="relative overflow-hidden rounded-xl">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images_section3/body.png"
          alt="Flash Sale Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Flash Sale Icon and Countdown - Top */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20 flex items-center gap-3 md:gap-4">
        {/* Icon */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0 animate-float-flashsale">
          <Image
            src="/images_section3/icon_flashsale.png"
            alt="Flash Sale Icon"
            fill
            className="object-contain"
          />
        </div>

        {/* Countdown - positioned next to icon for both mobile and desktop */}
        <div>
          {flashSaleLoading ? (
            <div className="h-8 bg-white/10 rounded-lg w-32 animate-pulse"></div>
          ) : flashSaleConfig && flashSaleConfig.end_time ? (
            <FlashSaleCountdown endTime={flashSaleConfig.end_time} />
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 pt-28 pb-10 md:pt-36 md:pb-6 lg:pt-40 lg:pb-8 px-4 md:px-6">

        {/* Products Grid - Mobile: 2, Tablet: 3, Desktop: 5 */}
        <div className="relative">
          {/* Navigation Buttons - Mobile: 2 products */}
          {!dealsLoading && deals.length > 2 && (
            <>
              {/* Left Arrow - Mobile Only */}
              <button
                onClick={() => {
                  setFlashSaleIndex((prev) => Math.max(0, prev - 2));
                }}
                disabled={flashSaleIndex === 0}
                className={`md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all ${
                  flashSaleIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Previous"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Right Arrow - Mobile Only */}
              <button
                onClick={() => {
                  setFlashSaleIndex((prev) => Math.min(deals.length - 2, prev + 2));
                }}
                disabled={flashSaleIndex >= deals.length - 2}
                className={`md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all ${
                  flashSaleIndex >= deals.length - 2 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Next"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Navigation Buttons - Tablet/Desktop Medium: 3 products */}
          {!dealsLoading && deals.length > 3 && (
            <>
              {/* Left Arrow - Tablet/Desktop Medium Only */}
              <button
                onClick={() => {
                  setFlashSaleIndex((prev) => Math.max(0, prev - 3));
                }}
                disabled={flashSaleIndex === 0}
                className={`hidden md:block xl:hidden absolute left-8 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all ${
                  flashSaleIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Previous"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Right Arrow - Tablet/Desktop Medium Only */}
              <button
                onClick={() => {
                  setFlashSaleIndex((prev) => Math.min(deals.length - 3, prev + 3));
                }}
                disabled={flashSaleIndex >= deals.length - 3}
                className={`hidden md:block xl:hidden absolute right-8 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all ${
                  flashSaleIndex >= deals.length - 3 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Next"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}


          <div className="overflow-hidden">
            <div className="flex gap-3 md:gap-4 justify-center px-2">
              {/* Mobile View - Show 2 products based on index */}
              <div className="md:hidden grid grid-cols-2 gap-4 w-full px-2">
                {!dealsLoading && deals.length > 0 ? (
                  deals.slice(flashSaleIndex, flashSaleIndex + 2).map((deal, index) => (
                    <Link
                      key={deal.id || index}
                      href={formatProductUrl(deal.produk_id)}
                      className="group h-full"
                    >
                      <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                        {/* Product Image */}
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <Image
                            src={cacheSrc(deal.img) || deal.img}
                            alt={deal.produk?.nama_produk || "Produk"}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            sizes="50vw"
                          />
                          {/* Discount Badge */}
                          {deal.discountPercentage && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                              -{deal.discountPercentage}%
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <h3 className="font-cormorant text-sm font-semibold text-gray-900 mb-1 group-hover:text-black transition-colors line-clamp-2">
                            {deal.produk?.nama_produk || "Produk"}
                          </h3>

                          {/* Price */}
                          <div className="flex flex-col gap-0.5 mb-2">
                            {deal.old && (
                              <span className="font-belleza text-xs text-gray-500 line-through">{deal.old}</span>
                            )}
                            <span className="font-belleza text-sm text-red-600 font-bold">{deal.new}</span>
                          </div>

                          {/* Buy Button */}
                          <button className="w-full bg-black text-white py-1.5 rounded-lg font-belleza text-xs hover:bg-gray-800 transition-colors duration-300">
                            Lihat
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : dealsLoading ? (
                  <>
                    {[1, 2].map((i) => (
                      <div key={i} className="group h-full">
                        <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-md">
                          <div className="relative aspect-square bg-gray-200 animate-pulse"></div>
                          <div className="p-3 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>

              {/* Tablet/Desktop Medium View - Show 3 products based on index */}
              <div className="hidden md:flex xl:hidden gap-3 justify-center">
                {!dealsLoading && deals.length > 0 ? (
                  deals.slice(flashSaleIndex, flashSaleIndex + 3).map((deal, index) => (
                <Link
                  key={deal.id || index}
                  href={formatProductUrl(deal.produk_id)}
                  className="group"
                >
                  <div className="bg-white rounded-lg overflow-hidden shadow-md w-44 md:w-48">
                    {/* Product Image */}
                    <div className="relative h-32 md:h-36">
                      <Image
                        src={cacheSrc(deal.img) || deal.img}
                        alt={deal.produk?.nama_produk || "Produk"}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                      {/* Discount Badge */}
                      {deal.discountPercentage && (
                        <div className="absolute top-1 left-1 bg-red-600 text-white px-1.5 py-0.5 rounded-full shadow-lg">
                          <span className="font-bold text-xs">-{deal.discountPercentage}%</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-2">
                      <h3 className="font-cormorant text-sm font-semibold text-gray-900 mb-0.5 line-clamp-2">
                        {deal.produk?.nama_produk || "Produk"}
                      </h3>

                      {/* Labels */}
                      {deal.title && (
                        <p className="font-belleza text-[10px] text-gray-600 uppercase tracking-wide mb-0.5 line-clamp-1">
                          {deal.title}
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex flex-col gap-0.5 mb-1">
                        <span className="font-belleza text-xs text-gray-500 line-through">{deal.old}</span>
                        <span className="font-belleza text-sm text-red-600 font-bold">{deal.new}</span>
                      </div>

                      {/* Buy Button */}
                      <button className="w-full bg-black text-white py-1 rounded-lg font-belleza text-xs hover:bg-gray-800 transition-colors duration-300">
                        Lihat
                      </button>
                    </div>
                  </div>
                </Link>
              ))
            ) : dealsLoading ? (
              // Loading State - Tablet (3 products)
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md w-48 flex-shrink-0">
                    <div className="h-36 bg-gray-200 animate-pulse"></div>
                    <div className="p-2 space-y-1">
                      <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : null}
              </div>

              {/* Desktop Large View - Show 5 products */}
              <div className="hidden xl:flex gap-3 justify-center">
                {!dealsLoading && deals.length > 0 ? (
                  deals.slice(0, 5).map((deal, index) => (
                <Link
                  key={deal.id || index}
                  href={formatProductUrl(deal.produk_id)}
                  className="group"
                >
                  <div className="bg-white rounded-lg overflow-hidden shadow-md w-44 md:w-48">
                    {/* Product Image */}
                    <div className="relative h-32 md:h-36">
                      <Image
                        src={cacheSrc(deal.img) || deal.img}
                        alt={deal.produk?.nama_produk || "Produk"}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                      {/* Discount Badge */}
                      {deal.discountPercentage && (
                        <div className="absolute top-1 left-1 bg-red-600 text-white px-1.5 py-0.5 rounded-full shadow-lg">
                          <span className="font-bold text-xs">-{deal.discountPercentage}%</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-2">
                      <h3 className="font-cormorant text-sm font-semibold text-gray-900 mb-0.5 line-clamp-2">
                        {deal.produk?.nama_produk || "Produk"}
                      </h3>

                      {/* Labels */}
                      {deal.title && (
                        <p className="font-belleza text-[10px] text-gray-600 uppercase tracking-wide mb-0.5 line-clamp-1">
                          {deal.title}
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex flex-col gap-0.5 mb-1">
                        <span className="font-belleza text-xs text-gray-500 line-through">{deal.old}</span>
                        <span className="font-belleza text-sm text-red-600 font-bold">{deal.new}</span>
                      </div>

                      {/* Buy Button */}
                      <button className="w-full bg-black text-white py-1 rounded-lg font-belleza text-xs hover:bg-gray-800 transition-colors duration-300">
                        Lihat
                      </button>
                    </div>
                  </div>
                </Link>
              ))
            ) : dealsLoading ? (
              // Loading State - Desktop (5 products)
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md w-48 flex-shrink-0">
                    <div className="h-36 bg-gray-200 animate-pulse"></div>
                    <div className="p-2 space-y-1">
                      <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : null}
              </div>
            </div>
          </div>

          {/* Pagination Dots - Mobile Only (2 products per slide) */}
          {!dealsLoading && deals.length > 2 && (
            <div className="md:hidden flex justify-center gap-2 mt-4">
              {Array.from({ length: Math.ceil(deals.length / 2) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setFlashSaleIndex(index * 2)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    flashSaleIndex === index * 2 ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Pagination Dots - Tablet/Desktop Medium Only (3 products per slide) */}
          {!dealsLoading && deals.length > 3 && (
            <div className="hidden md:flex xl:hidden justify-center gap-2 mt-5">
              {Array.from({ length: Math.ceil(deals.length / 3) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setFlashSaleIndex(index * 3)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    flashSaleIndex === index * 3 ? 'bg-white w-7' : 'bg-white/50'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* No Deals Message */}
          {!dealsLoading && deals.length === 0 && (
            <div className="w-full text-center py-8">
              <p className="text-white text-base">Tidak ada produk flash sale saat ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</section>

        {/* Section 5: Koleksi Utama Kami (previously Section 4) */}
        <section id="produk" className="bg-white pt-6 pb-0 md:pt-8 md:pb-0" data-route="/home">
          {/* Header - Centered */}
          <div className="mb-8">
            <div className="px-6 md:px-8 text-center reveal-on-scroll-up" data-reveal>
              <h2 className="font-cormorant text-xl md:text-2xl lg:text-4xl text-black">
                Koleksi Utama
              </h2>
              <p className="mt-4 font-belleza text-sm md:text-base lg:text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
                Kami hadir menawarkan koleksi fashion terkini dengan kualitas premium dan desain modern
                yang mengedepankan inovasi, kenyamanan, serta gaya yang timeless untuk setiap momen istimewa Anda
              </p>
            </div>
            <div className="mt-6 max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10 flex items-center justify-end">
              <Link
                href="/produk"
                aria-label="Lihat lebih banyak produk"
                className="group relative inline-flex items-center gap-1.5 font-belleza text-xs md:text-sm font-bold text-black bg-white border-2 border-black px-3 py-1 transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                <span>Lihat lebih banyak produk</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10 reveal-on-scroll pb-20" data-reveal>
                <div className="mt-1 md:mt-2 lg:mt-3 grid grid-cols-1 gap-x-6 gap-y-28 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-28 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-28 xl:grid-cols-4 xl:gap-x-10 xl:gap-y-28 items-start" style={{ alignItems: 'start' }}>
                  {pageLoading && pageItems.length === 0 ? (
                    <>
                      {/* Skeleton Loading - 8 items */}
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="group relative flex flex-col bg-white border-t border-l border-r border-transparent overflow-visible">
                          {/* Image Skeleton */}
                          <div className="relative aspect-square overflow-hidden bg-gray-200 animate-pulse"></div>

                          {/* Content Skeleton */}
                          <div className="flex flex-1 flex-col px-4 pt-3 pb-4 relative">
                            {/* Title */}
                            <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-3"></div>

                            {/* Price */}
                            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mb-2"></div>

                            {/* Description */}
                            <div className="space-y-2 mt-2">
                              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                            </div>

                            {/* Button */}
                            <div className="mt-4 h-10 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : pageItems && pageItems.length > 0 ? (
                    pageItems.map((product: any, index: number) => {
                      const photoSrc = cacheSrc(product?.photo1) ?? '/images/test1p.png';
                      const { description } = deriveProductMeta(product);
                      const priceLabel = Number(product?.harga || 0).toLocaleString('id-ID');
                      const heartSrc = isFavorite(product.id) ? '/images/fav-u.png' : '/images/favorit.png';
                      const isHovered = hoveredProduct === product.id;

                      // Grid columns heuristics (match /produk behavior)
                      const getColumnsCount = () => {
                        if (typeof window !== 'undefined') {
                          if (window.innerWidth >= 1280) return 4; // xl
                          if (window.innerWidth >= 1024) return 3; // lg
                          if (window.innerWidth >= 640) return 2;  // sm
                        }
                        return 1; // mobile
                      };
                      const columnsCount = getColumnsCount();
                      const isDirectlyBelow = hoveredIndex !== null && index === (hoveredIndex as number) + columnsCount;

                      return (
                        <div
                          key={product.id}
                          className={`group relative flex flex-col bg-white ${isHovered ? 'z-10 border-t border-l border-r border-black' : 'z-0 border-t border-l border-r border-transparent'} overflow-visible `}
                          onMouseEnter={() => {
                            setHoveredProduct(product.id);
                            setHoveredIndex(index);
                          }}
                          onMouseLeave={() => {
                            setHoveredProduct(null);
                            setHoveredIndex(null);
                          }}
                        >
                          <div className="relative aspect-square overflow-hidden bg-gray-100">
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
                                />
                              </div>
                              <div className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-in-out group-hover:opacity-100">
                                <Image
                                  src={cacheSrc(product?.preview_photo) ?? photoSrc}
                                  alt={product.nama_produk || 'Produk'}
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                  className="object-contain"
                                />
                              </div>
                            </Link>
                            {/* Category Label */}
                            {product.kategori && (
                              <div className={`absolute top-2 left-2 bg-gray-500 px-2 py-1 z-10 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
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

                            {/* Description vs Sizes transition */}
                            <div className="mt-2 relative min-h-[48px]">
                              <div className={`transition-all duration-500 ease-in-out ${isHovered ? 'opacity-0 translate-y-2 absolute' : 'opacity-100 translate-y-0'}`}>
                                <p className="font-belleza text-xs md:text-sm leading-relaxed text-gray-700 line-clamp-2">
                                  {description}
                                </p>
                              </div>

                              <div className={`transition-all duration-500 ease-in-out ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 absolute'}`}>
                                <div className="flex flex-col gap-1.5">
                                  <span className="font-belleza text-xs text-gray-500 uppercase tracking-wider">Ukuran Tersedia</span>
                                  <div className="flex flex-wrap gap-2">
                                    {[product.size1, product.size2, product.size3, product.size4, product.size5]
                                      .filter(size => size && (size as string).trim() !== '')
                                      .map((size, idx) => {
                                        const isSelected = selectedSizes[product.id] === size;
                                        return (
                                          <button
                                            key={idx}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleSizeSelect(product.id, size as string);
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
                                      })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <p className="font-belleza text-base md:text-lg font-semibold text-black">Rp {priceLabel}</p>
                              <button
                                type="button"
                                aria-label={isFavorite(product.id) ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                                className="inline-flex items-center justify-center transition hover:scale-110"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const result = await toggleFavorite(product.id);
                                  if ((result as any)?.success) {
                                    if ((result as any).action === 'removed') {
                                      showNotification('Produk dihapus dari favorit', 'success');
                                    } else {
                                      showNotification('Produk berhasil ditambahkan ke favorit!', 'success');
                                    }
                                  } else {
                                    showNotification((result as any)?.message || 'Gagal mengupdate favorit', 'error');
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

                          {/* Add to Cart overlay below card */}
                          <div
                            className={`absolute left-[-1px] right-[-1px] top-full px-4 pb-4 bg-white ${
                              isHovered ? 'opacity-100 border-l border-r border-b border-black' : 'opacity-0 pointer-events-none border-l border-r border-b border-transparent'
                            } transition-opacity duration-300 ease-in-out`}
                          >
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
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                  Tambah Ke Keranjang
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center text-gray-500">Tidak ada produk</div>
                  )}
                </div>
          </div>
        </section>

        {/* Section 5.5: Voucher Horizontal */}
        <section id="voucher-section" className="bg-white pt-8 pb-12 md:pt-10 md:pb-16" data-route="/home">
          <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
            {/* Section Title */}
            <div className="text-center mb-10">
              <h2 className="font-cormorant text-2xl md:text-3xl text-black font-bold mb-2">
                Voucher Spesial Untuk Anda
              </h2>
              <p className="font-belleza text-sm text-gray-600">
                Dapatkan penawaran terbaik dengan voucher eksklusif kami
              </p>
            </div>

            {/* Vouchers Grid */}
            {vouchersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            ) : featuredVouchers.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-belleza text-gray-600">Tidak ada voucher tersedia saat ini</p>
              </div>
            ) : (
              <>
                {/* Mobile View: 2x2 Grid with Auto Slide Animation */}
                <div className="sm:hidden relative overflow-hidden">
                  <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentVoucherSlide * 100}%)` }}>
                    {/* Slide 1: First 2 vouchers */}
                    <div className="min-w-full grid grid-cols-2 gap-3 px-1">
                      {featuredVouchers.slice(0, 2).map((voucher, index) => {
                        const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                        const daysLeft = voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

                        return (
                          <div
                            key={voucher.id}
                            className={`flex flex-col border rounded-lg overflow-hidden transition-all ${
                              isExpired
                                ? 'border-gray-300 bg-gray-50 opacity-60'
                                : 'border-gray-200 bg-white hover:shadow-lg cursor-pointer'
                            }`}
                          >
                            {/* Top Icon Section - Compact */}
                            <div className={`h-16 flex flex-col items-center justify-center relative ${
                              isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                            }`}>
                              {/* Badge */}
                              {!isExpired && (
                                <div className="absolute top-0.5 left-0.5 z-10">
                                  <span className="inline-block px-1 py-0.5 bg-yellow-400 text-red-700 text-[8px] font-bold rounded">
                                    SPESIAL
                                  </span>
                                </div>
                              )}

                              {/* Icon */}
                              <div className="text-white mb-0.5">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                    M
                                  </text>
                                </svg>
                              </div>

                              {/* Category Label */}
                              <div className="text-white text-center">
                                <div className="text-[9px] font-bold">
                                  {voucher.type === 'shipping' ? 'ONGKIR GRATIS' : 'KOLEKSI PILIHAN'}
                                </div>
                              </div>

                              {/* Decorative circles */}
                              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                            </div>

                            {/* Bottom Content Section - Compact */}
                            <div className="flex-1 p-2.5 flex flex-col justify-between">
                              <div>
                                {/* Title */}
                                <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5 leading-tight line-clamp-2">
                                  {voucher.judul_voucher ||
                                    (voucher.type === 'shipping'
                                      ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                      : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                    )
                                  }
                                </h3>

                                {/* Min Purchase */}
                                <p className="text-[9px] text-gray-600 mb-1.5">
                                  Min.Pembelian {voucher.minimal_pembelian || 1} produk
                                </p>

                                {/* Status Badges */}
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  {isExpired ? (
                                    <span className="px-1.5 py-0.5 text-[8px] font-semibold text-white bg-red-600 rounded">
                                      Kadaluarsa
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[8px] font-semibold text-red-600 border border-red-600 rounded">
                                      Penawaran terbatas
                                    </span>
                                  )}
                                </div>

                                {/* Expiry Date */}
                                <p className="text-[9px] text-gray-600">
                                  Berlaku: <span className="font-medium">{daysLeft > 0 ? `${daysLeft} hari` : 'Segera berakhir'}</span>
                                </p>
                              </div>

                              {/* Action Button */}
                              {!isExpired && (
                                <div className="mt-2.5">
                                  <button
                                    onClick={() => handleClaimVoucher(voucher.voucher)}
                                    disabled={claimingVoucherId === voucher.voucher || claimedVouchers.has(voucher.voucher)}
                                    className="w-full text-center py-1.5 bg-black text-white text-[10px] font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {claimingVoucherId === voucher.voucher
                                      ? 'Mengklaim...'
                                      : claimedVouchers.has(voucher.voucher)
                                        ? '✓ Claimed'
                                        : 'Klaim Sekarang'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Slide 2: Next 2 vouchers (if exists) */}
                    {featuredVouchers.length > 2 && (
                      <div className="min-w-full grid grid-cols-2 gap-3 px-1">
                        {featuredVouchers.slice(2, 4).map((voucher, index) => {
                          const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                          const daysLeft = voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

                          return (
                            <div
                              key={voucher.id}
                              className={`flex flex-col border rounded-lg overflow-hidden transition-all ${
                                isExpired
                                  ? 'border-gray-300 bg-gray-50 opacity-60'
                                  : 'border-gray-200 bg-white hover:shadow-lg cursor-pointer'
                              }`}
                            >
                              {/* Top Icon Section - Compact */}
                              <div className={`h-16 flex flex-col items-center justify-center relative ${
                                isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                              }`}>
                                {/* Badge */}
                                {!isExpired && (
                                  <div className="absolute top-0.5 left-0.5 z-10">
                                    <span className="inline-block px-1 py-0.5 bg-yellow-400 text-red-700 text-[8px] font-bold rounded">
                                      SPESIAL
                                    </span>
                                  </div>
                                )}

                                {/* Icon */}
                                <div className="text-white mb-0.5">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                      M
                                    </text>
                                  </svg>
                                </div>

                                {/* Category Label */}
                                <div className="text-white text-center">
                                  <div className="text-[9px] font-bold">
                                    {voucher.type === 'shipping' ? 'ONGKIR GRATIS' : 'KOLEKSI PILIHAN'}
                                  </div>
                                </div>

                                {/* Decorative circles */}
                                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                              </div>

                              {/* Bottom Content Section - Compact */}
                              <div className="flex-1 p-2.5 flex flex-col justify-between">
                                <div>
                                  {/* Title */}
                                  <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5 leading-tight line-clamp-2">
                                    {voucher.judul_voucher ||
                                      (voucher.type === 'shipping'
                                        ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                        : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                      )
                                    }
                                  </h3>

                                  {/* Min Purchase */}
                                  <p className="text-[9px] text-gray-600 mb-1.5">
                                    Min.Pembelian {voucher.minimal_pembelian || 1} produk
                                  </p>

                                  {/* Status Badges */}
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    {isExpired ? (
                                      <span className="px-1.5 py-0.5 text-[8px] font-semibold text-white bg-red-600 rounded">
                                        Kadaluarsa
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 text-[8px] font-semibold text-red-600 border border-red-600 rounded">
                                        Penawaran terbatas
                                      </span>
                                    )}
                                  </div>

                                  {/* Expiry Date */}
                                  <p className="text-[9px] text-gray-600">
                                    Berlaku: <span className="font-medium">{daysLeft > 0 ? `${daysLeft} hari` : 'Segera berakhir'}</span>
                                  </p>
                                </div>

                                {/* Action Button */}
                                {!isExpired && (
                                  <div className="mt-2.5">
                                    <button
                                      onClick={() => handleClaimVoucher(voucher.voucher)}
                                      disabled={claimingVoucherId === voucher.voucher || claimedVouchers.has(voucher.voucher)}
                                      className="w-full text-center py-1.5 bg-black text-white text-[10px] font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {claimingVoucherId === voucher.voucher
                                        ? 'Mengklaim...'
                                        : claimedVouchers.has(voucher.voucher)
                                          ? '✓ Claimed'
                                          : 'Klaim Sekarang'}
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

                  {/* Slide Indicators for Mobile */}
                  {featuredVouchers.length > 2 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        onClick={() => setCurrentVoucherSlide(0)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          currentVoucherSlide === 0 ? 'w-6 bg-black' : 'w-1.5 bg-gray-300'
                        }`}
                        aria-label="Slide 1"
                      />
                      <button
                        onClick={() => setCurrentVoucherSlide(1)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          currentVoucherSlide === 1 ? 'w-6 bg-black' : 'w-1.5 bg-gray-300'
                        }`}
                        aria-label="Slide 2"
                      />
                    </div>
                  )}
                </div>

                {/* Tablet/Small Desktop View: Single Row Horizontal Layout (sm to md breakpoint) */}
                <div className="hidden sm:block md:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {featuredVouchers.map((voucher, index) => {
                      const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                      const daysLeft = voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

                      return (
                        <div
                          key={voucher.id}
                          className={`flex-shrink-0 w-[160px] flex flex-row border rounded-lg overflow-hidden transition-all ${
                            isExpired
                              ? 'border-gray-300 bg-gray-50 opacity-60'
                              : 'border-gray-200 bg-white hover:shadow-lg cursor-pointer'
                          }`}
                        >
                          {/* Left Icon Section - Ultra Compact */}
                          <div className={`w-14 flex flex-col items-center justify-center relative ${
                            isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                          }`}>
                            {/* Badge */}
                            {!isExpired && (
                              <div className="absolute top-0.5 left-0.5 z-10">
                                <span className="inline-block px-0.5 py-0.5 bg-yellow-400 text-red-700 text-[6px] font-bold rounded">
                                  HOT
                                </span>
                              </div>
                            )}

                            {/* Icon */}
                            <div className="text-white mb-0.5">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor">
                                  M
                                </text>
                              </svg>
                            </div>

                            {/* Category Label - Vertical */}
                            <div className="text-white text-center px-0.5">
                              <div className="text-[6px] font-bold leading-tight">
                                {voucher.type === 'shipping' ? 'ONGKIR' : 'KOLEKSI'}
                              </div>
                              <div className="text-[6px] font-bold leading-tight">
                                {voucher.type === 'shipping' ? 'GRATIS' : 'PILIHAN'}
                              </div>
                            </div>

                            {/* Decorative circles */}
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                          </div>

                          {/* Right Content Section - Ultra Compact */}
                          <div className="flex-1 p-1.5 flex flex-col justify-between">
                            <div>
                              {/* Title */}
                              <h3 className="text-[9px] font-semibold text-gray-900 mb-0.5 leading-tight line-clamp-2">
                                {voucher.judul_voucher ||
                                  (voucher.type === 'shipping'
                                    ? `Gratis Ongkir Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                    : `Diskon ${voucher.discount_percentage || '15'}% Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                  )
                                }
                              </h3>

                              {/* Min Purchase */}
                              <p className="text-[7px] text-gray-600 mb-0.5">
                                Min {voucher.minimal_pembelian || 1} item
                              </p>

                              {/* Status & Expiry */}
                              <div className="flex flex-col gap-0.5 mb-0.5">
                                {isExpired ? (
                                  <span className="px-1 py-0.5 text-[6px] font-semibold text-white bg-red-600 rounded w-fit">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="px-1 py-0.5 text-[6px] font-semibold text-red-600 border border-red-600 rounded w-fit">
                                    Limited
                                  </span>
                                )}
                                <span className="text-[7px] text-gray-600">
                                  {daysLeft > 0 ? `${daysLeft}d` : 'Soon'}
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            {!isExpired && (
                              <button
                                onClick={() => handleClaimVoucher(voucher.voucher)}
                                disabled={claimingVoucherId === voucher.voucher || claimedVouchers.has(voucher.voucher)}
                                className="w-full text-center py-1 bg-black text-white text-[8px] font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {claimingVoucherId === voucher.voucher
                                  ? 'Loading...'
                                  : claimedVouchers.has(voucher.voucher)
                                    ? '✓ Claimed'
                                    : 'Claim'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop View: Horizontal Row for md, Grid for lg+ */}
                <div className="hidden md:block">
                  {/* For md breakpoint (tablet/small desktop): Single horizontal row */}
                  <div className="lg:hidden flex gap-2 overflow-x-auto pb-2">
                    {featuredVouchers.map((voucher, index) => {
                      const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                      const daysLeft = voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

                      return (
                        <div
                          key={voucher.id}
                          className={`flex-shrink-0 w-[220px] flex flex-row border rounded-lg overflow-hidden transition-all ${
                            isExpired
                              ? 'border-gray-300 bg-gray-50 opacity-60'
                              : 'border-gray-200 bg-white hover:shadow-lg cursor-pointer'
                          }`}
                        >
                          {/* Left Icon Section - Compact */}
                          <div className={`w-20 flex flex-col items-center justify-center relative ${
                            isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                          }`}>
                            {/* Badge */}
                            {!isExpired && (
                              <div className="absolute top-1 left-1 z-10">
                                <span className="inline-block px-1 py-0.5 bg-yellow-400 text-red-700 text-[8px] font-bold rounded">
                                  HOT
                                </span>
                              </div>
                            )}

                            {/* Icon */}
                            <div className="text-white mb-1">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                  M
                                </text>
                              </svg>
                            </div>

                            {/* Category Label - Vertical */}
                            <div className="text-white text-center px-0.5">
                              <div className="text-[8px] font-bold leading-tight">
                                {voucher.type === 'shipping' ? 'ONGKIR' : 'KOLEKSI'}
                              </div>
                              <div className="text-[8px] font-bold leading-tight">
                                {voucher.type === 'shipping' ? 'GRATIS' : 'PILIHAN'}
                              </div>
                            </div>

                            {/* Decorative circles */}
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>
                          </div>

                          {/* Right Content Section - Compact */}
                          <div className="flex-1 p-2.5 flex flex-col justify-between">
                            <div>
                              {/* Title */}
                              <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5 leading-tight line-clamp-2">
                                {voucher.judul_voucher ||
                                  (voucher.type === 'shipping'
                                    ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                    : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                  )
                                }
                              </h3>

                              {/* Min Purchase */}
                              <p className="text-[9px] text-gray-600 mb-1.5">
                                Min. {voucher.minimal_pembelian || 1} produk
                              </p>

                              {/* Status & Expiry */}
                              <div className="flex items-center gap-1.5 mb-1">
                                {isExpired ? (
                                  <span className="px-1.5 py-0.5 text-[8px] font-semibold text-white bg-red-600 rounded">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[8px] font-semibold text-red-600 border border-red-600 rounded">
                                    Limited
                                  </span>
                                )}
                                <span className="text-[9px] text-gray-600">
                                  {daysLeft > 0 ? `${daysLeft} hari` : 'Segera'}
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            {!isExpired && (
                              <button
                                onClick={() => handleClaimVoucher(voucher.voucher)}
                                disabled={claimingVoucherId === voucher.voucher || claimedVouchers.has(voucher.voucher)}
                                className="w-full text-center py-1.5 bg-black text-white text-[10px] font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {claimingVoucherId === voucher.voucher
                                  ? 'Mengklaim...'
                                  : claimedVouchers.has(voucher.voucher)
                                    ? '✓ Claimed'
                                    : 'Klaim'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* For lg breakpoint and above: 4 columns grid */}
                  <div className="hidden lg:grid lg:grid-cols-4 gap-4">
                    {featuredVouchers.map((voucher, index) => {
                      const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                      const daysLeft = voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      const animationClass = index < 2 ? 'reveal-on-scroll-left' : 'reveal-on-scroll-right';

                      return (
                        <div
                          key={voucher.id}
                          className={`flex flex-col border rounded-lg overflow-hidden transition-all ${animationClass} ${
                            isExpired
                              ? 'border-gray-300 bg-gray-50 opacity-60'
                              : 'border-gray-200 bg-white hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                          }`}
                          data-reveal
                        >
                          {/* Top Icon Section */}
                          <div className={`h-24 flex flex-col items-center justify-center relative ${
                            isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                          }`}>
                            {/* Badge */}
                            {!isExpired && (
                              <div className="absolute top-1 left-1 z-10">
                                <span className="inline-block px-1.5 py-0.5 bg-yellow-400 text-red-700 text-[9px] font-bold rounded">
                                  SPESIAL
                                </span>
                              </div>
                            )}

                            {/* Icon */}
                            <div className="text-white mb-1.5">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor">
                                  M
                                </text>
                              </svg>
                            </div>

                            {/* Category Label */}
                            <div className="text-white text-center">
                              <div className="text-xs font-bold">
                                {voucher.type === 'shipping' ? 'ONGKIR GRATIS' : 'KOLEKSI PILIHAN'}
                              </div>
                            </div>

                            {/* Decorative circles */}
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full"></div>
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full"></div>
                          </div>

                          {/* Bottom Content Section */}
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              {/* Title */}
                              <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-tight line-clamp-2">
                                {voucher.judul_voucher ||
                                  (voucher.type === 'shipping'
                                    ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                    : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                  )
                                }
                              </h3>

                              {/* Min Purchase */}
                              <p className="text-xs text-gray-600 mb-2">
                                Min.Pembelian {voucher.minimal_pembelian || 1} produk
                              </p>

                              {/* Status Badges */}
                              <div className="flex items-center gap-2 mb-2">
                                {isExpired ? (
                                  <span className="px-2 py-1 text-[10px] font-semibold text-white bg-red-600 rounded">
                                    Kadaluarsa
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-[10px] font-semibold text-red-600 border border-red-600 rounded">
                                    Penawaran terbatas
                                  </span>
                                )}
                              </div>

                              {/* Expiry Date */}
                              <p className="text-xs text-gray-600">
                                Berlaku: <span className="font-medium">{daysLeft > 0 ? `${daysLeft} hari` : 'Segera berakhir'}</span>
                              </p>
                            </div>

                            {/* Action Button */}
                            {!isExpired && (
                              <div className="mt-4">
                                <button
                                  onClick={() => handleClaimVoucher(voucher.voucher)}
                                  disabled={claimingVoucherId === voucher.voucher || claimedVouchers.has(voucher.voucher)}
                                  className="w-full text-center py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {claimingVoucherId === voucher.voucher
                                    ? 'Mengklaim...'
                                    : claimedVouchers.has(voucher.voucher)
                                      ? '✓ Claimed'
                                      : 'Klaim Sekarang'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Section 6: Features Section - Modern Clean Design (previously Section 5) */}
        <section className="relative overflow-hidden bg-white py-4 md:py-6" data-route="/home">
          <div className="max-w-7xl mx-auto px-6 md:px-8 reveal-on-scroll-up" data-reveal>
            {/* Top border accent */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-black to-transparent mb-4 md:mb-6"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {/* Feature 1 - Diskon Pengiriman */}
              <div className="group relative py-4 md:py-5 px-4 md:px-6 flex flex-col items-center text-center transition-all duration-300 hover:bg-gray-50/50">
                <div className="relative mb-3 md:mb-4">
                  <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
                    <Image
                      src="/images/shipped.png"
                      alt="Diskon Pengiriman"
                      width={48}
                      height={48}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                </div>
                <h3 className="font-cormorant text-lg md:text-xl font-semibold text-black mb-1.5 tracking-wide">
                  Diskon Pengiriman
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-600 max-w-[220px]">
                  Nikmati potongan harga pengiriman untuk setiap pembelian
                </p>

                {/* Vertical divider - hidden on mobile, shown on md+ */}
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-2/3 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                {/* Horizontal divider - shown on mobile only */}
                <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Feature 2 - 24/7 Dukungan Langsung */}
              <div className="group relative py-4 md:py-5 px-4 md:px-6 flex flex-col items-center text-center transition-all duration-300 hover:bg-gray-50/50">
                <div className="relative mb-3 md:mb-4">
                  <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
                    <Image
                      src="/images/support.png"
                      alt="24/7 Dukungan Langsung"
                      width={48}
                      height={48}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                </div>
                <h3 className="font-cormorant text-lg md:text-xl font-semibold text-black mb-1.5 tracking-wide">
                  24/7 Dukungan Langsung
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-600 max-w-[220px]">
                  Tim kami siap membantu kapan saja Anda membutuhkan
                </p>

                {/* Vertical divider - hidden on mobile, shown on md+ */}
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-2/3 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                {/* Horizontal divider - shown on mobile only */}
                <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Feature 3 - Pembayaran Mudah */}
              <div className="group relative py-4 md:py-5 px-4 md:px-6 flex flex-col items-center text-center transition-all duration-300 hover:bg-gray-50/50">
                <div className="relative mb-3 md:mb-4">
                  <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
                    <Image
                      src="/images/payment.png"
                      alt="Pembayaran Mudah"
                      width={48}
                      height={48}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                </div>
                <h3 className="font-cormorant text-lg md:text-xl font-semibold text-black mb-1.5 tracking-wide">
                  Pembayaran Mudah
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-600 max-w-[220px]">
                  Berbagai metode pembayaran yang aman dan terpercaya
                </p>
              </div>
            </div>

            {/* Bottom border accent */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-black to-transparent mt-4 md:mt-6"></div>
          </div>
        </section>
        {/* Section 7: Newsletter Subscription (previously Section 6) */}
        <section className="relative overflow-hidden bg-transparent py-10 md:py-6 lg:py-14" data-route="/home">
          {/* Background image layer behind for cool scrolling effect */}
          <div
            className="absolute inset-0 -z-10 bg-center bg-cover bg-fixed"
            aria-hidden="true"
            style={{ backgroundImage: "url(/images/bgg.png)" }}
          />
          <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10 reveal-on-scroll" data-reveal>
            <div className="h-[28vh] md:h-[18vh] lg:h-[27.9vh] flex items-center justify-start">
              <div className="w-full sm:w-[80%] md:w-[60%] lg:w-[48%] max-w-xl">
                <h3 className="font-cormorant text-xl md:text-2xl lg:text-4xl text-black">Kabar Spesial!</h3>
                <p className="font-belleza text-sm md:text-base text-gray-800 mt-3">
                  Hanya perlu sedetik untuk jadi yang pertama mengetahui kabar terbaru dari kami.
                </p>
                <form className="mt-5 flex flex-col sm:flex-row gap-3" onSubmit={handleSectionNewsletterSubmit}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email Anda"
                    className="font-belleza w-full sm:flex-1 rounded-md sm:rounded-l-md sm:rounded-r-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/50"
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="font-belleza whitespace-nowrap rounded-md sm:rounded-r-md sm:rounded-l-none bg-black text-white px-5 py-3 hover:opacity-90 transition disabled:opacity-50"
                    aria-label="Kirim email berlangganan"
                  >
                    {isSubmitting ? 'Mengirim...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
        {/* Section 8: Footer-style info blocks (previously Section 7) */}
<section className="bg-black py-6 md:py-16" data-route="/home">
  <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10 reveal-on-scroll" data-reveal>
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
          <li><a href="#" aria-label="Buka keranjang" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); handleOpenCartSidebar(); }}>Keranjang</a></li>
          <li><a href="#" aria-label="Buka favorit" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
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
            <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); handleOpenCartSidebar(); }}>Keranjang</a></li>
            <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
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
      {notification.show && (
        <div className="fixed top-20 right-6 z-[100] animate-slide-in-right">
          <div className={`flex items-center gap-3 rounded-lg shadow-lg px-4 py-3 min-w-[300px] ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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

      {/* Success Popup for Newsletter Subscription */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 transform transition-all duration-300 scale-100 animate-scale-in">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Success Message */}
              <h3 className="font-cormorant text-2xl font-bold text-black mb-2">Terima Kasih!</h3>
              <p className="font-belleza text-gray-600 mb-6">
                Email Anda telah berhasil terdaftar. Anda akan mendapatkan informasi terbaru tentang produk dan penawaran spesial dari kami.
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="font-belleza bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter Popup */}
      {showNewsletterPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseNewsletter}
          />

          {/* Newsletter Card */}
          <div className="relative bg-white shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-scaleIn border-4 border-black">
            {/* Close Button */}
            <button
              onClick={handleCloseNewsletter}
              className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all duration-200 border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              aria-label="Close newsletter"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Newsletter Image with Form Overlay */}
            <div className="relative w-full">
              <Image
                src="/newsletter/newsletter.png"
                alt="Newsletter Voucher"
                width={800}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />

              {/* Form Overlay at Bottom Center */}
              {newsletterSuccess ? (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center justify-center animate-fade-in">
                  <div className="w-16 h-16 bg-green-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                    <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[85%]"
                >
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => {
                        setNewsletterEmail(e.target.value);
                        setNewsletterError('');
                      }}
                      placeholder="Masukkan email Anda"
                      className="flex-1 px-4 py-2.5 border-4 border-black bg-white focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-belleza text-sm text-black placeholder:text-gray-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      disabled={newsletterLoading}
                    />
                    <button
                      type="submit"
                      disabled={newsletterLoading}
                      className="px-6 py-2.5 bg-purple-500 border-4 border-black text-black font-belleza font-black text-sm hover:bg-purple-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all whitespace-nowrap"
                    >
                      {newsletterLoading ? (
                        <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Kirim</span>
                        </>
                      )}
                    </button>
                  </div>

                  {newsletterError && (
                    <div className="mt-3 flex items-center gap-2 p-2 bg-red-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <svg className="w-4 h-4 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-belleza text-xs text-black font-bold">{newsletterError}</p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      </main>
  );
}

export default function Page() {
  return (
    <DealsCacheProvider>
      <PageContent />
      <FloatingChat />
    </DealsCacheProvider>
  );
}





