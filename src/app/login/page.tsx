"use client";
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import FloatingChat from '@/components/FloatingChat'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const { login } = useAuth()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Directly perform login without email code verification
      await login(email, password)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opss, tidak dapat masuk. Periksa akunmu kembali')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <>
    <main>
      <section className={`min-h-screen grid grid-cols-1 ${showPoster ? '2xl:grid-cols-[55%_45%]' : ''}`}>
        {/* Left: 60% white with brand on top-left and centered login content */}
        <div className="bg-white flex flex-col min-h-screen">
          {/* Brand (top-left), logo */}
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

          {/* Centered login content (lift up slightly on touch devices in desktop mode) */}
          <div className={`flex-1 flex items-center justify-center px-6 md:px-10`}>
            <div className="w-[90vw] md:w-full md:max-w-lg">
              {/* Welcome label */}
              <h2 className="font-heading text-2xl md:text-2xl text-black text-left -mt-2 md:-mt-4">
                Selamat datang ! Masuk untuk akses akun anda
              </h2>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-4 space-y-6">
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

                {/* Password + Lupa password? */}
                <div>
                  <div className="relative pb-3 flex items-center gap-5 md:gap-7">
                    <Image src="/images/password.png" alt="" width={24} height={24} aria-hidden="true" />
                    <div className="relative flex-1">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=" "
                      className="peer w-full border-0 border-b border-black rounded-none pr-0 py-3 focus:outline-none focus:ring-0 focus:border-black text-black placeholder-transparent"
                      aria-label="Password"
                      required
                    />
                    <label
                      htmlFor="password"
                      className="absolute left-0 top-3 text-gray-500 transition-all duration-200
                                 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                                 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-black
                                 peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-black pointer-events-none"
                    >
                      Password
                    </label>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <a href="/forgot-password" className="font-body text-sm text-blue-600 hover:underline">Lupa password ?</a>
                  </div>
                </div>

                {/* Button Masuk */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-black text-white font-body px-5 py-2 rounded-none hover:opacity-90 transition min-w-[120px] disabled:opacity-50"
                    aria-label="Masuk"
                  >
                    {isLoading ? 'Loading...' : 'Masuk'}
                  </button>
                </div>

                {/* Register prompt */}
                <div className="text-center">
                  <span className="font-body text-sm text-black">
                    belum punya akun ?{' '}
                    <a href="/signup" className="text-blue-600 hover:underline">Daftar</a>
                  </span>
                </div>
                {/* Links: Syarat & Ketentuan, Kebijakan Privasi */}
                <div className="mt-3 flex items-center justify-center gap-4">
                  <a href="/terms-condition" className="flex items-center gap-1 text-sm text-blue-600 hover:underline whitespace-nowrap">
                    <span>Syarat &amp; Ketentuan</span>
                    <Image
                      src="/images/arrow.png"
                      alt=""
                      width={12}
                      height={12}
                      aria-hidden="true"
                      style={{ filter: 'invert(32%) sepia(74%) saturate(2196%) hue-rotate(200deg) brightness(94%) contrast(102%)' }}
                    />
                  </a>
                  <a href="/privacy-policy" className="flex items-center gap-1 text-sm text-blue-600 hover:underline whitespace-nowrap">
                    <span>Kebijakan Privasi</span>
                    <Image
                      src="/images/arrow.png"
                      alt=""
                      width={12}
                      height={12}
                      aria-hidden="true"
                      style={{ filter: 'invert(32%) sepia(74%) saturate(2196%) hue-rotate(200deg) brightness(94%) contrast(102%)' }}
                    />
                  </a>
                </div>
              </form>
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
  );
}
