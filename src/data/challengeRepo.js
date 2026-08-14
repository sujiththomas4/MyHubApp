import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * challengeRepo.js — the clean-trades challenge log (backend-only). One table
 * serves the 10 / 20 / 30-trade challenges via the `challenge` key.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? null : Number(v))

const rowToTrade = (r) => ({
  id: r.id, challenge: r.challenge || '10-clean', date: r.date || '', symbol: r.symbol || '', side: r.side || 'ce',
  dir: r.dir || 'sell', stage: r.stage || 'planned', setupType: r.setup_type || '', entryTrigger: r.entry_trigger || '',
  qty: r.qty ?? 65, entry: r.entry ?? '', plannedEntry: r.planned_entry ?? '', sl: r.sl ?? '', target: r.target ?? '',
  marketRead: r.market_read || '', logic: r.logic || '', result: r.result || 'open', exit: r.exit ?? '', pnl: r.pnl ?? '',
  rules: r.rules || {}, note: r.note || '', sortOrder: r.sort_order ?? 0,
  createdAt: r.created_at || '', activatedAt: r.activated_at || '',
})
const tradeToRow = (x) => ({
  id: x.id, challenge: x.challenge || '10-clean', date: x.date || null, symbol: x.symbol || null, side: x.side || null,
  dir: x.dir || 'sell', stage: x.stage || 'planned', setup_type: x.setupType || null, entry_trigger: x.entryTrigger || null,
  qty: num(x.qty), entry: num(x.entry), planned_entry: num(x.plannedEntry), sl: num(x.sl), target: num(x.target),
  market_read: x.marketRead || null, logic: x.logic || null, result: x.result || 'open', exit: num(x.exit), pnl: num(x.pnl),
  rules: x.rules || {}, note: x.note || null, sort_order: x.sortOrder ?? 0,
  activated_at: x.activatedAt || null, updated_at: iso(),
})

export function useChallengeTrades() {
  const { data, loading, error } = useCollection('challenge_trades', [], { orderBy: 'sort_order', ascending: true, map: rowToTrade })
  return { trades: data, loading, error }
}
// created_at is set on insert only — never overwritten on edits (needed for the
// "planned ahead of execution" rule).
export const addChallengeTrade = (x) => insertRow('challenge_trades', { ...tradeToRow(x), created_at: iso() })
export const editChallengeTrade = (x) => updateRow('challenge_trades', x.id, tradeToRow(x))
export const removeChallengeTrade = (id) => deleteRow('challenge_trades', id)

// Rules for the clean-trades challenge. `auto` rules are evaluated from the trade
// data; rules without `auto` are manual checkboxes.
export const PLAN_LEAD_MS = 2 * 60 * 1000 // trade must be planned ≥ 2 min before activation
export const CLEAN_RULES = [
  { id: 'onelot', text: 'Only 1 lot (max 65 qty) — no averaging', auto: (t) => { const q = Number(t.qty); return q > 0 && q <= 65 } },
  { id: 'presl', text: 'SL & Target defined before entry', auto: (t) => t.sl !== '' && t.sl != null && t.target !== '' && t.target != null },
  { id: 'planahead', text: 'Planned ≥ 2 min before execution (no unplanned trades)', auto: (t) => { if (!t.createdAt || !t.activatedAt) return true; return (new Date(t.activatedAt).getTime() - new Date(t.createdAt).getTime()) >= PLAN_LEAD_MS } },
  { id: 'noadjust', text: 'No changing SL / Target after entry — only SL or Target hits' },
]
// Evaluate a single rule for a trade (auto if defined, else the manual flag).
export const ruleOk = (t, r) => (r.auto ? r.auto(t) : !!(t.rules && t.rules[r.id]))
export const isClean = (t) => CLEAN_RULES.every((r) => ruleOk(t, r))

export const DIRECTIONS = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
]
export const SETUP_TYPES = [
  { value: 'support', label: 'Support', tone: 'success' },
  { value: 'resistance', label: 'Resistance', tone: 'danger' },
]
export const SETUP_MAP = Object.fromEntries(SETUP_TYPES.map((s) => [s.value, s]))
export const ENTRY_TRIGGERS = [
  { value: 'zone', label: 'Price enters the zone' },
  { value: 'confirmation', label: 'Price enters + confirmation' },
]
export const ENTRY_TRIGGER_MAP = Object.fromEntries(ENTRY_TRIGGERS.map((e) => [e.value, e]))
export const STAGES = [
  { value: 'planned', label: 'Planned', tone: 'secondary' },
  { value: 'active', label: 'Active', tone: 'primary' },
  { value: 'closed', label: 'Closed', tone: 'dark' },
]
export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.value, s]))
// Points are direction-aware: for a Buy, profit is above entry; for a Sell, below.
const n = (v) => (v === '' || v == null ? null : Number(v))
export const slPoints = (t) => { const e = n(t.entry); const s = n(t.sl); if (e == null || s == null) return null; return t.dir === 'buy' ? e - s : s - e }
export const targetPoints = (t) => { const e = n(t.entry); const g = n(t.target); if (e == null || g == null) return null; return t.dir === 'buy' ? g - e : e - g }
export const capturedPoints = (t) => { const e = n(t.entry); const x = n(t.exit); if (e == null || x == null) return null; return t.dir === 'buy' ? x - e : e - x }
// Points the actual entry drifted from the planned entry (slippage / decay).
export const ENTRY_DRIFT_LIMIT = 10
export const entryDeviation = (t) => { const p = n(t.plannedEntry); const e = n(t.entry); if (p == null || e == null) return null; return Math.abs(e - p) }
export const RESULTS = [
  { value: 'open', label: 'Open' },
  { value: 'win', label: 'Target hit (win)' },
  { value: 'loss', label: 'SL hit (loss)' },
  { value: 'breakeven', label: 'Breakeven' },
]
export const SIDES = [
  { value: 'ce', label: 'CE' },
  { value: 'pe', label: 'PE' },
]
