import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'

/**
 * ngRepo.js — Nifty–Gold Ratio investment. Trades per asset + a single settings
 * row holding the latest unit prices. Holdings / P&L derived (average-cost).
 * Backend-only.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

export const ASSETS = [
  { value: 'nifty', label: 'Nifty', tone: 'primary', icon: 'ri-line-chart-line' },
  { value: 'gold', label: 'Gold', tone: 'warning', icon: 'ri-coin-line' },
]
export const ASSET = Object.fromEntries(ASSETS.map((a) => [a.value, a]))

// ---- Trades ---------------------------------------------------------------
const rowToTrade = (r) => ({ id: r.id, asset: r.asset || 'nifty', action: r.action || 'buy', term: r.term || (r.action === 'buy' ? 'long' : ''), parentId: r.parent_id || '', qty: r.qty ?? '', price: r.price ?? '', date: r.date || '', note: r.note || '', createdAt: r.created_at || '' })
const tradeToRow = (x) => ({
  id: x.id, asset: x.asset || 'nifty', action: x.action || 'buy',
  term: x.action === 'buy' ? (x.term || 'long') : null,
  parent_id: x.parentId || null,
  qty: x.qty === '' || x.qty == null ? null : Number(x.qty),
  price: x.price === '' || x.price == null ? null : Number(x.price),
  date: x.date || null, note: x.note || null, created_at: x.createdAt || iso(),
})
export function useNgTrades() {
  const { data, loading, error, reload } = useCollection('ng_trades', [], { orderBy: 'created_at', ascending: true, map: rowToTrade })
  return { trades: data, loading, error, reload }
}
export const addNgTrade = (x) => insertRow('ng_trades', tradeToRow(x))
export const editNgTrade = (x) => updateRow('ng_trades', x.id, tradeToRow(x))
export const removeNgTrade = (id) => deleteRow('ng_trades', id)

// ---- Settings (single 'main' row) -----------------------------------------
export function useNgSettings() {
  const { data, loading, error, reload } = useCollection('ng_settings', [])
  const row = data.find((r) => r.id === 'main') || {}
  return { settings: { niftyPrice: row.nifty_price ?? '', goldPrice: row.gold_price ?? '' }, loading, error, reload }
}
export const saveNgSettings = (s) => upsertRow('ng_settings', {
  id: 'main',
  nifty_price: s.niftyPrice === '' || s.niftyPrice == null ? null : Number(s.niftyPrice),
  gold_price: s.goldPrice === '' || s.goldPrice == null ? null : Number(s.goldPrice),
  updated_at: iso(),
}, 'id')

/**
 * Per-buy-lot info across ALL assets: how much of each buy has been sold, the
 * realised P&L on it (specific-lot: sell − that lot's buy price), and remaining
 * qty. Returns { [buyId]: { soldQty, realised, remaining, sells:[{...,pnl}] } }.
 */
export function lotInfo(trades) {
  const buys = trades.filter((t) => t.action === 'buy')
  const byId = Object.fromEntries(buys.map((b) => [b.id, b]))
  const map = {}
  for (const b of buys) map[b.id] = { soldQty: 0, realised: 0, remaining: num(b.qty), sells: [] }
  for (const s of trades.filter((t) => t.action === 'sell')) {
    const buy = byId[s.parentId]; const m = map[s.parentId]
    if (!buy || !m) continue
    const q = num(s.qty); const pnl = q * (num(s.price) - num(buy.price))
    m.soldQty += q; m.realised += pnl; m.remaining = num(buy.qty) - m.soldQty
    m.sells.push({ ...s, pnl })
  }
  return map
}

/**
 * Holdings + P&L for one asset, split by term (specific-lot). Long-term =
 * accumulation (never sold); short-term = rotation (sold per lot).
 */
export function assetStats(asset, trades, currentPrice) {
  const ltp = num(currentPrice)
  const lots = lotInfo(trades)
  const buys = trades.filter((x) => x.asset === asset && x.action === 'buy')
  const long = { qty: 0, invested: 0, value: 0, unrealised: 0 }
  const short = { qty: 0, invested: 0, value: 0, unrealised: 0, realised: 0 }
  for (const b of buys) {
    const info = lots[b.id]
    const price = num(b.price)
    if ((b.term || 'long') !== 'short') {
      const q = num(b.qty)
      long.qty += q; long.invested += q * price; long.value += q * ltp; long.unrealised += q * (ltp - price)
    } else {
      const rem = Math.max(0, info.remaining)
      short.qty += rem; short.invested += rem * price; short.value += rem * ltp; short.unrealised += rem * (ltp - price)
      short.realised += info.realised
    }
  }
  long.avg = long.qty ? long.invested / long.qty : 0
  short.avg = short.qty ? short.invested / short.qty : 0
  return {
    long, short, ltp,
    holding: long.qty + short.qty,
    invested: long.invested + short.invested,
    value: long.value + short.value,
    unrealised: long.unrealised + short.unrealised,
    realised: short.realised,
  }
}

/** Quantity purchasable for capital at a unit price. */
export const qtyFor = (capital, unitPrice) => {
  const c = num(capital); const p = num(unitPrice)
  if (!c || !p) return { qty: 0, used: 0, leftover: c }
  const qty = Math.floor(c / p)
  const used = qty * p
  return { qty, used, leftover: c - used }
}
