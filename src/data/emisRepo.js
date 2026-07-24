import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * emisRepo.js — Monthly EMIs and the income sources that cover them.
 * Backend-only, like every other repo.
 */
const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

// ---- EMIs -------------------------------------------------------------------
const rowToEmi = (r) => ({
  id: r.id,
  activity: r.activity || '',
  kind: r.kind || 'emi',              // 'emi' | 'expense'
  amount: Number(r.amount) || 0,
  currency: r.currency || 'INR',
  dueDay: r.due_day ?? '',
  source: r.source || '',
  incomeId: r.income_id || '',        // income source that funds this item
  active: r.active !== false,
  sortOrder: r.sort_order ?? 0,
})
const emiToRow = (x) => ({
  id: x.id,
  activity: x.activity,
  kind: x.kind || 'emi',
  amount: Number(x.amount) || 0,
  currency: x.currency || 'INR',
  due_day: numOrNull(x.dueDay),
  source: x.source || null,
  income_id: x.incomeId || null,
  active: x.active !== false,
  sort_order: x.sortOrder ?? 0,
  updated_at: new Date().toISOString(),
})

export function useEmis() {
  const { data, loading, error } = useCollection('emis', [], {
    orderBy: 'sort_order', ascending: true, map: rowToEmi,
  })
  return { emis: data, loading, error }
}
export const addEmi = (x) => insertRow('emis', emiToRow(x))
export const editEmi = (x) => updateRow('emis', x.id, emiToRow(x))
export const removeEmi = (id) => deleteRow('emis', id)

// ---- Income sources ---------------------------------------------------------
const rowToIncome = (r) => ({
  id: r.id,
  name: r.name || '',
  amount: Number(r.amount) || 0,
  currency: r.currency || 'INR',
  frequency: r.frequency || 'monthly',   // 'monthly' | 'lumpsum'
  source: r.source || '',
  active: r.active !== false,
  sortOrder: r.sort_order ?? 0,
})
const incomeToRow = (x) => ({
  id: x.id,
  name: x.name,
  amount: Number(x.amount) || 0,
  currency: x.currency || 'INR',
  frequency: x.frequency || 'monthly',
  source: x.source || null,
  active: x.active !== false,
  sort_order: x.sortOrder ?? 0,
  updated_at: new Date().toISOString(),
})

export function useIncomeSources() {
  const { data, loading, error } = useCollection('income_sources', [], {
    orderBy: 'sort_order', ascending: true, map: rowToIncome,
  })
  return { incomes: data, loading, error }
}
export const addIncome = (x) => insertRow('income_sources', incomeToRow(x))
export const editIncome = (x) => updateRow('income_sources', x.id, incomeToRow(x))
export const removeIncome = (id) => deleteRow('income_sources', id)
