'use client'

import Link from 'next/link'
import Image from 'next/image'
import ReCAPTCHA from 'react-google-recaptcha'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { userDb } from '@/lib/database'
import FloatingChat from '@/components/FloatingChat'
// import ReCAPTCHA from 'react-google-recaptcha' // Commented out for testing


export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPoster, setShowPoster] = useState(false)
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Password validation checks
  const passwordValidations = {
    minLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }

  // Check if all password requirements are met
  const isPasswordValid = passwordValidations.minLength &&
                          passwordValidations.hasUpperCase &&
                          passwordValidations.hasNumber &&
                          passwordValidations.hasSymbol

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

  // Particle Network Animation
  useEffect(() => {
    if (!showPoster || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: any[] = []
    let animationFrameId: number
    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 120,
    }

    function resizeCanvas() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initParticles()
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', resizeCanvas)

    class Particle {
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      color: string

      constructor() {
        this.x = 0
        this.y = 0
        this.radius = 0
        this.vx = 0
        this.vy = 0
        this.color = '#000000'
        this.reset()
      }

      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.radius = 2.5 + Math.random() * 2
        const speed = 0.4 + Math.random() * 0.6
        const angle = Math.random() * Math.PI * 2
        this.vx = Math.cos(angle) * speed
        this.vy = Math.sin(angle) * speed

        // All particles black
        this.color = '#000000'
      }

      draw() {
        if (!ctx) return
        // Add glow effect
        ctx.shadowBlur = 8
        ctx.shadowColor = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
        ctx.shadowBlur = 0
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1

        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x
          const dy = this.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < mouse.radius + this.radius) {
            const force = (mouse.radius - dist) / mouse.radius
            const angle = Math.atan2(dy, dx)
            const repulse = force * 6
            this.x += Math.cos(angle) * repulse
            this.y += Math.sin(angle) * repulse
          }
        }

        this.draw()
      }
    }

    function initParticles() {
      particles = []
      const density = (canvas.width * canvas.height) / 15000
      const count = Math.min(180, Math.max(60, density))

      for (let i = 0; i < count; i++) {
        particles.push(new Particle())
      }
    }

    function connectParticles() {
      if (!ctx) return
      const maxDistance = 180

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < maxDistance) {
            const alpha = 1 - dist / maxDistance

            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(30, 41, 59, ${alpha * 0.3})`
            ctx.lineWidth = 1.5
            ctx.stroke()
          }
        }
      }
    }

    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.update()
      }

      connectParticles()
      animationFrameId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [showPoster])

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

      // Check if user already exists - HARUS dicek dulu sebelum kirim kode
      try {
        const existingUser = await userDb.getByEmail(email)
        if (existingUser) {
          // Email sudah terdaftar, jangan kirim kode
          setError('Email sudah terdaftar. Silakan gunakan email lain atau login.')
          setIsLoading(false)
          return
        }
      } catch (error: any) {
        // If error is "No rows found" or similar, that's good - user doesn't exist
        const errorMsg = error?.message || String(error)
        const isNotFoundError = errorMsg.includes('No rows found') ||
                                errorMsg.includes('not found') ||
                                errorMsg.includes('No user found') ||
                                !error?.message

        if (!isNotFoundError) {
          console.error('Error checking existing user:', error)
        }
        // Asumsikan user belum ada, lanjutkan proses
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
      
      // Store sensitive data in sessionStorage instead of URL
      sessionStorage.setItem('signup_email', email)
      sessionStorage.setItem('signup_fullName', fullName)
      sessionStorage.setItem('signup_password', password)

      // Redirect to verification page
      router.push(`/signup/verification`)

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
            <button
              onClick={() => router.push('/home')}
              className="relative w-32 h-16 md:w-40 md:h-20 cursor-pointer bg-transparent border-0 p-0"
              aria-label="Kembali ke halaman utama"
            >
              <Image
                src="/logo/logo.png"
                alt="MEORIS"
                fill
                className="object-contain"
                priority
              />
            </button>
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="hai@example.com"
                    aria-label="Email"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              {/* Password */}
              <div className="relative">
                <label htmlFor="password" className="block font-body text-sm text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Buat password anda disini"
                    aria-label="Password"
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordRequirements(true)}
                    onBlur={() => setTimeout(() => setShowPasswordRequirements(false), 200)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
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

                {/* Password Requirements Dropdown */}
                {showPasswordRequirements && (
                  <div className="mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Password harus memenuhi:</p>
                    <div className="space-y-2">
                      {/* Minimal 6 karakter */}
                      <div className="flex items-center gap-2">
                        {passwordValidations.minLength ? (
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                        )}
                        <span className={`text-xs ${passwordValidations.minLength ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                          Wajib 6 karakter
                        </span>
                      </div>

                      {/* Huruf besar */}
                      <div className="flex items-center gap-2">
                        {passwordValidations.hasUpperCase ? (
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                        )}
                        <span className={`text-xs ${passwordValidations.hasUpperCase ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                          Terdiri dari huruf besar
                        </span>
                      </div>

                      {/* Angka */}
                      <div className="flex items-center gap-2">
                        {passwordValidations.hasNumber ? (
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                        )}
                        <span className={`text-xs ${passwordValidations.hasNumber ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                          Terdiri dari angka
                        </span>
                      </div>

                      {/* Simbol */}
                      <div className="flex items-center gap-2">
                        {passwordValidations.hasSymbol ? (
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" />
                          </svg>
                        )}
                        <span className={`text-xs ${passwordValidations.hasSymbol ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                          Terdapat simbol (misal @, #, $)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={isLoading || !recaptchaValue || !isPasswordValid}
                >
                  {isLoading ? 'Mengirim kode...' : 'Daftar'}
                </button>
              </form>

              {/* Footer terms */}
              <p className="mt-6 text-center font-body text-gray-700 text-sm">
                Dengan mendaftar, Anda menyetujui{' '}
                <Link href="/terms-condition" className="text-blue-600 hover:underline">
                  Syarat &amp; Ketentuan
                </Link>{' '}
                dan{' '}
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Right: 45% particle network animation (hidden on touch devices) */}
        {showPoster && (
          <div className="hidden 2xl:block relative min-h-screen overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ background: '#ffffff' }}
            />
          </div>
        )}
      </section>
    </main>
    <FloatingChat />
    </>
  )
}
