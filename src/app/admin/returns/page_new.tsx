"use client";
import { useState, useEffect } from 'react';

interface ReturnRequest {
  id: string;
  returnId: string;
  orderId: string;
  orderIdFull: string;
  customer: string;
  customerEmail: string;
  userId: string;
  reason: string;
  description: string;
  amount: string;
  status: string;
  validasi: string | null;
  statusValidasi: string | null;
  date: string;
  approvedAt: string | null;
  validationCompletedAt: string | null;
  validationNotes: string | null;
  returnWaybill: string | null;
  returnCourier: string | null;
  replacementWaybill: string | null;
  replacementCourier: string | null;
  replacementShippedAt: string | null;
  shippingArranged: boolean;
  photoPaths: string[] | null;
  videoPaths: string | null;
}

interface ReplacementItem {
  id: string;
  product_name: string;
  product_size: string;
  quantity: number;
}

export default function AdminReturnsPage() {
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(false);

  // Form states for replacement
  const [replacementItems, setReplacementItems] = useState<ReplacementItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSize, setNewItemSize] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [selectedCourier, setSelectedCourier] = useState('sicepat');
  const [actionLoading, setActionLoading] = useState(false);

  // Get admin ID from localStorage (you should implement proper auth)
  const getAdminId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminId') || '';
    }
    return '';
  };

  useEffect(() => {
    setMounted(true);
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const adminId = getAdminId();

      const response = await fetch(`/api/admin/returns/list?adminId=${adminId}&status=${filterStatus}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load returns');
      }

      setReturns(data.returns || []);
    } catch (error: any) {
      console.error('Error loading returns:', error);
      alert(error.message || 'Gagal memuat data pengembalian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadReturns();
    }
  }, [filterStatus]);

  const loadReturnDetail = async (returnId: string) => {
    try {
      setSidebarLoading(true);
      const adminId = getAdminId();

      const response = await fetch(`/api/admin/returns/detail?returnId=${returnId}&adminId=${adminId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load return detail');
      }

      setSelectedReturn(data);
      setReplacementItems(data.replacementItems || []);
      setShowSidebar(true);
    } catch (error: any) {
      console.error('Error loading return detail:', error);
      alert(error.message || 'Gagal memuat detail pengembalian');
    } finally {
      setSidebarLoading(false);
    }
  };

  const handleApprove = async (returnId: string) => {
    if (!confirm('Apakah Anda yakin ingin menyetujui pengembalian ini?')) return;

    try {
      setActionLoading(true);
      const adminId = getAdminId();

      const response = await fetch('/api/admin/returns/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId, adminId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyetujui pengembalian');
      }

      alert('Pengembalian berhasil disetujui');
      loadReturns();
    } catch (error: any) {
      console.error('Error approving return:', error);
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (returnId: string) => {
    const reason = prompt('Masukkan alasan penolakan:');
    if (!reason) return;

    try {
      setActionLoading(true);
      const adminId = getAdminId();

      const response = await fetch('/api/admin/returns/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId, adminId, reason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menolak pengembalian');
      }

      alert('Pengembalian berhasil ditolak');
      loadReturns();
    } catch (error: any) {
      console.error('Error rejecting return:', error);
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItemName || !newItemSize || newItemQty <= 0) {
      alert('Lengkapi semua field');
      return;
    }

    const newItem: ReplacementItem = {
      id: `temp_${Date.now()}`,
      product_name: newItemName,
      product_size: newItemSize,
      quantity: newItemQty
    };

    setReplacementItems([...replacementItems, newItem]);
    setNewItemName('');
    setNewItemSize('');
    setNewItemQty(1);
  };

  const handleRemoveItem = (id: string) => {
    setReplacementItems(replacementItems.filter(item => item.id !== id));
  };

  const handleSaveReplacementItems = async () => {
    if (replacementItems.length === 0) {
      alert('Tambahkan minimal 1 produk pengganti');
      return;
    }

    try {
      setActionLoading(true);
      const adminId = getAdminId();

      const response = await fetch('/api/admin/returns/replacement/add-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: selectedReturn.return.id,
          adminId,
          items: replacementItems
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan produk pengganti');
      }

      alert('Produk pengganti berhasil disimpan');
      loadReturnDetail(selectedReturn.return.id);
    } catch (error: any) {
      console.error('Error saving replacement items:', error);
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipReplacement = async () => {
    if (replacementItems.length === 0) {
      alert('Simpan produk pengganti terlebih dahulu');
      return;
    }

    if (!confirm(`Generate resi dan kirim pengganti via ${selectedCourier.toUpperCase()}?`)) return;

    try {
      setActionLoading(true);
      const adminId = getAdminId();

      const response = await fetch('/api/admin/returns/replacement/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: selectedReturn.return.id,
          adminId,
          courier: selectedCourier
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal generate resi');
      }

      alert(`Resi berhasil di-generate!\nNomor Resi: ${data.waybill}\nKurir: ${data.courier}`);
      setShowSidebar(false);
      loadReturns();
    } catch (error: any) {
      console.error('Error shipping replacement:', error);
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  if (!mounted) return null;

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = ret.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = [
    { label: 'Total Pengembalian', value: returns.length, color: 'blue' },
    { label: 'Pending', value: returns.filter(r => r.status === 'pending').length, color: 'yellow' },
    { label: 'Disetujui', value: returns.filter(r => r.status === 'approved').length, color: 'blue' },
    { label: 'Selesai', value: returns.filter(r => r.status === 'completed' || r.status === 'replacement_shipped').length, color: 'green' },
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
      'replacement_shipped': 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'pending': 'Pending',
      'approved': 'Disetujui',
      'completed': 'Selesai',
      'rejected': 'Ditolak',
      'replacement_shipped': 'Pengganti Dikirim',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelola Pengembalian</h1>
        <p className="text-gray-500 mt-1">Kelola permintaan pengembalian produk dari pelanggan</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
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
                placeholder="Cari ID, Order ID, atau nama pelanggan..."
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
              <option value="pending">Pending</option>
              <option value="approved">Disetujui</option>
              <option value="completed">Selesai</option>
              <option value="rejected">Ditolak</option>
              <option value="replacement_shipped">Pengganti Dikirim</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Order ID</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Pelanggan</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Alasan</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Jumlah</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-6">
                      <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">{returnItem.orderId}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">{returnItem.customer}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">{returnItem.reason}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-gray-900">{returnItem.amount}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.status)}`}>
                        {getStatusLabel(returnItem.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600">{new Date(returnItem.date).toLocaleString('id-ID')}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {returnItem.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(returnItem.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                            >
                              Setuju
                            </button>
                            <button
                              onClick={() => handleReject(returnItem.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => loadReturnDetail(returnItem.id)}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            Detail
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredReturns.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
            <p className="text-gray-500">Tidak ada pengembalian yang sesuai dengan filter Anda</p>
          </div>
        )}
      </div>

      {/* Sidebar Detail */}
      {showSidebar && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Detail Pengembalian</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {sidebarLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  {/* Return Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Order ID:</span>
                      <span className="text-sm font-semibold">{selectedReturn.return.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Customer:</span>
                      <span className="text-sm font-semibold">{selectedReturn.return.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getStatusColor(selectedReturn.return.status)}`}>
                        {getStatusLabel(selectedReturn.return.status)}
                      </span>
                    </div>
                  </div>

                  {/* Return Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Detail Pengajuan Pengembalian</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Alasan:</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedReturn.return.reason}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Deskripsi:</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedReturn.return.description || '-'}</p>
                      </div>
                      {selectedReturn.return.videoLink && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Link Video Unboxing:</label>
                          <a href={selectedReturn.return.videoLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 block">
                            {selectedReturn.return.videoLink}
                          </a>
                        </div>
                      )}
                      {selectedReturn.return.photoPaths && selectedReturn.return.photoPaths.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Foto Produk:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedReturn.return.photoPaths.map((photo: string, i: number) => (
                              <img key={i} src={photo} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Address */}
                  {selectedReturn.customerAddress && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Alamat Pengiriman</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                        <p className="text-sm font-semibold">{selectedReturn.customerAddress.nama}</p>
                        <p className="text-sm text-gray-600">{selectedReturn.customerAddress.phone}</p>
                        <p className="text-sm text-gray-700">{selectedReturn.customerAddress.fullAddress}</p>
                      </div>
                    </div>
                  )}

                  {/* Only show replacement section if approved and validated */}
                  {selectedReturn.return.status === 'approved' && selectedReturn.return.validasi === 'approved' && (
                    <>
                      {/* Replacement Items Form */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Form Isian Produk Penggantian</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Nama Produk</label>
                            <input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Contoh: Sepatu Sneakers Black"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Ukuran Produk</label>
                            <input
                              type="text"
                              value={newItemSize}
                              onChange={(e) => setNewItemSize(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Contoh: 42"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Jumlah Produk</label>
                            <input
                              type="number"
                              min="1"
                              value={newItemQty}
                              onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={handleAddItem}
                            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* List Produk */}
                      {replacementItems.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">List Produk</h3>
                          <div className="space-y-2">
                            {replacementItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div>
                                  <p className="text-sm font-semibold">{item.product_name}</p>
                                  <p className="text-xs text-gray-600">Ukuran: {item.product_size} | Qty: {item.quantity}</p>
                                </div>
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={handleSaveReplacementItems}
                            disabled={actionLoading}
                            className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            {actionLoading ? 'Menyimpan...' : 'Simpan Produk'}
                          </button>
                        </div>
                      )}

                      {/* Pilih Kurir & Ship */}
                      {replacementItems.length > 0 && !selectedReturn.return.replacementWaybill && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Pilih Kurir</h3>
                          <div className="space-y-2 mb-4">
                            {['sicepat', 'jnt', 'jne'].map((courier) => (
                              <label key={courier} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="courier"
                                  value={courier}
                                  checked={selectedCourier === courier}
                                  onChange={(e) => setSelectedCourier(e.target.value)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm font-medium uppercase">{courier}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={handleShipReplacement}
                            disabled={actionLoading}
                            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
                          >
                            {actionLoading ? 'Memproses...' : 'Approve dan Generate Resi'}
                          </button>
                        </div>
                      )}

                      {/* Show waybill if already shipped */}
                      {selectedReturn.return.replacementWaybill && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-green-900 mb-1">Pengganti Sudah Dikirim</p>
                          <p className="text-xs text-green-700">Resi: {selectedReturn.return.replacementWaybill}</p>
                          <p className="text-xs text-green-700">Kurir: {selectedReturn.return.replacementCourier?.toUpperCase()}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
