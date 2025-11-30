-- Function to automatically cancel expired return requests and complete the order
CREATE OR REPLACE FUNCTION auto_cancel_expired_returns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Find and process returns that are approved but no shipping arranged after 2 days
  WITH expired_returns AS (
    SELECT
      r.id as return_id,
      r.order_id,
      r.order_number,
      r.user_id,
      r.approved_at
    FROM returns r
    WHERE
      r.status = 'approved'
      AND r.approved_at IS NOT NULL
      AND r.approved_at <= NOW() - INTERVAL '2 days'
      AND r.return_waybill IS NULL -- No shipping arranged yet
  )
  UPDATE returns
  SET
    status = 'expired',
    notes = CONCAT(
      COALESCE(notes, ''),
      E'\n[AUTO-CANCELLED] Return expired - No shipping arranged within 2 days deadline. Cancelled at: ',
      NOW()
    ),
    updated_at = NOW()
  FROM expired_returns
  WHERE returns.id = expired_returns.return_id;

  -- Get count of expired returns
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Auto-complete orders for expired returns
  IF expired_count > 0 THEN
    UPDATE orders o
    SET
      status = 'completed',
      updated_at = NOW()
    FROM returns r
    WHERE
      o.id = r.order_id
      AND r.status = 'expired'
      AND r.approved_at IS NOT NULL
      AND r.approved_at <= NOW() - INTERVAL '2 days'
      AND o.status != 'completed';

    RAISE NOTICE 'Auto-cancelled % expired return requests and completed their orders', expired_count;
  ELSE
    RAISE NOTICE 'No expired return requests found';
  END IF;

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_cancel_expired_returns() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_expired_returns() TO service_role;

COMMENT ON FUNCTION auto_cancel_expired_returns() IS 'Automatically cancels return requests that have been approved for more than 2 days without shipping arrangement, and completes the order';
