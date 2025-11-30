# 🚀 Cara Setup Admin User - MEORIS

Ada **3 cara** untuk membuat admin user. Pilih salah satu yang paling mudah untuk Anda.

---

## ✅ CARA 1: Menggunakan Script Node.js (RECOMMENDED)

Cara ini paling mudah dan reliable. Script akan otomatis membuat user di Supabase Auth dan insert data ke tabel admin_users.

### Step 1: Dapatkan Service Role Key

1. Buka **Supabase Dashboard**
2. Pergi ke **Settings** > **API**
3. Copy **service_role key** (bukan anon key!)
4. **⚠️ JANGAN share key ini ke public!**

### Step 2: Update .env atau .env.local

Tambahkan service role key ke file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Buat Tabel admin_users

Buka **Supabase SQL Editor** dan jalankan:

```sql
-- File: create_admin_users_table.sql
```

Atau copy-paste query dari file `create_admin_users_table.sql`

### Step 4: Jalankan Script

```bash
node create_admin_user.js
```

✅ **Done!** Admin user sudah dibuat dan bisa langsung login.

---

## ✅ CARA 2: Menggunakan SQL Script Langsung

Cara ini mencoba insert langsung ke tabel `auth.users` via SQL.

### Step 1: Buka Supabase SQL Editor

1. Pergi ke **Supabase Dashboard** > **SQL Editor**
2. Klik **"New query"**

### Step 2: Jalankan Script

Copy semua isi dari file `create_admin_direct.sql` dan paste ke SQL Editor, lalu klik **Run**.

Script ini akan:
- ✅ Create tabel `admin_users` (jika belum ada)
- ✅ Insert user ke `auth.users`
- ✅ Insert data admin ke `admin_users`
- ✅ Create identity record
- ✅ Verifikasi setup

### Step 3: Cek Hasil

Jika berhasil, akan muncul message:

```
🎉 SETUP SELESAI!
Email: admin@erdanpee.com
Password: 123456
```

### ⚠️ Jika Error

Jika ada error `permission denied` atau `insufficient privileges`, gunakan **Cara 1** atau **Cara 3**.

---

## ✅ CARA 3: Manual via Supabase Dashboard

Cara ini paling aman dan pasti berhasil.

### Step 1: Buat Tabel admin_users

Jalankan file `create_admin_users_table.sql` di Supabase SQL Editor.

### Step 2: Buat User di Supabase Dashboard

1. Buka **Supabase Dashboard**
2. Pergi ke **Authentication** > **Users**
3. Klik **"Add User"**
4. Isi form:
   ```
   Email: admin@erdanpee.com
   Password: 123456
   Auto Confirm User: ✅ (centang)
   ```
5. Klik **"Create User"**

### Step 3: Insert ke Tabel admin_users

Setelah user dibuat, jalankan query ini di SQL Editor:

```sql
INSERT INTO public.admin_users (id, email, nama, role, is_active)
SELECT
  id,
  'admin@erdanpee.com' as email,
  'Admin Erdanpee' as nama,
  'super_admin' as role,
  TRUE as is_active
FROM auth.users
WHERE email = 'admin@erdanpee.com'
ON CONFLICT (id) DO NOTHING;
```

### Step 4: Verifikasi

```sql
SELECT
  au.id,
  au.email,
  au.nama,
  au.role,
  au.is_active,
  u.email as auth_email
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.id
WHERE au.email = 'admin@erdanpee.com';
```

Jika muncul 1 row data dengan email yang sama, berarti **berhasil!**

---

## 🔐 Test Login

Setelah setup selesai (dengan cara apapun):

1. Buka browser: `http://localhost:3000/admin/login`
2. Login dengan:
   ```
   Email: admin@erdanpee.com
   Password: 123456
   ```
3. Klik **"Masuk"**
4. Jika berhasil → Redirect ke Dashboard Admin ✅

---

## ❌ Troubleshooting

### Error: "Email atau password salah"

**Penyebab**: User belum dibuat di Supabase Auth

**Solusi**:
1. Cek di **Supabase Dashboard** > **Authentication** > **Users**
2. Pastikan ada user dengan email `admin@erdanpee.com`
3. Jika belum ada, buat manual via Dashboard (Cara 3)

---

### Error: "Anda tidak memiliki akses admin"

**Penyebab**: User ada di auth.users, tapi tidak ada di tabel admin_users

**Solusi**:
```sql
-- Cek apakah user ada di auth
SELECT id, email FROM auth.users WHERE email = 'admin@erdanpee.com';

-- Insert ke admin_users
INSERT INTO public.admin_users (id, email, nama, role, is_active)
SELECT id, email, 'Admin Erdanpee', 'super_admin', TRUE
FROM auth.users WHERE email = 'admin@erdanpee.com'
ON CONFLICT (id) DO NOTHING;
```

---

### Error: "Akun admin Anda telah dinonaktifkan"

**Penyebab**: Field `is_active` = false

**Solusi**:
```sql
UPDATE public.admin_users
SET is_active = TRUE
WHERE email = 'admin@erdanpee.com';
```

---

### Script Node.js Error: "SUPABASE_SERVICE_ROLE_KEY not found"

**Penyebab**: Service role key belum ditambahkan ke .env

**Solusi**:
1. Buka Supabase Dashboard > Settings > API
2. Copy **service_role key**
3. Tambahkan ke `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

### Tidak ada data di auth.users dan admin_users

**Penyebab**: Query `INSERT` dari `insert_admin_account.sql` hanya bekerja jika user sudah ada di auth.users

**Solusi**: Gunakan **Cara 1** (Script Node.js) atau **Cara 3** (Manual Dashboard)

---

## 📊 Verifikasi Final

Jalankan query ini untuk memastikan semuanya OK:

```sql
-- Cek user di auth
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  'Auth User OK' as status
FROM auth.users
WHERE email = 'admin@erdanpee.com';

-- Cek data admin
SELECT
  au.*,
  u.email as auth_email,
  CASE
    WHEN u.id IS NOT NULL THEN '✅ Setup Complete'
    ELSE '❌ User not in auth.users'
  END as status
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.id
WHERE au.email = 'admin@erdanpee.com';
```

Hasil yang diharapkan:
- ✅ Ada 1 row di `auth.users`
- ✅ Ada 1 row di `admin_users`
- ✅ `is_active` = true
- ✅ `role` = 'super_admin'
- ✅ `status` = '✅ Setup Complete'

---

## 🎯 Rekomendasi

Saya sarankan gunakan **CARA 1** (Script Node.js) karena:
- ✅ Paling mudah dan cepat
- ✅ Otomatis create di auth dan admin_users
- ✅ Built-in verification
- ✅ Error handling yang baik

Jika tidak bisa gunakan Cara 1, pakai **CARA 3** (Manual Dashboard) yang pasti berhasil 100%.

---

## 📁 File Reference

- `create_admin_user.js` → Script Node.js (Cara 1)
- `create_admin_direct.sql` → SQL direct insert (Cara 2)
- `create_admin_users_table.sql` → Create tabel
- `insert_admin_account.sql` → Manual insert (Cara 3)

---

**Butuh bantuan?** Cek dokumentasi lengkap di `SETUP_ADMIN_LOGIN.md`
