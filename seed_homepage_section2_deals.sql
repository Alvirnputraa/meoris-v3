-- =============================================
-- SEED: homepage_section2_deals initial data
-- =============================================

-- Insert data deals untuk Section 2
-- Mengambil produk yang sudah ada dan menambahkan harga diskon

-- Deal 1: Produk dengan ID pertama (asumsikan produk sudah ada)
INSERT INTO homepage_section2_deals (
  produk_id,
  harga_diskon,
  urutan_tampilan,
  is_active,
  mulai_tayang
) VALUES (
  '3fca5cad-2161-4188-8d6b-23bb84a51370', -- Ganti dengan ID produk yang valid
  299000, -- Harga diskon
  1, -- Urutan pertama
  TRUE,
  NOW() - INTERVAL '1 day'
);

-- Deal 2: Produk dengan ID kedua (asumsikan produk sudah ada)
INSERT INTO homepage_section2_deals (
  produk_id,
  harga_diskon,
  urutan_tampilan,
  is_active,
  mulai_tayang
) VALUES (
  '94349b7f-46f5-4541-bc44-c742876d46bb', -- Ganti dengan ID produk yang valid
  289000, -- Harga diskon
  2, -- Urutan kedua
  TRUE,
  NOW() - INTERVAL '1 day'
);

-- Catatan: 
-- 1. Pastikan produk_id yang digunakan ada di tabel produk
-- 2. Harga diskon bisa NULL jika tidak ada diskon
-- 3. Urutan_tampilan digunakan untuk sorting di frontend
-- 4. is_active = false untuk menyembunyikan deal tanpa menghapus data