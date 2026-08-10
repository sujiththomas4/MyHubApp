import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * swingRepo.js — Stock Swing Trading: positions + trades. Realised / unrealised
 * P&L is derived from executed trades and the position's current price
 * (average-cost method). Backend-only.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

// ---- Positions ------------------------------------------------------------
const rowToPos = (r) => ({
  id: r.id, symbol: r.symbol || '', name: r.name || '',
  currentPrice: r.current_price ?? '', note: r.note || '', sortOrder: r.sort_order ?? 0,
})
const posToRow = (x) => ({
  id: x.id, symbol: (x.symbol || '').trim().toUpperCase(), name: x.name || null,
  current_price: x.currentPrice === '' || x.currentPrice == null ? null : Number(x.currentPrice),
  note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function useSwingPositions() {
  const { data, loading, error, reload } = useCollection('swing_positions', [], { orderBy: 'sort_order', ascending: true, map: rowToPos })
  return { positions: data, loading, error, reload }
}
export const addSwingPosition = (x) => insertRow('swing_positions', posToRow(x))
export const editSwingPosition = (x) => updateRow('swing_positions', x.id, posToRow(x))
export const removeSwingPosition = (id) => deleteRow('swing_positions', id)

// ---- Trades ---------------------------------------------------------------
const rowToTrade = (r) => ({
  id: r.id, positionId: r.position_id, kind: r.kind || 'buy', qty: r.qty ?? '', price: r.price ?? '',
  orderType: r.order_type || 'market', status: r.status || 'executed', date: r.date || '', note: r.note || '', createdAt: r.created_at || '',
})
const tradeToRow = (x) => ({
  id: x.id, position_id: x.positionId, kind: x.kind || 'buy',
  qty: x.qty === '' || x.qty == null ? null : Number(x.qty),
  price: x.price === '' || x.price == null ? null : Number(x.price),
  order_type: x.orderType || 'market', status: x.status || 'executed', date: x.date || null, note: x.note || null,
  created_at: x.createdAt || iso(),
})
export function useSwingTrades() {
  const { data, loading, error, reload } = useCollection('swing_trades', [], { orderBy: 'created_at', ascending: true, map: rowToTrade })
  return { trades: data, loading, error, reload }
}
export const addSwingTrade = (x) => insertRow('swing_trades', tradeToRow(x))
export const editSwingTrade = (x) => updateRow('swing_trades', x.id, tradeToRow(x))
export const removeSwingTrade = (id) => deleteRow('swing_trades', id)

/** Derived metrics for a position from its trades + current price. */
export function positionStats(pos, allTrades) {
  const trades = allTrades.filter((t) => t.positionId === pos.id)
  const execBuys = trades.filter((t) => t.kind === 'buy' && t.status === 'executed')
  const sells = trades.filter((t) => t.kind === 'sell' && t.status === 'executed')
  const pendingBuys = trades.filter((t) => t.kind === 'buy' && t.status === 'pending')

  const boughtQty = execBuys.reduce((s, t) => s + num(t.qty), 0)
  const buyCost = execBuys.reduce((s, t) => s + num(t.qty) * num(t.price), 0)
  const avgBuy = boughtQty ? buyCost / boughtQty : 0
  const soldQty = sells.reduce((s, t) => s + num(t.qty), 0)
  const sellProceeds = sells.reduce((s, t) => s + num(t.qty) * num(t.price), 0)
  const openQty = boughtQty - soldQty
  const realised = sellProceeds - soldQty * avgBuy
  const invested = Math.max(0, openQty) * avgBuy
  const ltp = num(pos.currentPrice)
  const unrealised = openQty > 0 && ltp ? openQty * (ltp - avgBuy) : 0
  const currentValue = openQty > 0 ? openQty * ltp : 0
  const status = boughtQty === 0 ? (pendingBuys.length ? 'pending' : 'empty') : (openQty > 0 ? 'open' : 'closed')

  return { trades, execBuys, sells, pendingBuys, boughtQty, buyCost, avgBuy, soldQty, sellProceeds, openQty, realised, invested, ltp, unrealised, currentValue, status }
}

export const SWING_STATUS_BADGE = {
  pending: 'bg-warning-subtle text-dark',
  open: 'bg-primary-subtle text-primary',
  closed: 'bg-secondary-subtle text-secondary',
  empty: 'bg-light text-muted',
}
export const SWING_STATUS_LABEL = { pending: 'Pending', open: 'Open', closed: 'Closed', empty: '—' }
