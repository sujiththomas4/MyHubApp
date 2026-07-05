import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * AuthContext
 * -----------------------------------------------------------------------------
 * Supabase email magic-link auth. Required because RLS only allows an
 * authenticated user. When Supabase isn't configured the app runs in static
 * mode with no auth gate.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signInWithPassword = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signInWithOtp = (email) =>
    supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, ready, signInWithPassword, signInWithOtp, signOut, needsAuth: isSupabaseConfigured && !session }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
