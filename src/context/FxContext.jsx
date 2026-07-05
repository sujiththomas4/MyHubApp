import { createContext, useContext, useEffect, useState } from 'react'

/**
 * FxContext
 * -----------------------------------------------------------------------------
 * Currency conversion rate (AED → INR), editable from the Settings page and
 * persisted to localStorage. `toINR(amount, currency)` converts any AED amount
 * so mixed-currency holdings can roll up into a single INR figure.
 */
const FxContext = createContext(null)
const KEY = 'hub.fx.aedInr'
const DEFAULT = 26

export function FxProvider({ children }) {
  const [aedToInr, setRate] = useState(() => {
    const v = parseFloat(localStorage.getItem(KEY))
    return v > 0 ? v : DEFAULT
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, String(aedToInr)) } catch { /* ignore */ }
  }, [aedToInr])

  const setAedToInr = (v) => setRate(Math.max(0, Number(v) || 0))
  const toINR = (amount, currency) => (currency === 'AED' ? amount * aedToInr : amount)

  return (
    <FxContext.Provider value={{ aedToInr, setAedToInr, toINR }}>
      {children}
    </FxContext.Provider>
  )
}

export const useFx = () => useContext(FxContext)
