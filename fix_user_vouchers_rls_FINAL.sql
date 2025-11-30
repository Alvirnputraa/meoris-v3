-- =============================================
-- FIX USER VOUCHERS RLS - DISABLE RLS
-- =============================================
-- MASALAH:
-- Aplikasi menggunakan CUSTOM AUTH (localStorage) bukan Supabase Auth
-- RLS policy menggunakan auth.uid() yang selalu NULL untuk custom auth
-- Sehingga query selalu return empty array []
--
-- SOLUSI:
-- Disable RLS untuk table user_vouchers karena aplikasi tidak menggunakan
-- Supabase Auth. Security akan dijaga di application level.
-- =============================================

-- Drop semua policy yang ada untuk user_vouchers
DROP POLICY IF EXISTS "Users can view their own vouchers" ON user_vouchers;
DROP POLICY IF EXISTS "Users can claim vouchers" ON user_vouchers;
DROP POLICY IF EXISTS "Users can update their own vouchers" ON user_vouchers;

-- Disable RLS untuk table user_vouchers
ALTER TABLE user_vouchers DISABLE ROW LEVEL SECURITY;

-- Pastikan table voucher bisa diakses public (untuk join)
ALTER TABLE voucher ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view vouchers" ON voucher;
CREATE POLICY "Anyone can view vouchers"
ON voucher
FOR SELECT
USING (true);

-- =============================================
-- VERIFICATION
-- =============================================
-- Test query untuk memastikan data bisa diambil

-- 1. Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('user_vouchers', 'voucher');

-- 2. Test query dengan user_id yang ada
-- Ganti dengan user_id yang sebenarnya: aa69bd53-8569-4114-8387-3c1a531cec94
SELECT
    uv.*,
    v.voucher as voucher_code,
    v.total_potongan,
    v.expired,
    v.type,
    v.minimal_purchase,
    v.description
FROM user_vouchers uv
LEFT JOIN voucher v ON v.id = uv.voucher_id
WHERE uv.user_id = 'aa69bd53-8569-4114-8387-3c1a531cec94'
ORDER BY uv.claimed_at DESC;

-- 3. Check policies (seharusnya tidak ada policy untuk user_vouchers)
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('user_vouchers', 'voucher')
ORDER BY tablename, policyname;
