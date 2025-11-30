import { NextResponse } from 'next/server';

export async function GET() {
  const faqs = [
    {
      id: 'faq-1',
      question: 'Kapan pesanan saya tiba?',
      answer: 'Proses pengiriman biasanya memerlukan waktu dengan estimasi 3 - 4 hari.',
      category: 'shipping'
    },
    {
      id: 'faq-2',
      question: 'Apakah saya bisa membatalkan pesanan?',
      answer: 'Sayangnya kami tidak menerima pembatalan pesanan, pesanan akan dikirim setelah anda melakukan pemesanan. Tapi jangan khawatir, jika anda merasa salah dalam memilih ukuran sandal, anda dapat mengubahnya pada detail pesanan.',
      category: 'order'
    },
    {
      id: 'faq-3',
      question: 'Apakah saya bisa mengganti ukuran sandal jika salah pilih?',
      answer: 'Ya, anda bisa mengganti ukuran sandal jika salah dalam memilih ukuran dalam pesanan anda. Perlu diingat, bahwa pergantian ukuran sandal ini hanya dapat dilakukan ketika pesanan anda belum dikirim ke pihak ekspedisi.',
      category: 'product'
    },
    {
      id: 'faq-4',
      question: 'Siapa yang menanggung ongkos kirim saat melakukan pengembalian barang?',
      answer: 'Saat permintaan pengembalian anda disetujui, segala ongkos kirim telah ditanggung oleh MEORIS.',
      category: 'return'
    },
    {
      id: 'faq-5',
      question: 'Bagaimana cara memperbarui detail pesanan seperti ukuran sandal?',
      answer: 'Baik, saya akan menjelaskan cara untuk memperbarui detail pesanan, seperti ukuran sandal.\nPerlu diketahui bahwa perubahan detail pesanan hanya dapat dilakukan jika pesanan Anda belum dikirim ke pihak jasa ekspedisi.\n\nBerikut langkah-langkah untuk memperbarui ukuran sandal pada detail pesanan:\n\n1. Pergi ke halaman daftar pesanan Anda ([klik di sini](https://meoris.id/user/purchase?pesanan-saya=all))\n\n2. Pilih salah satu pesanan yang ingin Anda perbarui, lalu klik tombol "Lihat Detail".\n\n3. Setelah Anda mengklik "Lihat Detail", halaman baru akan terbuka dan menampilkan detail pesanan.\n\n4. Klik tombol "Perbarui Detail Pesanan".\n\n5. Pilih ukuran sandal yang tersedia.\n\n6. Klik tombol "Perbarui Pesanan", dan ukuran sandal pada pesanan Anda akan berhasil diperbarui.',
      category: 'order'
    },
    {
      id: 'faq-6',
      question: 'Bagaimana cara update informasi akun seperti password, email dan nomor hp?',
      answer: 'Anda dapat memperbarui informasi Email, Password dan Nomor HP pada halaman profile atau ([Klik disini](https://meoris.id/user/purchase?view=profile))',
      category: 'account'
    }
  ];

  return NextResponse.json({ success: true, data: faqs });
}
