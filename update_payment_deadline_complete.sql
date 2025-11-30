-- =====================================================
-- UPDATE PAYMENT DEADLINE TO 10:15 WIB (COMPLETE)
-- =====================================================
-- Purpose: Update semua field terkait payment deadline
-- Target: Checkout submission DEV-T44456309234MLXPS
-- New deadline: 17 November 2025 pukul 10:15 WIB
-- =====================================================

-- Step 1: Update payment_expired_at
UPDATE checkout_submissions
SET
  payment_expired_at = '2025-11-17 03:15:00+00',  -- 10:15 WIB = 03:15 UTC
  updated_at = NOW()
WHERE
  payment_reference = 'DEV-T44456309234MLXPS'
  AND status = 'submitted';

-- Step 2: Update expired_time in payment_details JSON
-- 2025-11-17 10:15:00 WIB = Unix timestamp: 1763355300
UPDATE checkout_submissions
SET
  payment_details = jsonb_set(
    payment_details::jsonb,
    '{expired_time}',
    '1763355300'::jsonb
  )
WHERE
  payment_reference = 'DEV-T44456309234MLXPS'
  AND status = 'submitted';

-- Step 3: Update expired_time in order_summary JSON (if exists)
UPDATE checkout_submissions
SET
  order_summary = jsonb_set(
    order_summary::jsonb,
    '{tripay,expired_time}',
    '1763355300'::jsonb
  )
WHERE
  payment_reference = 'DEV-T44456309234MLXPS'
  AND status = 'submitted'
  AND order_summary::jsonb ? 'tripay';

-- Verify the update
SELECT
  id,
  payment_reference,
  status,
  payment_expired_at,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS payment_expired_at_wib,
  payment_details->>'expired_time' AS expired_time_unix,
  to_timestamp((payment_details->>'expired_time')::bigint) AT TIME ZONE 'Asia/Jakarta' AS expired_time_wib,
  order_summary->'tripay'->>'expired_time' AS order_summary_expired_time,
  created_at,
  updated_at
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309234MLXPS';

-- Show current time for reference
SELECT
  NOW() AS current_time_utc,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_time_wib,
  EXTRACT(EPOCH FROM NOW())::bigint AS current_unix_timestamp;
