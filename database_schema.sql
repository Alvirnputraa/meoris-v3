-- =============================================
-- MEORIS SANDAL - SUPABASE DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Store hashed passwords
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipping_nama VARCHAR(255),
    shipping_phone VARCHAR(30),
    shipping_street TEXT,
    shipping_kabupaten VARCHAR(255),
    shipping_kecamatan VARCHAR(255),
    shipping_kelurahan VARCHAR(255),
    shipping_provinsi VARCHAR(255),
    shipping_provinsi_id VARCHAR(32),
    shipping_kabupaten_id VARCHAR(32),
    shipping_kecamatan_id VARCHAR(32),
    shipping_kelurahan_id VARCHAR(32),
    shipping_postal_code VARCHAR(20),
    shipping_negara VARCHAR(100) DEFAULT 'Indonesia',
    shipping_address_json JSONB
);

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- TABLE: produk
-- =============================================
CREATE TABLE IF NOT EXISTS produk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_produk VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    size1 VARCHAR(50), -- Size options (e.g., "36", "S", etc.)
    size2 VARCHAR(50),
    size3 VARCHAR(50),
    size4 VARCHAR(50),
    size5 VARCHAR(50),
    photo1 TEXT, -- URL to product image 1
    photo2 TEXT, -- URL to product image 2
    photo3 TEXT, -- URL to product image 3
    harga DECIMAL(10,2) DEFAULT 0,
    stok INTEGER DEFAULT 0,
    kategori VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_produk_nama ON produk(nama_produk);
CREATE INDEX IF NOT EXISTS idx_produk_kategori ON produk(kategori);

-- =============================================
-- TABLE: keranjang (Shopping Cart)
-- =============================================
CREATE TABLE IF NOT EXISTS keranjang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    size VARCHAR(50), -- Selected size
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, produk_id, size) -- Prevent duplicate cart items
);

-- Create indexes for cart queries
CREATE INDEX IF NOT EXISTS idx_keranjang_user_id ON keranjang(user_id);
CREATE INDEX IF NOT EXISTS idx_keranjang_produk_id ON keranjang(produk_id);

-- =============================================
-- TABLE: favorit (Wishlist/Favorites)
-- =============================================
CREATE TABLE IF NOT EXISTS favorit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, produk_id) -- Prevent duplicate favorites
);

-- Create indexes for wishlist queries
CREATE INDEX IF NOT EXISTS idx_favorit_user_id ON favorit(user_id);
CREATE INDEX IF NOT EXISTS idx_favorit_produk_id ON favorit(produk_id);

-- =============================================
-- TABLE: orders (Optional - for order management)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
    shipping_address TEXT,
    payment_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE keranjang ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorit ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Cart policies
CREATE POLICY "Users can view own cart" ON keranjang
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON keranjang
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart" ON keranjang
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON keranjang
    FOR DELETE USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorit
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorit
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorit
    FOR DELETE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produk_updated_at BEFORE UPDATE ON produk
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keranjang_updated_at BEFORE UPDATE ON keranjang
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample user (password: 'password123' hashed)
-- INSERT INTO users (email, password, nama) VALUES
-- ('test@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User');

-- Insert sample products
-- INSERT INTO produk (nama_produk, deskripsi, size1, size2, size3, size4, size5, harga, stok, kategori) VALUES
-- ('Sandal Casual Hitam', 'Sandal santai untuk sehari-hari', '36', '37', '38', '39', '40', 150000, 50, 'casual'),
-- ('Sandal Formal Coklat', 'Sandal untuk acara formal', '38', '39', '40', '41', '42', 200000, 30, 'formal');

-- =============================================
-- USEFUL QUERIES
-- =============================================

-- Get user cart with product details
-- SELECT p.*, k.quantity, k.size
-- FROM keranjang k
-- JOIN produk p ON k.produk_id = p.id
-- WHERE k.user_id = 'user-uuid-here';

-- Get user favorites
-- SELECT p.*
-- FROM favorit f
-- JOIN produk p ON f.produk_id = p.id
-- WHERE f.user_id = 'user-uuid-here';

-- Get products by category
-- SELECT * FROM produk WHERE kategori = 'casual' ORDER BY created_at DESC;

-- Get low stock products
-- SELECT * FROM produk WHERE stok < 10 ORDER BY stok ASC;
