import { useCollection, updateRow, insertRow, deleteRow } from '@/lib/api'

/**
 * investCommonRepo.js — shared bits of the Eva & Ezaak strategy system:
 * the strategy registry, the market-holiday calendar, and per-plan state
 * (cash carryover + top_n). Backend-only.
 */
export const rid = () => Math.random().toString(36).slice(2, 8)
const iso = () => new Date().toISOString()

// ---- Strategy registry -----------------------------------------------------
export function useStrategies() {
  const { data, loading, error, reload } = useCollection('ee_strategies', [], { orderBy: 'display_order', ascending: true })
  return { strategies: data, loading, error, reload }
}

// ---- Market holidays -------------------------------------------------------
export function useMarketHolidays() {
  const { data, loading, error, reload } = useCollection('market_holidays', [], { orderBy: 'holiday_date', ascending: true })
  return { holidays: new Set(data.map((h) => h.holiday_date)), rows: data, loading, error, reload }
}

// ---- Plan state (cash / top_n) --------------------------------------------
export function usePlanState(planCode) {
  const { data, loading, error, reload } = useCollection('ee_plan_state', [], { orderBy: 'plan_code', ascending: true })
  const state = data.find((s) => s.plan_code === planCode) || { plan_code: planCode, cash_balance: 0, top_n: 3 }
  return { state, allStates: data, loading, error, reload }
}
export const setPlanCash = (planCode, cash) => updateRow('ee_plan_state', planCode, { cash_balance: cash }, 'plan_code')
export const setPlanTopN = (planCode, n) => updateRow('ee_plan_state', planCode, { top_n: n }, 'plan_code')

// ---- Quarterly review log --------------------------------------------------
export function useReviewLog(planCode) {
  const { data, loading, error, reload } = useCollection('ee_review_log', [], { orderBy: 'created_at', ascending: false })
  return { reviews: data.filter((r) => r.plan_code === planCode), loading, error, reload }
}
export const addReview = (planCode, reviewMonth, note) =>
  insertRow('ee_review_log', { id: rid(), plan_code: planCode, review_month: reviewMonth, note: note || null, created_at: iso() })
export const removeReview = (id) => deleteRow('ee_review_log', id)
