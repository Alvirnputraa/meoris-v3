"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

function DetailPengembalianContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnId = searchParams.get('id');
  const printRef = useRef<HTMLDivElement>(null);

  const [returnData, setReturnData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user && returnId) {
      fetchReturnDetail();
    }
  }, [user, returnId]);

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      
      // Fetch user data terlebih dahulu
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select('shipping_provinsi, shipping_kecamatan')
        .eq('id', user?.id)
        .single();
      
      if (userError) {
        console.error("Error fetching user data:", userError);
      }
      
      console.log("Direct user data:", userData);
      
      const { data, error } = await supabase
        .from("returns")
        .select(`
          *,
          orders (
            id,
            order_number,
            shipping_address,
            total_amount,
            order_items (
              quantity,
              size,
              price,
              produk (
                id,
                nama_produk,
                deskripsi,
                harga,
                photo1
              )
            )
          ),
          users (
            id,
            nama,
            email,
            shipping_nama,
            shipping_phone,
            shipping_street,
            shipping_kecamatan,
            shipping_provinsi,
            shipping_postal_code
          )
        `)
        .eq('id', returnId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error("Error fetching return detail:", error);
        throw error;
      }

      if (!data) {
        alert("Data pengembalian tidak ditemukan");
        router.push("/pengembalian");
        return;
      }

      // Debug: Log data users untuk melihat isi data
      console.log("User data from join:", data.users);
      console.log("Direct user data:", userData);

      // Parse shipping address
      let customerAddress: any = {};
      // Gunakan userData yang langsung diambil jika ada, fallback ke data.users
      let provinsi = userData?.shipping_provinsi || data.users?.shipping_provinsi || '-';
      let kota = userData?.shipping_kecamatan || data.users?.shipping_kecamatan || '-';
      
      if (data.orders?.shipping_address) {
        try {
          const shippingAddr = typeof data.orders.shipping_address === 'string'
            ? JSON.parse(data.orders.shipping_address)
            : data.orders.shipping_address;

          customerAddress = {
            nama: shippingAddr.nama || data.users?.shipping_nama || data.users?.nama || 'Pelanggan',
            telepon: shippingAddr.telepon || data.users?.shipping_phone || '-',
            alamat: `${shippingAddr.alamat || shippingAddr.street || data.users?.shipping_street || '-'}, ${shippingAddr.kecamatan || shippingAddr.district || data.users?.shipping_kecamatan || ''}, ${shippingAddr.kota || shippingAddr.city || ''}, ${shippingAddr.provinsi || shippingAddr.province || data.users?.shipping_provinsi || ''}, ${shippingAddr.kode_pos || shippingAddr.postal_code || data.users?.shipping_postal_code || ''}`
          };
        } catch (e) {
          customerAddress = {
            nama: data.users?.shipping_nama || data.users?.nama || 'Pelanggan',
            telepon: data.users?.shipping_phone || '-',
            alamat: data.orders.shipping_address
          };
        }
      } else {
        customerAddress = {
          nama: data.users?.shipping_nama || data.users?.nama || 'Pelanggan',
          telepon: data.users?.shipping_phone || '-',
          alamat: `${data.users?.shipping_street || '-'}, ${data.users?.shipping_kecamatan || ''}, ${data.users?.shipping_provinsi || ''}, ${data.users?.shipping_postal_code || ''}`
        };
      }

      const orderItems = data.orders?.order_items || [];
      const firstProduct = orderItems[0];
      const fullOrderId = data.order_number || data.orders?.order_number || "-";
      const shortOrderId = fullOrderId !== "-" ? fullOrderId.substring(0, 8) : "-";

      setReturnData({
        orderId: fullOrderId,
        shortOrderId: shortOrderId,
        expedisi: "J&T Express",
        resiNumber: data.return_waybill || "-",
        status: data.status,
        provinsi: provinsi,
        kota: kota,
        product: {
          name: firstProduct?.produk?.nama_produk || "Produk",
          size: firstProduct?.size || "-",
          quantity: firstProduct?.quantity || 1,
          image: firstProduct?.produk?.photo1 || "/images/bg22.png"
        },
        storeAddress: {
          recipient: "Meoris Footwear",
          phone: "+6289695971729",
          address: "Sambong mangkubumi Rt 001/Rw 002, Kec. Mangkubumi, Kota Tasikmalaya, Jawa Barat 46181"
        },
        customerAddress: customerAddress,
        reason: data.reason || "Tidak ada alasan",
        createdAt: data.created_at
      });
    } catch (error) {
      console.error("Error fetching return detail:", error);
      alert("Gagal memuat data pengembalian");
      router.push("/pengembalian");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintResi = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const resiContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Resi Pengembalian - ${returnData.resiNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Arial', sans-serif;
            padding: 15px;
            background: white;
          }
          .resi-wrapper {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
          }
          .resi-container {
            border: 3px dashed #333;
            padding: 0;
            background: white;
          }
          
          /* Header Section */
          .header-section {
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            background-color: #1a1a1a;
            color: white;
            padding: 18px 25px;
            text-align: center;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .brand-name {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 7px;
            margin-bottom: 4px;
          }
          .brand-subtitle {
            font-size: 11px;
            letter-spacing: 4px;
            text-transform: uppercase;
            opacity: 0.9;
          }
          
          /* Resi Number Section */
          .resi-banner {
            background: #f8f8f8;
            background-color: #f8f8f8;
            padding: 15px 25px;
            text-align: center;
            border-bottom: 3px solid #333;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .resi-label {
            font-size: 11px;
            color: #666;
            letter-spacing: 2px;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .barcode-card {
            padding: 18px 28px;
            background: white;
            background-color: #ffffff;
            border: 2px solid #333;
            display: inline-block;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #barcode {
            height: 70px;
            margin-bottom: 12px;
          }
          .resi-code {
            font-size: 20px;
            font-weight: bold;
            color: #000;
            letter-spacing: 2.5px;
            font-family: 'Courier New', monospace;
            text-align: center;
          }
          
          /* Content Body */
          .content-body {
            padding: 25px;
          }
          
          /* Address Boxes */
          .address-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-bottom: 25px;
          }
          .address-box {
            border: 2px solid #333;
            padding: 18px;
            background: #fafafa;
            background-color: #fafafa;
            position: relative;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .address-box::before {
            content: '';
            position: absolute;
            top: -2px;
            left: 15px;
            background: #fafafa;
            padding: 0 10px;
          }
          .address-header {
            position: absolute;
            top: -11px;
            left: 15px;
            background: #333;
            background-color: #333;
            color: white;
            padding: 4px 13px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .address-name {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-top: 4px;
            margin-bottom: 7px;
          }
          .address-phone {
            font-size: 13px;
            color: #333;
            margin-bottom: 9px;
            font-weight: 600;
          }
          .address-detail {
            font-size: 12px;
            line-height: 1.65;
            color: #555;
          }
          
          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .info-card {
            border: 2px solid #e0e0e0;
            padding: 12px;
            text-align: center;
            background: white;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .info-label {
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 7px;
          }
          .info-value {
            font-size: 14px;
            font-weight: bold;
            color: #000;
          }
          
          /* Product Table */
          .product-section {
            margin-bottom: 25px;
          }
          .section-header {
            background: #333;
            background-color: #333;
            color: white;
            padding: 9px 14px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            margin-bottom: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #333;
            border-top: none;
          }
          .product-table th {
            background: #f0f0f0;
            background-color: #f0f0f0;
            padding: 10px 14px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 2px solid #ddd;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-table td {
            padding: 12px 14px;
            font-size: 13px;
            border-bottom: 1px solid #e0e0e0;
            background: white;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-table tr:last-child td {
            border-bottom: none;
          }
          
          /* Footer */
          .footer-section {
            margin-top: 25px;
            padding-top: 18px;
            border-top: 2px dashed #999;
            text-align: center;
          }
          .footer-text {
            font-size: 11px;
            color: #666;
            line-height: 1.7;
          }
          .footer-contact {
            margin-top: 7px;
            font-size: 12px;
            font-weight: bold;
            color: #333;
          }
          
          /* Signature Section */
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 35px;
            margin-top: 30px;
            padding: 0 25px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 40px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .signature-line {
            border-top: 1px solid #333;
            padding-top: 7px;
            font-size: 12px;
            color: #333;
            font-weight: bold;
          }
          
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              padding: 0;
            }
            .resi-wrapper {
              max-width: 100%;
            }
            .header-section {
              background: #1a1a1a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section-header {
              background: #333 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .address-header {
              background: #333 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              margin: 0.5cm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="resi-wrapper">
          <div class="resi-container">
            
            <!-- Header -->
            <div class="header-section">
              <div class="brand-name">MEORIS</div>
              <div class="brand-subtitle">Footwear</div>
            </div>
            
            <!-- Resi Banner -->
            <div class="resi-banner">
              <div class="resi-label">Nomor Resi</div>
              <div class="barcode-card">
                <svg id="barcode"></svg>
                <div class="resi-code">${returnData.resiNumber}</div>
              </div>
            </div>
            
            <!-- Content Body -->
            <div class="content-body">
              
              <!-- Address Section -->
              <div class="address-section">
                <div class="address-box">
                  <div class="address-header">Pengirim</div>
                  <div class="address-name">${returnData.customerAddress.nama}</div>
                  <div class="address-phone">${returnData.customerAddress.telepon}</div>
                  <div class="address-detail">${returnData.customerAddress.alamat}</div>
                </div>
                
                <div class="address-box">
                  <div class="address-header">Penerima</div>
                  <div class="address-name">${returnData.storeAddress.recipient}</div>
                  <div class="address-phone">${returnData.storeAddress.phone}</div>
                  <div class="address-detail">${returnData.storeAddress.address}</div>
                </div>
              </div>
              
              <!-- Info Grid -->
              <div class="info-grid">
                <div class="info-card">
                  <div class="info-label">No. Pesanan</div>
                  <div class="info-value">${returnData.shortOrderId}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Ekspedisi</div>
                  <div class="info-value">${returnData.expedisi}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Tanggal</div>
                  <div class="info-value">${new Date(returnData.createdAt).toLocaleDateString("id-ID", { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}</div>
                </div>
              </div>
              
              <!-- Location Card -->
              <div class="info-card" style="margin-bottom: 25px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0;">
                <div style="text-align: center; padding: 0 10px;">
                  <div style="font-size: 12px; font-weight: bold; color: #000;">${returnData.provinsi}</div>
                </div>
                <div style="width: 2px; height: 30px; background: #e0e0e0;"></div>
                <div style="text-align: center; padding: 0 10px;">
                  <div style="font-size: 12px; font-weight: bold; color: #000;">${returnData.kota}</div>
                </div>
              </div>
              
              <!-- Product Table -->
              <div class="product-section">
                <div class="section-header">Detail Produk</div>
                <table class="product-table">
                  <thead>
                    <tr>
                      <th>Nama Produk</th>
                      <th style="text-align: center; width: 120px;">Ukuran</th>
                      <th style="text-align: center; width: 120px;">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>${returnData.product.name}</strong></td>
                      <td style="text-align: center;">${returnData.product.size}</td>
                      <td style="text-align: center;">${returnData.product.quantity} pcs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Footer -->
              <div class="footer-section">
                <div class="footer-text">
                  Simpan resi ini sebagai bukti pengiriman pengembalian.<br>
                  Terima kasih atas kepercayaan Anda kepada MEORIS.
                </div>
              </div>
            </div>
            
            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-label">Pengirim</div>
                <div class="signature-line">(${returnData.customerAddress.nama})</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">Penerima</div>
                <div class="signature-line">(Meoris Footwear)</div>
              </div>
            </div>
            
            <div style="height: 20px;"></div>
            
          </div>
        </div>

        <script>
          window.onload = function() {
            try {
              // Generate barcode Code 128 - automatically encodes alphanumeric
              JsBarcode("#barcode", "${returnData.resiNumber}", {
                format: "CODE128",
                width: 2,
                height: 70,
                displayValue: false,
                margin: 10,
                background: "#ffffff",
                lineColor: "#000000",
                valid: function(valid) {
                  if (!valid) {
                    console.error("Barcode generation failed for: ${returnData.resiNumber}");
                  }
                }
              });
            } catch (e) {
              console.error("Error generating barcode:", e);
              // Fallback: show text only
              document.getElementById("barcode").innerHTML = '<text x="50%" y="50%" text-anchor="middle" style="font-size: 14px;">Barcode tidak dapat digenerate</text>';
            }
            
            // Trigger print after barcode is generated
            setTimeout(function() {
              window.print();
            }, 800);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(resiContent);
    printWindow.document.close();
  };

  if (!user || isLoading) {
    return null;
  }

  if (loading || !returnData) {
    return (
      <main className="min-h-screen bg-gray-50 font-belleza">
        <Header variant="docs" />
        <section className="relative overflow-hidden bg-transparent pt-[76px]">
          <div
            className="absolute inset-0 -z-10 bg-center bg-cover"
            aria-hidden="true"
            style={{ backgroundImage: "url(/images/bg22.png)" }}
          />
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center text-gray-800">
            <h1 className="font-cormorant text-3xl md:text-4xl text-gray-800">Detail Pengembalian</h1>
          </div>
        </section>
        <section className="bg-white py-8 md:py-14">
          <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
            <p className="font-belleza text-gray-700">Memuat data pengembalian...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 font-belleza">
      {/* Header */}
      <Header variant="docs" />

      {/* Section Hero dengan background bg22.png */}
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover"
          aria-hidden="true"
          style={{ backgroundImage: "url(/images/bg22.png)" }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-10 flex flex-col items-center justify-center text-gray-800">
          <h1 className="font-cormorant text-2xl md:text-3xl text-gray-800">Detail Pengembalian</h1>
          <div className="mt-2 font-belleza text-xs text-gray-800">
            <Link href="/" className="hover:underline">Beranda</Link>
            <span className="mx-1">&gt;</span>
            <Link href="/pengembalian" className="hover:underline">Pengembalian</Link>
            <span className="mx-1">&gt;</span>
            <span className="text-gray-800">Detail Pengembalian</span>
          </div>
        </div>
      </section>

      {/* Section 1: Detail Informasi Pengembalian */}
      <section className="bg-gray-50 py-6 md:py-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          
          {/* Main Card Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Header Section */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="font-cormorant text-lg text-gray-900 font-semibold">Pengembalian #{returnData.shortOrderId}</h2>
                  <p className="font-belleza text-xs text-gray-600 mt-1">
                    {new Date(returnData.createdAt).toLocaleDateString("id-ID", { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={handlePrintResi}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:opacity-90 transition font-belleza text-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Cetak Resi
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-4">
              
              {/* Product Info */}
              <div>
                <h3 className="font-cormorant text-xs text-gray-700 mb-2 uppercase tracking-wide">Produk yang Dikembalikan</h3>
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-md">
                  <div className="relative w-14 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={returnData.product.image}
                      alt={returnData.product.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-belleza text-sm text-gray-900 font-semibold">{returnData.product.name}</h4>
                    <div className="flex gap-3 mt-0.5">
                      <span className="font-belleza text-xs text-gray-600">Ukuran: {returnData.product.size}</span>
                      <span className="font-belleza text-xs text-gray-600">Qty: {returnData.product.quantity}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200"></div>

              {/* Shipping Info - Two Columns */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Shipping Details */}
                <div>
                  <h3 className="font-cormorant text-xs text-gray-700 mb-2 uppercase tracking-wide">Informasi Pengiriman</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-belleza text-xs text-gray-500">Ekspedisi</p>
                        <p className="font-belleza text-sm text-gray-900 font-medium">{returnData.expedisi}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div>
                        <p className="font-belleza text-xs text-gray-500">Nomor Resi</p>
                        <p className="font-belleza text-sm text-gray-900 font-medium break-all">{returnData.resiNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destination Address */}
                <div>
                  <h3 className="font-cormorant text-xs text-gray-700 mb-2 uppercase tracking-wide">Alamat Tujuan</h3>
                  <div className="space-y-1">
                    <div>
                      <p className="font-belleza text-base text-gray-900 font-semibold">{returnData.storeAddress.recipient}</p>
                      <p className="font-belleza text-sm text-gray-600">{returnData.storeAddress.phone}</p>
                    </div>
                    <p className="font-belleza text-xs text-gray-700 leading-relaxed">
                      {returnData.storeAddress.address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200"></div>

              {/* Return Reason */}
              <div>
                <h3 className="font-cormorant text-xs text-gray-700 mb-2 uppercase tracking-wide">Alasan Pengembalian</h3>
                <p className="font-belleza text-sm text-gray-800 leading-relaxed">{returnData.reason}</p>
              </div>

              <div className="h-px bg-gray-200"></div>

              {/* Instructions */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-cormorant text-xs text-gray-900 font-semibold mb-1">Petunjuk Pengembalian</h4>
                    <ul className="space-y-0.5 font-belleza text-xs text-gray-700">
                      <li className="flex gap-1.5">
                        <span className="text-amber-600 font-semibold">•</span>
                        <span>Pastikan produk dalam kondisi baik dan masih memiliki tag asli</span>
                      </li>
                      <li className="flex gap-1.5">
                        <span className="text-amber-600 font-semibold">•</span>
                        <span>Kemas produk dengan bubble wrap atau kardus yang aman</span>
                      </li>
                      <li className="flex gap-1.5">
                        <span className="text-amber-600 font-semibold">•</span>
                        <span>Kirim ke alamat: {returnData.storeAddress.address}</span>
                      </li>
                      <li className="flex gap-1.5">
                        <span className="text-amber-600 font-semibold">•</span>
                        <span>Proses pengembalian memerlukan 2 hari kerja</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Link
                  href="/pengembalian"
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-belleza text-sm text-center"
                >
                  Kembali
                </Link>
                <Link
                  href="/produk/pesanan"
                  className="px-5 py-2.5 bg-black text-white rounded-md hover:opacity-90 transition font-belleza text-sm text-center"
                >
                  Lihat Pesanan
                </Link>
              </div>
            </div>

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
                  <div className="mt-1 text-[9px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
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
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline">Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline">Favorit</a></li>
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
    </main>
  );
}

export default function DetailPengembalianPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-gray-600">Memuat detail pengembalian...</div>}>
      <DetailPengembalianContent />
    </Suspense>
  );
}

