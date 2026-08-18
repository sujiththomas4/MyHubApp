import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { syncMasterLtp } from './masterLtp'

/**
 * emaSupportRepo.js — "50 & 200 EMA Support": a long-term accumulation book.
 * One row per stock you keep forever, plus a lot per buy/sell. Quantity,
 * average cost, invested and realised P&L are DERIVED from the lots on every
 * read, never stored — so the position can never disagree with its history.
 *
 * The rule the book runs on: add again once price is 10% below the last buy.
 */
const iso = () => new Date().toISOString()
export const rid = () => Math.random().toString(36).slice(2, 8)
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const orNull = (v) => (v === '' || v == null ? null : Number(v))

/** Add again this far below the last buy. */
export const ADD_DROP = 0.10

/** Which moving average the buy was made at. Recorded per lot. */
export const SUPPORT_OPTIONS = [
  { value: '50', label: '50 EMA', tone: 'info' },
  { value: '200', label: '200 EMA', tone: 'primary' },
  { value: '', label: 'Other / not noted', tone: 'secondary' },
]
export const SUPPORT = Object.fromEntries(SUPPORT_OPTIONS.filter((o) => o.value).map((o) => [o.value, o]))

export const SIDES = [
  { value: 'BUY', label: 'Buy / add' },
  { value: 'SELL', label: 'Sell / trim' },
]

// ---- Positions -------------------------------------------------------------
export function useEmaPositions() {
  const { data, loading, error, reload } = useCollection('ee_ema_positions', [], { orderBy: 'symbol', ascending: true })
  return { positions: data, loading, error, reload }
}
export const addPosition = (x) => insertRow('ee_ema_positions', {
  id: 'ema-' + rid(),
  symbol: (x.symbol || '').trim().toUpperCase(),
  name: x.name || null,
  sector: x.sector || null,
  bucket: x.bucket || null,
  thesis: x.thesis || null,
  ema_50: orNull(x.ema50),
  ema_200: orNull(x.ema200),
  ltp: orNull(x.ltp),
  levels_at: iso(),
  created_at: iso(),
})
export const editPosition = (id, patch) => updateRow('ee_ema_positions', id, patch)
export const removePosition = (id) => deleteRow('ee_ema_positions', id)
/** Batch LTP write, then push the prices up to the master stock list. */
export const saveLtps = async (entries) => {
  await Promise.all(entries.map(({ id, ltp }) => updateRow('ee_ema_positions', id, { ltp: num(ltp), levels_at: iso() })))
  await syncMasterLtp(entries)
}

// ---- Lots ------------------------------------------------------------------
export function useEmaLots() {
  const { data, loading, error, reload } = useCollection('ee_ema_lots', [], { orderBy: 'trade_date', ascending: true })
  return { lots: data, loading, error, reload }
}
export const addLot = (x) => insertRow('ee_ema_lots', {
  id: 'lot-' + rid(),
  position_id: x.positionId,
  side: x.side || 'BUY',
  qty: num(x.qty),
  price: num(x.price),
  trade_date: x.tradeDate,
  support: x.support || null,
  note: x.note || null,
  created_at: iso(),
})
export const removeLot = (id) => deleteRow('ee_ema_lots', id)

/** Add a basket of stocks: a position each (or reuse one), plus its first lot. */
export async function addBasket(rows, existing) {
  // Track positions created in this pass too: two rows for the same symbol must
  // become two lots on one position, not a duplicate-key error.
  const known = [...existing]
  for (const r of rows) {
    const sym = (r.symbol || '').trim().toUpperCase()
    let pos = known.find((p) => (p.symbol || '').toUpperCase() === sym)
    // eslint-disable-next-line no-await-in-loop
    if (!pos) { pos = await addPosition(r); known.push(pos) }
    // eslint-disable-next-line no-await-in-loop
    await addLot({ positionId: pos.id, side: 'BUY', qty: r.qty, price: r.price, tradeDate: r.tradeDate, support: r.support, note: r.note })
  }
}

// ===========================================================================
// Pure calculations
// ===========================================================================

/**
 * Walk a position's lots oldest-first under average-cost accounting.
 * A sell realises against the running average and leaves the average intact —
 * which is what makes "am I still up on what I hold?" answerable after a trim.
 */
export function positionStats(position, lots) {
  const mine = lots
    .filter((l) => l.position_id === position.id)
    .sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)) || String(a.created_at).localeCompare(String(b.created_at)))

  let qty = 0
  let cost = 0
  let realised = 0
  let buys = 0
  let lastBuyPrice = 0
  let lastBuyDate = null
  let firstDate = null

  mine.forEach((l) => {
    const q = num(l.qty)
    const p = num(l.price)
    if (!firstDate) firstDate = l.trade_date
    if (l.side === 'SELL') {
      const avg = qty > 0 ? cost / qty : 0
      const sold = Math.min(q, qty)
      realised += sold * (p - avg)
      cost -= sold * avg
      qty -= sold
    } else {
      qty += q
      cost += q * p
      buys += 1
      lastBuyPrice = p
      lastBuyDate = l.trade_date
    }
  })

  const avgCost = qty > 0 ? cost / qty : 0
  const ltp = num(position.ltp) || avgCost
  const value = qty * ltp
  const unrealised = qty > 0 ? value - cost : 0
  // The accumulation trigger sits 10% under the last buy, not under the average:
  // averaging down against the average would keep moving the goalposts.
  const nextAdd = lastBuyPrice > 0 ? lastBuyPrice * (1 - ADD_DROP) : 0
  const dropFromLastBuy = lastBuyPrice > 0 ? (ltp - lastBuyPrice) / lastBuyPrice : 0

  return {
    lots: mine,
    qty, invested: cost, avgCost, ltp, value,
    unrealised, realised, total: unrealised + realised,
    pnlPct: cost > 0 ? (unrealised / cost) * 100 : null,
    buys, lastBuyPrice, lastBuyDate, firstDate,
    nextAdd,
    dropFromLastBuy,
    dueToAdd: nextAdd > 0 && ltp > 0 && ltp <= nextAdd,
  }
}

/** Where price sits against the two EMAs this book is named for. */
export function emaView(position) {
  const ltp = num(position.ltp)
  const e50 = num(position.ema_50)
  const e200 = num(position.ema_200)
  if (!ltp) return null
  const gap = (e) => (e > 0 ? (ltp - e) / e : null)
  const g50 = gap(e50)
  const g200 = gap(e200)
  // "At support" = within 2% above, or already below.
  const near = (g) => g != null && g <= 0.02
  return {
    ltp, e50, e200, g50, g200,
    at50: near(g50) && g50 > -0.02,
    at200: near(g200) && g200 > -0.02,
    below50: g50 != null && g50 < 0,
    below200: g200 != null && g200 < 0,
    atSupport: near(g50) || near(g200),
  }
}

export function bookTotals(positions, lots) {
  const stats = positions.map((p) => positionStats(p, lots))
  const held = stats.filter((s) => s.qty > 0)
  return {
    n: positions.length,
    held: held.length,
    invested: held.reduce((s, x) => s + x.invested, 0),
    value: held.reduce((s, x) => s + x.value, 0),
    unrealised: held.reduce((s, x) => s + x.unrealised, 0),
    realised: stats.reduce((s, x) => s + x.realised, 0),
    dueToAdd: held.filter((s) => s.dueToAdd).length,
  }
}
