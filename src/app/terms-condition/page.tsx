"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import { useAuth } from '@/lib/auth-context';
import { useChatContext } from '@/lib/chat-context';

export default function TermsConditionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { openChat } = useChatContext();
  const [showTopBar, setShowTopBar] = useState(true);

  return (
    <main className="min-h-screen bg-white">
      {/* Top black bar - Same as home */}
      <div className="fixed top-0 left-0 right-0 w-full bg-black h-8 md:h-10 z-[59]">
        <div className="w-full max-w-[1160px] mx-auto h-full flex items-center justify-between px-6 md:px-8 lg:px-10">
          <p className="font-belleza text-white text-xs md:text-sm overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-typing">
              <span className="font-bold">Dapatkan potongan diskon dan pengiriman</span> - <span
                className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => {
                  router.push('/#voucher-section');
                }}
              >cek disini</span>
            </span>
          </p>
          <style jsx>{`
            @keyframes typing {
              0% {
                width: 0;
              }
              30.4% {
                width: 100%;
              }
              100% {
                width: 100%;
              }
            }

            @keyframes wipeOut {
              0%, 91.3% {
                width: 0;
              }
              100% {
                width: 100%;
              }
            }

            .animate-typing {
              overflow: hidden;
              white-space: nowrap;
              animation: typing 11.5s steps(55, end) infinite;
              display: inline-block;
              max-width: fit-content;
              position: relative;
            }

            .animate-typing::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              height: 100%;
              width: 0;
              background-color: black;
              animation: wipeOut 11.5s ease-out infinite;
            }
          `}</style>

          {/* Top Menu Links - Desktop Only */}
          <div className="hidden md:flex items-center gap-3 md:gap-4">
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  router.push('/user/purchase?pesanan-saya=all');
                }
              }}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              LACAK PESANAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  router.push('/user/purchase?view=notifications');
                }
              }}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              NOTIFIKASI
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button onClick={openChat} className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer">
              FAQ & BANTUAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect width="20" height="7" fill="#FF0000"/>
              <rect y="7" width="20" height="7" fill="#FFFFFF"/>
            </svg>
          </div>

          {/* Indonesian Flag - Mobile Only */}
          <div className="md:hidden flex items-center">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect width="20" height="7" fill="#FF0000"/>
              <rect y="7" width="20" height="7" fill="#FFFFFF"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Header component */}
      <Header variant="docs" topBarVisible={true} />

      {/* Main Content Section */}
      <section className="relative overflow-hidden bg-white pt-[120px] md:pt-[170px] pb-16">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#f8ede4,transparent_55%),radial-gradient(circle_at_bottom,#e7f0ff,transparent_60%)]"
          aria-hidden="true"
        />
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
          {/* Breadcrumb */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => router.push('/home')}
              className="font-belleza text-sm text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Home
            </button>
            <span className="font-belleza text-sm text-gray-400">/</span>
            <span className="font-belleza text-sm text-gray-900">SYARAT DAN KETENTUAN</span>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-cormorant text-2xl md:text-3xl text-black leading-tight mb-2">
              SYARAT DAN KETENTUAN
            </h1>
            <p className="font-belleza text-xs text-gray-600">
              Berlaku sejak Juli 2025
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Introduction */}
            <div className="space-y-2">
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Website ini dimiliki dan dioperasikan oleh meoris.id, dan Syarat dan Ketentuan ini berlaku bagi setiap pengunjung dan pengguna meoris.id. Istilah "Kami" merujuk pada meoris.id sebagai penyedia website ini, sedangkan "Anda" merujuk pada pengguna yang menerima Syarat dan Ketentuan ini.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Apabila Anda tidak menyetujui Syarat dan Ketentuan ini, mohon untuk tidak menggunakan website ini.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 1: Kelayakan */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Kelayakan
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Sebagai pengguna dan untuk melakukan pemesanan di meoris.id, Anda harus berusia setidaknya 17 (tujuh belas) tahun. Jika Anda berusia di bawah 17 (tujuh belas) tahun, Anda hanya dapat melakukan pemesanan di meoris.id dengan persetujuan dan keterlibatan orang tua atau wali Anda.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jika Anda tidak memiliki persetujuan dan keterlibatan dari orang tua atau wali, Anda wajib berhenti menggunakan situs ini.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 2: Kebijakan Privasi */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Kebijakan Privasi
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Anda menyatakan bahwa semua informasi dan data pribadi yang diberikan kepada meoris.id melalui website, email, telepon, atau bentuk komunikasi lainnya adalah benar milik Anda dan bukan diperoleh dari pihak ketiga tanpa izin yang sah.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Anda mengakui bahwa Anda telah membaca dan memahami Kebijakan Privasi kami serta menyetujui seluruh ketentuannya. Secara khusus, Anda setuju dan memberikan izin kepada kami untuk mengumpulkan, memproses, menganalisis, menyimpan, mengungkapkan, mentransfer, dan menghapus informasi pribadi Anda sesuai dengan Kebijakan Privasi kami.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Silakan kunjungi halaman{' '}
                <button
                  onClick={() => router.push('/privacy-policy')}
                  className="text-blue-600 hover:text-blue-800 underline font-semibold transition-colors"
                >
                  Kebijakan Privasi
                </button>
                {' '}untuk mengakses versi terbaru dari kebijakan kami.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 3: Lisensi dan Akses ke Website */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Lisensi dan Akses ke Website
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id dan seluruh konten yang disediakan di dalamnya merupakan milik meoris.id serta para pemberi lisensi atau penyedia konten, dan dilindungi oleh hak cipta, merek dagang, serta hukum yang berlaku di Republik Indonesia maupun peraturan lain yang relevan, baik domestik maupun internasional.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id memberikan Anda lisensi terbatas untuk mengakses dan menggunakan website ini untuk keperluan pribadi. Kecuali dinyatakan lain, Anda diizinkan untuk mengakses, menyalin, mengunduh, dan mencetak konten yang tersedia di website untuk penggunaan pribadi dan non-komersial, selama Anda tidak mengubah atau menghapus informasi hak cipta, merek dagang, atau informasi kepemilikan lainnya yang terdapat dalam konten tersebut.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id serta para pemberi lisensi atau penyedia konten tetap memegang seluruh hak atas konten yang tersedia di website, termasuk hak kekayaan intelektual, dan menyediakan konten tersebut berdasarkan lisensi yang dapat dicabut kapan saja sesuai kebijakan meoris.id.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 4: Larangan */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Larangan
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id melarang keras segala bentuk penyalahgunaan konten yang disediakan di website, termasuk namun tidak terbatas pada: mengunduh, menyalin, atau menggunakan konten untuk bersaing dengan meoris.id atau memberi keuntungan bagi pihak ketiga; melakukan caching atau tautan ke website tanpa izin, serta melakukan framing ilegal terhadap konten yang tersedia di website; melakukan perubahan, distribusi, penyebaran, eksekusi, penyiaran, publikasi, pengunggahan, pemberian lisensi, manipulasi, transfer, penjualan, atau pembuatan karya turunan dari konten, produk, atau layanan apa pun yang tidak Anda miliki hak penggunaannya.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Dilarang mengunggah, mengirim, atau menyebarkan materi yang mengandung virus perangkat lunak, kode komputer, berkas, atau program yang dirancang untuk merusak, mengganggu, atau membatasi fungsi komputer. Penggunaan perangkat keras atau perangkat lunak untuk mencegat atau mengambil informasi (misalnya data sistem atau informasi pribadi) dari website, termasuk namun tidak terbatas pada scraping, metode ekstraksi data, robot, spider, atau alat serupa juga dilarang.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Tindakan apa pun yang memaksa atau dapat memaksa beban berlebih, penggunaan yang tidak wajar atau berlebihan, atau menyebabkan kerusakan yang mengganggu infrastruktur meoris.id juga tidak diperbolehkan.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id berhak menolak atau membatalkan keanggotaan, melarang pihak mana pun dari mengakses website, dan membatasi atau menghentikan akses Anda kapan saja tanpa pemberitahuan. meoris.id tidak menjamin atau menyatakan bahwa konten yang digunakan di website bebas dari pelanggaran terhadap hak pihak ketiga yang tidak memiliki afiliasi dengan meoris.id. Penghentian akses atau penggunaan website tidak menghilangkan atau memengaruhi hak atau upaya hukum lain yang dimiliki meoris.id.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 5: SYARAT PENJUALAN */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                SYARAT PENJUALAN
              </h2>

              {/* Subsection: Informasi Produk */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Informasi Produk
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Seluruh materi dan informasi terkait produk yang disajikan oleh meoris.id ditujukan hanya untuk keperluan edukasi atau informasi pribadi.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Pernyataan mengenai produk tidak dimaksudkan untuk mengobati, menyembuhkan, meningkatkan, mendukung, atau mencegah kondisi kesehatan, olahraga, dan/atau kebugaran apa pun. Referensi terhadap produk, layanan, proses, atau informasi lainnya—baik berupa nama dagang, merek, produsen, pemasok, maupun lainnya—tidak berarti atau menyiratkan adanya dukungan, sponsor, atau rekomendasi dari meoris.id.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Klaim atau deskripsi produk yang ditampilkan pada meoris.id berasal dari pemilik merek terkait atau berdasarkan ulasan pelanggan, dan meoris.id tidak melakukan verifikasi independen terhadap klaim maupun deskripsi tersebut.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Semua produk harus digunakan sesuai dengan instruksi, peringatan, dan panduan yang disediakan.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Penggunaan website ini tidak dimaksudkan untuk menggantikan saran profesional terkait kesehatan, olahraga, dan/atau kebugaran. meoris.id hanyalah toko daring yang menyediakan produk olahraga, kebugaran, dan gaya hidup. Silakan konsultasikan dengan profesional kesehatan, olahraga, dan/atau kebugaran Anda sebelum menggunakan atau mengandalkan produk maupun informasi dari meoris.id. Profesional Anda adalah pihak yang tepat untuk menangani semua pertanyaan, kekhawatiran, atau keputusan terkait pendekatan terhadap kondisi kesehatan, olahraga, dan/atau kebugaran apa pun.
                  </li>
                  <li className="leading-relaxed pl-2">
                    meoris.id tidak memberikan jawaban atas pertanyaan terkait kesehatan, olahraga, dan/atau kebugaran, serta tidak menggantikan peran profesional di bidang tersebut. meoris.id tidak menyatakan dirinya sebagai ahli maupun profesional kesehatan, olahraga, dan/atau kebugaran, dan hal ini juga tidak dapat diartikan demikian.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Gambar produk pada meoris.id dapat sedikit berbeda dari produk sebenarnya yang Anda terima. Perbedaan ukuran 1–2 cm dapat terjadi tergantung proses pengembangan dan produksi. Warna aktual juga mungkin bervariasi, karena setiap layar perangkat memiliki kemampuan berbeda dalam menampilkan warna. Oleh karena itu, kami tidak dapat menjamin bahwa warna yang Anda lihat sepenuhnya menggambarkan warna asli produk.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Meskipun kami berupaya memastikan seluruh detail, deskripsi, dan harga yang ditampilkan di meoris.id akurat, kami tidak menjamin bahwa deskripsi, warna, informasi, harga, promosi, atau konten lainnya bebas dari kesalahan atau selalu terkini. meoris.id berhak memperbaiki kesalahan, ketidakakuratan, atau kelalaian, serta mengubah atau memperbarui informasi atau membatalkan pesanan jika terdapat informasi yang tidak akurat di website, kapan pun tanpa pemberitahuan sebelumnya, termasuk setelah Anda mengirimkan pesanan.
                  </li>
                </ol>
              </div>

              {/* Subsection: Melakukan Pemesanan */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Melakukan Pemesanan
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Untuk melakukan pemesanan, Anda harus memberikan informasi yang akurat dan benar kepada kami. Anda juga wajib memastikan bahwa informasi tersebut tetap terbaru dengan memberitahukan kepada kami jika terdapat perubahan.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Untuk mengirimkan pesanan, Anda perlu mengikuti proses belanja online yang tersedia di meoris.id. Setelah selesai, Anda akan menerima konfirmasi/invoice pesanan sebagai tanda penerimaan pesanan Anda.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Meskipun kami berupaya memastikan seluruh detail, deskripsi, dan harga yang tercantum di meoris.id akurat, tetap dimungkinkan terjadinya kesalahan. Jika kami menemukan adanya kesalahan harga pada produk yang Anda pesan, kami akan memberitahukan hal tersebut dan memberikan opsi kepada Anda untuk mengonfirmasi ulang pesanan dengan harga yang benar atau membatalkannya. Jika kami tidak dapat menghubungi Anda, pesanan akan dianggap dibatalkan. Jika Anda membatalkan pesanan sebelum kami mengirimkannya dan Anda telah melakukan pembayaran, Anda berhak menerima pengembalian dana penuh.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kami tidak berkewajiban untuk memenuhi pesanan Anda apabila harga yang tercantum di meoris.id terbukti tidak benar.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Untuk meminimalkan risiko akses tidak sah, data kartu pembayaran Anda akan dienkripsi. Setelah menerima pesanan Anda, kami akan melakukan pra-otorisasi pada kartu tersebut untuk memastikan dana yang tersedia cukup untuk menyelesaikan transaksi. Pesanan tidak akan dikonfirmasi hingga proses pra-otorisasi selesai. Kartu Anda akan didebit setelah kami mengirimkan konfirmasi pesanan. Seluruh kartu pembayaran tunduk pada proses validasi dan otorisasi oleh penerbit kartu. Jika otorisasi tidak diberikan, kami tidak bertanggung jawab atas keterlambatan atau kegagalan pengiriman.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Dengan mengklik tombol "Place Order", Anda menegaskan bahwa Anda telah meninjau pesanan Anda (warna, ukuran, jumlah, dan detail terkait lainnya), bahwa kartu yang digunakan adalah milik Anda, dan bahwa Anda memiliki dana atau fasilitas kredit yang cukup untuk membayar pesanan tersebut.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kami berhak menarik produk apa pun dari meoris.id kapan saja dan/atau menghapus atau mengubah materi atau konten apa pun di meoris.id. Kami akan berupaya memproses setiap pesanan, tetapi dalam keadaan tertentu kami mungkin perlu menolak pesanan meskipun konfirmasi/invoice telah dikirimkan. Hak ini sepenuhnya berada dalam kebijakan kami.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kami tidak bertanggung jawab kepada Anda atau pihak ketiga mana pun atas penarikan produk dari meoris.id, baik produk tersebut sudah terjual maupun belum, atas perubahan atau penghapusan konten, atau atas penolakan memproses atau menerima pesanan.
                  </li>
                </ol>
              </div>

              {/* Subsection: Metode Pembayaran */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Metode Pembayaran
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id menyediakan beberapa metode pembayaran untuk memudahkan pengalaman berbelanja Anda. Metode pembayaran yang tersedia meliputi:
                </p>

                <div className="space-y-3 ml-3">
                  {/* Transfer Bank - Virtual Account */}
                  <div className="space-y-2">
                    <h4 className="font-belleza text-xs md:text-sm text-black font-semibold">
                      1. Transfer Bank – Virtual Account
                    </h4>
                    <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                      Transfer bank (konfirmasi otomatis) atau Virtual Account (VA) adalah metode pembayaran menggunakan nomor VA unik yang diterbitkan setelah Anda menyelesaikan proses pemesanan. Setiap pesanan akan memiliki nomor VA yang berbeda.
                    </p>
                    <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed font-semibold">
                      Keuntungan menggunakan Virtual Account:
                    </p>
                    <ul className="list-disc space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                      <li className="leading-relaxed pl-2">
                        Mudah & praktis – sistem mengonfirmasi pembayaran secara otomatis.
                      </li>
                      <li className="leading-relaxed pl-2">
                        Pesanan akan diproses segera setelah pembayaran berhasil.
                      </li>
                    </ul>
                    <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                      Pastikan Anda melakukan pembayaran maksimal 1x24 jam sejak waktu konfirmasi pesanan untuk menghindari pembatalan otomatis oleh sistem.
                    </p>
                  </div>

                  {/* QRIS */}
                  <div className="space-y-2">
                    <h4 className="font-belleza text-xs md:text-sm text-black font-semibold">
                      2. QRIS
                    </h4>
                  </div>
                </div>
              </div>

              {/* Subsection: Pengiriman */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Pengiriman
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Kami berupaya mengirimkan produk kepada Anda sesuai alamat pengiriman yang tercantum pada pesanan Anda.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kami akan berusaha memberi tahu Anda apabila terjadi keterlambatan pengiriman. Namun, sejauh diizinkan oleh hukum, kami tidak bertanggung jawab atas kerugian, kewajiban, biaya, kerusakan, atau pengeluaran apa pun yang timbul akibat keterlambatan pengiriman.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Produk akan dikirim menggunakan kemasan standar kami. Anda menyatakan bahwa produk yang kami kirimkan merupakan produk standar dan tidak dibuat secara khusus untuk memenuhi kebutuhan pribadi atau permintaan spesifik Anda.
                  </li>
                </ol>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 6: Kebijakan Pengembalian (Return Policy) */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Kebijakan Pengembalian (Return Policy)
              </h2>

              {/* Subsection: Kriteria Pengembalian */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Kriteria Pengembalian
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Produk dibeli dengan harga normal atau diskon maksimal 30%. Kami tidak menerima pengembalian untuk produk yang dibeli dengan diskon lebih dari 30% selama periode promosi.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Produk belum pernah digunakan dan masih dalam kondisi asli, lengkap dengan label yang masih menempel dan tanpa kerusakan.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Produk tidak memiliki noda, jahitan rusak, kancing hilang, benang longgar, atau kondisi lain yang membuat produk tampak cacat atau rusak.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Produk harus disertai kotak merek dan kemasan asli dalam kondisi utuh. Kotak dan kemasan tidak boleh rusak atau penyok, tidak ditempeli bahan perekat, dan harus lengkap dengan seluruh item pendukung seperti karton, hanger, stiker, pita, tali, polybag, plastik, dan elemen kemasan lainnya.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Permintaan pengembalian harus diajukan dalam 2 (dua) hari sejak pesanan diterima. Produk yang dikembalikan harus sudah diterima di lokasi yang ditentukan maksimal 2 (dua) hari setelah permohonan pengembalian disetujui oleh meoris.id.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Saat mengirimkan produk untuk pengembalian, gunakan kembali kardus/box luar seperti saat Anda menerima pesanan. Tutupi kemasan produk dengan pembungkus yang kuat dan tambahkan stiker "FRAGILE" untuk mencegah kerusakan pada kotak asli selama proses pengiriman. Kami tidak menerima pengembalian apabila terdapat kerusakan pada produk maupun kemasan/kotak produk.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Proses refund memakan waktu 7 (tujuh) hingga 14 (empat belas) hari kerja, tergantung metode pengembalian dana. Refund akan diproses setelah produk yang dikembalikan kami terima dan akan dikirimkan sesuai metode pembayaran awal saat pembelian. Biaya pengiriman untuk produk yang dikembalikan tidak dapat dikembalikan.
                  </li>
                </ol>
              </div>

              {/* Subsection: Kontak Pengajuan Pengembalian */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Kontak Pengajuan Pengembalian
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Untuk mengajukan permintaan pengembalian, silakan hubungi Customer Service meoris.id melalui:
                </p>
                <ul className="list-disc space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Email: <a href="mailto:contact@meoris.id" className="text-blue-600 hover:text-blue-800 underline">contact@meoris.id</a>
                  </li>
                  <li className="leading-relaxed pl-2">
                    WhatsApp: <a href="https://wa.me/6285117313531" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">085117313531</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 7: Kebijakan Penukaran (Exchange Policy) */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Kebijakan Penukaran (Exchange Policy)
              </h2>

              {/* Subsection: Kriteria Penukaran */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Kriteria Penukaran
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Penukaran produk hanya berlaku untuk kondisi berikut:
                </p>

                {/* 1. Ukuran Tidak Sesuai */}
                <div className="ml-3 space-y-2">
                  <h4 className="font-belleza text-xs md:text-sm text-black font-semibold">
                    1. Ukuran Tidak Sesuai
                  </h4>
                  <ul className="list-disc space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                    <li className="leading-relaxed pl-2">
                      Produk yang diterima tidak sesuai dengan pesanan (misal: memesan ukuran 30, tetapi menerima ukuran 32).
                    </li>
                    <li className="leading-relaxed pl-2">
                      Ukuran pada produk berbeda dengan ukuran yang tercantum pada kemasan/kotak.
                    </li>
                    <li className="leading-relaxed pl-2">
                      Ukuran kiri dan kanan berbeda (misalnya pada sepatu atau sandal).
                    </li>
                    <li className="leading-relaxed pl-2">
                      Produk yang diterima terdiri dari sisi yang sama (misalnya kedua sepatu kanan atau kedua sepatu kiri).
                    </li>
                  </ul>
                </div>

                {/* 2. Warna Tidak Sesuai */}
                <div className="ml-3 space-y-2">
                  <h4 className="font-belleza text-xs md:text-sm text-black font-semibold">
                    2. Warna Tidak Sesuai
                  </h4>
                  <ul className="list-disc space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                    <li className="leading-relaxed pl-2">
                      Warna produk tidak sama dengan yang tertera pada deskripsi produk (misalnya memesan sepatu warna biru tetapi menerima warna merah).
                    </li>
                  </ul>
                </div>

                {/* 3. Produk Rusak atau Cacat */}
                <div className="ml-3 space-y-2">
                  <h4 className="font-belleza text-xs md:text-sm text-black font-semibold">
                    3. Produk Rusak atau Cacat
                  </h4>
                  <ul className="list-disc space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                    <li className="leading-relaxed pl-2">
                      <span className="font-semibold">Warna:</span> Warna pudar atau tidak merata.
                    </li>
                    <li className="leading-relaxed pl-2">
                      <span className="font-semibold">Material:</span> Kulit mengelupas, bahan robek, jahitan lepas, noda, bentuk berubah, atau material berlubang.
                    </li>
                    <li className="leading-relaxed pl-2">
                      <span className="font-semibold">Bagian produk:</span> Kancing lepas, resleting rusak, komponen hilang, pegangan patah, atau produk tidak dapat dipompa (misalnya bola).
                    </li>
                  </ul>
                </div>
              </div>

              {/* Subsection: Ketentuan Penukaran */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Ketentuan Penukaran
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Penukaran tidak dapat dilakukan untuk mengganti ukuran, warna, atau model lain. Namun, Anda dapat mengembalikan produk untuk refund penuh (asal memenuhi kriteria pengembalian), lalu melakukan pemesanan baru.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Penukaran hanya dapat dilakukan dengan produk yang sama (SKU sama, ukuran sama, warna sama, dan tipe sama).
                  </li>
                </ol>
              </div>

              {/* Subsection: Batas Waktu Penukaran */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Batas Waktu Penukaran
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Permintaan penukaran harus diajukan dalam 14 (empat belas) hari sejak pesanan diterima.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Produk pengganti harus diterima di lokasi yang ditentukan maksimal 7 (tujuh) hari setelah permohonan penukaran disetujui oleh meoris.id.
                  </li>
                </ol>
              </div>

              {/* Subsection: Ketentuan Pengiriman Produk untuk Ditukar */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Ketentuan Pengiriman Produk untuk Ditukar
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Saat mengirim produk untuk penukaran:
                </p>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Gunakan kembali kemasan luar/box seperti saat Anda menerima pesanan.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Lapisi kemasan produk dengan pembungkus yang kuat.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Tambahkan stiker "FRAGILE" untuk mencegah kerusakan pada kotak asli.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kami tidak menerima penukaran jika terdapat kerusakan pada produk maupun kemasan/kotak produk.
                  </li>
                </ol>
              </div>

              {/* Subsection: Kontak Pengajuan Penukaran */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Kontak Pengajuan Penukaran
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Jika ingin mengajukan permintaan penukaran, silakan hubungi Customer Service meoris.id melalui:
                </p>
                <ul className="list-disc space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Email: <a href="mailto:contact@meoris.id" className="text-blue-600 hover:text-blue-800 underline">contact@meoris.id</a>
                  </li>
                  <li className="leading-relaxed pl-2">
                    WhatsApp: <a href="https://wa.me/6285117313531" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">085117313531</a>
                  </li>
                </ul>
              </div>

              {/* Subsection: Pengecualian (Exceptions) */}
              <div className="space-y-2">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Pengecualian (Exceptions)
                </h3>
                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Kami tidak menerima permintaan penukaran berdasarkan perbedaan warna antara produk fisik yang diterima dan foto produk yang disebabkan oleh efek pencahayaan atau tampilan layar perangkat.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kami tidak menerima permintaan penukaran karena pembelian yang salah atau perubahan keputusan setelah melakukan pembelian. Kami menyarankan Anda untuk meninjau keranjang belanja dengan saksama sebelum menyelesaikan pesanan.
                  </li>
                </ol>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 8: Produk Cacat (Faulty Products) */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Produk Cacat (Faulty Products)
              </h2>

              <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  Seluruh deskripsi, informasi, dan materi terkait produk yang ditampilkan di meoris.id disediakan apa adanya ("as is") tanpa jaminan dalam bentuk apa pun, baik yang tersurat maupun tersirat.
                </li>
                <li className="leading-relaxed pl-2">
                  <p className="mb-2">Jika produk yang Anda terima terbukti cacat, silakan hubungi Customer Service meoris.id dan sertakan informasi berikut:</p>
                  <ul className="list-disc space-y-1 ml-5 md:ml-6">
                    <li className="leading-relaxed pl-2">nomor pesanan,</li>
                    <li className="leading-relaxed pl-2">nama dan alamat,</li>
                    <li className="leading-relaxed pl-2">detail produk,</li>
                    <li className="leading-relaxed pl-2">alasan pengembalian,</li>
                    <li className="leading-relaxed pl-2">serta informasi apakah Anda mengajukan refund atau penukaran.</li>
                  </ul>
                </li>
                <li className="leading-relaxed pl-2">
                  Setelah produk cacat kami terima, kami akan melakukan pemeriksaan dan menginformasikan kepada Anda mengenai status refund atau penukaran (jika memenuhi syarat).
                </li>
                <li className="leading-relaxed pl-2">
                  meoris.id berhak, atas kebijakan sendiri, untuk menolak proses penukaran. Namun, kami dapat menawarkan refund sebagai solusi pengganti apabila sesuai.
                </li>
                <li className="leading-relaxed pl-2">
                  Jika produk yang dikembalikan ternyata tidak cacat, kami berhak menolak permintaan penukaran maupun refund.
                </li>
                <li className="leading-relaxed pl-2">
                  Untuk informasi lebih lanjut mengenai penukaran produk, silakan merujuk ke Kebijakan Pengembalian (Return Policy) kami.
                </li>
              </ol>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 9: Penafian (Disclaimer) */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Penafian (Disclaimer)
              </h2>

              <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  Kecuali sebagaimana dinyatakan dalam Syarat dan Ketentuan ini atau diwajibkan oleh hukum yang berlaku, meoris.id tidak memberikan pernyataan, representasi, jaminan, atau garansi apa pun—baik tersurat maupun tersirat—mengenai hal apa pun, termasuk namun tidak terbatas pada kelayakan jual, kesesuaian, kecocokan untuk tujuan tertentu, atau non-pelanggaran terkait keanggotaan meoris.id, seluruh konten, serta produk atau layanan yang tersedia melalui meoris.id.
                </li>
                <li className="leading-relaxed pl-2">
                  Jaminan tersirat yang timbul dari praktik penggunaan atau hubungan usaha juga tidak berlaku. Di wilayah tertentu, hukum tidak mengizinkan pembatasan atau penghilangan jaminan, sehingga penafian di atas hanya berlaku sejauh diperbolehkan oleh hukum.
                </li>
                <li className="leading-relaxed pl-2">
                  Anda menggunakan website ini atas risiko Anda sendiri. Kami berhak membatasi atau mencabut akses Anda ke seluruh website, sebagian fitur, atau bagian tertentu kapan saja.
                </li>
                <li className="leading-relaxed pl-2">
                  <p className="mb-2">meoris.id tidak menjamin bahwa:</p>
                  <ul className="list-disc space-y-1 ml-5 md:ml-6">
                    <li className="leading-relaxed pl-2">akses ke website akan selalu tanpa gangguan,</li>
                    <li className="leading-relaxed pl-2">website sepenuhnya aman atau bebas dari virus,</li>
                    <li className="leading-relaxed pl-2">seluruh informasi yang disediakan akurat, benar, tepat waktu, bermanfaat, dapat diandalkan, lengkap, atau bebas dari kesalahan.</li>
                  </ul>
                </li>
                <li className="leading-relaxed pl-2">
                  Apabila Anda mengunduh konten dari website ini, Anda melakukannya atas keputusan pribadi dan memahami risikonya. Anda bertanggung jawab atas kerusakan pada sistem komputer Anda atau kehilangan data apa pun yang mungkin terjadi akibat pengunduhan konten.
                </li>
              </ol>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 10: Ganti Rugi dan Pembebasan Tanggung Jawab */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Ganti Rugi dan Pembebasan Tanggung Jawab (Indemnity and Release)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda setuju untuk memberikan ganti rugi dan membebaskan meoris.id dari segala bentuk denda, penalti, tanggung jawab, kerugian, atau bentuk kerusakan apa pun—termasuk biaya pengacara dan ahli—yang ditanggung meoris.id dan pihak terkait lainnya, serta membela meoris.id dari seluruh klaim yang timbul akibat:
                </p>

                <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Pelanggaran Anda terhadap Syarat dan Ketentuan,
                  </li>
                  <li className="leading-relaxed pl-2">
                    Tindakan penyalahgunaan, penipuan, atau kelalaian yang Anda lakukan, atau
                  </li>
                  <li className="leading-relaxed pl-2">
                    Pelanggaran Anda terhadap hak pihak ketiga.
                  </li>
                </ol>

                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id berhak mengendalikan proses pembelaan untuk setiap klaim yang termasuk dalam ketentuan ini, dan Anda tidak diperbolehkan menyelesaikan klaim apa pun tanpa persetujuan tertulis dari meoris.id.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 11: Manajemen Keluhan */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Manajemen Keluhan (Complaints Management)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id sangat menghargai kepuasan pelanggan. Anda dapat menghubungi kami pada waktu yang ditentukan melalui informasi kontak yang tersedia pada halaman Contact Us.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Kami akan berusaha menangani keluhan Anda dan menghubungi Anda setelah menerima pertanyaan atau keluhan terkait. Untuk mempercepat proses penyelesaian, mohon jelaskan objek keluhan Anda dengan sejelas mungkin dan, jika perlu, lampirkan salinan pesanan atau nomor pesanan yang diterima dalam email konfirmasi.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 12: Komunikasi Elektronik */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Komunikasi Elektronik (Electronic Communications)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Saat Anda menggunakan website atau mengirim email kepada meoris.id, Anda berkomunikasi secara elektronik. Anda setuju bahwa seluruh perjanjian, pemberitahuan, pengungkapan, atau bentuk komunikasi lain yang kami kirimkan secara elektronik memiliki kekuatan hukum yang sama seperti komunikasi tertulis.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Seluruh pemberitahuan dari meoris.id dianggap telah diterima saat dikirim ke alamat email yang Anda berikan kepada kami.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 13: Akses Website yang Dilindungi Kata Sandi */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Akses Website yang Dilindungi Kata Sandi (Password Protected Website Access)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Akses ke bagian website yang dilindungi kata sandi hanya diperbolehkan untuk pengguna yang berwenang. Anda bertanggung jawab menjaga kerahasiaan informasi login Anda, termasuk kata sandi.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda setuju bahwa Anda bertanggung jawab atas seluruh pernyataan, tindakan, atau kelalaian yang terjadi melalui penggunaan informasi login Anda. Jika Anda menduga bahwa informasi login Anda telah disalahgunakan atau dicuri, segera hubungi kami.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id akan mengasumsikan bahwa setiap komunikasi yang kami terima dari email atau alat komunikasi lain yang terkait dengan akun Anda berasal dari Anda, kecuali kami menerima pemberitahuan sebaliknya.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 14: Merek Dagang dan Hak Cipta */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Merek Dagang dan Hak Cipta (Trademarks and Copyrights)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Merek dagang, logo, dan tanda layanan yang ditampilkan di website merupakan milik meoris.id, para pemberi lisensi, penyedia konten, atau pihak lain. Anda (atau siapa pun yang bertindak atas nama Anda) tidak diperbolehkan menggunakan merek dagang tersebut untuk tujuan apa pun, termasuk sebagai meta tag pada website lain, tanpa izin tertulis dari pemilik merek.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda tidak boleh menggunakan teknik framing atau teknologi lain untuk menampilkan konten dari website tanpa persetujuan tertulis dari meoris.id.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda juga tidak boleh memanfaatkan konten website dalam meta tag atau "hidden text" tanpa persetujuan tertulis dari meoris.id.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Seluruh konten, termasuk perangkat lunak, dilindungi oleh hak cipta, merek dagang, dan hukum lainnya yang berlaku di Indonesia maupun negara lainnya.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 15: Klaim Pelanggaran Hak Kekayaan Intelektual */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Klaim Pelanggaran Hak Kekayaan Intelektual (Intellectual Property Right Infringement Claims)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id menghormati hak kekayaan intelektual pihak lain, dan kami meminta pengguna untuk melakukan hal yang sama. Anda diberitahu bahwa meoris.id menerapkan kebijakan pengakhiran akses bagi pengguna yang, dalam keadaan tertentu, terbukti melakukan pelanggaran hak cipta.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id dapat, atas kebijakannya, menonaktifkan atau menghentikan akun dan/atau keanggotaan pengguna yang diduga melanggar hak kekayaan intelektual pihak ketiga.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 16: Keberlanjutan Ketentuan Setelah Perjanjian Berakhir */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Keberlanjutan Ketentuan Setelah Perjanjian Berakhir (Continuity of Terms After Agreement Ends)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Selama tidak bertentangan dengan ketentuan dalam dokumen ini atau hukum yang berlaku, setiap ketentuan dalam Syarat dan Ketentuan ini akan tetap berlaku dan mengikat meskipun hubungan atau perjanjian antara pihak-pihak telah berakhir.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 17: Pelepasan Hak */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Pelepasan Hak (Waiver)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Keterlambatan atau kegagalan kami maupun Anda dalam melaksanakan hak apa pun berdasarkan Syarat dan Ketentuan ini tidak dianggap sebagai pelepasan hak tersebut, tidak berlaku untuk kejadian lain berikutnya, dan tidak memengaruhi hak atau upaya hukum apa pun yang tersedia. Hal tersebut juga tidak mengubah atau mengurangi hak kami maupun Anda di bawah Syarat dan Ketentuan ini.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 18: Pengalihan */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Pengalihan (Assignment)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda tidak diperbolehkan mengalihkan Syarat dan Ketentuan ini (atau hak, manfaat, maupun kewajiban apa pun) baik berdasarkan hukum maupun cara lainnya tanpa persetujuan tertulis sebelumnya dari meoris.id. Persetujuan tersebut dapat diberikan atau ditolak sepenuhnya atas kebijakan meoris.id.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Setiap upaya pengalihan yang tidak sesuai dengan ketentuan ini dianggap tidak sah dan tidak berlaku.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id berhak mengalihkan Syarat dan Ketentuan ini, secara keseluruhan maupun sebagian, kepada pihak ketiga mana pun atas kebijakannya sendiri.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 19: Keterpisahan */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Keterpisahan (Severability)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Jika ada ketentuan dalam Syarat dan Ketentuan ini yang dianggap tidak sah atau tidak dapat diberlakukan oleh keputusan pengadilan yang berwenang, ketidaksahan tersebut tidak memengaruhi ketentuan lainnya. Seluruh ketentuan lain tetap berlaku sepenuhnya selama Syarat dan Ketentuan ini masih dapat dijalankan tanpa ketentuan yang tidak dapat diberlakukan tersebut.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 20: Perubahan dan Modifikasi */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Perubahan dan Modifikasi (Modification and Alteration)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  meoris.id berhak untuk mengubah, memperbarui, atau memodifikasi bagian mana pun dari Syarat dan Ketentuan ini kapan saja. Setiap perubahan akan berlaku setelah dipublikasikan di website.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Dengan terus menggunakan website setelah perubahan tersebut diberlakukan, Anda dianggap menyetujui Syarat dan Ketentuan yang telah diperbarui.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 21: Hukum yang Berlaku */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Hukum yang Berlaku (Governing Law)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Baik meoris.id maupun Anda sebagai pengguna menyetujui untuk tunduk pada yurisdiksi non-eksklusif pengadilan di Indonesia.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Segala bentuk transaksi, korespondensi, dan komunikasi antara meoris.id dan Anda dilakukan dalam bahasa Indonesia.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section 22: Hubungi Kami */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Hubungi Kami (Contact Us)
              </h2>

              <div className="space-y-2">
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Jika Anda memiliki pertanyaan atau komentar terkait Syarat dan Ketentuan ini, atau jika Anda ingin memperbarui informasi atau preferensi yang Anda berikan kepada kami, silakan hubungi kami melalui:
                </p>
                <ul className="list-none space-y-1 font-belleza text-xs md:text-sm text-gray-700 ml-3">
                  <li className="leading-relaxed">
                    <span className="font-semibold">Email:</span> <a href="mailto:contact@meoris.id" className="text-blue-600 hover:text-blue-800 underline">contact@meoris.id</a>
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold">WhatsApp:</span> <a href="https://wa.me/6285117313531" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">085117313531</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="bg-black py-6 md:py-16">
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
          {/* Mobile compact footer */}
          <div className="grid grid-cols-1 md:hidden gap-4">
            {/* Brand + contact */}
            <div className="space-y-3">
              <div className="-ml-1">
                <Image
                  src="/logo/logo2.png"
                  alt="MEORIS"
                  width={120}
                  height={40}
                  className="object-contain brightness-0 invert"
                />
              </div>
              <ul className="space-y-2 font-belleza text-gray-300">
                <li className="grid grid-cols-[20px_1fr] items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                  <span className="text-xs leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                </li>
                <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                  <span className="text-xs">+6289695971729</span>
                </li>
                <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs">info@meoris.id</span>
                </li>
              </ul>
            </div>

            {/* Help & Support */}
            <div className="pb-2">
              <h4 className="font-cormorant text-base text-white whitespace-nowrap">Bantuan & Dukungan</h4>
              <div className="mt-1 w-10 h-[2px] bg-white"></div>
              <ul className="mt-3 space-y-2 font-belleza text-gray-300 text-xs">
                <li><a href="#" className="hover:underline hover:text-white cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan & Hubungi Kami</a></li>
                <li><Link href="/terms-condition" className="hover:underline hover:text-white">Syarat & Ketentuan</Link></li>
                <li><Link href="/privacy-policy" className="hover:underline hover:text-white">Kebijakan Privasi</Link></li>
              </ul>
            </div>

            {/* My Account */}
            <div className="pb-2">
              <h4 className="font-cormorant text-base text-white whitespace-nowrap">Akun Saya</h4>
              <div className="mt-1 w-10 h-[2px] bg-white"></div>
              <ul className="mt-3 space-y-2 font-belleza text-gray-300 text-xs">
                <li><Link href="/user/purchase?view=profile" className="hover:underline hover:text-white">Detail Akun</Link></li>
                <li><a href="#" aria-label="Buka keranjang" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openCartSidebar')); }}>Keranjang</a></li>
                <li><a href="#" aria-label="Buka favorit" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openFavoriteSidebar')); }}>Favorit</a></li>
                <li><Link href="/produk/pesanan" className="hover:underline hover:text-white">Pesanan</Link></li>
              </ul>
            </div>
          </div>

          {/* Desktop/Tablet redesigned footer */}
          <div className="hidden md:block">
            <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-12">
              {/* Brand + social */}
              <div className="space-y-5 lg:col-span-1">
                <div className="ml-0 md:-ml-2">
                  <Image
                    src="/logo/logo2.png"
                    alt="MEORIS"
                    width={150}
                    height={50}
                    className="object-contain brightness-0 invert"
                  />
                </div>
                <p className="font-belleza text-white text-sm max-w-xs">
                  Sandal berkualitas dengan desain elegan dan nyaman dipakai setiap hari.
                </p>
              </div>

              {/* Belanja */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-white">Belanja</h4>
                <div className="mt-2 w-10 h-[2px] bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-white">
                  <li><Link href="/produk" className="hover:opacity-80">Semua Produk</Link></li>
                </ul>
              </div>

              {/* Bantuan & Layanan */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-white">Bantuan &amp; Layanan</h4>
                <div className="mt-2 w-10 h-[2px] bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-white">
                  <li><a href="#" className="hover:opacity-80 cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan &amp; Hubungi Kami</a></li>
                  <li><Link href="/terms-condition" className="hover:opacity-80">Syarat &amp; Ketentuan</Link></li>
                  <li><Link href="/privacy-policy" className="hover:opacity-80">Kebijakan Privasi</Link></li>
                </ul>
              </div>

              {/* Akun Saya */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-white">Akun Saya</h4>
                <div className="mt-2 w-10 h-[2px] bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-white">
                  <li><Link href="/user/purchase?view=profile" className="hover:opacity-80">Detail Akun</Link></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:opacity-80 cursor-pointer" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openCartSidebar')); }}>Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:opacity-80 cursor-pointer" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openFavoriteSidebar')); }}>Favorit</a></li>
                  <li><Link href="/produk/pesanan" className="hover:opacity-80">Pesanan</Link></li>
                </ul>
              </div>

              {/* Kontak (alamat + telepon + email) */}
              <div className="pb-3 md:pb-4">
                <h4 className="font-cormorant text-xl text-white">Kontak</h4>
                <div className="mt-2 w-10 h-[2px] bg-white"></div>
                <ul className="mt-4 space-y-3 font-belleza text-white">
                  <li className="grid grid-cols-[28px_1fr] items-start gap-3">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                    <span className="text-sm leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                  </li>
                  <li className="grid grid-cols-[28px_1fr] items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                    <span>+6289695971729</span>
                  </li>
                  <li className="grid grid-cols-[28px_1fr] items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>info@meoris.id</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar (desktop only) */}
            <div className="mt-10 border-t border-white/30 pt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-white/80 text-sm">
              <p className="font-belleza">&copy; {new Date().getFullYear()} MEORIS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
