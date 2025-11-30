-- ===== FIX: Check and Fix Foreign Key Constraint =====

-- 1. Check current foreign key constraint
SELECT
  'Current FK Constraint' as check,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.notifications'::regclass
  AND contype = 'f'; -- foreign key

-- The constraint should reference auth.users(id), not public.users!

-- 2. If FK references wrong table, drop and recreate
-- Drop existing FK constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Recreate FK pointing to correct table (auth.users)
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Verify new constraint
SELECT
  'New FK Constraint' as check,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.notifications'::regclass
  AND contype = 'f';

-- 4. Test insert with valid user
WITH valid_user AS (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
),
valid_order AS (
  SELECT id, user_id FROM public.orders WHERE status = 'paid' ORDER BY created_at DESC LIMIT 1
)
INSERT INTO public.notifications (user_id, order_id, type, title, message)
SELECT
  o.user_id,
  o.id,
  'payment_success',
  'Test Notification',
  'Testing if FK is fixed'
FROM valid_order o
WHERE o.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id)
  AND NOT EXISTS (SELECT 1 FROM notifications WHERE order_id = o.id AND type = 'payment_success')
RETURNING *;

-- 5. Verify notification was created
SELECT
  'Verification' as step,
  n.*,
  u.email
FROM public.notifications n
JOIN auth.users u ON u.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 1;
