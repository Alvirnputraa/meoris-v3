-- =============================================
-- CHECK USER VOUCHERS DATA
-- =============================================

-- 1. Check all data in user_vouchers table
SELECT
    uv.id,
    uv.user_id,
    u.email as user_email,
    u.nama as user_nama,
    uv.voucher_id,
    v.voucher as voucher_code,
    v.total_potongan,
    v.expired,
    uv.claimed_at,
    uv.used,
    uv.used_at
FROM user_vouchers uv
LEFT JOIN users u ON u.id = uv.user_id
LEFT JOIN voucher v ON v.id = uv.voucher_id
ORDER BY uv.claimed_at DESC;

-- 2. Count total user vouchers
SELECT COUNT(*) as total_user_vouchers FROM user_vouchers;

-- 3. Check available vouchers
SELECT * FROM voucher WHERE expired > NOW();

-- 4. Check users
SELECT id, email, nama FROM users LIMIT 10;

-- =============================================
-- INSERT TEST DATA (if needed)
-- =============================================
-- Uncomment and modify the user_id below if you want to insert test data

-- INSERT INTO user_vouchers (user_id, voucher_id, claimed_at, used)
-- SELECT
--     (SELECT id FROM users LIMIT 1), -- Replace with actual user_id
--     id,
--     NOW(),
--     false
-- FROM voucher
-- WHERE voucher = '15KLETSGO'
-- LIMIT 1;
