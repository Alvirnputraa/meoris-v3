-- Function to automatically complete orders after 2 days of being delivered
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

  -- Log how many orders were updated (optional)
  RAISE NOTICE 'Auto-completed % orders', (SELECT COUNT(*)
    FROM orders
    WHERE status = 'completed'
    AND delivered_at IS NOT NULL
    AND delivered_at <= NOW() - INTERVAL '2 days');
END;
$$;

-- Grant execute permission to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION auto_complete_delivered_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_complete_delivered_orders() TO service_role;

COMMENT ON FUNCTION auto_complete_delivered_orders() IS 'Automatically completes orders that have been in delivered status for more than 2 days';
