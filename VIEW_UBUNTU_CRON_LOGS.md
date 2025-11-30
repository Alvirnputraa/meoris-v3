# 📊 Cara Lihat Logs Cron Job di Ubuntu Server

## 🟢 Metode 1: Lihat Log File Custom (PALING MUDAH)

### **Jika cron job-nya seperti ini:**
```bash
*/10 * * * * curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1
```

### **Cara lihat logs:**

**1. Lihat semua logs:**
```bash
cat /var/log/meoris-cron.log
```

**2. Lihat logs real-time (streaming):**
```bash
tail -f /var/log/meoris-cron.log
```

**3. Lihat 50 baris terakhir:**
```bash
tail -n 50 /var/log/meoris-cron.log
```

**4. Lihat logs dengan timestamp lebih jelas:**
```bash
tail -f /var/log/meoris-cron.log | while read line; do echo "$(date '+%Y-%m-%d %H:%M:%S') - $line"; done
```

**5. Search keyword tertentu:**
```bash
# Cari error
grep -i "error" /var/log/meoris-cron.log

# Cari success
grep -i "success" /var/log/meoris-cron.log

# Cari cancelled orders
grep -i "cancelled" /var/log/meoris-cron.log
```

**6. Lihat logs hari ini saja:**
```bash
grep "$(date '+%Y-%m-%d')" /var/log/meoris-cron.log
```

---

## 🟡 Metode 2: Lihat Cron Execution Logs (Syslog)

### **Cek apakah cron job berjalan:**

**1. Lihat semua cron executions:**
```bash
grep CRON /var/log/syslog
```

**2. Lihat cron executions untuk user tertentu:**
```bash
grep CRON /var/log/syslog | grep $(whoami)
```

**3. Lihat cron executions hari ini:**
```bash
grep CRON /var/log/syslog | grep "$(date '+%b %d')"
```

**4. Lihat 20 execution terakhir:**
```bash
grep CRON /var/log/syslog | tail -n 20
```

**5. Lihat cron auto-cancel specifically:**
```bash
grep "auto-cancel" /var/log/syslog
```

---

## 🔵 Metode 3: Gunakan journalctl (Systemd)

**1. Lihat semua cron logs:**
```bash
journalctl -u cron
```

**2. Lihat cron logs real-time:**
```bash
journalctl -u cron -f
```

**3. Lihat cron logs hari ini:**
```bash
journalctl -u cron --since today
```

**4. Lihat cron logs 1 jam terakhir:**
```bash
journalctl -u cron --since "1 hour ago"
```

**5. Lihat cron logs dengan filter:**
```bash
journalctl -u cron | grep "auto-cancel"
```

---

## 🟣 Metode 4: Cek Crontab Status

### **Verifikasi cron job terpasang:**

**1. Lihat crontab aktif:**
```bash
crontab -l
```

**2. Cek apakah cron service running:**
```bash
systemctl status cron
```

**3. Cek last cron execution:**
```bash
grep "$(whoami)" /var/log/syslog | grep CRON | tail -n 5
```

---

## 🎯 QUICK COMMANDS - Copy Paste!

### **Monitoring Script**

```bash
#!/bin/bash
# monitoring_cron.sh - Save this file and run: bash monitoring_cron.sh

clear
echo "=========================================="
echo "MEORIS CRON JOB MONITORING"
echo "=========================================="
echo ""

echo "1. CRONTAB CONFIGURATION:"
echo "------------------------------------------"
crontab -l | grep "auto-cancel"
echo ""

echo "2. CRON SERVICE STATUS:"
echo "------------------------------------------"
systemctl status cron --no-pager | head -n 5
echo ""

echo "3. LAST 10 CRON EXECUTIONS:"
echo "------------------------------------------"
grep CRON /var/log/syslog | grep "auto-cancel" | tail -n 10
echo ""

echo "4. LAST 10 API RESPONSES:"
echo "------------------------------------------"
tail -n 10 /var/log/meoris-cron.log
echo ""

echo "5. ERROR COUNT TODAY:"
echo "------------------------------------------"
echo "Errors: $(grep -c "error\|Error\|ERROR" /var/log/meoris-cron.log 2>/dev/null || echo 0)"
echo "Success: $(grep -c "success\|Success\|SUCCESS" /var/log/meoris-cron.log 2>/dev/null || echo 0)"
echo ""

echo "=========================================="
echo "DONE!"
echo "=========================================="
```

### **Live Monitoring (Real-time)**

```bash
# Watch logs live
tail -f /var/log/meoris-cron.log

# Watch with colors (requires ccze)
tail -f /var/log/meoris-cron.log | ccze -A

# Watch multiple logs at once
tail -f /var/log/meoris-cron.log /var/log/syslog | grep --color=auto "auto-cancel\|CRON\|error"
```

### **Clear Old Logs**

```bash
# Backup then clear log
cp /var/log/meoris-cron.log /var/log/meoris-cron.log.backup
> /var/log/meoris-cron.log

# Or rotate logs (keep last 7 days)
logrotate /etc/logrotate.d/meoris-cron
```

---

## 🔧 TROUBLESHOOTING

### **Log file tidak ada?**

```bash
# Cek apakah file log exists
ls -lh /var/log/meoris-cron.log

# Jika tidak ada, buat manual
sudo touch /var/log/meoris-cron.log
sudo chmod 666 /var/log/meoris-cron.log
```

### **Cron tidak jalan?**

```bash
# Cek cron service
sudo systemctl status cron

# Restart cron service
sudo systemctl restart cron

# Enable cron on boot
sudo systemctl enable cron

# Check cron logs for errors
sudo tail -f /var/log/syslog | grep CRON
```

### **Permission denied?**

```bash
# Fix log file permission
sudo chmod 666 /var/log/meoris-cron.log

# Or run with sudo
sudo tail -f /var/log/meoris-cron.log
```

### **Cron job tidak execute?**

```bash
# Test manual execution
curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders

# Check if localhost:3005 is running
curl -s http://localhost:3005/api/health

# Check if port 3005 is open
netstat -tulpn | grep 3005
```

---

## 📈 LOG ANALYSIS

### **Count executions per hour:**

```bash
# Today's executions count
grep "$(date '+%Y-%m-%d')" /var/log/meoris-cron.log | wc -l

# Executions per hour
for hour in {00..23}; do
  count=$(grep "$(date '+%Y-%m-%d') $hour:" /var/log/meoris-cron.log | wc -l)
  echo "Hour $hour: $count executions"
done
```

### **Find errors:**

```bash
# All errors today
grep -i "error" /var/log/meoris-cron.log | grep "$(date '+%Y-%m-%d')"

# Count errors by type
grep -i "error" /var/log/meoris-cron.log | sort | uniq -c | sort -rn
```

### **Check if orders are being cancelled:**

```bash
# Search for cancelled orders in logs
grep -i "cancelled\|cancel" /var/log/meoris-cron.log | tail -n 20

# Parse JSON response for ordersCancelled count
grep -oP '"ordersCancelled":\s*\K\d+' /var/log/meoris-cron.log | tail -n 20
```

---

## 🎨 ENHANCED LOGGING (Recommended)

### **Better Cron Command with Timestamp:**

Edit crontab (`crontab -e`):

```bash
# Old version (basic)
*/10 * * * * curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1

# New version (with timestamp and better formatting)
*/10 * * * * echo "=== [$(date '+\%Y-\%m-\%d \%H:\%M:\%S')] Auto-Cancel Cron Started ===" >> /var/log/meoris-cron.log 2>&1 && curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1 && echo "=== [$(date '+\%Y-\%m-\%d \%H:\%M:\%S')] Auto-Cancel Cron Finished ===" >> /var/log/meoris-cron.log 2>&1
```

### **Separate Error Log:**

```bash
# Redirect stdout and stderr to different files
*/10 * * * * curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>> /var/log/meoris-cron-error.log
```

---

## 📋 DAILY MONITORING CHECKLIST

```bash
# Run this every morning to check cron health

echo "Cron Health Check - $(date)"
echo "========================================"
echo ""

# 1. Service status
echo "1. Cron Service:"
systemctl is-active cron && echo "✅ Running" || echo "❌ Not running"
echo ""

# 2. Execution count today
executions=$(grep "$(date '+%Y-%m-%d')" /var/log/meoris-cron.log | wc -l)
echo "2. Executions Today: $executions"
expected=$(($(date +%H) * 6))  # Every 10 min = 6 per hour
echo "   Expected: ~$expected"
echo ""

# 3. Error count
errors=$(grep -i "error" /var/log/meoris-cron.log | grep "$(date '+%Y-%m-%d')" | wc -l)
echo "3. Errors Today: $errors"
[[ $errors -eq 0 ]] && echo "   ✅ No errors" || echo "   ⚠️ Check errors!"
echo ""

# 4. Last execution
last_exec=$(grep "$(date '+%Y-%m-%d')" /var/log/meoris-cron.log | tail -n 1)
echo "4. Last Execution:"
echo "   $last_exec"
echo ""

echo "========================================"
```

---

**Quick Start:**

```bash
# Lihat logs sekarang
tail -f /var/log/meoris-cron.log

# Cek 5 execution terakhir
tail -n 5 /var/log/meoris-cron.log

# Cek apakah ada error
grep -i "error" /var/log/meoris-cron.log
```
