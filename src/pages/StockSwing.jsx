import { useEffect, useMemo, useRef, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useSwingConfig, saveSwingConfig, useSwingBuckets,
  useSwingWatchlist, addWatch, editWatch, removeWatch,
  useSwingTrades, addTrade, editTrade, removeTrade,
  useHaltLog, addHalt, reactivateHalt,
  useSwingEvents, addEvent, removeEvent,
  capitalOf, sizeTrade, rewardRisk, openStats, closedStats, journalAggregates, equityState,
  EXIT_REASONS,
} from '@/data/swing50Repo'

/**
 * StockSwing.jsx — Swing 50 (route /business/swing). A rules-driven swing
 * trading discipline machine: 50% deploy cap, 1% risk/trade, bucket limits,
 * planned→open→closed lifecycle with R-multiples, and an 8% drawdown halt.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const todayISO = () => new Date().toISOString().slice(0, 10)
const pct = (v) => `${(v * 100).toFixed(1)}%`
const PnL = ({ v }) => <span className={(v >= 0 ? 'text-success' : 'text-danger') + ' fw-semibold'}>{v >= 0 ? '+' : ''}{money(Math.round(v), 'INR')}</span>
const RVal = ({ v }) => <span className={v >= 0 ? 'text-success' : 'text-danger'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}R</span>

// Weekend hold = Fri after 14:00 IST, or Sat/Sun.
function isWeekendHold() {
  const d = new Date(); const day = d.getDay()
  return day === 6 || day === 0 || (day === 5 && d.getHours() >= 14)
}

const Tile = ({ label, value, sub, subClass, icon, tone }) => (
  <div className="col-md-2 col-6">
    <div className="card stat-card h-100 mb-0"><div className="card-body">
      <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
      <h4 className="stat-value mt-3 mb-0">{value}</h4>
      {sub != null && <span className={'small ' + (subClass || 'text-muted')}>{sub}</span>}
    </div></div>
  </div>
)

export default function StockSwing() {
  const { config, reload: reloadConfig } = useSwingConfig()
  const { buckets } = useSwingBuckets()
  const { watchlist, reload: reloadWatch } = useSwingWatchlist()
  const { trades, reload: reloadTrades } = useSwingTrades()
  const { halts, reload: reloadHalts } = useHaltLog()
  const { events, reload: reloadEvents } = useSwingEvents()

  const [modal, setModal] = useState(null) // {kind, data}
  const [del, setDel] = useState(null)
  const haltRef = useRef(false)

  const cap = useMemo(() => capitalOf(config), [config])
  const open = useMemo(() => trades.filter((t) => t.state === 'OPEN'), [trades])
  const planned = useMemo(() => trades.filter((t) => t.state === 'PLANNED'), [trades])
  const closed = useMemo(() => trades.filter((t) => t.state === 'CLOSED'), [trades])
  const agg = useMemo(() => journalAggregates(closed), [closed])
  const eq = useMemo(() => equityState(config, open, agg.realized), [config, open, agg.realized])

  const openCostTotal = open.reduce((s, t) => s + openStats(t).cost, 0)
  const openPnl = open.reduce((s, t) => s + openStats(t).pnl, 0)
  const openRisk = open.reduce((s, t) => s + openStats(t).rupeeRisk, 0)
  const deployedPctOfCap = cap.deployedCap > 0 ? openCostTotal / cap.deployedCap : 0
  const weekendExposure = isWeekendHold() ? openCostTotal : 0

  // Keep peak_equity high-water mark and auto-HALT on 8% drawdown.
  useEffect(() => {
    if (!config.id) return
    if (eq.peak > num(config.peak_equity) + 0.5) { saveSwingConfig({ peak_equity: eq.peak }).then(reloadConfig).catch(() => {}) }
  }, [eq.peak, config.id, config.peak_equity, reloadConfig])
  useEffect(() => {
    if (!config.id || haltRef.current) return
    const halting = eq.drawdown >= num(config.dd_halt_pct) && !eq.inHaltWindow
    if (halting) {
      haltRef.current = true
      const until = new Date(); until.setDate(until.getDate() + num(config.halt_days))
      Promise.all([
        saveSwingConfig({ status: 'HALTED', halted_until: until.toISOString().slice(0, 10) }),
        addHalt(eq.drawdown, todayISO()),
      ]).then(() => Promise.all([reloadConfig(), reloadHalts()])).catch(() => {}).finally(() => { haltRef.current = false })
    }
  }, [eq.drawdown, eq.inHaltWindow, config.id, config.dd_halt_pct, config.halt_days, reloadConfig, reloadHalts])

  const statusMeta = { ACTIVE: { tone: 'success', label: 'ACTIVE' }, CAUTION: { tone: 'warning', label: 'CAUTION' }, HALTED: { tone: 'danger', label: 'HALTED' } }[eq.status]
  const openHalt = halts.find((h) => !h.reactivated_on)
  const canReactivate = eq.status === 'HALTED' && config.halted_until && new Date(config.halted_until + 'T00:00:00') < new Date(new Date().toDateString()) && openHalt

  // Validation for opening a position (money moves).
  const violationsFor = ({ bucket, sector, posValue, excludeId }) => {
    const others = open.filter((t) => t.id !== excludeId)
    const v = []
    if (eq.status === 'HALTED') v.push('Status is HALTED — no new entries.')
    if (others.length >= num(config.max_positions)) v.push(`Max ${config.max_positions} open positions reached.`)
    if (others.filter((t) => t.sector === sector).length + 1 > num(config.max_per_sector)) v.push(`Max ${config.max_per_sector} per sector (${sector || '—'}).`)
    if (bucket !== 'H') {
      const bmeta = buckets.find((b) => b.code === bucket)
      const bucketVal = others.filter((t) => t.bucket === bucket).reduce((s, t) => s + openStats(t).cost, 0)
      const limit = num(bmeta?.max_pct) * cap.deployedCap
      if (bucketVal + posValue > limit + 0.5) v.push(`Bucket ${bucket} limit ${money(limit, 'INR')} would be exceeded.`)
    }
    const openValTotal = others.reduce((s, t) => s + openStats(t).cost, 0)
    if (openValTotal + posValue > cap.swingDeployable + 0.5) v.push(`Deployed cap minus gold sleeve (${money(cap.swingDeployable, 'INR')}) would be exceeded.`)
    return v
  }

  const reloadAll = () => Promise.all([reloadTrades(), reloadConfig()])

  return (
    <div className="option-buying swing-50">
      <div className="page-title-box d-flex align-items-center flex-wrap gap-2">
        <div className="flex-grow-1">
          <h4 className="mb-0">Swing 50 <span className="badge bg-dark-subtle text-dark ms-2 align-middle">TRADING</span></h4>
          <small className="text-muted">Swing book — 50% deployed cap, bucket-diversified, risk-defined entries, 8% circuit breaker.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Swing 50</li>
          </ol>
        </nav>
      </div>

      {/* Rules banner */}
      <div className={`alert alert-${statusMeta.tone} border-0`} role="alert">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <i className="ri-shield-check-line fs-18" />
          <div className="flex-grow-1 small fw-semibold">Deploy max 50% · Risk max 1%/trade · Stop &amp; target before entry · Max 8 positions, 2/sector, bucket limits · Go light into weekends &amp; events · At 8% drawdown: HALT for {num(config.halt_days)} days.</div>
          <span className={`badge bg-${statusMeta.tone}`}>{statusMeta.label}</span>
        </div>
        <div className="d-flex flex-wrap gap-3 small mt-2">
          <span>Deployed: <strong>{pct(deployedPctOfCap)}</strong> of cap</span>
          <span>Open risk: <strong>{money(openRisk, 'INR')}</strong></span>
          <span>Drawdown: <strong className={eq.drawdown >= num(config.dd_caution_pct) ? 'text-danger' : ''}>{pct(eq.drawdown)}</strong> from peak</span>
          {weekendExposure > 0 && <span className="text-warning"><i className="ri-calendar-event-line me-1" />Weekend hold: {money(weekendExposure, 'INR')}</span>}
          {canReactivate && <button className="btn btn-sm btn-light ms-auto py-0" onClick={() => setModal({ kind: 'reactivate' })}><i className="ri-restart-line me-1" />Log review &amp; reactivate</button>}
        </div>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-3">
        <Tile label="Deployed" value={money(openCostTotal, 'INR')} sub={`of ${money(cap.deployedCap, 'INR')} cap`} icon="ri-wallet-3-line" tone="primary" />
        <Tile label="Reserve" value={money(cap.reserve, 'INR')} sub="liquid" icon="ri-safe-2-line" tone="info" />
        <Tile label="Open P&L" value={<PnL v={openPnl} />} icon="ri-line-chart-line" tone={openPnl >= 0 ? 'success' : 'danger'} />
        <Tile label="Realized P&L" value={<PnL v={agg.realized} />} icon="ri-check-double-line" tone={agg.realized >= 0 ? 'success' : 'danger'} />
        <Tile label="Win rate" value={agg.n ? pct(agg.winRate) : '—'} sub={`${agg.n} closed · exp ${agg.n ? agg.expectancy.toFixed(2) + 'R' : '—'}`} icon="ri-trophy-line" tone="warning" />
        <Tile label="Avg R" value={agg.n ? `${agg.avgR >= 0 ? '+' : ''}${agg.avgR.toFixed(2)}R` : '—'} sub={`equity ${money(eq.equity, 'INR')}`} icon="ri-scales-3-line" tone="secondary" />
      </div>

      {/* Bucket meters */}
      <div className="card mb-3">
        <div className="card-header py-2 d-flex align-items-center"><h6 className="card-title mb-0 flex-grow-1">Bucket exposure</h6><span className="text-muted small">of deployed cap {money(cap.deployedCap, 'INR')}</span></div>
        <div className="card-body">
          <div className="row g-3">
            {buckets.map((b) => {
              const used = open.filter((t) => t.bucket === b.code).reduce((s, t) => s + openStats(t).cost, 0)
              const goldUsed = b.code === 'H' ? cap.goldSleeve : used
              const val = b.code === 'H' ? goldUsed : used
              const limit = num(b.max_pct) * cap.deployedCap
              const ratio = limit > 0 ? Math.min(1, val / limit) : 0
              const over = val > limit + 0.5
              const tone = b.code === 'H' ? 'warning' : over ? 'danger' : ratio > 0.85 ? 'warning' : 'success'
              return (
                <div className="col-md-3 col-6" key={b.code}>
                  <div className="d-flex justify-content-between small mb-1"><span className="fw-semibold" title={b.name}>{b.code} · {b.name}</span></div>
                  <div className="progress" style={{ height: 18 }}><div className={`progress-bar bg-${tone}`} style={{ width: `${ratio * 100}%` }} /></div>
                  <div className="small text-muted mt-1">{money(val, 'INR')} / {money(limit, 'INR')} ({pct(num(b.max_pct))})</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className="btn btn-primary btn-sm" disabled={eq.status === 'HALTED'} onClick={() => setModal({ kind: 'new' })}><i className="ri-add-line me-1" />New Trade</button>
        <button className="btn btn-soft-secondary btn-sm" onClick={() => setModal({ kind: 'watchlist' })}><i className="ri-eye-line me-1" />Watchlist</button>
        <button className="btn btn-soft-secondary btn-sm" onClick={() => setModal({ kind: 'events' })}><i className="ri-calendar-event-line me-1" />Events</button>
        <button className="btn btn-soft-secondary btn-sm" onClick={() => setModal({ kind: 'settings' })}><i className="ri-settings-3-line me-1" />Settings</button>
      </div>

      {/* Open + planned positions */}
      <div className="card mb-3">
        <div className="card-header"><h5 className="card-title mb-0">Open positions</h5></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light"><tr><th>Stock</th><th>Bucket</th><th className="text-end">Qty</th><th className="text-end">Entry</th><th className="text-end">Stop</th><th className="text-end">Target</th><th className="text-end">LTP</th><th className="text-end">P&L</th><th className="text-end">Open R</th><th className="text-end">Days</th><th /></tr></thead>
              <tbody>
                {open.length === 0 && <tr><td colSpan={11} className="text-center text-muted py-4">No open positions.</td></tr>}
                {open.map((t) => {
                  const st = openStats(t)
                  const days = t.entry_date ? Math.max(0, Math.round((Date.now() - new Date(t.entry_date + 'T00:00:00')) / 86400000)) : 0
                  return (
                    <tr key={t.id}>
                      <td><div className="fw-semibold">{t.ticker} {isWeekendHold() && <span className="badge bg-warning-subtle text-warning ms-1">WEEKEND</span>}</div><div className="text-muted small">{t.sector}</div></td>
                      <td><span className="badge bg-light text-dark">{t.bucket}</span></td>
                      <td className="text-end">{t.qty}</td>
                      <td className="text-end">{money(st.entry, 'INR')}</td>
                      <td className="text-end">{money(num(t.stop_price), 'INR')}</td>
                      <td className="text-end">{money(num(t.target_price), 'INR')}</td>
                      <td className="text-end" style={{ minWidth: 110 }}><LtpInput trade={t} onSave={(v) => editTrade(t.id, { ltp: v }).then(reloadTrades)} /></td>
                      <td className="text-end"><PnL v={st.pnl} /></td>
                      <td className="text-end"><RVal v={st.openR} /></td>
                      <td className="text-end">{days}</td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-soft-primary px-2 me-1" title="Trail stop" onClick={() => setModal({ kind: 'stop', data: t })}><i className="ri-arrow-up-line" /></button>
                        <button className="btn btn-sm btn-soft-danger px-2 me-1" title="Close" onClick={() => setModal({ kind: 'close', data: t })}>Close</button>
                        <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(t)}><i className="ri-delete-bin-line" /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Planned trades */}
      {planned.length > 0 && (
        <div className="card mb-3">
          <div className="card-header"><h5 className="card-title mb-0">Planned <span className="text-muted small">(no money moved)</span></h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light"><tr><th>Stock</th><th>Bucket</th><th className="text-end">Qty</th><th className="text-end">Entry</th><th className="text-end">Stop</th><th className="text-end">Target</th><th className="text-end">R:R</th><th>Reason</th><th /></tr></thead>
                <tbody>
                  {planned.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.ticker}</td>
                      <td><span className="badge bg-light text-dark">{t.bucket}</span></td>
                      <td className="text-end">{t.qty}</td>
                      <td className="text-end">{money(num(t.plan_entry), 'INR')}</td>
                      <td className="text-end">{money(num(t.stop_price), 'INR')}</td>
                      <td className="text-end">{money(num(t.target_price), 'INR')}</td>
                      <td className="text-end">{rewardRisk(t.plan_entry, t.stop_price, t.target_price).toFixed(1)}</td>
                      <td className="text-muted small" style={{ maxWidth: 220, whiteSpace: 'normal' }}>{t.setup_reason}</td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-primary px-2 me-1" disabled={eq.status === 'HALTED'} title="Mark open" onClick={() => setModal({ kind: 'openfill', data: t })}>Open</button>
                        <button className="btn btn-sm btn-ghost-secondary px-2 me-1" title="Cancel" onClick={() => editTrade(t.id, { state: 'CANCELLED' }).then(reloadTrades)}><i className="ri-close-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(t)}><i className="ri-delete-bin-line" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Journal (closed) */}
      <div className="card mb-0">
        <div className="card-header d-flex align-items-center"><h5 className="card-title mb-0 flex-grow-1">Trade journal</h5>{agg.n > 0 && <span className="text-muted small">Win {pct(agg.winRate)} · Avg {agg.avgR.toFixed(2)}R · Expectancy {agg.expectancy.toFixed(2)}R</span>}</div>
        <div className="card-body p-0">
          {closed.length === 0 ? <p className="text-muted text-center py-4 mb-0">No closed trades yet.</p> : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light"><tr><th>Stock</th><th>Bucket</th><th className="text-end">Entry</th><th className="text-end">Exit</th><th className="text-end">Qty</th><th className="text-end">P&L</th><th className="text-end">R</th><th className="text-end">Days</th><th>Reason</th><th>Lesson</th><th /></tr></thead>
                <tbody>
                  {closed.map((t) => {
                    const st = closedStats(t)
                    return (
                      <tr key={t.id}>
                        <td className="fw-semibold">{t.ticker}</td>
                        <td><span className="badge bg-light text-dark">{t.bucket}</span></td>
                        <td className="text-end">{money(st.entry, 'INR')}</td>
                        <td className="text-end">{money(st.exit, 'INR')}</td>
                        <td className="text-end">{st.qty}</td>
                        <td className="text-end"><PnL v={st.pnl} /></td>
                        <td className="text-end"><RVal v={st.r} /></td>
                        <td className="text-end">{st.days ?? '—'}</td>
                        <td className="small">{EXIT_REASONS.find((r) => r.value === t.exit_reason)?.label || t.exit_reason || '—'}</td>
                        <td className="text-muted small" style={{ maxWidth: 200, whiteSpace: 'normal' }}>{t.lesson || '—'}</td>
                        <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(t)}><i className="ri-delete-bin-line" /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.kind === 'new' && <NewTradeModal cap={cap} config={config} buckets={buckets} watchlist={watchlist} events={events} status={eq.status} violationsFor={violationsFor}
        onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadTrades() }} />}
      {modal?.kind === 'openfill' && <OpenFillModal trade={modal.data} violationsFor={violationsFor} config={config} cap={cap} status={eq.status}
        onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadTrades() }} />}
      {modal?.kind === 'stop' && <StopModal trade={modal.data} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadTrades() }} />}
      {modal?.kind === 'close' && <CloseModal trade={modal.data} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadAll() }} />}
      {modal?.kind === 'watchlist' && <WatchlistModal watchlist={watchlist} buckets={buckets} onClose={() => setModal(null)} reload={reloadWatch} />}
      {modal?.kind === 'events' && <EventsModal events={events} onClose={() => setModal(null)} reload={reloadEvents} />}
      {modal?.kind === 'settings' && <SettingsModal config={config} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadConfig() }} />}
      {modal?.kind === 'reactivate' && <ReactivateModal halt={openHalt} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await Promise.all([reloadConfig(), reloadHalts()]) }} />}

      <ConfirmDialog open={!!del} title="Delete trade?" message={del ? `${del.ticker} will be permanently removed from the book.` : ''} confirmLabel="Delete" tone="danger"
        onConfirm={async () => { const t = del; setDel(null); await removeTrade(t.id); await reloadTrades() }} onCancel={() => setDel(null)} />
    </div>
  )
}

// --- Inline LTP editor ------------------------------------------------------
function LtpInput({ trade, onSave }) {
  const [v, setV] = useState(trade.ltp ?? trade.actual_entry ?? trade.plan_entry ?? '')
  useEffect(() => { setV(trade.ltp ?? trade.actual_entry ?? trade.plan_entry ?? '') }, [trade.ltp, trade.actual_entry, trade.plan_entry])
  return (
    <input type="number" className="form-control form-control-sm text-end" value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (num(v) !== num(trade.ltp)) onSave(num(v)) }} />
  )
}

// --- New Trade (calculator) -------------------------------------------------
function NewTradeModal({ cap, config, buckets, watchlist, events, status, violationsFor, onClose, onSaved }) {
  const [f, setF] = useState({ ticker: '', sector: '', bucket: 'B', entry: '', stop: '', target: '', reason: '' })
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const pickWatch = (id) => {
    const w = watchlist.find((x) => x.id === id)
    if (w) setF((s) => ({ ...s, ticker: w.ticker, sector: w.sector, bucket: w.bucket }))
  }

  const size = useMemo(() => sizeTrade({ entry: f.entry, stop: f.stop, riskPerTrade: cap.riskPerTrade, maxPositionValue: num(config.max_position_value) }), [f.entry, f.stop, cap.riskPerTrade, config.max_position_value])
  const rr = rewardRisk(f.entry, f.stop, f.target)
  const posValue = size.error ? 0 : size.posValue
  const violations = size.error ? [] : violationsFor({ bucket: f.bucket, sector: f.sector, posValue, excludeId: null })
  // Event within 1 day of today.
  const soonEvent = events.find((e) => { const d = (new Date(e.event_date + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000; return d >= 0 && d <= 1 })

  const build = () => ({
    ticker: f.ticker, sector: f.sector, bucket: f.bucket, plan_entry: num(f.entry), stop_price: num(f.stop),
    target_price: num(f.target), setup_reason: f.reason.trim(), qty: size.qty || 0,
  })
  const validateBase = () => {
    if (!f.ticker.trim()) return 'Stock is required.'
    if (!f.reason.trim()) return 'Setup reason is mandatory — write why this trade.'
    if (size.error) return size.error
    if (!size.qty) return 'Quantity works out to 0 — check entry/stop or position cap.'
    if (num(f.target) <= num(f.entry)) return 'Target must be above entry.'
    return null
  }
  const savePlanned = async () => {
    const e = validateBase(); if (e) { setErr(e); return }
    setErr(null); setSaving(true)
    try { await addTrade({ ...build(), state: 'PLANNED' }); await onSaved() } catch (ex) { setErr(ex.message); setSaving(false) }
  }
  const saveOpen = async () => {
    const e = validateBase(); if (e) { setErr(e); return }
    if (violations.length) { setErr(violations[0]); return }
    setErr(null); setSaving(true)
    try { await addTrade({ ...build(), state: 'OPEN', actual_entry: num(f.entry), entry_date: todayISO(), ltp: num(f.entry) }); await onSaved() } catch (ex) { setErr(ex.message); setSaving(false) }
  }

  return (
    <Modal open size="lg" title={<><i className="ri-add-circle-line me-2 text-primary" />New Trade</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-md-5"><label className="form-label small mb-1">From watchlist</label>
          <select className="form-select" defaultValue="" onChange={(e) => pickWatch(e.target.value)}>
            <option value="">— pick / or type below —</option>
            {watchlist.filter((w) => w.active !== false).map((w) => <option key={w.id} value={w.id}>{w.ticker} · {w.bucket} · {w.sector}</option>)}
          </select>
        </div>
        <div className="col-md-3"><label className="form-label small mb-1">Ticker</label><input className="form-control text-uppercase" value={f.ticker} onChange={(e) => set('ticker', e.target.value)} /></div>
        <div className="col-md-2"><label className="form-label small mb-1">Bucket</label><select className="form-select" value={f.bucket} onChange={(e) => set('bucket', e.target.value)}>{buckets.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}</select></div>
        <div className="col-md-2"><label className="form-label small mb-1">Sector</label><input className="form-control" value={f.sector} onChange={(e) => set('sector', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Entry price</label><input type="number" className="form-control" value={f.entry} onChange={(e) => set('entry', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Stop price</label><input type="number" className="form-control" value={f.stop} onChange={(e) => set('stop', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Target price</label><input type="number" className="form-control" value={f.target} onChange={(e) => set('target', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Setup reason <span className="text-danger">*</span> — why this trade</label><textarea className="form-control" rows={2} value={f.reason} onChange={(e) => set('reason', e.target.value)} /></div>
      </div>

      {/* Calculator output */}
      <div className="row g-2 mt-2 text-center">
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Quantity</div><h5 className="mb-0 text-primary">{size.error ? '—' : size.qty}</h5></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Position value</div><div className="fw-semibold mt-1">{size.error ? '—' : money(size.posValue, 'INR')}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Rupee risk</div><div className="fw-semibold mt-1">{size.error ? '—' : money(size.rupeeRisk, 'INR')}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Reward:Risk</div><div className={'fw-semibold mt-1 ' + (rr && rr < 1.5 ? 'text-warning' : '')}>{rr ? rr.toFixed(2) : '—'}</div></div></div>
      </div>

      {size.capped && <div className="alert alert-info py-2 mt-2 mb-0"><i className="ri-information-line me-1" />Capped at max position value {money(num(config.max_position_value), 'INR')} — actual risk drops below 1%.</div>}
      {rr > 0 && rr < 1.5 && <div className="alert alert-warning py-2 mt-2 mb-0"><i className="ri-alert-line me-1" />Reward:risk below 1.5 — thin edge.</div>}
      {soonEvent && <div className="alert alert-warning py-2 mt-2 mb-0"><i className="ri-calendar-event-line me-1" />Event within 1 day: <strong>{soonEvent.title}</strong> ({soonEvent.event_date}). Consider sizing down.</div>}
      {violations.length > 0 && <div className="alert alert-danger py-2 mt-2 mb-0"><i className="ri-close-circle-line me-1" />{violations.map((v, i) => <div key={i}>{v}</div>)}</div>}
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-soft-secondary" onClick={savePlanned} disabled={saving}><i className="ri-draft-line me-1" />Save as planned</button>
        <button className="btn btn-primary" onClick={saveOpen} disabled={saving || status === 'HALTED' || violations.length > 0}><i className="ri-check-line me-1" />Mark open</button>
      </div>
    </Modal>
  )
}

// --- Open a planned trade (actual fill) -------------------------------------
function OpenFillModal({ trade, violationsFor, cap, config, status, onClose, onSaved }) {
  const [entry, setEntry] = useState(String(num(trade.plan_entry)))
  const [date, setDate] = useState(todayISO())
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const size = sizeTrade({ entry, stop: trade.stop_price, riskPerTrade: cap.riskPerTrade, maxPositionValue: num(config.max_position_value) })
  const posValue = size.error ? 0 : size.posValue
  const violations = size.error ? [size.error] : violationsFor({ bucket: trade.bucket, sector: trade.sector, posValue, excludeId: trade.id })

  const save = async () => {
    if (status === 'HALTED') { setErr('Status is HALTED — cannot open.'); return }
    if (size.error) { setErr(size.error); return }
    if (violations.length) { setErr(violations[0]); return }
    setErr(null); setSaving(true)
    try { await editTrade(trade.id, { state: 'OPEN', actual_entry: num(entry), entry_date: date, qty: size.qty, ltp: num(entry) }); await onSaved() } catch (e) { setErr(e.message); setSaving(false) }
  }
  return (
    <Modal open title={<><i className="ri-play-circle-line me-2 text-primary" />Open {trade.ticker}</>} onClose={onClose}>
      <div className="border rounded p-2 mb-3 bg-light small">Plan: entry {money(num(trade.plan_entry), 'INR')} · stop {money(num(trade.stop_price), 'INR')} · target {money(num(trade.target_price), 'INR')}</div>
      <div className="row g-2">
        <div className="col-6"><label className="form-label small mb-1">Actual entry</label><input type="number" className="form-control" value={entry} onChange={(e) => setEntry(e.target.value)} autoFocus /></div>
        <div className="col-6"><label className="form-label small mb-1">Entry date</label><input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div className="mt-2 small text-muted">Qty {size.error ? '—' : size.qty} · value {size.error ? '—' : money(size.posValue, 'INR')} · risk {size.error ? '—' : money(size.rupeeRisk, 'INR')}{size.capped ? ' (capped)' : ''}</div>
      {violations.length > 0 && <div className="alert alert-danger py-2 mt-2 mb-0">{violations.map((v, i) => <div key={i}>{v}</div>)}</div>}
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || violations.length > 0}><i className="ri-check-line me-1" />Open position</button>
      </div>
    </Modal>
  )
}

// --- Trail stop (one-way) ---------------------------------------------------
function StopModal({ trade, onClose, onSaved }) {
  const [stop, setStop] = useState(String(num(trade.stop_price)))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const s = num(stop)
    if (s < num(trade.stop_price)) { setErr('Stops move one way — a stop can only move up (toward profit).'); return }
    if (s >= num(trade.actual_entry ?? trade.plan_entry)) { /* allowed: locking profit above entry */ }
    setErr(null); setSaving(true)
    try { await editTrade(trade.id, { stop_price: s }); await onSaved() } catch (e) { setErr(e.message); setSaving(false) }
  }
  return (
    <Modal open title={<><i className="ri-arrow-up-line me-2 text-primary" />Trail stop — {trade.ticker}</>} onClose={onClose}>
      <p className="text-muted small">Current stop {money(num(trade.stop_price), 'INR')}. Stops move one way — you can only raise it.</p>
      <label className="form-label small mb-1">New stop</label>
      <input type="number" className="form-control" value={stop} onChange={(e) => setStop(e.target.value)} autoFocus />
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-check-line me-1" />Move stop</button>
      </div>
    </Modal>
  )
}

// --- Close trade ------------------------------------------------------------
function CloseModal({ trade, onClose, onSaved }) {
  const [f, setF] = useState({ price: String(num(trade.ltp ?? trade.actual_entry ?? trade.plan_entry)), date: todayISO(), reason: 'TARGET', lesson: '' })
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const entry = num(trade.actual_entry ?? trade.plan_entry)
  const pnl = num(trade.qty) * (num(f.price) - entry)
  const r = entry - num(trade.stop_price) > 0 ? (num(f.price) - entry) / (entry - num(trade.stop_price)) : 0
  const save = async () => {
    if (!f.price) { setErr('Enter an exit price.'); return }
    setErr(null); setSaving(true)
    try { await editTrade(trade.id, { state: 'CLOSED', exit_price: num(f.price), exit_date: f.date, exit_reason: f.reason, lesson: f.lesson.trim() || null }); await onSaved() } catch (e) { setErr(e.message); setSaving(false) }
  }
  return (
    <Modal open title={<><i className="ri-flag-line me-2 text-danger" />Close {trade.ticker}</>} onClose={onClose}>
      <div className="border rounded p-2 mb-3 bg-light small">Entry {money(entry, 'INR')} · stop {money(num(trade.stop_price), 'INR')} · qty {trade.qty}</div>
      <div className="row g-2">
        <div className="col-6"><label className="form-label small mb-1">Exit price</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} autoFocus /></div>
        <div className="col-6"><label className="form-label small mb-1">Exit date</label><input type="date" className="form-control" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Exit reason</label><select className="form-select" value={f.reason} onChange={(e) => set('reason', e.target.value)}>{EXIT_REASONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
        <div className="col-12"><label className="form-label small mb-1">Lesson — what did I learn?</label><textarea className="form-control" rows={2} value={f.lesson} onChange={(e) => set('lesson', e.target.value)} /></div>
      </div>
      <div className="mt-2">Result: <PnL v={pnl} /> · <RVal v={r} /></div>
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" onClick={save} disabled={saving}><i className="ri-check-line me-1" />Close trade</button>
      </div>
    </Modal>
  )
}

// --- Watchlist manager ------------------------------------------------------
function WatchlistModal({ watchlist, buckets, onClose, reload }) {
  const [f, setF] = useState({ ticker: '', name: '', bucket: 'B', sector: '' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const add = async () => { if (!f.ticker.trim()) return; await addWatch(f); setF({ ticker: '', name: '', bucket: 'B', sector: '' }); await reload() }
  return (
    <Modal open size="lg" title={<><i className="ri-eye-line me-2 text-primary" />Watchlist</>} onClose={onClose}>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-2"><label className="form-label small mb-1">Ticker</label><input className="form-control form-control-sm text-uppercase" value={f.ticker} onChange={(e) => set('ticker', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Name</label><input className="form-control form-control-sm" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="col-md-2"><label className="form-label small mb-1">Bucket</label><select className="form-select form-select-sm" value={f.bucket} onChange={(e) => set('bucket', e.target.value)}>{buckets.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}</select></div>
        <div className="col-md-3"><label className="form-label small mb-1">Sector</label><input className="form-control form-control-sm" value={f.sector} onChange={(e) => set('sector', e.target.value)} /></div>
        <div className="col-md-1"><button className="btn btn-primary btn-sm w-100" onClick={add}><i className="ri-add-line" /></button></div>
      </div>
      <div className="table-responsive" style={{ maxHeight: 360 }}>
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light"><tr><th>Ticker</th><th>Name</th><th>Bucket</th><th>Sector</th><th /></tr></thead>
          <tbody>
            {watchlist.map((w) => (
              <tr key={w.id}>
                <td className="fw-semibold">{w.ticker}</td>
                <td className="small">{w.name}</td>
                <td><select className="form-select form-select-sm" style={{ width: 70 }} value={w.bucket} onChange={(e) => editWatch(w.id, { bucket: e.target.value }).then(reload)}>{buckets.map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}</select></td>
                <td className="small">{w.sector}</td>
                <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-1" onClick={() => removeWatch(w.id).then(reload)}><i className="ri-delete-bin-line" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// --- Events manager ---------------------------------------------------------
function EventsModal({ events, onClose, reload }) {
  const [f, setF] = useState({ event_date: todayISO(), title: '', note: '' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const add = async () => { if (!f.title.trim()) return; await addEvent(f); setF({ event_date: todayISO(), title: '', note: '' }); await reload() }
  return (
    <Modal open title={<><i className="ri-calendar-event-line me-2 text-primary" />Events</>} onClose={onClose}>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-4"><label className="form-label small mb-1">Date</label><input type="date" className="form-control form-control-sm" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} /></div>
        <div className="col-6"><label className="form-label small mb-1">Event</label><input className="form-control form-control-sm" placeholder="Fed minutes, CPI, expiry…" value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
        <div className="col-2"><button className="btn btn-primary btn-sm w-100" onClick={add}><i className="ri-add-line" /></button></div>
        <div className="col-12"><input className="form-control form-control-sm" placeholder="Note (optional)" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
      </div>
      <ul className="list-group list-group-flush">
        {events.length === 0 && <li className="list-group-item text-muted text-center">No events.</li>}
        {events.map((e) => (
          <li key={e.id} className="list-group-item d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark">{e.event_date}</span>
            <span className="flex-grow-1"><strong>{e.title}</strong>{e.note ? <span className="text-muted small ms-2">{e.note}</span> : null}</span>
            <button className="btn btn-sm btn-ghost-danger px-1" onClick={() => removeEvent(e.id).then(reload)}><i className="ri-delete-bin-line" /></button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

// --- Settings ---------------------------------------------------------------
const SETTINGS_FIELDS = [
  { key: 'total_capital', label: 'Total capital (₹)', step: 1 },
  { key: 'deploy_cap_pct', label: 'Deploy cap (fraction, e.g. 0.5)', step: 0.01 },
  { key: 'risk_per_trade_pct', label: 'Risk per trade (fraction of deployed)', step: 0.001 },
  { key: 'max_positions', label: 'Max positions', step: 1 },
  { key: 'max_position_value', label: 'Max position value (₹)', step: 1 },
  { key: 'max_per_sector', label: 'Max per sector', step: 1 },
  { key: 'dd_caution_pct', label: 'Drawdown caution (fraction)', step: 0.01 },
  { key: 'dd_halt_pct', label: 'Drawdown halt (fraction)', step: 0.01 },
  { key: 'halt_days', label: 'Halt cooling-off (days)', step: 1 },
  { key: 'gold_sleeve_pct', label: 'Gold sleeve (fraction of deployed)', step: 0.01 },
]
function SettingsModal({ config, onClose, onSaved }) {
  const [f, setF] = useState(() => Object.fromEntries(SETTINGS_FIELDS.map((x) => [x.key, config[x.key] ?? ''])))
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const raisingCap = num(f.deploy_cap_pct) > num(config.deploy_cap_pct)
  const save = async () => {
    if (raisingCap && confirmPhrase.trim().toUpperCase() !== 'DEPLOY MORE') { setErr('Raising the deploy cap needs the phrase "DEPLOY MORE" — the reserve is a decision, not a slider.'); return }
    setErr(null); setSaving(true)
    try { await saveSwingConfig(Object.fromEntries(SETTINGS_FIELDS.map((x) => [x.key, num(f[x.key])]))); await onSaved() } catch (e) { setErr(e.message); setSaving(false) }
  }
  return (
    <Modal open size="lg" title={<><i className="ri-settings-3-line me-2 text-primary" />Capital &amp; rules</>} onClose={onClose}>
      <div className="row g-2">
        {SETTINGS_FIELDS.map((x) => (
          <div className="col-md-6" key={x.key}><label className="form-label small mb-1">{x.label}</label>
            <input type="number" step={x.step} className="form-control form-control-sm" value={f[x.key]} onChange={(e) => setF((s) => ({ ...s, [x.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      {raisingCap && <div className="mt-3"><div className="alert alert-warning py-2"><i className="ri-alert-line me-1" />You are raising the deploy cap. Type <strong>DEPLOY MORE</strong> to confirm.</div><input className="form-control" value={confirmPhrase} onChange={(e) => setConfirmPhrase(e.target.value)} placeholder="DEPLOY MORE" /></div>}
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />Save</button>
      </div>
    </Modal>
  )
}

// --- Reactivate after halt --------------------------------------------------
function ReactivateModal({ halt, onClose, onSaved }) {
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!note.trim()) { setErr('A review note is mandatory before reactivating.'); return }
    setErr(null); setSaving(true)
    try {
      if (halt) await reactivateHalt(halt.id, note.trim(), todayISO())
      await saveSwingConfig({ status: 'ACTIVE', halted_until: null })
      await onSaved()
    } catch (e) { setErr(e.message); setSaving(false) }
  }
  return (
    <Modal open title={<><i className="ri-restart-line me-2 text-success" />Review &amp; reactivate</>} onClose={onClose}>
      <p className="text-muted small">The cooling-off period is over. Write what you learned from the drawdown before trading resumes.</p>
      <textarea className="form-control" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What went wrong, what changes now…" autoFocus />
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving}><i className="ri-check-line me-1" />Reactivate</button>
      </div>
    </Modal>
  )
}
