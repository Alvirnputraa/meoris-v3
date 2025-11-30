"use client";
import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  ordersCount: number;
  totalSpent: string;
  status: 'active' | 'inactive' | 'banned';
}

export default function AdminUsersPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Mock data
  const users: User[] = [
    { id: 'USR-001', name: 'John Doe', email: 'john@example.com', phone: '081234567890', joinDate: '2025-01-15', ordersCount: 24, totalSpent: 'Rp 5.200.000', status: 'active' },
    { id: 'USR-002', name: 'Jane Smith', email: 'jane@example.com', phone: '081234567891', joinDate: '2025-02-20', ordersCount: 18, totalSpent: 'Rp 3.800.000', status: 'active' },
    { id: 'USR-003', name: 'Bob Johnson', email: 'bob@example.com', phone: '081234567892', joinDate: '2025-03-10', ordersCount: 5, totalSpent: 'Rp 1.200.000', status: 'inactive' },
    { id: 'USR-004', name: 'Alice Brown', email: 'alice@example.com', phone: '081234567893', joinDate: '2025-10-05', ordersCount: 42, totalSpent: 'Rp 12.500.000', status: 'active' },
    { id: 'USR-005', name: 'Charlie Wilson', email: 'charlie@example.com', phone: '081234567894', joinDate: '2025-04-12', ordersCount: 0, totalSpent: 'Rp 0', status: 'banned' },
    { id: 'USR-006', name: 'Diana Prince', email: 'diana@example.com', phone: '081234567895', joinDate: '2025-11-01', ordersCount: 3, totalSpent: 'Rp 890.000', status: 'active' },
    { id: 'USR-007', name: 'Ethan Hunt', email: 'ethan@example.com', phone: '081234567896', joinDate: '2025-05-18', ordersCount: 31, totalSpent: 'Rp 8.700.000', status: 'active' },
    { id: 'USR-008', name: 'Fiona Apple', email: 'fiona@example.com', phone: '081234567897', joinDate: '2025-11-10', ordersCount: 1, totalSpent: 'Rp 280.000', status: 'active' },
    { id: 'USR-009', name: 'George Lucas', email: 'george@example.com', phone: '081234567898', joinDate: '2025-06-22', ordersCount: 12, totalSpent: 'Rp 2.400.000', status: 'inactive' },
    { id: 'USR-010', name: 'Hannah Montana', email: 'hannah@example.com', phone: '081234567899', joinDate: '2025-11-08', ordersCount: 2, totalSpent: 'Rp 550.000', status: 'active' },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Pengguna', value: users.length, color: 'blue' },
    { label: 'Aktif', value: users.filter(u => u.status === 'active').length, color: 'green' },
    { label: 'Baru Bulan Ini', value: users.filter(u => u.joinDate.startsWith('2025-11')).length, color: 'purple' },
    { label: 'Premium', value: users.filter(u => u.ordersCount > 20).length, color: 'yellow' },
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-gray-100 text-gray-700',
      'banned': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      'active': 'Aktif',
      'inactive': 'Nonaktif',
      'banned': 'Diblokir',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelola Pengguna</h1>
        <p className="text-gray-500 mt-1">Kelola akun dan data pengguna platform Anda</p>
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
                placeholder="Cari nama, email, atau ID pengguna..."
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
              <option value="banned">Diblokir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Pengguna</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Kontak</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Bergabung</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Pesanan</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Total Belanja</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-sm text-gray-700">{user.email}</p>
                      <p className="text-xs text-gray-500">{user.phone}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-700">{new Date(user.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-gray-900">{user.ordersCount}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-blue-600">{user.totalSpent}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                        Lihat
                      </button>
                      <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                        Edit
                      </button>
                      {user.status === 'active' && (
                        <button className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
                          Nonaktifkan
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
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada pengguna</h3>
            <p className="text-gray-500">Tidak ada pengguna yang sesuai dengan filter Anda</p>
          </div>
        )}
      </div>
    </div>
  );
}
