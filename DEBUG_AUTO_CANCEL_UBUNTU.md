# 🔍 DEBUG: Auto-Cancel Tidak Berjalan

## ❌ MASALAH
- Order dengan deadline **17 November 2025 pukul 11:00**
- Sekarang sudah lewat **11:22**
- Order masih status `submitted`, **tidak di-cancel otomatis**
- Cron job sudah di-set tiap 10 menit

## 🔎 DEBUGGING STEPS

### **STEP 1: Cek Logs Cron**

Jalankan di Ubuntu server:

```bash
# Lihat logs terakhir
tail -n 50 /var/log/meoris-cron.log
```

**Yang Perlu Dicek:**
- ❓ Apakah ada output/response?
- ❓ Apakah ada error message?
- ❓ Apakah ada response `{"success":true,...}`?

**Kemungkinan:**

**A. Jika logs KOSONG atau tidak ada execution:**
→ Cron job tidak jalan sama sekali
→ Lanjut ke STEP 2

**B. Jika ada error `Connection refused` atau `Failed to connect`:**
→ Server tidak running di port 3005
→ Lanjut ke STEP 4

**C. Jika ada error `401 Unauthorized`:**
→ CRON_SECRET tidak match
→ Lanjut ke STEP 5

**D. Jika ada response `{"success":true,"ordersCancelled":0}`:**
→ API jalan tapi SQL function bermasalah
→ Lanjut ke STEP 6

---

### **STEP 2: Cek Apakah Cron Service Running**

```bash
# Cek status cron
systemctl status cron

# Cek apakah cron job ada di crontab
crontab -l
```

**Expected:**
- Cron service: ✅ `active (running)`
- Crontab ada entry: `*/10 * * * * curl...`

**Jika cron tidak running:**
```bash
sudo systemctl start cron
sudo systemctl enable cron
```

---

### **STEP 3: Manual Test API Endpoint**

```bash
# Test manual
curl -v http://localhost:3005/api/cron/auto-cancel-pending-orders
```

**Kemungkinan Response:**

**A. Connection Refused:**
```
curl: (7) Failed to connect to localhost port 3005: Connection refused
```
→ Server tidak running! Lanjut ke STEP 4

**B. HTTP 401 Unauthorized:**
```json
{"error":"Unauthorized"}
```
→ Normal! API butuh CRON_SECRET header
→ Tapi artinya server **JALAN**
→ Lanjut test dengan auth: STEP 5

**C. HTTP 200 Success:**
```json
{"success":true,"ordersCancelled":1,...}
```
→ API jalan! Cek database apakah order berubah status

**D. HTTP 500 Error:**
```json
{"error":"auto_cancel_pending_orders is not defined"}
```
→ SQL function belum dibuat! Lanjut STEP 6

---

### **STEP 4: Cek Apakah Server Running**

```bash
# Cek port 3005
netstat -tulpn | grep 3005

# Atau
lsof -i :3005

# Cek process Node.js
ps aux | grep node
```

**Jika tidak ada output:**
→ Server **TIDAK RUNNING**!

**Solusi:**
```bash
# Masuk ke directory project
cd /path/to/meoris-v3-main

# Jalankan server
npm run build
npm run start

# Atau dengan PM2
pm2 start npm --name "meoris" -- start
pm2 save
pm2 startup
```

---

### **STEP 5: Test dengan CRON_SECRET**

Jika API return 401, artinya butuh auth header.

**Check CRON_SECRET di .env:**
```bash
cat .env | grep CRON_SECRET
```

**Test dengan auth:**
```bash
# Ganti YOUR_SECRET dengan CRON_SECRET dari .env
curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:3005/api/cron/auto-cancel-pending-orders
```

**Expected Response:**
```json
{"success":true,"ordersCancelled":1,"timestamp":"..."}
```

**Jika masih 401:**
→ CRON_SECRET di .env tidak match dengan yang di code
→ Cek file `src/app/api/cron/auto-cancel-pending-orders/route.ts`

---

### **STEP 6: Cek SQL Function di Database**

Buka **Supabase SQL Editor**, jalankan:

```sql
-- 1. Cek apakah function exists
SELECT proname
FROM pg_proc
WHERE proname = 'auto_cancel_pending_orders';
```

**Jika hasil KOSONG (function tidak ada):**

→ **SOLUSI:** Apply SQL function

1. Buka file: `fix_auto_cancel_pending_orders.sql`
2. Copy SEMUA isinya
3. Paste di Supabase SQL Editor
4. Run
5. Test lagi

---

### **STEP 7: Manual Trigger SQL Function**

Setelah function di-apply, test langsung di database:

```sql
-- Test manual trigger
SELECT * FROM auto_cancel_pending_orders();
```

**Expected Output:**
```
cancelled_count
---------------
1
```

**Cek apakah order berubah status:**
```sql
SELECT
  payment_reference,
  status,
  updated_at AT TIME ZONE 'Asia/Jakarta' AS updated_wib
FROM checkout_submissions
WHERE payment_reference = 'DEV-T44456309244UZ9WI';
```

**Expected:**
- `status`: `cancelled` ✅
- `updated_at`: Timestamp terbaru

---

### **STEP 8: Cek Notification**

```sql
SELECT
  title,
  message,
  created_at AT TIME ZONE 'Asia/Jakarta' AS created_wib
FROM notifications
WHERE message LIKE '%DEV-T44456309244UZ9WI%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** Ada notification baru dengan title "Pesanan dibatalkan"

---

## 🎯 QUICK FIX CHECKLIST

Jalankan command ini satu per satu di Ubuntu:

```bash
# 1. Cek logs
echo "=== LOGS ===" && tail -n 20 /var/log/meoris-cron.log

# 2. Cek cron service
echo "=== CRON STATUS ===" && systemctl is-active cron

# 3. Cek server running
echo "=== PORT 3005 ===" && netstat -tulpn | grep 3005

# 4. Test API
echo "=== API TEST ===" && curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders

# 5. Cek crontab
echo "=== CRONTAB ===" && crontab -l | grep auto-cancel
```

---

## 📊 HASIL YANG HARUS DICEK

Tolong screenshot/copy-paste hasil dari command ini:

```bash
# All-in-one debug
echo "=== 1. LOGS (Last 20 lines) ==="
tail -n 20 /var/log/meoris-cron.log
echo ""

echo "=== 2. CRON SERVICE ==="
systemctl is-active cron
echo ""

echo "=== 3. SERVER PORT 3005 ==="
netstat -tulpn | grep 3005
echo ""

echo "=== 4. API TEST ==="
curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders
echo ""

echo "=== 5. CRONTAB ==="
crontab -l | grep auto-cancel
echo ""

echo "DONE!"
```

Copy semua output-nya ke sini!
