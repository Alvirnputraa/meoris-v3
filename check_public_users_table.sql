-- Check if public.users table exists
SELECT
  'Table Exists?' as check,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'users'
  ) as table_exists;

-- If exists, show structure
SELECT
  'Table Structure' as check,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- If exists, show data
SELECT
  'Current Data' as check,
  *
FROM public.users
LIMIT 5;
