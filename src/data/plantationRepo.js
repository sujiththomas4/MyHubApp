import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
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
  id: r.id, date: r.date, dueDate: r.due_date, activity: r.activity, status: r.status, landId: r.land_id || '', note: r.note || '',
  assignedTo: Array.isArray(r.assigned_ids) ? r.assigned_ids : (r.assigned_to ? [r.assigned_to] : []), important: !!r.important,
})
const activityToRow = (a) => ({
  id: a.id, date: a.date, due_date: a.dueDate, activity: a.activity, status: a.status, land_id: a.landId || null, note: a.note,
  assigned_ids: Array.isArray(a.assignedTo) ? a.assignedTo : (a.assignedTo ? [a.assignedTo] : []), assigned_to: null, important: !!a.important,
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
  insertRow('plantation_entries', entryToRow(e))
export const editEntry = (e) =>
  updateRow('plantation_entries', e.id, entryToRow(e))
export const removeEntry = (id) =>
  deleteRow('plantation_entries', id)

export const addActivity = (a) =>
  insertRow('plantation_activities', activityToRow(a))
export const editActivity = (a) =>
  updateRow('plantation_activities', a.id, activityToRow(a))
export const removeActivity = (id) =>
  deleteRow('plantation_activities', id)
