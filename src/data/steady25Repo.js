import { useCollection, insertRow, updateRow, deleteRow, listRows } from '@/lib/api'
import { rid } from './investCommonRepo'

/**
 * steady25Repo.js — Steady 25 SIP: fixed index/gold/debt funds + monthly
 * allotments (money split, no units). Backend-only.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

// ---- Funds -----------------------------------------------------------------
export function useFunds() {
  const { data, loading, error, reload } = useCollection('ee_funds', [], { orderBy: 'display_order', ascending: true })
  return { funds: data, loading, error, reload }
}
/** Update the invested / current-value figures shown against a fund. */
export const setFundValues = (id, invested, currentValue) =>
  updateRow('ee_funds', id, { invested: num(invested), current_value: num(currentValue), values_updated_at: iso() })

/**
 * What the holding actually is, and where it sits. `name` stays the slot
 * ("Nifty 50 Index Fund"); fundName is the scheme actually bought, and
 * brokerSlug/brokerHolder point at the capital account holding it.
 */
export const setFundDetails = (id, { fundName, brokerSlug, brokerHolder }) =>
  updateRow('ee_funds', id, {
    fund_name: (fundName || '').trim() || null,
    broker_slug: brokerSlug || null,
    broker_holder: brokerSlug ? (brokerHolder || '') : null,
  })

/** Label for a fund's capital account, e.g. "Dhan · Mummy". */
export const brokerLabel = (accounts, fund) => {
  if (!fund || !fund.broker_slug) return null
  const a = accounts.find((x) => x.slug === fund.broker_slug && (x.holder || '') === (fund.broker_holder || ''))
  if (!a) return fund.broker_holder ? `${fund.broker_slug} · ${fund.broker_holder}` : fund.broker_slug
  return a.holder ? `${a.name} · ${a.holder}` : a.name
}

// ---- Allotments ------------------------------------------------------------
export function useFundAllotments() {
  const { data, loading, error, reload } = useCollection('ee_fund_allotments', [], { orderBy: 'invest_date', ascending: false })
  return { allotments: data, loading, error, reload }
}
export function useFundAllotmentLines() {
  const { data, loading, error, reload } = useCollection('ee_fund_allotment_lines', [], { orderBy: 'id', ascending: true })
  return { lines: data, loading, error, reload }
}

/**
 * Record a month's SIP. lines: [{ fund_id, amount }]. Writes the allotment,
 * its lines, and folds each amount into the fund's invested total.
 *
 * Idempotent: if an allotment already exists for the same month it is replaced
 * (reversed, then re-recorded), so re-running a month never trips the
 * UNIQUE(allotment_month) constraint. Reads invested fresh from the DB so the
 * increments stay correct across the replace.
 */
export async function recordFundAllotment({ month, investDate, total, lines }) {
  // Replace any existing allotment for this month first.
  const existingAllots = await listRows('ee_fund_allotments')
  const dup = existingAllots.find((a) => a.allotment_month === month)
  if (dup) {
    const existingLines = await listRows('ee_fund_allotment_lines')
    const funds0 = await listRows('ee_funds')
    for (const l of existingLines.filter((x) => x.allotment_id === dup.id)) {
      const f = funds0.find((ff) => ff.id === l.fund_id)
      if (f && num(l.amount) > 0) await updateRow('ee_funds', f.id, { invested: Math.max(0, num(f.invested) - num(l.amount)) })
      await deleteRow('ee_fund_allotment_lines', l.id)
    }
    await deleteRow('ee_fund_allotments', dup.id)
  }

  const funds = await listRows('ee_funds') // fresh invested totals
  const allot = await insertRow('ee_fund_allotments', {
    id: rid(), allotment_month: month, invest_date: investDate, total_amount: num(total), created_at: iso(),
  })
  for (const l of lines) {
    await insertRow('ee_fund_allotment_lines', { id: rid(), allotment_id: allot.id, fund_id: l.fund_id, amount: num(l.amount) })
    const fund = funds.find((f) => f.id === l.fund_id)
    if (fund && num(l.amount) > 0) {
      await updateRow('ee_funds', fund.id, { invested: num(fund.invested) + num(l.amount) })
    }
  }
  return allot
}

export async function deleteFundAllotment(allot, lines, funds) {
  for (const l of lines.filter((x) => x.allotment_id === allot.id)) {
    const fund = funds.find((f) => f.id === l.fund_id)
    if (fund && num(l.amount) > 0) await updateRow('ee_funds', fund.id, { invested: Math.max(0, num(fund.invested) - num(l.amount)) })
    await deleteRow('ee_fund_allotment_lines', l.id)
  }
  await deleteRow('ee_fund_allotments', allot.id)
}
