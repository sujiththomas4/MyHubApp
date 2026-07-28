import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * incomePlannerRepo.js — projected income sources (backend-only). Each row has an
 * expected return and a cadence; the screen normalises them to per-day/month/year.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? null : Number(v))

const rowToPlan = (r) => ({ id: r.id, type: r.type || '', amount: r.amount ?? '', frequency: r.frequency || 'monthly', note: r.note || '', sortOrder: r.sort_order ?? 0 })
const planToRow = (x) => ({ id: x.id, type: x.type, amount: num(x.amount), frequency: x.frequency || 'monthly', note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso() })

export function useIncomePlans() {
  const { data, loading, error } = useCollection('income_plans', [], { orderBy: 'sort_order', ascending: true, map: rowToPlan })
  return { plans: data, loading, error }
}
export const addIncomePlan = (x) => insertRow('income_plans', planToRow(x))
export const editIncomePlan = (x) => updateRow('income_plans', x.id, planToRow(x))
export const removeIncomePlan = (id) => deleteRow('income_plans', id)

export const FREQUENCY = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]
const DAYS_PER_MONTH = 30
// Normalise any amount+cadence to a per-month figure.
export const toMonthly = (amount, frequency) => {
  const a = Number(amount) || 0
  if (frequency === 'daily') return a * DAYS_PER_MONTH
  if (frequency === 'yearly') return a / 12
  return a
}
export const perDay = (monthly) => monthly / DAYS_PER_MONTH
export const perYear = (monthly) => monthly * 12
