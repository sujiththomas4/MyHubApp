import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * lookupsRepo.js — configurable dropdown master data: each row is (list, value).
 * e.g. list "Expense Category" -> "Fertilizer". Admin-managed; read by all.
 */
export const EXPENSE_CATEGORY_LIST = 'Expense Category'
export const VARIETY_LIST = 'Pepper Variety'
export const UPDATE_TYPE_LIST = 'Update Type'
export const CROP_LIST = 'Crop'
export const HEALTH_SECTION_LIST = 'Health Center Section'
export const CONTACT_TYPE_LIST = 'Contact Type'
export const PROC_CATEGORY_LIST = 'Procedure Category'

const rowTo = (r) => ({ id: r.id, list: r.list || '', value: r.value || '', sortOrder: r.sort_order ?? 0 })
const toRow = (x) => ({ id: x.id, list: x.list, value: x.value, sort_order: x.sortOrder ?? 0, updated_at: new Date().toISOString() })

export function useLookups() {
  const { data, loading, error } = useCollection('lookups', [], { orderBy: 'sort_order', ascending: true, map: rowTo })
  return { lookups: data, loading, error }
}
export const addLookup = (x) => insertRow('lookups', toRow(x))
export const editLookup = (x) => updateRow('lookups', x.id, toRow(x))
export const removeLookup = (id) => deleteRow('lookups', id)

/** Values for a given list, sorted — from an already-loaded lookups array. */
export const valuesFor = (lookups, list) =>
  lookups.filter((l) => l.list === list).sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.value)
