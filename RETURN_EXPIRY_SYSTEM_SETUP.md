# 🔄 Return Expiry System - Setup Guide

Sistema countdown 2 hari untuk konfirmasi pengiriman return request.

## 📋 Overview

Sistem ini memastikan user mengatur pengiriman pengembalian dalam waktu 2 hari setelah return di-approve. Jika tidak, return akan otomatis dibatalkan dan order diselesaikan.

**Mirip dengan**: Auto-complete order dari `delivered` ke `completed` setelah 2 hari.

## 🎯 Fitur

1. **Countdown Timer**: Menampilkan deadline dan waktu tersisa di UI
2. **Auto-Cancel**: Return yang expired otomatis dibatalkan
3. **Auto-Complete**: Order otomatis diselesaikan setelah return dibatalkan
4. **Visual Warning**: Peringatan merah dengan countdown di timeline=return

## 🚀 Setup Instructions

### Step 1: Run SQL Migrations

Jalankan file berikut di **Supabase SQL Editor**:

#### 1.1 Add `approved_at` Column

```sql
-- File: add_approved_at_to_returns.sql
```

Ini akan:
- ✅ Menambahkan kolom `approved_at` ke tabel `returns`
- ✅ Membuat trigger untuk auto-set `approved_at` saat status berubah ke `approved`
- ✅ Menambahkan index untuk query performance

#### 1.2 Create Auto-Cancel Function

```sql
-- File: create_auto_cancel_expired_returns_function.sql
```

Ini akan:
- ✅ Membuat function `auto_cancel_expired_returns()`
- ✅ Function ini akan cancel return yang expired dan complete order-nya

### Step 2: Update Existing Data

Jalankan setup script untuk update existing approved returns:

```bash
node setup_return_expiry_system.js
```

Ini akan:
- ✅ Set `approved_at` untuk return yang sudah approved sebelumnya
- ✅ Menggunakan `updated_at` sebagai fallback timestamp

### Step 3: Setup Cron Job

Ada 2 cara setup cron job:

#### Option A: Manual Cron (Local Testing)

Tambahkan ke Windows Task Scheduler atau crontab:

```bash
# Run every hour
curl http://localhost:3000/api/cron/cancel-expired-returns
```

#### Option B: Vercel Cron (Production)

Update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cancel-expired-returns",
      "schedule": "0 * * * *"
    }
  ]
}
```

## 📊 How It Works

### Timeline

```
Day 0: Return Approved
       ↓ approved_at = NOW()

Day 1: Countdown shows "1 hari X jam lagi"
       User can still arrange shipping

Day 2: Countdown shows "X jam lagi"
       Last chance to arrange shipping

Day 2 + : Status = 'expired'
          Order = 'completed'
          Return cancelled automatically
```

### UI Display

**Saat ada waktu tersisa:**
```
⚠️ Permintaan disetujui, Harap kemas paket anda sebelum melanjutkan tahap ini.
   Atur pengiriman sebelum 15 November 2025 pukul 13:59
```

**Saat deadline lewat:**
```
⚠️ Permintaan disetujui, Harap kemas paket anda sebelum melanjutkan tahap ini.
   Batas waktu pengaturan pengiriman telah lewat. Pengembalian akan dibatalkan otomatis.
```

**Catatan**: Deadline selalu di-round ke akhir jam (:59) untuk konsistensi dengan cron job yang run setiap jam.

## 🧪 Testing

### Test 1: Check Countdown Display

1. Approve sebuah return request
2. Buka `timeline=return`
3. Verify countdown message tampil dengan benar
4. Check console untuk timestamp info

### Test 2: Manual Trigger Cron

```bash
curl http://localhost:3000/api/cron/cancel-expired-returns
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully processed X expired returns",
  "expired": X,
  "cancelled": X,
  "ordersCompleted": X
}
```

### Test 3: Simulate Expired Return

Di Supabase SQL Editor:

```sql
-- Create test expired return
UPDATE returns
SET approved_at = NOW() - INTERVAL '3 days'
WHERE id = 'your-return-id';

-- Trigger cron manually
-- Then check if status changed to 'expired'
```

## 🔍 Database Schema

### New Column: `approved_at`

```sql
returns.approved_at TIMESTAMPTZ
```

- Set automatically when status changes to 'approved'
- Used to calculate 2-day deadline
- Indexed for performance

### New Status: `expired`

```sql
returns.status = 'expired'
```

- Set when return tidak diatur pengirimannya dalam 2 hari
- Order otomatis completed

## 📱 API Endpoints

### GET/POST `/api/cron/cancel-expired-returns`

**Purpose**: Cancel expired returns and complete orders

**Response**:
```json
{
  "success": true,
  "message": "Successfully processed X expired returns",
  "expired": 5,
  "cancelled": 5,
  "ordersCompleted": 5
}
```

## ⚙️ Configuration

**Default deadline**: 2 days, rounded to end of hour (:59)
**Cron schedule**: Every hour (0 * * * *)

### Mengubah Deadline

Untuk mengubah deadline (misalnya jadi 3 hari), edit di:

1. **UI Countdown** (`src/app/user/purchase/page.tsx` line ~4108):
```javascript
const deadlineDate = new Date(approvedDate.getTime() + 3 * 24 * 60 * 60 * 1000); // Change to 3 days
```

2. **Cron Job** (`src/app/api/cron/cancel-expired-returns/route.ts` line ~14):
```javascript
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
```

3. **SQL Function** (`create_auto_cancel_expired_returns_function.sql`):
```sql
AND r.approved_at <= NOW() - INTERVAL '3 days'
```

### Mengubah Cron Schedule

Edit `vercel.json` untuk production atau Task Scheduler untuk local testing.

## 🐛 Troubleshooting

### Countdown tidak muncul

- Check: `submittedReturn.approved_at` ada isinya?
- Check console logs untuk timestamp

### Cron job tidak jalan

- Verify API endpoint accessible: `curl http://localhost:3000/api/cron/cancel-expired-returns`
- Check logs di console
- Verify `approved_at` ada di database

### Return tidak auto-cancel

- Check: Apakah sudah 2 hari sejak `approved_at`?
- Check: Apakah `return_waybill` masih NULL?
- Check: Apakah status masih `approved`?

## 📝 Notes

- Countdown di-calculate real-time di client side
- Deadline selalu rounded ke akhir jam (:59) untuk konsistensi dengan hourly cron
- Cron job run di server side (every hour / 0 * * * *)
- Maximum delay untuk auto-cancel: 1 jam setelah deadline
- Timezone: Menggunakan server timezone (UTC default)
- Date format: Indonesia (15 November 2025)

## ✅ Checklist

- [ ] SQL migration 1 (add approved_at) executed
- [ ] SQL migration 2 (create function) executed
- [ ] Existing data updated with setup script
- [ ] Cron job configured
- [ ] API endpoint tested
- [ ] UI countdown verified
- [ ] Test expired return simulation
