-- =============================================
-- FIX RLS POLICY: shipping_history
-- =============================================
-- Problem: User tidak bisa SELECT shipping_history karena RLS policy
-- Solution: Buat policy yang benar untuk SELECT

-- 1. Drop policy lama yang mungkin salah
DROP POLICY IF EXISTS "Users can view their own shipping history" ON shipping_history;

-- 2. Buat policy baru yang benar
-- User bisa SELECT shipping_history untuk order yang mereka miliki
CREATE POLICY "Users can view their own order shipping history"
  ON shipping_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipping_history.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 3. Pastikan authenticated users bisa SELECT
-- (Optional: Kalau mau lebih permisif, bisa pakai anon juga)
-- CREATE POLICY "Anon can view shipping history"
--   ON shipping_history
--   FOR SELECT
--   TO anon
--   USING (true);

-- 4. Verify policy
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shipping_history';
