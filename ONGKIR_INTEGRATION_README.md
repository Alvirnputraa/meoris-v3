# Integrasi Ongkir di Halaman Checkout

## Deskripsi
Halaman checkout sekarang mengambil data ongkir secara dinamis dari tabel `ongkir` di database Supabase.

## Perubahan yang Dilakukan

### 1. Database Functions (`/app/src/lib/database.ts`)
Menambahkan fungsi baru `ongkirDb` untuk fetch data ongkir:

```typescript
export const ongkirDb = {
  // Get ongkir (biasanya hanya ada 1 row dengan nilai ongkir default)
  async get() {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  },

  // Get all ongkir records (jika ada multiple)
  async getAll() {
    const { data, error } = await supabase
      .from('ongkir')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
```

### 2. Checkout Page (`/app/src/app/produk/checkout/page.tsx`)

#### a. Import ongkirDb
```typescript
import { keranjangDb, praCheckoutDb, produkDb, checkoutSubmissionDb, userDb, ongkirDb } from '@/lib/database'
```

#### b. State Management
Menambahkan state untuk menyimpan data ongkir:
```typescript
const [ongkirAmount, setOngkirAmount] = useState<number>(0)
const [ongkirLoading, setOngkirLoading] = useState(false)
```

#### c. Load Data Ongkir
```typescript
useEffect(() => {
  const loadOngkir = async () => {
    setOngkirLoading(true)
    try {
      const data = await ongkirDb.get()
      if (data && data.ongkir) {
        setOngkirAmount(Number(data.ongkir))
      }
    } catch (error) {
      console.error('Error loading ongkir:', error)
      setOngkirAmount(0)
    } finally {
      setOngkirLoading(false)
    }
  }

  loadOngkir()
}, [])
```

#### d. Perhitungan Total
Update perhitungan untuk include ongkir:
```typescript
const shippingCost = ongkirAmount
const totalAmount = praCheckoutData ? Number(praCheckoutData.total_amount) + shippingCost : subtotal + shippingCost
```

#### e. UI Updates

**Card Pengiriman - J&T Express & JNE:**
```tsx
<div className="text-right">
  {ongkirLoading ? (
    <span className="font-body text-xs text-gray-500">Loading...</span>
  ) : (
    <span className="font-body text-xs font-medium text-black">
      Rp {ongkirAmount.toLocaleString('id-ID')}
    </span>
  )}
</div>
```

**Ringkasan Pesanan - Biaya Jasa Kirim:**
```tsx
<div className="flex justify-between items-center">
  <span className="font-body text-sm text-black">Biaya Jasa Kirim</span>
  {ongkirLoading ? (
    <span className="font-body text-sm text-gray-500">Loading...</span>
  ) : (
    <span className="font-body text-sm text-black">Rp {shippingCost.toLocaleString('id-ID')}</span>
  )}
</div>
```

## Struktur Data

### Tabel Ongkir
```sql
CREATE TABLE public.ongkir (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ongkir numeric DEFAULT '140000'::numeric,
  CONSTRAINT ongkir_pkey PRIMARY KEY (id)
);
```

### Default Value
- Ongkir default: **Rp 140.000**
- Berlaku untuk semua ekspedisi (J&T Express dan JNE)

## Flow Penggunaan

1. **User membuka halaman checkout**
   - Sistem fetch data ongkir dari database
   - Menampilkan "Loading..." saat data masih dimuat

2. **Data ongkir berhasil dimuat**
   - Harga ongkir ditampilkan di card ekspedisi
   - Biaya jasa kirim ditampilkan di ringkasan pesanan
   - Total pesanan dihitung: Subtotal + Ongkir - Diskon

3. **User submit order**
   - Total termasuk ongkir dikirim ke payment gateway
   - Data ongkir disimpan di `checkout_submissions`

## Update Harga Ongkir

Untuk mengubah harga ongkir, update di Supabase:

```sql
-- Update ongkir menjadi Rp 150.000
UPDATE public.ongkir 
SET ongkir = 150000 
WHERE id = 1;
```

## Testing

1. Buka halaman checkout dengan pra_checkout_id yang valid
2. Pastikan tidak ada error di console
3. Verifikasi harga ongkir muncul di:
   - Card J&T Express
   - Card JNE
   - Biaya Jasa Kirim di ringkasan
   - Total pesanan sudah termasuk ongkir

## Troubleshooting

### Ongkir tidak muncul (Rp 0)
- Pastikan ada data di tabel `ongkir`
- Cek console browser untuk error
- Verifikasi Supabase connection

### Error "no rows returned"
```sql
-- Insert default ongkir jika belum ada
INSERT INTO public.ongkir (ongkir) 
VALUES (140000);
```

### Ongkir berbeda untuk tiap ekspedisi
Jika ingin ongkir berbeda per ekspedisi, perlu modifikasi:
1. Tambah kolom `ekspedisi` di tabel `ongkir`
2. Update query di `ongkirDb.get()` untuk filter by ekspedisi
3. Update UI untuk fetch ongkir berdasarkan ekspedisi terpilih

## File yang Diubah

- `/app/src/lib/database.ts` - Added ongkirDb functions
- `/app/src/app/produk/checkout/page.tsx` - Integrated ongkir display and calculation

## Notes

- Semua ekspedisi menggunakan ongkir yang sama dari tabel `ongkir`
- Ongkir otomatis terupdate ketika data di database berubah (setelah page refresh)
- Menggunakan formatting Rupiah Indonesia (id-ID)
