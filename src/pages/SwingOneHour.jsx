import { useEffect, useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useStockStrength, BUCKET_OPTIONS, BUCKET } from '@/data/stockStrengthRepo'
import {
  useSwing1hTrades, addTrade1h, editTrade1h, removeTrade1h, saveLtps1h,
  useSwing1hConfig, saveDeployAmount, sizeFromAmount,
  rewardRisk, atrView, openStats1h, closedStats1h, aggregates1h,
  atrBandPerformance, noiseStopRate, ATR_BANDS,
  EXIT_REASONS, TARGET_RR,
} from '@/data/swing1hRepo'

/**
 * SwingOneHour.jsx — Swing 1 Hour (route /business/swing-1h). Opportunities
 * found on the 1-hour chart, recorded without rules: no entry checklist, no
 * stop gate, no portfolio caps. The one thing it insists on is ATR(14) on the
 * 1-hour chart, so the ATR panel can show which stop distances actually paid.
 *
 * Stocks are picked from Stock Strength, which is the master universe — adding
 * a stock there does not touch the Swing 50 watchlist.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const pct = (v) => `${(v * 100).toFixed(0)}%`
const nowLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const fmtWhen = (ts) => (ts ? new Date(ts).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
const hoursLabel = (h) => (h == null ? '—' : h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`)

const PnL = ({ v }) => <span className={v > 0 ? 'text-success fw-semibold' : v < 0 ? 'text-danger fw-semibold' : 'text-muted'}>{money(v, 'INR')}</span>
const RVal = ({ v }) => <span className={v > 0 ? 'text-success' : v < 0 ? 'text-danger' : 'text-muted'}>{v.toFixed(2)}R</span>

const Tile = ({ label, value, sub, icon, tone = 'primary', valueClass = '' }) => (
  <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
    <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
    <h4 className={'stat-value mt-3 mb-0 ' + valueClass}>{value}</h4>
    {sub && <span className="text-muted small">{sub}</span>}
  </div></div></div>
)

export default function SwingOneHour() {
  const { trades, reload } = useSwing1hTrades()
  const { stocks } = useStockStrength()
  const { deployAmount, reload: reloadConfig } = useSwing1hConfig()
  const [modal, setModal] = useState(null)
  const [del, setDel] = useState(null)
  const [ltpDraft, setLtpDraft] = useState(null)
  const [ltpSaving, setLtpSaving] = useState(false)

  const open = useMemo(() => trades.filter((t) => t.state === 'OPEN'), [trades])
  const closed = useMemo(() => trades.filter((t) => t.state === 'CLOSED'), [trades])
  const agg = useMemo(() => aggregates1h(closed), [closed])
  const openPnl = open.reduce((s, t) => s + openStats1h(t).pnl, 0)
  const openCost = open.reduce((s, t) => s + openStats1h(t).cost, 0)

  // Batched LTP editing — nothing hits the network until Save.
  const startLtpEdit = () => setLtpDraft(Object.fromEntries(open.map((t) => [t.id, String(t.ltp ?? t.entry ?? '')])))
  const changedLtps = ltpDraft
    ? open.filter((t) => ltpDraft[t.id] !== undefined && num(ltpDraft[t.id]) !== num(t.ltp)).map((t) => ({ id: t.id, ltp: ltpDraft[t.id] }))
    : []
  const saveLtpEdits = async () => {
    if (!changedLtps.length) { setLtpDraft(null); return }
    setLtpSaving(true)
    try { await saveLtps1h(changedLtps); await reload(); setLtpDraft(null) } finally { setLtpSaving(false) }
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Swing 1 Hour</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Swing 1 Hour</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3 mb-3">
        <Tile label="Open positions" value={open.length} sub={money(openCost, 'INR') + ' deployed'} icon="ri-briefcase-line" />
        <Tile label="Open P&L" value={money(openPnl, 'INR')} icon="ri-line-chart-line" tone={openPnl >= 0 ? 'success' : 'danger'} valueClass={openPnl > 0 ? 'text-success' : openPnl < 0 ? 'text-danger' : ''} />
        <Tile label="Realised" value={money(agg.realized, 'INR')} sub={`${agg.n} closed · avg ${hoursLabel(agg.avgHours || null)}`} icon="ri-check-double-line" tone="info" valueClass={agg.realized > 0 ? 'text-success' : agg.realized < 0 ? 'text-danger' : ''} />
        <Tile label="Win rate" value={agg.n ? pct(agg.winRate) : '—'} sub={agg.n ? `avg ${agg.avgR.toFixed(2)}R` : 'no closed trades'} icon="ri-medal-line" tone="warning" />
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ kind: 'new' })}><i className="ri-add-line me-1" />Add position</button>
        <span className="text-muted small align-self-center ms-1">
          <i className="ri-information-line me-1" />No rules here — target {TARGET_RR}R is a nudge, not a gate.
        </span>
      </div>

      {/* Open positions */}
      <div className="card mb-3">
        <div className="card-header d-flex align-items-center gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Open positions</h5>
          {ltpDraft ? (
            <>
              <span className="text-muted small">{changedLtps.length} changed</span>
              <button className="btn btn-sm btn-light" onClick={() => setLtpDraft(null)} disabled={ltpSaving}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={saveLtpEdits} disabled={ltpSaving}><i className="ri-save-line me-1" />{ltpSaving ? 'Saving…' : 'Save LTPs'}</button>
            </>
          ) : (
            <button className="btn btn-sm btn-soft-primary" onClick={startLtpEdit} disabled={open.length === 0}><i className="ri-pencil-line me-1" />Update LTP</button>
          )}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light"><tr>
                <th>Stock</th><th className="text-end">Qty</th><th className="text-end">Entry</th><th className="text-end">Stop</th><th className="text-end">Target</th>
                <th className="text-center">ATR view</th><th className="text-end">LTP</th><th className="text-end">P&L</th><th className="text-end">Open R</th><th className="text-end">Held</th><th />
              </tr></thead>
              <tbody>
                {open.length === 0 && <tr><td colSpan={11} className="text-center text-muted py-4">No open positions.</td></tr>}
                {open.map((t) => {
                  const st = openStats1h(t)
                  const v = atrView({ entry: t.entry, stop: t.stop_price, target: t.target_price, atr: t.atr })
                  const held = t.entry_at ? (Date.now() - new Date(t.entry_at)) / 3600000 : null
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="fw-semibold">{t.symbol} {t.bucket && <span className={`badge bg-${(BUCKET[t.bucket] || {}).tone || 'secondary'}-subtle text-${(BUCKET[t.bucket] || {}).tone || 'secondary'} ms-1`}>{t.bucket}</span>}</div>
                        <div className="text-muted small">{t.sector || '—'}</div>
                      </td>
                      <td className="text-end">{t.qty}</td>
                      <td className="text-end">{money(st.entry, 'INR')}</td>
                      <td className="text-end">{money(num(t.stop_price), 'INR')}</td>
                      <td className="text-end">{t.target_price ? money(num(t.target_price), 'INR') : '—'}</td>
                      <td className="text-center small">
                        {v ? (
                          <>
                            <div className={v.stopMult < 1 ? 'text-warning' : 'text-muted'}>stop {v.stopMult.toFixed(1)}×</div>
                            {v.targetMult > 0 && <div className="text-muted">target {v.targetMult.toFixed(1)}×</div>}
                          </>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-end" style={{ minWidth: 110 }}>
                        {ltpDraft ? (
                          <input type="number" className="form-control form-control-sm text-end" value={ltpDraft[t.id] ?? ''}
                            onChange={(e) => setLtpDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveLtpEdits(); if (e.key === 'Escape') setLtpDraft(null) }} />
                        ) : money(st.ltp, 'INR')}
                      </td>
                      <td className="text-end"><PnL v={st.pnl} /></td>
                      <td className="text-end"><RVal v={st.openR} /></td>
                      <td className="text-end text-muted small">{hoursLabel(held)}</td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-soft-danger px-2 me-1" onClick={() => setModal({ kind: 'close', data: t })}>Close</button>
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

      <AtrPanel closed={closed} />

      {/* Journal */}
      <div className="card mb-3">
        <div className="card-header"><h5 className="card-title mb-0">Journal <span className="text-muted fs-13 fw-normal">({closed.length} closed)</span></h5></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light"><tr>
                <th>Stock</th><th className="text-end">Qty</th><th className="text-end">Entry</th><th className="text-end">Exit</th>
                <th className="text-center">Stop ÷ ATR</th><th className="text-end">P&L</th><th className="text-end">R</th><th className="text-end">Held</th><th>Reason</th><th />
              </tr></thead>
              <tbody>
                {closed.length === 0 && <tr><td colSpan={10} className="text-center text-muted py-4">Nothing closed yet.</td></tr>}
                {closed.map((t) => {
                  const s = closedStats1h(t)
                  const v = atrView({ entry: t.entry, stop: t.stop_price, target: t.target_price, atr: t.atr })
                  return (
                    <tr key={t.id}>
                      <td><div className="fw-semibold">{t.symbol}</div><div className="text-muted small">{fmtWhen(t.entry_at)}</div></td>
                      <td className="text-end">{t.qty}</td>
                      <td className="text-end">{money(num(t.entry), 'INR')}</td>
                      <td className="text-end">{money(num(t.exit_price), 'INR')}</td>
                      <td className="text-center text-muted small">{v && v.stopMult > 0 ? `${v.stopMult.toFixed(1)}×` : '—'}</td>
                      <td className="text-end"><PnL v={s.pnl} /></td>
                      <td className="text-end"><RVal v={s.r} /></td>
                      <td className="text-end text-muted small">{hoursLabel(s.hours)}</td>
                      <td><span className="badge bg-light text-dark">{(EXIT_REASONS.find((r) => r.value === t.exit_reason) || {}).label || t.exit_reason || '—'}</span></td>
                      <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-2" onClick={() => setDel(t)}><i className="ri-delete-bin-line" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal?.kind === 'new' && <AddTradeModal stocks={stocks} deployAmount={deployAmount}
        onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload(); await reloadConfig() }} />}
      {modal?.kind === 'close' && <CloseTradeModal trade={modal.data} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reload() }} />}
      <ConfirmDialog
        open={Boolean(del)} title="Delete trade?"
        message={del ? `${del.symbol} will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={async () => { const t = del; setDel(null); await removeTrade1h(t.id); await reload() }}
        onCancel={() => setDel(null)}
      />
    </div>
  )
}

// --- Add a position ---------------------------------------------------------
function AddTradeModal({ stocks, deployAmount, onClose, onSaved }) {
  const [f, setF] = useState({ symbol: '', bucket: '', sector: '', entry: '', stop: '', target: '', atr: '', qty: '', entryAt: nowLocal(), note: '' })
  const [amount, setAmount] = useState(String(deployAmount))
  // Quantity is derived from the amount until you type over it, then it is yours.
  const [qtyTouched, setQtyTouched] = useState(false)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const sized = sizeFromAmount(amount, f.entry)
  useEffect(() => {
    if (qtyTouched) return
    setF((s) => ({ ...s, qty: sized.qty ? String(sized.qty) : '' }))
  }, [sized.qty, qtyTouched])

  const pick = (id) => {
    const s = stocks.find((x) => x.id === id)
    if (s) setF((p) => ({ ...p, symbol: s.symbol, bucket: s.bucket || '', sector: s.sector || '', thesis: s.rationale || '' }))
  }

  const riskPerShare = num(f.entry) - num(f.stop)
  const rr = rewardRisk(f.entry, f.stop, f.target)
  const v = atrView({ entry: f.entry, stop: f.stop, target: f.target, atr: f.atr })
  const rupeeRisk = num(f.qty) * Math.max(0, riskPerShare)
  const posValue = num(f.qty) * num(f.entry)

  const save = async () => {
    if (!f.symbol.trim()) { setErr('Pick a stock, or type a symbol.'); return }
    if (riskPerShare <= 0) { setErr('Stop must be below entry.'); return }
    setErr(null); setSaving(true)
    try {
      await addTrade1h({ ...f, entryAt: f.entryAt ? new Date(f.entryAt).toISOString() : null })
      if (num(amount) > 0 && num(amount) !== num(deployAmount)) await saveDeployAmount(amount)
      await onSaved()
    } catch (e) { setErr(e.message); setSaving(false) }
  }

  const grouped = BUCKET_OPTIONS.map((b) => ({ ...b, items: stocks.filter((s) => s.bucket === b.value) }))
  const ungrouped = stocks.filter((s) => !s.bucket)

  return (
    <Modal open size="lg" title={<><i className="ri-add-circle-line me-2 text-primary" />Add position — 1 hour</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-md-5"><label className="form-label small mb-1">From Stock Strength</label>
          <select className="form-select" defaultValue="" onChange={(e) => pick(e.target.value)}>
            <option value="">— pick / or type below —</option>
            {grouped.filter((g) => g.items.length).map((g) => (
              <optgroup key={g.value} label={g.label}>
                {g.items.map((s) => <option key={s.id} value={s.id}>{s.symbol} · {s.sector || '—'}</option>)}
              </optgroup>
            ))}
            {ungrouped.length > 0 && (
              <optgroup label="No bucket">{ungrouped.map((s) => <option key={s.id} value={s.id}>{s.symbol} · {s.sector || '—'}</option>)}</optgroup>
            )}
          </select>
          {f.thesis ? <div className="form-text text-muted mt-1"><i className="ri-lightbulb-line me-1" />{f.thesis}</div> : null}
        </div>
        <div className="col-md-3"><label className="form-label small mb-1">Symbol</label><input className="form-control text-uppercase" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} /></div>
        <div className="col-md-2"><label className="form-label small mb-1">Bucket</label>
          <select className="form-select" value={f.bucket} onChange={(e) => set('bucket', e.target.value)}>
            <option value="">—</option>
            {BUCKET_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.value}</option>)}
          </select>
        </div>
        <div className="col-md-2"><label className="form-label small mb-1">Sector</label><input className="form-control" value={f.sector} onChange={(e) => set('sector', e.target.value)} /></div>

        <div className="col-md-3"><label className="form-label small mb-1">Entry</label><input type="number" className="form-control" value={f.entry} onChange={(e) => set('entry', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Stop</label><input type="number" className="form-control" value={f.stop} onChange={(e) => set('stop', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Target <span className="text-muted">(optional)</span></label><input type="number" className="form-control" value={f.target} onChange={(e) => set('target', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">ATR(14) — 1H chart</label><input type="number" className="form-control" placeholder="in ₹" value={f.atr} onChange={(e) => set('atr', e.target.value)} /></div>

        <div className="col-md-3"><label className="form-label small mb-1">Amount to deploy</label>
          <input type="number" className="form-control" placeholder="e.g. 100000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="form-text">Sets the quantity below.</div>
        </div>
        <div className="col-md-3"><label className="form-label small mb-1">Quantity</label>
          <input type="number" className="form-control" value={f.qty}
            onChange={(e) => { setQtyTouched(true); set('qty', e.target.value) }} />
          <div className="form-text d-flex align-items-center gap-1">
            {sized.qty > 0 && qtyTouched && num(f.qty) !== sized.qty ? (
              <>edited — <button type="button" className="btn btn-link btn-sm p-0 align-baseline"
                onClick={() => { setQtyTouched(false); set('qty', String(sized.qty)) }}>reset to {sized.qty}</button></>
            ) : sized.qty > 0 ? <>{sized.qty} shares fit the amount</> : <>enter entry price</>}
          </div>
        </div>
        <div className="col-md-3"><label className="form-label small mb-1">Entry time</label><input type="datetime-local" className="form-control" value={f.entryAt} onChange={(e) => set('entryAt', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Note <span className="text-muted">(optional)</span></label><input className="form-control" placeholder="What you saw on the 1H chart" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
      </div>

      <div className="row g-2 mt-2 text-center">
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Risk / share</div><div className="fw-semibold mt-1">{riskPerShare > 0 ? money(riskPerShare, 'INR') : '—'}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Position value</div>
          <div className="fw-semibold mt-1">{posValue ? money(posValue, 'INR') : '—'}</div>
          {posValue > 0 && num(amount) > 0 && (
            <div className={'small ' + (posValue > num(amount) ? 'text-danger' : 'text-muted')}>
              {posValue > num(amount) ? `${money(posValue - num(amount), 'INR')} over` : `${money(num(amount) - posValue, 'INR')} unused`}
            </div>
          )}
        </div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Rupee risk</div><div className="fw-semibold mt-1">{rupeeRisk ? money(rupeeRisk, 'INR') : '—'}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Reward:Risk</div><div className={'fw-semibold mt-1 ' + (rr && rr < TARGET_RR ? 'text-warning' : rr ? 'text-success' : '')}>{rr ? rr.toFixed(2) : '—'}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Stop ÷ ATR</div><div className={'fw-semibold mt-1 ' + (v && v.stopMult < 1 ? 'text-warning' : '')}>{v && v.stopMult > 0 ? `${v.stopMult.toFixed(2)}×` : '—'}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Target ÷ ATR</div><div className="fw-semibold mt-1">{v && v.targetMult > 0 ? `${v.targetMult.toFixed(2)}×` : '—'}</div></div></div>
      </div>

      {rr > 0 && rr < TARGET_RR && <div className="alert alert-warning py-2 mt-2 mb-0"><i className="ri-flag-line me-1" />Reward:risk {rr.toFixed(2)} is under the {TARGET_RR} you aim for. Recorded either way — this is a nudge, not a gate.</div>}
      {v && v.stopMult > 0 && v.stopMult < 1 && <div className="alert alert-warning py-2 mt-2 mb-0"><i className="ri-contract-left-right-line me-1" />Stop is {v.stopMult.toFixed(2)}× the hourly ATR — inside a single 1H candle. Expect noise to take it.</div>}
      {v && v.targetMult > 6 && <div className="alert alert-info py-2 mt-2 mb-0"><i className="ri-route-line me-1" />Target is {v.targetMult.toFixed(1)} hourly ATRs away — that is a multi-session move, not a 1-hour idea. Fine if you mean to hold it.</div>}
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-check-line me-1" />{saving ? 'Saving…' : 'Add position'}</button>
      </div>
    </Modal>
  )
}

// --- Close a position -------------------------------------------------------
function CloseTradeModal({ trade, onClose, onSaved }) {
  const [f, setF] = useState({ price: String(num(trade.ltp ?? trade.entry)), at: nowLocal(), reason: 'TARGET' })
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const risk = num(trade.entry) - num(trade.stop_price)
  const r = risk > 0 ? (num(f.price) - num(trade.entry)) / risk : 0
  const pnl = num(trade.qty) * (num(f.price) - num(trade.entry))

  const save = async () => {
    if (num(f.price) <= 0) { setErr('Exit price is required.'); return }
    setErr(null); setSaving(true)
    try {
      await editTrade1h(trade.id, {
        state: 'CLOSED', exit_price: num(f.price), exit_reason: f.reason,
        exit_at: f.at ? new Date(f.at).toISOString() : new Date().toISOString(), ltp: num(f.price),
      })
      await onSaved()
    } catch (e) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal open title={<><i className="ri-logout-box-r-line me-2 text-danger" />Close {trade.symbol}</>} onClose={onClose}>
      <div className="border rounded p-2 mb-3 bg-light small">
        Entry {money(num(trade.entry), 'INR')} · stop {money(num(trade.stop_price), 'INR')} · qty {trade.qty}
        {trade.atr ? ` · ATR ${money(num(trade.atr), 'INR')}` : ''}
      </div>
      <div className="row g-2">
        <div className="col-4"><label className="form-label small mb-1">Exit price</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} autoFocus /></div>
        <div className="col-4"><label className="form-label small mb-1">Exit time</label><input type="datetime-local" className="form-control" value={f.at} onChange={(e) => set('at', e.target.value)} /></div>
        <div className="col-4"><label className="form-label small mb-1">Reason</label>
          <select className="form-select" value={f.reason} onChange={(e) => set('reason', e.target.value)}>{EXIT_REASONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </div>
      </div>
      <div className="d-flex gap-3 mt-3">
        <div className="border rounded p-2 flex-grow-1 text-center"><div className="text-muted small">P&L</div><div className="mt-1"><PnL v={pnl} /></div></div>
        <div className="border rounded p-2 flex-grow-1 text-center"><div className="text-muted small">R multiple</div><div className="mt-1"><RVal v={r} /></div></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" onClick={save} disabled={saving}><i className="ri-check-line me-1" />{saving ? 'Closing…' : 'Close position'}</button>
      </div>
    </Modal>
  )
}

// --- Is ATR helping? --------------------------------------------------------
/**
 * The payoff for recording ATR. Two readouts: outcome by stop-distance band,
 * and whether stops placed inside the hourly noise get hit more often. Both
 * stay quiet until there is enough closed data to mean anything.
 */
function AtrPanel({ closed }) {
  const perf = useMemo(() => atrBandPerformance(closed), [closed])
  const noise = useMemo(() => noiseStopRate(closed), [closed])

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1"><i className="ri-ruler-line me-1 text-primary" />Is ATR helping?</h5>
        <span className="text-muted small">{perf.total} closed trades with ATR recorded</span>
      </div>
      <div className="card-body">
        {perf.total === 0 ? (
          <p className="text-muted text-center py-3 mb-0">
            Nothing to show yet. Record ATR(14) from the 1-hour chart on each position, and once trades close this panel scores your stop distances against what actually happened.
          </p>
        ) : (
          <>
            {noise.ready && (
              <div className={'alert py-2 ' + (noise.tightRate > noise.roomyRate ? 'alert-warning' : 'alert-success')}>
                <i className="ri-lightbulb-flash-line me-1" />
                Stops inside <strong>1.5× ATR</strong> were hit <strong>{pct(noise.tightRate)}</strong> of the time ({noise.tightN} trades).
                Stops beyond 1.5× were hit <strong>{pct(noise.roomyRate)}</strong> ({noise.roomyN} trades).
                {noise.tightRate > noise.roomyRate
                  ? ' Tight stops are costing you trades that would otherwise have worked.'
                  : ' Your tight stops are holding up — the noise is not what is taking you out.'}
              </div>
            )}

            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light"><tr>
                  <th>Stop distance</th><th className="text-center">Trades</th><th className="text-center">Win rate</th><th className="text-end">Avg R</th><th className="text-end">P&L</th>
                </tr></thead>
                <tbody>
                  {ATR_BANDS.map((b) => {
                    const row = perf.rows.find((x) => x.key === b.key)
                    const isBest = perf.best && perf.best.key === b.key && perf.scored > 1
                    const isWorst = perf.worst && perf.worst.key === b.key && perf.scored > 1
                    return (
                      <tr key={b.key} className={row.n === 0 ? 'text-muted' : ''}>
                        <td>
                          <span className="fw-medium">{b.label}</span>
                          {b.hint && <span className="text-muted small ms-1">({b.hint})</span>}
                          {isBest && <span className="badge bg-success-subtle text-success ms-2">best</span>}
                          {isWorst && <span className="badge bg-danger-subtle text-danger ms-2">worst</span>}
                        </td>
                        <td className="text-center">{row.n || '—'}</td>
                        <td className="text-center">{row.n ? pct(row.winRate) : '—'}</td>
                        <td className="text-end">{row.n ? <RVal v={row.avgR} /> : '—'}</td>
                        <td className="text-end">{row.n ? <PnL v={row.pnl} /> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-muted small mb-0 mt-2">
              {perf.scored > 1 && perf.best
                ? <>Your best band so far is <strong>{perf.best.label}</strong> at {perf.best.avgR.toFixed(2)}R average over {perf.best.n} trade{perf.best.n === 1 ? '' : 's'}. Treat it as a hint until each band has 10+ trades.</>
                : 'Keep recording — the bands need a handful of trades each before the comparison means anything.'}
              {perf.noAtr > 0 && <> {perf.noAtr} closed trade{perf.noAtr === 1 ? '' : 's'} had no ATR and {perf.noAtr === 1 ? 'is' : 'are'} excluded.</>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
