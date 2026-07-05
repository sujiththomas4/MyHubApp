/**
 * PrivacyContext.jsx
 * -----------------------------------------------------------------------------
 * Dashboard "hide amounts" toggle. When `hidden` is true every number rendered
 * through <Secret> is masked with asterisks, and charts can blur themselves.
 */
import { createContext, useContext, useState } from 'react'

const PrivacyContext = createContext({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(false)
  const toggle = () => setHidden((v) => !v)
  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export const usePrivacy = () => useContext(PrivacyContext)

/* Replace every digit with '*', leaving currency symbols / separators intact
   so the layout stays stable (e.g. "$559.25" -> "$***.**"). */
export function maskValue(value) {
  return String(value).replace(/\d/g, '*')
}

/* Wrap any numeric value: shows it normally, or masked when privacy is on. */
export function Secret({ children }) {
  const { hidden } = usePrivacy()
  if (!hidden) return <>{children}</>
  return <span className="secret">{maskValue(children)}</span>
}
