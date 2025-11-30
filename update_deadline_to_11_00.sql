-- =====================================================
-- UPDATE PAYMENT DEADLINE TO 11:00 WIB
-- =====================================================
-- Purpose: Update payment deadline untuk testing auto-cancel
-- Target: DEV-T44456309244UZ9WI
-- New deadline: 17 November 2025 pukul 11:00 WIB
-- =====================================================

-- Step 1: Update payment_expired_at
UPDATE checkout_submissions
SET
  payment_expired_at = '2025-11-17 04:00:00+00',  -- 11:00 WIB = 04:00 UTC
  updated_at = NOW()
WHERE
  payment_reference = 'DEV-T44456309244UZ9WI'
  AND status = 'submitted';

-- Step 2: Update expired_time in payment_details JSON
-- 2025-11-17 11:00:00 WIB = Unix timestamp: 1763358000
UPDATE checkout_submissions
SET
  payment_details = jsonb_set(
    payment_details::jsonb,
    '{expired_time}',
    '1763358000'::jsonb
  )
WHERE
  payment_reference = 'DEV-T44456309244UZ9WI'
  AND status = 'submitted';

-- Step 3: Update expired_time in order_summary JSON
UPDATE checkout_submissions
SET
  order_summary = jsonb_set(
    order_summary::jsonb,
    '{tripay,expired_time}',
    '1763358000'::jsonb
  )
WHERE
  payment_reference = 'DEV-T44456309244UZ9WI'
  AND status = 'submitted'
  AND order_summary::jsonb ? 'tripay';

-- =====================================================
-- VERIFY UPDATE
-- =====================================================
SELECT
  id,
  payment_reference,
  status,
  payment_expired_at,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS expired_wib,
  payment_details->>'expired_time' AS expired_unix,
  to_timestamp((payment_details->>'expired_time')::bigint) AT TIME ZONE 'Asia/Jakarta' AS expired_time_wib,
  NOW() AS current_utc,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_wib,
  CASE
    WHEN payment_expired_at < NOW() THEN '⏰ SUDAH EXPIRED - SIAP DI-CANCEL'
    ELSE '⏳ BELUM EXPIRED'
  END AS status_expired
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309244UZ9WI';
