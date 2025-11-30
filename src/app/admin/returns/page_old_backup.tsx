"use client";
import { useState, useEffect } from 'react';

interface ReturnRequest {
  id: string;
  orderId: string;
  customer: string;
  reason: string;
  amount: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  date: string;
}

export default function AdminReturnsPage() {
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Mock data
  const returns: ReturnRequest[] = [
    { id: 'RET-001', orderId: 'ORD-2025-001', customer: 'John Doe', reason: 'Produk rusak', amount: 'Rp 250.000', status: 'pending', date: '2025-11-12 14:30' },
    { id: 'RET-002', orderId: 'ORD-2025-045', customer: 'Jane Smith', reason: 'Ukuran tidak sesuai', amount: 'Rp 480.000', status: 'approved', date: '2025-11-11 10:15' },
    { id: 'RET-003', orderId: 'ORD-2025-032', customer: 'Bob Johnson', reason: 'Warna tidak sesuai', amount: 'Rp 320.000', status: 'completed', date: '2025-11-10 16:45' },
    { id: 'RET-004', orderId: 'ORD-2025-078', customer: 'Alice Brown', reason: 'Produk cacat', amount: 'Rp 560.000', status: 'pending', date: '2025-11-10 09:20' },
    { id: 'RET-005', orderId: 'ORD-2025-021', customer: 'Charlie Wilson', reason: 'Salah pesan', amount: 'Rp 190.000', status: 'rejected', date: '2025-11-09 13:50' },
    { id: 'RET-006', orderId: 'ORD-2025-089', customer: 'Diana Prince', reason: 'Produk tidak lengkap', amount: 'Rp 750.000', status: 'approved', date: '2025-11-09 11:30' },
    { id: 'RET-007', orderId: 'ORD-2025-054', customer: 'Ethan Hunt', reason: 'Tidak sesuai deskripsi', amount: 'Rp 420.000', status: 'completed', date: '2025-11-08 15:20' },
    { id: 'RET-008', orderId: 'ORD-2025-067', customer: 'Fiona Apple', reason: 'Berubah pikiran', amount: 'Rp 280.000', status: 'pending', date: '2025-11-08 08:45' },
  ];

  const filteredReturns = returns.filter(ret => {
    const matchesStatus = filterStatus === 'all' || ret.status === filterStatus;
    const matchesSearch = ret.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = [
    { label: 'Total Pengembalian', value: returns.length, color: 'blue' },
    { label: 'Pending', value: returns.filter(r => r.status === 'pending').length, color: 'yellow' },
    { label: 'Disetujui', value: returns.filter(r => r.status === 'approved').length, color: 'blue' },
    { label: 'Selesai', value: returns.filter(r => r.status === 'completed').length, color: 'green' },
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'pending': 'Pending',
      'approved': 'Disetujui',
      'completed': 'Selesai',
      'rejected': 'Ditolak',
    };
    return labels[status] || status;
  };

  const handleApprove = (id: string) => {
    alert(`Menyetujui pengembalian ${id}`);
  };

  const handleReject = (id: string) => {
    alert(`Menolak pengembalian ${id}`);
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
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">ID</th>
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
                    <span className="font-medium text-sm text-gray-900">{returnItem.id}</span>
                  </td>
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
                    <span className="text-sm text-gray-600">{returnItem.date}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {returnItem.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(returnItem.id)}
                            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition"
                          >
                            Setuju
                          </button>
                          <button
                            onClick={() => handleReject(returnItem.id)}
                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                          >
                            Tolak
                          </button>
                        </>
                      ) : (
                        <button className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
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

        {/* Empty State */}
        {filteredReturns.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada data</h3>
            <p className="text-gray-500">Tidak ada pengembalian yang sesuai dengan filter Anda</p>
          </div>
        )}
      </div>
    </div>
  );
}
