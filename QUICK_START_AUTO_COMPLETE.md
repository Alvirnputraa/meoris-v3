# 🚀 Quick Start: Auto-Complete Delivered Orders

## Error: "schema cron does not exist"?

Anda mendapat error ini karena `pg_cron` extension tidak tersedia. **Tidak masalah!**

Gunakan **Vercel Cron** sebagai gantinya (lebih mudah & reliable).

---

## ⚡ Setup Cepat (5 Menit)

### 1️⃣ Setup Database (Wajib)

Jalankan SQL ini di **Supabase SQL Editor** secara berurutan:

```sql
-- File 1: add_delivered_at_column.sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
ON orders(delivered_at)
WHERE shipping_status = 'delivered';
```

```sql
-- File 2: create_delivered_at_trigger.sql
CREATE OR REPLACE FUNCTION set_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.shipping_status = 'delivered' AND OLD.shipping_status != 'delivered' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at = NOW();
  END IF;
  IF NEW.shipping_status != 'delivered' AND OLD.shipping_status = 'delivered' THEN
    NEW.delivered_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_delivered_at ON orders;

CREATE TRIGGER trigger_set_delivered_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_delivered_at();
```

```sql
-- File 3: create_auto_complete_function.sql
CREATE OR REPLACE FUNCTION auto_complete_delivered_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET
    shipping_status = 'completed',
    updated_at = NOW()
  WHERE
    shipping_status = 'delivered'
    AND delivered_at IS NOT NULL
    AND delivered_at <= NOW() - INTERVAL '2 days'
    AND shipping_status != 'completed';
END;
$$;

GRANT EXECUTE ON FUNCTION auto_complete_delivered_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_complete_delivered_orders() TO service_role;
```

✅ **Database setup selesai!**

---

### 2️⃣ Setup Vercel Cron

#### A. Tambah Environment Variable

**Vercel Dashboard:**
1. Pilih project Anda
2. Settings → Environment Variables
3. Add:
   - Name: `CRON_SECRET`
   - Value: (generate random string panjang, misal: `my-super-secret-cron-key-2025`)
   - Environment: **All** (Production, Preview, Development)
4. Save

**Atau di `.env.local`:**
```env
CRON_SECRET=my-super-secret-cron-key-2025
```

#### B. Deploy

File sudah dibuat otomatis:
- ✅ `src/app/api/cron/auto-complete-orders/route.ts`
- ✅ `vercel.json`

Tinggal deploy:

```bash
git add .
git commit -m "Add auto-complete cron job"
git push
```

Atau deploy manual via Vercel Dashboard.

✅ **Vercel Cron setup selesai!**

---

### 3️⃣ Verify

#### Test Endpoint Manual:

```bash
curl https://your-domain.vercel.app/api/cron/auto-complete-orders \
  -H "Authorization: Bearer my-super-secret-cron-key-2025"
```

**Expected:**
```json
{
  "success": true,
  "message": "Auto-complete job executed successfully",
  "ordersProcessed": 0
}
```

#### Check Cron Jobs:

**Vercel Dashboard** → Project → Settings → Cron Jobs

Harus muncul:
- Path: `/api/cron/auto-complete-orders`
- Schedule: `0 * * * *` (every hour)

✅ **Sistem running!**

---

## 🎉 Done! Sistem Sudah Jalan

### Cara Kerja:
1. ✅ Order jadi `delivered` → `delivered_at` auto terisi (via trigger)
2. ✅ User lihat warning + countdown 2 hari
3. ✅ Setiap jam, Vercel Cron call endpoint
4. ✅ Endpoint check orders >2 hari → auto `completed`
5. ✅ Order pindah dari tab "Shipped" ke "Completed"

---

## 🧪 Test Sekarang

```sql
-- 1. Buat order delivered 3 hari lalu
UPDATE orders
SET status = 'delivered',
    shipping_status = 'Terkirim',
    delivered_at = NOW() - INTERVAL '3 days'
WHERE id = (SELECT id FROM orders LIMIT 1);

-- 2. Call endpoint (via curl atau browser)
-- https://your-domain.vercel.app/api/cron/auto-complete-orders

-- 3. Check result
SELECT id, status, delivered_at FROM orders LIMIT 5;
-- Harus ada yang status = 'completed'
```

---

## 📊 Monitoring

### View Logs:
**Vercel Dashboard** → Deployments → Functions → `/api/cron/auto-complete-orders`

### Expected Logs:
```
🕐 Auto-complete cron job started at 2025-11-10T...
✅ Auto-complete job completed. 2 orders processed.
```

---

## ❓ FAQ

**Q: Cron job jalan setiap kapan?**
A: Setiap jam, di menit 0 (misal: 01:00, 02:00, 03:00, dst)

**Q: Bisa ubah schedule?**
A: Ya, edit `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/auto-complete-orders",
    "schedule": "0 */6 * * *"  // Setiap 6 jam
  }]
}
```

**Q: Error "Unauthorized"?**
A: Check `CRON_SECRET` sudah di-set di Vercel Environment Variables dan sudah redeploy.

**Q: Orders tidak auto-complete?**
A:
1. Check Vercel cron logs
2. Test manual: `SELECT auto_complete_delivered_orders();`
3. Check order memang >2 hari: `SELECT * FROM orders WHERE delivered_at <= NOW() - INTERVAL '2 days';`

---

## 🎯 Next Steps

1. ✅ Setup database (DONE)
2. ✅ Setup Vercel Cron (DONE)
3. ✅ Deploy & test
4. 📊 Monitor logs untuk eksekusi pertama
5. 🎉 Enjoy automated system!

---

**Need Help?**
- Dokumentasi lengkap: `SETUP_CRON_WITHOUT_PG_CRON.md`
- Test queries: `test_manual_auto_complete.sql`
- Full guide: `AUTO_COMPLETE_DELIVERED_ORDERS_SETUP.md`
