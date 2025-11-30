-- Fix: Orders with status='delivered' but delivered_at is NULL
-- This happens because the old trigger checked wrong column (shipping_status instead of status)

-- Step 1: Check how many orders affected
SELECT
  COUNT(*) as affected_orders,
  MIN(updated_at) as oldest,
  MAX(updated_at) as newest
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NULL;

-- Step 2: Show affected orders
SELECT
  id,
  order_number,
  status,
  shipping_status,
  delivered_at,
  updated_at,
  created_at
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NULL
ORDER BY updated_at DESC;

-- Step 3: Fix the trigger (run this first!)
CREATE OR REPLACE FUNCTION set_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed to 'delivered' and delivered_at is not set
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at = NOW();
  END IF;

  -- If status changed from 'delivered' to something else, clear delivered_at
  IF NEW.status != 'delivered' AND OLD.status = 'delivered' THEN
    NEW.delivered_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Fix existing orders - Set delivered_at to updated_at (best guess)
UPDATE orders
SET delivered_at = updated_at
WHERE status = 'delivered'
  AND delivered_at IS NULL;

-- Step 5: Verify fix
SELECT
  id,
  order_number,
  status,
  delivered_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - delivered_at)) / 86400 as days_since_delivered
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NOT NULL
ORDER BY delivered_at DESC;

-- Step 6: Check if any orders should be auto-completed (>2 days)
SELECT
  id,
  order_number,
  status,
  delivered_at,
  EXTRACT(EPOCH FROM (NOW() - delivered_at)) / 86400 as days_since,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - delivered_at)) / 86400 >= 2 THEN '⚠️ Should be completed'
    ELSE '✅ Within 2-day window'
  END as check_status
FROM orders
WHERE status = 'delivered'
  AND delivered_at IS NOT NULL
ORDER BY delivered_at ASC;

-- Step 7: If needed, run auto-complete for old delivered orders
-- SELECT auto_complete_delivered_orders();
