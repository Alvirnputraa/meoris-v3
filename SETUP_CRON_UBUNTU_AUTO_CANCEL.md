# Setup Cron Job Auto-Cancel di Ubuntu Server

Guide untuk setup cron job auto-cancel pending orders di Ubuntu server.

---

## 📋 Prerequisites

1. Next.js app sudah running di Ubuntu server
2. SQL function `auto_cancel_pending_orders()` sudah di-apply di Supabase
3. Environment variable `CRON_SECRET` sudah di-set
4. Domain/IP server sudah accessible

---

## 🔧 Step-by-Step Setup

### Step 1: Verify CRON_SECRET Environment Variable

Pastikan `CRON_SECRET` sudah ada di environment variables server:

```bash
# Jika menggunakan .env file
cat .env | grep CRON_SECRET

# Jika menggunakan PM2 ecosystem file
cat ecosystem.config.js | grep CRON_SECRET
```

Jika belum ada, tambahkan:

```bash
# Edit .env file
nano .env

# Tambahkan:
CRON_SECRET=your-super-secret-key-here

# Save (Ctrl+X, Y, Enter)
```

**PENTING**: Gunakan secret key yang kuat! Generate dengan:
```bash
# Generate random secret key
openssl rand -base64 32
```

---

### Step 2: Test API Endpoint Manual

Sebelum setup cron, test dulu endpoint nya berfungsi:

```bash
# Ganti YOUR_DOMAIN dengan domain/IP server
# Ganti YOUR_SECRET_KEY dengan CRON_SECRET yang ada di .env

curl -X GET https://YOUR_DOMAIN/api/cron/auto-cancel-pending-orders \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -v

# Contoh untuk localhost:
curl -X GET http://localhost:3000/api/cron/auto-cancel-pending-orders \
  -H "Authorization: Bearer your-super-secret-key-here" \
  -v
```

Expected response:
```json
{
  "success": true,
  "message": "Auto-cancel pending orders job executed successfully",
  "ordersCancelled": 0,
  "timestamp": "2025-01-16T10:00:00.000Z"
}
```

---

### Step 3: Create Cron Job Script

Buat script bash untuk dipanggil oleh cron:

```bash
# Create directory untuk cron scripts
mkdir -p ~/cron-scripts

# Create script file
nano ~/cron-scripts/auto-cancel-pending-orders.sh
```

Isi script:

```bash
#!/bin/bash

# ============================================
# Auto-Cancel Pending Orders Cron Script
# ============================================

# Configuration
DOMAIN="https://yourdomain.com"  # Ganti dengan domain server
CRON_SECRET="your-super-secret-key-here"  # Ganti dengan CRON_SECRET dari .env
LOG_FILE="/home/youruser/cron-scripts/logs/auto-cancel.log"  # Path log file

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start
log "========================================="
log "Starting auto-cancel pending orders cron job"

# Call API endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DOMAIN}/api/cron/auto-cancel-pending-orders" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (all lines except last)
BODY=$(echo "$RESPONSE" | sed '$d')

# Log response
log "HTTP Status: $HTTP_CODE"
log "Response: $BODY"

# Check if successful
if [ "$HTTP_CODE" -eq 200 ]; then
    log "✅ Cron job completed successfully"
else
    log "❌ Cron job failed with HTTP $HTTP_CODE"
fi

log "========================================="
```

**Save dan set permissions:**

```bash
# Save file (Ctrl+X, Y, Enter)

# Make executable
chmod +x ~/cron-scripts/auto-cancel-pending-orders.sh
```

---

### Step 4: Edit Script Configuration

Edit script dan ganti variable berikut:

```bash
nano ~/cron-scripts/auto-cancel-pending-orders.sh
```

Ganti:
- `DOMAIN` → Domain atau IP server (contoh: `https://meoris.com` atau `http://localhost:3000`)
- `CRON_SECRET` → Secret key dari environment variable
- `/home/youruser/` → Path home directory user

**Save** (Ctrl+X, Y, Enter)

---

### Step 5: Test Script Manual

Test script sebelum add ke cron:

```bash
# Run script manual
~/cron-scripts/auto-cancel-pending-orders.sh

# Check log
cat ~/cron-scripts/logs/auto-cancel.log
```

Expected log output:
```
[2025-01-16 10:00:00] =========================================
[2025-01-16 10:00:00] Starting auto-cancel pending orders cron job
[2025-01-16 10:00:01] HTTP Status: 200
[2025-01-16 10:00:01] Response: {"success":true,"message":"Auto-cancel pending orders job executed successfully","ordersCancelled":0,"timestamp":"2025-01-16T10:00:01.000Z"}
[2025-01-16 10:00:01] ✅ Cron job completed successfully
[2025-01-16 10:00:01] =========================================
```

---

### Step 6: Add to Crontab

Setup cron job untuk running setiap jam:

```bash
# Open crontab editor
crontab -e
```

**Add this line** di bagian bawah file:

```bash
# Auto-cancel pending orders - every hour at minute 0
0 * * * * /home/youruser/cron-scripts/auto-cancel-pending-orders.sh >> /home/youruser/cron-scripts/logs/auto-cancel.log 2>&1
```

**Explanation:**
- `0 * * * *` = Every hour at minute 0 (00:00, 01:00, 02:00, etc.)
- `/home/youruser/cron-scripts/auto-cancel-pending-orders.sh` = Script path (ganti `youruser`)
- `>> .../auto-cancel.log 2>&1` = Append output to log file

**Alternative schedules:**

```bash
# Every hour at minute 0
0 * * * * /path/to/script.sh

# Every 2 hours
0 */2 * * * /path/to/script.sh

# Every 30 minutes
*/30 * * * * /path/to/script.sh

# Every day at 2:00 AM
0 2 * * * /path/to/script.sh
```

**Save** crontab (Ctrl+X, Y, Enter)

---

### Step 7: Verify Cron Job is Active

```bash
# List all cron jobs for current user
crontab -l

# Check cron service status
sudo systemctl status cron

# If cron not running, start it:
sudo systemctl start cron
sudo systemctl enable cron
```

---

## 📊 Monitoring & Logs

### View Live Logs

```bash
# Tail log file (real-time monitoring)
tail -f ~/cron-scripts/logs/auto-cancel.log

# View last 50 lines
tail -n 50 ~/cron-scripts/logs/auto-cancel.log

# View all logs
cat ~/cron-scripts/logs/auto-cancel.log
```

### Check if Cron is Running

```bash
# Check cron daemon status
sudo systemctl status cron

# View cron logs
sudo grep CRON /var/log/syslog | tail -20
```

### Log Rotation (Optional)

Agar log file tidak terlalu besar:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/auto-cancel-cron
```

Isi:
```
/home/youruser/cron-scripts/logs/auto-cancel.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

---

## 🧪 Testing

### 1. Create Test Pending Order

Buat order baru melalui checkout, jangan bayar (status: pending)

### 2. Backdate Order

Connect ke Supabase dan run SQL:

```sql
-- Backdate order ke 25 jam yang lalu
UPDATE orders
SET created_at = NOW() - INTERVAL '25 hours'
WHERE id = 'ORDER_ID_HERE'
AND status = 'pending';
```

### 3. Trigger Cron Manual

```bash
# Run script manual
~/cron-scripts/auto-cancel-pending-orders.sh

# Check log
tail -f ~/cron-scripts/logs/auto-cancel.log
```

### 4. Verify Results

Check di database:
```sql
-- Check order status
SELECT id, status, created_at, updated_at
FROM orders
WHERE id = 'ORDER_ID_HERE';

-- Check notification
SELECT * FROM notifications
WHERE order_id = 'ORDER_ID_HERE'
AND type = 'order_cancelled'
ORDER BY created_at DESC
LIMIT 1;
```

Check di browser:
1. Login sebagai user
2. Buka: `https://yourdomain.com/user/purchase?view=notifications`
3. Harus ada notification: "Pesanan dibatalkan - Pesanan anda dengan id pesanan X telah dibatalkan."

---

## 🔄 Complete Cron Jobs Summary

Setelah setup ini selesai, total cron jobs di server:

| Cron Job | Path | Schedule | Purpose |
|----------|------|----------|---------|
| Auto Complete | `/api/cron/auto-complete-orders` | Every 1 hour | Complete delivered orders after 2 days |
| **Auto Cancel Pending** | `/api/cron/auto-cancel-pending-orders` | **Every 1 hour** | **Cancel unpaid orders after 1 day** |
| Cancel Expired Returns | `/api/cron/cancel-expired-returns` | Every 6 hours | Cancel return requests after expiry |

Setup semua dengan cara yang sama seperti di atas.

---

## ⚠️ Troubleshooting

### Problem: Cron not running

```bash
# Check if cron service is active
sudo systemctl status cron

# Start cron if not running
sudo systemctl start cron

# Enable auto-start on boot
sudo systemctl enable cron

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON
```

### Problem: Permission denied

```bash
# Make script executable
chmod +x ~/cron-scripts/auto-cancel-pending-orders.sh

# Check script ownership
ls -la ~/cron-scripts/auto-cancel-pending-orders.sh
```

### Problem: Script not found

```bash
# Use absolute path in crontab
# Instead of: ~/cron-scripts/script.sh
# Use: /home/username/cron-scripts/script.sh

# Get full path:
readlink -f ~/cron-scripts/auto-cancel-pending-orders.sh
```

### Problem: 401 Unauthorized

- Check CRON_SECRET di script match dengan .env
- Verify environment variable loaded di Next.js app
- Test manual dengan curl

### Problem: 500 Error

- Check Next.js app logs
- Verify SQL function exists in Supabase
- Check database connection

### Problem: No logs appearing

```bash
# Check log directory exists
mkdir -p ~/cron-scripts/logs

# Check permissions
chmod 755 ~/cron-scripts/logs

# Test write permission
echo "test" >> ~/cron-scripts/logs/auto-cancel.log
```

---

## 🎯 Success Checklist

✅ CRON_SECRET environment variable configured
✅ Bash script created and executable
✅ Script tested manually (returns HTTP 200)
✅ Crontab entry added (runs every hour)
✅ Cron service is running
✅ Logs are being written
✅ Test order cancelled successfully
✅ Notification appears for user

---

## 📝 Quick Reference Commands

```bash
# List cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Remove all cron jobs (DANGER!)
crontab -r

# Test script manual
~/cron-scripts/auto-cancel-pending-orders.sh

# View logs
tail -f ~/cron-scripts/logs/auto-cancel.log

# Check cron service
sudo systemctl status cron

# Restart cron service
sudo systemctl restart cron
```

---

Setup selesai! Cron job akan berjalan otomatis setiap jam untuk cancel pending orders yang sudah lebih dari 24 jam. 🎉
