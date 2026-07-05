import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { localInsert, localUpdate, localDelete } from '@/lib/localdb'
import { savings as staticSavings, savingsCategories as staticCategories } from '@/data/AppData'

/**
 * savingsRepo.js
 * -----------------------------------------------------------------------------
 * Data access for savings — Supabase when configured, else the static AppData
 * arrays. Maps DB snake_case <-> app camelCase so screens stay unchanged.
 */
const rowToSaving = (r) => ({
  id: r.id, category: r.category, name: r.name, currency: r.currency,
  invested: Number(r.invested), currentValue: Number(r.current_value),
  startDate: r.start_date, lockedYears: r.locked_years, note: r.note || '',
})
const savingToRow = (s) => ({
  id: s.id, category: s.category, name: s.name, currency: s.currency,
  invested: s.invested, current_value: s.currentValue,
  start_date: s.startDate, locked_years: s.lockedYears, note: s.note,
})

export function useSavings() {
  const { data, loading } = useCollection('savings', staticSavings, { map: rowToSaving })
  return { savings: data, loading }
}
export function useSavingsCategories() {
  const { data } = useCollection('savings_categories', staticCategories, { orderBy: 'name' })
  return data
}

// CRUD — Supabase when configured, else the localStorage store (persists).
export const addSaving = (s) =>
  isSupabaseConfigured ? insertRow('savings', savingToRow(s)) : Promise.resolve(localInsert('savings', staticSavings, s))
export const editSaving = (s) =>
  isSupabaseConfigured ? updateRow('savings', s.id, savingToRow(s)) : Promise.resolve(localUpdate('savings', staticSavings, s.id, s))
export const removeSaving = (id) =>
  isSupabaseConfigured ? deleteRow('savings', id) : Promise.resolve(localDelete('savings', staticSavings, id))
