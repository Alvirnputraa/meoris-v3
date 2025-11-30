-- ============================================
-- FIX: Auto-Complete Race Condition with Return Requests
-- ============================================
-- This file fixes the race condition where orders are auto-completed
-- even when there are active (pending/approved) return requests.
--
-- PROBLEM: Original function completes orders after 2 days without checking returns
-- SOLUTION: Exclude orders that have active return requests

-- Drop existing function
DROP FUNCTION IF EXISTS auto_complete_delivered_orders() CASCADE;

-- Create FIXED function to automatically complete orders after 2 days of being delivered
-- NOW with protection against active return requests
CREATE OR REPLACE FUNCTION auto_complete_delivered_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  completed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Update orders that have been delivered for more than 2 days
  -- BUT ONLY if they don't have active return requests
  WITH orders_to_complete AS (
    SELECT o.id
    FROM orders o
    WHERE
      o.status = 'delivered'
      AND o.delivered_at IS NOT NULL
      AND o.delivered_at <= NOW() - INTERVAL '2 days'
      -- CRITICAL FIX: Exclude orders with active return requests
      AND NOT EXISTS (
        SELECT 1
        FROM returns r
        WHERE r.order_id = o.id
        AND r.status IN ('pending', 'approved')
      )
  )
  UPDATE orders
  SET
    status = 'completed',
    updated_at = NOW()
  FROM orders_to_complete
  WHERE orders.id = orders_to_complete.id;

  -- Get count of completed orders
  GET DIAGNOSTICS completed_count = ROW_COUNT;

  -- Count orders that were skipped due to active returns
  SELECT COUNT(*)
  INTO skipped_count
  FROM orders o
  WHERE
    o.status = 'delivered'
    AND o.delivered_at IS NOT NULL
    AND o.delivered_at <= NOW() - INTERVAL '2 days'
    AND EXISTS (
      SELECT 1
      FROM returns r
      WHERE r.order_id = o.id
      AND r.status IN ('pending', 'approved')
    );

  -- Log results
  RAISE NOTICE 'Auto-completed % orders', completed_count;
  IF skipped_count > 0 THEN
    RAISE NOTICE 'Skipped % orders due to active return requests', skipped_count;
  END IF;

  -- Additional logging: Show which orders were skipped
  IF skipped_count > 0 THEN
    RAISE NOTICE 'Skipped order IDs with active returns: %', (
      SELECT STRING_AGG(o.id::text, ', ')
      FROM orders o
      WHERE
        o.status = 'delivered'
        AND o.delivered_at IS NOT NULL
        AND o.delivered_at <= NOW() - INTERVAL '2 days'
        AND EXISTS (
          SELECT 1
          FROM returns r
          WHERE r.order_id = o.id
          AND r.status IN ('pending', 'approved')
        )
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_complete_delivered_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_complete_delivered_orders() TO service_role;

COMMENT ON FUNCTION auto_complete_delivered_orders() IS
'Automatically completes orders that have been in delivered status for more than 2 days.
Orders with active (pending/approved) return requests are excluded to prevent race conditions.';

-- ============================================
-- Additional Safety: Prevent Manual Status Changes
-- ============================================
-- This trigger prevents manual or accidental order completion
-- when there are active return requests

DROP FUNCTION IF EXISTS prevent_complete_with_active_return() CASCADE;

CREATE OR REPLACE FUNCTION prevent_complete_with_active_return()
RETURNS TRIGGER AS $$
DECLARE
  active_return_count INTEGER;
BEGIN
  -- Only check when order is being completed from delivered status
  IF NEW.status = 'completed' AND OLD.status = 'delivered' THEN

    -- Check if there are any active return requests
    SELECT COUNT(*)
    INTO active_return_count
    FROM returns
    WHERE order_id = NEW.id
    AND status IN ('pending', 'approved');

    -- If active returns exist, prevent completion
    IF active_return_count > 0 THEN
      RAISE EXCEPTION 'Cannot complete order %. There are % active return request(s). Return status must be resolved first.',
        NEW.id, active_return_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_prevent_complete_with_active_return ON orders;

-- Create trigger to prevent order completion with active returns
CREATE TRIGGER trigger_prevent_complete_with_active_return
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_complete_with_active_return();

COMMENT ON TRIGGER trigger_prevent_complete_with_active_return ON orders IS
'Prevents order completion when there are active (pending/approved) return requests';

-- ============================================
-- Verification Queries
-- ============================================

-- Verify function was created
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'auto_complete_delivered_orders';

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_prevent_complete_with_active_return';

-- Test query: Show orders that WOULD be completed (without active returns)
SELECT
  o.id,
  o.status,
  o.delivered_at,
  AGE(NOW(), o.delivered_at) as time_since_delivered,
  (
    SELECT COUNT(*)
    FROM returns r
    WHERE r.order_id = o.id
    AND r.status IN ('pending', 'approved')
  ) as active_returns_count
FROM orders o
WHERE
  o.status = 'delivered'
  AND o.delivered_at IS NOT NULL
  AND o.delivered_at <= NOW() - INTERVAL '2 days'
ORDER BY o.delivered_at;

-- Test query: Show orders that are BLOCKED from completion (have active returns)
SELECT
  o.id,
  o.status,
  o.delivered_at,
  r.id as return_id,
  r.status as return_status,
  r.created_at as return_created_at
FROM orders o
INNER JOIN returns r ON r.order_id = o.id
WHERE
  o.status = 'delivered'
  AND o.delivered_at IS NOT NULL
  AND o.delivered_at <= NOW() - INTERVAL '2 days'
  AND r.status IN ('pending', 'approved')
ORDER BY o.delivered_at;
