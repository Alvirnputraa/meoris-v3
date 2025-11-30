const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'produk', 'pesanan', '[orderId]', 'OrderDetailClient.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of Section 2
const section2Start = content.indexOf('      {/* Section 2: order details */}');
const section2End = content.indexOf('      </section>', section2Start) + '      </section>'.length;

if (section2Start === -1 || section2End === -1) {
  console.error('Could not find Section 2 markers');
  process.exit(1);
}

// New Section 2 content
const newSection2 = `      {/* Section 2: order details */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">

          {/* Order Header Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 md:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                {(() => {
                  const displayId = orderId ? orderId.replace(/-/g, '').slice(0, 8) : ''
                  const createdAt = orderMeta?.created_at ? new Date(orderMeta.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'
                  return (
                    <>
                      <h2 className="font-cormorant text-xl md:text-2xl text-black">Pesanan #{displayId}</h2>
                      <p className="font-belleza text-sm text-gray-500">{createdAt}</p>
                    </>
                  )
                })()}
              </div>
              <Link
                href={\`/permintaan-returns/\${orderId}\`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg font-belleza text-sm text-gray-700 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Ajukan Pengembalian
              </Link>
            </div>
          </div>

          {/* Informasi Pengiriman Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 md:p-6 mb-6">
            <h3 className="font-cormorant text-lg md:text-xl text-black mb-5">Informasi Pengiriman</h3>

            <div className="space-y-4">
              {/* Ekspedisi */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="font-belleza text-sm text-gray-500">Ekspedisi</span>
                <div className="flex items-center gap-2.5">
                  {(() => {
                    const m = (orderMeta?.shipping_method || '').toLowerCase()
                    if (m.includes('j&t')) {
                      return <Image src="/images/j&t.png" alt="J&T" width={28} height={28} className="w-7 h-7" />
                    }
                    if (m.includes('jne')) {
                      return <Image src="/images/jne.png" alt="JNE" width={28} height={28} className="w-7 h-7" />
                    }
                    return null
                  })()}
                  <span className="font-belleza text-sm md:text-base text-black">
                    {orderMeta?.shipping_method || 'Belum ditentukan'}
                  </span>
                </div>
              </div>

              {/* Nomor Resi */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="font-belleza text-sm text-gray-500">Nomor Resi</span>
                <div className="flex items-center gap-2">
                  <span className="font-belleza text-sm md:text-base text-black select-all">
                    {orderMeta?.shipping_resi || 'Belum tersedia'}
                  </span>
                  <button
                    type="button"
                    aria-label="Salin nomor resi"
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => { try { navigator.clipboard.writeText(orderMeta?.shipping_resi || ''); } catch {} }}
                    disabled={!orderMeta?.shipping_resi}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 9h10v11H9z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Lacak Paket */}
              <div className="flex items-center justify-between py-3">
                <span className="font-belleza text-sm text-gray-500">Lacak Paket</span>
                {(() => {
                  const resi = orderMeta?.shipping_resi || ''
                  const placeholder = ['Sedang dikemas','Pesanan belum dikirim ke jasa kirim', 'Belum tersedia']
                  const disabled = !resi || placeholder.includes(resi) || resi.length < 6
                  if (disabled) {
                    return (
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-belleza cursor-not-allowed"
                        disabled
                      >
                        Belum Tersedia
                      </button>
                    )
                  }
                  return (
                    <Link
                      href={\`/produk/pesanan/\${orderId}/lacak\`}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-belleza hover:bg-gray-800 transition-colors"
                    >
                      Lacak Sekarang
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Detail Pesanan Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 md:p-6 mb-6">
            <h3 className="font-cormorant text-lg md:text-xl text-black mb-5">Detail Pesanan</h3>

            {orderItems && orderItems.length > 0 ? (
              <div className="space-y-4">
                {orderItems.map((it: any) => {
                  const name = it?.produk?.nama_produk || it?.nama_produk || 'Produk'
                  const qty = Number(it?.quantity || 0)
                  const size = it?.size ? \` • Ukuran \${it.size}\` : ''
                  const lineTotal = Number(it?.price || 0) * qty
                  return (
                    <div key={it.id} className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-belleza text-sm md:text-base text-black mb-1">{name}{size}</p>
                        <p className="font-belleza text-sm text-gray-500">Jumlah: {qty}</p>
                      </div>
                      <div className="font-belleza text-sm md:text-base text-black font-medium whitespace-nowrap">
                        Rp {lineTotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  )
                })}

                <div className="pt-4 mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-belleza text-sm text-gray-500">Subtotal</span>
                    <span className="font-belleza text-base md:text-lg text-black font-semibold">
                      Rp {Number(orderMeta?.total_amount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="font-belleza text-sm text-gray-500">Metode Pembayaran</span>
                    <span className="font-belleza text-sm md:text-base text-black">
                      {formatPaymentMethod(orderMeta?.payment_method)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-3 text-gray-300">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="font-belleza text-sm text-gray-500">Tidak ada item</p>
              </div>
            )}
          </div>

          {/* Alamat Pengiriman Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 md:p-6">
            <h3 className="font-cormorant text-lg md:text-xl text-black mb-5">Alamat Pengiriman</h3>

            {orderMeta?.shipping_address_json ? (
              <div className="space-y-4">
                {/* Penerima */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-belleza text-xs text-gray-500 mb-1">Penerima</p>
                    <p className="font-belleza text-sm md:text-base text-black font-medium">
                      {orderMeta.shipping_address_json.nama}
                    </p>
                  </div>
                </div>

                {/* Telepon */}
                {orderMeta.shipping_address_json.telepon ? (
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-belleza text-xs text-gray-500 mb-1">Telepon</p>
                      <p className="font-belleza text-sm md:text-base text-black">
                        {orderMeta.shipping_address_json.telepon}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Alamat */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600">
                      <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-belleza text-xs text-gray-500 mb-1">Alamat Lengkap</p>
                    <p className="font-belleza text-sm md:text-base text-black leading-relaxed">
                      {[
                        orderMeta.shipping_address_json.alamat || null,
                        orderMeta.shipping_address_json.kelurahan ? \`Kel. \${orderMeta.shipping_address_json.kelurahan}\` : null,
                        orderMeta.shipping_address_json.kecamatan ? \`Kec. \${orderMeta.shipping_address_json.kecamatan}\` : null,
                        orderMeta.shipping_address_json.kota || orderMeta.shipping_address_json.kabupaten || null,
                        orderMeta.shipping_address_json.provinsi || null,
                        orderMeta.shipping_address_json.kode_pos || null,
                        'Indonesia'
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400">
                    <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/>
                  </svg>
                </div>
                <p className="font-belleza text-sm text-gray-500">Belum ada alamat pengiriman</p>
              </div>
            )}
          </div>

        </div>
      </section>`;

// Replace Section 2
const newContent = content.substring(0, section2Start) + newSection2 + content.substring(section2End);

// Write back to file
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Section 2 has been successfully updated with modern vertical design!');
