import { supabase } from './supabase'
import { userDb } from './database'

export interface AuthUser {
  id: string
  email: string
  nama: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
}

export const auth = {
  // Login with email and password - FIXED to use Supabase Auth
  async login(email: string, password: string) {
    try {
      // Use Supabase Auth for login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User not found')

      // Get user metadata (full_name from signup)
      const fullName = authData.user.user_metadata?.full_name || email.split('@')[0]

      // Create session data
      const authUser: AuthUser = {
        id: authData.user.id,
        email: authData.user.email || email,
        nama: fullName,
        phone: authData.user.user_metadata?.phone,
        gender: authData.user.user_metadata?.gender
      }

      // Try to get additional data from public.users if it exists
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('nama, phone, gender')
          .eq('id', authData.user.id)
          .single()

        if (userData) {
          authUser.nama = userData.nama || authUser.nama
          authUser.phone = userData.phone || authUser.phone
          authUser.gender = userData.gender || authUser.gender
        }
      } catch (e) {
        // Ignore if public.users doesn't exist or no data
        console.log('Note: public.users data not found, using auth metadata')
      }

      // Persist to both localStorage (cross-tab) and sessionStorage (current tab)
      try { localStorage.setItem('user', JSON.stringify(authUser)) } catch {}
      try { sessionStorage.setItem('user', JSON.stringify(authUser)) } catch {}

      return authUser
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Logout - FIXED to use Supabase Auth
  async logout() {
    try {
      // Sign out from Supabase Auth
      await supabase.auth.signOut()

      // Clear local storage
      try { sessionStorage.removeItem('user') } catch {}
      try { localStorage.removeItem('user') } catch {}
      return true
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },

  // Get current user
  getCurrentUser(): AuthUser | null {
    try {
      if (typeof window === 'undefined') return null
      try {
        // Prefer localStorage for cross-tab persistence, fallback to sessionStorage
        const l = localStorage.getItem('user')
        if (l) return JSON.parse(l)
        const s = sessionStorage.getItem('user')
        if (s) return JSON.parse(s)
      } catch {}
      return null
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null
  },

  // Refresh user data from database
  async refreshUser(): Promise<AuthUser | null> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) return null

      // Fetch fresh data from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, nama, phone, gender')
        .eq('id', currentUser.id)
        .single()

      if (error || !userData) {
        console.error('Refresh user error:', error)
        return currentUser
      }

      const refreshedUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        nama: userData.nama,
        phone: userData.phone,
        gender: userData.gender
      }

      // Update localStorage and sessionStorage
      try { localStorage.setItem('user', JSON.stringify(refreshedUser)) } catch {}
      try { sessionStorage.setItem('user', JSON.stringify(refreshedUser)) } catch {}

      // Trigger storage event to update UI across the app
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(refreshedUser),
        url: window.location.href
      }))

      return refreshedUser
    } catch (error) {
      console.error('Refresh user error:', error)
      return null
    }
  }
}
