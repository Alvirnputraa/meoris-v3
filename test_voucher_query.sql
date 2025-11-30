-- =============================================
-- TEST VOUCHER QUERY
-- =============================================

-- Step 1: Lihat semua user yang ada di database
SELECT id, email, nama
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Lihat semua data di user_vouchers (tanpa filter user_id)
-- Ini untuk memastikan data memang ada di table
SELECT
    uv.id,
    uv.user_id,
    u.email as user_email,
    u.nama as user_nama,
    uv.voucher_id,
    uv.claimed_at,
    uv.used,
    uv.used_at
FROM user_vouchers uv
LEFT JOIN users u ON u.id = uv.user_id
ORDER BY uv.claimed_at DESC;

-- Step 3: Lihat semua data dengan detail voucher (FULL JOIN TEST)
-- Ini adalah query yang sebenarnya dijalankan oleh aplikasi
SELECT
    uv.id,
    uv.user_id,
    u.email as user_email,
    u.nama as user_nama,
    uv.voucher_id,
    uv.claimed_at,
    uv.used,
    uv.used_at,
    v.voucher as voucher_code,
    v.total_potongan,
    v.expired,
    v.type,
    v.minimal_purchase,
    v.description
FROM user_vouchers uv
LEFT JOIN users u ON u.id = uv.user_id
LEFT JOIN voucher v ON v.id = uv.voucher_id
ORDER BY uv.claimed_at DESC;

-- Step 4: Filter berdasarkan specific user (GANTI <USER_ID> dengan hasil dari Step 1)
-- Contoh: WHERE uv.user_id = '550e8400-e29b-41d4-a716-446655440000'
/*
SELECT
    uv.id,
    uv.user_id,
    uv.voucher_id,
    uv.claimed_at,
    uv.used,
    v.voucher as voucher_code,
    v.total_potongan,
    v.expired,
    v.type,
    v.minimal_purchase,
    v.description
FROM user_vouchers uv
LEFT JOIN voucher v ON v.id = uv.voucher_id
WHERE uv.user_id = '<GANTI_DENGAN_USER_ID_DARI_STEP_1>'
ORDER BY uv.claimed_at DESC;
*/

-- Step 5: Test RLS policies - Cek policy yang aktif
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('voucher', 'user_vouchers')
ORDER BY tablename, policyname;
