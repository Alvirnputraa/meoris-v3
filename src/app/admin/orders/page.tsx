"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_status: string;
  created_at: string;
  shipping_address: any;
  order_items: Array<{
    id: string;
    quantity: number;
    produk: {
      nama_produk: string;
      harga: number;
    };
  }>;
  checkout: {
    total: number;
    shipping_method: string;
    payment_method: string;
    shipping_address?: any;
    subtotal?: number;
    shipping_cost?: number;
  };
  users?: {
    email: string;
    nama: string;
    phone?: string;
  };
}

export default function AdminOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState('paid');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);
  const [isGeneratingResi, setIsGeneratingResi] = useState(false);
  const [shippingHistory, setShippingHistory] = useState<any[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            size,
            produk:produk_id (
              id,
              nama_produk,
              harga,
              photo1
            )
          ),
          checkout:checkout_submission_id (
            subtotal,
            shipping_cost,
            total,
            shipping_method,
            payment_method,
            shipping_address,
            order_summary
          ),
          users:user_id (
            email,
            nama,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        console.log('Fetched orders:', data);
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailSidebar(true);
    loadShippingHistory(order.id);
  };

  const loadShippingHistory = async (orderId: string) => {
    setTrackingLoading(true);
    try {
      const response = await fetch(`/api/tracking/biteship?orderId=${orderId}`);
      const data = await response.json();

      if (response.ok && data.history) {
        setShippingHistory(data.history || []);
      } else {
        setShippingHistory([]);
      }
    } catch (error) {
      console.error('Error loading shipping history:', error);
      setShippingHistory([]);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleGenerateResi = async (orderId: string) => {
    setIsGeneratingResi(true);
    try {
      const response = await fetch('/api/admin/generate-resi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate resi');
      }

      // Success
      alert(`✅ Resi berhasil dibuat!\n\nNo. Resi: ${result.data.waybill}\nKurir: ${result.data.courier.code.toUpperCase()} ${result.data.courier.service}`);

      // Refresh orders
      await fetchOrders();

      // Update selected order if sidebar open
      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrder = orders.find(o => o.id === orderId);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }

      // Close sidebar
      setShowDetailSidebar(false);
    } catch (error: any) {
      console.error('Generate resi error:', error);
      alert(`❌ Gagal generate resi:\n${error.message}`);
    } finally {
      setIsGeneratingResi(false);
    }
  };

  if (!mounted) return null;

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const customerName = order.users?.nama || 'Unknown';
    const customerEmail = order.users?.email || '';
    const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    {
      label: 'Total Pesanan',
      value: orders.length,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'blue'
    },
    {
      label: 'Pending (Butuh Approve)',
      value: orders.filter(o => o.status === 'paid').length,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'yellow'
    },
    {
      label: 'Dikirim',
      value: orders.filter(o => o.status === 'shipped').length,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      color: 'orange'
    },
    {
      label: 'Selesai',
      value: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green'
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      'completed': 'bg-green-100 text-green-700',
      'delivered': 'bg-blue-100 text-blue-700',
      'shipped': 'bg-indigo-100 text-indigo-700',
      'processing': 'bg-yellow-100 text-yellow-700',
      'pending': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'completed': 'Selesai',
      'delivered': 'Terkirim',
      'shipped': 'Dikirim',
      'processing': 'Diproses',
      'pending': 'Pending',
      'cancelled': 'Dibatalkan',
      'paid': 'Dibayar', // Fix: ganti paid jadi Dibayar
    };
    return labels[status] || status;
  };

  const getPaymentColor = (payment: string) => {
    const colors: any = {
      'paid': 'bg-green-100 text-green-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'failed': 'bg-red-100 text-red-700',
    };
    return colors[payment] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentLabel = (payment: string) => {
    const labels: any = {
      'paid': 'Lunas',
      'pending': 'Pending',
      'failed': 'Gagal',
    };
    return labels[payment] || payment;
  };

  // Format payment method untuk display
  const formatPaymentMethod = (method: string) => {
    if (!method) return '-';

    // Map payment method ke format yang lebih readable
    const methodMap: any = {
      'bri_va': 'BRI Virtual Account',
      'bni_va': 'BNI Virtual Account',
      'briva': 'BRI Virtual Account',
      'bniva': 'BNI Virtual Account',
      'bcava': 'BCA Virtual Account',
      'bca_va': 'BCA Virtual Account',
      'mandiri_va': 'Mandiri Virtual Account',
      'permatava': 'Permata Virtual Account',
      'permata_va': 'Permata Virtual Account',
      'qris': 'QRIS',
      'gopay': 'GoPay',
      'shopee_pay': 'ShopeePay',
      'shopeepay': 'ShopeePay',
      'dana': 'DANA',
      'ovo': 'OVO',
      'alfamart': 'Alfamart',
      'indomaret': 'Indomaret',
    };

    return methodMap[method.toLowerCase()] || method;
  };

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      orange: 'bg-orange-100 text-orange-600',
      green: 'bg-green-100 text-green-600',
    };
    return colors[color] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Pesanan</h1>
          <p className="text-gray-500 mt-1">Kelola dan pantau semua pesanan pelanggan</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${getColorClasses(stat.color)} rounded-lg flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{stat.label}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari ID pesanan, nama pelanggan, atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Pending (Butuh Approve)</option>
              <option value="shipped">Dikirim</option>
              <option value="delivered">Terkirim</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">ID Pesanan</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Pelanggan</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Pembayaran</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Pengiriman</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-3 text-gray-600">Memuat data pesanan...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemsCount = order.order_items?.length || 0;
                  const totalAmount = order.checkout?.total || 0;
                  const formatRupiah = (amount: number) => {
                    return new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(amount);
                  };
                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleString('id-ID', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6">
                        {/* Fix #1: Tampilkan ID pendek (10 karakter pertama dari UUID) */}
                        <span className="font-medium text-sm text-gray-900">{order.id.substring(0, 10).toUpperCase()}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{order.users?.nama || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{order.users?.email || '-'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-700">{itemsCount} item</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-semibold text-blue-600">{formatRupiah(totalAmount)}</span>
                      </td>
                      <td className="py-4 px-6">
                        {/* Fix #2: Tampilkan "Dibayar" untuk status paid */}
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${order.status === 'paid' ? 'bg-green-100 text-green-700' : getStatusColor(order.status)}`}>
                          {order.status === 'paid' ? 'Dibayar' : getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {/* Fix #3: Tampilkan payment method yang benar */}
                        <span className="text-sm text-gray-700">{formatPaymentMethod(order.checkout?.payment_method || '')}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-700">{order.checkout?.shipping_method || '-'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {order.status === 'paid' && (
                            <button
                              onClick={() => handleGenerateResi(order.id)}
                              disabled={isGeneratingResi}
                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isGeneratingResi ? 'Processing...' : 'Generate Resi'}
                            </button>
                          )}
                          {/* Fix #4: Klik Detail buka sidebar */}
                          <button
                            onClick={() => handleViewDetail(order)}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada pesanan</h3>
            <p className="text-gray-500">Tidak ada pesanan yang sesuai dengan filter Anda</p>
          </div>
        )}
      </div>

      {/* Sidebar Detail Pesanan */}
      {showDetailSidebar && selectedOrder && (
        <>
          {/* Overlay dengan blur */}
          <div
            className="fixed inset-0 bg-white/30 backdrop-blur-sm z-40"
            onClick={() => setShowDetailSidebar(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-50 overflow-y-auto">
          {/* Header - More Compact */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Detail Pesanan</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.id.substring(0, 10).toUpperCase()}</p>
            </div>
            <button
              onClick={() => setShowDetailSidebar(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - More Compact */}
          <div className="p-4 space-y-4">
            {/* Status Pesanan - Compact */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Status Pesanan</p>
                  <p className="text-xl font-bold text-blue-900 mt-0.5">
                    {selectedOrder.status === 'paid' ? 'Dibayar' : getStatusLabel(selectedOrder.status)}
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-full ${selectedOrder.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Informasi Pelanggan - Compact */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informasi Pelanggan
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nama</span>
                  <span className="font-medium text-gray-900">{selectedOrder.users?.nama || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium text-gray-900">{selectedOrder.users?.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telepon</span>
                  <span className="font-medium text-gray-900">{selectedOrder.users?.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Alamat Pengiriman - Compact */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Alamat Pengiriman
              </h3>
              {selectedOrder.checkout?.shipping_address && (
                <div className="text-xs text-gray-700">
                  {(() => {
                    try {
                      const addr = typeof selectedOrder.checkout.shipping_address === 'string'
                        ? JSON.parse(selectedOrder.checkout.shipping_address)
                        : selectedOrder.checkout.shipping_address;
                      return (
                        <div className="space-y-0.5">
                          <p className="font-medium">{addr.recipientName || addr.nama || '-'}</p>
                          <p>{addr.phone || addr.telepon || '-'}</p>
                          <p className="mt-1">{addr.address || addr.alamat || '-'}</p>
                          <p>{addr.kelurahan || ''} {addr.kecamatan || ''}</p>
                          <p>{addr.kabupatenKota || addr.kota || ''}, {addr.provinsi || ''} {addr.kodePos || ''}</p>
                        </div>
                      );
                    } catch {
                      return <p className="text-gray-500">Alamat tidak tersedia</p>;
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Tracking Pengiriman - Compact */}
            {(selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered' || selectedOrder.status === 'completed') && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Tracking Pengiriman
                </h3>

                {trackingLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : shippingHistory.length > 0 ? (
                  <div className="space-y-2">
                    {shippingHistory.map((item: any, index: number) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          {index !== shippingHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-xs font-medium text-gray-900">{item.note || item.status}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(item.updated_at || item.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-2">Belum ada data tracking</p>
                )}
              </div>
            )}

            {/* Produk yang Dipesan - Compact */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Produk yang Dipesan
              </h3>
              <div className="space-y-2">
                {selectedOrder.order_items?.map((item: any, index: number) => (
                  <div key={index} className="flex gap-2 pb-2 border-b border-gray-100 last:border-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.produk?.photo1 && (
                        <img
                          src={item.produk.photo1}
                          alt={item.produk?.nama_produk}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-xs text-gray-900">{item.produk?.nama_produk || '-'}</p>
                      <p className="text-xs text-gray-500">Size: {item.size || '-'}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-600">{item.quantity}x</span>
                        <span className="font-semibold text-xs text-gray-900">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0
                          }).format(item.produk?.harga || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ringkasan Pembayaran - Compact */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Ringkasan Pembayaran
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(selectedOrder.checkout?.subtotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ongkir ({selectedOrder.checkout?.shipping_method})</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(selectedOrder.checkout?.shipping_cost || 0)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-base text-blue-600">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0
                      }).format(selectedOrder.checkout?.total || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Metode Pembayaran</span>
                  <span className="font-medium text-gray-900">
                    {formatPaymentMethod(selectedOrder.checkout?.payment_method || '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Tombol Generate Resi - Muncul untuk semua pesanan yang sudah dibayar */}
            {(selectedOrder.status === 'paid' || selectedOrder.status === 'processing' ||
              selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered' ||
              selectedOrder.status === 'completed') && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-green-800">Pesanan Sudah Dibayar</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {selectedOrder.status === 'paid'
                        ? 'Menunggu persetujuan admin. Klik tombol untuk generate resi pengiriman.'
                        : 'Klik tombol di bawah untuk generate atau update resi pengiriman.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateResi(selectedOrder.id)}
                  disabled={isGeneratingResi}
                  className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingResi ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Resi Pengiriman
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
