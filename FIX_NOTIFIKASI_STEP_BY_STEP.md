# FIX NOTIFIKASI TIDAK MUNCUL - STEP BY STEP

## Masalah
Notifikasi tidak muncul di halaman `/user/purchase?view=notifications` meskipun data ada di database.

## Penyebab
RLS (Row Level Security) aktif di tabel `notifications` tapi **tidak ada policy yang mengizinkan user untuk SELECT data mereka**.

## Bukti
```
Console log menunjukkan:
"Notifications loaded: 0 items"
"Notifications data: []"

Tapi di database ada 4 notifikasi untuk user tersebut.
```

## Solusi - Ikuti Langkah Berikut:

### LANGKAH 1: Buka Supabase SQL Editor
1. Buka browser
2. Kunjungi: https://vtwooclhjobgdgvljauq.supabase.co
3. Login ke dashboard Supabase
4. Klik menu **SQL Editor** di sidebar kiri
5. Klik **"New query"**

### LANGKAH 2: Copy SQL Ini

```sql
-- Fix Notifications RLS Policy
-- This allows authenticated users to view their own notifications

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create SELECT policy
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create UPDATE policy
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'notifications';
```

### LANGKAH 3: Jalankan SQL
1. Paste SQL di atas ke SQL Editor
2. Klik tombol **"RUN"** atau tekan `Ctrl + Enter`
3. Tunggu sampai selesai (akan muncul hasil query di bawah)

### LANGKAH 4: Verifikasi
Hasil query harus menunjukkan 2 policies:

| tablename     | policyname                                | cmd    | roles            |
|---------------|-------------------------------------------|--------|------------------|
| notifications | Users can update their own notifications  | UPDATE | {authenticated}  |
| notifications | Users can view their own notifications    | SELECT | {authenticated}  |

### LANGKAH 5: Test di Browser
1. Refresh halaman notifikasi: http://localhost:3000/user/purchase?view=notifications
2. Buka Console (F12)
3. Seharusnya sekarang muncul:
   ```
   Notifications loaded: 4 items
   Notifications data: [...]
   ```

## Jika Masih Tidak Berhasil

### Option A: Gunakan Policy Sementara (Testing)
Jalankan SQL ini untuk test apakah masalahnya di RLS:

```sql
-- TEMPORARY: Allow all authenticated users to see ALL notifications
DROP POLICY IF EXISTS "temp_allow_all" ON notifications;
CREATE POLICY "temp_allow_all"
ON notifications
FOR SELECT
TO authenticated
USING (true);
```

Jika ini berhasil, berarti masalahnya ada di `auth.uid()` vs `user_id`.

### Option B: Cek Auth Session
Di browser console, jalankan:

```javascript
const { data } = await supabase.auth.getSession();
console.log('Current user ID:', data.session?.user?.id);
```

Pastikan user ID-nya sama dengan `user_id` di tabel notifications.

### Option C: Disable RLS Sementara (DANGER - ONLY FOR LOCAL TESTING)
```sql
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

**JANGAN LAKUKAN INI DI PRODUCTION!** Ini hanya untuk testing lokal.

## Expected Result Setelah Fix

✅ Notifikasi muncul di halaman
✅ User hanya bisa lihat notifikasi mereka sendiri
✅ User bisa mark notification as read
✅ Security tetap terjaga (RLS aktif)

## Files Created for Reference
- `APPLY_THIS_SQL_IN_SUPABASE.sql` - SQL yang perlu dijalankan
- `test_notification_rls.js` - Script untuk test RLS dari Node.js
- `verify_rls_fix.js` - Script untuk verify fix
- `test_notification_from_browser.html` - Test page untuk browser

## Need Help?
Jika masih error, screenshot:
1. Output dari SQL Editor setelah run SQL
2. Console log di browser
3. Network tab untuk request ke Supabase
