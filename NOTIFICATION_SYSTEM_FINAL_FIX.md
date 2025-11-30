# Final Fix: Sistem Notifikasi - Summary

## Error yang Terjadi

### Error 1: Notifikasi Tidak Muncul
**Penyebab:** Trigger SQL mengecek status `UNPAID`/`pending`, tapi order dibuat langsung dengan status `paid`.

### Error 2: Foreign Key Constraint
```
insert or update on table "notifications" violates foreign key constraint "notifications_user_id_fkey"
```
**Penyebab:** `user_id` di order tidak exist di `auth.users` atau NULL.

## Solusi yang Sudah Dibuat

### 1. Fix Trigger SQL ✅

**File:** `fix_notification_triggers.sql`

**Perubahan:**
- ❌ Trigger lama: Check `IF NEW.status IN ('UNPAID', 'pending')`
- ✅ Trigger baru: Check `IF NEW.status = 'paid'`
- ✅ Add validation: Check `user_id IS NOT NULL`
- ✅ Add validation: Check user exists di `auth.users`
- ✅ Add error handling: `RAISE WARNING` jika `user_id` invalid

**Trigger Baru:**
1. `trigger_notification_on_order_paid_insert` - Fire saat INSERT order dengan status `paid`
2. `trigger_notification_on_status_update` - Fire saat UPDATE status ke `paid` (backup)

### 2. User ID Validation ✅

Trigger sekarang validate:
```sql
IF NEW.status = 'paid' AND NEW.user_id IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    -- Insert notification
  ELSE
    RAISE WARNING 'user_id does not exist in auth.users';
  END IF
END IF;
```

**Benefit:**
- Tidak akan error jika `user_id` invalid
- Log warning ke Supabase logs untuk debugging
- Notifikasi hanya dibuat untuk order dengan `user_id` valid

### 3. Debug Tools ✅

**File:** `debug_user_id_issue.sql`

Queries untuk diagnostic:
- ✅ Check orders dengan `user_id` invalid
- ✅ Check orders dengan `user_id` NULL
- ✅ Check orders dengan user yang sudah dihapus
- ✅ Validation `user_id` di `checkout_submissions`
- ✅ Sample valid users untuk testing

## Files yang Dibuat/Diupdate

| File | Purpose |
|------|---------|
| `fix_notification_triggers.sql` | **MAIN FIX** - SQL untuk fix trigger dengan validation |
| `QUICK_FIX_NOTIFICATIONS.md` | Quick start guide (1 menit) |
| `NOTIFICATION_FIX_EXPLANATION.md` | Penjelasan lengkap root cause & solution |
| `debug_notification_system.sql` | Comprehensive debug queries |
| `debug_user_id_issue.sql` | Debug foreign key constraint issue |
| `NOTIFICATION_SYSTEM_FINAL_FIX.md` | Summary document (ini) |

## Cara Menggunakan

### Quick Fix (1 Menit)

1. **Jalankan SQL Fix:**
   ```bash
   Supabase → SQL Editor → Run: fix_notification_triggers.sql
   ```

2. **Verify:**
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE trigger_name LIKE '%notification%';
   ```
   Harus muncul 2 triggers.

3. **Test:**
   - Buat order baru
   - Bayar via Tripay
   - Cek `/user/purchase?view=notifications`
   - Notifikasi harus muncul ✅

### Jika Error Foreign Key

1. **Diagnostic:**
   ```sql
   SELECT
     o.id,
     o.user_id,
     EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id) as valid
   FROM orders o
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Jika `valid = false`:**
   - Jalankan `debug_user_id_issue.sql` untuk detail
   - Order dengan `user_id` invalid akan di-skip oleh trigger
   - Trigger akan log warning ke Supabase logs

## Expected Behavior Setelah Fix

### Skenario 1: Order Baru dengan User Valid ✅
1. User checkout → Bayar
2. Tripay callback → Create order dengan status `paid`
3. **Trigger auto-create notification**
4. User buka tab Notifikasi → Notifikasi muncul

### Skenario 2: Order dengan User Invalid ⚠️
1. Tripay callback → Create order dengan `user_id` invalid
2. **Trigger skip create notification**
3. **Log warning di Supabase logs**
4. Order tetap tersimpan, tapi tidak ada notifikasi

### Skenario 3: Status Update ke Paid ✅
1. Order dengan status lain → Update ke `paid`
2. **Trigger backup auto-create notification** (jika belum ada)
3. Notifikasi muncul

## Timeline Notifikasi

```
User Checkout
    ↓
Tripay Payment
    ↓
Payment Success Callback
    ↓
Order Created (status: 'paid', user_id: valid UUID)
    ↓
Trigger: create_notification_on_order_paid_insert
    ↓
Validate: user_id IS NOT NULL? ✅
    ↓
Validate: user exists in auth.users? ✅
    ↓
Insert Notification
    ↓
User Opens /user/purchase?view=notifications
    ↓
Notification Displayed ✅
```

## Catatan Penting

### Mengapa Tidak Ada Notifikasi "Harap Selesaikan Pembayaran"?

Karena sistem ini **tidak membuat order sebelum payment**. Order hanya dibuat SETELAH payment berhasil.

Flow saat ini:
```
Checkout → Payment → Order Created (paid)
```

Jika ingin notifikasi "Harap selesaikan pembayaran", harus ubah flow:
```
Checkout → Order Created (UNPAID) → Payment → Order Updated (paid)
```

Tapi ini butuh perubahan besar di:
- `src/server/tripay.ts`
- `src/app/produk/checkout/page.tsx`

### RLS Policy

RLS sudah benar:
```sql
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

User hanya bisa lihat notifikasi mereka sendiri.

### Trigger Security

Trigger menggunakan `SECURITY DEFINER`:
```sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Artinya trigger berjalan dengan privilege owner (bypass RLS), jadi bisa insert notification untuk user manapun.

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Notifikasi tidak muncul | Cek `fix_notification_triggers.sql` sudah dijalankan? |
| Foreign key error | Jalankan `debug_user_id_issue.sql`, cek `user_id` valid |
| Trigger tidak ada | Jalankan ulang `fix_notification_triggers.sql` |
| User NULL di order | Fix checkout flow, pastikan `user_id` tersimpan |
| Notification muncul duplikat | Trigger update punya `IF NOT EXISTS` check |

## Next Steps (Optional)

Untuk menambahkan notifikasi lain:

### Notifikasi "Pesanan Dikirim"
```sql
CREATE FUNCTION notify_on_shipped()
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    INSERT INTO notifications (...)
    VALUES ('order_shipped', 'Pesanan Dikirim', ...)
  END IF
```

### Notifikasi "Pesanan Diterima"
```sql
CREATE FUNCTION notify_on_delivered()
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    INSERT INTO notifications (...)
    VALUES ('order_delivered', 'Pesanan Diterima', ...)
  END IF
```

Atau bisa call insert notification langsung dari backend code.

## Verification Checklist

Setelah run `fix_notification_triggers.sql`:

- [ ] Trigger `trigger_notification_on_order_paid_insert` exists
- [ ] Trigger `trigger_notification_on_status_update` exists
- [ ] Function `create_notification_on_order_paid_insert()` exists
- [ ] Function `create_notification_on_status_update()` exists
- [ ] Test order baru → notifikasi muncul
- [ ] No foreign key constraint error
- [ ] UI di `/user/purchase?view=notifications` works

## Support

Jika masih ada masalah:

1. **Check Supabase Logs:**
   - Supabase Dashboard → Logs → Postgres Logs
   - Lihat ada RAISE WARNING?

2. **Run Debug Queries:**
   ```bash
   debug_notification_system.sql
   debug_user_id_issue.sql
   ```

3. **Check Browser Console:**
   - F12 → Console
   - Lihat ada error saat load notifications?

4. **Manual Test:**
   ```sql
   -- Insert notification manual
   INSERT INTO notifications (user_id, order_id, type, title, message)
   VALUES ('VALID_USER_ID', 'VALID_ORDER_ID', 'payment_success', 'Test', 'Test');
   ```
   Jika manual insert muncul di UI, berarti masalah di trigger.
   Jika tidak muncul, masalah di RLS atau UI.

---

**Status:** ✅ Ready to Deploy

**Last Updated:** After fixing foreign key constraint issue
