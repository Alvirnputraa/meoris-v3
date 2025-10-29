-- =============================================
-- CREATE TABLE: homepage_section2_deals
-- =============================================

-- Table untuk menyimpan data deals yang ditampilkan di Section 2 homepage
-- Mengambil data produk dari tabel produk (photo1, harga) dan menambahkan harga diskon

CREATE TABLE IF NOT EXISTS homepage_section2_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  
  -- Harga diskon (opsional, jika NULL maka tidak ada diskon)
  harga_diskon NUMERIC(12, 2),
  
  -- Urutan tampilan (untuk sorting)
  urutan_tampilan INTEGER NOT NULL DEFAULT 1,
  
  -- Status aktif/non-aktif
  is_active BOOLEAN DEFAULT true,
  
  -- Waktu tayang (opsional)
  mulai_tayang TIMESTAMP WITH TIME ZONE,
  selesai_tayang TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX idx_homepage_section2_deals_produk_id ON homepage_section2_deals(produk_id);
CREATE INDEX idx_homepage_section2_deals_active ON homepage_section2_deals(is_active);
CREATE INDEX idx_homepage_section2_deals_urutan ON homepage_section2_deals(urutan_tampilan);

-- RLS (Row Level Security) - enable jika diperlukan
-- ALTER TABLE homepage_section2_deals ENABLE ROW LEVEL SECURITY;

-- Policy untuk membolehkan read access ke semua user (anon)
-- CREATE POLICY "Allow anonymous read access to active deals" ON homepage_section2_deals
--   FOR SELECT USING (is_active = true);

-- Policy untuk admin access (jika diperlukan)
-- CREATE POLICY "Allow full access to authenticated users" ON homepage_section2_deals
--   FOR ALL USING (auth.role() = 'authenticated');

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_homepage_section2_deals_updated_at 
  BEFORE UPDATE ON homepage_section2_deals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();