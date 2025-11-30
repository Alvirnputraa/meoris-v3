-- Tambah kolom minimal_pembelian ke tabel voucher
-- Kolom ini untuk menentukan minimal jumlah produk yang harus dibeli untuk menggunakan voucher

ALTER TABLE voucher
ADD COLUMN minimal_pembelian INT DEFAULT 1;

-- Tambahkan comment untuk kolom (PostgreSQL syntax)
COMMENT ON COLUMN voucher.minimal_pembelian IS 'Minimal jumlah produk yang harus dibeli untuk menggunakan voucher';

-- Update voucher yang sudah ada (opsional, sesuaikan dengan kebutuhan)
-- Contoh: Update voucher dengan kode 15KLETSGO agar minimal pembelian 2 produk
UPDATE voucher
SET minimal_pembelian = 2
WHERE voucher = '15KLETSGO';

-- Contoh: Voucher ONGKIR7K tidak ada minimal pembelian (sudah default 1)
UPDATE voucher
SET minimal_pembelian = 1
WHERE voucher = 'ONGKIR7K';
