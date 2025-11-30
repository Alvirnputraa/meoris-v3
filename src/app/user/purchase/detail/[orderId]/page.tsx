"use client";
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { formatPaymentMethod } from '@/lib/paymentMethodFormatter';

function OrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);

  // Handle scroll to hide/show top bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 50) {
        setShowTopBar(false);
      } else {
        setShowTopBar(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || !user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              produk:produk_id (
                id,
                nama_produk,
                photo1,
                harga
              )
            )
          `)
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading order:', error);
        } else {
          setOrder(data);
        }
      } catch (error) {
        console.error('Exception loading order:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="docs" topBarVisible={showTopBar} />
        <div className="pt-[120px] flex items-center justify-center">
          <p className="text-gray-600">Memuat detail pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="docs" topBarVisible={showTopBar} />
        <div className="pt-[120px] flex flex-col items-center justify-center">
          <p className="text-gray-600 mb-4">Pesanan tidak ditemukan</p>
          <Link href="/user/purchase?view=purchase" className="text-blue-600 hover:underline">
            Kembali ke Pesanan Saya
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID':
      case 'pending':
        return 'text-yellow-600';
      case 'PAID':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'UNPAID':
      case 'pending':
        return 'Belum Bayar';
      case 'PAID':
        return 'Lunas';
      case 'FAILED':
        return 'Gagal';
      default:
        return status || 'Pending';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="docs" topBarVisible={showTopBar} />

      <div className="pt-[120px] pb-12">
        <div className="max-w-5xl mx-auto px-6">
          {/* Back Button */}
          <Link
            href="/user/purchase?view=purchase"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Kembali ke Pesanan Saya
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Shipping Address & Tracking */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Alamat Pengiriman</h2>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">{order.shipping_name || 'Nama Penerima'}</p>
                  <p className="text-sm text-gray-600">{order.shipping_phone || 'No. Telepon'}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {order.shipping_address || 'Alamat pengiriman'}
                  </p>
                </div>
              </div>

              {/* Shipping Tracking */}
              {order.resi && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Tracking Pengiriman</h2>
                    <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      Terkirim
                    </span>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">No. Resi</p>
                    <p className="font-semibold text-gray-900">{order.resi}</p>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-4">
                    {/* Example tracking data - replace with real data */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-600"></div>
                        <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-xs text-gray-500">{order.updated_at ? new Date(order.updated_at).toLocaleString('id-ID') : '-'}</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">Terkirim</p>
                        <p className="text-xs text-gray-600 mt-1">Pesanan telah diterima</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}</p>
                        <p className="text-sm text-gray-600 mt-1">Pesanan dalam Pengiriman</p>
                        <p className="text-xs text-gray-600 mt-1">Sedang dalam proses pengantaran</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}</p>
                        <p className="text-sm text-gray-600 mt-1">Pesanan Dikemas</p>
                        <p className="text-xs text-gray-600 mt-1">Pesanan sedang diproses</p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="#"
                    className="text-sm text-blue-600 hover:underline mt-4 inline-block"
                  >
                    Lihat Lainnya
                  </Link>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Produk</h2>
                <div className="space-y-4">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {item.produk?.photo1 ? (
                          <img
                            src={item.produk.photo1}
                            alt={item.produk?.nama_produk || 'Product'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{item.produk?.nama_produk || 'Produk'}</h3>
                        {item.size && <p className="text-xs text-gray-500 mt-1">Size: {item.size}</p>}
                        <p className="text-xs text-gray-600 mt-1">x{item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          Rp{(item.harga_satuan || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Pesanan</h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">No. Pesanan</span>
                    <span className="font-medium text-gray-900">{order.order_number || order.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-semibold ${getStatusColor(order.payment_status)}`}>
                      {getStatusText(order.payment_status)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tanggal Pemesanan</span>
                    <span className="text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal Produk</span>
                    <span className="text-gray-900">Rp{(order.subtotal || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal Pengiriman</span>
                    <span className="text-gray-900">Rp{(order.shipping_cost || 0).toLocaleString('id-ID')}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Diskon Pengiriman</span>
                      <span className="text-red-600">-Rp{(order.discount_amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Total Pesanan</span>
                    <span className="text-xl font-bold text-red-600">
                      Rp{(order.total_amount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {order.payment_method && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Metode Pembayaran</p>
                    <p className="text-sm font-medium text-gray-900">{formatPaymentMethod(order.payment_method)}</p>
                  </div>
                )}

                {order.payment_status === 'UNPAID' && (
                  <div className="mt-6">
                    <Link
                      href={`/payment/${order.id}`}
                      className="w-full block text-center px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Bayar Sekarang
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Memuat...</p>
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}
