"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import FloatingChat from '@/components/FloatingChat';
import { useAuth } from '@/lib/auth-context';
import { useChatContext } from '@/lib/chat-context';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { openChat } = useChatContext();

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
            <span className="font-belleza text-sm text-gray-900">KEBIJAKAN PRIVASI</span>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-cormorant text-2xl md:text-3xl text-black leading-tight mb-2">
              KEBIJAKAN PRIVASI (PRIVACY POLICY)
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
                Kebijakan Privasi ini mengatur bagaimana meoris.id menangani informasi dan data pribadi pengguna situs, aplikasi, layanan, serta pelanggan toko dan webstore meoris.id. Istilah "User" atau "Anda" merujuk pada pengguna situs, aplikasi, layanan, serta pelanggan toko & webstore meoris.id.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Istilah "data pribadi" mengacu pada informasi atau kombinasi informasi yang dapat mengidentifikasi Anda secara langsung atau tidak langsung, sebagaimana didefinisikan dalam hukum yang berlaku.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id menghargai privasi Anda dan berkomitmen melindungi keamanan data pribadi Anda. Kebijakan Privasi ini menjelaskan dasar, syarat, dan ketentuan terkait perolehan, pengumpulan, pemrosesan, analisis, penyimpanan, pembaruan, penayangan, pengumuman, pengiriman, penyebaran, pengungkapan, pembukaan akses, penghapusan, dan pemusnahan data pribadi yang diberikan oleh User maupun yang dikumpulkan oleh meoris.id ketika User mendaftar, mengakses situs, menggunakan aplikasi, melakukan pembelian, atau menggunakan layanan kami.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: INFORMASI YANG KAMI KUMPULKAN */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                INFORMASI YANG KAMI KUMPULKAN
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami dapat memperoleh informasi pribadi tentang Anda dari berbagai sumber, termasuk saat Anda menggunakan, mengakses, dan/atau membuat akun di situs serta aplikasi seluler meoris.id, saat Anda mengunjungi atau melakukan pembelian di toko maupun webstore kami, saat Anda berkomunikasi atau berinteraksi dengan kami melalui telepon, email, atau media sosial, serta dari perusahaan dalam grup kami (termasuk induk, afiliasi, atau anak perusahaan), mitra bisnis, dan pihak ketiga lain yang memiliki izin untuk membagikan data pribadi Anda kepada kami.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jenis informasi dan data pribadi yang kami kumpulkan meliputi, namun tidak terbatas pada:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  Informasi kontak (misalnya nama, alamat, alamat email, dan nomor telepon).
                </li>
                <li className="leading-relaxed pl-2">
                  Informasi identifikasi pribadi (misalnya nama, jenis kelamin dan ukuran fisik).
                </li>
                <li className="leading-relaxed pl-2">
                  Foto, misalnya ketika Anda mengunggah foto untuk mengikuti kontes atau berpartisipasi dalam acara kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Informasi perbankan (misalnya kartu debit, kartu kredit, dan detail rekening bank).
                </li>
                <li className="leading-relaxed pl-2">
                  Catatan interaksi Anda dengan kami, seperti rekaman panggilan, riwayat percakapan melalui live chat, email atau surat yang dikirimkan, dan catatan komunikasi lainnya.
                </li>
                <li className="leading-relaxed pl-2">
                  Informasi kredensial, seperti data keamanan yang digunakan untuk autentikasi dan akses ke akun serta layanan.
                </li>
                <li className="leading-relaxed pl-2">
                  Data perangkat, termasuk jenis dan versi sistem operasi, versi perangkat keras, pengaturan perangkat, jenis perangkat lunak, identitas perangkat, merek dan model perangkat, bahasa, serta jenis dan versi peramban internet.
                </li>
                <li className="leading-relaxed pl-2">
                  Informasi yang dikumpulkan secara otomatis, seperti cookie (file teks yang ditanamkan oleh situs untuk mengidentifikasi browser secara unik atau menyimpan pengaturan tertentu) dan web beacon yang digunakan untuk mengirimkan informasi kembali ke server.
                </li>
                <li className="leading-relaxed pl-2">
                  Informasi lokasi geografis, seperti lokasi yang diturunkan dari alamat IP Anda.
                </li>
                <li className="leading-relaxed pl-2">
                  Data analitik, yang diperoleh melalui alat analisis pihak ketiga untuk memantau lalu lintas dan perilaku pengguna di situs dan aplikasi seluler kami.
                </li>
              </ul>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Bagaimana Kami Menggunakan Informasi Anda */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Bagaimana Kami Menggunakan Informasi Anda
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami dapat menggunakan informasi yang kami peroleh dari Anda untuk:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  Mendaftarkan Anda sebagai pengguna/untuk membuat akun, dan mengelola serta memelihara akun Anda di situs kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Memberikan Anda produk dan/atau layanan.
                </li>
                <li className="leading-relaxed pl-2">
                  Memproses, memvalidasi, mengonfirmasi, memverifikasi, mengirimkan, dan melacak pesanan Anda (termasuk memproses pembayaran, mengatur pengiriman, menangani pengembalian dan pengembalian uang, serta menghubungi Anda tentang pesanan Anda).
                </li>
                <li className="leading-relaxed pl-2">
                  Simpan catatan pembelian Anda di situs kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Tanggapi pertanyaan dan komentar Anda, berikan bantuan pelanggan, dan atasi masalah dengan layanan kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Berkomunikasi dengan Anda tentang produk, layanan, penawaran, acara, dan promosi kami, dan menawarkan produk dan layanan yang kami yakini mungkin menarik bagi Anda.
                </li>
                <li className="leading-relaxed pl-2">
                  Memungkinkan Anda berkomunikasi dengan kami melalui blog, jejaring sosial, dan media interaktif lainnya.
                </li>
                <li className="leading-relaxed pl-2">
                  Publikasikan testimoni Anda tentang meoris.id antara lain di situs web, blog, dan jejaring sosial kami (jika kami memilih untuk menerbitkan testimoni Anda, kami hanya akan menyertakan nama depan/inisial Anda, kota, dan negara bagian Anda).
                </li>
                <li className="leading-relaxed pl-2">
                  Kelola partisipasi Anda dalam acara, undian, dan promosi lainnya.
                </li>
                <li className="leading-relaxed pl-2">
                  Sesuaikan produk dan layanan kami dengan minat pribadi Anda, optimalkan situs kami untuk memberi Anda konten yang disesuaikan, penawaran dan iklan yang ditargetkan.
                </li>
                <li className="leading-relaxed pl-2">
                  Mengoperasikan, mengevaluasi, dan meningkatkan bisnis kami, produk dan layanan yang kami tawarkan.
                </li>
                <li className="leading-relaxed pl-2">
                  Menganalisis dan meningkatkan komunikasi dan strategi pemasaran kami (termasuk untuk mengidentifikasi apakah email yang dikirimkan kepada Anda telah diterima dan dibaca).
                </li>
                <li className="leading-relaxed pl-2">
                  Menganalisis tren dan statistik mengenai penggunaan situs, aplikasi seluler, dan media sosial oleh pengunjung, serta pembelian yang dilakukan pengunjung di situs kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Lindungi keamanan situs kami untuk mencegah penipuan dan transaksi tidak sah, kelola paparan risiko, termasuk dengan mengidentifikasi peretas potensial dan aktivitas tidak sah dan ilegal lainnya.
                </li>
                <li className="leading-relaxed pl-2">
                  Tegakkan Ketentuan Penggunaan dan Syarat dan Ketentuan Situs Web kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Mematuhi persyaratan hukum yang berlaku, standar industri, dan kebijakan kami.
                </li>
                <li className="leading-relaxed pl-2">
                  Untuk digunakan untuk tujuan lain yang kami jelaskan kepada Anda saat kami mengumpulkan informasi Anda dan sebagaimana diizinkan oleh hukum.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed mt-3">
                Selain yang disebutkan di atas, kami dan penyedia layanan kami dapat menggunakan informasi yang dikumpulkan melalui cookie, beacon, tag piksel, dan cara otomatis lainnya untuk secara otomatis mengumpulkan informasi tertentu saat Anda menggunakan situs kami, aplikasi seluler, mengunjungi dan berbelanja di situs web kami (misalnya, untuk memungkinkan Anda mengidentifikasi keranjang belanja elektronik yang dapat Anda buat di situs kami dan memungkinkan Anda untuk mengambil keranjang belanja yang sebelumnya Anda buat). Kami juga dapat menggunakan cookie untuk mengidentifikasi dan mengautentikasi pengunjung. Kami dapat menggabungkan informasi yang kami kumpulkan dengan informasi yang tersedia untuk umum dan informasi yang kami terima dari perusahaan induk, afiliasi atau anak perusahaan kami, mitra bisnis, dan pihak ketiga lainnya. Kami dapat menggunakan informasi gabungan tersebut untuk meningkatkan dan mempersonalisasi pengalaman berbelanja Anda bersama kami, untuk berkomunikasi dengan Anda tentang produk, layanan, dan acara yang mungkin menarik bagi Anda, untuk tujuan promosi lainnya, dan untuk tujuan lain yang dijelaskan di bagian ini.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Dasar Hukum Penggunaan Informasi Anda */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Dasar Hukum Penggunaan Informasi Anda
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Dasar hukum kami untuk mengumpulkan dan menggunakan informasi pribadi bergantung pada jenis informasi pribadi yang diproses dan konteks spesifik saat informasi tersebut dikumpulkan.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami dapat memerlukan informasi pribadi Anda untuk:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  Memenuhi kontrak dengan Anda,
                </li>
                <li className="leading-relaxed pl-2">
                  Memenuhi kewajiban hukum, atau
                </li>
                <li className="leading-relaxed pl-2">
                  Karena pemrosesan tersebut merupakan kepentingan sah kami (seperti pemrosesan untuk tujuan administratif, pemasaran langsung, peningkatan layanan, pencegahan penipuan atau tindak pidana, serta mendukung keamanan informasi), selama tidak mengesampingkan kepentingan Anda terkait perlindungan data maupun hak dan kebebasan fundamental Anda.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed mt-3">
                Jika kami meminta Anda memberikan informasi pribadi untuk memenuhi persyaratan hukum atau kontrak, kami akan menjelaskan hal tersebut pada saat pengumpulan data. Kami juga akan memberitahukan apakah informasi tersebut wajib diberikan serta menjelaskan konsekuensi jika Anda memilih untuk tidak memberikannya.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jika kami mengumpulkan dan menggunakan informasi pribadi Anda berdasarkan kepentingan sah kami (atau kepentingan sah pihak ketiga), kami akan memberikan pemberitahuan yang jelas dan mengambil langkah-langkah yang wajar untuk menjelaskan kepentingan sah tersebut.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                meoris.id bertindak sebagai pengendali data (data controller) atas informasi pribadi yang kami kumpulkan, kecuali dinyatakan lain dalam pemberitahuan privasi tambahan yang kami sampaikan kepada Anda.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Periklanan Online */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Periklanan Online
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Di situs web kami, kami dapat mengumpulkan informasi tentang aktivitas online Anda untuk menampilkan iklan produk dan layanan yang disesuaikan dengan minat pribadi Anda. Anda mungkin melihat iklan tertentu di situs ini maupun di situs lain karena kami berpartisipasi dalam jaringan periklanan.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jaringan iklan memungkinkan kami menargetkan iklan kepada pengguna melalui metode demografis, perilaku, dan kontekstual. Jaringan tersebut melacak aktivitas online Anda dari waktu ke waktu dengan mengumpulkan informasi melalui cara otomatis, termasuk penggunaan cookie, log server web, web beacon (suar web), dan metode lainnya.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Informasi ini digunakan untuk menampilkan iklan meoris.id dan mitra bisnis kami yang disesuaikan dengan minat Anda. Data yang dikumpulkan oleh vendor jaringan iklan kami dapat mencakup informasi tentang kunjungan Anda ke situs-situs yang berpartisipasi dalam jaringan mereka, seperti halaman atau iklan yang Anda lihat serta tindakan yang Anda lakukan di situs tersebut.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Pengumpulan data dan penargetan iklan ini dilakukan baik di situs web kami maupun di situs web pihak ketiga yang berpartisipasi dalam jaringan iklan. Proses ini juga membantu kami melacak dan mengevaluasi efektivitas upaya pemasaran kami.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Informasi yang Kami Bagikan */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Informasi yang Kami Bagikan
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami tidak menjual atau mengungkapkan informasi pribadi tentang Anda, kecuali pengungkapan tersebut dengan cara dan kepada pihak yang dijelaskan dalam Kebijakan Privasi ini. Kami dapat membagikan informasi pribadi yang kami kumpulkan dari dan tentang Anda:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  dengan perusahaan induk, afiliasi, dan anak perusahaan kami untuk tujuan manajemen, analisis, dan operasional
                </li>
                <li className="leading-relaxed pl-2">
                  kepada mitra bisnis kami (termasuk pimpinan merek), penyedia pihak ketiga yang membantu pemenuhan pesanan dan layanan operasional lainnya, vendor jaringan dan pesertanya, dan pihak ketiga lainnya sejauh pengungkapan tersebut diperlukan untuk memungkinkan mereka menjalankan fungsi dukungan bisnis, profesional, atau teknis untuk kami
                </li>
                <li className="leading-relaxed pl-2">
                  kepada penyedia layanan pembayaran, bank dan lembaga keuangan, untuk pemrosesan dan otorisasi pembayaran, perlindungan penipuan dan pengurangan risiko kredit, serta dukungan pelanggan
                </li>
                <li className="leading-relaxed pl-2">
                  kepada mitra pihak ketiga, sehingga mereka dapat memberi tahu Anda tentang penawaran, promosi, dan layanan
                </li>
                <li className="leading-relaxed pl-2">
                  ke jaringan periklanan, jejaring sosial, penyedia analitik data
                </li>
                <li className="leading-relaxed pl-2">
                  kepada pihak ketiga untuk tujuan promosi bersama. Mereka akan bertanggung jawab atas kepatuhan mereka sendiri terhadap hukum privasi yang berlaku.
                </li>
                <li className="leading-relaxed pl-2">
                  kepada penyedia layanan untuk situs, aplikasi seluler, serta evaluasi dan pengoptimalan layanan.
                </li>
                <li className="leading-relaxed pl-2">
                  kepada pejabat penegak hukum, badan/lembaga pemerintah, organisasi pengatur, pengadilan, atau otoritas publik lainnya untuk mematuhi hukum, untuk menanggapi pertanyaan atau permintaan pemerintah, untuk menegakkan kebijakan kami, atau untuk melindungi hak, properti, atau keselamatan kami atau orang lain
                </li>
                <li className="leading-relaxed pl-2">
                  Jika tidak, dengan persetujuan Anda atau berdasarkan dasar hukum yang sah.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed mt-3">
                Kami mungkin perlu mentransfer informasi Anda ke afiliasi, mitra bisnis, dan/atau penyedia layanan kami di negara-negara di luar yurisdiksi Indonesia. Jika kami mentransfer informasi Anda ke luar yurisdiksi Indonesia, kami akan memastikan bahwa informasi Anda dilindungi dengan baik. Kami akan selalu memastikan bahwa negara tempat pihak ketiga tersebut berada memiliki tingkat perlindungan data pribadi yang setara atau lebih tinggi dari Indonesia, atau pihak ketiga yang akan menerima data pribadi Anda memiliki standar perlindungan data pribadi yang memadai dan mengikat. Jika standar ini tidak terpenuhi, kami akan menerapkan perlindungan tambahan atau mendapatkan persetujuan tegas Anda sebelum melanjutkan.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Penyimpanan dan Retensi */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Penyimpanan dan Retensi
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami akan menyimpan dan memelihara data pribadi Anda selama diperlukan atau diizinkan untuk tujuan perolehan data tersebut.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Data pribadi yang kami kumpulkan disimpan dalam format elektronik. Kami menyimpan data Anda di pusat data yang dikelola oleh kami atau oleh penyedia layanan atas nama kami. Semua fasilitas dan sistem kami dilengkapi dengan kontrol keamanan yang diperlukan untuk memastikan perlindungan data pribadi.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami dapat menyimpan data pribadi Anda untuk menyediakan layanan yang Anda minta, atau untuk tujuan penting lainnya, seperti mematuhi kewajiban hukum kami, menyelesaikan sengketa, dan menerapkan kebijakan kami. Periode penyimpanan dapat sangat bervariasi, bergantung pada jenis informasi dan cara penggunaannya. Periode penyimpanan kami didasarkan pada kriteria yang mencakup periode penyimpanan wajib berdasarkan hukum dan peraturan yang berlaku, litigasi atau investigasi yang tertunda atau potensial, persyaratan dalam perjanjian/kontrak, arahan atau kebutuhan operasional, dan pengarsipan historis. Setelah periode penyimpanan berakhir, kami akan menghapus informasi pribadi Anda dari sistem kami dengan menggunakan protokol keamanan yang sesuai agar tidak dapat direkonstruksi atau dibaca.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Hak Anda */}
            <div className="space-y-4">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Hak Anda
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Berikut detail tentang bagaimana Anda dapat menggunakan hak-hak Anda terkait data pribadi Anda. Hak-hak ini tidak bersifat mutlak, dan dalam kasus tertentu, kami dapat menolak permintaan Anda sebagaimana diizinkan oleh hukum dan peraturan yang berlaku, khususnya jika permintaan tersebut dapat berdampak pada hal-hal seperti, tetapi tidak terbatas pada:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  membahayakan keselamatan Anda, kesehatan fisik atau mental dan/atau orang lain; dan/atau
                </li>
                <li className="leading-relaxed pl-2">
                  ada dampak dari pengungkapan data pribadi orang lain; dan/atau
                </li>
                <li className="leading-relaxed pl-2">
                  bertentangan dengan kepentingan pertahanan dan keamanan negara dan/atau
                </li>
                <li className="leading-relaxed pl-2">
                  alasan permintaan tidak relevan dengan Anda dan/atau aktivitas pemrosesan data pribadi yang kami lakukan.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami dapat mengenakan biaya administratif untuk setiap permintaan Anda sesuai dengan hukum dan peraturan yang berlaku.
              </p>

              {/* Subsection: Hak atas Informasi */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak atas Informasi
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda dapat meminta informasi berikut tentang bagaimana kami mengumpulkan dan menggunakan data pribadi Anda:
                </p>
                <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    Kategori data pribadi yang telah kami kumpulkan.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Tujuan pengumpulan dan penggunaan data pribadi Anda.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Kategori pihak ketiga dengan siapa kami telah membagikan data pribadi Anda.
                  </li>
                  <li className="leading-relaxed pl-2">
                    Apakah kami telah mengungkapkan data pribadi Anda untuk tujuan bisnis, dan jika demikian, kategori data pribadi yang diterima oleh setiap kategori penerima pihak ketiga.
                  </li>
                </ul>
              </div>

              {/* Subsection: Hak untuk Mengakses */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak untuk Mengakses
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda dapat meminta salinan data pribadi yang telah kami kumpulkan tentang Anda.
                </p>
              </div>

              {/* Subsection: Hak untuk Memperbaiki Data Pribadi */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak untuk Memperbaiki Data Pribadi
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda berhak meminta koreksi atas data pribadi yang tidak akurat atau tidak lengkap.
                </p>
              </div>

              {/* Subsection: Hak untuk Penghapusan */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak untuk Penghapusan
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda dapat meminta kami untuk menghapus data pribadi yang telah kami kumpulkan dari Anda, dengan tetap tunduk pada batasan dan ketentuan yang ditetapkan dalam peraturan perundang-undangan yang berlaku.
                </p>
              </div>

              {/* Subsection: Hak untuk Pembatasan Pemrosesan */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak untuk Pembatasan Pemrosesan
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda dapat meminta kami untuk membatasi pemrosesan data pribadi Anda, terutama jika Anda meragukan keakuratan data atau mengajukan keberatan terhadap pemrosesan tersebut.
                </p>
              </div>

              {/* Subsection: Hak untuk Menarik Persetujuan */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak untuk Menarik Persetujuan
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda dapat membatalkan persetujuan atas pemrosesan data pribadi Anda kapan saja. Setelah persetujuan ditarik, kami akan menghentikan pemrosesan data pribadi Anda dalam waktu maksimal 3 x 24 jam, kecuali jika pemrosesan tersebut masih diwajibkan oleh hukum yang berlaku.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Kami memberikan pilihan kepada Anda terkait:
                </p>
                <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    informasi apa yang kami kumpulkan dari Anda,
                  </li>
                  <li className="leading-relaxed pl-2">
                    bagaimana kami menggunakan dan mengungkapkan informasi tersebut, dan
                  </li>
                  <li className="leading-relaxed pl-2">
                    bagaimana kami berkomunikasi dengan Anda.
                  </li>
                </ul>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Dalam kondisi tertentu, penarikan persetujuan atas penggunaan atau pengungkapan informasi pribadi Anda oleh meoris.id dapat menyebabkan Anda tidak lagi dapat memanfaatkan fitur atau layanan tertentu di situs meoris.id.
                </p>
              </div>

              {/* Subsection: Hak atas Portabilitas Data */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak atas Portabilitas Data
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda berhak untuk memperoleh data pribadi Anda dalam format yang dapat dibaca serta mentransfernya kepada pengendali data lainnya.
                </p>
              </div>

              {/* Subsection: Hak untuk Menolak Pengambilan Keputusan Otomatis */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak untuk Menolak Pengambilan Keputusan Otomatis
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda dapat menolak keputusan yang sepenuhnya didasarkan pada pemrosesan otomatis, termasuk profilisasi, jika pemrosesan tersebut menimbulkan akibat hukum yang berkaitan dengan Anda atau berdampak signifikan terhadap Anda.
                </p>
              </div>

              {/* Subsection: Hak atas Kompensasi */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Hak atas Kompensasi
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda berhak untuk mengajukan tuntutan kompensasi atas pelanggaran terhadap hak-hak perlindungan data pribadi Anda sesuai dengan ketentuan hukum yang berlaku.
                </p>
              </div>

              {/* Subsection: Non-Diskriminasi */}
              <div className="space-y-2 mt-4">
                <h3 className="font-cormorant text-base md:text-lg text-black font-semibold">
                  Non-Diskriminasi
                </h3>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Anda berhak menggunakan hak-hak yang dijelaskan di atas tanpa diskriminasi. Kami tidak akan:
                </p>
                <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                  <li className="leading-relaxed pl-2">
                    menolak memberikan layanan,
                  </li>
                  <li className="leading-relaxed pl-2">
                    menaikkan harga layanan,
                  </li>
                  <li className="leading-relaxed pl-2">
                    menurunkan kualitas layanan, atau
                  </li>
                  <li className="leading-relaxed pl-2">
                    mengancam akan mengambil tindakan tersebut
                  </li>
                </ul>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  hanya karena Anda menggunakan hak-hak perlindungan data Anda.
                </p>
                <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                  Jika Anda memiliki pertanyaan atau ingin menggunakan hak-hak tersebut, silakan hubungi kami melalui bagian "Hubungi Kami" sebagaimana tercantum dalam Kebijakan Privasi ini.
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Tautan ke Situs Web Lain */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Tautan ke Situs Web Lain
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Situs web kami dapat berisi tautan ke situs lain yang disediakan untuk kenyamanan dan informasi Anda. Situs-situs tersebut dapat dioperasikan oleh perusahaan yang tidak berafiliasi dengan meoris.id.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Situs yang tertaut mungkin memiliki Kebijakan Privasi mereka sendiri yang sebaiknya Anda baca dan pahami saat mengunjungi situs tersebut. Kami tidak bertanggung jawab atas:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  konten situs web mana pun yang tidak berafiliasi dengan meoris.id,
                </li>
                <li className="leading-relaxed pl-2">
                  penggunaan Anda atas situs-situs tersebut, maupun
                </li>
                <li className="leading-relaxed pl-2">
                  praktik privasi yang diterapkan situs-situs tersebut.
                </li>
              </ul>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Bagaimana Kami Melindungi Informasi Pribadi */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Bagaimana Kami Melindungi Informasi Pribadi
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami menerapkan langkah-langkah administratif, teknis, dan fisik yang dirancang untuk membantu melindungi informasi pribadi yang kami kumpulkan dari:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  kerusakan,
                </li>
                <li className="leading-relaxed pl-2">
                  kehilangan,
                </li>
                <li className="leading-relaxed pl-2">
                  perubahan,
                </li>
                <li className="leading-relaxed pl-2">
                  akses,
                </li>
                <li className="leading-relaxed pl-2">
                  pengungkapan, atau
                </li>
                <li className="leading-relaxed pl-2">
                  penggunaan yang tidak disengaja, melanggar hukum, atau tidak sah.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Sebagai contoh, kami menggunakan enkripsi Secure Sockets Layer (SSL) untuk melindungi informasi pembelian Anda saat dalam proses transmisi.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Namun, harap dipahami bahwa tidak ada transmisi elektronik yang sepenuhnya aman. Kami tidak dapat menjamin bahwa langkah-langkah keamanan kami tidak akan pernah dikalahkan, gagal, atau selalu memadai dan efektif. Jika kami menemukan adanya kegagalan dalam melindungi kerahasiaan data pribadi, kami akan memberi tahu Anda secara tertulis sesuai ketentuan yang berlaku.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Untuk perlindungan tambahan, Anda sebaiknya:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  menjaga kerahasiaan nama pengguna dan kata sandi akun meoris.id Anda,
                </li>
                <li className="leading-relaxed pl-2">
                  tidak membagikan kredensial akun kepada siapa pun,
                </li>
                <li className="leading-relaxed pl-2">
                  keluar (log out) dari akun dan menutup jendela peramban setelah selesai menggunakan situs kami.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Harap dicatat bahwa kami tidak akan pernah meminta nama pengguna atau kata sandi akun meoris.id Anda melalui email.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Informasi tentang Anak-anak */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Informasi tentang Anak-anak
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jika Anda berusia di bawah 17 tahun, Anda wajib memperoleh persetujuan dan melibatkan orang tua atau wali sah sebelum:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  mendaftar di situs kami (termasuk memberikan data pribadi),
                </li>
                <li className="leading-relaxed pl-2">
                  menggunakan layanan kami, dan
                </li>
                <li className="leading-relaxed pl-2">
                  berbelanja di situs meoris.id.
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jika Anda tidak mendapatkan persetujuan atau tidak melibatkan orang tua atau wali Anda, Anda wajib berhenti menggunakan situs ini.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Pembaruan atas Kebijakan Privasi ini */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Pembaruan atas Kebijakan Privasi ini
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kebijakan Privasi ini dapat diperbarui dari waktu ke waktu untuk mencerminkan:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  perubahan dalam praktik pemrosesan data kami, dan
                </li>
                <li className="leading-relaxed pl-2">
                  perubahan dalam persyaratan peraturan yang berlaku,
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                tanpa pemberitahuan terlebih dahulu kepada Anda.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Pengguna diharapkan untuk secara berkala membaca dan memeriksa halaman Kebijakan Privasi ini guna mengetahui pembaruan atau perubahan apa pun yang kami lakukan. Dengan mengakses dan menggunakan situs meoris.id, aplikasi seluler, atau layanan lainnya, Anda dianggap menyetujui perubahan terhadap Kebijakan Privasi ini.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jika terdapat perubahan yang bersifat signifikan, kami akan menampilkan pemberitahuan yang jelas dan menonjol di situs web kami dan mencantumkan tanggal pembaruan terakhir pada bagian bawah pemberitahuan tersebut.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Opsi untuk Berhenti Berlangganan Newsletter Pemasaran Kami */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Opsi untuk Berhenti Berlangganan Newsletter Pemasaran Kami
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Saat Anda mendaftar untuk menerima newsletter, Anda akan diberikan opsi untuk tidak berlangganan layanan pembaruan rutin kami yang dikirimkan melalui:
              </p>
              <ol className="list-decimal space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  Email, untuk menginformasikan produk baru, fitur, peningkatan, penawaran khusus, kontes, acara menarik, dan promosi pemasaran satu kali.
                </li>
                <li className="leading-relaxed pl-2">
                  Surat/fisik (direct mail), untuk produk baru, fitur, peningkatan, penawaran khusus, kontes, acara menarik, dan promosi pemasaran satu kali.
                </li>
              </ol>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kami memberikan Anda kesempatan kapan saja untuk:
              </p>
              <ul className="list-disc space-y-2 font-belleza text-xs md:text-sm text-gray-700 ml-5 md:ml-6">
                <li className="leading-relaxed pl-2">
                  berhenti berlangganan layanan apa pun, atau
                </li>
                <li className="leading-relaxed pl-2">
                  memperbarui preferensi langganan Anda,
                </li>
              </ul>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                tanpa biaya.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Semua email yang kami kirimkan berisi tautan berhenti berlangganan (unsubscribe) yang mudah digunakan, sehingga Anda dapat keluar dari daftar kiriman email tersebut kapan saja.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Sebagai alternatif, Anda dapat mengubah preferensi email atau berhenti berlangganan seluruh email dengan masuk ke menu "Akun Saya" pada situs meoris.id.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Hukum yang Berlaku */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Hukum yang Berlaku
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kebijakan Privasi ini tunduk pada hukum Republik Indonesia.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Kebijakan Privasi ini disusun dalam bahasa Indonesia dan bahasa Inggris.
              </p>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Apabila terdapat perbedaan atau pertentangan antara versi bahasa Indonesia dan bahasa Inggris, versi bahasa Indonesia yang berlaku, dan versi bahasa Inggris dianggap telah disesuaikan untuk mengikuti versi bahasa Indonesia.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Section: Hubungi Kami */}
            <div className="space-y-2">
              <h2 className="font-cormorant text-lg md:text-xl text-black font-semibold">
                Hubungi Kami
              </h2>
              <p className="font-belleza text-xs md:text-sm text-gray-700 leading-relaxed">
                Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, ingin menggunakan hak Anda terkait data pribadi, atau ingin mengubah preferensi Anda terkait pemrosesan data oleh kami, silakan hubungi:
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

      <FloatingChat />
    </main>
  );
}
