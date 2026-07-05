/**
 * ThemeContext.jsx
 * -----------------------------------------------------------------------------
 * Holds the theme state, persists it to localStorage, and writes each setting
 * to the <html> element as a data-* attribute so CSS can react.
 *
 * Backend-later note:
 *   `persist()` is the single seam for persistence. Today it writes to
 *   localStorage. When you add a backend, change ONLY this function to also
 *   PUT the settings to e.g. /api/me/preferences — nothing else needs to move.
 */
import { createContext, useContext, useEffect, useCallback, useReducer } from 'react'
import {
  DEFAULT_THEME,
  THEME_ATTRIBUTES,
  STORAGE_KEY,
} from '@/config/themeConfig'

const ThemeContext = createContext(null)

function readInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) }
  } catch {
    /* ignore malformed storage */
  }
  return { ...DEFAULT_THEME }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value }
    case 'MERGE':
      return { ...state, ...action.payload }
    case 'RESET':
      return { ...DEFAULT_THEME }
    default:
      return state
  }
}

// Push every setting onto <html> as data-* attributes.
function applyToDom(settings) {
  const html = document.documentElement
  Object.entries(THEME_ATTRIBUTES).forEach(([key, attr]) => {
    if (settings[key] != null) html.setAttribute(attr, settings[key])
  })
}

export function ThemeProvider({ children }) {
  const [settings, dispatch] = useReducer(reducer, undefined, readInitialState)

  // Single persistence seam (swap for an API call when the backend lands).
  const persist = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [])

  // Keep DOM + storage in sync whenever settings change.
  useEffect(() => {
    applyToDom(settings)
    persist(settings)
  }, [settings, persist])

  const setSetting = useCallback((key, value) => {
    dispatch({ type: 'SET', key, value })
  }, [])

  const setMany = useCallback((payload) => {
    dispatch({ type: 'MERGE', payload })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const value = { settings, setSetting, setMany, reset }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
