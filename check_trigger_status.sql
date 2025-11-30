-- Quick check: Are triggers installed?
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'orders'
  AND trigger_name LIKE '%notification%'
ORDER BY trigger_name;

-- If above returns 0 rows, triggers are NOT installed!
-- Run fix_notification_triggers_safe.sql first
