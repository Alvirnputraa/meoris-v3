-- =============================================
-- INSERT 4 PRODUK DISKON untuk FLASH SALE
-- =============================================
-- Query ini menambahkan 4 produk ke tabel homepage_section2_deals
-- Ganti produk_id dengan UUID produk yang ada di database Anda
-- Ganti harga_diskon sesuai dengan harga diskon yang diinginkan

INSERT INTO homepage_section2_deals
  (produk_id, harga_diskon, urutan_tampilan, is_active, mulai_tayang, selesai_tayang)
VALUES
  -- Produk 1 - Ganti UUID dan harga sesuai kebutuhan
  (
    'GANTI-DENGAN-UUID-PRODUK-1'::uuid,  -- produk_id (ambil dari tabel produk)
    150000.00,                             -- harga_diskon (harga setelah diskon)
    1,                                     -- urutan_tampilan (tampil pertama)
    true,                                  -- is_active (aktif)
    NOW(),                                 -- mulai_tayang (mulai sekarang)
    NOW() + INTERVAL '7 days'              -- selesai_tayang (7 hari dari sekarang)
  ),

  -- Produk 2
  (
    'GANTI-DENGAN-UUID-PRODUK-2'::uuid,
    175000.00,
    2,
    true,
    NOW(),
    NOW() + INTERVAL '7 days'
  ),

  -- Produk 3
  (
    'GANTI-DENGAN-UUID-PRODUK-3'::uuid,
    200000.00,
    3,
    true,
    NOW(),
    NOW() + INTERVAL '7 days'
  ),

  -- Produk 4
  (
    'GANTI-DENGAN-UUID-PRODUK-4'::uuid,
    225000.00,
    4,
    true,
    NOW(),
    NOW() + INTERVAL '7 days'
  );


-- =============================================
-- QUERY UNTUK MENDAPATKAN DAFTAR PRODUK
-- =============================================
-- Gunakan query ini untuk melihat produk yang tersedia beserta UUID-nya
-- Jalankan query ini terlebih dahulu untuk mendapatkan produk_id

-- SELECT
--   id as produk_id,
--   nama_produk,
--   harga,
--   kategori,
--   gambar_urls
-- FROM produk
-- WHERE is_active = true
-- ORDER BY created_at DESC
-- LIMIT 20;


-- =============================================
-- CONTOH QUERY DENGAN DATA LENGKAP
-- =============================================
-- Jika Anda sudah punya UUID produk, gunakan format seperti ini:

-- INSERT INTO homepage_section2_deals
--   (produk_id, harga_diskon, urutan_tampilan, is_active, mulai_tayang, selesai_tayang)
-- VALUES
--   ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 150000.00, 1, true, NOW(), NOW() + INTERVAL '7 days'),
--   ('b2c3d4e5-f6g7-8901-bcde-f12345678901'::uuid, 175000.00, 2, true, NOW(), NOW() + INTERVAL '7 days'),
--   ('c3d4e5f6-g7h8-9012-cdef-123456789012'::uuid, 200000.00, 3, true, NOW(), NOW() + INTERVAL '7 days'),
--   ('d4e5f6g7-h8i9-0123-defg-234567890123'::uuid, 225000.00, 4, true, NOW(), NOW() + INTERVAL '7 days');
