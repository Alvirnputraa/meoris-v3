-- Verify all required tables and columns exist

-- 1. Check if used_vouchers table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'used_vouchers'
) as used_vouchers_exists;

-- 2. Check used_vouchers columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'used_vouchers'
ORDER BY ordinal_position;

-- 3. Check if voucher_code column exists in orders
SELECT EXISTS (
   SELECT FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'orders'
   AND column_name = 'voucher_code'
) as orders_voucher_code_exists;

-- 4. Check if voucher_code column exists in checkout_submissions
SELECT EXISTS (
   SELECT FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'checkout_submissions'
   AND column_name = 'voucher_code'
) as checkout_submissions_voucher_code_exists;

-- 5. Check RLS policies on used_vouchers
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'used_vouchers';

-- 6. Check if there are any constraints blocking inserts
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    tbl.relname AS table_name,
    ARRAY_AGG(col.attname ORDER BY u.attposition) AS columns
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
JOIN LATERAL UNNEST(con.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
JOIN pg_attribute col ON (col.attrelid = tbl.oid AND col.attnum = u.attnum)
WHERE tbl.relname = 'used_vouchers'
GROUP BY con.conname, con.contype, tbl.relname
ORDER BY constraint_type, constraint_name;
