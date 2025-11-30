# Check Cron Job Status di Ubuntu Server

Panduan lengkap untuk memeriksa apakah cron job sudah berjalan di server Ubuntu.

## 🔍 Method 1: Check Crontab List (Paling Simple)

### Lihat Semua Cron Jobs Aktif
```bash
# SSH ke server Ubuntu
ssh user@your-server

# Lihat cron job untuk user saat ini
crontab -l
```

**Expected Output**:
```bash
# Meoris - Auto-cancel pending orders (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1

# Meoris - Auto-complete delivered orders (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/auto-complete-orders >> /var/log/meoris-cron.log 2>&1
```

**Jika Kosong atau Error**:
```
no crontab for user
```
→ Berarti cron job belum di-setup!

---

## 🔍 Method 2: Check Cron Service Status

### Cek Apakah Cron Daemon Berjalan
```bash
# Check cron service status
sudo systemctl status cron
```

**Expected Output (Running)**:
```
● cron.service - Regular background program processing daemon
   Loaded: loaded (/lib/systemd/system/cron.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2025-11-16 08:00:00 UTC; 2h ago
     Docs: man:cron(8)
 Main PID: 12345 (cron)
    Tasks: 1 (limit: 4915)
   Memory: 2.1M
   CGroup: /system.slice/cron.service
           └─12345 /usr/sbin/cron -f
```

**Key Indicators**:
- ✅ `Active: active (running)` → Cron berjalan
- ❌ `Active: inactive (dead)` → Cron tidak berjalan

**Jika Tidak Berjalan**:
```bash
# Start cron service
sudo systemctl start cron

# Enable on boot
sudo systemctl enable cron
```

---

## 🔍 Method 3: Check Cron Logs

### Lihat Log Execution dari Cron
```bash
# Check system cron logs (last 50 lines)
grep CRON /var/log/syslog | tail -50
```

**Expected Output**:
```
Nov 16 14:00:01 server CRON[12345]: (user) CMD (curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1)
Nov 16 15:00:01 server CRON[12346]: (user) CMD (curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1)
```

**Jika Tidak Ada Log**:
- Cron belum pernah dijalankan
- Atau cron job belum ter-setup

---

## 🔍 Method 4: Check Custom Log File

### Lihat Output dari Cron Job
```bash
# Check Meoris cron log file
cat /var/log/meoris-cron.log
```

**Expected Output**:
```json
{"success":true,"message":"Auto-cancel pending orders job executed successfully","ordersCancelled":0,"timestamp":"2025-11-16T14:00:01.123Z"}
{"success":true,"message":"Auto-cancel pending orders job executed successfully","ordersCancelled":1,"timestamp":"2025-11-16T15:00:01.456Z"}
```

**Jika File Tidak Ada**:
```bash
ls -lh /var/log/meoris-cron.log
```

Output:
```
ls: cannot access '/var/log/meoris-cron.log': No such file or directory
```
→ Cron job belum pernah berjalan atau file belum dibuat

---

## 🔍 Method 5: Monitor Real-time

### Monitor Cron Execution Real-time
```bash
# Terminal 1: Monitor log file
tail -f /var/log/meoris-cron.log

# Terminal 2: Monitor system log
tail -f /var/log/syslog | grep CRON
```

**Tunggu sampai jam bulat berikutnya** (e.g., 15:00, 16:00)

**Expected**: Output baru muncul saat cron berjalan

---

## ✅ Quick Verification Checklist

Jalankan commands berikut satu per satu:

```bash
# 1. Check cron installed
which cron
# Expected: /usr/sbin/cron

# 2. Check cron service
sudo systemctl status cron
# Expected: active (running)

# 3. Check crontab list
crontab -l
# Expected: 2 cron jobs untuk Meoris

# 4. Check recent cron execution
grep CRON /var/log/syslog | tail -20
# Expected: Recent executions

# 5. Check Meoris log file
cat /var/log/meoris-cron.log
# Expected: JSON responses

# 6. Check log file permissions
ls -lh /var/log/meoris-cron.log
# Expected: -rw-rw-rw- (writeable)

# 7. Check if app is running
pm2 status
# Expected: meoris-v3 online

# 8. Check if port 3000 is listening
netstat -tulpn | grep 3000
# Expected: LISTEN on port 3000
```

---

## 🔧 Troubleshooting

### Problem 1: Cron Job Tidak Ada
**Check**:
```bash
crontab -l
```

**If**: `no crontab for user`

**Solution**: Setup cron job
```bash
crontab -e

# Add these lines:
0 * * * * curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1
0 * * * * curl -s http://localhost:3000/api/cron/auto-complete-orders >> /var/log/meoris-cron.log 2>&1
```

---

### Problem 2: Cron Service Not Running
**Check**:
```bash
sudo systemctl status cron
```

**If**: `inactive (dead)`

**Solution**:
```bash
# Start cron
sudo systemctl start cron

# Enable on boot
sudo systemctl enable cron

# Verify
sudo systemctl status cron
```

---

### Problem 3: Log File Kosong
**Check**:
```bash
cat /var/log/meoris-cron.log
```

**If**: Empty or doesn't exist

**Possible Causes**:
1. Cron belum pernah berjalan (tunggu sampai jam bulat)
2. Permission denied
3. Endpoint tidak bisa diakses

**Solution**:
```bash
# Create log file manually
sudo touch /var/log/meoris-cron.log
sudo chmod 666 /var/log/meoris-cron.log

# Test endpoint manually
curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders

# If app not running
pm2 restart meoris-v3
```

---

### Problem 4: Endpoint Returns Error
**Test Manually**:
```bash
curl -v http://localhost:3000/api/cron/auto-cancel-pending-orders
```

**Common Errors**:

**Error: Connection refused**
```
curl: (7) Failed to connect to localhost port 3000: Connection refused
```
→ App tidak berjalan di port 3000

**Solution**:
```bash
pm2 status
pm2 restart meoris-v3
```

**Error: 401 Unauthorized**
```json
{"error":"Unauthorized"}
```
→ CRON_SECRET tidak sesuai

**Solution**: Check environment variable di server

---

### Problem 5: Wrong Timezone
**Check Server Time**:
```bash
date
timedatectl
```

**Expected**: Timezone sesuai (e.g., Asia/Jakarta)

**If Wrong**:
```bash
# Set timezone
sudo timedatectl set-timezone Asia/Jakarta

# Verify
timedatectl
```

**Note**: Cron menggunakan server timezone!

---

## 📊 Testing Cron Job

### Manual Test (Don't Wait for Schedule)
```bash
# Run the exact command that cron will run
curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1

# Check result
tail /var/log/meoris-cron.log
```

**Expected Output in Log**:
```json
{"success":true,"message":"Auto-cancel pending orders job executed successfully","ordersCancelled":0,"timestamp":"2025-11-16T15:30:01.123Z"}
```

---

## 🎯 Complete Verification Script

Save this as `check_cron.sh`:

```bash
#!/bin/bash

echo "=== Meoris Cron Job Verification ==="
echo ""

echo "1. Checking cron service..."
sudo systemctl status cron | grep Active
echo ""

echo "2. Checking crontab..."
crontab -l | grep meoris
echo ""

echo "3. Checking recent cron executions..."
grep CRON /var/log/syslog | grep "auto-cancel" | tail -5
echo ""

echo "4. Checking Meoris log file..."
if [ -f /var/log/meoris-cron.log ]; then
    echo "✅ Log file exists"
    echo "Last 5 entries:"
    tail -5 /var/log/meoris-cron.log
else
    echo "❌ Log file does not exist"
fi
echo ""

echo "5. Checking PM2 status..."
pm2 status | grep meoris
echo ""

echo "6. Testing endpoint..."
curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders
echo ""

echo "=== Verification Complete ==="
```

**Run**:
```bash
chmod +x check_cron.sh
./check_cron.sh
```

---

## 📝 Expected Results Summary

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Cron installed | `which cron` | `/usr/sbin/cron` |
| Cron running | `systemctl status cron` | `active (running)` |
| Jobs listed | `crontab -l` | 2+ cron jobs |
| Recent runs | `grep CRON /var/log/syslog` | Recent timestamps |
| Log file exists | `ls /var/log/meoris-cron.log` | File exists |
| Log has data | `cat /var/log/meoris-cron.log` | JSON responses |
| App running | `pm2 status` | `online` |
| Port listening | `netstat -tulpn \| grep 3000` | `LISTEN` |

---

## 🆘 Quick Fixes

### If Nothing Works

**Complete Reset**:
```bash
# 1. Remove existing crontab
crontab -r

# 2. Recreate log file
sudo rm /var/log/meoris-cron.log
sudo touch /var/log/meoris-cron.log
sudo chmod 666 /var/log/meoris-cron.log

# 3. Restart cron service
sudo systemctl restart cron

# 4. Re-add cron jobs
crontab -e
# Paste the cron jobs

# 5. Verify
crontab -l

# 6. Manual test
curl -s http://localhost:3000/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1

# 7. Check result
cat /var/log/meoris-cron.log
```

---

## 📞 Next Steps

After verification:

1. ✅ If cron is running → Monitor logs regularly
2. ❌ If cron is NOT running → Follow troubleshooting steps
3. ⚠️  If endpoint errors → Check PM2 and environment variables
4. 🕐 If waiting for first run → Monitor at next hour mark

---

Need help? Check:
- PM2 logs: `pm2 logs meoris-v3`
- Nginx logs: `tail -f /var/log/nginx/error.log`
- System logs: `journalctl -xe`
