"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function AturPengirimanPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const returnId = params?.returnId as string;

  const [loading, setLoading] = useState(true);
  const [returnData, setReturnData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    async function loadReturnData() {
      if (!user?.id || !returnId) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("returns")
          .select(`
            *,
            orders:order_id (
              id,
              order_number,
              shipping_address,
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
            )
          `)
          .eq("id", returnId)
          .eq("user_id", user.id)
          .single();

        if (fetchError) {
          console.error("Error fetching return:", fetchError);
          setError("Gagal memuat data pengembalian");
          return;
        }

        if (!data) {
          setError("Data pengembalian tidak ditemukan");
          return;
        }

        // Check if already arranged
        if (data.shipping_arranged) {
          setError("Pengiriman sudah diatur sebelumnya");
          return;
        }

        // Check if status is approved
        if (data.status !== "approved") {
          setError("Pengajuan pengembalian belum disetujui");
          return;
        }

        setReturnData(data);
      } catch (err) {
        console.error("Exception loading return:", err);
        setError("Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadReturnData();
    }
  }, [user, returnId]);

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const response = await fetch("/api/returns/arrange-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnId,
          userId: user.id,
          shippingMethod: "dropoff",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengatur pengiriman");
      }

      // Redirect to pengembalian page with success message
      router.push("/pengembalian?arranged=success");
    } catch (err: any) {
      console.error("Error arranging shipping:", err);
      setSubmitError(err.message || "Gagal mengatur pengiriman");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <main className="flex flex-col min-h-screen">
        <Header variant="docs" />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="mt-3 font-belleza text-gray-700">Memuat...</p>
          </div>
        </div>
      </main>
    );
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
            <Link
              href="/pengembalian"
              className="mt-4 inline-block px-4 py-2 bg-black text-white hover:opacity-90 transition"
            >
              Kembali ke Pengembalian
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const orderItems = returnData?.orders?.order_items || [];
  const firstProduct = orderItems[0]?.produk;
  const orderNumber = returnData?.order_number || returnData?.orders?.order_number || "-";

  return (
    <main className="flex flex-col min-h-screen">
      <Header variant="docs" />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bg22.png)' }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-gray-100">
          <h1 className="font-cormorant text-3xl md:text-4xl text-gray-100">Atur Pengiriman</h1>
          <div className="mt-3 font-belleza text-sm text-gray-100">
            <Link href="/" className="hover:underline">Beranda</Link>
            <span className="mx-1">&gt;</span>
            <Link href="/pengembalian" className="hover:underline">Pengembalian</Link>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-100">Atur Pengiriman</span>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-white py-8 md:py-12 min-h-[55vh]">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          {/* Return Info Card */}
          <div className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 p-6 mb-8">
            <h2 className="font-cormorant text-2xl font-bold text-gray-900 mb-4">Informasi Pengembalian</h2>
            <div className="flex items-start gap-4">
              {/* Product Image */}
              {firstProduct?.photo1 && (
                <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 border border-gray-200">
                  <Image
                    src={firstProduct.photo1}
                    alt={firstProduct.nama_produk || "Produk"}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-belleza text-lg font-semibold text-gray-900 mb-2">
                  {firstProduct?.nama_produk || "Produk"}
                </h3>
                <p className="font-belleza text-sm text-gray-600">
                  ID Pesanan: <span className="font-medium text-gray-900">#{orderNumber.substring(0, 8)}</span>
                </p>
                <p className="font-belleza text-sm text-gray-600 mt-1">
                  Alasan: <span className="font-medium text-gray-900">{returnData.reason || "-"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Dropoff Information */}
          <div className="bg-white border-2 border-gray-200 p-6 mb-6">
            <h2 className="font-cormorant text-2xl font-bold text-gray-900 mb-2">Metode Pengiriman: Drop Off</h2>
            <p className="font-belleza text-sm text-gray-600 mb-4">
              Antar paket pengembalian ke counter J&T Express terdekat
            </p>

            {/* Visual Card */}
            <div className="p-6 border-2 border-blue-200 bg-blue-50 rounded-lg mb-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-belleza text-lg font-semibold text-gray-900 mb-2">Drop Off J&T Express</h3>
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="font-belleza text-xs text-yellow-800">
                        ⏱️ Maksimal 2 hari setelah konfirmasi
                      </p>
                    </div>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded">
                      <p className="font-belleza text-xs text-gray-700">
                        📦 Kurir: J&T Express
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-belleza text-sm text-yellow-800 font-semibold">Batas Waktu Drop Off</p>
                  <p className="mt-1 font-belleza text-sm text-yellow-700">
                    Anda memiliki waktu <span className="font-bold">maksimal 2 hari</span> sejak konfirmasi untuk mengantarkan paket ke counter J&T Express
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-belleza text-sm text-blue-800 font-semibold">Cara Drop Off:</p>
                  <ol className="mt-2 font-belleza text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Kemas barang dengan baik dan aman</li>
                    <li>Setelah konfirmasi, Anda akan mendapat label pengiriman J&T</li>
                    <li>Tempelkan label pada paket</li>
                    <li>Bawa paket ke counter J&T Express terdekat</li>
                    <li>Simpan bukti drop off dari counter</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="font-belleza text-sm text-red-800">{submitError}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/pengembalian"
              className="flex-1 md:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 font-belleza font-medium hover:bg-gray-50 transition text-center"
            >
              Batal
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-belleza font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Konfirmasi Pengiriman</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
