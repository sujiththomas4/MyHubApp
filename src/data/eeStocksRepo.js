import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * eeStocksRepo.js — Eva & Ezaak top-stocks portfolio. Positions (ee_stocks) +
 * buy/sell trades (ee_trades). Average-cost derived metrics. Backend-only.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

export const EE_CATEGORIES = [
  { key: 'large', label: 'Large Cap', tone: 'primary', icon: 'ri-building-4-line' },
  { key: 'mid', label: 'Mid Cap', tone: 'info', icon: 'ri-building-2-line' },
  { key: 'small', label: 'Small Cap', tone: 'warning', icon: 'ri-store-2-line' },
]

// ---- Stocks ---------------------------------------------------------------
const rowToStock = (r) => ({ id: r.id, category: r.category || 'large', name: r.name || '', symbol: r.symbol || '', currentPrice: r.current_price ?? '', note: r.note || '', sortOrder: r.sort_order ?? 0 })
const stockToRow = (x) => ({
  id: x.id, category: x.category || 'large', name: x.name || null, symbol: (x.symbol || '').trim().toUpperCase() || null,
  current_price: x.currentPrice === '' || x.currentPrice == null ? null : Number(x.currentPrice),
  note: x.note || null, sort_order: x.sortOrder ?? 0,
})
export function useEeStocks() {
  const { data, loading, error, reload } = useCollection('ee_stocks', [], { orderBy: 'sort_order', ascending: true, map: rowToStock })
  return { stocks: data, loading, error, reload }
}
export const addEeStock = (x) => insertRow('ee_stocks', { ...stockToRow(x), created_at: iso() })
export const editEeStock = (x) => updateRow('ee_stocks', x.id, stockToRow(x))
export const removeEeStock = (id) => deleteRow('ee_stocks', id)

// ---- Trades ---------------------------------------------------------------
const rowToTrade = (r) => ({ id: r.id, stockId: r.stock_id, kind: r.kind || 'buy', qty: r.qty ?? '', price: r.price ?? '', date: r.date || '', createdAt: r.created_at || '' })
const tradeToRow = (x) => ({ id: x.id, stock_id: x.stockId, kind: x.kind || 'buy', qty: x.qty === '' || x.qty == null ? null : Number(x.qty), price: x.price === '' || x.price == null ? null : Number(x.price), date: x.date || null, created_at: x.createdAt || iso() })
export function useEeTrades() {
  const { data, loading, error, reload } = useCollection('ee_trades', [], { orderBy: 'created_at', ascending: true, map: rowToTrade })
  return { trades: data, loading, error, reload }
}
export const addEeTrade = (x) => insertRow('ee_trades', tradeToRow(x))
export const removeEeTrade = (id) => deleteRow('ee_trades', id)

/** Derived metrics for a stock from its trades + current price (average-cost). */
export function stockStats(stock, allTrades) {
  const t = allTrades.filter((x) => x.stockId === stock.id)
  const buys = t.filter((x) => x.kind === 'buy')
  const sells = t.filter((x) => x.kind === 'sell')
  const boughtQty = buys.reduce((s, x) => s + num(x.qty), 0)
  const buyCost = buys.reduce((s, x) => s + num(x.qty) * num(x.price), 0)
  const avgPrice = boughtQty ? buyCost / boughtQty : 0
  const soldQty = sells.reduce((s, x) => s + num(x.qty), 0)
  const sellProceeds = sells.reduce((s, x) => s + num(x.qty) * num(x.price), 0)
  const quantity = boughtQty - soldQty
  const invested = Math.max(0, quantity) * avgPrice
  const ltp = num(stock.currentPrice)
  const total = quantity > 0 ? quantity * ltp : 0
  const realised = sellProceeds - soldQty * avgPrice
  const unrealised = quantity > 0 && ltp ? quantity * (ltp - avgPrice) : 0
  const pnl = unrealised + realised
  const base = invested > 0 ? invested : buyCost
  const pnlPct = base ? (pnl / base) * 100 : 0
  return { boughtQty, avgPrice, soldQty, quantity, invested, ltp, total, realised, unrealised, pnl, pnlPct }
}
