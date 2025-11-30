"use client";
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Mock data - will be replaced with real data later
  const stats = [
    {
      title: 'Total Pesanan',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'blue',
    },
    {
      title: 'Pendapatan',
      value: 'Rp 45.2M',
      change: '+8.2%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green',
    },
    {
      title: 'Pengembalian',
      value: '23',
      change: '-3.1%',
      trend: 'down',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
        </svg>
      ),
      color: 'orange',
    },
    {
      title: 'Pengguna Aktif',
      value: '8,420',
      change: '+18.2%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'purple',
    },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'John Doe', amount: 'Rp 250.000', status: 'Selesai', date: '2025-11-12' },
    { id: 'ORD-002', customer: 'Jane Smith', amount: 'Rp 480.000', status: 'Dikirim', date: '2025-11-12' },
    { id: 'ORD-003', customer: 'Bob Johnson', amount: 'Rp 320.000', status: 'Dikemas', date: '2025-11-11' },
    { id: 'ORD-004', customer: 'Alice Brown', amount: 'Rp 560.000', status: 'Pending', date: '2025-11-11' },
    { id: 'ORD-005', customer: 'Charlie Wilson', amount: 'Rp 190.000', status: 'Selesai', date: '2025-11-10' },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        icon: 'bg-blue-100',
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        icon: 'bg-green-100',
      },
      orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        icon: 'bg-orange-100',
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        icon: 'bg-purple-100',
      },
    };
    return colors[color];
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'Selesai': 'bg-green-100 text-green-700',
      'Dikirim': 'bg-blue-100 text-blue-700',
      'Dikemas': 'bg-yellow-100 text-yellow-700',
      'Pending': 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Selamat datang kembali! Berikut ringkasan bisnis Anda.</p>
      </div>

      {/* Stats Cards - 4 Cards Horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center ${colors.text}`}>
                  {stat.icon}
                </div>
                <span className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                  {stat.trend === 'up' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-600 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Area - Large Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Pesanan Terbaru</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Lihat Semua
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ID Pesanan</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Pelanggan</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <span className="font-medium text-sm text-gray-900">{order.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">{order.customer}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-semibold text-gray-900">{order.amount}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{order.date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Statistik Cepat</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pesanan Hari Ini</span>
                <span className="text-lg font-bold text-gray-900">47</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Review</span>
                <span className="text-lg font-bold text-orange-600">12</span>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stok Rendah</span>
                <span className="text-lg font-bold text-red-600">5</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Aksi Cepat</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium text-sm">Tambah Produk</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span className="font-medium text-sm">Buat Voucher</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-sm">Export Laporan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
