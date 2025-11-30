# Panduan Debug Ongkir di Console

## Langkah Debugging

### 1. Buka Checkout Page
1. Pastikan ada item di cart
2. Buka halaman: `http://localhost:3000/produk/checkout?pra_checkout_id=<your_id>`
3. Buka Console browser (F12 → Console tab)

### 2. Cari Log Messages

Akan muncul beberapa console log dengan format:

#### A. Raw Biteship Response
```javascript
[Biteship Rates] Raw pricing data: [
  {
    company: "jnt",
    courier_service_name: "REG",
    price: 14000,
    ...
  },
  ...
]
```

**Cek:** Apakah ada object dengan company: "jne" atau "sicepat"?

#### B. Parsed Rates (Per Courier)
```javascript
[Biteship Rate] { company: 'jnt', service: 'reg', price: 14000, rawRate: {...} }
[Biteship Rate] { company: 'jne', service: 'reg', price: 15000, rawRate: {...} }
[Biteship Rate] { company: 'sicepat', service: 'reguler', price: 13000, rawRate: {...} }
```

**Cek:** Berapa banyak rate yang di-parse? Apakah ada JNE dan SiCepat?

#### C. Final Mapped Rates
```javascript
[Biteship Rates] Loaded rates: { 'j&t': 14000, 'jne': 15000, 'sicepat': 13000 }
```

**Expected:** Harus ada 3 keys dengan harga > 0

#### D. Render Logs (3x untuk setiap courier)
```javascript
[renderOngkirPrice] { label: 'J&T Express', key: 'j&t', amount: 14000, allOptions: {...} }
[renderOngkirPrice] { label: 'JNE', key: 'jne', amount: 15000, allOptions: {...} }
[renderOngkirPrice] { label: 'SiCepat', key: 'sicepat', amount: 13000, allOptions: {...} }
```

**Expected:** amount harus number (bukan undefined atau null)

## Analisis Masalah

### Skenario 1: JNE Tidak Ada di Raw Response
**Symptom:**
```javascript
[Biteship Rates] Raw pricing data: [
  { company: "jnt", ... },
  { company: "sicepat", ... }
  // ❌ Tidak ada JNE
]
```

**Penyebab:**
- Kode pos tidak dilayani JNE
- Berat/dimensi melebihi limit JNE
- Service JNE sedang down di Biteship

**Solusi:** Gunakan fallback database ongkir

---

### Skenario 2: Company Name Tidak Match
**Symptom:**
```javascript
[Biteship Rates] Raw pricing data: [
  { company: "PT Jalur Nugraha Ekakurir", ... }  // ❌ Bukan "jne"
]

[Biteship Rate] { company: 'pt jalur nugraha ekakurir', service: 'reg', price: 15000 }

[Biteship Rates] Loaded rates: { 'j&t': 14000, 'sicepat': 13000 }  // ❌ JNE tidak ada
```

**Penyebab:** Nama company dari Biteship berbeda dari ekspektasi

**Solusi:** Perlu tambah mapping variation di code

---

### Skenario 3: Field Name Berbeda
**Symptom:**
```javascript
[Biteship Rate] { company: '', service: '', price: 0, rawRate: { courier_name: 'JNE', ... } }
```

**Penyebab:** Biteship menggunakan field name yang berbeda

**Solusi:** Perlu adjust field extraction di code

---

### Skenario 4: Semua Berfungsi Normal
**Expected Output:**
```javascript
[Biteship Rates] Raw pricing data: [
  { company: "jnt", courier_service_name: "REG", price: 14000 },
  { company: "jne", courier_service_name: "REG", price: 15000 },
  { company: "sicepat", courier_service_name: "REGULER", price: 13000 }
]

[Biteship Rate] { company: 'jnt', service: 'reg', price: 14000, rawRate: {...} }
[Biteship Rate] { company: 'jne', service: 'reg', price: 15000, rawRate: {...} }
[Biteship Rate] { company: 'sicepat', service: 'reguler', price: 13000, rawRate: {...} }

[Biteship Rates] Loaded rates: { 'j&t': 14000, 'jne': 15000, 'sicepat': 13000 }

[renderOngkirPrice] { label: 'J&T Express', key: 'j&t', amount: 14000, allOptions: {...} }
[renderOngkirPrice] { label: 'JNE', key: 'jne', amount: 15000, allOptions: {...} }
[renderOngkirPrice] { label: 'SiCepat', key: 'sicepat', amount: 13000, allOptions: {...} }
```

**Result:** Semua 3 courier muncul dengan harga

## Cara Copy Console Logs

### Chrome/Edge:
1. Klik kanan di console
2. Pilih "Save as..."
3. Atau select all (Ctrl+A) → Copy (Ctrl+C)

### Firefox:
1. Klik kanan di console
2. "Export Visible Messages to File"

## Informasi yang Perlu Dilaporkan

Jika masih ada masalah, copy dan kirim:

1. **Full console output** setelah load checkout page
2. **Screenshot** dari UI (apakah JNE dan SiCepat muncul?)
3. **Postal code** yang digunakan (dari alamat pengiriman)
4. **Total berat** produk di cart

## Quick Test dengan Postal Code Berbeda

Test dengan beberapa postal code berbeda:

| Kode Pos | Area | Courier Support |
|----------|------|----------------|
| 12950 | Jakarta Selatan | J&T, JNE, SiCepat ✅ |
| 60119 | Surabaya | J&T, JNE, SiCepat ✅ |
| 40115 | Bandung | J&T, JNE, SiCepat ✅ |
| 80361 | Denpasar | J&T, JNE, SiCepat ✅ |

Jika postal code tertentu tidak support courier, itu normal behavior.

---

**Dibuat:** 2025-01-15
**File terkait:** `src/app/produk/checkout/page.tsx`
