import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { useFocusStocks } from './focus25Repo'
import { useSwing1hTrades } from './swing1hRepo'
import { useStockHoldings } from './stockRepo'
import { pushLtpToBooks } from './masterLtp'

/**
 * stockStrengthRepo.js — watch-table of stocks with observations (trend,
 * strength, bias, rating, notes). Backend-only.
 */
const iso = () => new Date().toISOString()

const rowToStock = (r) => ({
  id: r.id,
  symbol: r.symbol || '',
  name: r.name || '',
  sector: r.sector || '',
  bucket: r.bucket || '',
  rationale: r.rationale || '',
  fundamentallyStrong: r.fundamentally_strong === true,
  ltp: r.ltp ?? '',
  ltpUpdatedAt: r.ltp_updated_at || '',
  trend: r.trend || '',
  strength: r.strength || '',
  bias: r.bias || '',
  rating: r.rating ?? '',
  observation: r.observation || '',
  updatedDate: r.updated_date || '',
  sortOrder: r.sort_order ?? 0,
})
const stockToRow = (x) => ({
  id: x.id,
  symbol: (x.symbol || '').trim(),
  name: x.name || null,
  sector: x.sector || null,
  bucket: x.bucket || null,
  rationale: x.rationale || null,
  fundamentally_strong: x.fundamentallyStrong === true,
  ltp: x.ltp === '' || x.ltp == null ? null : Number(x.ltp),
  trend: x.trend || null,
  strength: x.strength || null,
  bias: x.bias || null,
  rating: x.rating === '' || x.rating == null ? null : Number(x.rating),
  observation: x.observation || null,
  updated_date: x.updatedDate || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function useStockStrength() {
  const { data, loading, error, reload } = useCollection('stock_strength', [], { orderBy: 'symbol', ascending: true, map: rowToStock })
  return { stocks: data, loading, error, reload }
}
export const addStock = (x) => insertRow('stock_strength', stockToRow(x))
export const editStock = (x) => updateRow('stock_strength', x.id, stockToRow(x))
export const removeStock = (id) => deleteRow('stock_strength', id)

/**
 * Batch LTP write on the master list, then push each price down into the books
 * so Swing Weekly, EMA Support and Focus 25 value positions at the same price.
 */
export const saveMasterLtps = async (entries) => {
  await Promise.all(entries.map(({ id, ltp }) => updateRow('stock_strength', id, { ltp: Number(ltp) || 0, ltp_updated_at: iso() })))
  await pushLtpToBooks(entries)
}

/**
 * The macro buckets: A escalation, B oil-neutral, C de-escalation, H hedge.
 * This table is the master universe — Swing Weekly picks its stocks from here.
 */
export const BUCKET_OPTIONS = [
  { value: 'A', label: 'A — Escalation beneficiaries', short: 'A', tone: 'danger' },
  { value: 'B', label: 'B — Oil-neutral / rupee winners', short: 'B', tone: 'primary' },
  { value: 'C', label: 'C — De-escalation plays', short: 'C', tone: 'info' },
  { value: 'H', label: 'H — Gold hedge sleeve', short: 'H', tone: 'warning' },
]
export const BUCKET = Object.fromEntries(BUCKET_OPTIONS.map((o) => [o.value, o]))

export const TREND_OPTIONS = [
  { value: 'up', label: 'Uptrend', tone: 'success' },
  { value: 'side', label: 'Sideways', tone: 'secondary' },
  { value: 'down', label: 'Downtrend', tone: 'danger' },
]
export const STRENGTH_OPTIONS = [
  { value: 'strong', label: 'Strong', tone: 'success' },
  { value: 'moderate', label: 'Moderate', tone: 'warning' },
  { value: 'weak', label: 'Weak', tone: 'danger' },
]
export const BIAS_OPTIONS = [
  { value: 'bullish', label: 'Bullish', tone: 'success' },
  { value: 'neutral', label: 'Neutral', tone: 'secondary' },
  { value: 'bearish', label: 'Bearish', tone: 'danger' },
]
export const TREND = Object.fromEntries(TREND_OPTIONS.map((o) => [o.value, o]))
export const STRENGTH = Object.fromEntries(STRENGTH_OPTIONS.map((o) => [o.value, o]))
export const BIAS = Object.fromEntries(BIAS_OPTIONS.map((o) => [o.value, o]))

// ---- Holdings across the app -----------------------------------------------
const norm = (v) => (v || '').trim().toUpperCase()

/**
 * Where a stock is actually held, gathered from every screen that owns shares.
 *
 * Matching is on exact symbol, so a source only counts when it stores a ticker.
 * stock_holdings stores a company name ("Infosys"), not a symbol, so it is
 * matched against the strength row's NAME as well — exact, never fuzzy, since
 * a loose match would happily confuse ITC with ITC Hotels.
 */
export function useHoldingsBySymbol() {
  const { stocks: focus } = useFocusStocks()
  const { trades: swingWeekly } = useSwing1hTrades()
  const holdings = useStockHoldings()

  /** key -> [{ source, qty }] for one stock row. */
  const forStock = (row) => {
    const sym = norm(row.symbol)
    const nm = norm(row.name)
    const out = []
    const push = (source, qty) => { if (qty > 0) out.push({ source, qty }) }

    push('Focus 25', focus.filter((f) => norm(f.symbol) === sym && f.active !== false)
      .reduce((s, f) => s + (Number(f.qty) || 0), 0))
    push('Swing Weekly', swingWeekly.filter((t) => t.state === 'OPEN' && norm(t.symbol) === sym)
      .reduce((s, t) => s + (Number(t.qty) || 0), 0))
    push('Portfolio', holdings.filter((h) => {
      const hn = norm(h.name)
      return hn === sym || (nm && hn === nm)
    }).reduce((s, h) => s + (Number(h.qty) || 0), 0))

    return { lines: out, qty: out.reduce((s, x) => s + x.qty, 0), holders: out.length }
  }
  return { forStock }
}
