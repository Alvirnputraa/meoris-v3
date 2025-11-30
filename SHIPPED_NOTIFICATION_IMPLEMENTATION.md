# Implementasi Notifikasi "Pesanan Dikirim"

## 📋 Overview

Sistem ini secara otomatis membuat notifikasi untuk user ketika admin mengubah status pesanan dari **"paid"/"processing"** menjadi **"shipped"** melalui admin panel.

---

## 🎯 Flow Diagram

```
Admin Panel (Generate Resi)
         ↓
API: /api/admin/generate-resi
         ↓
Update order.status = 'shipped'
         ↓
Database Trigger: trigger_notification_on_order_shipped
         ↓
Function: create_notification_on_order_shipped()
         ↓
Insert ke table notifications
         ↓
User melihat di: /user/purchase?view=notifications
```

---

## 📁 File yang Dibuat

1. **`create_notification_on_shipped.sql`**
   - SQL script untuk membuat function dan trigger
   - Function: `create_notification_on_order_shipped()`
   - Trigger: `trigger_notification_on_order_shipped`

2. **`setup_shipped_notification.js`**
   - Script Node.js untuk menjalankan setup otomatis
   - Alternatif untuk manual setup via Supabase Dashboard

3. **`test_shipped_notification.js`**
   - Script untuk testing end-to-end notification flow
   - Otomatis update order dan verify notification dibuat

---

## 🚀 Cara Setup

### Opsi 1: Via Supabase Dashboard (Recommended)

1. Buka **Supabase Dashboard** → **SQL Editor**

2. Copy paste isi file `create_notification_on_shipped.sql`

3. Klik **"Run"** untuk execute

4. Verify trigger berhasil dibuat:
   ```sql
   SELECT trigger_name, event_object_table, action_statement
   FROM information_schema.triggers
   WHERE trigger_name = 'trigger_notification_on_order_shipped';
   ```

### Opsi 2: Via Node.js Script

```bash
node setup_shipped_notification.js
```

**Note**: Script ini mungkin gagal karena permission. Jika gagal, gunakan Opsi 1.

---

## 🧪 Cara Test

### Test Otomatis

```bash
node test_shipped_notification.js
```

Script ini akan:
1. Mencari order dengan status "paid" atau "processing"
2. Update status ke "shipped"
3. Verify notification dibuat
4. Tampilkan hasil test

### Test Manual

1. **Buka Admin Panel**
   ```
   http://localhost:3000/admin/orders
   ```

2. **Filter order dengan status "Paid"**
   - Klik tab "Paid (Menunggu Konfirmasi)"

3. **Generate Resi**
   - Klik tombol "📦 Generate Resi" pada salah satu order
   - Tunggu hingga proses selesai
   - Status order otomatis berubah jadi "shipped"

4. **Cek Notifikasi di User Panel**
   - Login sebagai user yang punya order tersebut
   - Buka: `http://localhost:3000/user/purchase?view=notifications`
   - Harusnya muncul notifikasi baru dengan:
     - **Title**: "Pesanan Dikirim"
     - **Message**: "Pesanan anda dengan id pesanan [ORDER_NUMBER] telah dikirim"
     - **Link**: "Lihat Pesanan" → redirect ke order detail

---

## 📊 Database Schema

### Table: `notifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key ke auth.users |
| `order_id` | UUID | Foreign key ke orders (nullable) |
| `type` | VARCHAR(50) | Tipe notifikasi: 'order_shipped' |
| `title` | VARCHAR(255) | Judul notifikasi |
| `message` | TEXT | Isi pesan notifikasi |
| `is_read` | BOOLEAN | Status dibaca (default: false) |
| `created_at` | TIMESTAMPTZ | Waktu dibuat |
| `updated_at` | TIMESTAMPTZ | Waktu update |

### Trigger Behavior

**Trigger Name**: `trigger_notification_on_order_shipped`

**Fires When**:
- Table: `orders`
- Event: `AFTER UPDATE OF status`
- Condition: OLD.status IN ('paid', 'processing') AND NEW.status = 'shipped'

**Action**:
```sql
INSERT INTO notifications (user_id, order_id, type, title, message)
VALUES (
  NEW.user_id,
  NEW.id,
  'order_shipped',
  'Pesanan Dikirim',
  'Pesanan anda dengan id pesanan ' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 10)) || ' telah dikirim ke pihak ekspedisi'
);
```

---

## 🔗 Integration Points

### 1. Admin Panel
**File**: `src/app/admin/orders/page.tsx`

- Admin klik "Generate Resi" (line 67-95)
- Memanggil API: `/api/admin/generate-resi`

### 2. Generate Resi API
**File**: `src/app/api/admin/generate-resi/route.ts`

- Line 77: Update `status: 'shipped'`
- Ini yang trigger database trigger kita

### 3. User Notification View
**File**: `src/app/user/purchase/page.tsx`

- Line 1338-1367: Function `loadNotifications()`
- Line 6017-6098: UI rendering notifikasi
- URL: `/user/purchase?view=notifications`

---

## 🎨 Notification UI

### Desktop View
```
┌─────────────────────────────────────────────────┐
│  🚚 Pesanan Dikirim                             │
│     Pesanan anda dengan id pesanan              │
│     1A2B3C4D5E telah dikirim ke pihak ekspedisi│
│     12 Jan 2025, 14:30 • Lihat Pesanan         │
└─────────────────────────────────────────────────┘
```

### Icon Berdasarkan Type
- `order_created` → 🛍️ Yellow background (shopping bag icon)
- `payment_success` → ✅ Green background (checkmark icon)
- `order_shipped` → 🚚 Purple background (truck icon)

---

## 🔍 Troubleshooting

### Notifikasi tidak muncul?

1. **Cek trigger exists:**
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'trigger_notification_on_order_shipped';
   ```

2. **Cek function exists:**
   ```sql
   SELECT * FROM pg_proc
   WHERE proname = 'create_notification_on_order_shipped';
   ```

3. **Cek logs di Supabase:**
   - Dashboard → Logs → Query logs
   - Cari RAISE NOTICE dari trigger

4. **Cek RLS policy:**
   ```sql
   -- User harus bisa SELECT notifications mereka sendiri
   SELECT * FROM notifications WHERE user_id = '<user-id>';
   ```

5. **Re-run setup:**
   ```bash
   node setup_shipped_notification.js
   ```
   atau manual via SQL Editor

### Status tidak berubah ke "shipped"?

1. **Cek order status saat ini:**
   ```sql
   SELECT id, order_number, status FROM orders WHERE id = '<order-id>';
   ```

2. **Order harus dalam status "paid" dulu** sebelum bisa generate resi

3. **Cek permission Supabase Admin:**
   - File: `src/lib/supabase-admin.ts`
   - Pastikan menggunakan service role key

---

## ✅ Testing Checklist

- [ ] Setup trigger via SQL Editor
- [ ] Verify trigger exists
- [ ] Create test order dengan status "paid"
- [ ] Generate resi via admin panel
- [ ] Verify status berubah ke "shipped"
- [ ] Cek table notifications untuk entry baru
- [ ] Login sebagai user dan cek `/user/purchase?view=notifications`
- [ ] Verify notifikasi muncul dengan data yang benar
- [ ] Klik "Lihat Pesanan" dan verify redirect ke order detail
- [ ] Test dengan multiple orders sekaligus (batch generate)

---

## 📝 Next Steps (Optional Enhancements)

1. **Mark as Read functionality**
   - Tambahkan button untuk mark notification as read
   - Update `is_read` column

2. **Real-time notifications**
   - Gunakan Supabase Realtime subscriptions
   - Update UI tanpa refresh

3. **Notification badge counter**
   - Show unread count di header
   - Reset ketika user buka notifications page

4. **Email/SMS notification**
   - Kirim email/SMS ketika pesanan dikirim
   - Integrate dengan service seperti SendGrid/Twilio

5. **Notification preferences**
   - User bisa pilih notifikasi apa yang mau diterima
   - Store preferences di `user_settings` table

---

## 🐛 Known Issues

1. **Trigger tidak fire jika update via raw SQL**
   - Solusi: Pastikan update melalui API atau use `.update()` method

2. **Notifikasi duplikat jika re-generate resi**
   - Current behavior: Akan create notif baru setiap kali status berubah
   - Potential fix: Tambah check di function untuk prevent duplikat

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Cek file ini dulu untuk troubleshooting
2. Run test script: `node test_shipped_notification.js`
3. Cek Supabase logs untuk error details
4. Review SQL trigger code di `create_notification_on_shipped.sql`

---

**Last Updated**: 2025-01-12
**Version**: 1.0.0
