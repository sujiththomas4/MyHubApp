import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'
import { lotInfo } from './ngRepo'

/**
 * eeNgRepo.js — Eva & Ezaak "Nifty–Gold Ratio (Short Term)" rotation. A
 * separate copy of the business Nifty–Gold data; every buy is a short-term
 * rotation lot that gets sold. Holdings / P&L derived (specific-lot).
 * Backend-only. Shares the pure `lotInfo` helper with ngRepo.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

// ---- Trades ---------------------------------------------------------------
const rowToTrade = (r) => ({ id: r.id, asset: r.asset || 'nifty', action: r.action || 'buy', parentId: r.parent_id || '', qty: r.qty ?? '', price: r.price ?? '', date: r.date || '', note: r.note || '', createdAt: r.created_at || '' })
const tradeToRow = (x) => ({
  id: x.id, asset: x.asset || 'nifty', action: x.action || 'buy', parent_id: x.parentId || null,
  qty: x.qty === '' || x.qty == null ? null : Number(x.qty),
  price: x.price === '' || x.price == null ? null : Number(x.price),
  date: x.date || null, note: x.note || null, created_at: x.createdAt || iso(),
})
export function useEeNgTrades() {
  const { data, loading, error, reload } = useCollection('ee_ng_trades', [], { orderBy: 'created_at', ascending: true, map: rowToTrade })
  return { trades: data, loading, error, reload }
}
export const addEeNgTrade = (x) => insertRow('ee_ng_trades', tradeToRow(x))
export const editEeNgTrade = (x) => updateRow('ee_ng_trades', x.id, tradeToRow(x))
export const removeEeNgTrade = (id) => deleteRow('ee_ng_trades', id)

// ---- Settings (single 'main' row) -----------------------------------------
export function useEeNgSettings() {
  const { data, loading, error, reload } = useCollection('ee_ng_settings', [])
  const row = data.find((r) => r.id === 'main') || {}
  return { settings: { niftyPrice: row.nifty_price ?? '', goldPrice: row.gold_price ?? '' }, loading, error, reload }
}
export const saveEeNgSettings = (s) => upsertRow('ee_ng_settings', {
  id: 'main',
  nifty_price: s.niftyPrice === '' || s.niftyPrice == null ? null : Number(s.niftyPrice),
  gold_price: s.goldPrice === '' || s.goldPrice == null ? null : Number(s.goldPrice),
  updated_at: iso(),
}, 'id')

/** Holdings + P&L for one asset (all short-term rotation, specific-lot). */
export function eeAssetStats(asset, trades, currentPrice) {
  const ltp = num(currentPrice)
  const lots = lotInfo(trades)
  const buys = trades.filter((x) => x.asset === asset && x.action === 'buy')
  let qty = 0, invested = 0, value = 0, unrealised = 0, realised = 0
  for (const b of buys) {
    const info = lots[b.id] || { remaining: num(b.qty), realised: 0 }
    const rem = Math.max(0, info.remaining); const price = num(b.price)
    qty += rem; invested += rem * price; value += rem * ltp; unrealised += rem * (ltp - price); realised += info.realised
  }
  return { qty, avg: qty ? invested / qty : 0, invested, value, unrealised, realised, ltp, holding: qty }
}
