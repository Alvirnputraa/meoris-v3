import './globals.css'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { ChatProvider } from '@/lib/chat-context'
import { ProductCacheProvider } from '@/lib/ProductCacheContext'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
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
