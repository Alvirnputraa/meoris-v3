# Implementasi Tracking Penggunaan Voucher

## Overview
Sistem ini memastikan voucher yang sudah digunakan dan dibayar (status PAID) akan hilang dari list voucher user, baik di tampilan mobile maupun desktop.

## Komponen yang Diimplementasikan

### 1. Database Schema

#### Tabel Baru: `used_vouchers`
File: `create_used_vouchers_table.sql`

```sql
CREATE TABLE used_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_code VARCHAR(50) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_voucher UNIQUE(user_id, voucher_code)
);
```

**Tujuan**: Menyimpan record voucher yang sudah digunakan oleh user.

#### Update Tabel `orders`
File: `create_used_vouchers_table.sql`

Menambahkan kolom:
- `voucher_code VARCHAR(50)` - Kode voucher yang digunakan
- `discount_amount DECIMAL(12, 2)` - Jumlah diskon dari voucher

#### Update Tabel `checkout_submissions`
File: `alter_checkout_submissions_add_voucher_cols.sql`

Menambahkan kolom:
- `voucher_code VARCHAR(50)` - Kode voucher yang digunakan
- `discount_amount DECIMAL(12, 2)` - Jumlah diskon dari voucher

### 2. Backend Logic

#### File: `src/server/tripay.ts`

**Perubahan pada `processTripayCallback`**:

1. **Saat membuat order baru** (line 227-228):
   ```typescript
   voucher_code: submission.voucher_code || null,
   discount_amount: Number(submission.discount_amount || 0)
   ```
   Menyimpan informasi voucher ke tabel `orders`.

2. **Setelah payment berhasil** (line 326-342):
   ```typescript
   if (submission.voucher_code && submission.user_id) {
     await supabaseAdmin
       .from('used_vouchers')
       .insert({
         user_id: submission.user_id,
         voucher_code: submission.voucher_code,
         order_id: orderId,
         used_at: new Date().toISOString()
       })
   }
   ```
   Menandai voucher sebagai sudah digunakan di tabel `used_vouchers`.

#### File: `src/lib/database.ts`

**Update `checkoutSubmissionDb.create`** (line 594-597):
```typescript
voucher_code: payload.order_summary?.voucher_code || payload.voucher_code || null,
discount_amount: payload.order_summary?.discount || payload.discount_amount || 0
```
Memastikan voucher_code dan discount_amount tersimpan di checkout_submissions.

### 3. Frontend Logic

#### File: `src/components/layout/Header.tsx`

**Update fungsi `loadVoucherCount`** (line 165-183):
```typescript
// Get used vouchers to exclude
const { data: usedVouchersData } = await supabase
  .from('used_vouchers')
  .select('voucher_code')
  .eq('user_id', user.id);

const usedVoucherCodes = new Set(
  (usedVouchersData || []).map((v: any) => v.voucher_code)
);

// Filter yang belum expired dan belum digunakan
const validCount = vouchersData.filter((v: any) => {
  if (v.expired && new Date(v.expired) < now) return false;
  if (v.voucher && usedVoucherCodes.has(v.voucher)) return false;
  return true;
}).length;
```

**Update fungsi `loadVouchers`** (line 241-265):
```typescript
// Get used vouchers to exclude
const { data: usedVouchersData } = await supabase
  .from('used_vouchers')
  .select('voucher_code')
  .eq('user_id', user.id);

const usedVoucherCodes = new Set(
  (usedVouchersData || []).map((v: any) => v.voucher_code)
);

// Filter voucher yang masih valid dan belum digunakan
const validVouchers = combinedData.filter((uv: any) => {
  if (uv.voucher?.expired && new Date(uv.voucher.expired) < now) return false;
  if (uv.voucher?.voucher && usedVoucherCodes.has(uv.voucher.voucher)) return false;
  return true;
});
```

## Flow Penggunaan Voucher

1. **User menggunakan voucher di halaman checkout**
   - Voucher dipilih/diapply di `/produk/detail-checkout`
   - Voucher code disimpan di `pra_checkout`

2. **User melanjutkan ke halaman payment**
   - Data voucher diambil dari `pra_checkout`
   - Disimpan ke `checkout_submissions` dengan kolom `voucher_code` dan `discount_amount`

3. **User melakukan pembayaran**
   - Payment gateway (Tripay) memproses pembayaran
   - Callback diterima di `/api/tripay/callback`

4. **Saat payment status = PAID**
   - Order dibuat dengan menyimpan `voucher_code` dan `discount_amount`
   - **Voucher ditandai sebagai used** dengan insert ke tabel `used_vouchers`
   - Email invoice dikirim

5. **User membuka voucher sidebar**
   - System query `user_vouchers` dan `voucher`
   - Query juga `used_vouchers` untuk mendapatkan voucher yang sudah digunakan
   - Filter voucher yang ada di `used_vouchers` (tidak ditampilkan)
   - Hanya voucher yang belum expired dan belum used yang ditampilkan

## Instalasi

Jalankan SQL file berikut secara berurutan:

```bash
# 1. Buat tabel used_vouchers dan update tabel orders
psql -d your_database -f create_used_vouchers_table.sql

# 2. Update tabel checkout_submissions
psql -d your_database -f alter_checkout_submissions_add_voucher_cols.sql
```

Atau jalankan melalui Supabase SQL Editor.

## Testing

1. **Test voucher usage**:
   - Login sebagai user
   - Claim voucher
   - Tambah produk ke cart
   - Apply voucher di checkout
   - Lakukan pembayaran sampai status PAID
   - Buka voucher sidebar
   - **Expected**: Voucher yang sudah digunakan tidak muncul lagi

2. **Test voucher count**:
   - Check badge counter di header
   - **Expected**: Counter berkurang setelah voucher digunakan

3. **Test RLS**:
   - User A menggunakan voucher
   - User B login
   - **Expected**: Voucher milik User A tetap muncul di User B (jika mereka punya voucher yang sama)

## Notes

- Voucher yang sudah digunakan **tidak bisa digunakan lagi** oleh user yang sama
- System menggunakan kombinasi `user_id` + `voucher_code` untuk tracking
- RLS memastikan user hanya bisa melihat voucher yang mereka gunakan sendiri
- Berlaku untuk tampilan **mobile dan desktop**
- Constraint `unique_user_voucher` mencegah duplicate insert

## Rollback (Jika Diperlukan)

```sql
-- Hapus tabel used_vouchers
DROP TABLE IF EXISTS used_vouchers CASCADE;

-- Hapus kolom dari orders
ALTER TABLE orders DROP COLUMN IF EXISTS voucher_code;
ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;

-- Hapus kolom dari checkout_submissions
ALTER TABLE checkout_submissions DROP COLUMN IF EXISTS voucher_code;
ALTER TABLE checkout_submissions DROP COLUMN IF EXISTS discount_amount;
```
