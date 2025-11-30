'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'

function VerificationContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPoster, setShowPoster] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Get data from sessionStorage (more secure than URL params)
    if (typeof window === 'undefined') return

    const savedEmail = sessionStorage.getItem('signup_email')
    const savedFullName = sessionStorage.getItem('signup_fullName')
    const savedPassword = sessionStorage.getItem('signup_password')

    if (savedEmail) setEmail(savedEmail)
    if (savedFullName) setFullName(savedFullName)
    if (savedPassword) setPassword(savedPassword)

    // Redirect back to signup if no data found
    if (!savedEmail || !savedFullName || !savedPassword) {
      router.push('/signup')
      return
    }

    // Check if device supports poster
    const isTouchDevice = (
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches
    )
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setShowPoster(!(isTouchDevice || isMobileUA))
  }, [router])

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
        this.color = '#000000'
      }

      draw() {
        if (!ctx) return
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

  const handleVerifyCode = async () => {
    try {
      setCodeError('')
      setIsLoading(true)
      
      if (!code.trim() || code.trim().length !== 6) {
        setCodeError('Masukkan 6 digit kode')
        return
      }
      
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      })
      
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setCodeError(data.error || 'Kode tidak valid')
        return
      }
      
      // After successful verification, create user
      const { userDb } = await import('@/lib/database')
      const newUser = await userDb.create(email, password, fullName)
      console.log('User created successfully:', newUser)
      setIsVerified(true)

      // Clear sensitive data from sessionStorage
      sessionStorage.removeItem('signup_email')
      sessionStorage.removeItem('signup_fullName')
      sessionStorage.removeItem('signup_password')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      
    } catch (e: any) {
      setCodeError(e?.message || 'Verifikasi gagal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    try {
      setError('')
      setSuccessMessage('')
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengirim ulang kode verifikasi')
      }
      setSuccessMessage('Kode verifikasi telah dikirim ulang')
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan')
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
                <Image
                  src="/logo/logo.png"
                  alt="MEORIS"
                  width={120}
                  height={40}
                  className="object-contain"
                />
              </div>
            </div>
            <div className={`flex-1 flex items-center justify-center px-6 md:px-10`}>
              <div className="w-full max-w-xl py-12">
                {!isVerified ? (
                  <>
                    {/* Heading */}
                    <h1 className="font-heading text-3xl md:text-4xl text-black">
                      Verifikasi Email
                    </h1>
                    <p className="mt-2 font-body text-gray-700">
                      Kami telah mengirim 6 digit kode ke <span className="font-semibold">{email}</span>
                    </p>

                    {/* Error Message */}
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 text-sm font-body">{error}</p>
                      </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-600 text-sm font-body">{successMessage}</p>
                      </div>
                    )}

                    {/* Code Input */}
                    <div className="mt-8">
                      <label htmlFor="code" className="block font-body text-sm text-gray-700 mb-1">
                        Kode Verifikasi
                      </label>
                      <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6))}
                        placeholder="123456"
                        inputMode="numeric"
                        className="w-full border border-gray-300 rounded-md px-3 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/40 tracking-widest text-center text-lg font-mono"
                        disabled={isLoading}
                      />
                      {codeError && (
                        <p className="mt-2 text-sm text-red-600">{codeError}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 space-y-4">
                      <button
                        onClick={handleVerifyCode}
                        disabled={isLoading || code.length !== 6}
                        className="w-full bg-black hover:opacity-90 text-white font-body py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Verifikasi Kode"
                      >
                        {isLoading ? 'Memverifikasi...' : 'Verifikasi'}
                      </button>
                      
                      <button
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-body py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Kirim Ulang Kode"
                      >
                        Kirim Ulang Kode
                      </button>
                    </div>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                      <Link href="/login" className="font-body text-blue-600 hover:underline text-sm">
                        Kembali ke Login
                      </Link>
                    </div>
                  </>
                ) : (
                  /* Success State */
                  <div className="text-center">
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="font-heading text-3xl md:text-4xl text-black mb-4">
                      Verifikasi Berhasil!
                    </h2>
                    <p className="font-body text-gray-700 mb-2">
                      Akun Anda telah berhasil dibuat.
                    </p>
                    <p className="font-body text-gray-700">
                      Anda akan dialihkan ke halaman login dalam beberapa detik...
                    </p>
                    <div className="mt-6">
                      <Link 
                        href="/login" 
                        className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-md hover:opacity-90 transition"
                      >
                        <span>Login Sekarang</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: 45% particle animation (hidden on touch devices) */}
          {showPoster && (
            <div className="hidden 2xl:block relative min-h-screen">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ background: '#ffffff' }}
              />
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default function VerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat halaman verifikasi...</p>
        </div>
      </div>
    }>
      <VerificationContent />
    </Suspense>
  )
}