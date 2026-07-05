import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * FxContext
 * -----------------------------------------------------------------------------
 * AED → INR conversion rate. Stored in Supabase `app_settings` (key
 * 'fx.aedInr') when configured; otherwise localStorage. `toINR(amount,
 * currency)` converts AED amounts for INR roll-ups.
 */
const FxContext = createContext(null)
const KEY = 'hub.fx.aedInr'
const SETTING = 'fx.aedInr'
const DEFAULT = 26

export function FxProvider({ children }) {
  const [aedToInr, setRate] = useState(() => {
    if (isSupabaseConfigured) return DEFAULT
    const v = parseFloat(localStorage.getItem(KEY))
    return v > 0 ? v : DEFAULT
  })

  useEffect(() => {
    if (isSupabaseConfigured) return
    try { localStorage.setItem(KEY, String(aedToInr)) } catch { /* ignore */ }
  }, [aedToInr])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const load = () => supabase.from('app_settings').select('value').eq('key', SETTING).maybeSingle()
      .then(({ data }) => { if (data && data.value != null) setRate(Number(data.value)) })
    load()
    const ch = supabase.channel('rt:app_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const setAedToInr = (v) => {
    const n = Math.max(0, Number(v) || 0)
    setRate(n)
    if (isSupabaseConfigured) supabase.from('app_settings').upsert({ key: SETTING, value: n }).then(() => {})
  }
  const toINR = (amount, currency) => (currency === 'AED' ? amount * aedToInr : amount)

  return (
    <FxContext.Provider value={{ aedToInr, setAedToInr, toINR }}>
      {children}
    </FxContext.Provider>
  )
}

export const useFx = () => useContext(FxContext)
