# Setup Auto-Cancel Pending Orders System

Sistem untuk membatalkan pesanan secara otomatis jika tidak dibayar dalam waktu 24 jam (1 hari).

## 📋 Overview

- **Waktu Maksimal**: 24 jam setelah order dibuat
- **Target Status**: `pending` atau `belum bayar`
- **Action**: Ubah status menjadi `cancelled`
- **Notifikasi**: Kirim notifikasi ke user bahwa pesanan dibatalkan
- **Cron Frequency**: Setiap 1 jam (recommended)

---

## 🔧 Setup Steps

### Step 1: Create Database Function

Jalankan SQL function di Supabase SQL Editor:

```bash
# File: create_auto_cancel_pending_orders_function.sql
```

Buka Supabase Dashboard → SQL Editor → Paste dan Run SQL file tersebut.

**Function yang dibuat:**
- `auto_cancel_pending_orders()`: Main function untuk cancel pending orders

**Logic:**
1. Cari orders dengan status `pending` atau `belum bayar`
2. Filter yang `created_at` lebih dari 24 jam yang lalu
3. Update status menjadi `cancelled`
4. Buat notification untuk user
5. Return jumlah orders yang di-cancel

---

### Step 2: Verify API Endpoint

API endpoint sudah dibuat di:
```
/api/cron/auto-cancel-pending-orders
```

**File:** `src/app/api/cron/auto-cancel-pending-orders/route.ts`

**Security:** Protected dengan `CRON_SECRET` environment variable

---

### Step 3: Setup Environment Variable

Pastikan `CRON_SECRET` sudah ada di `.env.local`:

```bash
CRON_SECRET=your-secret-key-here
```

Gunakan secret yang sama untuk semua cron jobs.

---

### Step 4: Setup Cron Job Service

#### Option A: Vercel Cron (Recommended untuk Production)

1. Buat file `vercel.json` di root project:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-complete-orders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/auto-cancel-pending-orders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cancel-expired-returns",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

2. Deploy ke Vercel
3. Vercel akan automatically run cron jobs sesuai schedule

**Schedule Explanation:**
- `0 * * * *` = Setiap jam (minute 0)
- `0 */6 * * *` = Setiap 6 jam

---

#### Option B: cron-job.org (Alternative)

1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - **URL**: `https://your-domain.com/api/cron/auto-cancel-pending-orders`
   - **Schedule**: Every hour
   - **Headers**:
     - `Authorization: Bearer YOUR_CRON_SECRET`
   - **Method**: GET

---

#### Option C: Manual Testing (Development)

Test endpoint secara manual:

```bash
# Test auto-cancel
curl -X GET http://localhost:3000/api/cron/auto-cancel-pending-orders \
  -H "Authorization: Bearer your-secret-key"
```

Expected Response:
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 5,
  "timestamp": "2025-01-16T10:00:00.000Z"
}
```

---

## 🧪 Testing

### Create Test Pending Order

1. Buat order baru melalui checkout
2. Jangan bayar (biarkan status `pending`)
3. Update `created_at` agar terlihat sudah 24 jam+:

```sql
-- Manual update untuk testing (di Supabase SQL Editor)
UPDATE orders
SET created_at = NOW() - INTERVAL '25 hours'
WHERE id = 'order-id-here'
AND status = 'pending';
```

4. Panggil cron endpoint secara manual:

```bash
curl -X GET http://localhost:3000/api/cron/auto-cancel-pending-orders \
  -H "Authorization: Bearer your-secret-key"
```

5. Verify:
   - Order status berubah jadi `cancelled`
   - Notification muncul di `/user/purchase?view=notifications`

---

## 📊 Monitoring

### Check Logs

**Supabase Logs:**
```sql
-- Lihat orders yang baru di-cancel
SELECT id, user_id, status, created_at, updated_at
FROM orders
WHERE status = 'cancelled'
AND updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;
```

**Notification Logs:**
```sql
-- Lihat notifications yang dibuat oleh auto-cancel
SELECT *
FROM notifications
WHERE type = 'order_cancelled'
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

---

## 🔄 Complete Cron Jobs Summary

Setelah setup ini, aplikasi memiliki 3 cron jobs:

| Cron Job | Path | Frequency | Purpose |
|----------|------|-----------|---------|
| Auto Complete | `/api/cron/auto-complete-orders` | Every 1 hour | Complete delivered orders after 2 days |
| Auto Cancel Pending | `/api/cron/auto-cancel-pending-orders` | Every 1 hour | Cancel unpaid orders after 1 day |
| Cancel Expired Returns | `/api/cron/cancel-expired-returns` | Every 6 hours | Cancel return requests after expiry |

---

## ⚠️ Important Notes

1. **24 Hours Calculation:**
   - Based on `created_at` timestamp
   - Uses PostgreSQL interval: `NOW() - INTERVAL '24 hours'`

2. **Status Check:**
   - Only cancels orders with status: `pending` OR `belum bayar`
   - Tidak akan cancel orders yang sudah `paid`, `processing`, dll

3. **Notification:**
   - Otomatis create notification type `order_cancelled`
   - User dapat lihat di halaman notifications

4. **Production:**
   - Pastikan `CRON_SECRET` aman dan tidak terpublish
   - Monitor logs untuk error
   - Setup alert jika cron job gagal

---

## 🎯 Success Criteria

✅ SQL function `auto_cancel_pending_orders()` created
✅ API endpoint `/api/cron/auto-cancel-pending-orders` working
✅ Cron job scheduled (every 1 hour)
✅ Pending orders > 24 hours automatically cancelled
✅ Notifications sent to users
✅ No errors in logs

---

## 🐛 Troubleshooting

**Problem: Cron not running**
- Check CRON_SECRET is correct
- Verify vercel.json syntax
- Check Vercel dashboard → Settings → Cron Jobs

**Problem: Orders not cancelled**
- Verify SQL function exists: `SELECT auto_cancel_pending_orders();`
- Check order created_at: `SELECT id, created_at, status FROM orders WHERE status = 'pending';`
- Manually run cron to see error

**Problem: No notifications**
- Check notifications table RLS policies
- Verify user_id exists in order
- Check Supabase logs for errors

---

Setup selesai! 🎉
