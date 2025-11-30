-- =====================================================
-- DEBUG AUTO CANCEL SYSTEM
-- =====================================================

-- 1. CHECK IF FUNCTION EXISTS
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'auto_cancel_pending_orders';

-- 2. CHECK CHECKOUT DATA
SELECT
  id,
  payment_reference,
  status,
  payment_expired_at,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS expired_wib,
  NOW() AS current_time_utc,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_time_wib,
  CASE
    WHEN payment_expired_at < NOW() THEN 'EXPIRED ✓'
    ELSE 'NOT EXPIRED YET'
  END AS is_expired
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309234MLXPS';

-- 3. MANUAL TRIGGER AUTO-CANCEL FUNCTION
SELECT * FROM auto_cancel_pending_orders();

-- 4. CHECK RESULT AFTER AUTO-CANCEL
SELECT
  id,
  payment_reference,
  status,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS expired_wib,
  updated_at AT TIME ZONE 'Asia/Jakarta' AS updated_wib
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309234MLXPS';

-- 5. CHECK IF NOTIFICATION WAS CREATED
SELECT
  id,
  user_id,
  title,
  message,
  type,
  created_at AT TIME ZONE 'Asia/Jakarta' AS created_wib
FROM notifications
WHERE message LIKE '%DEV-T44456309234MLXPS%'
ORDER BY created_at DESC
LIMIT 5;
