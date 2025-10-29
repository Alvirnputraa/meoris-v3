'use client'

import Link from 'next/link'
import Image from 'next/image'
import ReCAPTCHA from 'react-google-recaptcha'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { userDb } from '@/lib/database'
// import ReCAPTCHA from 'react-google-recaptcha' // Commented out for testing


export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPoster, setShowPoster] = useState(false)
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null)
  // form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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

  // const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null) // Commented out for testing

  // const handleRecaptchaChange = (value: string | null) => { // Commented out for testing
  //   setRecaptchaValue(value)
  // }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!recaptchaValue) {
        throw new Error('Mohon verifikasi reCAPTCHA terlebih dahulu')
      }
      // Validate inputs
      if (!fullName || !email || !password) {
        throw new Error('Mohon lengkapi semua field')
      }

      if (password.length < 6) {
        throw new Error('Password minimal 6 karakter')
      }

      // Check if user already exists
      try {
        const existingUser = await userDb.getByEmail(email)
        if (existingUser) {
          throw new Error('Email sudah terdaftar')
        }
      } catch (error: any) {
        // If error is "No rows found" or similar, that's good - user doesn't exist
        // Only throw error if it's a different type of error
        if (error.message !== 'No rows found' && !error.message.includes('not found')) {
          console.error('Error checking existing user:', error)
          // Don't throw here, let the user try to register
        }
      }
      // Send verification code to email, then redirect to verification page
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengirim kode verifikasi')
      }
      
      // Redirect to verification page with user data
      const params = new URLSearchParams({
        email,
        fullName,
        password: btoa(password) // Encode password for URL safety
      })
      router.push(`/signup/verification?${params.toString()}`)

    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'Terjadi kesalahan saat mendaftar')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <>
    <main>
      <section className={`min-h-screen grid grid-cols-1 ${showPoster ? '2xl:grid-cols-[55%_45%]' : ''}`}>
        {/* Left: 55% white content */}
        <div className="bg-white flex flex-col min-h-screen">
          <div className="px-6 pt-6 md:px-10 md:pt-8">
            <div className="-ml-1 md:-ml-2">
              <span className="font-heading font-bold text-3xl tracking-wide text-black">MEORIS</span>
              <div className="mt-1 text-[11px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
            </div>
          </div>
          <div className={`flex-1 flex items-center justify-center px-6 md:px-10`}>
            <div className="w-full max-w-xl py-12">
              {/* Heading */}
              <h1 className="font-heading text-3xl md:text-4xl text-black">
                Daftar dengan mudah
              </h1>
              <p className="mt-2 font-body text-gray-700">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Masuk
                </Link>
              </p>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm font-body">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {/* Full Name - Simple field */}
                <div>
                  <label htmlFor="fullName" className="block font-body text-sm text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Masukkan nama lengkap Anda"
                    aria-label="Nama Lengkap"
                    required
                    disabled={isLoading}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block font-body text-sm text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="hai@example.com"
                    aria-label="Email"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              {/* Password */}
              <div>
                <label htmlFor="password" className="block font-body text-sm text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="123"
                  aria-label="Password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* reCAPTCHA */}
              <div className="mt-2">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                  onChange={(val) => setRecaptchaValue(val)}
                />
              </div>

                {/* CTA button */}
                <button
                  type="submit"
                  className="w-full bg-black hover:opacity-90 text-white font-body py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Daftar"
                  disabled={isLoading || !recaptchaValue}
                >
                  {isLoading ? 'Mengirim kode...' : 'Daftar'}
                </button>
              </form>

              {/* Footer terms */}
              <p className="mt-6 text-center font-body text-gray-700 text-sm">
                Dengan mendaftar, Anda menyetujui{' '}
                <Link href="/docs" className="text-blue-600 hover:underline">
                  Syarat &amp; Ketentuan
                </Link>{' '}
                dan{' '}
                <Link href="/docs" className="text-blue-600 hover:underline">
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Right: 45% poster image (hidden on touch devices) */}
        {showPoster && (
          <div className="hidden 2xl:block relative min-h-screen">
            <Image
              src="/images/poslogreg.png"
              alt="Signup poster"
              fill
              sizes="(min-width: 1536px) 45vw, 0"
              className="object-cover"
            />
          </div>
        )}
      </section>
    </main>
    </>
  )
}
