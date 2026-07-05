import { createContext, useContext, useEffect, useState } from 'react'
import { brokers } from '@/data/AppData'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * CapitalContext
 * -----------------------------------------------------------------------------
 * Per-broker capital (shared across every activity). Source of truth is the
 * `brokers` table in Supabase when configured (live + persisted); otherwise
 * localStorage. Seeded from AppData.brokers.
 */
const CapitalContext = createContext(null)
const KEY = 'hub.capital'
const seed = () => Object.fromEntries(brokers.map((b) => [b.slug, b.capital]))

export function CapitalProvider({ children }) {
  const [capitals, setCapitals] = useState(() => {
    if (isSupabaseConfigured) return seed()
    try { const saved = JSON.parse(localStorage.getItem(KEY)); return { ...seed(), ...(saved || {}) } } catch { return seed() }
  })

  // Static mode: persist to localStorage.
  useEffect(() => {
    if (isSupabaseConfigured) return
    try { localStorage.setItem(KEY, JSON.stringify(capitals)) } catch { /* ignore */ }
  }, [capitals])

  // Supabase mode: load + realtime from the brokers table.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const load = () => supabase.from('brokers').select('slug,capital').then(({ data }) => {
      if (data && data.length) setCapitals(Object.fromEntries(data.map((b) => [b.slug, Number(b.capital)])))
    })
    load()
    const ch = supabase.channel('rt:brokers').on('postgres_changes', { event: '*', schema: 'public', table: 'brokers' }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const getCapital = (slug) => capitals[slug] ?? 0
  const setCapital = (slug, value) => {
    const v = Math.max(0, Math.round(Number(value) || 0))
    setCapitals((c) => ({ ...c, [slug]: v }))
    if (isSupabaseConfigured) supabase.from('brokers').update({ capital: v }).eq('slug', slug).then(() => {})
  }
  const resetCapital = () => {
    const s = seed()
    setCapitals(s)
    if (isSupabaseConfigured) brokers.forEach((b) => supabase.from('brokers').update({ capital: b.capital }).eq('slug', b.slug).then(() => {}))
  }

  return (
    <CapitalContext.Provider value={{ capitals, getCapital, setCapital, resetCapital }}>
      {children}
    </CapitalContext.Provider>
  )
}

export const useCapital = () => useContext(CapitalContext)
