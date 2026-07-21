import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * api.js
 * -----------------------------------------------------------------------------
 * Thin data-access layer over Supabase. Every screen should read/write through
 * here instead of importing the static arrays directly.
 *
 *   const { data, loading } = useCollection('loans', staticLoans)
 *   await insertRow('loans', {...})
 *   await updateRow('loans', id, {...})
 *   await deleteRow('loans', id)
 *   const url = await uploadImage(file)
 *
 * Supabase is REQUIRED. There is no localStorage fallback: a per-device copy
 * silently diverged from the real data, shadowed corrections made to the seed
 * files, and made "did that save?" impossible to answer. If the env vars are
 * missing the app shows no data and says why, rather than inventing a local one.
 */

/** Throw a readable error instead of dereferencing a null client. */
function requireDb() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Not connected to the database. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload.'
    )
  }
  return supabase
}

// ---- CRUD -------------------------------------------------------------------
export async function listRows(table, { orderBy = 'id', ascending = true } = {}) {
  const db = requireDb()
  const { data, error } = await db.from(table).select('*').order(orderBy, { ascending })
  if (error) throw error
  return data
}

export async function insertRow(table, row) {
  const { data, error } = await requireDb().from(table).insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateRow(table, id, patch, idCol = 'id') {
  const { data, error } = await requireDb().from(table).update(patch).eq(idCol, id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(table, id, idCol = 'id') {
  const { error } = await requireDb().from(table).delete().eq(idCol, id)
  if (error) throw error
}

export async function upsertRow(table, row, onConflict = 'id') {
  const { data, error } = await requireDb().from(table).upsert(row, { onConflict }).select()
  if (error) throw error
  return data
}

// ---- Realtime collection hook ----------------------------------------------
/**
 * Live list for a table. Returns { data, loading, error }. Subscribes to
 * INSERT/UPDATE/DELETE so the UI updates in realtime across devices/tabs.
 *
 * The second argument is ignored — it used to be an AppData fallback array.
 * Kept in the signature so existing call sites don't all have to change, but
 * nothing is ever served from it: the database is the only source of truth.
 */
// eslint-disable-next-line no-unused-vars
export function useCollection(table, unusedFallback = [], { orderBy = 'id', ascending = true, map } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError(new Error('Not connected to the database.'))
      setLoading(false)
      return
    }

    let alive = true
    const load = () => listRows(table, { orderBy, ascending })
      .then((rows) => { if (alive) { setData(map ? rows.map(map) : rows); setLoading(false) } })
      .catch((e) => { if (alive) { setError(e); setLoading(false) } })

    load()
    const channel = supabase
      .channel(`rt:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, load)
      .subscribe()

    return () => { alive = false; supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orderBy, ascending])

  return { data, loading, error }
}

// ---- Image storage ----------------------------------------------------------
const BUCKET = 'images'

/** Upload a File/Blob to the `images` bucket, return its public URL. */
export async function uploadImage(file, folder = 'uploads') {
  // No data-URL fallback: inlining base64 wrote multi-MB payloads straight into
  // table rows and made images per-device. Storage or nothing.
  const db = requireDb()
  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await db.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
