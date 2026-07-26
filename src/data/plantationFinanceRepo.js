import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * plantationFinanceRepo.js — plantation capital + expenses.
 * Backend-only. Balance = capital - expenses; unsettled personal expenses are
 * money owed back to whoever fronted it.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v))
const todayISO = () => new Date().toISOString().slice(0, 10)

// ---- Capital ----------------------------------------------------------------
const rowToCapital = (r) => ({
  id: r.id, landId: r.land_id || '', contributor: r.contributor || '', amount: Number(r.amount) || 0,
  date: r.date || '', note: r.note || '', image: r.image || '',
})
const capitalToRow = (x) => ({
  id: x.id, land_id: x.landId || null, contributor: x.contributor, amount: num(x.amount),
  date: x.date || null, note: x.note || null, image: x.image || null,
})
export function usePlantationCapital() {
  const { data, loading, error } = useCollection('plantation_capital', [], { orderBy: 'date', ascending: false, map: rowToCapital })
  return { capital: data, loading, error }
}
export const addCapital = (x) => insertRow('plantation_capital', capitalToRow(x))
export const editCapital = (x) => updateRow('plantation_capital', x.id, capitalToRow(x))
export const removeCapital = (id) => deleteRow('plantation_capital', id)

// ---- Expenses ---------------------------------------------------------------
const rowToExpense = (r) => ({
  id: r.id, landId: r.land_id || '', title: r.title || '', amount: Number(r.amount) || 0, billDate: r.bill_date || '',
  category: r.category || '',
  paidBy: r.paid_by || '', source: r.source || 'capital', settled: !!r.settled,
  settledDate: r.settled_date || '', note: r.note || '', image: r.image || '',
})
const expenseToRow = (x) => ({
  id: x.id, land_id: x.landId || null, title: x.title, amount: num(x.amount), bill_date: x.billDate || null,
  category: x.category || null,
  paid_by: x.paidBy || null, source: x.source || 'capital',
  settled: x.source === 'capital' ? true : !!x.settled,     // capital-paid is always settled
  settled_date: x.source === 'capital' ? null : (x.settled ? (x.settledDate || todayISO()) : null),
  note: x.note || null, image: x.image || null,
})
export function usePlantationExpenses() {
  const { data, loading, error } = useCollection('plantation_expenses', [], { orderBy: 'bill_date', ascending: false, map: rowToExpense })
  return { expenses: data, loading, error }
}
export const addExpense = (x) => insertRow('plantation_expenses', expenseToRow(x))
export const editExpense = (x) => updateRow('plantation_expenses', x.id, expenseToRow(x))
export const removeExpense = (id) => deleteRow('plantation_expenses', id)
export const settleExpense = (id) => updateRow('plantation_expenses', id, { settled: true, settled_date: todayISO() })
