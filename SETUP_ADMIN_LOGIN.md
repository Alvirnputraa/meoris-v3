# Setup Admin Login - MEORIS

Panduan lengkap untuk setup sistem login admin menggunakan Supabase Auth.

## 📋 Prerequisites

- Akses ke Supabase Dashboard
- Database sudah terkoneksi
- Sudah setup Supabase client di aplikasi

## 🚀 Langkah-Langkah Setup

### Step 1: Buat Tabel `admin_users`

Jalankan query SQL berikut di Supabase SQL Editor:

```sql
-- File: create_admin_users_table.sql
```

Atau bisa langsung jalankan file `create_admin_users_table.sql` yang sudah disediakan.

Query ini akan:
- Membuat tabel `public.admin_users`
- Setup Row Level Security (RLS)
- Membuat indexes untuk performa
- Setup policies untuk keamanan

### Step 2: Buat Akun Admin di Supabase Auth

#### Cara 1: Menggunakan Supabase Dashboard (RECOMMENDED)

1. Buka **Supabase Dashboard** project Anda
2. Pergi ke menu **Authentication** > **Users**
3. Klik tombol **"Add User"** atau **"Invite User"**
4. Isi form dengan data:
   - **Email**: `admin@erdanpee.com`
   - **Password**: `123456`
   - **Auto Confirm User**: Centang (agar tidak perlu verifikasi email)
5. Klik **"Create User"**
6. Copy **User ID (UUID)** dari user yang baru dibuat

### Step 3: Insert Data Admin ke Tabel `admin_users`

Setelah membuat user di Supabase Auth, jalankan query berikut:

```sql
-- Insert admin data ke tabel admin_users
INSERT INTO public.admin_users (id, email, nama, role, is_active)
SELECT
  id,
  email,
  'Admin Erdanpee',
  'super_admin',
  TRUE
FROM auth.users
WHERE email = 'admin@erdanpee.com'
ON CONFLICT (id) DO NOTHING;
```

Query ini akan:
- Mengambil user ID dari `auth.users` berdasarkan email
- Insert data admin ke tabel `admin_users`
- Jika sudah ada, tidak akan insert ulang (ON CONFLICT)

### Step 4: Verifikasi Setup

Cek apakah admin user sudah berhasil dibuat:

```sql
-- Cek data admin
SELECT
  au.id,
  au.email,
  au.nama,
  au.role,
  au.is_active,
  au.created_at,
  u.email as auth_email
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.id
WHERE au.email = 'admin@erdanpee.com';
```

Hasil yang diharapkan:
- Ada 1 row data
- `is_active` = true
- `role` = 'super_admin'
- `auth_email` sama dengan email di `admin_users`

## 🔐 Cara Login

1. Buka browser dan akses: `http://localhost:3000/admin/login`
2. Masukkan kredensial:
   - **Email**: `admin@erdanpee.com`
   - **Password**: `123456`
3. Klik **"Masuk"**
4. Jika berhasil, akan redirect ke `/admin` (Dashboard Admin)

## 🛡️ Keamanan

Sistem login admin menggunakan multi-layer security:

1. **Supabase Auth**: Verifikasi email & password
2. **Admin Check**: Memastikan user ada di tabel `admin_users`
3. **Active Status**: Cek apakah admin masih aktif
4. **RLS Policies**: Row Level Security untuk proteksi data
5. **Session Management**: Token dan session tersimpan dengan aman

## 🔧 Troubleshooting

### Error: "Anda tidak memiliki akses admin"

**Penyebab**: User berhasil login ke Supabase Auth, tapi tidak ada di tabel `admin_users`

**Solusi**:
```sql
-- Jalankan query insert admin (Step 3)
INSERT INTO public.admin_users (id, email, nama, role, is_active)
SELECT id, email, 'Admin Erdanpee', 'super_admin', TRUE
FROM auth.users WHERE email = 'admin@erdanpee.com'
ON CONFLICT (id) DO NOTHING;
```

### Error: "Email atau password salah"

**Penyebab**: Kredensial tidak valid di Supabase Auth

**Solusi**:
1. Cek di Supabase Dashboard > Authentication > Users
2. Pastikan user dengan email `admin@erdanpee.com` sudah dibuat
3. Jika lupa password, bisa reset di dashboard atau buat ulang user

### Error: "Akun admin Anda telah dinonaktifkan"

**Penyebab**: Field `is_active` di tabel `admin_users` bernilai `false`

**Solusi**:
```sql
-- Aktifkan kembali admin
UPDATE public.admin_users
SET is_active = TRUE
WHERE email = 'admin@erdanpee.com';
```

### Error: RLS Policy Blocking

**Penyebab**: RLS policies terlalu ketat atau tidak sesuai

**Solusi**:
```sql
-- Temporary: Disable RLS untuk testing (JANGAN DI PRODUCTION!)
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Setelah testing, enable kembali
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
```

## 📝 Notes

- **Password Default**: `123456` (SANGAT DISARANKAN untuk diganti setelah first login!)
- **Role**: `super_admin` memiliki akses penuh ke semua fitur admin
- **Security**: Semua aktivitas admin tercatat (last_login di-update setiap login)

## 🔄 Update Password Admin

Untuk mengganti password admin:

1. Buka Supabase Dashboard > Authentication > Users
2. Cari user dengan email `admin@erdanpee.com`
3. Klik **"..."** (options) > **"Reset Password"**
4. Atau bisa gunakan Supabase Auth API untuk reset password

## 📚 File-File Terkait

- `create_admin_users_table.sql` - Query untuk buat tabel admin_users
- `insert_admin_account.sql` - Query untuk insert data admin
- `src/app/admin/login/page.tsx` - Halaman login admin
- `src/app/admin/layout.tsx` - Layout admin dengan auth protection

## ✅ Checklist Setup

- [ ] Jalankan `create_admin_users_table.sql`
- [ ] Buat user di Supabase Auth Dashboard (email: admin@erdanpee.com)
- [ ] Insert data ke tabel `admin_users`
- [ ] Verifikasi data dengan query SELECT
- [ ] Test login di `http://localhost:3000/admin/login`
- [ ] Ganti password default setelah first login

---

**Created by**: Claude Code Assistant
**Date**: 2025-11-12
**Version**: 1.0
