-- Check if ongkir table exists and has data
SELECT * FROM ongkir ORDER BY ekspedisi;

-- If table doesn't exist or is empty, run this:
-- CREATE TABLE IF NOT EXISTS ongkir (
--   id SERIAL PRIMARY KEY,
--   ekspedisi TEXT NOT NULL,
--   ongkir INTEGER NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- Insert default fallback rates (adjust prices as needed)
-- INSERT INTO ongkir (ekspedisi, ongkir) VALUES
--   ('J&T Express', 14000),
--   ('JNE', 15000),
--   ('SiCepat', 13000)
-- ON CONFLICT DO NOTHING;
