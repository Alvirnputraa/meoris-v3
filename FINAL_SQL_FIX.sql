-- =====================================================
-- FINAL FIX - AUTO CANCEL PENDING ORDERS
-- =====================================================
-- Copy ENTIRE contents of this file and paste into Supabase SQL Editor
-- Then click RUN
-- =====================================================

-- Drop existing function first (to ensure clean update)
DROP FUNCTION IF EXISTS auto_cancel_pending_orders();

-- Create the corrected function
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
  v_checkout_record RECORD;
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
      -- Update checkout status to cancelled
      UPDATE checkout_submissions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_checkout_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout: % (expired at %)',
        v_checkout_record.payment_reference,
        v_checkout_record.payment_expired_at;

      -- Try to create notification (ignore if fails due to foreign key)
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
          'Pesanan dengan nomor ' || COALESCE(v_checkout_record.payment_reference, v_checkout_record.id::text) || ' telah dibatalkan karena melewati batas waktu pembayaran.',
          'order_cancelled',
          NOW()
        );
      EXCEPTION WHEN foreign_key_violation THEN
        RAISE WARNING '[AUTO-CANCEL] Could not create notification for user %', v_checkout_record.user_id;
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

-- Test the function immediately
SELECT * FROM auto_cancel_pending_orders();

-- Expected output: cancelled_count should be > 0 if there are expired orders
