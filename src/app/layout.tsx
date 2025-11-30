import './globals.css'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { ChatProvider } from '@/lib/chat-context'
import { ProductCacheProvider } from '@/lib/ProductCacheContext'

const headingFont = localFont({
  src: [
    {
      path: '../../public/fonts/CormorantGaramond-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-heading',
  display: 'swap',
  preload: true,
  fallback: ['serif'],
})

const bodyFont = localFont({
  src: [
    {
      path: '../../public/fonts/Belleza-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  fallback: ['sans-serif'],
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AuthProvider>
          <ChatProvider>
            <ProductCacheProvider>
              {children}
            </ProductCacheProvider>
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
