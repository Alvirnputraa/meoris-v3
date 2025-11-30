"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function PengembalianPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [copyToast, setCopyToast] = useState<{ show: boolean; success: boolean; message: string }>({ show: false, success: true, message: '' });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const perPage = 5;
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'approved' | 'rejected' | 'completed'>('date-desc');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  const fetchReturns = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, get returns data
      const { data: returnsData, error: returnsError } = await supabase
        .from("returns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (returnsError) {
        console.error("Error fetching returns:", returnsError);
        setError("Gagal memuat data pengembalian");
        setReturns([]);
        setLoading(false);
        return;
      }

      if (!returnsData || returnsData.length === 0) {
        setReturns([]);
        setLoading(false);
        return;
      }

      // Then, for each return, fetch the order data with order_items and produk
      const returnsWithOrders = await Promise.all(
        returnsData.map(async (returnItem) => {
          if (!returnItem.order_id) {
            return { ...returnItem, orders: null };
          }

          try {
            const { data: orderData, error: orderError } = await supabase
              .from("orders")
              .select(`
                id,
                order_number,
                shipping_address,
                shipping_status,
                order_items (
                  id,
                  size,
                  quantity,
                  produk:produk_id (
                    id,
                    nama_produk,
                    photo1
                  )
                )
              `)
              .eq("id", returnItem.order_id)
              .single();

            if (orderError) {
              console.error(`Error fetching order ${returnItem.order_id}:`, orderError);
              return { ...returnItem, orders: null };
            }

            console.log("Order data for return:", returnItem.id, orderData);
            return { ...returnItem, orders: orderData };
          } catch (err) {
            console.error(`Exception fetching order ${returnItem.order_id}:`, err);
            return { ...returnItem, orders: null };
          }
        })
      );

      console.log("Returns with orders:", returnsWithOrders);
      setReturns(returnsWithOrders || []);
    } catch (error) {
      console.error("Error fetching returns:", error);
      setError("Terjadi kesalahan saat memuat data");
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReturns();
    }
  }, [user, fetchReturns]);

  const handleShowAddress = (address: string) => {
    setSelectedAddress(address);
    setShowAddressModal(true);
  };

  const handleCloseModal = () => {
    setShowAddressModal(false);
    setSelectedAddress("");
  };

  const handleCopyOrderId = (orderId: string) => {
    try {
      navigator.clipboard.writeText(orderId);
      setCopyToast({ show: true, success: true, message: 'ID Pesanan berhasil disalin!' });
      setTimeout(() => setCopyToast({ show: false, success: true, message: '' }), 3000);
    } catch (e) {
      setCopyToast({ show: true, success: false, message: 'Gagal menyalin ID Pesanan' });
      setTimeout(() => setCopyToast({ show: false, success: true, message: '' }), 3000);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "returned":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu Persetujuan";
      case "approved":
        return "Disetujui";
      case "returned":
        return "Barang Dikembalikan";
      case "rejected":
        return "Ditolak";
      case "completed":
        return "Selesai";
      default:
        return status;
    }
  };

  // Filter and sort returns
  const filteredAndSortedReturns = (() => {
    if (!Array.isArray(returns) || returns.length === 0) {
      return [];
    }

    let filtered = [...returns];

    // Apply status filters
    if (sortBy === 'approved') {
      filtered = filtered.filter(r => r?.status === 'approved' || r?.status === 'returned');
    } else if (sortBy === 'rejected') {
      filtered = filtered.filter(r => r?.status === 'rejected');
    } else if (sortBy === 'completed') {
      filtered = filtered.filter(r => r?.status === 'completed');
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime();
      }
      return 0;
    });

    return filtered;
  })();

  // Reset to first page when returns list changes or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [returns.length, sortBy, activeFilter]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <main className="flex flex-col min-h-screen">
        <Header variant="docs" />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-8">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-cormorant text-gray-900">{error}</h2>
            <button
              onClick={() => fetchReturns()}
              className="mt-4 px-4 py-2 bg-black text-white hover:opacity-90 transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      {/* Header */}
      <Header variant="docs" />

      {/* Section 1: Hero dengan background bg22.png */}
      <div className="flex-grow">
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-gray-100">
          <h1 className="font-cormorant text-3xl md:text-4xl text-gray-100">Pengembalian</h1>
          <div className="mt-3 font-belleza text-sm text-gray-100">
            <Link href="/" className="hover:underline">Beranda</Link>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Pengembalian</span>
          </div>
        </div>
      </section>

      {/* Section 2: Tabel Pengembalian */}
      <section className="bg-white py-8 md:py-12 min-h-[55vh] md:min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Filter & Sort Bar (Desktop Only) */}
          <div className="hidden md:flex items-center justify-between mb-8 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-cormorant text-lg text-gray-900">Filter & Urutkan</span>
              {filteredAndSortedReturns.length !== returns.length && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {filteredAndSortedReturns.length} dari {returns.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
                <button
                  onClick={() => { setSortBy('date-desc'); setActiveFilter('all'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'all'
                      ? 'bg-black text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-black'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => { setSortBy('approved'); setActiveFilter('approved'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'approved'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-600'
                  }`}
                >
                  Disetujui
                </button>
                <button
                  onClick={() => { setSortBy('rejected'); setActiveFilter('rejected'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'rejected'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-red-600'
                  }`}
                >
                  Ditolak
                </button>
                <button
                  onClick={() => { setSortBy('completed'); setActiveFilter('completed'); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === 'completed'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-green-600'
                  }`}
                >
                  Selesai
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="appearance-none bg-gradient-to-r from-white to-gray-50 border-2 border-gray-300 hover:border-black hover:from-gray-50 hover:to-white text-gray-900 text-sm font-semibold px-5 py-2.5 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md min-w-[140px] text-left"
                >
                  {sortBy === 'date-desc' ? 'Terbaru' : 'Terlama'}
                </button>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-600">
                  <svg className={`w-5 h-5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('date-desc');
                        setActiveFilter('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        sortBy === 'date-desc'
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Terbaru
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('date-asc');
                        setActiveFilter('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        sortBy === 'date-asc'
                          ? 'bg-black text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Terlama
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Modern Card Grid */}
          {loading ? (
            <div className="hidden md:flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                <p className="mt-3 font-belleza text-gray-700">Memuat data pengembalian...</p>
              </div>
            </div>
          ) : returns.length === 0 ? (
            <div className="hidden md:flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-3 font-belleza text-gray-700">Belum ada permintaan pengembalian</p>
                <Link href="/produk/pesanan" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm hover:opacity-90 transition">
                  Lihat Pesanan
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:grid md:grid-cols-1 gap-4">
                {filteredAndSortedReturns.slice((currentPage - 1) * perPage, currentPage * perPage).map((returnItem) => {
                  const orderItems = returnItem.orders?.order_items || [];
                  const firstProduct = orderItems[0]?.produk;
                  const orderNumber = returnItem.order_number || returnItem.orders?.order_number || "-";
                  const orderId = orderNumber !== "-" ? orderNumber.substring(0, 8) : "-";
                  const defaultStoreAddress = "Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat, 46181\n+6289695971729";
                  const fullAddress = returnItem.orders?.shipping_address || defaultStoreAddress;

                  return (
                    <div key={returnItem.id} className="group bg-white border-2 border-gray-200 hover:border-black transition-all duration-300 shadow-sm hover:shadow-lg px-5 py-3">
                      <div className="flex items-center gap-6">
                        {/* Product Image */}
                        <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 border border-gray-200">
                          {firstProduct?.photo1 ? (
                            <Image
                              src={firstProduct.photo1}
                              alt={firstProduct.nama_produk || "Produk"}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Return Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Product Name */}
                          <div className="flex items-center gap-2">
                            <h2 className="font-belleza text-base font-semibold text-gray-900 truncate">
                              {firstProduct?.nama_produk || "Produk"}
                            </h2>
                            {orderItems.length > 1 && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold whitespace-nowrap">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {orderItems.length - 1}+
                              </span>
                            )}
                          </div>

                          {/* ID Pesanan */}
                          <div className="flex items-center gap-3">
                            <span className="font-belleza text-sm text-gray-600">ID Pesanan:</span>
                            <div className="flex items-center gap-2">
                              <h3 className="font-cormorant text-base font-medium text-gray-900">#{orderId}</h3>
                              <button
                                onClick={() => handleCopyOrderId(orderNumber)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                aria-label="Salin ID Pesanan"
                              >
                                <svg className="w-4 h-4 text-gray-600 hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-belleza">
                                {new Date(returnItem.created_at).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Status Pengiriman Card */}
                          <div className="flex items-center gap-2">
                            <div className="px-4 py-2 bg-gray-100 rounded-md text-gray-700 text-sm font-medium">
                              <span className="font-belleza">
                                {returnItem.orders?.shipping_status || 'Pesanan sedang disiapkan'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions & Status Persetujuan */}
                        <div className="flex flex-col items-end gap-3 pl-6 border-l-2 border-gray-200">
                          {/* Status Persetujuan Section */}
                          <div className="text-right w-full">
                            <div className="text-xs text-gray-500 font-belleza mb-2">Status Persetujuan</div>
                            <div className={`inline-flex items-center px-4 py-2 text-sm font-bold ${getStatusBadgeClass(returnItem.status)}`}>
                              {getStatusLabel(returnItem.status)}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center gap-2">
                            {returnItem.status === "approved" && !returnItem.shipping_arranged ? (
                              <Link
                                href={`/pengembalian/atur-pengiriman/${returnItem.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors group-hover:scale-105 duration-300"
                              >
                                <span>Atur Pengiriman</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </Link>
                            ) : returnItem.status === "approved" && returnItem.return_waybill ? (
                              <Link
                                href={`/detail-pengembalian?id=${returnItem.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors group-hover:scale-105 duration-300"
                              >
                                <span>Lihat Detail</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </Link>
                            ) : returnItem.status === "approved" ? (
                              <button
                                onClick={() => handleShowAddress(fullAddress)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors group-hover:scale-105 duration-300"
                              >
                                <span>Lihat Instruksi</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            ) : returnItem.status === "rejected" ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 text-sm cursor-not-allowed border border-red-300"
                              >
                                <span>Ditolak</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-300 text-gray-500 text-sm cursor-not-allowed"
                              >
                                <span>Menunggu</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination for desktop */}
              {!loading && filteredAndSortedReturns.length > perPage && (
                <div className="hidden md:flex mt-8 items-center justify-center gap-4">
                  <button
                    type="button"
                    aria-label="Halaman Sebelumnya"
                    className={`w-10 h-10 grid place-items-center rounded-full border-2 transition-all ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'border-gray-400 text-gray-700 hover:bg-black hover:text-white hover:border-black cursor-pointer'
                    }`}
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <div className="px-4 py-2 bg-gray-100 rounded-md">
                    <span className="font-belleza text-sm font-medium text-gray-900">
                      Halaman {currentPage} dari {Math.ceil(filteredAndSortedReturns.length / perPage)}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Halaman Berikutnya"
                    className={`w-10 h-10 grid place-items-center rounded-full border-2 transition-all ${
                      currentPage >= Math.ceil(filteredAndSortedReturns.length / perPage)
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'border-gray-400 text-gray-700 hover:bg-black hover:text-white hover:border-black cursor-pointer'
                    }`}
                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredAndSortedReturns.length / perPage), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(filteredAndSortedReturns.length / perPage)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Rows (mobile cards) - tampil di mobile sampai medium screen */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">Memuat data pengembalian...</p>
              </div>
            ) : filteredAndSortedReturns.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-700 mb-4 font-body">Belum ada permintaan pengembalian</p>
                <Link
                  href="/produk/pesanan"
                  className="inline-flex w-full items-center justify-center bg-black text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition rounded-lg"
                >
                  Lihat Pesanan
                </Link>
              </div>
            ) : (
              filteredAndSortedReturns.map((returnItem) => {
                const orderItems = returnItem.orders?.order_items || [];
                const firstProduct = orderItems[0]?.produk;
                const orderNumber = returnItem.order_number || returnItem.orders?.order_number || "-";
                const orderId = orderNumber !== "-" ? orderNumber.substring(0, 8) : "-";

                const defaultStoreAddress = "Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat, 46181\n+6289695971729";
                const fullAddress = returnItem.orders?.shipping_address || defaultStoreAddress;

                return (
                  <div key={returnItem.id} className="bg-white border border-gray-200 p-3 space-y-3">
                    {/* Product Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-belleza text-sm font-semibold text-gray-900 line-clamp-2">
                          {firstProduct?.nama_produk || "Produk"}
                        </h3>
                        {orderItems.length > 1 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold mt-1">
                            +{orderItems.length - 1}
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(returnItem.status)}`}>
                        {getStatusLabel(returnItem.status)}
                      </span>
                    </div>

                    {/* ID Pesanan */}
                    <div className="flex items-center justify-between">
                      <span className="font-cormorant text-gray-900">ID Pesanan</span>
                      <div className="flex items-center gap-2">
                        <span className="font-belleza text-gray-800">#{orderId}</span>
                        <button
                          onClick={() => handleCopyOrderId(orderNumber)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          aria-label="Salin ID Pesanan"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between">
                      <span className="font-cormorant text-gray-900">Tanggal</span>
                      <span className="font-belleza text-gray-800 text-sm">
                        {new Date(returnItem.created_at).toLocaleDateString("id-ID", {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Status Pengiriman section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-cormorant text-gray-900">Status Pengiriman</span>
                      </div>
                      <div className="px-3 py-1.5 bg-gray-100 rounded text-gray-700 text-sm font-medium inline-block">
                        <span className="font-belleza">
                          {returnItem.orders?.shipping_status || 'Pesanan sedang disiapkan'}
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-1">
                      {returnItem.status === "approved" && !returnItem.shipping_arranged ? (
                        <Link
                          href={`/pengembalian/atur-pengiriman/${returnItem.id}`}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white hover:opacity-90 transition"
                        >
                          Atur Pengiriman
                        </Link>
                      ) : returnItem.status === "approved" && returnItem.return_waybill ? (
                        <Link
                          href={`/detail-pengembalian?id=${returnItem.id}`}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-black text-white hover:opacity-90 transition"
                        >
                          Lihat Detail
                        </Link>
                      ) : returnItem.status === "approved" ? (
                        <button
                          onClick={() => handleShowAddress(fullAddress)}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-black text-white hover:opacity-90 transition"
                        >
                          Lihat Instruksi
                        </button>
                      ) : returnItem.status === "rejected" ? (
                        <button
                          disabled
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-red-100 text-red-700 cursor-not-allowed border border-red-300"
                        >
                          Ditolak
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                        >
                          Menunggu
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
      </div>

      {/* Toast Notification */}
      {copyToast.show && (
        <div className="fixed top-20 right-4 z-[100] animate-slide-in-right">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            copyToast.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {copyToast.success ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-belleza text-sm">{copyToast.message}</span>
          </div>
        </div>
      )}

      {/* Modal Alamat Pengiriman */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-heading font-semibold text-gray-900">Alamat Pengiriman</h3>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 mb-4">
              {/* Info Penerima & Alamat - Satu Card */}
              <div className="bg-gray-50 rounded p-4 space-y-3">
                <div className="flex items-start">
                  <span className="font-heading font-semibold text-gray-900 w-24">Penerima</span>
                  <span className="font-body text-gray-900">: Meoris</span>
                </div>
                <div className="flex items-start">
                  <span className="font-heading font-semibold text-gray-900 w-24">Nomor</span>
                  <span className="font-body text-gray-900">: +6289695971729</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm font-body text-gray-700 leading-relaxed">
                    Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat, 46181
                  </p>
                </div>
              </div>

              {/* Peringatan */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-body text-yellow-800">
                    Pastikan anda mengirimkan produk ke alamat ini
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <button
              onClick={handleCloseModal}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition font-body text-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Section 3: Footer */}
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
                <h4 className="font-heading text-base text-black whitespace-nowrap">Informasi</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><Link href="/user/purchase?view=notifications" className="hover:underline">Notifikasi</Link></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-heading text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><Link href="/pengembalian" className="hover:underline">Pengembalian</Link></li>
                  <li><Link href="/terms-condition" className="hover:underline">Syarat & Ketentuan</Link></li>
                  <li><Link href="/privacy-policy" className="hover:underline">Kebijakan Privasi</Link></li>
                </ul>
              </div>

              {/* My Account */}
              <div className="pb-2">
                <h4 className="font-heading text-base text-black whitespace-nowrap">Akun Saya</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><Link href="/my-account" className="hover:underline">Detail Akun</Link></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline">Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline">Favorit</a></li>
                  <li><Link href="/produk/pesanan" className="hover:underline">Pesanan</Link></li>
                </ul>
              </div>
            </div>

            {/* Desktop: Right aligned */}
            <div className="hidden md:flex items-center justify-end">
              <div className="font-body text-gray-600 text-sm flex items-center flex-wrap justify-end gap-x-2">
                <span className="font-heading font-bold text-black">MEORIS</span>
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
    </main>
  );
}
