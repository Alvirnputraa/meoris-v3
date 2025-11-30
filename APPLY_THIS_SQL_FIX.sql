
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
  RAISE NOTICE '[AUTO-CANCEL] Starting auto-cancel job at %', NOW();

  -- Cancel expired checkout_submissions
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
      status = 'submitted'
      AND payment_expired_at IS NOT NULL
      AND payment_expired_at < NOW()
    ORDER BY payment_expired_at ASC
  LOOP
    BEGIN
      UPDATE checkout_submissions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_checkout_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled checkout ID: %, Ref: %, User: %, Expired at: %',
        v_checkout_record.id,
        v_checkout_record.payment_reference,
        v_checkout_record.user_id,
        v_checkout_record.payment_expired_at;

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
      RAISE WARNING '[AUTO-CANCEL] Error cancelling checkout %: %', v_checkout_record.id, SQLERRM;
    END;
  END LOOP;

  -- Backward compatibility: Cancel old orders in orders table
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
      UPDATE orders
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_order_record.id;

      RAISE NOTICE '[AUTO-CANCEL] Cancelled order ID: %, User: %, Created: %, Old Status: %',
        v_order_record.id,
        v_order_record.user_id,
        v_order_record.created_at,
        v_order_record.status;

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
      RAISE WARNING '[AUTO-CANCEL] Error cancelling order %: %', v_order_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[AUTO-CANCEL] Completed. Total cancelled: %', v_cancelled_count;

  RETURN QUERY SELECT v_cancelled_count;
END;
$$;
