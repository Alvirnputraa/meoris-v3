"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/useCart';
import { useProducts } from '@/lib/useProducts';
import { useFavorites } from '@/lib/useFavorites';
import { useEffect, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import { produkDb, keranjangDb } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { DealsCacheProvider, useDealsCache } from '@/lib/DealsCacheContext';


function PageContent() {
  const [phase, setPhase] = useState(0);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavOpen, setIsFavOpen] = useState(false);
  const [userMenuOpenDesktopTop, setUserMenuOpenDesktopTop] = useState(false);
  const [userMenuOpenDesktopHero, setUserMenuOpenDesktopHero] = useState(false);
  const [userMenuOpenMobile, setUserMenuOpenMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { items: homeCartItems, loading: homeCartLoading, count: cartCount, refresh } = useCart();
  const { favorites, loading: favoritesLoading, toggleFavorite, isFavorite, count: favoritesCount } = useFavorites();
  const { user, hydrated, logout } = useAuth();
  const userHref = !hydrated ? '#' : (user ? '/my-account' : '/login');
  const preventIfNotHydrated = (e: any) => { if (!hydrated) { e.preventDefault?.(); e.stopPropagation?.(); } };

  // Handle logout
  const handleLogout = async () => {
    if (logout) {
      await logout();
      window.location.href = '/login';
    }
  };

  // Sidebar cart (match my-account behavior)
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  
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

  // Auto-rotate phase slider for Section 1
  useEffect(() => {
    const t = setInterval(() => {
      setPhase((p) => (p + 1) % 4); // There are 4 phases (0-3)
    }, 4000); // Change every 4 seconds
    return () => clearInterval(t);
  }, []);

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
  
    // Optimistic feedback
    setTimeout(() => {
      showNotification('Produk berhasil ditambahkan ke keranjang!', 'success');
      setAddingToCart(null);
    }, 300);
  
    // Open cart sidebar quickly
    setTimeout(() => {
      setIsCartOpen(true);
    }, 400);
  
    // Persist to database
    try {
      await keranjangDb.addItem((user as any).id, productId, 1, selectedSize);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setTimeout(() => {
        showNotification('Terjadi kesalahan, silakan coba lagi', 'error');
      }, 500);
    }
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
    setRemovingId(itemId);
    try {
      await keranjangDb.removeItem(itemId);
      // Update local state
      setViewItems(prev => prev.filter(item => item.id !== itemId));
      showNotification('Item berhasil dihapus dari keranjang', 'success');
    } catch (error) {
      console.error('Error removing item:', error);
      showNotification('Gagal menghapus item', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showNotification('Silakan masukkan email Anda', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/newsletter', {
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
// URL normalizer for images (product posters, photo1/photo2)
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

  // Load products for homepage
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setPageLoading(true);
        const offset = page * pageSize;
        const data = await produkDb.getAll(pageSize, offset);
        if (cancelled) return;
        setPageItems(Array.isArray(data) ? data : []);
        setHasNext((data || []).length === pageSize);
      } catch (e) {
        if (!cancelled) { setPageItems([]); setHasNext(false); }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };
    load();
    return () => { cancelled = true };
  }, [page, pageSize]);
  // Latest products for sidebar list (Section 4)
  const [latest, setLatest] = useState<any[]>([]);
  const [latestLoading, setLatestLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLatestLoading(true);
        const data = await produkDb.getAll(10, 0);
        if (!cancelled) setLatest(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Gagal memuat produk terbaru', e);
        if (!cancelled) setLatest([]);
      } finally {
        if (!cancelled) setLatestLoading(false);
      }
    };
    load();
    return () => { cancelled = true };
  }, []);

  // Sticky desktop header on scroll
  useEffect(() => {
    const onScroll = () => {
      if (typeof window !== 'undefined') {
        setShowSticky(window.scrollY > 80);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

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
        ? { threshold: 0.01, rootMargin: '5% 0px -5% 0px' }
        : { threshold: 0.12, rootMargin: '10% 0px -15% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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

  const headingSub = phase === 0 ? 'Cloud' : phase === 1 ? 'Leather' : phase === 2 ? 'Shoes' : 'Loafers';
  const description =
    phase === 0
      ? 'Cocok dipakai harian maupun saat santai dan mempunyai bahan lembut'
      : phase === 1
      ? 'Desain minimalis dengan bahan kulit yang berkilau'
      : phase === 2
      ? 'Nyaman dipakai dengan bahan lembut terasa di kaki'
      : 'Tampil keren dengan sepatu nyaman di kaki';
  const activeLabel = phase === 0 ? '01._' : phase === 1 ? '02._' : phase === 2 ? '03._' : '04._';
  const mainImg =
    phase === 0
      ? '/images/test1.png'
      : phase === 1
      ? '/images/test2.png'
      : phase === 2
      ? '/images/test3.png'
      : '/images/test4.png';
  const productImg =
    phase === 0
      ? '/images/test1-produk.png'
      : phase === 1
      ? '/images/test2-produk.png'
      : phase === 2
      ? '/images/test3-produk.png'
      : '/images/test4-produk.png';
  const phaseTitle =
    phase === 0
      ? 'Sock Sneakers Cloud'
      : phase === 1
      ? 'Sock Sneakers Leather'
      : phase === 2
      ? 'Gladiator Sandals Shoes'
      : 'Gladiator Canvas Loafers';

  return (
      <main className="min-h-screen font-belleza">
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
              <span className="font-cormorant text-xl md:text-2xl text-black">Item Keranjang</span>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <div className="space-y-5">
                {viewItems.length === 0 ? (
                  <p className="text-sm text-gray-600">Keranjang kosong</p>
                ) : (
                  viewItems.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        {item.produk?.photo1 ? (
                          <Image src={item.produk.photo1} alt={item.produk?.nama_produk || "Produk"} fill sizes="64px" className="object-cover" />
                        ) : (
                          <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-belleza text-gray-900 truncate">{item.produk?.nama_produk || "Produk"}</p>
                        <p className="font-belleza text-sm text-gray-700 mt-1"><span className="text-black">{item.quantity} x</span> Rp {Number(item.produk?.harga || 0).toLocaleString("id-ID")} {item.size ? <span className="ml-2 text-gray-500">Uk: {item.size}</span> : null}</p>
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
              <div className="mt-2">
                <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {viewItems.reduce((sum:any, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString("id-ID")}</p>
                <div className="mt-4">
                  <Link href="/produk/detail-checkout" className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full">
                    Checkout
                  </Link>
                </div>
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
      {/* Sticky header (desktop) */}
      {showSticky && (
        <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-10 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Buka menu"
                className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Image src="/images/sidebar.png" alt="Menu" width={26} height={26} />
              </button>
              <a href="/" aria-label="Meoris beranda" className="select-none">
                <span className="font-cormorant font-bold text-2xl tracking-wide text-black">MEORIS</span>
              </a>
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
              <div className="relative" onMouseEnter={() => setUserMenuOpenDesktopTop(true)} onMouseLeave={() => setUserMenuOpenDesktopTop(false)}>
                <a href={userHref} onClick={preventIfNotHydrated} aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${userMenuOpenDesktopTop ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                  <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                  <a href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</a>
                  <a href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Section Pertama: mengikuti split background dari body */}
      <section className="relative grid h-[55vh] md:h-[60vh] lg:h-[80vh] grid-cols-2 split-bg pt-[64px] md:pt-0" data-route="/home">
        {/* Desktop header row: brand left, icons right (aligned) */}
        <div className="hidden md:flex absolute top-12 left-6 right-10 z-40 items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Buka menu"
              className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="inline-flex items-center justify-center bg-white rounded-lg shadow-md border border-gray-200 p-1.5">
                <Image src="/images/sidebar.png" alt="Menu" width={26} height={26} />
              </span>
            </button>
            <a href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-cormorant font-bold text-4xl md:text-2xl lg:text-1xl tracking-wide text-black">MEORIS</span>
            </a>
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
            <div className="relative" onMouseEnter={() => setUserMenuOpenDesktopHero(true)} onMouseLeave={() => setUserMenuOpenDesktopHero(false)}>
              <a href={userHref} onClick={preventIfNotHydrated} aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer block">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${userMenuOpenDesktopHero ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                <a href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</a>
                <a href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</a>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile header: MEORIS left, icons right */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white md:bg-white/95 md:backdrop-blur-sm border-b border-gray-200">
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
              <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
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
                <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                <a href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</a>
                <a href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</a>
              </div>
            </div>
            </div>
          </div>
        </div>
        
        {/* Kiri (50%) - abu cerah: gambar test1.png di tengah */}
        <div className="relative z-0 flex items-center justify-center p-0 sm:p-0 md:p-10 bg-[#f3f4f6] md:bg-transparent">
          {/* Vertical deal labels (desktop/tablet only) */}
          <div className="hidden md:flex flex-col gap-2 absolute left-6 top-1/2 -translate-y-1/2 z-10">
            <span className={`font-cormorant transition-all duration-500 ${phase === 0 ? 'text-black text-xl lg:text-2xl xl:text-3xl' : 'text-gray-500 text-base lg:text-xl xl:text-2xl'}`}>01._</span>
            <span className={`font-cormorant transition-all duration-500 ${phase === 1 ? 'text-black text-xl lg:text-2xl xl:text-3xl' : 'text-gray-500 text-base lg:text-xl xl:text-2xl'}`}>02._</span>
            <span className={`font-cormorant transition-all duration-500 ${phase === 2 ? 'text-black text-xl lg:text-2xl xl:text-3xl' : 'text-gray-500 text-base lg:text-xl xl:text-2xl'}`}>03._</span>
            <span className={`font-cormorant transition-all duration-500 ${phase === 3 ? 'text-black text-xl lg:text-2xl xl:text-3xl' : 'text-gray-500 text-base lg:text-xl xl:text-2xl'}`}>04._</span>
          </div>
          <div className="relative w-full h-[45vh] md:h-[60vh] lg:h-[75vh] max-w-none md:max-w-[500px] lg:max-w-none mx-auto overflow-hidden">
            {/* Smooth fade transition for main images */}
            {[
              '/images/test1.png',
              '/images/test2.png',
              '/images/test3.png',
              '/images/test4.png'
            ].map((imgSrc, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  phase === index ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={imgSrc}
                  alt={`Model memakai ${index === 0 ? 'Sock Sneakers Cloud' : index === 1 ? 'Sock Sneakers Leather' : index === 2 ? 'Gladiator Sandals Shoes' : 'Gladiator Canvas Loafers'}`}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 40vw, 45vw"
                  className="object-cover scale-[0.85] sm:scale-[0.70] md:scale-[0.70] lg:scale-100"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Kanan (50%) - ganti background image bgsec1.png */}
        <div
          className="relative flex items-stretch bg-transparent bg-center bg-cover h-[45vh] md:h-[60vh] lg:h-[80vh]"
          style={{
            backgroundImage: 'url(/images/bgsec1.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="grid w-full grid-cols-1 items-stretch lg:grid-cols-[0.8fr_1.2fr] xl:grid-cols-[0.75fr_1.25fr] relative z-20 h-full">
            {/* Kolom teks */}
            <div className="flex h-full flex-col justify-center gap-6 lg:gap-0 p-6 md:py-10 md:pl-0 md:pr-12 md:-ml-8 lg:pl-0 lg:pr-8 xl:pr-10 lg:-ml-16 xl:-ml-20 2xl:-ml-24">
              {/* Garis animasi di atas heading (desktop) */}
              <div className="block mb-0">
                <span
                  ref={lineRef}
                  key={phase}
                  className="block h-[2px] bg-black line-reveal w-56 xl:w-64 relative top-[14px] ml-0"
                  ></span>
              </div>

              {/* Viewport with smooth fade transition */}
              <div className="relative h-[200px] md:h-[240px] lg:h-[320px] xl:h-[360px] lg:-mt-1">
                <div className="relative w-full h-full">
                  {/* Pane Produk 1 */}
                  <div className={`absolute inset-0 flex flex-col gap-6 justify-center transition-opacity duration-700 ease-in-out ${phase === 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <h1 className="font-cormorant text-xl leading-tight tracking-tight text-black md:text-4xl lg:text-[38px] xl:text-[44px]">
                      <span className="block">Sock Sneakers</span>
                      <span className="block">Cloud</span>
                    </h1>

                    <p className="font-belleza text-xs leading-relaxed text-gray-700 md:text-base lg:text-lg xl:text-lg">
                      Cocok dipakai harian maupun saat santai dan mempunyai bahan lembut
                    </p>

                    <a
                      href="#"
                      className="inline-flex w-fit items-center gap-2 rounded border border-black px-5 py-3 font-belleza text-sm font-medium text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      aria-label="Lihat detail produk Sock Sneakers Cloud"
                    >
                      <span>Lihat detail</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12h14M13 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>

                  {/* Pane Produk 2 */}
                  <div className={`absolute inset-0 flex flex-col gap-6 justify-center transition-opacity duration-700 ease-in-out ${phase === 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <h1 className="font-cormorant text-xl leading-tight tracking-tight text-black md:text-4xl lg:text-[38px] xl:text-[44px]">
                      <span className="block">Sock Sneakers</span>
                      <span className="block">Leather</span>
                    </h1>

                    <p className="font-belleza text-xs leading-relaxed text-gray-700 md:text-base lg:text-lg xl:text-lg">
                      Desain minimalis dengan bahan kulit yang berkilau
                    </p>

                    <a
                      href="#"
                      className="inline-flex w-fit items-center gap-2 rounded border border-black px-5 py-3 font-belleza text-sm font-medium text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      aria-label="Lihat detail produk Sock Sneakers Leather"
                    >
                      <span>Lihat detail</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12h14M13 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>

                  {/* Pane Produk 3 */}
                  <div className={`absolute inset-0 flex flex-col gap-6 justify-center transition-opacity duration-700 ease-in-out ${phase === 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <h1 className="font-cormorant text-xl leading-tight tracking-tight text-black md:text-4xl lg:text-[38px] xl:text-[44px]">
                      <span className="block">Gladiator Sandals</span>
                      <span className="block">Shoes</span>
                    </h1>

                    <p className="font-belleza text-xs leading-relaxed text-gray-700 md:text-base lg:text-lg xl:text-lg">
                      Nyaman dipakai dengan bahan lembut terasa di kaki
                    </p>

                    <a
                      href="#"
                      className="inline-flex w-fit items-center gap-2 rounded border border-black px-5 py-3 font-belleza text-sm font-medium text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      aria-label="Lihat detail produk Gladiator Sandals Shoes"
                    >
                      <span>Lihat detail</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12h14M13 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>

                  {/* Pane Produk 4 */}
                  <div className={`absolute inset-0 flex flex-col gap-6 justify-center transition-opacity duration-700 ease-in-out ${phase === 3 ? 'opacity-100' : 'opacity-0'}`}>
                    <h1 className="font-cormorant text-xl leading-tight tracking-tight text-black md:text-4xl lg:text-[38px] xl:text-[44px]">
                      <span className="block">Gladiator Canvas</span>
                      <span className="block">Loafers</span>
                    </h1>

                    <p className="font-belleza text-xs leading-relaxed text-gray-700 md:text-base lg:text-lg xl:text-lg">
                      Tampil keren dengan sepatu nyaman di kaki
                    </p>

                    <a
                      href="#"
                      className="inline-flex w-fit items-center gap-2 rounded border border-black px-5 py-3 font-belleza text-sm font-medium text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      aria-label="Lihat detail produk Gladiator Canvas Loafers"
                    >
                      <span>Lihat detail</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12h14M13 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>
                
                </div>
                
                
                
                
                
                
              </div>
            </div>

            {/* Kolom gambar produk (sejajar dengan heading) */}
            <div className="hidden lg:flex h-full items-start lg:items-center justify-center lg:justify-start p-6 lg:p-10">
              <div className="relative w-full lg:h-[56vh] xl:h-[52vh] 2xl:h-[48vh] max-w-none">
                {/* Smooth fade transition for product images */}
                {[
                  '/images/test1-produk.png',
                  '/images/test2-produk.png',
                  '/images/test3-produk.png',
                  '/images/test4-produk.png'
                ].map((imgSrc, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                      phase === index ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Image
                      src={imgSrc}
                      alt={`${index === 0 ? 'Sock Sneakers Cloud' : index === 1 ? 'Sock Sneakers Leather' : index === 2 ? 'Gladiator Sandals Shoes' : 'Gladiator Canvas Loafers'} - tampak produk`}
                      fill
                      sizes="(min-width: 1536px) 31vw, (min-width: 1280px) 31vw, (min-width: 1024px) 30vw, 0px"
                      className="object-contain"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Section 2: Poster Card inside Left 70% Red Body */}
<section className="relative split-70-30 h-[35vh] md:h-[40vh] lg:h-[70vh] py-0" data-route="/home">
  {/* Mobile: Full-width poster only */}
  <div className="md:hidden relative w-full h-full">
    <div className="relative w-full h-full">
      {posters.map((imgSrc, index) => (
        dealSlide === index && (
          <div
            key={imgSrc || index}
            className="absolute inset-0"
          >
            <Image
              src={imgSrc}
              alt={`Poster ${index + 1}`}
              fill
              priority={index === 0}
              className="object-contain object-center scale-90"
              sizes="100vw"
              onError={(e) => {
                console.error(`Error loading image: ${imgSrc}`, e);
              }}
            />
          </div>
        )
      ))}
    </div>
  </div>

  {/* Desktop/Tablet: Grid layout with 70% left and 30% right */}
  <div className="hidden md:grid w-full h-full grid-cols-1 xl:grid-cols-[70%_30%]">
    {/* Left 70% red area with full-width card */}
    <div className="relative h-full">
      <div className="absolute inset-0 flex items-stretch">
        <div className="w-full h-full">
          <div className="relative w-full h-full">
            {posters.map((imgSrc, index) => (
              dealSlide === index && (
                <div
                  key={imgSrc || index}
                  className="absolute inset-0"
                >
                  <Image
                    src={imgSrc}
                    alt={`Poster ${index + 1}`}
                    fill
                    priority={index === 0}
                    className="object-contain object-center"
                    sizes="(max-width: 1024px) 100vw, 70vw"
                  />
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Right 30% black area: centered content with animated labels, enlarged card, price, and button - Only show on extra large screens */}
    <div className="relative h-full hidden xl:flex items-center justify-center">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-4 flex flex-col items-center justify-center h-full">
        {/* Animated labels above card (staggered) */}
        <div className="mb-2 md:mb-4">
          {!dealsLoading && deals.length > 0 && deals[dealSlide] && (
            <>
              <div className="font-cormorant text-sm md:text-xl lg:text-2xl xl:text-3xl uppercase font-semibold tracking-[0.30em] leading-snug text-white reveal-switch reveal-delay-1 text-center md:text-left">{deals[dealSlide].title}</div>
              <div className="mt-1 font-cormorant text-base md:text-3xl lg:text-4xl xl:text-5xl uppercase font-semibold tracking-[0.32em] leading-tight text-white reveal-switch reveal-delay-2 text-center md:text-left">{deals[dealSlide].subtitle}</div>
            </>
          )}
        </div>
        {/* Product card */}
        <div className="inline-block mx-auto">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 overflow-hidden rounded-xl">
            {dealsLoading ? (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            ) : deals.length > 0 ? (
              deals.map((d, index) => (
                <div
                  key={d.id || index}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${dealSlide === index ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Link href={`/produk/${d.produk_id}/detail`} className="block w-full h-full">
                    <Image
                      src={cacheSrc(d.img) || d.img}
                      alt={d.produk?.nama_produk || "Produk"}
                      fill
                      sizes="(max-width: 768px) 60vw, 30vw"
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      priority={index === 0}
                    />
                    {/* Discount percentage badge - circular design with rotation */}
                    {d.discountPercentage && (
                      <div className="absolute top-2 left-2 w-12 h-12 bg-red-600 rounded-full flex flex-col items-center justify-center text-white shadow-lg z-10 transform -rotate-12">
                        <span className="text-xs font-bold leading-none">-{d.discountPercentage}%</span>
                        <span className="text-xs font-bold leading-none">OFF</span>
                      </div>
                    )}
                  </Link>
                </div>
              ))
            ) : (
              <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Tidak ada deals</p>
              </div>
            )}
          </div>
        </div>
        {/* Slider indicators under card */}
        <div className="mt-2 flex items-center justify-center">
          <div className="flex items-center gap-2.5">
            {!dealsLoading && deals.length > 0 && deals.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setDealSlide(i)}
                className={`h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                  dealSlide === i
                    ? 'bg-white border-white scale-110 shadow-[0_0_0_2px_rgba(255,255,255,0.2)]'
                    : 'bg-transparent border-white/50 opacity-70 hover:opacity-100 hover:border-white'
                }`}
              />
            ))}
          </div>
        </div>
        {/* Price labels */}
        <div className="mt-3 flex items-baseline justify-center gap-3">
          {!dealsLoading && deals.length > 0 && deals[dealSlide] && (
            <>
              <span className="font-belleza text-xs md:text-base text-white/80 line-through">{deals[dealSlide].old}</span>
              <span className="font-belleza text-sm md:text-xl text-white font-bold">{deals[dealSlide].new}</span>
            </>
          )}
        </div>
        {/* Animated buy button */}
        <div className="mt-3 flex justify-center">
          {!dealsLoading && deals.length > 0 && deals[dealSlide] && (
            <Link
              href={`/produk/${deals[dealSlide].produk_id}/detail`}
              className="group btn-buy block"
            >
              <span className="inline-flex items-center gap-2">
                <span className="font-belleza text-sm md:text-base">BELI SEKARANG</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          )}
        </div>
        {/* Refresh button */}
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleRefreshDeals}
            disabled={dealsLoading}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs text-white/70 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh data deals"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${dealsLoading ? 'animate-spin' : ''}`}>
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

        {/* Section 3: Diskon */}
        <section className="bg-white py-12 md:py-16" data-route="/home">
          <div className="max-w-[120rem] mx-auto px-6 md:px-8 reveal-on-scroll" data-reveal>
            <div className="grid grid-cols-1 md:grid-cols-[0.2fr_1.1fr] xl:grid-cols-[0.2fr_1.4fr] 2xl:grid-cols-[0.2fr_1.7fr] items-stretch gap-8 md:gap-10">
              {/* Left 20%: centered labels */}
              <div className="hidden md:flex items-center justify-start text-left -ml-2 md:-ml-3">
                <div>
                  <h2 className="font-cormorant text-sm md:text-base lg:text-lg text-gray-500 tracking-wide animate-float">DISKON PRODUK</h2>
                  <div className="mt-1.5 flex items-baseline justify-start gap-1.5 font-belleza text-xl md:text-2xl lg:text-3xl text-black">
                    <span className="whitespace-nowrap animate-float-2">Sampai dengan</span>
                    <span className="whitespace-nowrap underline decoration-2 underline-offset-4 animate-float-3"><span className="text-red-600">70%</span>Off</span>
                  </div>
                </div>
                
              </div>
              {/* Right 80%: banner responsive */}
              <div className="flex items-center justify-center md:justify-end pr-0 md:pr-6 xl:pr-8">
                {/* Mobile banner */}
                <div className="relative w-full aspect-[24/4] overflow-hidden bg-gray-200 translate-x-0 md:hidden">
                  <Image
                    src="/images/diskon_banner.png"
                    alt="Diskon sampai dengan 70%"
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
                {/* Desktop/Tablet banner */}
                <div className="relative hidden md:block w-full md:w-[98%] md:aspect-[32/4] overflow-hidden bg-gray-200 md:translate-x-4 xl:translate-x-6">
                  <Image
                    src="/images/diskon_banner.png"
                    alt="Diskon sampai dengan 70%"
                    fill
                    sizes="(min-width: 1536px) 75vw, (min-width: 1280px) 70vw, (min-width: 768px) 80vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Koleksi Utama Kami */}
        <section id="produk" className="bg-white py-12 md:py-14" data-route="/home">
          <div className="px-6 md:px-8 reveal-on-scroll" data-reveal>
            <div className="section3-layout items-start">
              {/* Left sidebar (very wide screens only) */}
              <aside className="section3-sidebar">
                <div className="mt-5 md:mt-7 border border-gray-300 rounded-lg p-4 md:p-5 bg-white min-h-[300px] flex flex-col md:ml-3 xl:ml-4 2xl:ml-6">
                  <h3 className="font-cormorant text-xl lg:text-2xl text-black mb-4">Produk terbaru</h3>
                  <ul className="font-belleza text-base text-gray-700 space-y-3 md:space-y-4 flex-1">
                    {latestLoading ? (
                      <li className="text-gray-500">Memuat...</li>
                    ) : latest.length === 0 ? (
                      <li className="text-gray-500">Tidak ada produk</li>
                    ) : (
                      latest.slice(0, 10).map((p: any) => (
                        <li key={p.id} className="flex items-center justify-between">
                          <a href={`/produk/${p.id}/detail`} className="hover:underline">
                            {p.nama_produk || 'Produk'}
                          </a>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 text-gray-500">
                            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Terlaris list (horizontal, no rounded) */}
                <div className="mt-8 pl-4 md:pl-5 md:ml-3 xl:ml-4 2xl:ml-6">
                  <h4 className="font-cormorant text-xl lg:text-2xl text-black mb-4">Mungkin kamu suka</h4>
                  <ul className="space-y-4">
                    {latestLoading ? (
                      <li className="text-gray-500">Memuat...</li>
                    ) : latest.length === 0 ? (
                      <li className="text-gray-500">Tidak ada produk</li>
                    ) : (
                      latest.slice(0, 7).map((p: any) => (
                        <li key={p.id}>
                          <a href={`/produk/${p.id}/detail`} className="flex items-center gap-5 group">
                            <div className="relative w-20 h-20 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                              {p.photo1 ? (
                                <Image src={p.photo1} alt={p.nama_produk || 'Produk'} fill sizes="80px" className="object-cover" />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-belleza text-lg md:text-xl text-gray-800 truncate group-hover:underline">{p.nama_produk || 'Produk'}</p>
                              <p className="font-belleza text-base md:text-lg text-black font-semibold mt-0.5">Rp {Number(p.harga || 0).toLocaleString('id-ID')}</p>
                            </div>
                          </a>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </aside>
              {/* Main content */}
              <div className="w-full">
                <h2 className="font-cormorant text-xl md:text-2xl lg:text-4xl text-center text-black">
                  Koleksi Utama
                </h2>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  {collectionFilters.slice(0, 1).map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      className={
                        index === 0
                          ? 'rounded-full bg-black text-white px-4 py-2 text-xs font-semibold tracking-wide shadow-sm'
                          : 'rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-gray-600 hover:border-black/60 hover:text-black transition-colors'
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-end max-w-[90rem] mx-auto">
                  <Link
                    href="/produk"
                    aria-label="Lihat lebih banyak produk"
                    className="inline-flex items-center gap-2 font-belleza text-sm md:text-base text-black underline"
                  >
                    <span>Lihat lebih banyak produk</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>

                <div className="mt-1 md:mt-2 lg:mt-3 max-w-[90rem] mx-auto grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-7 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-8 xl:grid-cols-4 xl:gap-x-10 xl:gap-y-10 items-start" style={{ alignItems: 'start' }}>
                  {pageLoading && pageItems.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500">Memuat...</div>
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
                          className={`group relative flex flex-col bg-white transition-all duration-300 ${isHovered ? 'z-10' : 'z-0'} overflow-visible `}
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
                              href={`/produk/${product.id}/detail`}
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
                                  src={cacheSrc(product?.photo2) ?? photoSrc}
                                  alt={product.nama_produk || 'Produk'}
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                  className="object-contain"
                                />
                              </div>
                            </Link>
                          </div>

                          <div className="flex flex-1 flex-col px-4 pt-3 pb-4 relative">
                            <div className="flex items-center justify-start text-[10px] uppercase tracking-[0.2em] text-gray-400 font-belleza">
                              <span>MEORIS</span>
                            </div>
                            <Link
                              href={`/produk/${product.id}/detail`}
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
                            className={`absolute left-0 right-0 top-full -mt-px px-4 pb-4 bg-inherit shadow-none  transition-all duration-500 ease-in-out ${
                              isHovered ? 'opacity-100 -translate-y-px' : 'opacity-0 -translate-y-4 pointer-events-none'
                            }`}
                            style={{ boxShadow: 'none' }}
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
            </div>
          </div>
        </section>
        {/* Section 5: Features Section - Modern Clean Design */}
        <section className="relative overflow-hidden bg-white py-6 md:py-10" data-route="/home">
          <div className="max-w-7xl mx-auto px-6 md:px-8 reveal-on-scroll" data-reveal>
            {/* Top border accent */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-black to-transparent mb-8 md:mb-12"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {/* Feature 1 - Diskon Pengiriman */}
              <div className="group relative py-6 md:py-8 px-6 md:px-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-gray-50/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                    <Image
                      src="/images/shipped.png"
                      alt="Diskon Pengiriman"
                      width={64}
                      height={64}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                </div>
                <h3 className="font-cormorant text-xl md:text-2xl font-semibold text-black mb-2 tracking-wide">
                  Diskon Pengiriman
                </h3>
                <p className="font-belleza text-sm md:text-base text-gray-600 max-w-[260px]">
                  Nikmati potongan harga pengiriman untuk setiap pembelian
                </p>

                {/* Vertical divider - hidden on mobile, shown on md+ */}
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-2/3 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                {/* Horizontal divider - shown on mobile only */}
                <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Feature 2 - 24/7 Dukungan Langsung */}
              <div className="group relative py-6 md:py-8 px-6 md:px-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-gray-50/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                    <Image
                      src="/images/support.png"
                      alt="24/7 Dukungan Langsung"
                      width={64}
                      height={64}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                </div>
                <h3 className="font-cormorant text-xl md:text-2xl font-semibold text-black mb-2 tracking-wide">
                  24/7 Dukungan Langsung
                </h3>
                <p className="font-belleza text-sm md:text-base text-gray-600 max-w-[260px]">
                  Tim kami siap membantu kapan saja Anda membutuhkan
                </p>

                {/* Vertical divider - hidden on mobile, shown on md+ */}
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-2/3 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                {/* Horizontal divider - shown on mobile only */}
                <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Feature 3 - Pembayaran Mudah */}
              <div className="group relative py-6 md:py-8 px-6 md:px-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-gray-50/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-black/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                    <Image
                      src="/images/payment.png"
                      alt="Pembayaran Mudah"
                      width={64}
                      height={64}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                </div>
                <h3 className="font-cormorant text-xl md:text-2xl font-semibold text-black mb-2 tracking-wide">
                  Pembayaran Mudah
                </h3>
                <p className="font-belleza text-sm md:text-base text-gray-600 max-w-[260px]">
                  Berbagai metode pembayaran yang aman dan terpercaya
                </p>
              </div>
            </div>

            {/* Bottom border accent */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-black to-transparent mt-8 md:mt-12"></div>
          </div>
        </section>
        {/* Section 6: Scroll Test (Transparent with background image) */}
        <section className="relative overflow-hidden bg-transparent py-10 md:py-6 lg:py-14" data-route="/home">
          {/* Background image layer behind for cool scrolling effect */}
          <div
            className="absolute inset-0 -z-10 bg-center bg-cover bg-fixed"
            aria-hidden="true"
            style={{ backgroundImage: "url(/images/bgg.png)" }}
          />
          <div className="max-w-7xl mx-auto px-6 md:px-8 reveal-on-scroll" data-reveal>
            <div className="h-[28vh] md:h-[18vh] lg:h-[27.9vh] flex items-center justify-start">
              <div className="w-full sm:w-[80%] md:w-[60%] lg:w-[48%] max-w-xl">
                <h3 className="font-cormorant text-xl md:text-2xl lg:text-4xl text-black">Kabar Spesial!</h3>
                <p className="font-belleza text-sm md:text-base text-gray-800 mt-3">
                  Hanya perlu sedetik untuk jadi yang pertama mengetahui kabar terbaru dari kami.
                </p>
                <form className="mt-5 flex flex-col sm:flex-row gap-3" onSubmit={handleNewsletterSubmit}>
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
        {/* Section 7: Footer-style info blocks */}
<section className="bg-white md:bg-black py-6 md:py-16" data-route="/home">
  <div className="max-w-7xl mx-auto px-6 md:px-8 reveal-on-scroll" data-reveal>
    {/* Mobile compact footer (unchanged) */}
    <div className="grid grid-cols-1 md:hidden gap-4">
      {/* Brand + contact */}
      <div className="space-y-3">
        <div className="-ml-1">
          <span className="font-cormorant font-bold text-xl tracking-wide text-black">MEORIS</span>
          <div className="mt-1 text-[11px] tracking-[0.3em] uppercase text-gray-600 md:text-white">Footwear</div>
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
          <li><Link href="/docs/notifikasi" className="hover:underline">Notifikasi</Link></li>
        </ul>
      </div>

      {/* Help & Support */}
      <div className="pb-2">
        <h4 className="font-cormorant text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
        <div className="mt-1 w-10 h-[2px] bg-black"></div>
        <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
          <li><Link href="/docs/pengembalian" className="hover:underline">Pengembalian</Link></li>
          <li><Link href="/docs/syarat&ketentuan" className="hover:underline">Syarat & Ketentuan</Link></li>
          <li><Link href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</Link></li>
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
          <li><Link href="/produk/pesanan" className="hover:underline">Pesanan</Link></li>
        </ul>
      </div>
    </div>

    {/* Desktop/Tablet redesigned footer */}
    <div className="hidden md:block md:text-white md:[&_a]:text-white md:[&_p]:text-white md:[&_h4]:text-white md:[&_span]:text-white md:[&_li]:text-white md:[&_svg]:text-white md:[&_span.text-black]:text-white md:[&_p.text-black]:text-white md:[&_a.text-black]:text-white md:[&_h4.text-black]:text-white md:[&_div.text-black]:text-white md:[&_a:hover]:opacity-80">
      <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-12">
        {/* Brand + social */}
        <div className="space-y-5 lg:col-span-1">
          <div className="ml-0 md:-ml-2">
            <span className="font-cormorant font-bold text-3xl tracking-wide text-black">MEORIS</span>
            <div className="mt-1 text-[11px] tracking-[0.3em] uppercase text-gray-600 md:text-white">Footwear</div>
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
            <li><Link href="/produk" className="hover:underline">Koleksi Terbaru</Link></li>
            <li><Link href="/produk" className="hover:underline">Best Seller</Link></li>
          </ul>
        </div>

        {/* Bantuan & Layanan */}
        <div className="pb-3 md:pb-4">
          <h4 className="font-cormorant text-xl text-black">Bantuan &amp; Layanan</h4>
          <div className="mt-2 w-10 h-[2px] bg-black md:bg-white"></div>
          <ul className="mt-4 space-y-3 font-belleza text-gray-700">
            <li><Link href="/docs/pengembalian" className="hover:underline">Pengembalian</Link></li>
            <li><Link href="/docs/syarat&amp;ketentuan" className="hover:underline">Syarat &amp; Ketentuan</Link></li>
            <li><Link href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</Link></li>
            <li><Link href="/docs/notifikasi" className="hover:underline">Notifikasi</Link></li>
          </ul>
        </div>

        {/* Akun Saya */}
        <div className="pb-3 md:pb-4">
          <h4 className="font-cormorant text-xl text-black">Akun Saya</h4>
          <div className="mt-2 w-10 h-[2px] bg-black md:bg-white"></div>
          <ul className="mt-4 space-y-3 font-belleza text-gray-700">
            <li><Link href="/my-account" className="hover:underline">Detail Akun</Link></li>
            <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>Keranjang</a></li>
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
              <span>info@meoris.erdanpee.com</span>
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
      </main>
  );
}

export default function Page() {
  return (
    <DealsCacheProvider>
      <PageContent />
    </DealsCacheProvider>
  );
}





