import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { getLocal, subscribeLocal } from './localdb'

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
 * When Supabase isn't configured, useCollection just returns the `fallback`
 * (your AppData arrays) so the app keeps working locally.
 */

// ---- CRUD -------------------------------------------------------------------
export async function listRows(table, { orderBy = 'id', ascending = true } = {}) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending })
  if (error) throw error
  return data
}

export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateRow(table, id, patch, idCol = 'id') {
  const { data, error } = await supabase.from(table).update(patch).eq(idCol, id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(table, id, idCol = 'id') {
  const { error } = await supabase.from(table).delete().eq(idCol, id)
  if (error) throw error
}

export async function upsertRow(table, row, onConflict = 'id') {
  const { data, error } = await supabase.from(table).upsert(row, { onConflict }).select()
  if (error) throw error
  return data
}

// ---- Realtime collection hook ----------------------------------------------
/**
 * Live list for a table. Returns { data, loading, error }. Subscribes to
 * INSERT/UPDATE/DELETE so the UI updates in realtime across devices/tabs.
 * `fallback` (AppData array) is used verbatim when Supabase isn't configured.
 */
export function useCollection(table, fallback = [], { orderBy = 'id', ascending = true, map } = {}) {
  const [data, setData] = useState(isSupabaseConfigured ? [] : getLocal(table, fallback))
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Static mode: read + subscribe to the localStorage store (persists on reload).
    if (!isSupabaseConfigured) {
      setData(getLocal(table, fallback))
      return subscribeLocal(table, setData)
    }

    // Supabase mode: fetch + realtime.
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
  if (!isSupabaseConfigured) {
    // Local fallback: inline data URL (fine for dev, not for production).
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file) })
  }
  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
