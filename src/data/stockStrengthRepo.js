import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

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
