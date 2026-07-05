import { createContext, useContext, useEffect, useState } from 'react'
import { brokers } from '@/data/AppData'

/**
 * CapitalContext
 * -----------------------------------------------------------------------------
 * Single source of truth for per-broker capital, shared across every business
 * screen (Option Buying / Selling / Intraday) and the P&L analytics. Seeded
 * from AppData.brokers and persisted to localStorage so edits from the Capital
 * screen stick.
 */
const CapitalContext = createContext(null)
const KEY = 'hub.capital'

const seed = () => Object.fromEntries(brokers.map((b) => [b.slug, b.capital]))

export function CapitalProvider({ children }) {
  const [capitals, setCapitals] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY))
      return { ...seed(), ...(saved || {}) }
    } catch {
      return seed()
    }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(capitals)) } catch { /* ignore */ }
  }, [capitals])

  const getCapital = (slug) => capitals[slug] ?? 0
  const setCapital = (slug, value) =>
    setCapitals((c) => ({ ...c, [slug]: Math.max(0, Math.round(Number(value) || 0)) }))
  const resetCapital = () => setCapitals(seed())

  return (
    <CapitalContext.Provider value={{ capitals, getCapital, setCapital, resetCapital }}>
      {children}
    </CapitalContext.Provider>
  )
}

export const useCapital = () => useContext(CapitalContext)
