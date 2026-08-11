import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * myTradesRepo.js — "My Trades" observation log. Backend-only.
 */
const iso = () => new Date().toISOString()

const rowTo = (r) => ({
  id: r.id,
  obsDate: r.obs_date || '',
  obsTime: r.obs_time || '',
  bias: r.bias || '',
  vix: r.vix || '',
  crude: r.crude || '',
  observation: r.observation || '',
  obsImage: r.obs_image || '',
  resultImage: r.result_image || '',
  justification: r.justification || '',
  keyTakeaway: r.key_takeaway || '',
  createdAt: r.created_at || '',
})
const toRow = (x) => ({
  id: x.id,
  obs_date: x.obsDate || null,
  obs_time: x.obsTime || null,
  bias: x.bias || null,
  vix: x.vix || null,
  crude: x.crude || null,
  observation: x.observation || null,
  obs_image: x.obsImage || null,
  result_image: x.resultImage || null,
  justification: x.justification || null,
  key_takeaway: x.keyTakeaway || null,
  updated_at: iso(),
})

export function useMyTrades() {
  const { data, loading, error, reload } = useCollection('my_trades', [], { orderBy: 'obs_date', ascending: false, map: rowTo })
  return { trades: data, loading, error, reload }
}
export const addMyTrade = (x) => insertRow('my_trades', { ...toRow(x), created_at: iso() })
export const editMyTrade = (x) => updateRow('my_trades', x.id, toRow(x))
export const removeMyTrade = (id) => deleteRow('my_trades', id)

// BIAS / VIX / CRUDE overall outlook.
export const OUTLOOK = [
  { value: 'bearish', label: 'Bearish', short: 'Bearish', tone: 'danger' },
  { value: 'sw_neg', label: 'Sideways — but negative from previous day', short: 'Sideways −', tone: 'warning' },
  { value: 'sw_pos', label: 'Sideways — but positive from previous day', short: 'Sideways +', tone: 'info' },
  { value: 'bullish', label: 'Bullish', short: 'Bullish', tone: 'success' },
]
export const OUTLOOK_MAP = Object.fromEntries(OUTLOOK.map((o) => [o.value, o]))
