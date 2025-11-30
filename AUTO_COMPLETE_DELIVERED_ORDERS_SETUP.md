# Setup Auto-Complete Delivered Orders (2 Days Return Window)

## Deskripsi Sistem

Sistem ini mengimplementasikan fitur otomatis untuk menyelesaikan pesanan yang telah dikirim (delivered) setelah 2 hari. Fitur ini memberikan masa tenggang 2 hari kepada user untuk mengajukan pengembalian barang.

### Alur Kerja:
1. Ketika pesanan statusnya berubah menjadi `delivered`, timestamp `delivered_at` akan otomatis terisi
2. Pesanan dengan status `delivered` tetap muncul di tab "Dikirim" (shipped)
3. User melihat warning + countdown untuk masa pengembalian (2 hari)
4. User dapat klik button "Ajukan Pengembalian" selama dalam masa 2 hari
5. Setelah 2 hari, sistem otomatis mengubah status menjadi `completed`
6. Pesanan yang `completed` otomatis pindah ke tab "Selesai"

---

## 📋 Langkah Setup

### 1. Setup Database

Jalankan SQL files berikut secara berurutan di Supabase SQL Editor:

#### a. Tambah Kolom `delivered_at`
```bash
# File: add_delivered_at_column.sql
```
- Menambahkan kolom `delivered_at` TIMESTAMPTZ ke tabel `orders`
- Membuat index untuk performa query otomatis

#### b. Buat Trigger Auto-Fill `delivered_at`
```bash
# File: create_delivered_at_trigger.sql
```
- Trigger otomatis mengisi `delivered_at` ketika status berubah ke `delivered`
- Trigger otomatis menghapus `delivered_at` jika status berubah dari `delivered`

#### c. Buat Function Auto-Complete
```bash
# File: create_auto_complete_function.sql
```
- Function untuk mengubah status `delivered` menjadi `completed` setelah 2 hari
- Bisa dipanggil manual atau via cron job

#### d. Setup Cron Job (PENTING!)
```bash
# File: setup_cron_job.sql
```

**CATATAN PENTING**:
- File ini memerlukan extension `pg_cron` yang aktif
- Di Supabase Dashboard:
  1. Buka **Database** > **Extensions**
  2. Cari `pg_cron`
  3. Enable extension tersebut
  4. Setelah enabled, jalankan SQL di `setup_cron_job.sql`

Cron job akan berjalan **setiap jam** untuk mengecek dan auto-complete orders yang sudah >2 hari.

---

### 2. Verifikasi Setup Database

Cek apakah semua sudah terpasang:

```sql
-- Cek kolom delivered_at sudah ada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'delivered_at';

-- Cek trigger sudah ada
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_delivered_at';

-- Cek function sudah ada
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'auto_complete_delivered_orders';

-- Cek cron job sudah terdaftar (jika pg_cron enabled)
SELECT * FROM cron.job WHERE jobname = 'auto-complete-delivered-orders';
```

---

### 3. Test Manual

Test function auto-complete secara manual:

```sql
-- Test 1: Buat order dummy dengan delivered_at 3 hari lalu
INSERT INTO orders (
  user_id,
  status,
  shipping_status,
  delivered_at,
  total_amount
) VALUES (
  'YOUR_USER_ID',
  'delivered',
  'Terkirim',
  NOW() - INTERVAL '3 days',
  100000
);

-- Test 2: Jalankan function manual
SELECT auto_complete_delivered_orders();

-- Test 3: Cek apakah order berubah jadi completed
SELECT id, status, delivered_at, updated_at
FROM orders
WHERE delivered_at <= NOW() - INTERVAL '2 days';
```

---

### 4. Alternative: Jika pg_cron Tidak Tersedia

Jika Supabase project Anda tidak support `pg_cron`, gunakan alternatif berikut:

#### Option A: Vercel Cron Job (Recommended)
Buat API endpoint dan schedule via Vercel Cron:

**File: `src/app/api/cron/auto-complete-orders/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the database function
    const { error } = await supabaseAdmin.rpc('auto_complete_delivered_orders');

    if (error) {
      console.error('Auto-complete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-complete job executed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      error: error.message || 'Internal error'
    }, { status: 500 });
  }
}
```

**File: `vercel.json`**
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-complete-orders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Tambahkan ke `.env`:
```env
CRON_SECRET=your-random-secret-here
```

#### Option B: External Cron Service
Gunakan service seperti:
- **cron-job.org**
- **EasyCron**
- **AWS EventBridge**

Setup mereka untuk call endpoint `/api/cron/auto-complete-orders` setiap jam.

---

## 🎨 Frontend Changes

Frontend sudah diupdate untuk:

### 1. Purchase Page (`src/app/user/purchase/page.tsx`)
- ✅ Order dengan status `delivered` tetap di tab "Dikirim"
- ✅ Order dengan status `completed` pindah ke tab "Selesai"
- ✅ Query sudah include `delivered_at` column

### 2. Order Detail Page (`src/app/produk/pesanan/[orderId]/OrderDetailClient.tsx`)
- ✅ Menampilkan warning hijau ketika status = delivered
- ✅ Menampilkan countdown hari tersisa untuk pengembalian
- ✅ Button "Ajukan Pengembalian" hanya muncul jika masih dalam masa 2 hari
- ✅ Jika masa sudah lewat, tampilkan pesan "Masa pengajuan pengembalian telah berakhir"
- ✅ Query sudah include `status` dan `delivered_at`

---

## 🧪 Testing Flow

### Test Scenario 1: Fresh Delivered Order
1. Buat order baru
2. Update status ke `delivered`:
   ```sql
   UPDATE orders
   SET status = 'delivered', shipping_status = 'Terkirim'
   WHERE id = 'ORDER_ID';
   ```
3. Refresh halaman order detail
4. ✅ Harus muncul warning hijau
5. ✅ Countdown harus menunjukkan "2 hari lagi"
6. ✅ Button "Ajukan Pengembalian" harus muncul

### Test Scenario 2: Order Mendekati Deadline (1 hari)
1. Update delivered_at manual:
   ```sql
   UPDATE orders
   SET delivered_at = NOW() - INTERVAL '1 day'
   WHERE id = 'ORDER_ID';
   ```
2. Refresh halaman
3. ✅ Countdown harus menunjukkan "1 hari lagi"
4. ✅ Button masih muncul

### Test Scenario 3: Order Melewati Deadline (3 hari)
1. Update delivered_at manual:
   ```sql
   UPDATE orders
   SET delivered_at = NOW() - INTERVAL '3 days'
   WHERE id = 'ORDER_ID';
   ```
2. Jalankan function manual: `SELECT auto_complete_delivered_orders();`
3. Refresh halaman
4. ✅ Order harus pindah ke tab "Selesai"
5. ✅ Status harus berubah jadi `completed`

### Test Scenario 4: Webhook Integration
1. Simulasi webhook dari Biteship dengan status `delivered`
2. ✅ Trigger harus otomatis set `delivered_at`
3. ✅ Frontend harus update realtime (via Supabase realtime subscription)

---

## 🔍 Monitoring & Troubleshooting

### Check Cron Job Status
```sql
-- Lihat history job runs (jika pg_cron)
SELECT * FROM cron.job_run_details
WHERE jobname = 'auto-complete-delivered-orders'
ORDER BY start_time DESC
LIMIT 10;
```

### Check Delivered Orders Pending Completion
```sql
-- Orders yang delivered >2 hari tapi belum completed
SELECT
  id,
  status,
  shipping_status,
  delivered_at,
  EXTRACT(EPOCH FROM (NOW() - delivered_at)) / 3600 as hours_since_delivered
FROM orders
WHERE status = 'delivered'
  AND delivered_at <= NOW() - INTERVAL '2 days'
ORDER BY delivered_at ASC;
```

### Manual Trigger (Jika Cron Gagal)
```sql
-- Panggil function manual
SELECT auto_complete_delivered_orders();
```

---

## ⚙️ Configuration

Untuk mengubah masa tenggang (default 2 hari):

### Di Database Function (`create_auto_complete_function.sql`)
Ganti `INTERVAL '2 days'` menjadi nilai yang diinginkan:
```sql
-- Contoh: 3 hari
WHERE delivered_at <= NOW() - INTERVAL '3 days'

-- Contoh: 7 hari
WHERE delivered_at <= NOW() - INTERVAL '7 days'
```

### Di Frontend (`OrderDetailClient.tsx`)
Ganti perhitungan deadline:
```typescript
// Line ~939: Ganti 2 menjadi nilai yang diinginkan
const deadline = new Date(delivered.getTime() + (3 * 24 * 60 * 60 * 1000)) // 3 hari
```

---

## 🎯 Summary Checklist

- [ ] Run `add_delivered_at_column.sql`
- [ ] Run `create_delivered_at_trigger.sql`
- [ ] Run `create_auto_complete_function.sql`
- [ ] Enable `pg_cron` extension di Supabase
- [ ] Run `setup_cron_job.sql` (atau setup Vercel Cron sebagai alternatif)
- [ ] Verify dengan query di section "Verifikasi Setup Database"
- [ ] Test dengan scenario di section "Testing Flow"
- [ ] Monitor cron job berjalan dengan baik

---

## 📞 Support

Jika ada masalah:
1. Check logs di Supabase Dashboard > Database > Logs
2. Check cron job status dengan query di section Monitoring
3. Test function manual untuk isolate issue
4. Verify trigger bekerja dengan update order status manual

---

**Status**: ✅ Ready to Deploy
**Last Updated**: 2025-11-10
