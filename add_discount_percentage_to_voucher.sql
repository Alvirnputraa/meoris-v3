-- =============================================
-- ADD DISCOUNT_PERCENTAGE TO VOUCHER TABLE
-- =============================================
-- Menambahkan kolom discount_percentage jika belum ada
-- untuk ditampilkan di voucher card

-- Add discount_percentage column if not exists
ALTER TABLE voucher
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT NULL;

-- Update existing vouchers dengan persentase default
-- Untuk voucher diskon, set ke 15% sebagai default
UPDATE voucher
SET discount_percentage = 15
WHERE type = 'discount' AND discount_percentage IS NULL;

-- Untuk voucher shipping, tidak perlu persentase
UPDATE voucher
SET discount_percentage = NULL
WHERE type = 'shipping';

-- Contoh update untuk voucher specific
-- UPDATE voucher SET discount_percentage = 50 WHERE voucher = '15KLETSGO';

-- Verify
SELECT
    id,
    voucher,
    type,
    total_potongan,
    discount_percentage,
    minimal_purchase,
    expired
FROM voucher
ORDER BY created_at DESC;
