import { createClient } from '@supabase/supabase-js'

/**
 * supabase.js
 * -----------------------------------------------------------------------------
 * Supabase client, created only when the two env vars are present. If they're
 * missing the app falls back to the static data in AppData.js, so nothing
 * breaks before you've configured a project.
 *
 * Put these in a `.env.local` file (Vite exposes VITE_ vars to the browser):
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
