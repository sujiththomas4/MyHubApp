import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'

/**
 * swing50Repo.js — Swing 50 trading discipline machine. Config + buckets +
 * watchlist + trades (PLANNED→OPEN→CLOSED) + halt log + events. All P&L, risk,
 * exposure, equity and drawdown are DERIVED (never stored). Backend-only.
 */
const iso = () => new Date().toISOString()
export const rid = () => Math.random().toString(36).slice(2, 8)
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

export const EXIT_REASONS = [
  { value: 'TARGET', label: 'Target hit' },
  { value: 'STOP', label: 'Stop hit' },
  { value: 'TRAIL', label: 'Trailing stop' },
  { value: 'TIME', label: 'Time exit' },
  { value: 'EVENT', label: 'Event risk-off' },
  { value: 'CIRCUIT', label: 'Circuit breaker' },
]

// ---- Config (single 'main' row) -------------------------------------------
export function useSwingConfig() {
  const { data, loading, error, reload } = useCollection('swing50_config', [])
  const config = data.find((r) => r.id === 'main') || {}
  return { config, loading, error, reload }
}
export const saveSwingConfig = (patch) => upsertRow('swing50_config', { id: 'main', ...patch }, 'id')

// ---- Buckets --------------------------------------------------------------
export function useSwingBuckets() {
  const { data, loading, error, reload } = useCollection('swing50_buckets', [], { orderBy: 'display_order', ascending: true })
  return { buckets: data, loading, error, reload }
}
export const saveBucket = (b) => upsertRow('swing50_buckets', b, 'code')

// ---- Watchlist ------------------------------------------------------------
export function useSwingWatchlist() {
  const { data, loading, error, reload } = useCollection('swing50_watchlist', [], { orderBy: 'ticker', ascending: true })
  return { watchlist: data, loading, error, reload }
}
export const addWatch = (x) => insertRow('swing50_watchlist', { id: 'wl-' + rid(), ticker: (x.ticker || '').trim().toUpperCase(), name: x.name || '', bucket: x.bucket || 'B', sector: x.sector || '', active: x.active !== false })
export const editWatch = (id, patch) => updateRow('swing50_watchlist', id, patch)
export const removeWatch = (id) => deleteRow('swing50_watchlist', id)

// ---- Trades ---------------------------------------------------------------
export function useSwingTrades() {
  const { data, loading, error, reload } = useCollection('swing50_trades', [], { orderBy: 'created_at', ascending: false })
  return { trades: data, loading, error, reload }
}
export const addTrade = (x) => insertRow('swing50_trades', {
  id: 'sw-' + rid(), ticker: (x.ticker || '').trim().toUpperCase(), bucket: x.bucket || 'B', sector: x.sector || '',
  state: x.state || 'PLANNED', plan_entry: num(x.plan_entry), stop_price: num(x.stop_price), target_price: num(x.target_price),
  setup_reason: x.setup_reason || '', qty: num(x.qty), ltp: x.ltp == null || x.ltp === '' ? num(x.actual_entry ?? x.plan_entry) : num(x.ltp),
  actual_entry: x.actual_entry == null || x.actual_entry === '' ? null : num(x.actual_entry),
  entry_date: x.entry_date || null, created_at: iso(),
})
export const editTrade = (id, patch) => updateRow('swing50_trades', id, patch)
export const removeTrade = (id) => deleteRow('swing50_trades', id)

// ---- Halt log -------------------------------------------------------------
export function useHaltLog() {
  const { data, loading, error, reload } = useCollection('swing50_halt_log', [], { orderBy: 'halted_on', ascending: false })
  return { halts: data, loading, error, reload }
}
export const addHalt = (drawdownPct, on) => insertRow('swing50_halt_log', { id: 'ht-' + rid(), halted_on: on, drawdown_pct: num(drawdownPct) })
export const reactivateHalt = (id, note, on) => updateRow('swing50_halt_log', id, { review_note: note || null, reactivated_on: on })

// ---- Events ---------------------------------------------------------------
export function useSwingEvents() {
  const { data, loading, error, reload } = useCollection('swing50_events', [], { orderBy: 'event_date', ascending: true })
  return { events: data, loading, error, reload }
}
export const addEvent = (x) => insertRow('swing50_events', { id: 'ev-' + rid(), event_date: x.event_date, title: x.title || '', note: x.note || null })
export const removeEvent = (id) => deleteRow('swing50_events', id)

// ===========================================================================
// Pure calculations
// ===========================================================================

/** Capital figures derived from config. */
export function capitalOf(config) {
  const totalCapital = num(config.total_capital)
  const deployedCap = totalCapital * num(config.deploy_cap_pct)
  const goldSleeve = deployedCap * num(config.gold_sleeve_pct)
  return {
    totalCapital,
    deployedCap,
    reserve: totalCapital - deployedCap,
    riskPerTrade: deployedCap * num(config.risk_per_trade_pct),
    goldSleeve,
    swingDeployable: deployedCap - goldSleeve,
  }
}

/** Position size from the stop distance (risk is the input, size is the output). */
export function sizeTrade({ entry, stop, riskPerTrade, maxPositionValue }) {
  const e = num(entry); const s = num(stop)
  const riskPerShare = e - s
  if (riskPerShare <= 0) return { error: 'Stop must be below entry.' }
  let qty = Math.floor(riskPerTrade / riskPerShare)
  let posValue = qty * e
  let capped = false
  if (posValue > maxPositionValue && e > 0) { qty = Math.floor(maxPositionValue / e); posValue = qty * e; capped = true }
  return { riskPerShare, qty, posValue, rupeeRisk: qty * riskPerShare, capped }
}

export const rewardRisk = (entry, stop, target) => {
  const rps = num(entry) - num(stop)
  return rps > 0 ? (num(target) - num(entry)) / rps : 0
}

/** Live metrics for an OPEN trade at its LTP. */
export function openStats(t) {
  const entry = num(t.actual_entry ?? t.plan_entry)
  const ltp = num(t.ltp ?? entry) || entry
  const qty = num(t.qty)
  const risk = entry - num(t.stop_price)
  return {
    entry, ltp, qty,
    value: qty * ltp,
    cost: qty * entry,
    pnl: qty * (ltp - entry),
    openR: risk > 0 ? (ltp - entry) / risk : 0,
    rupeeRisk: qty * Math.max(0, risk),
  }
}

/** Journal metrics for a CLOSED trade. */
export function closedStats(t) {
  const entry = num(t.actual_entry ?? t.plan_entry)
  const exit = num(t.exit_price)
  const qty = num(t.qty)
  const risk = entry - num(t.stop_price)
  const days = t.entry_date && t.exit_date
    ? Math.max(0, Math.round((new Date(t.exit_date + 'T00:00:00') - new Date(t.entry_date + 'T00:00:00')) / 86400000))
    : null
  return { entry, exit, qty, pnl: qty * (exit - entry), r: risk > 0 ? (exit - entry) / risk : 0, days }
}

/** Journal aggregates: win rate, avg R, expectancy. */
export function journalAggregates(closed) {
  const stats = closed.map(closedStats)
  const n = stats.length
  if (!n) return { n: 0, winRate: 0, avgR: 0, expectancy: 0, realized: 0 }
  const wins = stats.filter((s) => s.pnl > 0)
  const losses = stats.filter((s) => s.pnl <= 0)
  const avg = (arr, f) => (arr.length ? arr.reduce((a, x) => a + f(x), 0) / arr.length : 0)
  const winRate = wins.length / n
  const avgWinR = avg(wins, (s) => s.r)
  const avgLossR = avg(losses, (s) => s.r)
  return {
    n, winRate,
    avgR: avg(stats, (s) => s.r),
    expectancy: winRate * avgWinR - (1 - winRate) * Math.abs(avgLossR),
    realized: stats.reduce((a, s) => a + s.pnl, 0),
  }
}

/**
 * Equity, drawdown and derived status. openTrades: state==='OPEN'.
 * equity = deployedCap + realized + Σ open unrealised.
 */
export function equityState(config, openTrades, realized) {
  const cap = capitalOf(config)
  const openUnreal = openTrades.reduce((s, t) => s + openStats(t).pnl, 0)
  const equity = cap.deployedCap + num(realized) + openUnreal
  const peak = Math.max(num(config.peak_equity), equity)
  const drawdown = peak > 0 && cap.deployedCap > 0 ? (peak - equity) / cap.deployedCap : 0
  const inHaltWindow = config.halted_until && new Date(config.halted_until + 'T00:00:00') >= new Date(new Date().toDateString())
  let status = 'ACTIVE'
  if (inHaltWindow || drawdown >= num(config.dd_halt_pct)) status = 'HALTED'
  else if (drawdown >= num(config.dd_caution_pct)) status = 'CAUTION'
  return { equity, peak, drawdown, status, openUnreal, inHaltWindow }
}

export const STATE_BADGE = {
  PLANNED: 'bg-info-subtle text-info',
  OPEN: 'bg-primary-subtle text-primary',
  CLOSED: 'bg-secondary-subtle text-secondary',
  CANCELLED: 'bg-light text-muted',
}
