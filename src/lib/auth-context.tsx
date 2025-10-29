"use client";
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, AuthUser } from './auth'

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  hydrated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously to avoid first-render null
  const [user, setUser] = useState<AuthUser | null>(() => auth.getCurrentUser())
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const loggedInUser = await auth.login(email, password)
      setUser(loggedInUser)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await auth.logout()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // On mount (client), re-sync user from storage (SSR may have set null)
  useEffect(() => {
    setUser(auth.getCurrentUser())
    setHydrated(true)
  }, [])

  // Sync auth state across tabs/windows via localStorage 'storage' events
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: StorageEvent) => {
      if (e.key === 'user') {
        setUser(auth.getCurrentUser())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hydrated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
