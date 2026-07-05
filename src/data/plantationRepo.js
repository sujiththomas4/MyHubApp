import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { localInsert, localUpdate, localDelete } from '@/lib/localdb'
import { plantationEntries as staticEntries, plantationActivities as staticActivities } from '@/data/AppData'

/** Plantation income/expense entries + activities (Supabase or localStorage). */
const rowToEntry = (r) => ({
  id: r.id, type: r.type, date: r.date, dueDate: r.due_date, category: r.category,
  amount: Number(r.amount), status: r.status, note: r.note || '',
})
const entryToRow = (e) => ({
  id: e.id, type: e.type, date: e.date, due_date: e.dueDate, category: e.category,
  amount: e.amount, status: e.status, note: e.note,
})
const rowToActivity = (r) => ({
  id: r.id, date: r.date, dueDate: r.due_date, activity: r.activity, status: r.status, note: r.note || '',
})
const activityToRow = (a) => ({
  id: a.id, date: a.date, due_date: a.dueDate, activity: a.activity, status: a.status, note: a.note,
})

export function usePlantationEntries() {
  const { data } = useCollection('plantation_entries', staticEntries, { map: rowToEntry })
  return data
}
export function usePlantationActivities() {
  const { data } = useCollection('plantation_activities', staticActivities, { map: rowToActivity })
  return data
}

export const addEntry = (e) =>
  isSupabaseConfigured ? insertRow('plantation_entries', entryToRow(e)) : Promise.resolve(localInsert('plantation_entries', staticEntries, e))
export const editEntry = (e) =>
  isSupabaseConfigured ? updateRow('plantation_entries', e.id, entryToRow(e)) : Promise.resolve(localUpdate('plantation_entries', staticEntries, e.id, e))
export const removeEntry = (id) =>
  isSupabaseConfigured ? deleteRow('plantation_entries', id) : Promise.resolve(localDelete('plantation_entries', staticEntries, id))

export const addActivity = (a) =>
  isSupabaseConfigured ? insertRow('plantation_activities', activityToRow(a)) : Promise.resolve(localInsert('plantation_activities', staticActivities, a))
export const editActivity = (a) =>
  isSupabaseConfigured ? updateRow('plantation_activities', a.id, activityToRow(a)) : Promise.resolve(localUpdate('plantation_activities', staticActivities, a.id, a))
export const removeActivity = (id) =>
  isSupabaseConfigured ? deleteRow('plantation_activities', id) : Promise.resolve(localDelete('plantation_activities', staticActivities, id))
