-- =============================================
-- TABLE: order_items (order detail lines)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  produk_id UUID REFERENCES produk(id) ON DELETE SET NULL,
  nama_produk TEXT NOT NULL,
  size VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_produk ON order_items(produk_id);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies: user can access items of their own orders
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_items_update_own" ON order_items;
CREATE POLICY "order_items_update_own" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_items_delete_own" ON order_items;
CREATE POLICY "order_items_delete_own" ON order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

