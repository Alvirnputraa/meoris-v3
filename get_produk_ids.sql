-- =============================================
-- GET PRODUK IDs
-- =============================================
-- Jalankan query ini untuk mendapatkan ID produk yang valid
-- yang bisa digunakan untuk seeding data homepage_section2_deals

-- Tampilkan 10 produk pertama dengan ID dan nama
SELECT 
  id,
  nama_produk,
  harga,
  photo1,
  created_at
FROM produk 
ORDER BY created_at DESC
LIMIT 10;

-- Tampilkan produk yang mungkin cocok untuk deals
SELECT 
  id,
  nama_produk,
  harga,
  CASE 
    WHEN photo1 IS NOT NULL THEN 'Ada foto'
    ELSE 'Tidak ada foto'
  END as status_foto
FROM produk 
WHERE photo1 IS NOT NULL 
  AND harga IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;