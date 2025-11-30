# 🔧 FIX: Notification Message Format

## 🐛 MASALAH

**Current (Wrong):**
```
Pesanan dibatalkan
Pesanan dengan nomor DEV-T44456309572B9YTY telah dibatalkan karena melewati batas waktu pembayaran.
```

**Should Be (Correct):**
```
Pesanan dibatalkan
Pesanan anda dengan id pesanan 5ADCC76ED9 telah dibatalkan
```

## 🔍 PENJELASAN

### Order ID Format di Website

Website menggunakan **Short Order ID** = 10 karakter pertama dari UUID (uppercase, tanpa dash)

**Contoh:**
- UUID: `5adcc76e-d9fc-4d3a-b608-8df527311c3f`
- Short ID: `5ADCC76ED9`

**Formula:**
```javascript
shortId = uuid.replace(/-/g, '').substring(0, 10).toUpperCase()
```

### Current vs Expected

| Field | Current Message Uses | Should Use |
|-------|---------------------|------------|
| ID Format | `payment_reference` (DEV-T44456309572B9YTY) | Short UUID (5ADCC76ED9) |
| Text | "Pesanan dengan nomor X telah dibatalkan karena melewati batas waktu pembayaran" | "Pesanan anda dengan id pesanan X telah dibatalkan" |

## ✅ SOLUSI

### SQL Function Update

**Di Supabase SQL Editor, apply SQL ini:**

File: `FINAL_SQL_FIX_WITH_CORRECT_MESSAGE.sql`

**Key Changes:**

1. **Generate Short Order ID:**
```sql
v_short_order_id := UPPER(SUBSTRING(REPLACE(v_checkout_record.id::text, '-', ''), 1, 10));
```

2. **Update Notification Message:**
```sql
'Pesanan anda dengan id pesanan ' || v_short_order_id || ' telah dibatalkan'
```

### Before (Wrong SQL):
```sql
'Pesanan dengan nomor ' || COALESCE(v_checkout_record.payment_reference, v_checkout_record.id::text) || ' telah dibatalkan karena melewati batas waktu pembayaran.'
```

### After (Correct SQL):
```sql
-- Generate short ID
v_short_order_id := UPPER(SUBSTRING(REPLACE(v_checkout_record.id::text, '-', ''), 1, 10));

-- Use in message
'Pesanan anda dengan id pesanan ' || v_short_order_id || ' telah dibatalkan'
```

## 🧪 TESTING

### 1. Apply SQL Fix

Go to: https://supabase.com/dashboard/project/vtwooclhjobgdgvljauq/sql/new

Copy and run entire content of: `FINAL_SQL_FIX_WITH_CORRECT_MESSAGE.sql`

### 2. Create Test Order (Expired)

Buat order baru dan set deadline sudah lewat.

### 3. Trigger Auto-Cancel

```bash
curl -H "Authorization: Bearer K3mP9xR7vN2sL5qW8tY4zH6jD1cF0aB3==" \
  http://localhost:3005/api/cron/auto-cancel-pending-orders
```

### 4. Check Notification

Go to: https://meoris.id/user/purchase?view=notifications

**Expected:**
```
Pesanan dibatalkan
Pesanan anda dengan id pesanan 5ADCC76ED9 telah dibatalkan
```

## 📊 EXAMPLE

**Order:**
- UUID: `5adcc76e-d9fc-4d3a-b608-8df527311c3f`
- Payment Ref: `DEV-T44456309572B9YTY`
- Short ID: `5ADCC76ED9`

**Notification Message:**
```
Title: Pesanan dibatalkan
Message: Pesanan anda dengan id pesanan 5ADCC76ED9 telah dibatalkan
```

**Di Website:**
- Order detail page menampilkan ID: `5ADCC76ED9`
- Notification message juga pakai ID: `5ADCC76ED9`
- ✅ KONSISTEN!

## 📋 CHECKLIST

- [ ] Apply `FINAL_SQL_FIX_WITH_CORRECT_MESSAGE.sql` to Supabase
- [ ] SQL executed successfully
- [ ] Create test expired order
- [ ] Trigger auto-cancel
- [ ] Check notification message format
- [ ] Verify message matches order ID di website

## 🎯 EXPECTED RESULT

1. ✅ Notification menggunakan Short Order ID (10 chars)
2. ✅ Message format: "Pesanan anda dengan id pesanan X telah dibatalkan"
3. ✅ Konsisten dengan ID yang ditampilkan di website
4. ✅ Lebih ringkas dan jelas

---

**Priority**: MEDIUM
**Impact**: UX Improvement (message lebih konsisten)
**Time**: 5 minutes to apply
