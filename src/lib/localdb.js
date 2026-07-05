/**
 * localdb.js
 * -----------------------------------------------------------------------------
 * Tiny localStorage-backed store used as the persistence layer when Supabase
 * isn't configured (static mode). Seeds each "table" from the AppData array on
 * first use, persists CRUD, and notifies subscribers so the UI updates live and
 * survives reloads. Same-tab via listeners; cross-tab via the storage event.
 */
const KEY = (table) => `hub.db.${table}`
const listeners = {}

export function getLocal(table, seed) {
  try {
    const raw = localStorage.getItem(KEY(table))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  try { localStorage.setItem(KEY(table), JSON.stringify(seed)) } catch { /* ignore */ }
  return seed
}

export function setLocal(table, data) {
  try { localStorage.setItem(KEY(table), JSON.stringify(data)) } catch { /* ignore */ }
  const subs = listeners[table] || []
  subs.forEach((fn) => fn(data))
}

export function subscribeLocal(table, fn) {
  if (!listeners[table]) listeners[table] = []
  listeners[table].push(fn)
  const onStorage = (e) => { if (e.key === KEY(table) && e.newValue) { try { fn(JSON.parse(e.newValue)) } catch { /* ignore */ } } }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners[table] = (listeners[table] || []).filter((f) => f !== fn)
    window.removeEventListener('storage', onStorage)
  }
}

export const localInsert = (table, seed, row) => setLocal(table, [...getLocal(table, seed), row])
export const localUpsert = (table, seed, row, idKey = 'id') => {
  const rows = getLocal(table, seed)
  const i = rows.findIndex((r) => r[idKey] === row[idKey])
  setLocal(table, i >= 0 ? rows.map((r, ix) => (ix === i ? { ...r, ...row } : r)) : [...rows, row])
}
export const localUpdate = (table, seed, id, patch, idKey = 'id') =>
  setLocal(table, getLocal(table, seed).map((r) => (r[idKey] === id ? { ...r, ...patch } : r)))
export const localDelete = (table, seed, id, idKey = 'id') =>
  setLocal(table, getLocal(table, seed).filter((r) => r[idKey] !== id))
