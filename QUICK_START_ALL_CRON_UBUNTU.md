# Quick Start: Setup All Cron Jobs di Ubuntu

Setup lengkap untuk semua 3 cron jobs sekaligus di Ubuntu server.

---

## 📋 3 Cron Jobs yang Akan Di-Setup

1. **Auto-Complete Delivered Orders** - Complete orders 2 hari setelah delivered
2. **Auto-Cancel Pending Orders** - Cancel unpaid orders setelah 24 jam
3. **Cancel Expired Returns** - Cancel return requests yang expired

---

## 🚀 Quick Setup (5 Menit)

### Step 1: Generate CRON_SECRET

```bash
# Generate strong secret key
openssl rand -base64 32

# Output contoh: Kx8Jf3mP9qL2wN5vB7cD1eR4tY6uI8oP0aS2dF4gH6jK8lZ
```

Copy secret key ini untuk digunakan di step berikutnya.

---

### Step 2: Add CRON_SECRET to Environment

```bash
# Edit .env file di root project Next.js
nano .env
```

Tambahkan line berikut (ganti dengan secret key dari step 1):

```bash
CRON_SECRET=Kx8Jf3mP9qL2wN5vB7cD1eR4tY6uI8oP0aS2dF4gH6jK8lZ
```

Save (Ctrl+X, Y, Enter)

**Jika menggunakan PM2:**

```bash
# Edit ecosystem.config.js
nano ecosystem.config.js
```

Tambahkan di bagian `env`:

```javascript
env: {
  NODE_ENV: 'production',
  CRON_SECRET: 'Kx8Jf3mP9qL2wN5vB7cD1eR4tY6uI8oP0aS2dF4gH6jK8lZ',
  // ... other env vars
}
```

**Restart Next.js app:**

```bash
# Jika menggunakan PM2
pm2 restart all

# Jika menggunakan systemd
sudo systemctl restart your-app-name

# Jika running manual
# Stop process (Ctrl+C) dan start ulang:
npm run build && npm start
```

---

### Step 3: Create Cron Scripts Directory

```bash
# Create directory structure
mkdir -p ~/cron-scripts/logs

# Navigate to directory
cd ~/cron-scripts
```

---

### Step 4: Download/Create Cron Scripts

**Option A: Jika file sudah ada di project**

```bash
# Copy dari project ke cron-scripts directory
cp /path/to/project/auto-cancel-pending-orders.sh ~/cron-scripts/
cp /path/to/project/auto-complete-orders.sh ~/cron-scripts/  # jika ada
cp /path/to/project/cancel-expired-returns.sh ~/cron-scripts/  # jika ada
```

**Option B: Create manual**

Create 3 script files:

```bash
# 1. Auto-cancel pending orders
nano ~/cron-scripts/auto-cancel-pending-orders.sh
```

Paste script ini:

```bash
#!/bin/bash
DOMAIN="http://localhost:3000"  # GANTI!
CRON_SECRET="your-secret-here"  # GANTI!
LOG_FILE="$HOME/cron-scripts/logs/auto-cancel.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Starting auto-cancel pending orders cron"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DOMAIN}/api/cron/auto-cancel-pending-orders" \
  -H "Authorization: Bearer ${CRON_SECRET}" --max-time 30)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

log "HTTP Status: $HTTP_CODE"
log "Response: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    log "✅ Success"
else
    log "❌ Failed"
fi

log "========================================="
```

Save (Ctrl+X, Y, Enter)

```bash
# 2. Auto-complete orders
nano ~/cron-scripts/auto-complete-orders.sh
```

Paste script ini:

```bash
#!/bin/bash
DOMAIN="http://localhost:3000"  # GANTI!
CRON_SECRET="your-secret-here"  # GANTI!
LOG_FILE="$HOME/cron-scripts/logs/auto-complete.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Starting auto-complete orders cron"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DOMAIN}/api/cron/auto-complete-orders" \
  -H "Authorization: Bearer ${CRON_SECRET}" --max-time 30)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

log "HTTP Status: $HTTP_CODE"
log "Response: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    log "✅ Success"
else
    log "❌ Failed"
fi

log "========================================="
```

Save (Ctrl+X, Y, Enter)

```bash
# 3. Cancel expired returns
nano ~/cron-scripts/cancel-expired-returns.sh
```

Paste script ini:

```bash
#!/bin/bash
DOMAIN="http://localhost:3000"  # GANTI!
CRON_SECRET="your-secret-here"  # GANTI!
LOG_FILE="$HOME/cron-scripts/logs/cancel-returns.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Starting cancel expired returns cron"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${DOMAIN}/api/cron/cancel-expired-returns" \
  -H "Authorization: Bearer ${CRON_SECRET}" --max-time 30)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

log "HTTP Status: $HTTP_CODE"
log "Response: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    log "✅ Success"
else
    log "❌ Failed"
fi

log "========================================="
```

Save (Ctrl+X, Y, Enter)

---

### Step 5: Edit Script Configuration

Edit ketiga script dan ganti:

```bash
# Edit auto-cancel script
nano ~/cron-scripts/auto-cancel-pending-orders.sh

# Edit auto-complete script
nano ~/cron-scripts/auto-complete-orders.sh

# Edit cancel-returns script
nano ~/cron-scripts/cancel-expired-returns.sh
```

**Ganti di masing-masing script:**
- `DOMAIN="http://localhost:3000"` → Domain server (contoh: `https://meoris.com`)
- `CRON_SECRET="your-secret-here"` → Secret key dari Step 1

Save semua (Ctrl+X, Y, Enter)

---

### Step 6: Make Scripts Executable

```bash
# Set execute permission untuk semua scripts
chmod +x ~/cron-scripts/*.sh

# Verify permissions
ls -la ~/cron-scripts/*.sh
```

Expected output:
```
-rwxr-xr-x 1 user user ... auto-cancel-pending-orders.sh
-rwxr-xr-x 1 user user ... auto-complete-orders.sh
-rwxr-xr-x 1 user user ... cancel-expired-returns.sh
```

---

### Step 7: Test Scripts Manual

Test masing-masing script:

```bash
# Test auto-cancel
~/cron-scripts/auto-cancel-pending-orders.sh

# Test auto-complete
~/cron-scripts/auto-complete-orders.sh

# Test cancel-returns
~/cron-scripts/cancel-expired-returns.sh

# View logs
tail -n 20 ~/cron-scripts/logs/auto-cancel.log
tail -n 20 ~/cron-scripts/logs/auto-complete.log
tail -n 20 ~/cron-scripts/logs/cancel-returns.log
```

Expected log untuk setiap script:
```
[2025-01-16 10:00:00] =========================================
[2025-01-16 10:00:00] Starting ... cron
[2025-01-16 10:00:01] HTTP Status: 200
[2025-01-16 10:00:01] Response: {"success":true,...}
[2025-01-16 10:00:01] ✅ Success
[2025-01-16 10:00:01] =========================================
```

---

### Step 8: Add All to Crontab

```bash
# Open crontab editor
crontab -e
```

**Add these lines** di bagian bawah:

```bash
# ============================================
# Meoris E-commerce Cron Jobs
# ============================================

# Auto-complete delivered orders (every 1 hour)
0 * * * * /home/youruser/cron-scripts/auto-complete-orders.sh >> /home/youruser/cron-scripts/logs/auto-complete.log 2>&1

# Auto-cancel pending orders (every 1 hour)
0 * * * * /home/youruser/cron-scripts/auto-cancel-pending-orders.sh >> /home/youruser/cron-scripts/logs/auto-cancel.log 2>&1

# Cancel expired returns (every 6 hours)
0 */6 * * * /home/youruser/cron-scripts/cancel-expired-returns.sh >> /home/youruser/cron-scripts/logs/cancel-returns.log 2>&1
```

**IMPORTANT:** Ganti `/home/youruser/` dengan path home directory user:

```bash
# Get home directory path
echo $HOME

# Atau:
pwd
```

Save crontab (Ctrl+X, Y, Enter)

---

### Step 9: Verify Crontab

```bash
# List all cron jobs
crontab -l

# Check cron service status
sudo systemctl status cron

# If not running:
sudo systemctl start cron
sudo systemctl enable cron
```

---

## 📊 Monitoring

### View All Logs Real-Time

```bash
# Terminal 1: Auto-cancel logs
tail -f ~/cron-scripts/logs/auto-cancel.log

# Terminal 2: Auto-complete logs
tail -f ~/cron-scripts/logs/auto-complete.log

# Terminal 3: Cancel-returns logs
tail -f ~/cron-scripts/logs/cancel-returns.log
```

### View Combined Logs

```bash
# View all logs together
tail -f ~/cron-scripts/logs/*.log

# View last 50 lines from all logs
tail -n 50 ~/cron-scripts/logs/*.log
```

### Check Cron Execution History

```bash
# View system cron logs
sudo grep CRON /var/log/syslog | tail -30

# View cron executions for your user
sudo grep "$(whoami)" /var/log/syslog | grep CRON | tail -20
```

---

## 🧪 Testing

### Test Complete Flow

**1. Auto-Cancel Pending Orders:**

```sql
-- Di Supabase SQL Editor:
-- Create/backdate a pending order
UPDATE orders
SET created_at = NOW() - INTERVAL '25 hours'
WHERE status = 'pending'
LIMIT 1;
```

```bash
# Run cron manual
~/cron-scripts/auto-cancel-pending-orders.sh

# Check log
tail -20 ~/cron-scripts/logs/auto-cancel.log

# Verify in database - order should be cancelled
```

**2. Auto-Complete Delivered Orders:**

```sql
-- Backdate a delivered order
UPDATE orders
SET delivered_at = NOW() - INTERVAL '3 days'
WHERE status = 'delivered'
LIMIT 1;
```

```bash
# Run cron manual
~/cron-scripts/auto-complete-orders.sh

# Verify - order should be completed
```

**3. Cancel Expired Returns:**

```sql
-- Create expired return request
UPDATE returns
SET created_at = NOW() - INTERVAL '8 days'
WHERE status = 'pending'
LIMIT 1;
```

```bash
# Run cron manual
~/cron-scripts/cancel-expired-returns.sh

# Verify - return should be cancelled
```

---

## 📝 Cron Schedule Reference

| Schedule | Meaning | Example |
|----------|---------|---------|
| `0 * * * *` | Every hour at minute 0 | 00:00, 01:00, 02:00... |
| `*/30 * * * *` | Every 30 minutes | 00:00, 00:30, 01:00... |
| `0 */6 * * *` | Every 6 hours | 00:00, 06:00, 12:00, 18:00 |
| `0 2 * * *` | Every day at 2:00 AM | Daily at 02:00 |
| `0 0 * * 0` | Every Sunday at midnight | Weekly |

**Current Setup:**
- Auto-complete: `0 * * * *` (every hour)
- Auto-cancel: `0 * * * *` (every hour)
- Cancel-returns: `0 */6 * * *` (every 6 hours)

---

## 🔧 One-Line Setup Script (Advanced)

Untuk setup otomatis semua:

```bash
# Download dan run setup script (jika tersedia)
curl -s https://yourdomain.com/scripts/setup-cron.sh | bash

# Atau manual:
mkdir -p ~/cron-scripts/logs && \
cd ~/cron-scripts && \
echo "Scripts directory created. Now copy your .sh files here and edit DOMAIN + CRON_SECRET"
```

---

## ⚠️ Common Issues

### Issue: "Permission denied"

```bash
# Fix: Make scripts executable
chmod +x ~/cron-scripts/*.sh
```

### Issue: "401 Unauthorized"

- Check CRON_SECRET di script sama dengan .env
- Restart Next.js app setelah edit .env

### Issue: "Connection refused"

- Pastikan Next.js app running
- Check domain/port di script benar
- Test dengan: `curl http://localhost:3000/api/health`

### Issue: Cron not running

```bash
# Check cron service
sudo systemctl status cron

# Start if needed
sudo systemctl start cron

# Check crontab
crontab -l
```

### Issue: Script runs but no logs

```bash
# Check log directory exists
mkdir -p ~/cron-scripts/logs

# Check permissions
chmod 755 ~/cron-scripts/logs

# Check disk space
df -h
```

---

## 🎯 Final Checklist

✅ CRON_SECRET generated dan di-add ke .env
✅ Next.js app restarted dengan new env var
✅ Cron scripts directory created (`~/cron-scripts`)
✅ All 3 scripts created dan configured
✅ Scripts made executable (`chmod +x`)
✅ Scripts tested manually (all return HTTP 200)
✅ Crontab entries added
✅ Cron service running
✅ Logs appearing di `~/cron-scripts/logs/`
✅ Test flow completed successfully

---

## 📞 Quick Reference

```bash
# List cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Test all scripts
~/cron-scripts/auto-cancel-pending-orders.sh
~/cron-scripts/auto-complete-orders.sh
~/cron-scripts/cancel-expired-returns.sh

# View all logs
tail -f ~/cron-scripts/logs/*.log

# Check cron service
sudo systemctl status cron

# Check system cron logs
sudo grep CRON /var/log/syslog | tail -20
```

---

Setup selesai! Semua cron jobs akan berjalan otomatis sesuai schedule. 🎉

**Next hour cron will run at:** `$(date -d 'next hour' +'%H:00')`
