# ⏰ Cron Job Setup Guide - Ubuntu Server

Panduan lengkap setup cron job untuk auto-cancel expired returns dan auto-complete delivered orders di server Ubuntu.

## 📋 Overview

Cron jobs yang akan di-setup:
1. **Auto-cancel expired returns** - Run setiap jam
2. **Auto-complete delivered orders** - Run setiap jam

## 🚀 Step-by-Step Setup

### Step 1: Create Log File

```bash
# SSH ke server Ubuntu
ssh user@your-server

# Create log file untuk menyimpan output cron
sudo touch /var/log/meoris-cron.log

# Set permission agar cron bisa write
sudo chmod 666 /var/log/meoris-cron.log

# Verify file created
ls -lh /var/log/meoris-cron.log
```

**Expected output:**
```
-rw-rw-rw- 1 root root 0 Nov 11 17:00 /var/log/meoris-cron.log
```

---

### Step 2: Test API Endpoints

**PENTING:** Test manual dulu sebelum setup cron!

```bash
# Test endpoint 1: Cancel expired returns
curl http://localhost:3000/api/cron/cancel-expired-returns

# Test endpoint 2: Auto-complete orders
curl http://localhost:3000/api/cron/auto-complete-orders
```

**Expected response (jika tidak ada yang expired):**
```json
{"success":true,"message":"No expired returns to cancel","expired":0}
```

**Expected response (jika ada yang expired):**
```json
{"success":true,"message":"Successfully processed 1 expired returns","expired":1,"cancelled":1,"ordersCompleted":1}
```

**Jika error:**
- Check PM2 running: `pm2 status`
- Check port 3000: `netstat -tulpn | grep 3000`
- Check logs: `pm2 logs meoris-v3`

---

### Step 3: Open Crontab Editor

```bash
# Edit crontab
crontab -e
```

**Jika pertama kali**, akan muncul pilihan editor:
```
Select an editor.  To change later, run 'select-editor'.
  1. /bin/nano        <---- easiest
  2. /usr/bin/vim.basic
  3. /usr/bin/vim.tiny
  4. /bin/ed

Choose 1-4 [1]:
```

**Pilih 1** (nano - paling mudah)

---

### Step 4: Add Cron Jobs

Editor nano akan terbuka. **Scroll ke akhir file** dan tambahkan:

```bash
# Meoris - Auto-cancel expired returns (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/cancel-expired-returns >> /var/log/meoris-cron.log 2>&1

# Meoris - Auto-complete delivered orders (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/auto-complete-orders >> /var/log/meoris-cron.log 2>&1
```

**Penjelasan format:**
```
0 * * * * - Run setiap jam di menit :00
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 or 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)

Contoh lain:
0 * * * *     - Every hour at :00
*/30 * * * *  - Every 30 minutes
0 */2 * * *   - Every 2 hours
0 8 * * *     - Every day at 8:00 AM
```

**Penjelasan command:**
```bash
curl -s                                              # Silent mode (no progress bar)
http://localhost:3000/api/cron/cancel-expired-returns  # Endpoint
>> /var/log/meoris-cron.log                          # Append output to log
2>&1                                                 # Redirect errors to same log
```

---

### Step 5: Save & Exit

**Di nano editor:**
1. Press `Ctrl + X` (Exit)
2. Press `Y` (Yes, save changes)
3. Press `Enter` (Confirm filename)

**Expected message:**
```
crontab: installing new crontab
```

---

### Step 6: Verify Cron Installation

```bash
# List installed cron jobs
crontab -l
```

**Expected output:**
```bash
# Edit this file to introduce tasks to be run by cron.
#
# ... (header comments) ...
#
# m h  dom mon dow   command
# Meoris - Auto-cancel expired returns (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/cancel-expired-returns >> /var/log/meoris-cron.log 2>&1

# Meoris - Auto-complete delivered orders (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/auto-complete-orders >> /var/log/meoris-cron.log 2>&1
```

---

### Step 7: Verify Cron Daemon Running

```bash
# Check cron service status
systemctl status cron

# Or
service cron status
```

**Expected output:**
```
● cron.service - Regular background program processing daemon
   Loaded: loaded (/lib/systemd/system/cron.service; enabled; vendor preset: enabled)
   Active: active (running) since ...
```

**Jika not running:**
```bash
# Start cron
sudo systemctl start cron

# Enable on boot
sudo systemctl enable cron
```

---

### Step 8: Monitor Cron Execution

#### Option 1: Monitor Log File (Recommended)

```bash
# Real-time monitoring (keep terminal open)
tail -f /var/log/meoris-cron.log
```

Tunggu sampai jam bulat berikutnya (misal sekarang 17:15, tunggu sampai 18:00).
Pas jam 18:00, output akan muncul di terminal!

#### Option 2: Check System Logs

```bash
# Check system cron logs
grep CRON /var/log/syslog | tail -20

# Or with journalctl
journalctl -u cron -f
```

#### Option 3: View Log File

```bash
# View all logs
cat /var/log/meoris-cron.log

# View last 20 lines
tail -20 /var/log/meoris-cron.log

# View with timestamps
tail -20 /var/log/meoris-cron.log | while read line; do echo "$(date): $line"; done
```

---

### Step 9: Test Manual Execution

Tidak perlu tunggu jam :00, test manual sekarang:

```bash
# Trigger manual
curl -s http://localhost:3000/api/cron/cancel-expired-returns

# Check response
# Should show JSON with success message
```

**Write to log manually:**
```bash
# Test write to log file
curl -s http://localhost:3000/api/cron/cancel-expired-returns >> /var/log/meoris-cron.log 2>&1

# Check log
cat /var/log/meoris-cron.log
```

---

## 🔍 Troubleshooting

### Cron Jobs Not Running

**1. Check crontab installed:**
```bash
crontab -l
```

**2. Check cron daemon:**
```bash
systemctl status cron
```

**3. Check system time:**
```bash
date
# Make sure time is correct
```

**4. Check timezone:**
```bash
timedatectl
# Cron uses system timezone
```

**5. Check cron execution in syslog:**
```bash
grep CRON /var/log/syslog | tail -50
```

---

### Log File Not Created

**Problem:** Cron runs but no output in log file

**Solution:**
```bash
# Create log file
sudo touch /var/log/meoris-cron.log

# Set correct permissions
sudo chmod 666 /var/log/meoris-cron.log

# Verify
ls -lh /var/log/meoris-cron.log
```

---

### Endpoint Returns Error

**Test endpoint manually:**
```bash
curl -v http://localhost:3000/api/cron/cancel-expired-returns
```

**Check PM2:**
```bash
pm2 status
pm2 logs meoris-v3
```

**Check if app listening on port 3000:**
```bash
netstat -tulpn | grep 3000
```

---

### Timezone Issues

**Check server timezone:**
```bash
timedatectl

# Set timezone if needed (example: Asia/Jakarta)
sudo timedatectl set-timezone Asia/Jakarta
```

**Cron uses server time**, so if server is UTC+0:
- Cron runs at 09:00 UTC = 16:00 WIB (Jakarta)

---

### Permission Denied

**If you see permission errors:**
```bash
# Make log file writable by all
sudo chmod 666 /var/log/meoris-cron.log

# Or make it owned by your user
sudo chown ubuntu:ubuntu /var/log/meoris-cron.log
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring

```bash
# Check logs daily
tail -50 /var/log/meoris-cron.log
```

### Weekly Maintenance

```bash
# Archive old logs (if file gets too big)
sudo mv /var/log/meoris-cron.log /var/log/meoris-cron.log.old
sudo touch /var/log/meoris-cron.log
sudo chmod 666 /var/log/meoris-cron.log
```

### Auto Log Rotation (Optional)

Create log rotation config:
```bash
sudo nano /etc/logrotate.d/meoris-cron
```

Add:
```
/var/log/meoris-cron.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

---

## 🧪 Testing Cron Jobs

### Test 1: Manual Trigger

```bash
# Run the exact command that cron will run
curl -s http://localhost:3000/api/cron/cancel-expired-returns >> /var/log/meoris-cron.log 2>&1

# Check log
cat /var/log/meoris-cron.log
```

### Test 2: Wait for Next Hour

```bash
# Start monitoring before next hour
tail -f /var/log/meoris-cron.log

# Wait for next :00 (e.g., 18:00, 19:00)
# Output should appear automatically
```

### Test 3: Check Execution in System Logs

```bash
# After cron runs, check syslog
grep "cancel-expired" /var/log/syslog
```

---

## 📝 Quick Reference

### Common Commands

```bash
# Edit cron jobs
crontab -e

# List cron jobs
crontab -l

# Remove all cron jobs (CAREFUL!)
crontab -r

# Monitor logs
tail -f /var/log/meoris-cron.log

# Check cron service
systemctl status cron

# Restart cron service
sudo systemctl restart cron

# View system cron logs
grep CRON /var/log/syslog | tail -20
```

### Cron Time Examples

```bash
# Every hour
0 * * * * command

# Every 30 minutes
*/30 * * * * command

# Every day at 2:00 AM
0 2 * * * command

# Every Monday at 9:00 AM
0 9 * * 1 command

# Every 1st of month at midnight
0 0 1 * * command
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Log file created: `/var/log/meoris-cron.log`
- [ ] Log file has write permission (666)
- [ ] Crontab shows 2 cron jobs: `crontab -l`
- [ ] Cron daemon running: `systemctl status cron`
- [ ] Endpoints work: `curl http://localhost:3000/api/cron/...`
- [ ] PM2 app running: `pm2 status`
- [ ] Port 3000 listening: `netstat -tulpn | grep 3000`
- [ ] Manual test writes to log: Check `/var/log/meoris-cron.log`
- [ ] Wait for next :00 and verify auto-execution
- [ ] Test with actual expired return data

---

## 🎉 Expected Behavior

Once setup correctly:

**Every hour at :00 (e.g., 14:00, 15:00, 16:00):**
1. Cron automatically triggers both endpoints
2. API checks for:
   - Returns approved > 2 days ago without shipping
   - Orders delivered > 2 days ago
3. Updates database:
   - Expired returns → status: `expired`, order: `completed`
   - Delivered orders → status: `completed`
4. Logs response to `/var/log/meoris-cron.log`

**Example log output:**
```
{"success":true,"message":"No expired returns to cancel","expired":0}
{"success":true,"message":"No orders to auto-complete","completed":0}
```

Or if there's data:
```
{"success":true,"message":"Successfully processed 1 expired returns","expired":1,"cancelled":1,"ordersCompleted":1}
{"success":true,"message":"Successfully completed 3 delivered orders","completed":3}
```

---

## 🆘 Need Help?

**If stuck, check:**
1. PM2 logs: `pm2 logs meoris-v3`
2. Nginx logs: `tail -f /var/log/nginx/meoris.id-error.log`
3. System logs: `journalctl -xe`
4. Cron logs: `grep CRON /var/log/syslog`

**Common issues:**
- App not running → `pm2 restart meoris-v3`
- Port not listening → Check PM2 status
- Permission denied → `chmod 666 /var/log/meoris-cron.log`
- Timezone wrong → `timedatectl`
