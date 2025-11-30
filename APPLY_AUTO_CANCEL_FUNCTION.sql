-- =====================================================
-- APPLY AUTO CANCEL FUNCTION (CLEAN VERSION)
-- =====================================================
-- Drop existing function first (clean slate)
-- Then create new one
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS auto_cancel_pending_orders();

-- Create fresh function
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_checkout_record RECORD;
  v_order_record RECORD;
BEGIN
  -- Log start
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  -- ========================================
  -- PART 1: Cancel expired checkout_submissions
  -- ========================================
  RAISE NOTICE '[AUTO-CANCEL] Checking checkout_submissions...';

  FOR v_checkout_record IN
    SELECT
      id,
      user_id,
      payment_reference,
      created_at,
      payment_expired_at,
      status
    FROM checkout_submissions
    WHERE
      status = 'submitted'  -- Only submitted (pending payment) checkouts
      AND payment_expired_at IS NOT NULL
      AND payment_expired_at < NOW()  -- Use payment_expired_at instead of created_at + 24h
    ORDER BY payment_expired_at ASC
  LOOP
    BEGIN
      RAISE NOTICE '[AUTO-CANCEL] Found expired checkout: %', v_checkout_record.payment_reference;

      -- Update checkout status to cancelled
      UPDATE checkout_submissions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_checkout_record.id;

      -- Log the cancellation
      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout ID: %, Ref: %, User: %, Expired at: %',
        v_checkout_record.id,
        v_checkout_record.payment_reference,
        v_checkout_record.user_id,
        v_checkout_record.payment_expired_at;

      -- Create notification for user
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        created_at
      ) VALUES (
        v_checkout_record.user_id,
        'Pesanan dibatalkan',
        'Pesanan dengan nomor ' || COALESCE(v_checkout_record.payment_reference, v_checkout_record.id::text) || ' telah dibatalkan karena melewati batas waktu pembayaran.',
        'order_cancelled',
        NOW()
      );

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other checkouts
      RAISE WARNING '[AUTO-CANCEL] Error cancelling checkout %: %', v_checkout_record.id, SQLERRM;
    END;
  END LOOP;

  -- ========================================
  -- PART 2: Cancel old orders in orders table (backward compatibility)
  -- ========================================
  RAISE NOTICE '[AUTO-CANCEL] Checking orders table...';

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

      -- Create notification for user
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
        'Pesanan anda telah dibatalkan karena melewati batas waktu pembayaran.',
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
  RAISE NOTICE '[AUTO-CANCEL] Completed. Total cancelled: %', v_cancelled_count;

  -- Return count
  RETURN QUERY SELECT v_cancelled_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO service_role;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO anon;

-- Test the function
SELECT * FROM auto_cancel_pending_orders();

-- Verify it worked
SELECT
  payment_reference,
  status,
  updated_at AT TIME ZONE 'Asia/Jakarta' AS updated_wib
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309272FBIO4';
