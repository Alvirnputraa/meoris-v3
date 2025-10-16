-- =============================================
-- FIX ONGKIR RLS POLICIES
-- =============================================

-- 1. Enable RLS on ongkir table (if not already enabled)
ALTER TABLE ongkir ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow all users to read ongkir" ON ongkir;
DROP POLICY IF EXISTS "Allow authenticated read ongkir" ON ongkir;
DROP POLICY IF EXISTS "Allow anonymous read ongkir" ON ongkir;
DROP POLICY IF EXISTS "Enable read access for all users" ON ongkir;

-- 3. Create new policy to allow ALL users (authenticated + anonymous) to read ongkir data
CREATE POLICY "Allow all users to read ongkir data" 
ON ongkir 
FOR SELECT 
TO authenticated, anon
USING (true);

-- 4. Optional: Allow authenticated users to insert/update ongkir (for admin purposes)
CREATE POLICY "Allow authenticated users to insert ongkir" 
ON ongkir 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ongkir" 
ON ongkir 
FOR UPDATE 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 5. Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'ongkir';

-- 6. Check current RLS status
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'ongkir';