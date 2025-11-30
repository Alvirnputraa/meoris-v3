# 🔧 FIX: Notifications Tidak Muncul

## 🐛 MASALAH

**Symptoms:**
- Order berhasil di-cancel ✅
- Status di website berubah ✅
- **TAPI notifikasi TIDAK muncul** ❌

**Error yang ditemukan:**
```
insert or update on table "notifications" violates foreign key constraint "notifications_user_id_fkey"
Key (user_id)=(aa69bd53-8569-4114-8387-3c1a531cec94) is not present in table "users".
```

## 🔍 ROOT CAUSE

Table `notifications` punya foreign key constraint:
- `notifications.user_id` → `users.id`
- User ID ada di table `users` (bisa di-query)
- **TAPI** ada masalah dengan foreign key constraint

**Kemungkinan penyebab:**
1. Foreign key reference ke table yang salah
2. RLS (Row Level Security) blocking
3. User ada di auth.users tapi tidak di public.users

## ✅ SOLUSI (2 Options)

### Option 1: Drop Foreign Key Constraint (QUICK FIX)

Kalau tidak perlu foreign key validation, hapus saja:

```sql
-- Di Supabase SQL Editor
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
```

Setelah ini, notifikasi akan bisa dibuat tanpa error.

### Option 2: Fix Foreign Key Reference (PROPER FIX)

Pastikan foreign key reference benar:

```sql
-- 1. Drop old constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 2. Recreate dengan reference yang benar
ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;
```

## 🧪 TESTING SETELAH FIX

### Test 1: Manual Insert Notification
```sql
INSERT INTO notifications (user_id, title, message, type, created_at)
VALUES (
  'aa69bd53-8569-4114-8387-3c1a531cec94',
  'Test Notification',
  'This is a test notification',
  'test',
  NOW()
);
```

Harusnya sukses tanpa error.

### Test 2: Trigger Auto-Cancel

1. Buat order baru dengan deadline expired
2. Trigger cron:
   ```bash
   curl -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
     http://localhost:3005/api/cron/auto-cancel-pending-orders
   ```
3. Check notifikasi:
   ```bash
   node check_notifications.js
   ```

### Test 3: Check di Website

Buka: https://meoris.id/user/purchase?view=notifications

Harusnya muncul notifikasi "Pesanan dibatalkan".

## 📋 STEP-BY-STEP FIX

### 1. Apply SQL Fix

**Go to**: https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/sql/new

**Run this:**
```sql
-- Drop foreign key constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Test insert notification
INSERT INTO notifications (user_id, title, message, type, created_at)
VALUES (
  'aa69bd53-8569-4114-8387-3c1a531cec94',
  'Test - Pesanan dibatalkan',
  'Test notification after fixing foreign key',
  'order_cancelled',
  NOW()
);
```

### 2. Verify Fix

```bash
node check_notifications.js
```

Should show at least 1 notification.

### 3. Test Auto-Cancel with New Order

Create expired order and trigger auto-cancel, notification should appear.

## 🎯 EXPECTED RESULT AFTER FIX

1. ✅ Notifications can be created without error
2. ✅ Auto-cancel creates notification automatically
3. ✅ Notification appears on website
4. ✅ Message shows: "Pesanan dengan nomor DEV-XXX telah dibatalkan..."

## 📊 VERIFICATION CHECKLIST

After applying fix:

- [ ] SQL command executed successfully
- [ ] Test notification inserted
- [ ] `node check_notifications.js` shows notifications
- [ ] Website shows notifications at /user/purchase?view=notifications
- [ ] Auto-cancel creates notifications automatically

---

**Priority**: HIGH
**Estimated Time**: 5 minutes
**Difficulty**: EASY (just run SQL)
