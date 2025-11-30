-- =============================================
-- FIX RLS POLICIES FOR ORDERS + ORDER_ITEMS
-- Context: client uses custom sessionStorage auth (not Supabase Auth),
-- so auth.uid() is NULL on the client. Enable permissive access so
-- the client can read orders created by the Tripay callback.
-- =============================================

-- Drop existing orders policies (if any)
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "Allow all for orders" ON orders;

-- EITHER: disable RLS during development
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- OR: keep RLS enabled but allow all (uncomment to use this approach)
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------
-- order_items: drop policies and relax access similarly
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_update_own" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_own" ON order_items;
DROP POLICY IF EXISTS "Allow all for order_items" ON order_items;

-- EITHER: disable RLS during development
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- OR: keep RLS enabled but allow all (uncomment to use this approach)
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Note: Remember to re-tighten these policies when you switch
-- to real Supabase Auth or add a secure server API proxy.

