import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * challengeRepo.js — the clean-trades challenge log (backend-only). One table
 * serves the 10 / 20 / 30-trade challenges via the `challenge` key.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? null : Number(v))

const rowToTrade = (r) => ({
  id: r.id, challenge: r.challenge || '10-clean', date: r.date || '', symbol: r.symbol || '', side: r.side || 'sell_ce',
  qty: r.qty ?? 65, entry: r.entry ?? '', sl: r.sl ?? '', target: r.target ?? '',
  marketRead: r.market_read || '', logic: r.logic || '', result: r.result || 'open', exit: r.exit ?? '', pnl: r.pnl ?? '',
  rules: r.rules || {}, note: r.note || '', sortOrder: r.sort_order ?? 0,
})
const tradeToRow = (x) => ({
  id: x.id, challenge: x.challenge || '10-clean', date: x.date || null, symbol: x.symbol || null, side: x.side || null,
  qty: num(x.qty), entry: num(x.entry), sl: num(x.sl), target: num(x.target),
  market_read: x.marketRead || null, logic: x.logic || null, result: x.result || 'open', exit: num(x.exit), pnl: num(x.pnl),
  rules: x.rules || {}, note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})

export function useChallengeTrades() {
  const { data, loading, error } = useCollection('challenge_trades', [], { orderBy: 'sort_order', ascending: true, map: rowToTrade })
  return { trades: data, loading, error }
}
export const addChallengeTrade = (x) => insertRow('challenge_trades', tradeToRow(x))
export const editChallengeTrade = (x) => updateRow('challenge_trades', x.id, tradeToRow(x))
export const removeChallengeTrade = (id) => deleteRow('challenge_trades', id)

// Rules for the clean-trades challenge (checked per trade).
export const CLEAN_RULES = [
  { id: 'dhan', text: 'Dhan account — Weekly Options SELLING only (no buying)' },
  { id: 'onelot', text: 'Only 1 lot (65 qty) — no averaging' },
  { id: 'presl', text: 'SL & Target defined BEFORE entry' },
  { id: 'maxsl', text: 'Max SL 50 pts (or indicator / swing level)' },
  { id: 'noadjust', text: 'No changing SL / Target after entry — only SL or Target hits' },
  { id: 'marketread', text: 'Market read set before the trade' },
]
export const isClean = (t) => CLEAN_RULES.every((r) => t.rules && t.rules[r.id])
export const RESULTS = [
  { value: 'open', label: 'Open' },
  { value: 'win', label: 'Target hit (win)' },
  { value: 'loss', label: 'SL hit (loss)' },
  { value: 'breakeven', label: 'Breakeven' },
]
export const SIDES = [
  { value: 'sell_ce', label: 'Sell CE' },
  { value: 'sell_pe', label: 'Sell PE' },
  { value: 'other', label: 'Other' },
]
