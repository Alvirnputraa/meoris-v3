"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const { count: cartCount } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()

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

  return (
    <main>
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
              <ul className="space-y-5 font-body text-gray-800">
                <li>
                  <Link href="/produk" onClick={() => setIsSidebarOpen(false)} className="flex items-center justify-between text-black hover:underline">
                    <span className="font-heading text-base">Produk</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                </li>
                <li>
                  <Link href="/my-account" className="flex items-center justify-between text-black hover:underline" onClick={() => setIsSidebarOpen(false)}>
                    <span className="font-heading text-base">Informasi Akun</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                </li>
                <li>
                  <a href="#" className="flex items-center justify-between text-black hover:underline">
                    <span>History Pesanan</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      )}
      {/* Right panels: Search, Cart, Favorite */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsSearchOpen(false)} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsSearchOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-heading text-xl md:text-2xl text-black">Cari Produk</span>
            </div>
            <div className="mt-6">
              <input type="text" placeholder="Cari produk" className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
              <div className="mt-3">
                <button className="w-full rounded-none bg-black text-white px-4 py-2 font-body text-sm hover:opacity-90 transition">Cari</button>
              </div>
            </div>
            <div className="mt-6">
              <p className="font-heading text-black">Hasil pencarian</p>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                  <Image src="/images/test1p.png" alt="Hasil produk" fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-gray-900 truncate">Nama Produk Contoh</p>
                  <p className="font-body text-sm text-gray-700 mt-1">Rp 250.000</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
      {isCartOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup keranjang" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsCartOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-heading text-xl md:text-2xl text-black">Item Keranjang</span>
            </div>
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4">
                <input type="checkbox" aria-label="Pilih item" className="w-5 h-5 accent-black shrink-0" defaultChecked />
                <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                  <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-gray-900 truncate">Nama Produk Contoh</p>
                  <p className="font-body text-sm text-gray-700 mt-1"><span className="text-black">1 x</span> Rp 250.000</p>
                </div>
                <button type="button" aria-label="Hapus item" className="p-2 rounded hover:bg-gray-100 text-black">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            <div className="pt-4">
              <p className="font-heading text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp 250.000</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <a href="#" className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-body text-sm hover:opacity-90 transition w-full">Checkout</a>
                <a href="#" className="inline-flex items-center justify-center rounded-none bg-black px-4 py-2 font-body text-sm text-white hover:opacity-90 transition w-full">Checkout</a>
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
          <aside className="absolute right-0 top-0 h-full w-96 max-w-[92%] bg-white shadow-2xl p-6">
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
              <span className="font-heading text-xl md:text-2xl text-black">Favorit</span>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-5">
              {favoritesLoading && (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Memuat favorit...</p>
              ) : (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Belum ada favorit</p>
              ) : (
                favorites.map((favorite) => (
                  <div key={favorite.id} className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      aria-label="Pilih item"
                      className="w-5 h-5 accent-black shrink-0"
                      checked={selectedFavorites.has(favorite.id)}
                      onChange={(e) => handleFavoriteCheckbox(favorite.id, e.target.checked)}
                    />
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
                      onClick={async () => {
                        await toggleFavorite(favorite.produk_id);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            {favorites && favorites.length > 0 && (
              <div className="pt-4">
                <button
                  className={`inline-flex items-center justify-center w-full rounded-none px-4 py-2 font-body text-sm transition ${
                    selectedFavorites.size > 0
                      ? 'bg-black text-white hover:opacity-90 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={selectedFavorites.size === 0}
                  onClick={() => {
                    if (selectedFavorites.size > 0) {
                      // Handle checkout logic here
                      console.log('Checkout with selected favorites:', Array.from(selectedFavorites));
                    }
                  }}
                >
                  Checkout ({selectedFavorites.size} item{selectedFavorites.size !== 1 ? 's' : ''})
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Header row */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-10 py-5">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black" onClick={() => setIsSidebarOpen(true)}>
              <Image src="/images/sidebar.png" alt="Menu" width={34} height={34} />
            </button>
            <Link href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-heading font-bold text-xl md:text-2xl lg:text-3xl tracking-wide text-black">MEORIS</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 lg:gap-5">
            <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }}>
              <Image src="/images/search.png" alt="Search" width={34} height={34} />
            </a>
            <a href="#" aria-label="Favorit" className="relative" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
              <Image src="/images/favorit.png" alt="Favorit" width={34} height={34} />
              <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
            </a>
            <a href="#" aria-label="Keranjang" className="relative" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
              <Image src="/images/cart.png" alt="Cart" width={34} height={34} />
              <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
            </a>
            <Link href="/my-account" aria-label="Akun">
              <Image src="/images/user.png" alt="User" width={34} height={34} />
            </Link>
          </div>
        </div>
      </div>

      {/* Section 1: title/breadcrumb */}
      <section className="relative overflow-hidden bg-transparent">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-gray-100">
          <h1 className="font-heading text-3xl md:text-4xl text-gray-100">Checkout</h1>
          <div className="mt-3 font-body text-sm text-gray-100">
            <span>Produk</span>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Checkout</span>
          </div>
        </div>
      </section>

      {/* Section 2: form (alamat + informasi tambahan) */}
      <section className="bg-white py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Alamat pengiriman */}
            <div>
              <h2 className="font-heading text-lg md:text-xl text-black">Alamat Pengiriman</h2>
              <div className="mt-3 space-y-3 max-w-xl">
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Nomor</label>
                  <input type="text" defaultValue="08964637888" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Nama Penerima</label>
                  <input type="text" defaultValue="John Doe" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Nama Jalan, Gedung, Nomor rumah</label>
                  <input type="text" defaultValue="Jl. Melati No. 12, Blok B" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Kecamatan/Desa</label>
                  <input type="text" defaultValue="Coblong" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Provinsi</label>
                  <input type="text" defaultValue="Jawa Barat" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Postal Code</label>
                  <input type="text" defaultValue="40123" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
                <div>
                  <label className="block font-body text-sm text-gray-700 mb-1">Negara</label>
                  <input type="text" defaultValue="Indonesia" className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                </div>
              </div>
            </div>

            {/* Informasi tambahan */}
            <div>
              <h2 className="font-heading text-base md:text-xl text-black">Informasi Tambahan</h2>
              <div className="mt-3 max-w-xl space-y-3">
                <label className="block font-body text-xs md:text-sm text-gray-700 mb-1">Informasi tambahan (opsional)</label>
                <textarea rows={4} placeholder="Catatan untuk kurir, jam penerimaan, dll." className="w-full rounded-md border border-gray-300 px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40"></textarea>

                <div className="mt-0">
                  <h3 className="font-heading text-base md:text-xl text-black mb-2">Pengiriman</h3>
                  <label className="block font-body text-xs md:text-sm text-gray-700 mb-1">Ekspedisi pengiriman</label>
                  <div className="relative">
                    <input
                      type="text"
                      value="J&T Express"
                      readOnly
                      className="w-full rounded-md border border-gray-300 px-2 py-2 pr-10 md:px-3 md:py-2.5 md:pr-12 text-xs md:text-sm text-black bg-white cursor-default"
                      aria-readonly="true"
                    />
                    <span className="absolute inset-y-0 right-2 my-auto flex items-center">
                      <Image src="/images/j&t.png" alt="J&T" width={28} height={28} className="md:w-8 md:h-8" />
                    </span>
                  </div>
                  {/* Kode Promo heading */}
                  <h3 className="font-heading text-base md:text-xl text-black mt-6 mb-2">Kode Promo</h3>
                  {/* Kupon input */}
                  <div>
                    <div className="flex items-end gap-3">
                      <input
                        type="text"
                        placeholder="Masukkan kode kupon"
                        className="flex-1 border-0 border-b border-gray-300 bg-transparent px-1 pb-1.5 md:pb-2 text-xs md:text-base text-black placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-black"
                      />
                      <button
                        type="button"
                        className="rounded-md bg-black text-white px-4 py-2 text-xs md:text-sm hover:opacity-90"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: ringkasan pesanan */}
      <section className="bg-white pb-14">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="border border-gray-300 p-5 md:p-6">
            <h3 className="font-heading text-xl md:text-2xl text-black">Detail Order</h3>
            <div className="mt-4">
              <div className="grid grid-cols-2 bg-gray-100 text-sm md:text-base font-heading font-semibold text-gray-900 px-4 py-3">
                <span>Product</span>
                <span className="text-right">Subtotal</span>
              </div>
              <div className="px-4 py-3 font-body text-gray-800">
                <div className="flex items-center justify-between">
                  <span className="truncate">Produk {id} × 1</span>
                  <span>Rp 250.000</span>
                </div>
              </div>
              <hr className="border-gray-300" />
              <div className="px-4 py-3 font-body text-gray-800 flex items-center justify-between font-semibold">
                <span>Biaya Jasa Kirim</span>
                <span>Rp 0</span>
              </div>
              <hr className="border-gray-300" />
              <div className="px-4 py-3 font-body text-gray-800 flex items-center justify-between">
                <span className="font-semibold">Subtotal</span>
                <span className="font-semibold">Rp 250.000</span>
              </div>
              <hr className="border-gray-300" />
              <div className="px-4 py-3 font-body text-black flex items-center justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold">Rp 250.000</span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <button type="button" className="w-full rounded-none bg-black text-white px-5 py-3 font-body text-sm md:text-base hover:opacity-90">
              PLACE ORDER
            </button>
          </div>
        </div>
      </section>

      {/* Footer (four-column) at bottom */}
      <footer className="bg-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
            {/* Brand + contact */}
            <div className="space-y-5">
              <div className="-ml-1 md:-ml-2">
                <span className="font-heading font-bold text-3xl tracking-wide text-black">MEORIS</span>
                <div className="mt-1 text-[11px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
              </div>
              <ul className="space-y-3 font-body text-gray-700">
                <li className="grid grid-cols-[20px_1fr] md:grid-cols-[28px_1fr] items-start gap-3">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-5 h-5 md:w-7 md:h-7"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                  <span className="text-sm md:text-sm leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                </li>
                <li className="grid grid-cols-[20px_1fr] md:grid-cols-[28px_1fr] items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-5 h-5 md:w-6 md:h-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                  <span>+6289695971729</span>
                </li>
                <li className="grid grid-cols-[20px_1fr] md:grid-cols-[28px_1fr] items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-5 h-5 md:w-6 md:h-6"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span>info@meoris.erdanpee.com</span>
                </li>
              </ul>
            </div>

            {/* Information */}
            <div className="pb-3 md:pb-4">
              <h4 className="font-heading text-xl text-black">Informasi</h4>
              <div className="mt-2 w-10 h-[2px] bg-black"></div>
              <ul className="mt-4 space-y-3 font-body text-gray-700">
                <li><a href="/docs/notifikasi" className="hover:underline">Notifikasi</a></li>
              </ul>
            </div>

            {/* My Account */}
            <div className="pb-3 md:pb-4">
              <h4 className="font-heading text-xl text-black">Bantuan &amp; Dukungan</h4>
              <div className="mt-2 w-10 h-[2px] bg-black"></div>
              <ul className="mt-4 space-y-3 font-body text-gray-700">
                <li><a href="/docs/pengembalian" className="hover:underline">Pengembalian</a></li>
                <li><a href="/docs/syarat&ketentuan" className="hover:underline">Syarat &amp; Ketentuan</a></li>
                <li><a href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</a></li>
              </ul>
            </div>

            {/* Help & Support */}
            <div className="pb-3 md:pb-4">
              <h4 className="font-heading text-xl text-black">Akun Saya</h4>
              <div className="mt-2 w-10 h-[2px] bg-black"></div>
              <ul className="mt-4 space-y-3 font-body text-gray-700">
                <li><a href="/my-account" className="hover:underline">Detail Akun</a></li>
                <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>Keranjang</a></li>
                <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
                <li><a href="/produk/pesanan" className="hover:underline">Pesanan</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
