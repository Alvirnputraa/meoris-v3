-- Debug: Check why delivered warning doesn't show

-- 1. Check order data
SELECT
  id,
  status,
  shipping_status,
  delivered_at,
  created_at,
  updated_at,
  CASE
    WHEN status = 'delivered' AND delivered_at IS NULL THEN '❌ BUG: delivered tapi delivered_at NULL'
    WHEN status = 'delivered' AND delivered_at IS NOT NULL THEN '✅ OK: delivered dengan delivered_at'
    WHEN status != 'delivered' THEN '⚠️  Status bukan delivered'
    ELSE '? Unknown'
  END as check_status
FROM orders
WHERE id = 'YOUR_ORDER_ID'  -- Ganti dengan order ID yang bermasalah
   OR order_number LIKE '%T44456307598HS3MH%';

-- 2. Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_delivered_at';

-- 3. Manual fix for specific order (if delivered_at is NULL)
-- UNCOMMENT dan ganti ORDER_ID jika perlu
/*
UPDATE orders
SET delivered_at = updated_at  -- Gunakan updated_at sebagai fallback
WHERE status = 'delivered'
  AND delivered_at IS NULL
  AND id = 'YOUR_ORDER_ID';
*/

-- 4. Check all delivered orders without delivered_at
SELECT
  id,
  status,
  shipping_status,
  delivered_at,
  updated_at
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NULL
ORDER BY updated_at DESC;
