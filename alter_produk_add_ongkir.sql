-- Menambahkan kolom ongkir ke tabel produk
-- Kolom ini akan menyimpan harga ongkir untuk setiap produk

ALTER TABLE public.produk 
ADD COLUMN ongkir numeric DEFAULT 0;

-- Update comment untuk kolom baru
COMMENT ON COLUMN public.produk.ongkir IS 'Harga ongkir untuk produk ini';
