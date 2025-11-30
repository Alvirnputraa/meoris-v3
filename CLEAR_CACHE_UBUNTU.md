# 🧹 Cara Membersihkan Cache di Server Ubuntu (Next.js)

## 🚀 Quick Fix - Rebuild Next.js

```bash
# 1. Masuk ke direktori project
cd /path/to/your/meoris-v3-main

# 2. Stop aplikasi yang sedang running (jika pakai PM2)
pm2 stop all
# ATAU jika pakai systemd
sudo systemctl stop your-app-name

# 3. Hapus cache Next.js
rm -rf .next
rm -rf node_modules/.cache

# 4. Rebuild aplikasi
npm run build

# 5. Restart aplikasi
pm2 restart all
# ATAU
sudo systemctl start your-app-name
```

---

## 📋 Penjelasan Detail

### 1. **Clear Next.js Build Cache**
```bash
# Hapus folder .next (build output)
rm -rf .next

# Hapus cache node_modules
rm -rf node_modules/.cache
```

### 2. **Clear Image Cache (jika pakai Next.js Image Optimization)**
```bash
# Next.js menyimpan optimized images di .next/cache/images
rm -rf .next/cache/images
```

### 3. **Clear Browser Cache dari Server (Optional)**
Tambahkan cache headers di `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 0, // Disable image cache
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 4. **Clear Nginx Cache (jika pakai Nginx)**
```bash
# Jika ada proxy_cache di Nginx
sudo rm -rf /var/cache/nginx/*
sudo nginx -s reload
```

### 5. **Clear Vercel Cache (jika deploy di Vercel)**
```bash
# Redeploy dengan force
vercel --force

# Atau di Vercel Dashboard:
# Settings → Functions → Clear All Caches
```

---

## 🔄 Full Reset (Nuclear Option)

Jika masih belum berhasil, coba full reset:

```bash
# 1. Stop aplikasi
pm2 stop all

# 2. Hapus semua cache
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules  # Hati-hati: ini akan hapus semua dependencies

# 3. Clear npm cache
npm cache clean --force

# 4. Reinstall dependencies
npm install

# 5. Rebuild
npm run build

# 6. Restart
pm2 restart all
```

---

## 🖼️ Untuk Gambar yang Tidak Update

### A. **Ganti Nama File Gambar**
```bash
# Cara paling gampang: ganti nama file
mv public/images/old-image.png public/images/old-image-v2.png
```

Lalu update di kode:
```tsx
// Dari:
<Image src="/images/old-image.png" ... />

// Ke:
<Image src="/images/old-image-v2.png" ... />
```

### B. **Tambah Query String (Cache Busting)**
```tsx
// Tambah timestamp atau version
<Image
  src="/images/gambar.png?v=2"
  alt="Gambar"
  width={800}
  height={600}
/>
```

### C. **Disable Next.js Image Optimization untuk Public Folder**
```bash
# Pakai tag <img> biasa untuk static images
<img src="/images/gambar.png" alt="Gambar" />
```

---

## 🔍 Cek Apakah Cache Sudah Clear

```bash
# 1. Cek timestamp file .next
ls -la .next

# 2. Cek proses yang running
pm2 list
# atau
ps aux | grep node

# 3. Cek nginx cache (jika ada)
ls -la /var/cache/nginx/

# 4. Test dengan curl
curl -I https://yourdomain.com/images/gambar.png
# Lihat header 'Cache-Control' dan 'Last-Modified'
```

---

## 🎯 Recommended Solution untuk Gambar

Jika gambar masih lama terus:

1. **Ganti nama file gambar** (paling mudah)
2. **Clear .next folder** dan **rebuild**
3. **Hard refresh browser** (Ctrl + Shift + R)
4. **Check file permissions**:
   ```bash
   # Pastikan file gambar readable
   chmod 644 public/images/*.png
   ```

---

## 💡 Tips Prevent Cache Issue di Future

1. **Gunakan versioning** untuk static assets:
   ```
   /images/logo-v1.png
   /images/logo-v2.png
   ```

2. **Disable cache untuk development**:
   ```bash
   # .env.local
   NEXT_PUBLIC_DISABLE_CACHE=true
   ```

3. **Setup proper cache headers** di production

4. **Use CDN** dengan cache invalidation support

---

## 🆘 Jika Masih Tidak Berhasil

1. Restart server Ubuntu:
   ```bash
   sudo reboot
   ```

2. Clear browser cache di client side (Ctrl + Shift + Delete)

3. Check file gambar benar-benar sudah terupload:
   ```bash
   ls -lh public/images/
   cat public/images/gambar.png  # Cek isi file
   ```

4. Check logs:
   ```bash
   pm2 logs
   # atau
   journalctl -u your-app-name -f
   ```
