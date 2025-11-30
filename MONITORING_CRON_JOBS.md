# 📊 Monitoring Cron Jobs - Meoris

## 1️⃣ Vercel Dashboard (Web UI)

### **A. Melihat Logs Real-time**

1. **Login ke Vercel**
   - Buka: https://vercel.com/dashboard
   - Login dengan akun yang deploy project meoris

2. **Pilih Project**
   - Klik project **meoris**

3. **Buka Logs**
   - Klik tab **"Logs"** di sidebar
   - Atau URL langsung: `https://vercel.com/[username]/meoris/logs`

4. **Filter Logs Cron**
   - Di kolom search, ketik: `/api/cron/auto-cancel-pending-orders`
   - Atau filter by: `auto-cancel`

### **B. Cek Cron Job Status**

1. **Buka Settings → Cron Jobs**
   - Dashboard → Project → Settings → Cron Jobs
   - Lihat status: ✅ Active / ❌ Disabled

2. **Cek Last Execution**
   - Vercel akan menampilkan:
     - Last run time
     - Next scheduled run
     - Success/Error count

---

## 2️⃣ Vercel CLI

### **Install Vercel CLI**

```bash
# Windows (PowerShell/CMD)
npm install -g vercel

# Linux/Mac
npm install -g vercel
# atau
sudo npm install -g vercel
```

### **Login to Vercel**

```bash
vercel login
```

### **View Logs (Live Streaming)**

```bash
# Follow all logs (real-time)
vercel logs --follow

# Filter by function name
vercel logs --follow | grep "auto-cancel"

# View last 100 logs
vercel logs --output=100

# View logs for specific deployment
vercel logs [deployment-url]
```

### **List Deployments**

```bash
# List all deployments
vercel ls

# Get info about latest deployment
vercel inspect
```

---

## 3️⃣ Manual Test Cron Endpoint

### **Via Browser**
Buka URL ini (akan return 401 jika CRON_SECRET tidak match):
```
https://meoris.id/api/cron/auto-cancel-pending-orders
```

### **Via cURL (Windows)**

```powershell
# Tanpa auth (test endpoint availability)
curl https://meoris.id/api/cron/auto-cancel-pending-orders

# Dengan CRON_SECRET (production test)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://meoris.id/api/cron/auto-cancel-pending-orders
```

### **Via cURL (Linux/Mac)**

```bash
# Tanpa auth
curl https://meoris.id/api/cron/auto-cancel-pending-orders

# Dengan CRON_SECRET
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://meoris.id/api/cron/auto-cancel-pending-orders
```

### **Expected Response**

**✅ Success:**
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 1,
  "timestamp": "2025-11-17T04:15:00.000Z"
}
```

**❌ Error:**
```json
{
  "error": "Unauthorized",
  "timestamp": "2025-11-17T04:15:00.000Z"
}
```

---

## 4️⃣ Database Logs (Supabase)

### **Cek Function Execution Logs**

Jalankan di **Supabase SQL Editor**:

```sql
-- Cek apakah function pernah dijalankan (dari NOTICE logs)
-- Note: PostgreSQL logs biasanya tidak persist, tapi bisa cek via pgAdmin

-- Alternatif: Cek berdasarkan updated orders
SELECT
  id,
  payment_reference,
  status,
  updated_at AT TIME ZONE 'Asia/Jakarta' AS cancelled_at_wib
FROM checkout_submissions
WHERE
  status = 'cancelled'
  AND updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- Cek notifications yang dibuat oleh auto-cancel
SELECT
  id,
  user_id,
  title,
  message,
  type,
  created_at AT TIME ZONE 'Asia/Jakarta' AS created_wib
FROM notifications
WHERE
  type = 'order_cancelled'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 5️⃣ Create Custom Logging (Recommended)

### **Add Logging Table**

```sql
-- Create cron_logs table untuk tracking executions
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name TEXT NOT NULL,
  execution_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL, -- 'success' or 'error'
  orders_cancelled INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- Grant access to service_role
GRANT ALL ON cron_logs TO service_role;

-- Create index
CREATE INDEX idx_cron_logs_execution ON cron_logs(execution_time DESC);
CREATE INDEX idx_cron_logs_cron_name ON cron_logs(cron_name);
```

### **Update API Route to Log Executions**

Edit file: `src/app/api/cron/auto-cancel-pending-orders/route.ts`

Tambahkan logging setelah execution:

```typescript
// After calling auto_cancel_pending_orders()
const { data, error } = await supabaseAdmin.rpc('auto_cancel_pending_orders');

// Log execution
await supabaseAdmin.from('cron_logs').insert({
  cron_name: 'auto-cancel-pending-orders',
  execution_time: new Date().toISOString(),
  status: error ? 'error' : 'success',
  orders_cancelled: affectedCount || 0,
  error_message: error?.message || null
});
```

### **Query Cron Logs**

```sql
-- Lihat semua executions hari ini
SELECT
  cron_name,
  execution_time AT TIME ZONE 'Asia/Jakarta' AS execution_wib,
  status,
  orders_cancelled,
  error_message
FROM cron_logs
WHERE execution_time >= CURRENT_DATE
ORDER BY execution_time DESC;

-- Count executions per hour
SELECT
  DATE_TRUNC('hour', execution_time AT TIME ZONE 'Asia/Jakarta') AS hour,
  COUNT(*) AS executions,
  SUM(orders_cancelled) AS total_cancelled,
  COUNT(CASE WHEN status = 'error' THEN 1 END) AS errors
FROM cron_logs
WHERE cron_name = 'auto-cancel-pending-orders'
  AND execution_time >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', execution_time AT TIME ZONE 'Asia/Jakarta')
ORDER BY hour DESC;
```

---

## 6️⃣ Troubleshooting

### **Cron Job Tidak Berjalan?**

1. **Cek vercel.json sudah di-deploy**
   ```bash
   # Check latest deployment
   vercel ls

   # Inspect deployment
   vercel inspect [deployment-url]
   ```

2. **Cek CRON_SECRET di Environment Variables**
   - Dashboard → Project → Settings → Environment Variables
   - Pastikan `CRON_SECRET` sudah di-set

3. **Test manual trigger**
   ```bash
   curl https://meoris.id/api/cron/auto-cancel-pending-orders
   ```

4. **Cek Vercel Logs untuk error**
   ```bash
   vercel logs --follow | grep "error\|Error\|ERROR"
   ```

### **Function Error?**

```sql
-- Test function directly di Supabase
SELECT * FROM auto_cancel_pending_orders();

-- Cek error message
-- Jika ada error, akan muncul di output
```

---

## 7️⃣ Monitoring Checklist

### **Daily Checks:**
- [ ] Cek Vercel Logs untuk executions
- [ ] Cek database: ada orders yang di-cancel?
- [ ] Cek notifications: ada notif yang dibuat?

### **Weekly Checks:**
- [ ] Review cron execution count (should be ~1000/week for every 10 min)
- [ ] Check for any failed executions
- [ ] Verify no stuck orders in 'submitted' status

### **Alerts to Setup:**
- [ ] Email alert jika cron failed > 3x berturut-turut
- [ ] Slack notification untuk setiap auto-cancel
- [ ] Daily summary: berapa order di-cancel hari ini

---

## 📞 Quick Commands Reference

```bash
# View logs real-time
vercel logs --follow

# Test cron endpoint
curl https://meoris.id/api/cron/auto-cancel-pending-orders

# Check deployments
vercel ls

# Check latest deployment details
vercel inspect

# Deploy new version
vercel --prod
```

---

**Last Updated**: 2025-11-17
**Cron Schedule**: Every 10 minutes (`*/10 * * * *`)
