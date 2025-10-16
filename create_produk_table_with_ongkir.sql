-- CREATE TABLE produk dengan kolom ongkir
-- Versi terbaru dengan kolom ongkir untuk menyimpan harga ongkir

CREATE TABLE public.produk (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nama_produk character varying NOT NULL,
  deskripsi text,
  size1 character varying,
  size2 character varying,
  size3 character varying,
  size4 character varying,
  size5 character varying,
  photo1 text,
  photo2 text,
  photo3 text,
  harga numeric DEFAULT 0,
  stok integer DEFAULT 0,
  kategori character varying,
  ongkir numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT produk_pkey PRIMARY KEY (id)
);

-- Index untuk performa query
CREATE INDEX idx_produk_kategori ON public.produk(kategori);
CREATE INDEX idx_produk_created_at ON public.produk(created_at DESC);

-- Comments untuk dokumentasi
COMMENT ON TABLE public.produk IS 'Tabel untuk menyimpan data produk sandal Meoris';
COMMENT ON COLUMN public.produk.ongkir IS 'Harga ongkir untuk produk ini (dalam Rupiah)';
COMMENT ON COLUMN public.produk.harga IS 'Harga produk (dalam Rupiah)';
COMMENT ON COLUMN public.produk.stok IS 'Jumlah stok tersedia';
