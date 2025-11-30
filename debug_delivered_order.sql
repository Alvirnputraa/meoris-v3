-- ============================================
-- DEBUG DELIVERED ORDER ISSUE
-- ============================================
-- Copy paste query ini ke Supabase SQL Editor
-- Ganti 'DEV-T44456308029S2QDD' dengan order number Anda

-- Step 1: Check order details
SELECT
  id,
  order_number,
  status,
  delivered_at,
  user_id,
  created_at,
  shipping_status
FROM orders
WHERE order_number = 'DEV-T44456308029S2QDD';

-- Jika order tidak ditemukan, coba cari dengan LIKE:
-- SELECT id, order_number, status, delivered_at
-- FROM orders
-- WHERE order_number LIKE '%DEV-T44456308029S2QDD%';


-- Step 2: Check notifications untuk order ini
-- (Ganti <order-id> dengan ID dari query pertama)
SELECT
  type,
  title,
  message,
  created_at
FROM notifications
WHERE order_id = '<order-id>'
ORDER BY created_at DESC;


-- Step 3: Check apakah trigger delivered notification sudah dibuat
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_delivered';


-- Step 4: Check apakah trigger shipped notification sudah dibuat
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notification_on_order_shipped';


-- ============================================
-- POSSIBLE ISSUES & FIXES
-- ============================================

-- Issue 1: Status bukan "delivered" (case sensitive!)
-- Fix: UPDATE orders SET status = 'delivered' WHERE order_number = 'DEV-T44456308029S2QDD';

-- Issue 2: delivered_at adalah NULL
-- Fix: UPDATE orders SET delivered_at = NOW() WHERE order_number = 'DEV-T44456308029S2QDD';

-- Issue 3: Trigger belum dibuat
-- Fix: Run SQL dari create_notification_on_delivered.sql

-- Issue 4: Order sudah delivered sebelum trigger dibuat
-- Fix: Re-update order untuk trigger notification:
--      UPDATE orders
--      SET status = 'shipped'
--      WHERE order_number = 'DEV-T44456308029S2QDD';
--
--      UPDATE orders
--      SET status = 'delivered', delivered_at = NOW()
--      WHERE order_number = 'DEV-T44456308029S2QDD';


-- ============================================
-- QUICK FIX (All-in-One)
-- ============================================
-- Jalankan ini jika order sudah delivered tapi tidak ada notifikasi:

-- 1. Pastikan trigger sudah dibuat (run create_notification_on_delivered.sql dulu!)

-- 2. Fix order dan trigger notification:
UPDATE orders
SET status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW())
WHERE order_number = 'DEV-T44456308029S2QDD';

-- 3. Verify notification dibuat:
SELECT * FROM notifications
WHERE order_id = (
  SELECT id FROM orders WHERE order_number = 'DEV-T44456308029S2QDD'
)
AND type = 'order_delivered'
ORDER BY created_at DESC;
