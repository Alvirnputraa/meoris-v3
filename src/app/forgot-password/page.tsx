"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isTouchDevice = (
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches
    )
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setShowPoster(!(isTouchDevice || isMobileUA))
  }, [])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!email) {
        throw new Error('Mohon masukkan email Anda')
      }

      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengirim kode reset password')
      }

      // Simpan email di sessionStorage untuk digunakan di halaman verification
      sessionStorage.setItem('reset_email', email)
      
      // Redirect ke halaman verification
      router.push('/verification?type=reset')
    } catch (error: any) {
      console.error('Send code error:', error)
      setError(error.message || 'Terjadi kesalahan saat mengirim kode')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main>
      <section className={`min-h-screen grid grid-cols-1 ${showPoster ? '2xl:grid-cols-[55%_45%]' : ''}`}>
        {/* Left: 60% white with brand on top-left and centered content */}
        <div className="bg-white flex flex-col min-h-screen">
          {/* Brand (top-left), same style as login/signup */}
          <div className="px-6 pt-6 md:px-10 md:pt-8">
            <div className="-ml-1 md:-ml-2">
              <span className="font-heading font-bold text-3xl tracking-wide text-black">MEORIS</span>
              <div className="mt-1 text-[11px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
            </div>
          </div>

          {/* Centered content */}
          <div className="flex-1 flex items-center justify-center px-6 md:px-10">
            <div className="w-[90vw] md:w-full md:max-w-lg">
              <h2 className="font-heading text-2xl md:text-2xl text-black text-left -mt-2 md:-mt-4">
                Lupa Password
              </h2>
              <p className="mt-2 font-body text-gray-700 text-sm">
                Masukkan email Anda untuk mendapatkan kode verifikasi
              </p>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSendCode} className="mt-6 space-y-6">
                {/* Email */}
                <div className="relative pb-3 flex items-center gap-5 md:gap-7">
                  <Image src="/images/user.png" alt="" width={24} height={24} aria-hidden="true" />
                  <div className="relative flex-1">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=" "
                      className="peer w-full border-0 border-b border-black rounded-none pr-0 py-3 focus:outline-none focus:ring-0 focus:border-black text-black placeholder-transparent"
                      aria-label="Email"
                      required
                    />
                    <label
                      htmlFor="email"
                      className="absolute left-0 top-3 text-gray-500 transition-all duration-200
                                 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                                 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-black
                                 peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black pointer-events-none"
                    >
                      Email
                    </label>
                  </div>
                </div>

                {/* Button */}
                <div className="flex justify-end gap-3">
                  <Link
                    href="/login"
                    className="bg-gray-100 text-gray-700 font-body px-5 py-2 rounded-none hover:bg-gray-200 transition min-w-[100px] text-center"
                  >
                    Kembali
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-black text-white font-body px-5 py-2 rounded-none hover:opacity-90 transition min-w-[120px] disabled:opacity-50"
                  >
                    {isLoading ? 'Mengirim...' : 'Kirim Kode'}
                  </button>
                </div>
              </form>

              {/* Back to login link */}
              <div className="mt-6 text-center">
                <Link href="/login" className="font-body text-sm text-blue-600 hover:underline">
                  Kembali ke halaman login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 45% poster image (hidden on touch devices) */}
        {showPoster && (
          <div className="hidden 2xl:block relative min-h-screen">
            <Image
              src="/images/poslogreg.png"
              alt="Reset Password poster"
              fill
              sizes="(min-width: 1536px) 45vw, 0"
              className="object-cover"
            />
          </div>
        )}
      </section>
    </main>
  )
}