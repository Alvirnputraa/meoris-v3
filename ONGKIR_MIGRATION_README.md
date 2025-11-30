# Migrasi Kolom Ongkir - Tabel Produk

## Deskripsi
Menambahkan kolom `ongkir` ke tabel `produk` untuk menyimpan informasi harga ongkir setiap produk.

## File SQL yang Tersedia

### 1. `alter_produk_add_ongkir.sql`
Query untuk menambahkan kolom ongkir ke tabel produk yang sudah ada.

**Isi Query:**
```sql
ALTER TABLE public.produk 
ADD COLUMN ongkir numeric DEFAULT 0;
```

### 2. `create_produk_table_with_ongkir.sql`
Query lengkap CREATE TABLE dengan kolom ongkir (untuk referensi atau membuat tabel baru).

## Cara Menjalankan di Supabase

### Opsi 1: Menggunakan Supabase Dashboard (Recommended)
1. Login ke https://supabase.com
2. Pilih project: **vtwooclhjobgdgvljauq**
3. Klik menu **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. Copy paste isi file `alter_produk_add_ongkir.sql`
6. Klik tombol **Run** atau tekan `Ctrl+Enter`

### Opsi 2: Menggunakan Supabase CLI
```bash
# Pastikan sudah login
supabase login

# Link ke project
supabase link --project-ref vtwooclhjobgdgvljauq

# Jalankan migration
supabase db execute -f alter_produk_add_ongkir.sql
```

### Opsi 3: Manual Query
Jalankan query ini di SQL Editor:
```sql
ALTER TABLE public.produk 
ADD COLUMN ongkir numeric DEFAULT 0;
```

## Struktur Kolom Baru

| Kolom    | Tipe    | Default | Deskripsi                    |
|----------|---------|---------|------------------------------|
| `ongkir` | numeric | 0       | Harga ongkir untuk produk ini |

## Contoh Penggunaan

### Update Ongkir untuk Produk Tertentu
```sql
-- Update ongkir untuk satu produk
UPDATE public.produk 
SET ongkir = 15000 
WHERE id = 'uuid-produk-anda';

-- Update ongkir berdasarkan kategori
UPDATE public.produk 
SET ongkir = 20000 
WHERE kategori = 'Sandal';

-- Update ongkir untuk semua produk
UPDATE public.produk 
SET ongkir = 15000;
```

### Query Produk dengan Ongkir
```sql
-- Ambil produk dengan total harga (harga + ongkir)
SELECT 
  id,
  nama_produk,
  harga,
  ongkir,
  (harga + ongkir) as total_harga
FROM public.produk;
```

## Update Aplikasi

Setelah migrasi database, update kode aplikasi untuk menggunakan kolom ongkir:

### Backend (API)
Update query di `/app/src/lib/database.ts` atau file database lainnya untuk include kolom `ongkir`:

```typescript
// Contoh: Fetch produk dengan ongkir
const { data, error } = await supabase
  .from('produk')
  .select('id, nama_produk, harga, ongkir, photo1, deskripsi');
```

### Frontend (Display)
Tampilkan ongkir di halaman detail produk atau checkout:

```tsx
// Contoh: Display ongkir
<div>
  <p>Harga Produk: Rp {product.harga.toLocaleString('id-ID')}</p>
  <p>Ongkir: Rp {product.ongkir.toLocaleString('id-ID')}</p>
  <p>Total: Rp {(product.harga + product.ongkir).toLocaleString('id-ID')}</p>
</div>
```

## Verifikasi Migrasi

Setelah menjalankan query, verifikasi dengan:

```sql
-- Cek struktur tabel
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'produk' 
AND column_name = 'ongkir';

-- Cek data
SELECT id, nama_produk, harga, ongkir 
FROM public.produk 
LIMIT 5;
```

## Rollback (jika diperlukan)

Jika perlu membatalkan perubahan:

```sql
ALTER TABLE public.produk 
DROP COLUMN ongkir;
```

## Catatan
- Kolom `ongkir` memiliki default value `0`, jadi semua produk existing akan memiliki ongkir 0 secara otomatis
- Tipe data `numeric` dipilih untuk presisi harga yang akurat
- Update nilai ongkir sesuai dengan kebijakan pengiriman Anda
