-- =============================================
-- TABEL PRA-CHECKOUT - MEORIS SANDAL
-- =============================================

-- =============================================
-- TABLE: pra_checkout (Header pesanan sementara)
-- =============================================
CREATE TABLE IF NOT EXISTS pra_checkout (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    voucher_code VARCHAR(50), -- Kode voucher yang digunakan
    discount_amount DECIMAL(10,2) DEFAULT 0, -- Potongan voucher
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, completed, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: pra_checkout_items (Detail produk dalam pesanan)
-- =============================================
CREATE TABLE IF NOT EXISTS pra_checkout_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pra_checkout_id UUID REFERENCES pra_checkout(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    size VARCHAR(50), -- Ukuran yang dipilih
    harga_satuan DECIMAL(10,2) NOT NULL, -- Harga pada saat checkout
    subtotal_item DECIMAL(10,2) NOT NULL, -- quantity * harga_satuan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_pra_checkout_user_id ON pra_checkout(user_id);
CREATE INDEX IF NOT EXISTS idx_pra_checkout_status ON pra_checkout(status);
CREATE INDEX IF NOT EXISTS idx_pra_checkout_items_pra_checkout_id ON pra_checkout_items(pra_checkout_id);
CREATE INDEX IF NOT EXISTS idx_pra_checkout_items_produk_id ON pra_checkout_items(produk_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on pra-checkout tables
ALTER TABLE pra_checkout ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_checkout_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own pra-checkout data
CREATE POLICY "Users can view own pra_checkout" ON pra_checkout
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pra_checkout" ON pra_checkout
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pra_checkout" ON pra_checkout
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pra_checkout" ON pra_checkout
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only access pra_checkout_items through their own pra_checkout
CREATE POLICY "Users can view own pra_checkout_items" ON pra_checkout_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND pra_checkout.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own pra_checkout_items" ON pra_checkout_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND pra_checkout.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own pra_checkout_items" ON pra_checkout_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND pra_checkout.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own pra_checkout_items" ON pra_checkout_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pra_checkout 
            WHERE pra_checkout.id = pra_checkout_items.pra_checkout_id 
            AND pra_checkout.user_id = auth.uid()
        )
    );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger untuk pra_checkout
CREATE TRIGGER update_pra_checkout_updated_at BEFORE UPDATE ON pra_checkout
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();