"use client";

import { useEffect, useState } from "react";
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
  const [resiInput, setResiInput] = useState<{ [key: string]: string }>({});
  const [updatingResi, setUpdatingResi] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchReturns();
    }
  }, [user]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("returns")
        .select(`
          *,
          orders (
            order_number,
            shipping_address,
            order_items (
              size,
              quantity,
              produk (
                nama_produk,
                photo1
              )
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching returns:", error);
        throw error;
      }
      console.log("Returns data:", data);
      setReturns(data || []);
    } catch (error) {
      console.error("Error fetching returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResi = async (returnId: string) => {
    const resi = resiInput[returnId];
    if (!resi || !resi.trim()) {
      alert("Silakan masukkan nomor resi pengembalian");
      return;
    }

    try {
      setUpdatingResi(returnId);
      const { error } = await supabase
        .from("returns")
        .update({ 
          notes: resi.trim(),
          status: 'returned'
        })
        .eq("id", returnId);

      if (error) throw error;

      alert("Nomor resi pengembalian berhasil disimpan!");
      await fetchReturns();
      setResiInput({ ...resiInput, [returnId]: "" });
    } catch (error) {
      console.error("Error updating resi:", error);
      alert("Gagal menyimpan nomor resi");
    } finally {
      setUpdatingResi(null);
    }
  };

  const handleShowAddress = (address: string) => {
    setSelectedAddress(address);
    setShowAddressModal(true);
  };

  const handleCloseModal = () => {
    setShowAddressModal(false);
    setSelectedAddress("");
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

  if (!user || isLoading) {
    return null;
  }

  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <Header variant="docs" />

      {/* Section 1: Hero dengan background bg22.png */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: "url(/images/bg22.png)" }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8 flex flex-col items-center justify-center text-gray-800">
          <h1 className="font-heading text-2xl md:text-3xl text-gray-800">Pengembalian</h1>
          <div className="mt-2 font-body text-xs md:text-sm text-gray-800">
            <Link href="/" className="hover:underline">Beranda</Link>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-800">Pengembalian</span>
          </div>
        </div>
      </section>

      {/* Section 2: Tabel Pengembalian */}
      <section className="bg-white py-8 md:py-14 flex-grow">
        <div className="max-w-[95%] xl:max-w-[1600px] mx-auto px-4 md:px-8">
          {/* Header (desktop) - hanya tampil di layar extra large */}
          <div className="hidden xl:grid grid-cols-12 gap-4 bg-gray-100 px-6 py-4 font-heading text-gray-900 text-sm md:text-base">
            <div className="col-span-2 text-left">ID Pesanan</div>
            <div className="col-span-2 text-left">Produk</div>
            <div className="col-span-2 text-left pl-16">Status Pengembalian</div>
            <div className="col-span-3 text-right pr-8">Resi Pengembalian</div>
            <div className="col-span-3 text-right">Instruksi Pengiriman</div>
          </div>

          {/* Rows (desktop) - hanya tampil di layar extra large */}
          {loading ? (
            <div className="hidden xl:grid grid-cols-12 gap-4 items-center px-6 py-6 border-b border-gray-200">
              <div className="col-span-12 font-body text-gray-700">Memuat data pengembalian...</div>
            </div>
          ) : returns.length === 0 ? (
            <div className="hidden xl:grid grid-cols-12 gap-4 items-center px-6 py-8 border-b border-gray-200">
              <div className="col-span-12 font-body text-gray-700 text-center">
                <p className="mb-4">Belum ada permintaan pengembalian</p>
                <Link
                  href="/produk/pesanan"
                  className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm hover:opacity-90"
                >
                  Lihat Pesanan
                </Link>
              </div>
            </div>
          ) : (
            returns.map((returnItem) => {
              const orderItems = returnItem.orders?.order_items || [];
              const firstProduct = orderItems[0]?.produk;
              const orderNumber = returnItem.order_number || returnItem.orders?.order_number || "-";
              const shortOrderId = orderNumber !== "-" ? orderNumber.substring(0, 8) : "-";
              
              // Format shipping address - gunakan alamat toko sebagai default
              const defaultStoreAddress = "Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat, 46181\n+6289695971729";
              const fullAddress = returnItem.orders?.shipping_address || defaultStoreAddress;

              return (
                <div key={returnItem.id} className="hidden xl:grid grid-cols-12 gap-4 items-center px-6 py-5 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  {/* ID Pesanan - Rata Kiri */}
                  <div className="col-span-2 text-left">
                    <div className="font-heading text-gray-900 font-semibold">
                      #{shortOrderId}
                    </div>
                    <div className="text-xs font-body text-gray-500 mt-1">
                      {new Date(returnItem.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                  {/* Produk - Rata Kiri */}
                  <div className="col-span-2 text-left">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {firstProduct?.photo1 ? (
                          <Image
                            src={firstProduct.photo1}
                            alt={firstProduct.nama_produk}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-body text-gray-900">
                          {firstProduct?.nama_produk || "Produk"}
                          {orderItems[0]?.size && ` (Uk: ${orderItems[0].size})`}
                          {orderItems[0]?.quantity && ` x ${orderItems[0].quantity}`}
                        </div>
                        {orderItems.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            +{orderItems.length - 1} produk lainnya
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Status - Rata Kiri dengan padding */}
                  <div className="col-span-2 text-left pl-16">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-body font-semibold rounded-full ${getStatusBadgeClass(
                        returnItem.status
                      )}`}
                    >
                      {getStatusLabel(returnItem.status)}
                    </span>
                  </div>
                  {/* Resi Pengembalian - Rata Kanan */}
                  <div className="col-span-3 text-right pr-8">
                    {returnItem.status === "approved" && returnItem.return_waybill ? (
                      <div className="flex items-center justify-end gap-2">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-body text-gray-900 font-medium">
                          {returnItem.return_waybill}
                        </span>
                      </div>
                    ) : returnItem.status === "approved" ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="text"
                          value={resiInput[returnItem.id] || ""}
                          onChange={(e) =>
                            setResiInput({
                              ...resiInput,
                              [returnItem.id]: e.target.value,
                            })
                          }
                          placeholder="Masukkan nomor resi"
                          className="flex-1 max-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-black"
                          disabled={updatingResi === returnItem.id}
                        />
                        <button
                          onClick={() => handleUpdateResi(returnItem.id)}
                          disabled={
                            updatingResi === returnItem.id ||
                            !resiInput[returnItem.id]?.trim()
                          }
                          className="px-3 py-2 text-sm font-body bg-black text-white rounded-none hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {updatingResi === returnItem.id ? "Menyimpan..." : "Simpan"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-body text-gray-500">Resi belum tersedia</div>
                    )}
                  </div>
                  {/* Detail Pengembalian - Rata Kanan */}
                  <div className="col-span-3 text-right">
                    {returnItem.status === "approved" && returnItem.return_waybill ? (
                      <Link
                        href={`/detail-pengembalian?id=${returnItem.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-body bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Lihat Detail
                      </Link>
                    ) : returnItem.status === "approved" ? (
                      <button
                        onClick={() => handleShowAddress(fullAddress)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-body bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Lihat Detail
                      </button>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-body bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Lihat Detail
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Rows (mobile cards) - tampil di mobile sampai large screen */}
          <div className="xl:hidden space-y-4">
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">Memuat data pengembalian...</p>
              </div>
            ) : returns.length === 0 ? (
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
              returns.map((returnItem) => {
                const orderItems = returnItem.orders?.order_items || [];
                const firstProduct = orderItems[0]?.produk;
                const orderNumber = returnItem.order_number || returnItem.orders?.order_number || "-";
                const shortOrderId = orderNumber !== "-" ? orderNumber.substring(0, 8) : "-";
                
                const defaultStoreAddress = "Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat, 46181\n+6289695971729";
                const fullAddress = returnItem.orders?.shipping_address || defaultStoreAddress;

                return (
                  <div key={returnItem.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {/* Header dengan order ID dan status */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-body mb-1">ID Pesanan</p>
                          <p className="font-heading text-base font-semibold text-gray-900">#{shortOrderId}</p>
                        </div>
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                            returnItem.status
                          )}`}
                        >
                          {getStatusLabel(returnItem.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-body">
                        {new Date(returnItem.created_at).toLocaleDateString("id-ID", { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>

                    {/* Product info */}
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {firstProduct?.photo1 ? (
                            <Image
                              src={firstProduct.photo1}
                              alt={firstProduct.nama_produk}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 font-body mb-1 line-clamp-2">
                            {firstProduct?.nama_produk || "Produk"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {orderItems[0]?.size && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded">Uk: {orderItems[0].size}</span>
                            )}
                            {orderItems[0]?.quantity && (
                              <span>x{orderItems[0].quantity}</span>
                            )}
                          </div>
                          {orderItems.length > 1 && (
                            <p className="text-xs text-gray-500 mt-1">
                              +{orderItems.length - 1} produk lainnya
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Resi section */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2 font-heading">Resi Pengembalian</p>
                        {returnItem.status === "approved" && returnItem.return_waybill ? (
                          <div className="flex items-center gap-2 bg-green-50 border border-green-200 p-3 rounded-lg">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 font-body">
                              {returnItem.return_waybill}
                            </span>
                          </div>
                        ) : returnItem.status === "approved" ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={resiInput[returnItem.id] || ""}
                              onChange={(e) =>
                                setResiInput({
                                  ...resiInput,
                                  [returnItem.id]: e.target.value,
                                })
                              }
                              placeholder="Masukkan nomor resi"
                              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                              disabled={updatingResi === returnItem.id}
                            />
                            <button
                              onClick={() => handleUpdateResi(returnItem.id)}
                              disabled={
                                updatingResi === returnItem.id ||
                                !resiInput[returnItem.id]?.trim()
                              }
                              className="w-full px-4 py-2.5 text-sm font-medium bg-black text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updatingResi === returnItem.id ? "Menyimpan..." : "Simpan Resi"}
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">Resi belum tersedia</p>
                        )}
                      </div>

                      {/* Action button */}
                      {returnItem.status === "approved" && returnItem.return_waybill ? (
                        <Link
                          href={`/detail-pengembalian?id=${returnItem.id}`}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Lihat Detail Pengiriman
                        </Link>
                      ) : returnItem.status === "approved" ? (
                        <button
                          onClick={() => handleShowAddress(fullAddress)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Lihat Detail Pengiriman
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Lihat Detail Pengiriman
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
                  <li><Link href="/docs/notifikasi" className="hover:underline">Notifikasi</Link></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-heading text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-body text-gray-700 text-xs">
                  <li><Link href="/docs/pengembalian" className="hover:underline">Pengembalian</Link></li>
                  <li><Link href="/docs/syarat&ketentuan" className="hover:underline">Syarat & Ketentuan</Link></li>
                  <li><Link href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</Link></li>
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
    </main>
  );
}
