"use client";
import { useState, useEffect } from 'react';

interface Voucher {
  id: string;
  code: string;
  title: string;
  discount: string;
  minPurchase: string;
  usage: string;
  validUntil: string;
  status: 'active' | 'inactive' | 'expired';
}

export default function AdminVouchersPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Mock data
  const vouchers: Voucher[] = [
    { id: 'VCH-001', code: 'WELCOME50', title: 'Welcome Voucher', discount: '50%', minPurchase: 'Rp 100.000', usage: '245/500', validUntil: '2025-12-31', status: 'active' },
    { id: 'VCH-002', code: 'FLASH20', title: 'Flash Sale', discount: '20%', minPurchase: 'Rp 50.000', usage: '1.890/2.000', validUntil: '2025-11-15', status: 'active' },
    { id: 'VCH-003', code: 'NEWYEAR100K', title: 'New Year Promo', discount: 'Rp 100.000', minPurchase: 'Rp 500.000', usage: '67/200', validUntil: '2025-12-31', status: 'active' },
    { id: 'VCH-004', code: 'MEMBER10', title: 'Member Discount', discount: '10%', minPurchase: 'Rp 0', usage: '450/1.000', validUntil: '2025-12-31', status: 'active' },
    { id: 'VCH-005', code: 'SUMMER30', title: 'Summer Sale', discount: '30%', minPurchase: 'Rp 200.000', usage: '89/500', validUntil: '2025-11-10', status: 'expired' },
    { id: 'VCH-006', code: 'FREESHIP', title: 'Free Shipping', discount: 'Rp 25.000', minPurchase: 'Rp 150.000', usage: '0/100', validUntil: '2025-12-15', status: 'inactive' },
    { id: 'VCH-007', code: 'SPECIAL50K', title: 'Special Discount', discount: 'Rp 50.000', minPurchase: 'Rp 300.000', usage: '123/300', validUntil: '2025-11-30', status: 'active' },
    { id: 'VCH-008', code: 'MEGA15', title: 'Mega Sale', discount: '15%', minPurchase: 'Rp 75.000', usage: '567/800', validUntil: '2025-12-20', status: 'active' },
  ];

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voucher.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voucher.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Voucher', value: vouchers.length, color: 'blue' },
    { label: 'Aktif', value: vouchers.filter(v => v.status === 'active').length, color: 'green' },
    { label: 'Digunakan Bulan Ini', value: '2.8K', color: 'purple' },
    { label: 'Kadaluarsa', value: vouchers.filter(v => v.status === 'expired').length, color: 'red' },
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-gray-100 text-gray-700',
      'expired': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'active': 'Aktif',
      'inactive': 'Nonaktif',
      'expired': 'Kadaluarsa',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Voucher</h1>
          <p className="text-gray-500 mt-1">Kelola kode voucher dan promo untuk pelanggan</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Voucher
        </button>
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
                placeholder="Cari kode voucher atau judul..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="expired">Kadaluarsa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Judul</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Diskon</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Min. Pembelian</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Penggunaan</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Berlaku Hingga</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVouchers.map((voucher) => {
                const [used, total] = voucher.usage.split('/').map(Number);
                const percentage = (used / total) * 100;

                return (
                  <tr key={voucher.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-mono font-bold text-sm text-gray-900">{voucher.code}</p>
                          <p className="text-xs text-gray-500">{voucher.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">{voucher.title}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-green-600">{voucher.discount}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">{voucher.minPurchase}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">{voucher.usage}</span>
                          <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">{new Date(voucher.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(voucher.status)}`}>
                        {getStatusLabel(voucher.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                          Edit
                        </button>
                        {voucher.status === 'active' && (
                          <button className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
                            Nonaktifkan
                          </button>
                        )}
                        <button className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredVouchers.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada voucher</h3>
            <p className="text-gray-500">Tidak ada voucher yang sesuai dengan filter Anda</p>
          </div>
        )}
      </div>
    </div>
  );
}
