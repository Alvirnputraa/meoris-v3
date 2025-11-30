# Admin Returns Flow - Complete Guide

## 📋 Status Flow

```
1. PENDING
   ↓ [Admin klik "Setuju"]

2. APPROVED
   ↓ [User atur pengiriman return]

3. VALIDATING (barang diterima admin)
   ↓ [Admin validasi produk]

4a. APPROVED + validasi: approved
    ↓ [Admin isi form replacement]
    ↓ [Admin generate resi]

5a. REPLACEMENT_SHIPPED
    ↓ [User terima barang]

6a. COMPLETED

--- OR ---

4b. REJECTED (jika validasi rejected)
```

## 🎯 Admin Actions by Status

### Status: PENDING
**Action:** Approve / Reject
- **Button "Setuju"** → Status = `approved`
- **Button "Tolak"** → Status = `rejected`

### Status: APPROVED (belum validasi)
**Action:** Tidak ada (tunggu user atur pengiriman)
- User harus klik "Konfirmasi Pengiriman" di timeline return
- Setelah user konfirmasi → Status = `validating`

### Status: VALIDATING 🔥
**Action:** Validasi Produk (TAMPIL DI SIDEBAR!)

**Sidebar menampilkan:**
1. Detail Pengajuan (alasan, deskripsi, foto, video)
2. Alamat Pengiriman
3. **Form Validasi Produk:**
   - Textarea: Catatan Validasi (opsional)
   - Button "✓ Validasi APPROVED" (hijau)
   - Button "✗ Validasi REJECTED" (merah)

**Jika klik "Validasi APPROVED":**
- `validasi` = `approved`
- Status tetap `approved`
- Sidebar reload → Muncul **Form Isian Produk Penggantian**

**Jika klik "Validasi REJECTED":**
- `validasi` = `rejected`
- Status = `rejected`
- Return request ditutup
- Sidebar close

### Status: APPROVED + validasi: approved ✅
**Action:** Isi Form Replacement & Generate Resi

**Sidebar menampilkan:**
1. Detail Pengajuan
2. Alamat Pengiriman
3. **Form Isian Produk Penggantian:**
   - Input: Nama Produk
   - Input: Ukuran Produk
   - Input: Jumlah Produk
   - Button "Add"
4. **List Produk** (setelah add)
   - Button "Simpan Produk"
5. **Pilih Kurir:** SiCepat / JNT / JNE
6. Button **"Approve dan Generate Resi"**

**Setelah generate resi:**
- Status = `replacement_shipped`
- Waybill tersimpan
- Barang pengganti dikirim ke customer

### Status: REPLACEMENT_SHIPPED
**Action:** Tidak ada (tunggu user terima barang)
- User akan terima barang pengganti
- Status otomatis jadi `completed` (atau manual by admin)

### Status: COMPLETED
**Action:** Selesai, tidak ada action

### Status: REJECTED
**Action:** Selesai, tidak ada action

---

## 🖥️ UI Reference

### Main Table
| Order ID | Pelanggan | Alasan | Jumlah | Status | Tanggal | **Aksi** |
|----------|-----------|--------|--------|--------|---------|----------|
| DEV-T... | MAYAR | damaged | Rp 500K | 🟠 Validasi | 12 Nov | **Detail** |

### Sidebar - Status VALIDATING

```
┌─────────────────────────────────────────┐
│  Detail Pengembalian              [X]   │
├─────────────────────────────────────────┤
│ Order ID: DEV-T44456308106T2URE         │
│ Customer: MAYAR                          │
│ Status: 🟠 Validasi                      │
├─────────────────────────────────────────┤
│ Detail Pengajuan Pengembalian           │
│ • Alasan: damaged                        │
│ • Deskripsi: jksbjkbefseg               │
│ • Video: awfklnawlfk                    │
│ • Foto: [img] [img] [img]               │
├─────────────────────────────────────────┤
│ Alamat Pengiriman                        │
│ MAYAR                                    │
│ 08745373672                              │
│ kemyarona, Mangkubumi, ...              │
├─────────────────────────────────────────┤
│ ✨ Validasi Produk                       │
│ ┌─────────────────────────────────────┐ │
│ │ ℹ️ Barang sudah diterima             │ │
│ │ Lakukan validasi kondisi produk     │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Catatan Validasi (Opsional)            │
│ ┌─────────────────────────────────────┐ │
│ │ [Textarea input...]                  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌────────────────┐ ┌──────────────────┐│
│ │ ✓ Validasi     │ │ ✗ Validasi       ││
│ │   APPROVED     │ │   REJECTED       ││
│ └────────────────┘ └──────────────────┘│
└─────────────────────────────────────────┘
```

### Sidebar - After Validasi APPROVED

```
┌─────────────────────────────────────────┐
│  Detail Pengembalian              [X]   │
├─────────────────────────────────────────┤
│ ... (Detail Pengajuan & Alamat) ...     │
├─────────────────────────────────────────┤
│ ✨ Form Isian Produk Penggantian        │
│                                          │
│ Nama Produk                             │
│ ┌─────────────────────────────────────┐ │
│ │ Sepatu Sneakers Black                │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Ukuran Produk                           │
│ ┌─────────────────────────────────────┐ │
│ │ 42                                   │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Jumlah Produk                           │
│ ┌─────────────────────────────────────┐ │
│ │ 1                                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │           Add                        │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ List Produk                              │
│ ┌─────────────────────────────────────┐ │
│ │ Sepatu Sneakers Black        [🗑️]   │ │
│ │ Ukuran: 42 | Qty: 1                 │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │        Simpan Produk                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Pilih Kurir                              │
│ ⚪ SiCepat                               │
│ 🔵 JNT                                   │
│ ⚪ JNE                                   │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │   Approve dan Generate Resi          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🔄 Complete Test Scenario

### Scenario 1: Happy Path (Validasi Approved)

1. **Status: VALIDATING**
   - Admin buka http://localhost:3000/admin/returns
   - Lihat order DEV-T44456308106T2URE
   - Status: 🟠 Validasi
   - Klik button "Detail"

2. **Sidebar muncul dengan Form Validasi**
   - Lihat detail pengajuan (alasan, foto, dll)
   - Isi catatan (opsional): "Produk dalam kondisi baik"
   - Klik "✓ Validasi APPROVED"
   - Confirm dialog
   - Alert: "Validasi approved! Silakan isi form produk pengganti."

3. **Sidebar reload, muncul Form Replacement**
   - Isi Nama Produk: "Sepatu Sneakers Black"
   - Isi Ukuran: "42"
   - Isi Jumlah: "1"
   - Klik "Add"
   - Produk muncul di List
   - Klik "Simpan Produk"

4. **Generate Resi**
   - Pilih kurir: JNT
   - Klik "Approve dan Generate Resi"
   - Confirm dialog
   - API call Biteship
   - Alert: "Resi berhasil di-generate! Nomor Resi: XXX - Kurir: J&T Express"
   - Status berubah jadi `replacement_shipped`
   - Sidebar close

5. **Verify**
   - Refresh page
   - Status sekarang: 🟣 Pengganti Dikirim
   - Selesai!

### Scenario 2: Validasi Rejected

1. **Status: VALIDATING**
   - Klik "Detail"
   - Klik "✗ Validasi REJECTED"
   - Prompt: "Alasan validasi REJECTED:"
   - Input: "Produk tidak sesuai, ada kerusakan yang tidak dilaporkan"
   - OK
   - Alert: "Validasi rejected. Return request ditutup."
   - Sidebar close

2. **Verify**
   - Status sekarang: 🔴 Ditolak
   - Tidak ada action lagi

---

## 🐛 Troubleshooting

### Form Replacement tidak muncul
**Symptom:** Sidebar hanya menampilkan detail, tidak ada form

**Check:**
```bash
node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config({ path: '.env' }); const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); (async () => { const { data } = await supabase.from('returns').select('status, validasi').eq('order_number', 'DEV-T44456308106T2URE').single(); console.log('Status:', data.status, '| Validasi:', data.validasi); })();"
```

**Expected for Form Replacement to show:**
- Status: `approved`
- Validasi: `approved`

**If not:**
- Status: `validating` → Lakukan validasi dulu!
- Validasi: `null` → Lakukan validasi dulu!

### Error saat Generate Resi
**Check:**
1. Replacement items sudah disimpan?
2. User punya alamat di `user_addresses`?
3. Biteship API key valid?
4. Nomor telepon user valid (min 10 digit)?

---

## 📝 Summary

✅ **Status VALIDATING** → Admin lakukan validasi produk
✅ **Validasi APPROVED** → Form replacement muncul
✅ **Generate Resi** → Status jadi `replacement_shipped`
✅ **Complete Flow** → Tested dan working!

File ini menjelaskan alur lengkap dari PENDING sampai COMPLETED.
