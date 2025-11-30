-- =============================================
-- ALTER TABLE: voucher (add new columns)
-- =============================================
ALTER TABLE voucher
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'discount', -- 'discount' atau 'shipping'
ADD COLUMN IF NOT EXISTS max_claims INTEGER DEFAULT NULL, -- NULL = unlimited
ADD COLUMN IF NOT EXISTS current_claims INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimal_purchase DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT;

-- =============================================
-- CREATE TABLE: user_vouchers
-- =============================================
CREATE TABLE IF NOT EXISTS user_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES voucher(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, voucher_id) -- User tidak bisa claim voucher yang sama 2x
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON user_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_voucher_id ON user_vouchers(voucher_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_used ON user_vouchers(used);

-- =============================================
-- RLS (Row Level Security) Policy
-- =============================================
ALTER TABLE user_vouchers ENABLE ROW LEVEL SECURITY;

-- User hanya bisa melihat voucher miliknya sendiri
CREATE POLICY "Users can view their own vouchers" ON user_vouchers
    FOR SELECT USING (auth.uid() = user_id);

-- User bisa claim voucher (insert)
CREATE POLICY "Users can claim vouchers" ON user_vouchers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User bisa update voucher miliknya (untuk mark as used)
CREATE POLICY "Users can update their own vouchers" ON user_vouchers
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- Trigger untuk updated_at
-- =============================================
CREATE TRIGGER update_user_vouchers_updated_at BEFORE UPDATE ON user_vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Function untuk claim voucher
-- =============================================
CREATE OR REPLACE FUNCTION claim_voucher(
    p_user_id UUID,
    p_voucher_code VARCHAR
)
RETURNS JSON AS $$
DECLARE
    v_voucher_id UUID;
    v_max_claims INTEGER;
    v_current_claims INTEGER;
    v_expired TIMESTAMP WITH TIME ZONE;
    v_already_claimed BOOLEAN;
BEGIN
    -- Cek apakah voucher exist dan masih aktif
    SELECT id, max_claims, current_claims, expired
    INTO v_voucher_id, v_max_claims, v_current_claims, v_expired
    FROM voucher
    WHERE voucher = p_voucher_code;

    -- Voucher tidak ditemukan
    IF v_voucher_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Voucher tidak ditemukan');
    END IF;

    -- Cek apakah sudah expired
    IF v_expired < NOW() THEN
        RETURN json_build_object('success', false, 'message', 'Voucher sudah kadaluarsa');
    END IF;

    -- Cek apakah user sudah claim voucher ini
    SELECT EXISTS(
        SELECT 1 FROM user_vouchers
        WHERE user_id = p_user_id AND voucher_id = v_voucher_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RETURN json_build_object('success', false, 'message', 'Anda sudah claim voucher ini');
    END IF;

    -- Cek apakah masih ada slot claim
    IF v_max_claims IS NOT NULL AND v_current_claims >= v_max_claims THEN
        RETURN json_build_object('success', false, 'message', 'Voucher sudah habis');
    END IF;

    -- Claim voucher
    INSERT INTO user_vouchers (user_id, voucher_id)
    VALUES (p_user_id, v_voucher_id);

    -- Update current_claims
    UPDATE voucher
    SET current_claims = current_claims + 1
    WHERE id = v_voucher_id;

    RETURN json_build_object('success', true, 'message', 'Berhasil claim voucher');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Update sample data dengan kolom baru
-- =============================================
UPDATE voucher SET
    type = 'shipping',
    max_claims = 100,
    minimal_purchase = 0,
    description = 'Gratis ongkir hingga Rp7.000'
WHERE voucher = 'ONGKIR7K';

-- Jika voucher ONGKIR7K belum ada, insert
INSERT INTO voucher (voucher, total_potongan, expired, type, max_claims, minimal_purchase, description)
VALUES ('ONGKIR7K', 7000, NOW() + INTERVAL '30 days', 'shipping', 100, 0, 'Gratis ongkir hingga Rp7.000')
ON CONFLICT (voucher) DO NOTHING;

-- Voucher untuk beli 2 produk potongan 15K
INSERT INTO voucher (voucher, total_potongan, expired, type, max_claims, minimal_purchase, description)
VALUES ('15KLETSGO', 15000, NOW() + INTERVAL '30 days', 'discount', 100, 0, 'Potongan Rp15.000 untuk pembelian 2 produk atau lebih')
ON CONFLICT (voucher) DO NOTHING;

-- =============================================
-- USEFUL QUERIES
-- =============================================

-- Get user's claimed vouchers
-- SELECT v.*, uv.claimed_at, uv.used, uv.used_at
-- FROM user_vouchers uv
-- JOIN voucher v ON v.id = uv.voucher_id
-- WHERE uv.user_id = 'USER_ID_HERE'
-- AND v.expired > NOW()
-- ORDER BY uv.claimed_at DESC;

-- Get vouchers available to claim (not expired, not full, not claimed by user)
-- SELECT v.*
-- FROM voucher v
-- WHERE v.expired > NOW()
-- AND (v.max_claims IS NULL OR v.current_claims < v.max_claims)
-- AND NOT EXISTS (
--     SELECT 1 FROM user_vouchers uv
--     WHERE uv.voucher_id = v.id AND uv.user_id = 'USER_ID_HERE'
-- );
