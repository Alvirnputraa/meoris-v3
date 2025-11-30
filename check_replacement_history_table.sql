-- Check if return_replacement_history table exists
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'return_replacement_history';

-- Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'return_replacement_history'
ORDER BY ordinal_position;

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'return_replacement_history';

-- Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'return_replacement_history';
