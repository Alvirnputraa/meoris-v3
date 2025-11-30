-- =====================================================
-- UPDATE PAYMENT DEADLINE TO 10:15 WIB
-- =====================================================
-- Purpose: Update payment_expired_at untuk testing auto-cancel
-- Target: Checkout submission dengan payment_reference = DEV-T44456309234MLXPS
-- New deadline: 17 November 2025 pukul 10:15 WIB (03:15:00 UTC)
-- =====================================================

-- Update payment_expired_at to 10:15 WIB (03:15:00 UTC)
UPDATE checkout_submissions
SET
  payment_expired_at = '2025-11-17 03:15:00+00',
  updated_at = NOW()
WHERE
  payment_reference = 'DEV-T44456309234MLXPS'
  AND status = 'submitted';

-- Verify the update
SELECT
  id,
  payment_reference,
  status,
  payment_expired_at,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS payment_expired_at_wib,
  created_at,
  updated_at
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309234MLXPS';

-- Check current time for reference
SELECT
  NOW() AS current_time_utc,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_time_wib;
