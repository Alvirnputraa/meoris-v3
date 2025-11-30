-- Fix Bug: Orders with shipping_status='completed' but status still 'delivered'
-- This fixes orders that were incorrectly updated by the old function

-- Step 1: Check orders with the bug
SELECT
  id,
  status,
  shipping_status,
  delivered_at,
  updated_at
FROM orders
WHERE shipping_status = 'completed'
  AND status = 'delivered';

-- Step 2: Fix the orders
UPDATE orders
SET status = 'completed'
WHERE shipping_status = 'completed'
  AND status = 'delivered'
  AND delivered_at IS NOT NULL;

-- Step 3: Verify fix
SELECT
  id,
  status,
  shipping_status,
  delivered_at,
  updated_at
FROM orders
WHERE status = 'completed'
  AND delivered_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- Step 4: Re-create the function with correct logic
CREATE OR REPLACE FUNCTION auto_complete_delivered_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update orders that have been delivered for more than 2 days
  UPDATE orders
  SET
    status = 'completed',
    updated_at = NOW()
  WHERE
    status = 'delivered'
    AND delivered_at IS NOT NULL
    AND delivered_at <= NOW() - INTERVAL '2 days'
    AND status != 'completed';

  -- Log how many orders were updated
  RAISE NOTICE 'Auto-completed % orders', (SELECT COUNT(*)
    FROM orders
    WHERE status = 'completed'
    AND delivered_at IS NOT NULL
    AND delivered_at <= NOW() - INTERVAL '2 days');
END;
$$;

-- Step 5: Test the fixed function
SELECT auto_complete_delivered_orders();

-- Step 6: Verify all orders are correct
SELECT
  status,
  COUNT(*) as total,
  COUNT(delivered_at) FILTER (WHERE delivered_at IS NOT NULL) as with_delivered_at
FROM orders
GROUP BY status
ORDER BY total DESC;
