-- Query untuk ngambil Order ID dari database
-- Gunakan di Supabase SQL Editor atau psql

-- 1. Ambil 10 order terakhir dengan status paid
SELECT
    id as order_id,
    status,
    shipping_status,
    shipping_resi,
    total_amount,
    created_at,
    user_id
FROM orders
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Ambil order dengan user_id tertentu
SELECT
    id as order_id,
    status,
    shipping_status,
    shipping_resi,
    total_amount,
    created_at
FROM orders
WHERE user_id = 'YOUR-USER-UUID-HERE'
  AND status = 'paid'
ORDER BY created_at DESC;

-- 3. Ambil order hari ini
SELECT
    id as order_id,
    status,
    shipping_status,
    shipping_resi,
    total_amount,
    created_at
FROM orders
WHERE status = 'paid'
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 4. Cek specific order
SELECT
    id as order_id,
    status,
    shipping_status,
    shipping_resi,
    total_amount,
    created_at,
    updated_at
FROM orders
WHERE id = '3ec29e32-b31f-405d-a45f-f725e8fe0ce6';

-- 5. Ambil order yang belum punya resi
SELECT
    id as order_id,
    status,
    shipping_status,
    shipping_resi,
    total_amount,
    created_at
FROM orders
WHERE status = 'paid'
  AND (shipping_resi IS NULL OR shipping_resi = '')
ORDER BY created_at DESC
LIMIT 10;
