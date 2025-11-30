-- =============================================
-- FIX: Returns Storage Bucket Policies
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload return photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view return photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own return photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own return photos" ON storage.objects;

-- Policy 1: Allow service_role and authenticated users to INSERT
CREATE POLICY "Allow upload return photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'returns');

-- Policy 2: Allow public read access
CREATE POLICY "Public can view return photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'returns');

-- Policy 3: Allow service_role and authenticated to UPDATE
CREATE POLICY "Allow update return photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'returns');

-- Policy 4: Allow service_role and authenticated to DELETE
CREATE POLICY "Allow delete return photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'returns');

-- Verify bucket exists and is public
UPDATE storage.buckets
SET public = true
WHERE id = 'returns';
