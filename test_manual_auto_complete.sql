-- Manual Testing SQL for Auto-Complete System
-- Run these queries in Supabase SQL Editor to test the system

-- ============================================
-- 1. CHECK SYSTEM STATUS
-- ============================================

-- Check if delivered_at column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'delivered_at';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_delivered_at';

-- Check if function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'auto_complete_delivered_orders';

-- Check if cron job is scheduled (requires pg_cron extension)
SELECT * FROM cron.job WHERE jobname = 'auto-complete-delivered-orders';


-- ============================================
-- 2. VIEW CURRENT DELIVERED ORDERS
-- ============================================

-- All delivered orders with time since delivered
SELECT
  id,
  status,
  shipping_status,
  delivered_at,
  EXTRACT(EPOCH FROM (NOW() - delivered_at)) / 3600 as hours_since_delivered,
  EXTRACT(EPOCH FROM (NOW() - delivered_at)) / 86400 as days_since_delivered,
  CASE
    WHEN delivered_at <= NOW() - INTERVAL '2 days' THEN '⚠️ Should be completed'
    ELSE '✅ Within 2-day window'
  END as status_check
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NOT NULL
ORDER BY delivered_at ASC;


-- ============================================
-- 3. FIND ORDERS THAT SHOULD BE AUTO-COMPLETED
-- ============================================

-- Orders delivered more than 2 days ago
SELECT
  id,
  status,
  delivered_at,
  NOW() - delivered_at as time_elapsed
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NOT NULL
  AND delivered_at <= NOW() - INTERVAL '2 days'
ORDER BY delivered_at ASC;


-- ============================================
-- 4. CREATE TEST ORDER (DELIVERED 3 DAYS AGO)
-- ============================================

-- IMPORTANT: Replace 'YOUR_USER_ID' with actual user ID from users table
/*
INSERT INTO orders (
  user_id,
  status,
  shipping_status,
  delivered_at,
  shipping_resi,
  total_amount,
  payment_method,
  created_at
) VALUES (
  'YOUR_USER_ID',  -- ⚠️ REPLACE THIS
  'delivered',
  'Terkirim',
  NOW() - INTERVAL '3 days',  -- 3 days ago
  'TEST-RESI-12345',
  100000,
  'QRIS',
  NOW() - INTERVAL '3 days'
) RETURNING id, status, delivered_at;
*/


-- ============================================
-- 5. RUN AUTO-COMPLETE FUNCTION MANUALLY
-- ============================================

-- Execute the auto-complete function
SELECT auto_complete_delivered_orders();

-- Expected output: void (success) or error message


-- ============================================
-- 6. VERIFY AUTO-COMPLETION RESULTS
-- ============================================

-- Check orders that were just completed
SELECT
  id,
  status,
  delivered_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - delivered_at)) / 86400 as days_between
FROM orders
WHERE status = 'completed'
  AND delivered_at IS NOT NULL
  AND delivered_at <= NOW() - INTERVAL '2 days'
ORDER BY updated_at DESC
LIMIT 10;


-- ============================================
-- 7. TEST TRIGGER (Set delivered_at automatically)
-- ============================================

-- Test 1: Update an order to delivered status
-- The trigger should automatically set delivered_at
/*
UPDATE orders
SET status = 'delivered', shipping_status = 'Terkirim'
WHERE id = 'YOUR_ORDER_ID'  -- ⚠️ REPLACE THIS
RETURNING id, status, delivered_at;
*/

-- Verify the trigger worked
/*
SELECT id, status, delivered_at, updated_at
FROM orders
WHERE id = 'YOUR_ORDER_ID';  -- ⚠️ REPLACE THIS
*/


-- ============================================
-- 8. MONITORING QUERIES
-- ============================================

-- Count orders by status
SELECT
  status,
  COUNT(*) as total,
  COUNT(delivered_at) as with_delivered_at
FROM orders
GROUP BY status
ORDER BY total DESC;

-- Recent status changes (delivered -> completed)
SELECT
  id,
  status,
  delivered_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - delivered_at)) / 86400 as days_to_complete
FROM orders
WHERE status = 'completed'
  AND delivered_at IS NOT NULL
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC
LIMIT 20;


-- ============================================
-- 9. CHECK CRON JOB EXECUTION HISTORY
-- ============================================

-- View recent cron job runs (requires pg_cron)
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobname = 'auto-complete-delivered-orders'
ORDER BY start_time DESC
LIMIT 10;


-- ============================================
-- 10. CLEANUP TEST DATA (Optional)
-- ============================================

-- Delete test orders (be careful!)
/*
DELETE FROM orders
WHERE shipping_resi = 'TEST-RESI-12345'
  AND status IN ('delivered', 'completed');
*/


-- ============================================
-- 11. TROUBLESHOOTING QUERIES
-- ============================================

-- Find delivered orders WITHOUT delivered_at (should be none)
SELECT id, status, delivered_at, updated_at
FROM orders
WHERE status = 'delivered' AND delivered_at IS NULL;

-- Find completed orders WITH delivered_at (auto-completed orders)
SELECT
  id,
  status,
  delivered_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - delivered_at)) / 86400 as days_elapsed
FROM orders
WHERE status = 'completed'
  AND delivered_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;

-- Orders stuck in delivered status (>2 days but not completed)
SELECT
  id,
  status,
  delivered_at,
  NOW() - delivered_at as time_stuck,
  updated_at
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NOT NULL
  AND delivered_at <= NOW() - INTERVAL '2 days'
ORDER BY delivered_at ASC;


-- ============================================
-- 12. PERFORMANCE CHECK
-- ============================================

-- Check index exists
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'orders' AND indexname = 'idx_orders_delivered_at';

-- Explain query performance
EXPLAIN ANALYZE
SELECT id, status, delivered_at
FROM orders
WHERE shipping_status = 'delivered'
  AND delivered_at <= NOW() - INTERVAL '2 days';


-- ============================================
-- END OF TEST QUERIES
-- ============================================
