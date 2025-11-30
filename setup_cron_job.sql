-- Enable pg_cron extension (if not already enabled)
-- You need to enable this from Supabase Dashboard > Database > Extensions
-- Or run: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-complete function to run every hour
-- This will automatically move delivered orders to completed after 2 days
SELECT cron.schedule(
  'auto-complete-delivered-orders',  -- Job name
  '0 * * * *',                       -- Every hour at minute 0 (cron syntax)
  $$SELECT auto_complete_delivered_orders()$$
);

-- Alternative: Run every 6 hours
-- SELECT cron.schedule(
--   'auto-complete-delivered-orders',
--   '0 */6 * * *',
--   $$SELECT auto_complete_delivered_orders()$$
-- );

-- Alternative: Run once daily at midnight
-- SELECT cron.schedule(
--   'auto-complete-delivered-orders',
--   '0 0 * * *',
--   $$SELECT auto_complete_delivered_orders()$$
-- );

-- Check scheduled jobs
-- SELECT * FROM cron.job;

-- Unschedule job (if needed)
-- SELECT cron.unschedule('auto-complete-delivered-orders');
