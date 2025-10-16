"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function VerificationPageContent() {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') // 'reset' untuk forgot password

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Get email from sessionStorage
    const savedEmail = sessionStorage.getItem('reset_email')
    if (!savedEmail) {
      // Redirect back if no email found
      router.push('/forgot-password')
      return
    }
    setEmail(savedEmail)

    const isTouchDevice = (
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches
    )
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setShowPoster(!(isTouchDevice || isMobileUA))
  }, [router])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!code.trim() || code.trim().length !== 6) {
        throw new Error('Masukkan 6 digit kode')
      }

      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        throw new Error(data.error || 'Kode tidak valid')
      }

      // Simpan kode yang sudah diverifikasi
      sessionStorage.setItem('reset_code', code.trim())
      
      // Redirect ke halaman change-password
      router.push('/change-password')
    } catch (error: any) {
      console.error('Verify code error:', error)
      setError(error.message || 'Verifikasi gagal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengirim ulang kode')
      }

      alert('Kode baru telah dikirim ke email Anda')
    } catch (error: any) {
      setError(error.message || 'Gagal mengirim ulang kode')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main>
      <section className={`min-h-screen grid grid-cols-1 ${showPoster ? '2xl:grid-cols-[55%_45%]' : ''}`}>
        {/* Left: 60% white with brand on top-left and centered content */}
        <div className="bg-white flex flex-col min-h-screen">
          {/* Brand (top-left) */}
          <div className="px-6 pt-6 md:px-10 md:pt-8">
            <div className="-ml-1 md:-ml-2">
              <span className="font-heading font-bold text-3xl tracking-wide text-black">MEORIS</span>
              <div className="mt-1 text-[11px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
            </div>
          </div>

          {/* Centered content */}
          <div className="flex-1 flex items-center justify-center px-6 md:px-10">
            <div className="w-[90vw] md:w-full md:max-w-lg">
              <h2 className="font-heading text-2xl md:text-3xl text-black text-left -mt-2 md:-mt-4">
                Verifikasi Kode
              </h2>
              <p className="mt-2 font-body text-gray-700 text-sm">
                Kami telah mengirim 6 digit kode ke email <strong className="text-black">{email}</strong>
              </p>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleVerifyCode} className="mt-6 space-y-6">
                {/* Code input */}
                <div>
                  <label htmlFor="code" className="block font-body text-sm text-gray-700 mb-2">
                    Kode Verifikasi
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black tracking-[0.5em] text-center text-xl font-semibold"
                    aria-label="Kode Verifikasi"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Masukkan 6 digit kode yang dikirim ke email Anda
                  </p>
                </div>

                {/* Resend code */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="font-body text-sm text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Kirim ulang kode
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <Link
                    href="/forgot-password"
                    className="bg-gray-100 text-gray-700 font-body px-5 py-2 rounded-md hover:bg-gray-200 transition min-w-[100px] text-center"
                  >
                    Kembali
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="bg-black text-white font-body px-5 py-2 rounded-md hover:opacity-90 transition min-w-[120px] disabled:opacity-50"
                  >
                    {isLoading ? 'Verifikasi...' : 'Verifikasi'}
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
              alt="Verification poster"
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

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerificationPageContent />
    </Suspense>
  )
}
