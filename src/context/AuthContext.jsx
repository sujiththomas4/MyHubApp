import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * AuthContext
 * -----------------------------------------------------------------------------
 * Supabase email auth + the signed-in user's role from the `profiles` table.
 * Roles: 'admin' (all sections) and 'plantation_member' (Plantation only).
 * When Supabase isn't configured the app runs in static mode as an admin.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [role, setRole] = useState(isSupabaseConfigured ? null : 'admin')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load the role for the current user (defaults to member if not found).
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const uid = session?.user?.id
    if (!uid) { setRole(null); return }
    let alive = true
    supabase.from('profiles').select('role').eq('id', uid).single()
      .then(({ data }) => { if (alive) setRole(data?.role || 'plantation_member') })
      .catch(() => { if (alive) setRole('plantation_member') })
    return () => { alive = false }
  }, [session?.user?.id])

  const signInWithPassword = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signInWithOtp = (email) =>
    supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      session, ready, role, isAdmin: role === 'admin',
      // role still resolving while a session exists but the profile hasn't loaded
      roleReady: !isSupabaseConfigured || !session || role !== null,
      signInWithPassword, signInWithOtp, signOut,
      needsAuth: isSupabaseConfigured && !session,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
