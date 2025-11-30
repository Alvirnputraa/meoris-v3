-- =============================================
-- CREATE: Supabase Storage Bucket for Returns
-- =============================================

-- Create the 'returns' bucket for storing return request photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('returns', 'returns', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the 'returns' bucket
-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload return photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'returns');

-- Policy 2: Allow public read access to return photos
CREATE POLICY "Public can view return photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'returns');

-- Policy 3: Allow users to update their own return photos
CREATE POLICY "Users can update their own return photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'returns');

-- Policy 4: Allow users to delete their own return photos
CREATE POLICY "Users can delete their own return photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'returns');

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS 'Storage buckets - returns bucket stores photos for return requests';
