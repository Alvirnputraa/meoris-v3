-- ============================================
-- CLEANUP DUPLICATE PAYMENT SUCCESS NOTIFICATIONS
-- ============================================
-- This will remove duplicate 'payment_success' notifications
-- keeping only the OLDEST one for each order

-- Step 1: Preview duplicate notifications
SELECT
  'Preview: Duplicate Notifications' as step,
  n1.order_id,
  n1.user_id,
  COUNT(*) as duplicate_count,
  MIN(n1.created_at) as first_notification,
  MAX(n1.created_at) as last_notification,
  ARRAY_AGG(n1.id ORDER BY n1.created_at) as all_notification_ids
FROM public.notifications n1
WHERE n1.type = 'payment_success'
  AND n1.order_id IS NOT NULL
GROUP BY n1.order_id, n1.user_id
HAVING COUNT(*) > 1
ORDER BY first_notification DESC;

-- Step 2: Count how many duplicates will be deleted
WITH duplicates AS (
  SELECT
    id,
    order_id,
    ROW_NUMBER() OVER (PARTITION BY order_id, type ORDER BY created_at ASC) as rn
  FROM public.notifications
  WHERE type = 'payment_success'
    AND order_id IS NOT NULL
)
SELECT
  'Summary' as step,
  COUNT(*) FILTER (WHERE rn = 1) as will_keep,
  COUNT(*) FILTER (WHERE rn > 1) as will_delete,
  COUNT(*) as total
FROM duplicates;

-- Step 3: DELETE duplicate notifications (keep only the first one)
WITH duplicates AS (
  SELECT
    id,
    order_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY order_id, type ORDER BY created_at ASC) as rn
  FROM public.notifications
  WHERE type = 'payment_success'
    AND order_id IS NOT NULL
)
DELETE FROM public.notifications
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE rn > 1
)
RETURNING
  id,
  order_id,
  user_id,
  created_at;

-- Step 4: Verify cleanup
SELECT
  'Verification After Cleanup' as step,
  n.order_id,
  COUNT(*) as notification_count,
  MIN(n.created_at) as notification_time
FROM public.notifications n
WHERE n.type = 'payment_success'
  AND n.order_id IS NOT NULL
GROUP BY n.order_id
HAVING COUNT(*) > 1;
-- Expected: No rows (all duplicates removed)

-- Step 5: Show remaining payment_success notifications
SELECT
  'Remaining Notifications' as step,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT order_id) as unique_orders,
  COUNT(DISTINCT user_id) as unique_users
FROM public.notifications
WHERE type = 'payment_success';
