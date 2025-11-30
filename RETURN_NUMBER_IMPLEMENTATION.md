# Return Number Implementation - Summary

## Overview
Implementasi sistem nomor pengajuan pengembalian (Return Number) yang unik untuk setiap request pengembalian barang. Sistem ini memudahkan user dan customer service untuk melacak status pengembalian dengan lebih mudah.

## Format Return Number
```
RET-YYMMDDHHMMSSRRRR
```
- **RET-**: Prefix untuk Return
- **YYMMDDHHMMSS**: Timestamp (Tahun, Bulan, Tanggal, Jam, Menit, Detik)
- **RRRR**: Random 4-digit number

**Contoh:** `RET-2411180932451234`

## Changes Made

### 1. Database Changes
**File:** `add_return_number_column.sql`

- Menambahkan kolom `return_number` di tabel `returns` (UNIQUE constraint)
- Membuat index `idx_returns_return_number` untuk faster lookups
- Membuat function `generate_return_number()` untuk generate nomor unik
- Membuat trigger `trigger_set_return_number` yang auto-generate return_number saat insert
- Update existing returns dengan return_number

**Cara Apply:**
1. Buka Supabase SQL Editor
2. Copy seluruh isi file `add_return_number_column.sql`
3. Paste dan klik **RUN**

### 2. API Changes
**File:** `src/app/api/returns/submit/route.ts`

**Changes:**
- Line 189: Menambahkan `.select('*, return_number')` untuk return return_number setelah insert
- Line 234: Menambahkan `return_number: returnData.return_number` di response JSON

**Benefit:**
- Frontend sekarang menerima `return_number` dari API response
- Return number ter-generate otomatis oleh database trigger

### 3. Frontend Changes
**File:** `src/app/user/purchase/page.tsx`

#### A. State & Type Updates
- Line 44-50: Menambahkan `'return-detail'` ke activeView type
- Line 153: Menambahkan state `loadingReturnData` untuk tracking loading status

#### B. URL Parameter Handling
- Line 805: Menambahkan `returnParam` dari URL query
- Line 870-998: Menambahkan logic untuk handle `view=return-detail&return=RET-xxx`
  - Fetch return data by return_number
  - Fetch associated order data
  - Auto-set timeline step based on return status

#### C. Redirect After Submit
- Line 2587-2597: Update redirect logic setelah submit return:
  ```javascript
  // Old: /user/purchase?view=order-detail&order=DEV-xxx&timeline=review
  // New: /user/purchase?view=return-detail&return=RET-xxx&timeline=review
  ```
- Line 2588: Alert sekarang menampilkan return_number

#### D. UI Display
- Line 5256-5260: Menampilkan return_number di header "Detail Pengembalian"
  ```
  Detail Pengembalian
  No. Pengajuan: RET-2411180932451234
  ```

### 4. Bug Fixes
**Timeline Parameter Auto-Removed Issue:**

**Problem:**
URL dengan `timeline=review` otomatis redirect ke URL tanpa parameter timeline karena logic penghapusan berjalan sebelum data return selesai di-load.

**Solution:**
- Menambahkan `loadingReturnData` state
- Set loading state di 3 lokasi fetch return data (line 888, 1029, 1218)
- Update logic penghapusan timeline (line 1319) untuk hanya berjalan setelah `!loadingReturnData`

## URL Format Changes

### Before
```
# Submit return redirect
http://localhost:3001/user/purchase?view=order-detail&order=DEV-T44456309661HHLHK&timeline=review
```

### After
```
# Submit return redirect (with return_number)
http://localhost:3001/user/purchase?view=return-detail&return=RET-2411180932451234&timeline=review

# Old format still works (backward compatible)
http://localhost:3001/user/purchase?view=order-detail&order=DEV-T44456309661HHLHK&timeline=review
```

## Benefits

### For Users:
1. **Easy Tracking**: Dapat menyimpan nomor pengajuan untuk tracking
2. **Reference Number**: Nomor yang jelas untuk komunikasi dengan customer service
3. **Bookmarkable URL**: URL yang spesifik untuk setiap pengajuan pengembalian
4. **Professional**: Lebih terlihat professional dengan unique tracking number

### For Customer Service:
1. **Quick Lookup**: Dapat langsung cari return by return_number
2. **Unique Identifier**: Tidak ada duplikasi nomor
3. **Better Communication**: User dapat menyebutkan return_number saat komplain

### For Developers:
1. **Clean URL**: URL lebih focused pada return process
2. **Better Security**: UUID-like format yang sulit ditebak
3. **Scalability**: Dapat handle multiple returns per order
4. **Database Indexing**: Faster queries dengan indexed return_number

## Testing Guide

### 1. Test Database Setup
```bash
# Apply SQL script di Supabase
# Verify dengan query:
SELECT return_number, status, created_at FROM returns ORDER BY created_at DESC LIMIT 5;
```

### 2. Test Submit Return
1. Login sebagai user
2. Pilih order yang sudah delivered
3. Klik "Ajukan Pengembalian"
4. Isi form dan submit
5. **Expected:**
   - Alert menampilkan: "Nomor Pengajuan: RET-xxx"
   - Redirect ke: `/user/purchase?view=return-detail&return=RET-xxx&timeline=review`
   - UI menampilkan return_number di header

### 3. Test Direct Access
1. Copy return_number dari database
2. Access URL: `http://localhost:3001/user/purchase?view=return-detail&return=RET-xxx&timeline=review`
3. **Expected:**
   - Halaman load dengan data return yang benar
   - Timeline menampilkan status yang sesuai
   - Return_number tampil di UI

### 4. Test Timeline Parameter
1. Access URL dengan `timeline=review`
2. **Expected:**
   - Timeline parameter TIDAK dihapus
   - Halaman TIDAK redirect ke URL tanpa timeline
   - Timeline step menampilkan step yang benar

## Deployment Checklist

- [x] SQL script created
- [x] API updated to return return_number
- [x] Frontend routing updated
- [x] UI displays return_number
- [x] Timeline parameter bug fixed
- [ ] Apply SQL script to production database
- [ ] Test on production environment
- [ ] Update existing returns with return_number
- [ ] Monitor for any errors

## Files Modified

1. ✅ `add_return_number_column.sql` (NEW)
2. ✅ `src/app/api/returns/submit/route.ts`
3. ✅ `src/app/user/purchase/page.tsx`

## Next Steps

1. **Apply SQL Script ke Supabase:**
   ```sql
   -- Copy dan run add_return_number_column.sql
   ```

2. **Restart Development Server:**
   ```bash
   npm run dev
   ```

3. **Test Complete Flow:**
   - Submit new return request
   - Verify return_number generated
   - Test URL routing
   - Verify timeline parameter persists

4. **Production Deployment:**
   - Apply SQL script to production
   - Deploy frontend changes
   - Monitor logs for errors

## Troubleshooting

### Issue: Return number tidak ter-generate
**Solution:**
- Pastikan trigger sudah ter-create di database
- Check function `generate_return_number()` exists
- Verify trigger enabled: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_set_return_number';`

### Issue: URL redirect ke order-detail instead of return-detail
**Solution:**
- Check API response includes `return_number`
- Verify frontend receives `result.return_number`
- Check console.log untuk error

### Issue: Timeline parameter masih hilang
**Solution:**
- Pastikan `loadingReturnData` state ter-update
- Check useEffect dependencies
- Verify finally block sets `loadingReturnData(false)`

## Contact

Jika ada pertanyaan atau issue, silakan check:
- Console browser untuk error logs
- Network tab untuk API responses
- Database logs untuk trigger execution
