-- =====================================================
-- MANUAL TEST AUTO-CANCEL
-- =====================================================
-- Jalankan ini SETELAH JAM 11:00 WIB
-- untuk test apakah auto-cancel berfungsi
-- =====================================================

-- 1. CEK STATUS SEBELUM AUTO-CANCEL
SELECT
  payment_reference,
  status AS status_before,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS expired_wib,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_wib,
  CASE
    WHEN payment_expired_at < NOW() THEN '✅ SUDAH EXPIRED'
    ELSE '❌ BELUM EXPIRED'
  END AS is_expired
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309244UZ9WI';

-- 2. MANUAL TRIGGER AUTO-CANCEL FUNCTION
SELECT * FROM auto_cancel_pending_orders();

-- 3. CEK STATUS SETELAH AUTO-CANCEL
SELECT
  payment_reference,
  status AS status_after,
  updated_at AT TIME ZONE 'Asia/Jakarta' AS updated_wib
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309244UZ9WI';

-- 4. CEK APAKAH NOTIFIKASI DIBUAT
SELECT
  title,
  message,
  type,
  created_at AT TIME ZONE 'Asia/Jakarta' AS created_wib
FROM notifications
WHERE message LIKE '%DEV-T44456309244UZ9WI%'
ORDER BY created_at DESC
LIMIT 3;
