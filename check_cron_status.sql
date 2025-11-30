-- =====================================================
-- CHECK CRON JOB STATUS
-- =====================================================
-- Jalankan ini untuk cek apakah cron job berfungsi
-- =====================================================

-- 1. CEK ORDERS YANG DI-CANCEL HARI INI
SELECT
  payment_reference,
  status,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS expired_wib,
  updated_at AT TIME ZONE 'Asia/Jakarta' AS cancelled_at_wib,
  EXTRACT(EPOCH FROM (updated_at - payment_expired_at))/60 AS delay_minutes
FROM checkout_submissions
WHERE
  status = 'cancelled'
  AND updated_at >= CURRENT_DATE AT TIME ZONE 'Asia/Jakarta'
ORDER BY updated_at DESC;

-- 2. CEK PENDING ORDERS YANG SUDAH EXPIRED (HARUSNYA DI-CANCEL)
SELECT
  payment_reference,
  status,
  payment_expired_at AT TIME ZONE 'Asia/Jakarta' AS expired_wib,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_wib,
  EXTRACT(EPOCH FROM (NOW() - payment_expired_at))/60 AS overdue_minutes,
  CASE
    WHEN payment_expired_at < NOW() THEN '⚠️ SHOULD BE CANCELLED!'
    ELSE '✅ NOT EXPIRED YET'
  END AS alert
FROM checkout_submissions
WHERE
  status = 'submitted'
  AND payment_expired_at < NOW()
ORDER BY payment_expired_at ASC;

-- 3. CEK NOTIFICATIONS YANG DIBUAT HARI INI
SELECT
  title,
  message,
  type,
  created_at AT TIME ZONE 'Asia/Jakarta' AS created_wib
FROM notifications
WHERE
  type = 'order_cancelled'
  AND created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Jakarta'
ORDER BY created_at DESC;

-- 4. SUMMARY STATS
SELECT
  COUNT(*) FILTER (WHERE status = 'cancelled' AND updated_at >= CURRENT_DATE) AS cancelled_today,
  COUNT(*) FILTER (WHERE status = 'submitted' AND payment_expired_at < NOW()) AS overdue_pending,
  COUNT(*) FILTER (WHERE status = 'submitted' AND payment_expired_at >= NOW()) AS active_pending
FROM checkout_submissions;

-- 5. CEK WAKTU SEKARANG
SELECT
  NOW() AT TIME ZONE 'UTC' AS current_utc,
  NOW() AT TIME ZONE 'Asia/Jakarta' AS current_wib,
  EXTRACT(EPOCH FROM NOW())::bigint AS unix_timestamp;
