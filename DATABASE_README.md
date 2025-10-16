# 🗄️ Meoris Sandal - Database Setup Guide

## 📋 Overview

Database schema dan setup untuk aplikasi Meoris Sandal menggunakan Supabase sebagai backend.

## 🏗️ Database Schema

### Tables Created:
- **`users`** - User accounts
- **`produk`** - Product catalog
- **`keranjang`** - Shopping cart
- **`favorit`** - User wishlist
- **`orders`** - Order management (optional)
- **`order_items`** - Order details (optional)

## 🚀 Setup Instructions

### 1. Create Supabase Project

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Click "New Project"**
3. **Fill in project details:**
   - Name: `meoris-sandal` (or your preferred name)
   - Database Password: Choose a secure password
   - Region: Choose closest to your users

### 2. Run Database Schema

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy and paste** the entire content from `database_schema.sql`
3. **Click "Run"** to execute the schema

### 3. Configure Environment Variables

1. **Copy `.env.local`** to `.env.local`
2. **Update the following variables:**

```env
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 5. Test Connection

```bash
npm run dev
```

Visit `http://localhost:3000` to test if everything is working.

## 📊 Database Tables Detail

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Address Fields (migration)

Tambahkan kolom alamat default ke tabel `users` untuk menyimpan alamat pengiriman pengguna. Migration tersedia di `alter_users_add_address_cols.sql`.

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shipping_nama VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS shipping_street TEXT,
  ADD COLUMN IF NOT EXISTS shipping_kecamatan VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_provinsi VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_negara VARCHAR(100) DEFAULT 'Indonesia',
  ADD COLUMN IF NOT EXISTS shipping_address_json JSONB;
```

### Produk Table
```sql
CREATE TABLE produk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_produk VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    size1 VARCHAR(50), size2 VARCHAR(50), size3 VARCHAR(50),
    size4 VARCHAR(50), size5 VARCHAR(50),
    photo1 TEXT, photo2 TEXT, photo3 TEXT,
    harga DECIMAL(10,2) DEFAULT 0,
    stok INTEGER DEFAULT 0,
    kategori VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Keranjang Table
```sql
CREATE TABLE keranjang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    size VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Favorit Table
```sql
CREATE TABLE favorit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Usage Examples

### Using Database Functions

```typescript
import { userDb, produkDb, keranjangDb, favoritDb } from '@/lib/database'

// Create user
const newUser = await userDb.create('user@example.com', 'hashed_password', 'John Doe')

// Get products
const products = await produkDb.getAll()

// Add to cart
const cartItem = await keranjangDb.addItem(userId, productId, 1, '40')

// Add to favorites
const favorite = await favoritDb.add(userId, productId)
```

### Direct Supabase Queries

```typescript
import { supabase } from '@/lib/supabase'

// Get user cart with product details
const { data, error } = await supabase
  .from('keranjang')
  .select(`
    *,
    produk:produk_id (
      id,
      nama_produk,
      photo1,
      harga
    )
  `)
  .eq('user_id', userId)
```

## 🔐 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Policies** ensure users can only access their own data
- **UUID primary keys** for security
- **Indexes** for optimal query performance

## 📝 Sample Data (Optional)

You can add sample data by uncommenting the INSERT statements in `database_schema.sql`:

```sql
-- Sample user
INSERT INTO users (email, password, nama) VALUES
('test@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User');

-- Sample products
INSERT INTO produk (nama_produk, deskripsi, size1, size2, size3, size4, size5, harga, stok, kategori) VALUES
('Sandal Casual Hitam', 'Sandal santai untuk sehari-hari', '36', '37', '38', '39', '40', 150000, 50, 'casual');
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"Invalid key type"** - Check if your reCAPTCHA keys are for the correct domain
2. **Connection errors** - Verify your Supabase URL and keys in `.env.local`
3. **Permission errors** - Ensure RLS policies are set correctly
4. **Type errors** - Make sure all required dependencies are installed

### Debug Commands:

```bash
# Check Supabase connection
npm run dev

# View database tables in Supabase dashboard
# Go to Table Editor in your Supabase project

# Check logs
# Go to Logs in your Supabase project
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🎯 Next Steps

1. **Test the database connection**
2. **Add sample products** via Supabase dashboard or API
3. **Implement authentication** in your Next.js app
4. **Connect cart and favorites** functionality
5. **Add order management** if needed

---

**Happy coding! 🚀**
