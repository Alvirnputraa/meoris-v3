-- =============================================
-- FIX RLS untuk discount_percentage
-- =============================================

-- Drop existing policies jika ada
DROP POLICY IF EXISTS "Allow anonymous read access to active deals" ON homepage_section2_deals;

-- Buat policy baru yang termasuk kolom discount_percentage
CREATE POLICY "Allow anonymous read access to active deals" ON homepage_section2_deals
  FOR SELECT USING (is_active = true);

-- Pastikan RLS enabled
ALTER TABLE homepage_section2_deals ENABLE ROW LEVEL SECURITY;

-- Policy untuk authenticated users (jika diperlukan)
CREATE POLICY "Allow full access to authenticated users" ON homepage_section2_deals
  FOR ALL USING (auth.role() = 'authenticated');

-- Test query untuk memastikan kolom discount_percentage terbaca
SELECT 
  id,
  produk_id,
  harga_diskon,
  discount_percentage,
  urutan_tampilan,
  is_active
FROM homepage_section2_deals 
WHERE is_active = true
LIMIT 5;