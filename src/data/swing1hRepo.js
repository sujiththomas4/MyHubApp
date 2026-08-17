import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'

/**
 * swing1hRepo.js — Swing 1 Hour. A discretionary book for opportunities found
 * on the 1-hour chart. Deliberately ungated: no entry checklist, no stop rules,
 * no portfolio caps — you decide, the screen records.
 *
 * ATR(14) on the 1-hour chart is captured on every trade for one reason: so the
 * screen can show afterwards which stop distances actually worked. Nothing here
 * blocks a trade because of ATR; it only reports.
 */
const iso = () => new Date().toISOString()
export const rid = () => Math.random().toString(36).slice(2, 8)
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const orNull = (v) => (v === '' || v == null ? null : Number(v))

/** Soft target — shown and flagged, never enforced. */
export const TARGET_RR = 1.5

export const EXIT_REASONS = [
  { value: 'TARGET', label: 'Target hit' },
  { value: 'STOP', label: 'Stop hit' },
  { value: 'TRAIL', label: 'Trailing stop' },
  { value: 'TIME', label: 'Time exit' },
  { value: 'MANUAL', label: 'Manual / changed mind' },
]

// ---- Config: the amount deployed per trade ---------------------------------
export const DEFAULT_DEPLOY = 100000
export function useSwing1hConfig() {
  const { data, loading, error, reload } = useCollection('swing1h_config', [])
  const config = data.find((r) => r.id === 'main') || {}
  return { config, deployAmount: num(config.deploy_amount) || DEFAULT_DEPLOY, loading, error, reload }
}
export const saveDeployAmount = (amount) => upsertRow('swing1h_config', { id: 'main', deploy_amount: num(amount) }, 'id')

/**
 * Capital-based sizing: how many shares a given rupee amount buys.
 * Whole shares only, so the deployed value lands at or under the amount.
 */
export function sizeFromAmount(amount, entry) {
  const a = num(amount); const e = num(entry)
  if (a <= 0 || e <= 0) return { qty: 0, deployed: 0, leftover: 0 }
  const qty = Math.floor(a / e)
  const deployed = qty * e
  return { qty, deployed, leftover: a - deployed }
}

export function useSwing1hTrades() {
  const { data, loading, error, reload } = useCollection('swing1h_trades', [], { orderBy: 'created_at', ascending: false })
  return { trades: data, loading, error, reload }
}

export const addTrade1h = (x) => insertRow('swing1h_trades', {
  id: 's1h-' + rid(),
  symbol: (x.symbol || '').trim().toUpperCase(),
  bucket: x.bucket || null,
  sector: x.sector || null,
  state: 'OPEN',
  entry: num(x.entry),
  stop_price: num(x.stop),
  target_price: orNull(x.target),
  atr: orNull(x.atr),
  qty: num(x.qty),
  ltp: x.ltp === '' || x.ltp == null ? num(x.entry) : num(x.ltp),
  entry_at: x.entryAt || iso(),
  note: x.note || null,
  created_at: iso(),
})
export const editTrade1h = (id, patch) => updateRow('swing1h_trades', id, patch)
export const removeTrade1h = (id) => deleteRow('swing1h_trades', id)
/** Batch LTP write — one call per changed row, then a single reload. */
export const saveLtps1h = (entries) => Promise.all(entries.map(({ id, ltp }) => updateRow('swing1h_trades', id, { ltp: num(ltp) })))

// ===========================================================================
// Pure calculations
// ===========================================================================

export const rewardRisk = (entry, stop, target) => {
  const risk = num(entry) - num(stop)
  return risk > 0 && num(target) > 0 ? (num(target) - num(entry)) / risk : 0
}

/**
 * Both ATR readings that matter on a 1-hour chart:
 *   stopMult   — is the stop outside the hourly noise?
 *   targetMult — how many hourly ranges must price travel to pay me?
 * A target 6+ ATRs away is a multi-day move, not a 1-hour idea.
 */
export function atrView({ entry, stop, target, atr }) {
  const a = num(atr)
  if (a <= 0) return null
  const risk = num(entry) - num(stop)
  const reward = num(target) > 0 ? num(target) - num(entry) : 0
  return {
    atr: a,
    stopMult: risk > 0 ? risk / a : 0,
    targetMult: reward > 0 ? reward / a : 0,
    atrPct: num(entry) > 0 ? a / num(entry) : 0,
  }
}

export function openStats1h(t) {
  const entry = num(t.entry)
  const ltp = num(t.ltp) || entry
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

export function closedStats1h(t) {
  const entry = num(t.entry)
  const exit = num(t.exit_price)
  const qty = num(t.qty)
  const risk = entry - num(t.stop_price)
  const hours = t.entry_at && t.exit_at
    ? Math.max(0, (new Date(t.exit_at) - new Date(t.entry_at)) / 3600000)
    : null
  return { entry, exit, qty, pnl: qty * (exit - entry), r: risk > 0 ? (exit - entry) / risk : 0, hours }
}

export function aggregates1h(closed) {
  const stats = closed.map(closedStats1h)
  const n = stats.length
  if (!n) return { n: 0, winRate: 0, avgR: 0, realized: 0, avgHours: 0 }
  const wins = stats.filter((s) => s.pnl > 0)
  const withHours = stats.filter((s) => s.hours != null)
  return {
    n,
    winRate: wins.length / n,
    avgR: stats.reduce((a, s) => a + s.r, 0) / n,
    realized: stats.reduce((a, s) => a + s.pnl, 0),
    avgHours: withHours.length ? withHours.reduce((a, s) => a + s.hours, 0) / withHours.length : 0,
  }
}

// ---- "Is ATR helping?" -----------------------------------------------------
/** Stop-distance bands, in multiples of the 1-hour ATR. */
export const ATR_BANDS = [
  { key: 'tight', label: 'Under 1.0x', min: 0, max: 1, hint: 'inside the hourly candle' },
  { key: 'snug', label: '1.0 - 1.5x', min: 1, max: 1.5 },
  { key: 'mid', label: '1.5 - 2.5x', min: 1.5, max: 2.5 },
  { key: 'wide', label: '2.5 - 4.0x', min: 2.5, max: 4 },
  { key: 'xwide', label: 'Over 4.0x', min: 4, max: Infinity, hint: 'multi-session risk' },
]

/**
 * Group closed trades by how far the stop sat from entry in ATRs, and score
 * each band. This is the whole argument for recording ATR: it turns "my stop
 * felt about right" into a number you can be wrong about.
 */
export function atrBandPerformance(closed) {
  const rows = ATR_BANDS.map((b) => ({ ...b, trades: [], n: 0, wins: 0, winRate: 0, avgR: 0, pnl: 0 }))
  const noAtr = []
  closed.forEach((t) => {
    const v = atrView({ entry: t.entry, stop: t.stop_price, target: t.target_price, atr: t.atr })
    if (!v || v.stopMult <= 0) { noAtr.push(t); return }
    const band = rows.find((b) => v.stopMult >= b.min && v.stopMult < b.max)
    if (band) band.trades.push(t)
  })
  rows.forEach((b) => {
    const stats = b.trades.map(closedStats1h)
    b.n = stats.length
    b.wins = stats.filter((s) => s.pnl > 0).length
    b.winRate = b.n ? b.wins / b.n : 0
    b.avgR = b.n ? stats.reduce((a, s) => a + s.r, 0) / b.n : 0
    b.pnl = stats.reduce((a, s) => a + s.pnl, 0)
  })
  const scored = rows.filter((b) => b.n > 0)
  const best = scored.length ? scored.reduce((a, b) => (b.avgR > a.avgR ? b : a)) : null
  const worst = scored.length ? scored.reduce((a, b) => (b.avgR < a.avgR ? b : a)) : null
  return { rows, noAtr: noAtr.length, best, worst, scored: scored.length, total: closed.length - noAtr.length }
}

/**
 * How often a stop was hit, split by whether it sat inside the hourly noise.
 * The clearest single readout of what ATR buys you.
 */
export function noiseStopRate(closed) {
  let tightN = 0; let tightStopped = 0; let roomyN = 0; let roomyStopped = 0
  closed.forEach((t) => {
    const v = atrView({ entry: t.entry, stop: t.stop_price, target: t.target_price, atr: t.atr })
    if (!v || v.stopMult <= 0) return
    const stopped = t.exit_reason === 'STOP'
    if (v.stopMult < 1.5) { tightN += 1; if (stopped) tightStopped += 1 }
    else { roomyN += 1; if (stopped) roomyStopped += 1 }
  })
  return {
    tightN, roomyN,
    tightRate: tightN ? tightStopped / tightN : 0,
    roomyRate: roomyN ? roomyStopped / roomyN : 0,
    ready: tightN >= 3 && roomyN >= 3,
  }
}

export const STATE_BADGE = {
  OPEN: 'bg-primary-subtle text-primary',
  CLOSED: 'bg-secondary-subtle text-secondary',
}
