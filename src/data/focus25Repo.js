import { useCollection, insertRow, updateRow, deleteRow, listRows } from '@/lib/api'
import { rid, setPlanCash } from './investCommonRepo'

/**
 * focus25Repo.js — Focus 25 Stocks: up to 25 equal-weight stocks bought in
 * whole units via gap-fill top-N. Also backs Metal 25 (ee_etf_holdings) since
 * both share the ee_stock_allotments tables. Backend-only.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

// ---- Stocks ----------------------------------------------------------------
export function useFocusStocks() {
  const { data, loading, error, reload } = useCollection('ee_focus_stocks', [], { orderBy: 'display_order', ascending: true })
  return { stocks: data, loading, error, reload }
}
export const addFocusStock = (x) => insertRow('ee_focus_stocks', {
  id: rid(), symbol: (x.symbol || '').trim().toUpperCase(), name: x.name || '', tier: x.tier || 'large',
  sector: x.sector || null, target_weight: num(x.target_weight), ltp: num(x.ltp), qty: num(x.qty),
  invested: num(x.invested), ltp_updated_at: iso(), checklist: x.checklist || null, notes: x.notes || null,
  active: x.active !== false, display_order: num(x.display_order),
})
export const editFocusStock = (id, patch) => updateRow('ee_focus_stocks', id, {
  ...patch,
  ...(patch.symbol != null ? { symbol: (patch.symbol || '').trim().toUpperCase() } : {}),
  ...(patch.target_weight != null ? { target_weight: num(patch.target_weight) } : {}),
})
export const softRemoveFocusStock = (id) => updateRow('ee_focus_stocks', id, { active: false })
export const removeFocusStock = (id) => deleteRow('ee_focus_stocks', id)
export const setFocusLtp = (id, ltp) => updateRow('ee_focus_stocks', id, { ltp: num(ltp), ltp_updated_at: iso() })

// ---- Allotments (shared with Metal 25) ------------------------------------
export function useStockAllotments(planCode) {
  const { data, loading, error, reload } = useCollection('ee_stock_allotments', [], { orderBy: 'invest_date', ascending: false })
  return { allotments: data.filter((a) => a.plan_code === planCode), loading, error, reload }
}
export function useStockAllotmentLines() {
  const { data, loading, error, reload } = useCollection('ee_stock_allotment_lines', [], { orderBy: 'id', ascending: true })
  return { lines: data, loading, error, reload }
}

/**
 * Record an allotment for a stock/ETF plan. lines: [{ stock_id, shares, price, cost }].
 * table = 'ee_focus_stocks' | 'ee_etf_holdings' (which holdings to fold into).
 * Folds shares+cost into each holding, and persists the new cash balance.
 *
 * Idempotent: replaces any existing allotment for the same plan+month+type
 * (reversed, then re-recorded) so re-running never trips UNIQUE(plan_code,
 * allotment_month, type). type = 'monthly' (default) | 'lumpsum'. Reads
 * qty/invested fresh so the roll-up stays correct.
 */
export async function recordStockAllotment({ planCode, table, month, investDate, amount, cashBefore, cashAfter, lines, type = 'monthly' }) {
  const existingAllots = await listRows('ee_stock_allotments')
  const dup = existingAllots.find((a) => a.plan_code === planCode && a.allotment_month === month && (a.type || 'monthly') === type)
  if (dup) {
    const existingLines = await listRows('ee_stock_allotment_lines')
    const holdings0 = await listRows(table)
    for (const l of existingLines.filter((x) => x.allotment_id === dup.id)) {
      const h = holdings0.find((x) => x.id === l.stock_id)
      if (h) await updateRow(table, h.id, { qty: Math.max(0, num(h.qty) - num(l.shares)), invested: Math.max(0, num(h.invested) - num(l.cost)) })
      await deleteRow('ee_stock_allotment_lines', l.id)
    }
    await deleteRow('ee_stock_allotments', dup.id)
  }

  const holdings = await listRows(table) // fresh qty / invested
  const allot = await insertRow('ee_stock_allotments', {
    id: rid(), plan_code: planCode, allotment_month: month, invest_date: investDate, type,
    amount: num(amount), cash_before: num(cashBefore), cash_after: num(cashAfter), created_at: iso(),
  })
  for (const l of lines) {
    await insertRow('ee_stock_allotment_lines', { id: rid(), allotment_id: allot.id, stock_id: l.stock_id, shares: num(l.shares), price: num(l.price), cost: num(l.cost) })
    const h = holdings.find((x) => x.id === l.stock_id)
    if (h) await updateRow(table, h.id, { qty: num(h.qty) + num(l.shares), invested: num(h.invested) + num(l.cost) })
  }
  await setPlanCash(planCode, num(cashAfter))
  return allot
}

export async function deleteStockAllotment({ allot, lines, table, holdings }) {
  for (const l of lines.filter((x) => x.allotment_id === allot.id)) {
    const h = holdings.find((x) => x.id === l.stock_id)
    if (h) await updateRow(table, h.id, { qty: Math.max(0, num(h.qty) - num(l.shares)), invested: Math.max(0, num(h.invested) - num(l.cost)) })
    await deleteRow('ee_stock_allotment_lines', l.id)
  }
  await setPlanCash(allot.plan_code, num(allot.cash_before))
  await deleteRow('ee_stock_allotments', allot.id)
}
