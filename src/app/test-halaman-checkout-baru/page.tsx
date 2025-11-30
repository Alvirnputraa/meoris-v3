'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/Header'

export default function TestCheckoutPage() {
  const [selectedCourier, setSelectedCourier] = useState('jnt')
  const [selectedPayment, setSelectedPayment] = useState('qris')
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false)
  const [isSubtotalDropdownOpen, setIsSubtotalDropdownOpen] = useState(false)
  const [showTopBar, setShowTopBar] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Handle scroll to hide/show top bar
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (currentScrollY > 100 && currentScrollY > lastScrollY) {
            setShowTopBar(false);
          } else if (currentScrollY <= 80) {
            setShowTopBar(true);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [])

  // Dummy data
  const products = [
    {
      id: 1,
      name: 'Sandal Kulit Premium Classic',
      size: '42',
      price: 350000,
      quantity: 2,
      image: '/images/posterr1.png'
    },
    {
      id: 2,
      name: 'Sandal Casual Modern Style',
      size: '40',
      price: 280000,
      quantity: 1,
      image: '/images/posterr2.png'
    },
    {
      id: 3,
      name: 'Sandal Sport Active',
      size: '41',
      price: 320000,
      quantity: 1,
      image: '/images/posterr1.png'
    },
    {
      id: 4,
      name: 'Sandal Elegant Formal',
      size: '43',
      price: 420000,
      quantity: 1,
      image: '/images/posterr2.png'
    },
    {
      id: 5,
      name: 'Sandal Beach Comfort',
      size: '39',
      price: 250000,
      quantity: 2,
      image: '/images/posterr1.png'
    },
    {
      id: 6,
      name: 'Sandal Urban Trendy',
      size: '42',
      price: 380000,
      quantity: 1,
      image: '/images/posterr2.png'
    },
    {
      id: 7,
      name: 'Sandal Outdoor Adventure',
      size: '44',
      price: 450000,
      quantity: 1,
      image: '/images/posterr1.png'
    }
  ]

  const couriers = [
    { id: 'jnt', name: 'J&T Express', price: 21000, duration: '2-3 hari' },
    { id: 'sicepat', name: 'SiCepat', price: 21500, duration: '3-5 hari' },
    { id: 'anteraja', name: 'Anteraja', price: 18000, duration: '2-4 hari' },
  ]

  const paymentMethods = [
    { id: 'qris', name: 'QRIS', type: 'E-Money', logo: '/images/QRIS.png' },
    { id: 'bri', name: 'BRI Virtual Account', type: 'Bank Transfer', logo: '/images/BRI.png' },
    { id: 'mandiri', name: 'Mandiri Virtual Account', type: 'Bank Transfer', logo: '/images/MANDIRI.png' },
    { id: 'bni', name: 'BNI Virtual Account', type: 'Bank Transfer', logo: '/images/BNI.png' },
  ]

  const address = {
    name: 'John Doe',
    phone: '08123456789',
    street: 'Jl. Contoh Alamat No. 123',
    area: 'Kel. Sukamaju, Kec. Bandung Utara',
    city: 'Bandung, Jawa Barat',
    postal: '40123'
  }

  const subtotal = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
  const shippingCost = couriers.find(c => c.id === selectedCourier)?.price || 0
  const total = subtotal + shippingCost

  if (!mounted) return null

  return (
    <main className="min-h-screen flex flex-col font-belleza">
      {/* Top black bar */}
      <div className={`fixed left-0 right-0 w-full bg-black h-8 md:h-10 z-[59] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${showTopBar ? 'top-0' : '-top-8 md:-top-10'}`}>
        <div className="w-full max-w-[1160px] mx-auto h-full flex items-center justify-center px-6 md:px-8 lg:px-10">
          <p className="font-belleza text-white text-xs md:text-sm">
            Dapatkan potongan diskon dan pengiriman - <a
              href="/#voucher-section"
              className="font-bold underline hover:text-gray-300 transition-colors cursor-pointer"
            >cek disini</a>
          </p>
        </div>
      </div>

      <Header variant="docs" topBarVisible={showTopBar} />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16 mt-32 md:mt-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">

          {/* LEFT - Products */}
          <div>
            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-6">PRODUCT</h2>

            <div className="space-y-6">
              {products.map((product) => (
                <div key={product.id} className="border-b border-gray-200 pb-6">
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 bg-gray-100 flex-shrink-0">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-normal">{product.name}</h3>
                      <p className="text-sm text-gray-900 mt-1">Rp {product.price.toLocaleString('id-ID')}</p>
                      <p className="text-sm text-gray-600 mt-1"><span className="font-medium">size:</span> {product.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-normal">Rp {(product.price * product.quantity).toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-3 mt-4">
                    <button className="w-8 h-8 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      -
                    </button>
                    <span className="w-12 text-center text-gray-900">{product.quantity}</span>
                    <button className="w-8 h-8 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      +
                    </button>
                  </div>

                  <button className="text-sm text-gray-600 hover:text-gray-900 underline mt-3">
                    Remove item
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT - Cart Totals */}
          <div>
            <div className="border border-gray-200 p-6">
            <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">CART TOTALS</h2>

            {/* Delivery */}
            <div className="pb-3 border-b border-gray-200">
              <div className="mb-4">
                <span className="text-gray-900 font-medium">Ekspedisi dan alamat pengiriman</span>
              </div>

              {/* Shipping Options */}
              <div className="space-y-1.5">
                {couriers.map((courier) => (
                  <label
                    key={courier.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedCourier === courier.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      value={courier.id}
                      checked={selectedCourier === courier.id}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedCourier === courier.id
                        ? 'border-black bg-black'
                        : 'border-gray-300'
                    }`}>
                      {selectedCourier === courier.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{courier.name}</span>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {courier.duration}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">Rp {courier.price.toLocaleString('id-ID')}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Address */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{address.name}</p>
                        <button className="text-xs text-gray-700 hover:text-gray-900 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Ubah</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{address.phone}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed ml-6">
                    {address.street}, {address.area}, {address.city} {address.postal}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="py-4 border-b border-gray-200">
              <div className="mb-4">
                <span className="text-gray-900 font-medium">Payment Method</span>
              </div>
              <div>
                {/* Selected Payment Display */}
                <button
                  onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                  className={`w-full flex items-center justify-between p-3 text-sm font-medium bg-white cursor-pointer transition-all duration-300 ${
                    isPaymentDropdownOpen
                      ? 'border border-b-0 border-black rounded-t-lg text-gray-900'
                      : 'border border-gray-200 rounded-lg hover:border-gray-300 text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {!isPaymentDropdownOpen && paymentMethods.find(p => p.id === selectedPayment)?.logo && (
                      <div className="w-12 h-8 relative flex items-center justify-center">
                        <Image
                          src={paymentMethods.find(p => p.id === selectedPayment)?.logo || ''}
                          alt={paymentMethods.find(p => p.id === selectedPayment)?.name || ''}
                          width={48}
                          height={32}
                          className="object-contain"
                          quality={100}
                        />
                      </div>
                    )}
                    <span>
                      {isPaymentDropdownOpen ? (
                        'Pilih Pembayaran'
                      ) : (
                        paymentMethods.find(p => p.id === selectedPayment)?.name
                      )}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isPaymentDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Options */}
                <div
                  className={`border border-t-0 border-black rounded-b-lg bg-white overflow-hidden transition-all duration-300 ease-in-out ${
                    isPaymentDropdownOpen
                      ? 'max-h-96 opacity-100'
                      : 'max-h-0 opacity-0 border-0'
                  }`}
                >
                  {paymentMethods.map((payment) => (
                    <button
                      key={payment.id}
                      onClick={() => {
                        setSelectedPayment(payment.id)
                        setIsPaymentDropdownOpen(false)
                      }}
                      className={`w-full text-left p-3 text-sm transition-colors flex items-center justify-between ${
                        selectedPayment === payment.id
                          ? 'bg-gray-50 font-medium text-gray-900'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <span>
                        {payment.name}
                      </span>
                      <div className="w-12 h-8 relative flex items-center justify-center">
                        <Image
                          src={payment.logo}
                          alt={payment.name}
                          width={48}
                          height={32}
                          className="object-contain"
                          quality={100}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtotal with Dropdown */}
            <div className="py-3 border-b border-gray-200">
              <button
                onClick={() => setIsSubtotalDropdownOpen(!isSubtotalDropdownOpen)}
                className="w-full flex justify-between items-center"
              >
                <span className="text-gray-900">Subtotal</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">Rp {total.toLocaleString('id-ID')}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isSubtotalDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Dropdown Detail */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isSubtotalDropdownOpen ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Harga produk</span>
                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Biaya pengiriman</span>
                    <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between py-4 border-b border-gray-200">
              <span className="text-lg font-medium text-gray-900">Total</span>
              <span className="text-lg font-medium text-gray-900">Rp {total.toLocaleString('id-ID')}</span>
            </div>

            {/* Checkout Button */}
            <button className="w-full bg-black text-white py-3 mt-6 hover:bg-gray-800 transition-colors text-sm font-medium">
              PROCEED TO CHECKOUT
            </button>
            </div>

          </div>

        </div>
      </div>

    </main>
  )
}
