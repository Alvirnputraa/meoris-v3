-- =============================================
-- CREATE TABLE: voucher
-- =============================================
CREATE TABLE IF NOT EXISTS voucher (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher VARCHAR(100) UNIQUE NOT NULL, -- Kode voucher (e.g., 'DISKON20', 'WELCOME50')
    total_potongan DECIMAL(10,2) NOT NULL DEFAULT 0, -- Jumlah potongan dalam rupiah
    expired TIMESTAMP WITH TIME ZONE NOT NULL, -- Tanggal expired voucher
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_voucher_code ON voucher(voucher);
CREATE INDEX IF NOT EXISTS idx_voucher_expired ON voucher(expired);

-- =============================================
-- RLS (Row Level Security) Policy
-- =============================================
ALTER TABLE voucher ENABLE ROW LEVEL SECURITY;

-- Voucher dapat dilihat oleh semua user (untuk validasi voucher)
CREATE POLICY "Users can view active vouchers" ON voucher
    FOR SELECT USING (expired > NOW());

-- =============================================
-- Trigger untuk updated_at
-- =============================================
CREATE TRIGGER update_voucher_updated_at BEFORE UPDATE ON voucher
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - untuk testing)
-- =============================================
INSERT INTO voucher (voucher, total_potongan, expired) VALUES
    ('WELCOME10', 10000, NOW() + INTERVAL '30 days'),
    ('DISKON20', 20000, NOW() + INTERVAL '7 days'),
    ('SPECIAL50', 50000, NOW() + INTERVAL '14 days'),
    ('NEWYEAR25', 25000, NOW() + INTERVAL '60 days'),
    ('EXPIRED10', 10000, NOW() - INTERVAL '1 day'); -- Expired voucher for testing

-- =============================================
-- USEFUL QUERIES
-- =============================================

-- Get active vouchers
-- SELECT * FROM voucher WHERE expired > NOW() ORDER BY total_potongan DESC;

-- Get voucher by code
-- SELECT * FROM voucher WHERE voucher = 'WELCOME10' AND expired > NOW();

-- Get expired vouchers
-- SELECT * FROM voucher WHERE expired <= NOW();