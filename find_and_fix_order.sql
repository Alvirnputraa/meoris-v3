-- ============================================
-- FIND & FIX ORDER - Step by Step
-- ============================================

-- Step 1: Cari order dengan pattern
-- (Coba berbagai kemungkinan typo atau format berbeda)
SELECT
  id,
  order_number,
  status,
  delivered_at,
  user_id
FROM orders
WHERE order_number LIKE '%DEV-T44456308041SDO5Q%'
   OR order_number LIKE '%44456308041%'
ORDER BY created_at DESC
LIMIT 10;

-- Jika tidak ketemu, coba cari semua order delivered:
-- SELECT id, order_number, status, delivered_at
-- FROM orders
-- WHERE status = 'delivered'
-- ORDER BY created_at DESC
-- LIMIT 10;


-- ============================================
-- Step 2: Setelah dapat ID yang benar, update pakai ID
-- ============================================
-- GANTI <order-id> dengan ID dari Step 1

-- Contoh:
-- UPDATE orders
-- SET status = 'delivered',
--     delivered_at = delivered_at
-- WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';


-- ============================================
-- Step 3: Verify notification dibuat
-- ============================================
-- GANTI <order-id> dengan ID yang sama

-- SELECT type, title, message, created_at
-- FROM notifications
-- WHERE order_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- AND type = 'order_delivered'
-- ORDER BY created_at DESC;


-- ============================================
-- ALTERNATIVE: Fix SEMUA order delivered
-- ============================================
-- Jika mau re-trigger semua order delivered sekaligus:

-- 1. Hapus semua notif delivered lama
-- DELETE FROM notifications WHERE type = 'order_delivered';

-- 2. Re-trigger SEMUA order delivered
-- UPDATE orders
-- SET status = 'delivered',
--     delivered_at = delivered_at
-- WHERE status = 'delivered'
-- AND delivered_at IS NOT NULL;

-- 3. Check berapa notif dibuat
-- SELECT COUNT(*) FROM notifications WHERE type = 'order_delivered';
