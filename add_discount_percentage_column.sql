-- =============================================
-- ADD COLUMN: discount_percentage to homepage_section2_deals
-- =============================================

-- Menambahkan kolom discount_percentage ke tabel homepage_section2_deals
-- Kolom ini akan diisi manual oleh admin untuk menampilkan persentase diskon
-- di section 2 homepage (gambar atas kiri)

ALTER TABLE homepage_section2_deals 
ADD COLUMN discount_percentage INTEGER;

-- Comment untuk kolom baru
COMMENT ON COLUMN homepage_section2_deals.discount_percentage IS 'Persentase diskon yang ditampilkan di UI (diisi manual oleh admin)';

-- Update existing data dengan perhitungan otomatis sebagai default
-- Ini hanya untuk data yang sudah ada, data baru bisa diisi manual
UPDATE homepage_section2_deals 
SET discount_percentage = CASE 
  WHEN harga_diskon IS NOT NULL AND harga_diskon > 0 
       AND (SELECT harga FROM produk WHERE id = homepage_section2_deals.produk_id) > 0
  THEN ROUND(
    ((SELECT harga FROM produk WHERE id = homepage_section2_deals.produk_id) - harga_diskon) / 
    (SELECT harga FROM produk WHERE id = homepage_section2_deals.produk_id) * 100
  )
  ELSE NULL
END;

-- Index untuk performa query (opsional)
CREATE INDEX idx_homepage_section2_deals_discount_percentage ON homepage_section2_deals(discount_percentage);