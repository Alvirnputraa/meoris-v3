-- ===== CHECK IF TRIGGER IS ENABLED =====

-- 1. Check trigger status (enabled/disabled)
SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE 'UNKNOWN: ' || t.tgenabled
  END as status,
  t.tgtype as trigger_type,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders'
  AND t.tgname LIKE '%notification%'
  AND NOT t.tgisinternal;

-- 2. Check if there are any other triggers on orders table
SELECT
  'All Triggers on Orders Table' as check,
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    ELSE tgenabled::text
  END as status
FROM pg_trigger
WHERE tgrelid = 'public.orders'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- 3. Test the trigger function directly
DO $$
DECLARE
  test_order_id uuid;
  test_user_id uuid;
BEGIN
  -- Get a valid user
  SELECT id INTO test_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;

  RAISE NOTICE 'Testing trigger function with user_id: %', test_user_id;

  -- Create a test order to trigger the function
  INSERT INTO public.orders (
    user_id,
    order_number,
    total_amount,
    status,
    payment_method
  ) VALUES (
    test_user_id,
    'TEST-ORDER-' || EXTRACT(EPOCH FROM NOW())::text,
    100000,
    'paid',
    'TEST'
  ) RETURNING id INTO test_order_id;

  RAISE NOTICE 'Test order created: %', test_order_id;

  -- Check if notification was created
  IF EXISTS (SELECT 1 FROM notifications WHERE order_id = test_order_id) THEN
    RAISE NOTICE '✅ SUCCESS! Trigger worked! Notification was created.';
  ELSE
    RAISE WARNING '❌ FAILED! Trigger did not create notification.';
  END IF;

  -- Cleanup test order and notification
  DELETE FROM notifications WHERE order_id = test_order_id;
  DELETE FROM orders WHERE id = test_order_id;

  RAISE NOTICE 'Test cleanup complete';
END $$;
