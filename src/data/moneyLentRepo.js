import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * moneyLentRepo.js — people who took money and haven't fully returned it.
 * Outstanding = amount - returned (derived in the UI). Backend-only.
 */
const rowToLent = (r) => ({
  id: r.id,
  person: r.person || '',
  amount: Number(r.amount) || 0,
  dateGiven: r.date_given || '',
  reason: r.reason || '',
  returned: Number(r.returned) || 0,
  returnedDate: r.returned_date || '',
  note: r.note || '',
})
const lentToRow = (x) => ({
  id: x.id,
  person: x.person,
  amount: Number(x.amount) || 0,
  date_given: x.dateGiven || null,
  reason: x.reason || null,
  returned: Number(x.returned) || 0,
  returned_date: x.returnedDate || null,
  note: x.note || null,
  updated_at: new Date().toISOString(),
})

export function useMoneyLent() {
  const { data, loading, error } = useCollection('money_lent', [], {
    orderBy: 'date_given', ascending: false, map: rowToLent,
  })
  return { lent: data, loading, error }
}
export const addLent = (x) => insertRow('money_lent', lentToRow(x))
export const editLent = (x) => updateRow('money_lent', x.id, lentToRow(x))
export const removeLent = (id) => deleteRow('money_lent', id)
