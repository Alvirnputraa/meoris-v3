"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
              <Image
                src="/logo/logo.png"
                alt="MEORIS"
                width={120}
                height={40}
                className="object-contain"
              />
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
  )
}
