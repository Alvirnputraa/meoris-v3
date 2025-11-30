-- =====================================================
-- FINAL FIX - AUTO CANCEL WITH CORRECT NOTIFICATION MESSAGE
-- =====================================================
-- Fix: Notification message menggunakan Short Order ID (10 chars)
-- Format: "Pesanan anda dengan id pesanan 5ADCC76ED9 telah dibatalkan"
-- =====================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS auto_cancel_pending_orders();

-- Create the corrected function with proper notification message
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_checkout_record RECORD;
  v_short_order_id TEXT;
BEGIN
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  -- Find and cancel expired checkout_submissions
  FOR v_checkout_record IN
    SELECT
      id,
      user_id,
      payment_reference,
      payment_expired_at
    FROM checkout_submissions
    WHERE
      status = 'submitted'
      AND payment_expired_at IS NOT NULL
      AND payment_expired_at < NOW()
    ORDER BY payment_expired_at ASC
  LOOP
    BEGIN
      -- Generate short order ID (10 chars uppercase from UUID)
      v_short_order_id := UPPER(SUBSTRING(REPLACE(v_checkout_record.id::text, '-', ''), 1, 10));

      -- Update checkout status to cancelled
      UPDATE checkout_submissions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_checkout_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout: % (ID: %, expired at %)',
        v_checkout_record.payment_reference,
        v_short_order_id,
        v_checkout_record.payment_expired_at;

      -- Create notification with correct message format
      BEGIN
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          created_at
        ) VALUES (
          v_checkout_record.user_id,
          'Pesanan dibatalkan',
          'Pesanan anda dengan id pesanan ' || v_short_order_id || ' telah dibatalkan',
          'order_cancelled',
          NOW()
        );
      EXCEPTION WHEN foreign_key_violation THEN
        RAISE WARNING '[AUTO-CANCEL] Could not create notification for user %', v_checkout_record.user_id;
      WHEN OTHERS THEN
        RAISE WARNING '[AUTO-CANCEL] Notification error: %', SQLERRM;
      END;

      v_cancelled_count := v_cancelled_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[AUTO-CANCEL] Error cancelling checkout %: %', v_checkout_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[AUTO-CANCEL] Completed. Total cancelled: %', v_cancelled_count;

  RETURN QUERY SELECT v_cancelled_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO service_role;
GRANT EXECUTE ON FUNCTION auto_cancel_pending_orders() TO anon;

-- Test the function
-- Uncomment to test immediately:
-- SELECT * FROM auto_cancel_pending_orders();
