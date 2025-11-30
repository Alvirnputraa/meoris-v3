-- TEMPORARY: Disable RLS untuk testing
-- HANYA untuk debugging! Jangan pakai di production!
-- Setelah confirm masalahnya RLS, enable lagi dan perbaiki policy-nya

-- Disable RLS temporarily
ALTER TABLE used_vouchers DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'used_vouchers'
AND schemaname = 'public';

-- CATATAN: Setelah testing berhasil, enable kembali dengan:
-- ALTER TABLE used_vouchers ENABLE ROW LEVEL SECURITY;
-- Dan pastikan policy-nya sudah benar dengan menjalankan fix_used_vouchers_rls.sql

COMMENT ON TABLE used_vouchers IS 'RLS DISABLED FOR TESTING - Remember to re-enable!';
