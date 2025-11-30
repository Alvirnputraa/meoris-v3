# 🎉 Panduan Register Admin - SIMPLE!

Sekarang Anda bisa register admin langsung lewat web! Gampang banget, cuma 2 langkah.

---

## 🚀 CARA SETUP (Super Simple!)

### Step 1: Setup Database Table

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy paste isi file `setup_admin_table_simple.sql`
3. Klik **Run**
4. Done! ✅

**Atau manual copy query ini:**

```sql
-- Create table (jika belum ada)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admin dapat melihat data mereka sendiri
CREATE POLICY "Admin can view their own data"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin dapat update data mereka sendiri
CREATE POLICY "Admin can update their own data"
  ON public.admin_users
  FOR UPDATE
  USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.admin_users TO service_role;
GRANT SELECT, UPDATE ON public.admin_users TO authenticated;
```

### Step 2: Tambahkan Service Role Key

1. Di **Supabase Dashboard**, pergi ke **Settings** → **API**
2. Copy **service_role key** (bukan anon key!)
3. Buka file `.env.local` di root project Anda
4. Tambahkan baris ini:

```env
SUPABASE_SERVICE_ROLE_KEY=paste-service-role-key-disini
```

Pastikan file `.env.local` Anda seperti ini:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. **Restart dev server** (Stop `npm run dev` dan jalankan lagi)

---

## ✅ SELESAI! Sekarang Bisa Register

### Cara Register Admin Baru:

1. Buka browser: `http://localhost:3000/admin/register`
2. Isi form:
   - **Nama Lengkap**: Nama Anda
   - **Email**: email@anda.com (bisa email apa aja)
   - **Password**: minimal 6 karakter
   - **Konfirmasi Password**: sama dengan password
3. Klik **"Daftar Sekarang"**
4. Tunggu sebentar...
5. Kalau berhasil, akan muncul alert: **"✅ Akun admin berhasil dibuat! Silakan login."**
6. Otomatis redirect ke halaman login
7. Login dengan email dan password yang baru dibuat
8. **DONE!** 🎉

---

## 🔐 Cara Login Admin

Setelah register berhasil:

1. Buka: `http://localhost:3000/admin/login`
2. Masukkan email dan password yang tadi didaftarkan
3. Klik **"Masuk"**
4. Berhasil! Akan masuk ke dashboard admin

---

## 💡 Fitur

- ✅ **Register langsung via web** - Gak perlu SQL manual
- ✅ **Auto create di Auth** - User otomatis dibuat di Supabase Auth
- ✅ **Auto insert ke admin_users** - Data admin otomatis masuk database
- ✅ **Validasi lengkap** - Email unique, password minimal 6 karakter
- ✅ **Error handling** - Kalau ada error, langsung dikasih tau
- ✅ **Redirect otomatis** - Setelah register, langsung ke login

---

## 🎯 URL Admin

- **Register**: `http://localhost:3000/admin/register`
- **Login**: `http://localhost:3000/admin/login`
- **Dashboard**: `http://localhost:3000/admin`

---

## ❌ Troubleshooting

### Error: "Failed to fetch" atau "Network Error"

**Penyebab**: Dev server belum restart setelah tambah SUPABASE_SERVICE_ROLE_KEY

**Solusi**:
```bash
# Stop dev server (Ctrl+C)
# Jalankan lagi
npm run dev
```

---

### Error: "Gagal membuat admin user"

**Penyebab**: Tabel `admin_users` belum dibuat atau RLS policy salah

**Solusi**:
1. Jalankan ulang `setup_admin_table_simple.sql` di Supabase SQL Editor
2. Pastikan tidak ada error

---

### Error: "Email sudah terdaftar"

**Penyebab**: Email yang digunakan sudah pernah didaftarkan

**Solusi**:
- Gunakan email lain, atau
- Hapus user lama di Supabase Dashboard → Authentication → Users

---

### Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"

**Penyebab**: Service role key belum ditambahkan ke `.env.local`

**Solusi**:
1. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env.local`
2. Restart dev server

---

### Halaman register tidak muncul / 404

**Penyebab**: File belum tersimpan atau dev server belum restart

**Solusi**:
1. Pastikan file `src/app/admin/register/page.tsx` ada
2. Restart dev server

---

## 📝 Notes

- **Role default**: Admin yang register akan punya role `admin` (bukan `super_admin`)
- **Status default**: Otomatis `is_active = true`
- **Email confirmation**: Otomatis confirmed, gak perlu klik link verifikasi
- **Password reset**: Belum ada fitur forgot password (bisa ditambahkan nanti)

---

## 🔒 Security

- ✅ Password terenkripsi dengan Supabase Auth
- ✅ RLS enabled untuk proteksi data
- ✅ Service role key hanya dipakai di server-side
- ✅ Validasi input di client dan server
- ✅ Email harus unique
- ⚠️ **Service role key JANGAN di-commit ke git!** (sudah ada di .gitignore)

---

## 🎊 Selamat!

Sekarang Anda punya sistem register admin yang lengkap! Tinggal:

1. ✅ Jalankan `setup_admin_table_simple.sql` (1x aja)
2. ✅ Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env.local`
3. ✅ Restart dev server
4. ✅ Buka `/admin/register` dan daftar!

**Super simple kan?** 🚀

---

**Created by**: Claude Code Assistant
**Date**: 2025-11-12
