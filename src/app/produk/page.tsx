"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import Header from "@/components/layout/Header";
import LottiePlayer from "@/components/LottiePlayer";
import { useProductCache } from "@/lib/ProductCacheContext";
import { useFavorites } from "@/lib/useFavorites";
import { produkDb, keranjangDb } from "@/lib/database";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

const curatedTags = [
  "Semua Produk",
];

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
// Local cache URL helper for product images (photo1/photo2)
const cacheSrc = (url?: string | null) => {
  const s = (url || '').trim();
  if (!s) return null;
  if (s.startsWith('/')) return s; // already local
  // route remote URL via local cache to store under public/images/cache
  return `/api/cache-image?url=${encodeURIComponent(s)}`;
};

export default function ProdukPage() {
  const { products, loading, isCacheReady } = useProductCache(); // Use cache context
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
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

  // Function to show notification
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <Header variant="docs" />

      <section className="relative overflow-hidden bg-white pt-[110px] pb-16">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#f8ede4,transparent_55%),radial-gradient(circle_at_bottom,#e7f0ff,transparent_60%)]"
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-black/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-gray-500">
                Discover
              </span>
              <h1 className="mt-4 font-cormorant text-3xl md:text-4xl lg:text-[42px] text-black leading-tight">
                Koleksi Sandal Terbaru Meoris
              </h1>
              <p className="mt-3 font-belleza text-gray-600 max-w-xl">
                Pilihan siluet elegan dengan material premium untuk menemani langkahmu setiap hari. Temukan warna dan bentuk yang memantulkan karakter personalmu.
              </p>
            </div>
            <div className="w-full max-w-md relative" ref={searchRef}>
              <label htmlFor="product-search" className="font-belleza text-sm text-black tracking-[0.2em] uppercase">
                Cari produk
              </label>
              <div className="mt-3 flex rounded-full bg-white shadow-sm border border-black/10 focus-within:ring-2 focus-within:ring-black/10">
                <input
                  id="product-search"
                  type="text"
                  placeholder="Cari nama produk, warna, atau koleksi"
                  className="flex-1 rounded-full bg-transparent px-5 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none font-belleza"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      handleSearchInput(searchQuery);
                    }
                  }}
                  className="m-1 inline-flex items-center justify-center rounded-full bg-transparent px-3 py-3 text-gray-600 hover:text-black transition-colors"
                >
                  {searchLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21L16.514 16.506M19 10.5A8.5 8.5 0 1110.5 2a8.5 8.5 0 018.5 8.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Search Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                  {searchResults.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/produk/${product.id}/detail`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-black/5 last:border-b-0"
                      onClick={() => {
                        setShowDropdown(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={product.photo1 || "/images/test1p.png"}
                          alt={product.nama_produk || "Produk"}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-cormorant text-sm text-black truncate">
                          {product.nama_produk}
                        </h4>
                        <p className="font-belleza text-sm font-semibold text-gray-700 mt-1">
                          Rp {Number(product.harga || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <svg 
                        className="w-5 h-5 text-gray-400 flex-shrink-0"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}

              {/* No Results Message */}
              {showDropdown && !searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden z-50 p-6 text-center">
                  <p className="font-belleza text-sm text-gray-500">Tidak ada produk ditemukan untuk "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start" style={{ alignItems: 'start' }}>
            {loading ? (
              <div className="col-span-full text-center font-belleza text-gray-500 py-12">Memuat produk...</div>
            ) : products && products.length > 0 ? (
              products.map((product: any, index: number) => {
                const photoSrc = cacheSrc(product?.photo1) ?? '/images/test1p.png';
                const { category, badge, colorway, description } = deriveProductMeta(product);
                // Use detail_label_previw from database if available, otherwise use derived badge
                const displayLabel = product?.detail_label_previw || badge;
                const priceLabel = Number(product?.harga || 0).toLocaleString('id-ID');
                const heartSrc = isFavorite(product.id) ? '/images/fav-u.png' : '/images/favorit.png';
                const isHovered = hoveredProduct === product.id;

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

                return (
                  <div
                    key={product.id}
                    className={`group relative flex flex-col bg-white transition-all duration-300 ${
                      isHovered ? 'z-10' : 'z-0'
                    } overflow-visible`}
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
                      {/* Discount percentage badge - rectangular design for product page */}
                      {product.discountPercentage && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded shadow-lg z-10">
                          -{product.discountPercentage}%
                        </div>
                      )}
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
                        <p className="font-belleza text-base md:text-lg font-semibold text-black">Rp {priceLabel}</p>
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
                    <div className={`absolute left-0 right-0 top-full -mt-px px-4 pb-4 bg-inherit shadow-none transition-all duration-500 ease-in-out ${
                      isHovered ? 'opacity-100 -translate-y-px' : 'opacity-0 -translate-y-4 pointer-events-none'
                    }`} style={{ boxShadow: 'none' }}>
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
              })
            ) : (
              <div className="col-span-full text-center font-belleza text-gray-500 py-12">Tidak ada produk</div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-6 md:py-4">
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
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
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
                  <li><Link href="/produk" className="hover:underline">Produk</Link></li>
                  <li><Link href="/produk/pesanan" className="hover:underline">Pesanan</Link></li>
                </ul>
              </div>
            </div>

            {/* Desktop: Right aligned */}
            <div className="hidden md:flex items-center justify-end">
              <div className="font-belleza text-gray-600 text-sm flex items-center flex-wrap justify-end gap-x-2">
                <span className="font-cormorant font-bold text-black">MEORIS</span>
                <span className="text-xs tracking-[0.2em] uppercase text-gray-500">Footwear</span>
                <span className="text-gray-300 mx-1">•</span>
                <Link href="/docs/notifikasi" className="hover:text-black transition-colors">Notifikasi</Link>
                <span className="text-gray-300">•</span>
                <Link href="/docs/pengembalian" className="hover:text-black transition-colors">Pengembalian</Link>
                <span className="text-gray-300">•</span>
                <Link href="/docs/syarat&ketentuan" className="hover:text-black transition-colors">Syarat & Ketentuan</Link>
                <span className="text-gray-300">•</span>
                <Link href="/docs/kebijakan-privacy" className="hover:text-black transition-colors">Kebijakan Privasi</Link>
                <span className="text-gray-300">•</span>
                <Link href="/my-account" className="hover:text-black transition-colors">Detail Akun</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
