# Fix Timeline Step 2 Content - Atur Pengiriman

## Masalah
Konten timeline Step 2 "Atur Pengiriman" tidak muncul ketika status return = `validating`.

### Yang Hilang:
- ❌ Alamat Penjemputan (data alamat user)
- ❌ Metode Pengiriman (Pickup by Courier)
- ❌ Ekspedisi (Logo kurir yang dipilih)

### Root Cause
Kondisi rendering hanya memeriksa `status === 'approved'`:
```tsx
{activeTimelineStep === 'return' && (
  {submittedReturn?.status === 'approved' ? ( // ❌ Hanya approved
    // ... content
  )}
)}
```

## Solusi

**File**: `src/app/user/purchase/page.tsx:2527`

**Sebelum**:
```tsx
{submittedReturn?.status === 'approved' ? (
```

**Sesudah**:
```tsx
{submittedReturn?.status === 'approved' || submittedReturn?.status === 'validating' ? (
```

### Warning Banner Update
**File**: `src/app/user/purchase/page.tsx:2529-2540`

Tambahkan kondisi agar warning hanya muncul saat status masih `approved`:
```tsx
{submittedReturn?.status === 'approved' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
    <p className="text-xs text-yellow-800">
      Permintaan disetujui, Harap kemas paket anda sebelum melanjutkan tahap ini
    </p>
  </div>
)}
```

## Konten yang Ditampilkan

### Scenario 1: Status = `approved`, Belum ada waybill
**Menampilkan**:
1. ⚠️ **Warning Banner** (Yellow)
   - "Permintaan disetujui, Harap kemas paket anda sebelum melanjutkan tahap ini"

2. 📍 **Alamat Penjemputan** (Editable form)
   - Nama, phone, alamat lengkap user

3. 🚚 **Metode Pengiriman**
   - Radio: "Pickup by Courier"

4. 📦 **Pilih Kurir** (Radio buttons)
   - Logo SiCepat
   - Logo J&T Express

5. 📝 **Instruksi**
   - 5 langkah instruksi packaging dan shipping

6. ✅ **Button "Konfirmasi Pengiriman"**

### Scenario 2: Status = `approved` atau `validating`, Ada waybill
**Menampilkan**:
1. 📍 **Alamat Penjemputan** (Read-only)
   - Nama, phone, alamat lengkap user
   - Label: "Kurir akan mengambil paket ke alamat ini"

2. 🚚 **Metode Pengiriman** (Read-only)
   - Radio checked: "Pickup by Courier"

3. 📦 **Ekspedisi yang dipilih** (Read-only)
   - Logo kurir (SiCepat / J&T)
   - Nama kurir

**Visual Example (Status = validating, Ada waybill)**:
```
┌──────────────────────────────────────┐
│ Alamat Penjemputan                   │
│ Kurir akan mengambil paket ke alamat │
│ ini                                  │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ John Doe                         │ │
│ │ 081234567890                     │ │
│ │ Jl. Raya No. 123, Kel. Cipete,   │ │
│ │ Kec. Cilandak, Jakarta Selatan,  │ │
│ │ DKI Jakarta, 12410, Indonesia    │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Metode Pengiriman                    │
│                                      │
│ ⦿ Pickup by Courier                  │
│   Kurir akan menjemput paket di      │
│   alamat Anda                        │
│                                      │
│ Ekspedisi yang dipilih:              │
│ ┌──────────────────────────────────┐ │
│ │ [SICEPAT LOGO]  SiCepat          │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Flow Diagram

```
Timeline Step 2: Atur Pengiriman
│
├─ Status = approved, No waybill
│  └─> Show: Warning + Form + Pilih Kurir + Button
│
├─ Status = approved, Has waybill
│  └─> Show: Read-only Address + Metode + Ekspedisi
│
└─ Status = validating ✅ NEW
   └─> Show: Read-only Address + Metode + Ekspedisi
```

## Testing

### Test Case 1: Status Approved, Belum Arrange Shipping
1. Return dengan status = `approved`
2. Belum ada `return_waybill`
3. Klik Step 2 "Atur Pengiriman"

**Expected**:
- ✅ Warning banner muncul
- ✅ Form alamat penjemputan
- ✅ Radio pilih kurir (SiCepat, J&T)
- ✅ Button "Konfirmasi Pengiriman"

### Test Case 2: Status Approved, Sudah Arrange Shipping
1. Return dengan status = `approved`
2. Sudah ada `return_waybill` dan `return_courier`
3. Klik Step 2 "Atur Pengiriman"

**Expected**:
- ❌ Warning banner tidak muncul
- ✅ Alamat penjemputan (read-only)
- ✅ Metode: "Pickup by Courier" (read-only)
- ✅ Logo ekspedisi yang dipilih

### Test Case 3: Status Validating (FIXED!)
1. Return dengan status = `validating`
2. Sudah ada `return_waybill` dan `return_courier`
3. Klik Step 2 "Atur Pengiriman"

**Expected**:
- ❌ Warning banner tidak muncul
- ✅ Alamat penjemputan (read-only)
- ✅ Metode: "Pickup by Courier" (read-only)
- ✅ Logo ekspedisi yang dipilih

## Courier Logo Paths

Pastikan logo kurir tersedia:
- `/images/sicepat.png` - SiCepat logo
- `/images/j&t.png` - J&T Express logo

**Code Reference**: `page.tsx:2713-2718`
```tsx
<Image
  src={submittedReturn?.return_courier === 'jnt' ? '/images/j&t.png' : '/images/sicepat.png'}
  alt={submittedReturn?.return_courier === 'jnt' ? 'J&T Express' : 'SiCepat'}
  width={60}
  height={24}
  className="object-contain"
/>
```

## Files Modified

- ✅ `src/app/user/purchase/page.tsx`
  - Line 2527: Content visibility condition
  - Lines 2529-2540: Warning banner conditional rendering

## Related Features

This fix works together with:
- ✅ `FIX_TIMELINE_NAVIGATION.md` - Timeline navigation fix
- ✅ `AUTO_STATUS_UPDATE_VALIDATING.md` - Auto-status update feature

## User Benefits

### Before Fix
- ❌ Tidak bisa lihat info alamat penjemputan saat validating
- ❌ Tidak bisa lihat ekspedisi yang dipilih
- ❌ Timeline step kosong/tidak informatif

### After Fix
- ✅ Bisa review alamat penjemputan kapan saja
- ✅ Bisa lihat ekspedisi yang digunakan
- ✅ Informasi lengkap tetap accessible
- ✅ Better UX - user tidak bingung

## Summary

Konten timeline Step 2 "Atur Pengiriman" sekarang akan muncul untuk:
- ✅ Status = `approved` (existing)
- ✅ Status = `validating` (NEW!)

Dengan informasi lengkap:
1. 📍 Alamat Penjemputan
2. 🚚 Metode Pengiriman: "Pickup by Courier"
3. 📦 Ekspedisi dengan logo kurir
