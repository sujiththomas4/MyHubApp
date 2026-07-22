import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { brokers } from '@/data/AppData'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/**
 * CapitalContext
 * -----------------------------------------------------------------------------
 * Per-account capital. An account is a (broker slug, holder) pair, so the same
 * broker can be held under two names — two Zerodha accounts, different holders,
 * each with its own capital. Source of truth is the `brokers` table, keyed by
 * (slug, holder).
 *
 * `holder` defaults to '' — existing single-holder data keeps working unchanged
 * (getCapital('zerodha') still resolves it).
 */
const CapitalContext = createContext(null)

// One stable key per (broker, holder). Empty holder -> just the slug, so old
// single-holder rows and call sites behave exactly as before.
const capKey = (slug, holder = '') => (holder ? `${slug}|${holder}` : slug)

const seedRows = () =>
  brokers.map((b) => ({
    slug: b.slug, holder: b.holder || '', name: b.name,
    icon: b.icon, currency: b.currency, capital: b.capital,
  }))

export function CapitalProvider({ children }) {
  // Live capital rows from the brokers table (seed until the first fetch lands).
  const [rows, setRows] = useState(seedRows)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const load = () =>
      supabase.from('brokers').select('slug,holder,name,icon,currency,capital').then(({ data }) => {
        if (data) {
          setRows(data.map((b) => ({
            slug: b.slug, holder: b.holder || '', name: b.name,
            icon: b.icon, currency: b.currency, capital: Number(b.capital) || 0,
          })))
        }
      })
    load()
    const ch = supabase.channel('rt:brokers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brokers' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // Fast (slug|holder) -> capital lookup.
  const byKey = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => m.set(capKey(r.slug, r.holder), r.capital))
    return m
  }, [rows])

  const getCapital = (slug, holder = '') => byKey.get(capKey(slug, holder)) ?? 0

  const patchRow = (slug, holder, patch) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.slug === slug && (r.holder || '') === (holder || ''))
      if (i === -1) return rs
      return rs.map((r, ix) => (ix === i ? { ...r, ...patch } : r))
    })

  const setCapital = (slug, holder, value) => {
    const v = Math.max(0, Math.round(Number(value) || 0))
    patchRow(slug, holder, { capital: v })
    if (isSupabaseConfigured) {
      supabase.from('brokers').update({ capital: v })
        .eq('slug', slug).eq('holder', holder || '').then(() => {})
    }
  }

  // Create or update a capital account (broker + holder).
  const upsertAccount = ({ slug, holder = '', name, icon = 'ri-bank-line', currency = 'INR', capital = 0 }) => {
    const row = { slug, holder, name: name || slug, icon, currency, capital: Math.max(0, Math.round(Number(capital) || 0)) }
    setRows((rs) => {
      const i = rs.findIndex((r) => r.slug === slug && (r.holder || '') === holder)
      return i === -1 ? [...rs, row] : rs.map((r, ix) => (ix === i ? { ...r, ...row } : r))
    })
    if (isSupabaseConfigured) supabase.from('brokers').upsert(row, { onConflict: 'slug,holder' }).then(() => {})
  }

  const removeAccount = (slug, holder = '') => {
    setRows((rs) => rs.filter((r) => !(r.slug === slug && (r.holder || '') === holder)))
    if (isSupabaseConfigured) {
      supabase.from('brokers').delete().eq('slug', slug).eq('holder', holder || '').then(() => {})
    }
  }

  const resetCapital = () => {
    const s = seedRows()
    setRows(s)
    if (isSupabaseConfigured) supabase.from('brokers').upsert(s, { onConflict: 'slug,holder' }).then(() => {})
  }

  const value = { accounts: rows, getCapital, setCapital, upsertAccount, removeAccount, resetCapital }
  return <CapitalContext.Provider value={value}>{children}</CapitalContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCapital = () => useContext(CapitalContext)
