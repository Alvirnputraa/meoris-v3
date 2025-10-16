"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Get email and code from sessionStorage
    const savedEmail = sessionStorage.getItem('reset_email')
    const savedCode = sessionStorage.getItem('reset_code')
    
    if (!savedEmail || !savedCode) {
      // Redirect back if no email or code found
      router.push('/forgot-password')
      return
    }
    
    setEmail(savedEmail)
    setCode(savedCode)

    const isTouchDevice = (
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches
    )
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setShowPoster(!(isTouchDevice || isMobileUA))
  }, [router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!newPassword || !confirmPassword) {
        throw new Error('Mohon lengkapi semua field')
      }

      if (newPassword.length < 6) {
        throw new Error('Password minimal 6 karakter')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Konfirmasi password tidak cocok')
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        throw new Error(data.error || 'Gagal reset password')
      }

      // Clear sessionStorage
      sessionStorage.removeItem('reset_email')
      sessionStorage.removeItem('reset_code')

      alert('Password berhasil direset!\nSilakan login dengan password baru Anda.')
      router.push('/login')
    } catch (error: any) {
      console.error('Reset password error:', error)
      setError(error.message || 'Terjadi kesalahan saat reset password')
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
                Buat Password Baru
              </h2>
              <p className="mt-2 font-body text-gray-700 text-sm">
                Masukkan password baru Anda
              </p>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleResetPassword} className="mt-6 space-y-6">
                {/* Email (readonly) */}
                <div>
                  <label htmlFor="email" className="block font-body text-sm text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-100 cursor-not-allowed"
                    aria-label="Email"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block font-body text-sm text-gray-700 mb-1">
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      aria-label="Password Baru"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Password minimal 6 karakter
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block font-body text-sm text-gray-700 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Masukkan ulang password baru"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      aria-label="Konfirmasi Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-black text-white font-body px-6 py-2.5 rounded-md hover:opacity-90 transition min-w-[140px] disabled:opacity-50"
                  >
                    {isLoading ? 'Memproses...' : 'Konfirmasi'}
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
              alt="Change Password poster"
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