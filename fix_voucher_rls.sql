-- =============================================
-- FIX VOUCHER RLS
-- =============================================
-- Masalah: User tidak bisa melihat voucher mereka di /user/purchase?view=vouchers
-- karena table voucher juga memiliki RLS yang memblokir query join
--
-- Solusi: Berikan akses SELECT public ke table voucher agar user bisa
-- melihat detail voucher saat join dari user_vouchers
-- =============================================

-- Enable RLS pada table voucher jika belum diaktifkan
ALTER TABLE voucher ENABLE ROW LEVEL SECURITY;

-- Drop policy lama jika ada
DROP POLICY IF EXISTS "Public can view vouchers" ON voucher;
DROP POLICY IF EXISTS "Users can view vouchers" ON voucher;
DROP POLICY IF EXISTS "Allow public to read vouchers" ON voucher;

-- Buat policy baru untuk SELECT (semua user authenticated & anonymous bisa lihat voucher)
-- Ini diperlukan agar saat query join dari user_vouchers ke voucher, data bisa di-fetch
CREATE POLICY "Anyone can view vouchers"
ON voucher
FOR SELECT
USING (true);

-- Opsional: Jika Anda ingin hanya user yang sudah login yang bisa lihat voucher
-- Ganti policy di atas dengan yang ini (uncomment untuk menggunakan):
-- CREATE POLICY "Authenticated users can view vouchers"
-- ON voucher
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Setelah menjalankan script ini, test dengan query berikut:

-- 1. Test sebagai user yang sudah login, pastikan bisa fetch voucher mereka
-- SELECT
--     uv.*,
--     v.voucher,
--     v.total_potongan,
--     v.expired,
--     v.type,
--     v.minimal_purchase,
--     v.description
-- FROM user_vouchers uv
-- LEFT JOIN voucher v ON v.id = uv.voucher_id
-- WHERE uv.user_id = auth.uid()
-- ORDER BY uv.claimed_at DESC;

-- 2. Cek policy yang sudah dibuat
-- SELECT * FROM pg_policies WHERE tablename = 'voucher';
-- SELECT * FROM pg_policies WHERE tablename = 'user_vouchers';
