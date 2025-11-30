-- =============================================
-- FIX RLS POLICY untuk shipping_history
-- =============================================

-- 1. Enable RLS
ALTER TABLE shipping_history ENABLE ROW LEVEL SECURITY;

-- 2. Drop semua policy lama
DROP POLICY IF EXISTS "Users can view their own shipping history" ON shipping_history;
DROP POLICY IF EXISTS "Users can view their own order shipping history" ON shipping_history;
DROP POLICY IF EXISTS "Service role can manage all shipping history" ON shipping_history;

-- 3. Buat policy baru untuk SELECT (authenticated users)
CREATE POLICY "authenticated_users_can_view_shipping_history"
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

-- 4. Buat policy untuk anon users (kalau mau support guest checkout)
CREATE POLICY "anon_users_can_view_shipping_history"
  ON shipping_history
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipping_history.order_id
    )
  );

-- 5. Service role bisa manage semua (untuk webhook)
CREATE POLICY "service_role_can_manage_shipping_history"
  ON shipping_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Verify policies
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shipping_history';
