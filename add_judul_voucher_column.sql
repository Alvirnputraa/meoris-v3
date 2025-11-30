-- =============================================
-- ADD JUDUL_VOUCHER TO VOUCHER TABLE
-- =============================================
-- Menambahkan kolom judul_voucher untuk judul custom voucher
-- yang akan ditampilkan di voucher card

-- Add judul_voucher column if not exists
ALTER TABLE voucher
ADD COLUMN IF NOT EXISTS judul_voucher TEXT DEFAULT NULL;

-- Update existing vouchers dengan judul default berdasarkan type
-- Untuk voucher shipping
UPDATE voucher
SET judul_voucher = CONCAT('Gratis Ongkir s/d Rp', (total_potongan / 1000)::INTEGER, 'RB')
WHERE type = 'shipping' AND judul_voucher IS NULL;

-- Untuk voucher discount
UPDATE voucher
SET judul_voucher = CONCAT('Diskon ', COALESCE(discount_percentage, 15), '% s/d Rp', (total_potongan / 1000)::INTEGER, 'RB')
WHERE type = 'discount' AND judul_voucher IS NULL;

-- Contoh update manual untuk voucher specific
-- UPDATE voucher SET judul_voucher = 'Flash Sale Diskon 50% Maksimal 100RB' WHERE voucher = '15KLETSGO';
-- UPDATE voucher SET judul_voucher = 'Gratis Ongkir Seluruh Indonesia' WHERE voucher = 'FREESHIPALL';

-- Verify
SELECT
    id,
    voucher,
    type,
    judul_voucher,
    total_potongan,
    discount_percentage,
    minimal_pembelian,
    minimal_purchase,
    expired
FROM voucher
ORDER BY created_at DESC;
