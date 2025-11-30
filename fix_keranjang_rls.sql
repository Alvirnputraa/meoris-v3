-- =============================================
-- FIX RLS POLICIES FOR KERANJANG TABLE
-- =============================================

-- Drop existing keranjang policies
DROP POLICY IF EXISTS "Users can view own cart" ON keranjang;
DROP POLICY IF EXISTS "Users can insert own cart items" ON keranjang;
DROP POLICY IF EXISTS "Users can update own cart" ON keranjang;
DROP POLICY IF EXISTS "Users can delete own cart items" ON keranjang;
DROP POLICY IF EXISTS "Service role full access keranjang" ON keranjang;

-- Disable RLS for keranjang table to work with localStorage auth
ALTER TABLE keranjang DISABLE ROW LEVEL SECURITY;

-- Also disable RLS for produk table to ensure product queries work
ALTER TABLE produk DISABLE ROW LEVEL SECURITY;