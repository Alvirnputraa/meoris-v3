# Setup Auto-Complete TANPA pg_cron (Vercel Cron Alternative)

## ⚠️ Jika pg_cron Tidak Tersedia

Jika Anda mendapat error "schema cron does not exist", berarti pg_cron tidak tersedia di Supabase plan Anda. Gunakan solusi alternatif ini dengan **Vercel Cron**.

---

## 🚀 Setup dengan Vercel Cron

### Step 1: Tambahkan CRON_SECRET ke Environment Variables

1. **Buka Vercel Dashboard** → Pilih Project Anda
2. **Settings** → **Environment Variables**
3. **Tambahkan variable baru:**
   - **Key**: `CRON_SECRET`
   - **Value**: `your-random-secret-string-here` (buat string random yang kuat)
   - **Environment**: Production, Preview, Development (pilih semua)
4. **Save**

Atau tambahkan ke `.env.local`:
```env
CRON_SECRET=your-random-secret-string-here-make-it-long-and-secure
```

---

### Step 2: Deploy ke Vercel

File yang sudah dibuat:
- ✅ `src/app/api/cron/auto-complete-orders/route.ts` - API endpoint
- ✅ `vercel.json` - Konfigurasi cron job

Sekarang deploy:

```bash
git add .
git commit -m "Add auto-complete cron job endpoint"
git push

# Atau manual deploy via Vercel Dashboard
```

---

### Step 3: Verifikasi Cron Job Terdaftar

Setelah deploy:

1. **Buka Vercel Dashboard** → Project Anda
2. **Klik "Settings"** → **"Cron Jobs"**
3. **Harus muncul**:
   - Path: `/api/cron/auto-complete-orders`
   - Schedule: `0 * * * *` (setiap jam)

---

### Step 4: Test Endpoint Manual

Test endpoint sebelum cron job running:

```bash
curl -X GET https://your-domain.vercel.app/api/cron/auto-complete-orders \
  -H "Authorization: Bearer your-random-secret-string-here"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Auto-complete job executed successfully",
  "ordersProcessed": 0,
  "timestamp": "2025-11-10T..."
}
```

---

## 📊 Monitoring Vercel Cron

### Check Cron Execution Logs

1. **Vercel Dashboard** → Project
2. **Deployments** → Klik deployment terbaru
3. **Functions** → Cari `/api/cron/auto-complete-orders`
4. **View logs** untuk melihat execution history

### Expected Logs:
```
🕐 Auto-complete cron job started at 2025-11-10T...
✅ Auto-complete job completed. 2 orders processed.
```

---

## 🧪 Testing

### Test 1: Create Old Delivered Order
```sql
-- Buat order delivered 3 hari lalu
UPDATE orders
SET status = 'delivered',
    shipping_status = 'Terkirim',
    delivered_at = NOW() - INTERVAL '3 days'
WHERE id = 'YOUR_ORDER_ID';
```

### Test 2: Call Endpoint Manual
```bash
curl -X GET https://your-domain.vercel.app/api/cron/auto-complete-orders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test 3: Verify Order Completed
```sql
SELECT id, status, delivered_at, updated_at
FROM orders
WHERE id = 'YOUR_ORDER_ID';
-- Expected: status = 'completed'
```

---

## ⚙️ Konfigurasi Schedule

Edit `vercel.json` untuk ubah schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-complete-orders",
      "schedule": "0 */6 * * *"  // Setiap 6 jam
    }
  ]
}
```

**Cron Syntax Examples:**
- `0 * * * *` - Setiap jam (minute 0)
- `0 */6 * * *` - Setiap 6 jam
- `0 0 * * *` - Setiap hari jam 00:00
- `0 */4 * * *` - Setiap 4 jam

Setelah edit, commit & push untuk apply changes.

---

## 🔒 Security

**PENTING**: Endpoint ini protected dengan Authorization header.

Tanpa `CRON_SECRET` yang benar, request akan ditolak:
```json
{
  "error": "Unauthorized"
}
```

**Best Practices:**
1. ✅ Gunakan CRON_SECRET yang panjang & random
2. ✅ Jangan commit CRON_SECRET ke git
3. ✅ Set di Vercel Environment Variables
4. ✅ Rotate secret secara berkala

---

## 📈 Alternative: External Cron Services

Jika tidak pakai Vercel, bisa gunakan external cron service:

### Option A: cron-job.org (Free)
1. Daftar di https://cron-job.org
2. Create new cron job:
   - URL: `https://your-domain.com/api/cron/auto-complete-orders`
   - Schedule: Every hour
   - HTTP Method: GET
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option B: EasyCron
1. Daftar di https://www.easycron.com
2. Setup sama seperti di atas

### Option C: GitHub Actions
```yaml
# .github/workflows/auto-complete-orders.yml
name: Auto Complete Orders

on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  auto-complete:
    runs-on: ubuntu-latest
    steps:
      - name: Call auto-complete endpoint
        run: |
          curl -X GET https://your-domain.com/api/cron/auto-complete-orders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 🐛 Troubleshooting

### Error: "Unauthorized"
- ✅ Pastikan CRON_SECRET sudah di-set di Vercel Environment Variables
- ✅ Redeploy setelah tambah environment variable
- ✅ Check Authorization header format: `Bearer YOUR_SECRET`

### Error: "Server configuration error"
- ✅ CRON_SECRET tidak di-set di environment
- ✅ Tambahkan di Vercel Dashboard → Settings → Environment Variables

### Cron tidak running
- ✅ Check Vercel Dashboard → Settings → Cron Jobs
- ✅ Pastikan `vercel.json` sudah di-commit & pushed
- ✅ Redeploy project

### Orders tidak ter-complete
- ✅ Check logs di Vercel Functions
- ✅ Verify function `auto_complete_delivered_orders()` exists di database
- ✅ Test manual dengan curl command

---

## ✅ Checklist

- [ ] File `route.ts` sudah dibuat
- [ ] File `vercel.json` sudah dibuat
- [ ] `CRON_SECRET` added to Vercel Environment Variables
- [ ] Deployed ke Vercel
- [ ] Cron job muncul di Vercel Dashboard
- [ ] Test manual endpoint berhasil
- [ ] Monitoring logs untuk execution pertama

---

## 📞 Support

Jika masih ada masalah:
1. Check Vercel deployment logs
2. Check function logs di Vercel Functions tab
3. Verify database function exists: `SELECT auto_complete_delivered_orders();`
4. Test endpoint manual dengan curl

---

**Status**: ✅ Ready for Production (Alternative to pg_cron)
**Last Updated**: 2025-11-10
