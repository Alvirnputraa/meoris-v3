-- =====================================================
-- FIX AUTO CANCEL NOTIFICATION MESSAGE
-- =====================================================
-- Purpose: Update the auto_cancel_pending_orders function
--          to include proper message format with payment deadline info
-- =====================================================

CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_order_record RECORD;
BEGIN
  -- Log start
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  -- Find pending orders older than 24 hours
  FOR v_order_record IN
    SELECT
      id,
      user_id,
      created_at,
      status
    FROM orders
    WHERE
      status IN ('pending', 'belum bayar')
      AND created_at < NOW() - INTERVAL '24 hours'
      AND created_at IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Update order status to cancelled
      UPDATE orders
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_order_record.id;

      -- Log the cancellation
      RAISE NOTICE '[AUTO-CANCEL] Cancelled order ID: %, User: %, Created: %, Old Status: %',
        v_order_record.id,
        v_order_record.user_id,
        v_order_record.created_at,
        v_order_record.status;

      -- Create notification for user with proper message format
      INSERT INTO notifications (
        user_id,
        order_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        v_order_record.user_id,
        v_order_record.id,
        'Pesanan dibatalkan',
        'Pesanan anda dengan id pesanan ' || v_order_record.id || ' telah dibatalkan karena telah melewati batas waktu pembayaran.',
        'order_cancelled',
        NOW()
      );

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other orders
      RAISE WARNING '[AUTO-CANCEL] Error cancelling order %: %', v_order_record.id, SQLERRM;
    END;
  END LOOP;

  -- Log completion
  RAISE NOTICE '[AUTO-CANCEL] Completed. Total orders cancelled: %', v_cancelled_count;

  -- Return count
  RETURN QUERY SELECT v_cancelled_count;
END;
$$;

-- Grant execute permission to authenticated users (for cron job)
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO service_role;
