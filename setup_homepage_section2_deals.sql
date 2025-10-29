-- =============================================
-- COMPLETE SETUP: homepage_section2_deals
-- =============================================
-- File ini menggabungkan pembuatan tabel dan seeding data
-- Jalankan file ini sekali saja untuk setup lengkap

-- =============================================
-- CREATE TABLE: homepage_section2_deals
-- =============================================

-- Table untuk menyimpan data deals yang ditampilkan di Section 2 homepage
-- Mengambil data produk dari tabel produk (photo1, harga) dan menambahkan harga diskon

CREATE TABLE IF NOT EXISTS homepage_section2_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  
  -- Harga diskon (opsional, jika NULL maka tidak ada diskon)
  harga_diskon NUMERIC(12, 2),
  
  -- Urutan tampilan (untuk sorting)
  urutan_tampilan INTEGER NOT NULL DEFAULT 1,
  
  -- Status aktif/non-aktif
  is_active BOOLEAN DEFAULT true,
  
  -- Waktu tayang (opsional)
  mulai_tayang TIMESTAMP WITH TIME ZONE,
  selesai_tayang TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_homepage_section2_deals_produk_id ON homepage_section2_deals(produk_id);
CREATE INDEX IF NOT EXISTS idx_homepage_section2_deals_active ON homepage_section2_deals(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_section2_deals_urutan ON homepage_section2_deals(urutan_tampilan);

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_homepage_section2_deals_updated_at ON homepage_section2_deals;
CREATE TRIGGER update_homepage_section2_deals_updated_at 
  BEFORE UPDATE ON homepage_section2_deals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
) ON CONFLICT (id) DO NOTHING;

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
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- VERIFICATION
-- =============================================

-- Tampilkan data yang sudah diinsert untuk verifikasi
SELECT 
  hsd.id,
  hsd.produk_id,
  p.nama_produk,
  p.harga as harga_asli,
  hsd.harga_diskon,
  hsd.urutan_tampilan,
  hsd.is_active
FROM homepage_section2_deals hsd
JOIN produk p ON hsd.produk_id = p.id
ORDER BY hsd.urutan_tampilan;

-- Catatan: 
-- 1. Pastikan produk_id yang digunakan ada di tabel produk
-- 2. Harga diskon bisa NULL jika tidak ada diskon
-- 3. Urutan_tampilan digunakan untuk sorting di frontend
-- 4. is_active = false untuk menyembunyikan deal tanpa menghapus data
-- 5. Jika produk_id tidak ditemukan, update dengan ID produk yang valid