# 🚀 Deployment Guide - Ubuntu Server (Nginx + PM2)

Panduan deploy aplikasi Next.js ke server Ubuntu dengan Nginx + PM2 untuk domain **meoris.id**

## 📋 Prerequisites

- ✅ Ubuntu Server (sudah ada)
- ✅ Nginx (sudah installed)
- ✅ PM2 (sudah installed)
- ✅ Node.js & npm (sudah installed)
- ✅ Domain meoris.id sudah pointing ke server
- ✅ SSL certificate (Let's Encrypt recommended)

## 🔧 Step 1: Prepare & Push Code

### 1.1 Commit Changes di Local

```bash
# Di laptop/local machine
cd C:\Users\Administrator\Downloads\meoris-v3-main

# Add important files
git add src/ public/ package.json package-lock.json
git add add_approved_at_to_returns.sql create_auto_cancel_expired_returns_function.sql
git add RETURN_EXPIRY_SYSTEM_SETUP.md

# Commit
git commit -m "Add return expiry system with auto-cancel feature"

# Push to GitHub
git push origin main
```

### 1.2 Verify .gitignore

Pastikan `.env` dan file test tidak ter-commit:

```bash
# Check files yang akan di-commit
git status

# .env harus ada di .gitignore
```

## 🐧 Step 2: Deploy ke Ubuntu Server

### 2.1 SSH ke Server

```bash
ssh root@your-server-ip
# atau
ssh user@your-server-ip
```

### 2.2 Navigate & Pull Latest Code

```bash
# Masuk ke folder project (sesuaikan dengan lokasi Anda)
cd /var/www/meoris-v3
# atau
cd /home/user/meoris-v3

# Pull latest code dari GitHub
git pull origin main
```

### 2.3 Install Dependencies & Build

```bash
# Install dependencies (jika ada yang baru)
npm install

# Build production
npm run build
```

### 2.4 Setup Environment Variables

```bash
# Edit .env file di server
nano .env
```

Isi dengan:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Tripay
TRIPAY_API_KEY=your_tripay_key
TRIPAY_PRIVATE_KEY=your_tripay_private
TRIPAY_MERCHANT_CODE=your_merchant_code

# Biteship
BITESHIP_API_KEY=your_biteship_key

# Node Environment
NODE_ENV=production
PORT=3000
```

Simpan: `Ctrl + X` → `Y` → `Enter`

### 2.5 Restart PM2

```bash
# Restart aplikasi
pm2 restart meoris-v3

# Atau jika belum ada di PM2, start baru:
pm2 start npm --name "meoris-v3" -- start

# Save PM2 config
pm2 save

# Enable PM2 startup on server reboot
pm2 startup
```

### 2.6 Check Status

```bash
# Check aplikasi running
pm2 status

# Check logs
pm2 logs meoris-v3

# Check website
curl http://localhost:3000
```

## ⏰ Step 3: Setup Cron Jobs

### 3.1 Edit Crontab

```bash
# Edit crontab
crontab -e
```

### 3.2 Add Cron Jobs

Tambahkan di akhir file:

```bash
# Auto-cancel expired returns (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/cancel-expired-returns >> /var/log/meoris-cron.log 2>&1

# Auto-complete delivered orders (every hour at :00)
0 * * * * curl -s http://localhost:3000/api/cron/auto-complete-orders >> /var/log/meoris-cron.log 2>&1
```

Simpan: `Ctrl + X` → `Y` → `Enter`

### 3.3 Verify Cron

```bash
# List cron jobs
crontab -l

# Check cron logs (setelah 1 jam)
tail -f /var/log/meoris-cron.log
```

### 3.4 Test Cron Manually

```bash
# Test cron endpoint
curl http://localhost:3000/api/cron/cancel-expired-returns

# Expected response:
# {"success":true,"message":"No expired returns to cancel","expired":0}
```

## 🌐 Step 4: Verify Nginx Configuration

### 4.1 Check Nginx Config

```bash
# Check current config
cat /etc/nginx/sites-available/meoris.id
# atau
cat /etc/nginx/sites-enabled/meoris.id
```

### 4.2 Recommended Nginx Config

Seharusnya sudah ada, tapi pastikan seperti ini:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name meoris.id www.meoris.id;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name meoris.id www.meoris.id;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/meoris.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meoris.id/privkey.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/meoris.id-access.log;
    error_log /var/log/nginx/meoris.id-error.log;

    # Proxy to Next.js (PM2)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files optimization
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Images optimization
    location /images {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=86400";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client max body size (untuk upload)
    client_max_body_size 10M;
}
```

### 4.3 Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

## 🔒 Step 5: SSL Certificate (Jika Belum Ada)

### 5.1 Install Certbot

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Generate Certificate

```bash
# Generate SSL for meoris.id
sudo certbot --nginx -d meoris.id -d www.meoris.id
```

Follow prompts:
- Email: (your email)
- Agree terms: Yes
- Redirect HTTP to HTTPS: Yes

### 5.3 Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-adds cron for renewal
```

## 🗄️ Step 6: Run SQL Migrations

**PENTING:** Jalankan ini di **Supabase SQL Editor** (bukan di server Ubuntu):

### 6.1 Add approved_at Column

Login ke Supabase Dashboard → SQL Editor → Run:

```sql
-- Copy dari file: add_approved_at_to_returns.sql
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_returns_approved_at ON public.returns(approved_at);

CREATE OR REPLACE FUNCTION set_approved_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_approved_at ON public.returns;

CREATE TRIGGER trg_set_approved_at
BEFORE UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION set_approved_at_on_status_change();
```

### 6.2 Create Auto-Cancel Function

Run di Supabase SQL Editor:

```sql
-- Copy dari file: create_auto_cancel_expired_returns_function.sql
-- (isi file lengkap)
```

## ✅ Step 7: Verify Deployment

### 7.1 Check Website

```bash
# Di server
curl https://meoris.id

# Di browser
# Buka: https://meoris.id
```

### 7.2 Check PM2 Process

```bash
pm2 status
pm2 logs meoris-v3 --lines 50
```

### 7.3 Check Nginx Access

```bash
tail -f /var/log/nginx/meoris.id-access.log
```

### 7.4 Test Cron Jobs

```bash
# Wait until next hour :00
# Check logs
tail -f /var/log/meoris-cron.log
```

### 7.5 Test Return Expiry System

1. Approve return request di admin panel
2. Check countdown displays: "Atur pengiriman sebelum [tanggal] pukul XX:59"
3. Return akan auto-expired setelah 2 hari (cron job handle)

## 🔄 Step 8: Future Updates

Untuk update code kedepannya:

```bash
# SSH ke server
ssh user@your-server

# Navigate to project
cd /var/www/meoris-v3

# Pull latest
git pull origin main

# Install dependencies (jika ada yang baru)
npm install

# Build
npm run build

# Restart PM2
pm2 restart meoris-v3

# Check logs
pm2 logs meoris-v3
```

## 📊 Step 9: Monitoring

### 9.1 PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Memory usage
pm2 show meoris-v3
```

### 9.2 Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/meoris.id-access.log

# Error logs
tail -f /var/log/nginx/meoris.id-error.log
```

### 9.3 Cron Logs

```bash
# Check cron execution
tail -f /var/log/meoris-cron.log
```

### 9.4 System Resources

```bash
# Check CPU & Memory
htop

# Check disk space
df -h

# Check port 3000
netstat -tulpn | grep 3000
```

## 🐛 Troubleshooting

### Website Not Accessible

```bash
# Check PM2
pm2 status
pm2 logs meoris-v3

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check port
netstat -tulpn | grep 3000
```

### Cron Jobs Not Running

```bash
# Check crontab
crontab -l

# Test manually
curl http://localhost:3000/api/cron/cancel-expired-returns

# Check logs
tail -f /var/log/meoris-cron.log
```

### PM2 Process Crashed

```bash
# Restart
pm2 restart meoris-v3

# Check errors
pm2 logs meoris-v3 --err

# Rebuild
npm run build
pm2 restart meoris-v3
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

### Database Connection Errors

```bash
# Check environment variables
cat .env

# Verify Supabase URL & keys
# Check if service role key is correct
```

## 📝 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] SSH ke server Ubuntu
- [ ] Pull latest code (`git pull`)
- [ ] Install dependencies (`npm install`)
- [ ] Build project (`npm run build`)
- [ ] Environment variables configured (`.env`)
- [ ] PM2 restarted (`pm2 restart meoris-v3`)
- [ ] Cron jobs added (`crontab -e`)
- [ ] Nginx config verified
- [ ] SSL certificate valid
- [ ] Website accessible: https://meoris.id
- [ ] Cron jobs running (check logs)
- [ ] SQL migrations executed (Supabase)
- [ ] Test return expiry system
- [ ] Webhooks updated (Tripay, Biteship)
- [ ] PM2 monitoring setup

## 🎉 Done!

Website sekarang live di **https://meoris.id** dengan:

- ✅ Ubuntu Server + Nginx + PM2
- ✅ Auto-cancel expired returns (cron every hour)
- ✅ Auto-complete delivered orders (cron every hour)
- ✅ SSL certificate (HTTPS)
- ✅ PM2 auto-restart on crash
- ✅ Full control over server

## 📞 Quick Commands Reference

```bash
# Deploy update
cd /var/www/meoris-v3 && git pull && npm install && npm run build && pm2 restart meoris-v3

# Check status
pm2 status && sudo systemctl status nginx

# View logs
pm2 logs meoris-v3 && tail -f /var/log/meoris-cron.log

# Restart services
pm2 restart meoris-v3 && sudo systemctl reload nginx

# Check cron
crontab -l
```

**Estimated Deployment Time:** 10-15 minutes
