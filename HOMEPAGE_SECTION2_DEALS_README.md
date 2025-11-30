# Homepage Section 2 Deals Implementation

## Overview
Implementasi ini mengganti data statis di Section 2 homepage dengan data dinamis dari database menggunakan tabel `homepage_section2_deals`.

## Database Schema

### Tabel: `homepage_section2_deals`
```sql
CREATE TABLE IF NOT EXISTS homepage_section2_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  harga_diskon NUMERIC(12, 2),
  urutan_tampilan INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  mulai_tayang TIMESTAMP WITH TIME ZONE,
  selesai_tayang TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Field Explanation:
- `id`: Primary key UUID
- `produk_id`: Foreign key ke tabel produk
- `harga_diskon`: Harga setelah diskon (opsional)
- `urutan_tampilan`: Urutan tampilan untuk sorting
- `is_active`: Status aktif/non-aktif
- `mulai_tayang`: Waktu mulai tayang (opsional)
- `selesai_tayang`: Waktu selesai tayang (opsional)

## API Endpoints

### GET `/api/homepage-section2-deals`
Mengambil semua deals atau hanya yang aktif.

Query Parameters:
- `limit` (number): Jumlah maksimal data (default: 10)
- `offset` (number): Offset untuk pagination (default: 0)
- `activeOnly` (boolean): Hanya ambil yang aktif (default: false)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "produk_id": "uuid",
      "harga_diskon": 299000,
      "urutan_tampilan": 1,
      "is_active": true,
      "produk": {
        "id": "uuid",
        "nama_produk": "Nama Produk",
        "photo1": "url_gambar",
        "harga": 499000
      }
    }
  ]
}
```

### POST `/api/homepage-section2-deals`
Membuat deal baru.

Request Body:
```json
{
  "produk_id": "uuid",
  "harga_diskon": 299000,
  "urutan_tampilan": 1,
  "is_active": true,
  "mulai_tayang": "2024-01-01T00:00:00Z",
  "selesai_tayang": "2024-12-31T23:59:59Z"
}
```

### PUT `/api/homepage-section2-deals/[id]`
Update deal yang ada.

Request Body: Sama dengan POST

### DELETE `/api/homepage-section2-deals/[id]`
Hapus deal.

## Frontend Implementation

### State Management
```typescript
const [deals, setDeals] = useState<any[]>([]);
const [dealsLoading, setDealsLoading] = useState(true);
const [dealsError, setDealsError] = useState<string | null>(null);
```

### Data Loading
```typescript
useEffect(() => {
  const loadDeals = async () => {
    try {
      setDealsLoading(true);
      const data = await homepageSection2DealsDb.getActive(10);
      const transformedDeals = data.map(deal => ({
        id: deal.id,
        img: deal.produk?.photo1 || '/images/test1p.png',
        old: deal.produk?.harga ? `Rp ${Number(deal.produk.harga).toLocaleString('id-ID')}` : 'Rp 0',
        new: deal.harga_diskon ? `Rp ${Number(deal.harga_diskon).toLocaleString('id-ID')}` : (deal.produk?.harga ? `Rp ${Number(deal.produk.harga).toLocaleString('id-ID')}` : 'Rp 0'),
        title: 'SPESIAL DISKON',
        subtitle: 'UNTUK KAMU',
        produk_id: deal.produk_id,
        produk: deal.produk
      }));
      setDeals(transformedDeals);
    } catch (error) {
      setDealsError('Gagal memuat data deals');
    } finally {
      setDealsLoading(false);
    }
  };
  loadDeals();
}, []);
```

## Setup Instructions

### 1. Create Table
```bash
psql -d your_database -f create_homepage_section2_deals_table.sql
```

### 2. Seed Data
```bash
psql -d your_database -f seed_homepage_section2_deals.sql
```

### 3. Update Product IDs
Pastikan `produk_id` di file seed sesuai dengan ID produk yang ada di tabel `produk`.

## Benefits

1. **Dynamic Content**: Admin bisa mengubah deals tanpa perlu deploy ulang
2. **Centralized Management**: Semua deals dikelola di satu tempat
3. **Performance**: Loading data yang efisien dengan proper indexing
4. **Scalability**: Mudah menambah fitur baru seperti scheduling, analytics, dll
5. **Consistency**: Data produk konsisten dengan tabel utama

## Future Enhancements

1. **Admin Dashboard**: UI untuk mengelola deals
2. **Scheduling**: Automatic activation/deactivation based on dates
3. **Analytics**: Track deal performance
4. **A/B Testing**: Test different deals for different users
5. **Cache**: Implement Redis cache for better performance