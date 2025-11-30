# 🚀 Quick Commands - Ubuntu Cron Logs

## 📊 LIHAT LOGS

### **1. Lihat Semua Logs**
```bash
cat /var/log/meoris-cron.log
```

### **2. Lihat Logs Real-time (Live)**
```bash
tail -f /var/log/meoris-cron.log
```

### **3. Lihat 20 Baris Terakhir**
```bash
tail -n 20 /var/log/meoris-cron.log
```

### **4. Lihat dengan Warna (Recommended)**
```bash
bash watch_cron_logs.sh
```

### **5. Cari Error**
```bash
grep -i "error" /var/log/meoris-cron.log
```

### **6. Cari Success**
```bash
grep -i "success" /var/log/meoris-cron.log
```

### **7. Lihat Logs Hari Ini**
```bash
grep "$(date '+%Y-%m-%d')" /var/log/meoris-cron.log
```

---

## 🔍 CEK CRON STATUS

### **1. Cek Crontab Aktif**
```bash
crontab -l
```

### **2. Cek Cron Service Running**
```bash
systemctl status cron
```

### **3. Cek Execution dari Syslog**
```bash
grep CRON /var/log/syslog | tail -n 10
```

### **4. Full Monitoring Report**
```bash
bash monitor_cron.sh
```

---

## 🧪 MANUAL TEST

### **1. Test API Endpoint**
```bash
curl http://localhost:3005/api/cron/auto-cancel-pending-orders
```

### **2. Test dengan Pretty Print**
```bash
curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders | python3 -m json.tool
```

### **3. Test dengan Header Output**
```bash
curl -i http://localhost:3005/api/cron/auto-cancel-pending-orders
```

---

## 🔧 TROUBLESHOOTING

### **1. Log File Tidak Ada**
```bash
sudo touch /var/log/meoris-cron.log
sudo chmod 666 /var/log/meoris-cron.log
```

### **2. Restart Cron Service**
```bash
sudo systemctl restart cron
sudo systemctl status cron
```

### **3. Cek Port 3005**
```bash
netstat -tulpn | grep 3005
# atau
lsof -i :3005
```

### **4. Clear Old Logs**
```bash
# Backup first
cp /var/log/meoris-cron.log /var/log/meoris-cron.log.backup

# Clear
> /var/log/meoris-cron.log
```

---

## ⚙️ EDIT CRONTAB

### **1. Buka Editor**
```bash
crontab -e
```

### **2. Cron Job yang Benar (Every 10 minutes)**
```bash
*/10 * * * * curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1
```

### **3. Dengan Timestamp (Recommended)**
```bash
*/10 * * * * echo "=== [$(date '+\%Y-\%m-\%d \%H:\%M:\%S')] Started ===" >> /var/log/meoris-cron.log && curl -s http://localhost:3005/api/cron/auto-cancel-pending-orders >> /var/log/meoris-cron.log 2>&1
```

### **4. Simpan & Exit**
- Nano: `Ctrl+X`, tekan `Y`, `Enter`
- Vim: `:wq` `Enter`

---

## 📈 ANALYTICS

### **1. Count Executions Hari Ini**
```bash
grep "$(date '+%Y-%m-%d')" /var/log/meoris-cron.log | wc -l
```

### **2. Count Errors**
```bash
grep -i "error" /var/log/meoris-cron.log | wc -l
```

### **3. Last 5 Successful Runs**
```bash
grep -i "success" /var/log/meoris-cron.log | tail -n 5
```

### **4. Orders Cancelled Today**
```bash
grep -oP '"ordersCancelled":\s*\K\d+' /var/log/meoris-cron.log | tail -n 20
```

---

## 🎯 MOST USED COMMANDS

**Copy these to terminal:**

```bash
# Quick status check
bash monitor_cron.sh

# Watch logs live
tail -f /var/log/meoris-cron.log

# Check if cron is running
systemctl status cron

# View last 20 logs
tail -n 20 /var/log/meoris-cron.log

# Test API manually
curl http://localhost:3005/api/cron/auto-cancel-pending-orders

# Edit crontab
crontab -e

# View crontab
crontab -l
```

---

## 📝 INSTALLATION

### **1. Download Scripts**
```bash
cd /home/$(whoami)/meoris-scripts
chmod +x monitor_cron.sh
chmod +x watch_cron_logs.sh
```

### **2. Run Monitoring**
```bash
bash monitor_cron.sh
```

### **3. Watch Logs Live**
```bash
bash watch_cron_logs.sh
```

---

## 💡 TIPS

1. **Run monitoring every morning:**
   ```bash
   bash monitor_cron.sh > /tmp/cron-report.txt && cat /tmp/cron-report.txt
   ```

2. **Set alert for errors:**
   ```bash
   # Add to crontab
   0 9 * * * grep -i "error" /var/log/meoris-cron.log | mail -s "Cron Errors" admin@meoris.id
   ```

3. **Auto-rotate logs weekly:**
   ```bash
   # Add to crontab
   0 0 * * 0 mv /var/log/meoris-cron.log /var/log/meoris-cron.log.$(date +\%Y\%m\%d) && touch /var/log/meoris-cron.log
   ```
