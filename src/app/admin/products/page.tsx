"use client";
import { useState, useEffect } from 'react';
import { produkDb } from '@/lib/database';
import type { Produk } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function AdminProductsPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [products, setProducts] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSidebar, setEditingSidebar] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produk | null>(null);
  const [editForm, setEditForm] = useState<Partial<Produk>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<{
    photo1: boolean;
    photo2: boolean;
    photo3: boolean;
    preview_photo: boolean;
  }>({
    photo1: false,
    photo2: false,
    photo3: false,
    preview_photo: false,
  });

  useEffect(() => {
    setMounted(true);
    fetchProducts();
  }, []);

  const handleEditClick = (product: Produk) => {
    setSelectedProduct(product);
    setEditForm({
      id: product.id,
      nama_produk: product.nama_produk,
      deskripsi: product.deskripsi,
      photo1: product.photo1,
      photo2: product.photo2,
      photo3: product.photo3,
      preview_photo: product.preview_photo,
      size1: product.size1,
      size2: product.size2,
      size3: product.size3,
      size4: product.size4,
      size5: product.size5,
      kategori: product.kategori,
      harga: product.harga,
      stock: product.stock,
    });
    setEditingSidebar(true);
  };

  const handleCloseSidebar = () => {
    setEditingSidebar(false);
    setSelectedProduct(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!selectedProduct) return;

    try {
      setSaving(true);
      await produkDb.update(selectedProduct.id, editForm);
      await fetchProducts();
      handleCloseSidebar();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await produkDb.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (
    file: File,
    photoField: 'photo1' | 'photo2' | 'photo3' | 'preview_photo'
  ) => {
    if (!file) return;

    try {
      setUploadingPhoto({ ...uploadingPhoto, [photoField]: true });

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('sendal')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sendal')
        .getPublicUrl(filePath);

      // Update form with the new URL
      setEditForm({ ...editForm, [photoField]: urlData.publicUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Gagal mengupload foto');
    } finally {
      setUploadingPhoto({ ...uploadingPhoto, [photoField]: false });
    }
  };

  if (!mounted) return null;

  // Get unique categories from products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.kategori).filter(Boolean)))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nama_produk?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.kategori === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = [
    { label: 'Total Produk', value: products.length, color: 'blue' },
    { label: 'Kategori', value: categories.length - 1, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Produk</h1>
          <p className="text-gray-500 mt-1">Kelola inventori dan katalog produk Anda</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Produk
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

      {/* Filters and View Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama produk atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Kategori</option>
              {categories.filter(c => c !== 'all').map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              {/* Product Image */}
              <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                {product.photo1 ? (
                  <Image
                    src={product.photo1}
                    alt={product.nama_produk || 'Product'}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <svg className="w-20 h-20 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{product.nama_produk}</h3>
                    <p className="text-xs text-gray-500">{product.id?.substring(0, 8)}...</p>
                  </div>
                </div>

                <p className="text-lg font-bold text-blue-600 mb-2">
                  Rp {product.harga?.toLocaleString('id-ID')}
                </p>

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">{product.kategori}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(product)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const uuid = product.id?.replace(/-/g, '');
                      window.open(`/produk/${uuid}/detail`, '_blank');
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Gambar</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Produk</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Harga</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-6">
                      <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        {product.photo1 ? (
                          <Image
                            src={product.photo1}
                            alt={product.nama_produk || 'Product'}
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{product.nama_produk}</p>
                        <p className="text-xs text-gray-500">{product.id?.substring(0, 13)}...</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">{product.kategori}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-blue-600">Rp {product.harga?.toLocaleString('id-ID')}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const uuid = product.id?.replace(/-/g, '');
                            window.open(`/produk/${uuid}/detail`, '_blank');
                          }}
                          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                          Lihat
                        </button>
                        <button className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada produk</h3>
          <p className="text-gray-500">Tidak ada produk yang sesuai dengan filter Anda</p>
        </div>
      )}

      {/* Edit Sidebar */}
      {editingSidebar && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={handleCloseSidebar}
          />

          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Produk</h2>
              <button
                onClick={handleCloseSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* ID (readonly) */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ID Produk</label>
                  <input
                    type="text"
                    value={editForm.id || ''}
                    readOnly
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Nama Produk */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Produk</label>
                  <input
                    type="text"
                    value={editForm.nama_produk || ''}
                    onChange={(e) => setEditForm({ ...editForm, nama_produk: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan nama produk"
                  />
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi Produk</label>
                  <textarea
                    value={editForm.deskripsi || ''}
                    onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Masukkan deskripsi produk"
                  />
                </div>

                {/* Photos Section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Foto Produk</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Photo 1 */}
                    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Photo 1</label>
                      {editForm.photo1 ? (
                        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={editForm.photo1}
                            alt="Photo 1"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="photo1-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, 'photo1');
                        }}
                      />
                      <label
                        htmlFor="photo1-upload"
                        className={`block w-full px-3 py-2 text-xs font-medium text-center rounded-lg cursor-pointer transition ${
                          uploadingPhoto.photo1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {uploadingPhoto.photo1 ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>

                    {/* Photo 2 */}
                    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Photo 2</label>
                      {editForm.photo2 ? (
                        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={editForm.photo2}
                            alt="Photo 2"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="photo2-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, 'photo2');
                        }}
                      />
                      <label
                        htmlFor="photo2-upload"
                        className={`block w-full px-3 py-2 text-xs font-medium text-center rounded-lg cursor-pointer transition ${
                          uploadingPhoto.photo2
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {uploadingPhoto.photo2 ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>

                    {/* Photo 3 */}
                    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Photo 3</label>
                      {editForm.photo3 ? (
                        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={editForm.photo3}
                            alt="Photo 3"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="photo3-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, 'photo3');
                        }}
                      />
                      <label
                        htmlFor="photo3-upload"
                        className={`block w-full px-3 py-2 text-xs font-medium text-center rounded-lg cursor-pointer transition ${
                          uploadingPhoto.photo3
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {uploadingPhoto.photo3 ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>

                    {/* Preview Photo */}
                    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Preview Photo</label>
                      {editForm.preview_photo ? (
                        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={editForm.preview_photo}
                            alt="Preview Photo"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="preview-photo-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, 'preview_photo');
                        }}
                      />
                      <label
                        htmlFor="preview-photo-upload"
                        className={`block w-full px-3 py-2 text-xs font-medium text-center rounded-lg cursor-pointer transition ${
                          uploadingPhoto.preview_photo
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {uploadingPhoto.preview_photo ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sizes Section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Ukuran</h3>
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">S1</label>
                      <input
                        type="text"
                        value={editForm.size1 || ''}
                        onChange={(e) => setEditForm({ ...editForm, size1: e.target.value })}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="S1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">S2</label>
                      <input
                        type="text"
                        value={editForm.size2 || ''}
                        onChange={(e) => setEditForm({ ...editForm, size2: e.target.value })}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="S2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">S3</label>
                      <input
                        type="text"
                        value={editForm.size3 || ''}
                        onChange={(e) => setEditForm({ ...editForm, size3: e.target.value })}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="S3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">S4</label>
                      <input
                        type="text"
                        value={editForm.size4 || ''}
                        onChange={(e) => setEditForm({ ...editForm, size4: e.target.value })}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="S4"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">S5</label>
                      <input
                        type="text"
                        value={editForm.size5 || ''}
                        onChange={(e) => setEditForm({ ...editForm, size5: e.target.value })}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="S5"
                      />
                    </div>
                  </div>
                </div>

                {/* Kategori */}
                <div className="border-t pt-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={editForm.kategori || ''}
                    onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.filter(c => c !== 'all').map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Harga */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Harga</label>
                  <input
                    type="number"
                    value={editForm.harga || ''}
                    onChange={(e) => setEditForm({ ...editForm, harga: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan harga"
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={editForm.stock || ''}
                    onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Masukkan jumlah stock"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={handleCloseSidebar}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
