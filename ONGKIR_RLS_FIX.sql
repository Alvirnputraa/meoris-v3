-- =============================================
-- COPY & PASTE QUERY INI KE SUPABASE SQL EDITOR
-- =============================================

-- 1. Enable RLS on ongkir table
ALTER TABLE public.ongkir ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (jika ada)
DROP POLICY IF EXISTS "Allow all users to read ongkir" ON public.ongkir;
DROP POLICY IF EXISTS "Allow authenticated read ongkir" ON public.ongkir;
DROP POLICY IF EXISTS "Allow anonymous read ongkir" ON public.ongkir;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ongkir;
DROP POLICY IF EXISTS "Allow all users to read ongkir data" ON public.ongkir;

-- 3. Create policy untuk memungkinkan SEMUA user (termasuk anonymous) read data ongkir
CREATE POLICY "ongkir_select_policy" 
ON public.ongkir 
FOR SELECT 
USING (true);

-- 4. Create policy untuk authenticated users bisa insert/update (opsional)
CREATE POLICY "ongkir_insert_policy" 
ON public.ongkir 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "ongkir_update_policy" 
ON public.ongkir 
FOR UPDATE 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 5. Verify policies dibuat
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'ongkir';

-- 6. Check RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity, 
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'ongkir';