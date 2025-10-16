# Meoris Sandal - Status Aplikasi

## ✅ Status: BERJALAN

### Informasi Server
- **Aplikasi**: Next.js 15.5.3
- **URL Lokal**: http://localhost:3000
- **Port**: 3000
- **Status**: Running in development mode

### Environment Variables
File `.env.local` telah dikonfigurasi dengan:
- ✅ Supabase (Database & Authentication)
- ✅ Google reCAPTCHA
- ✅ Resend (Email Service)
- ✅ Biteship (Shipping Integration)
- ✅ Tripay (Payment Gateway)

### Proses yang Berjalan
```
yarn dev - Next.js Development Server
```

### Log File
- `/var/log/nextjs.log` - Log aplikasi Next.js

### Cara Restart Server
```bash
# Hentikan proses
pkill -f "next dev"

# Jalankan kembali
cd /app && yarn dev > /var/log/nextjs.log 2>&1 &
```

### Fitur Utama Website
1. E-commerce sandal dan sepatu
2. Keranjang belanja
3. Sistem favorit
4. Manajemen akun pengguna
5. Sistem pengiriman (Biteship)
6. Payment gateway (Tripay)
7. Email notifications (Resend)

### Teknologi
- **Frontend**: Next.js 15.5.3, React 19.1.0, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Development Mode

---
*Dibuat pada: $(date)*
