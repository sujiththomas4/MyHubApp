import { useEffect, useMemo, useState } from 'react'
import { money, price, fmtDate } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import SearchSelect from '@/components/ui/SearchSelect'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useStockStrength, BUCKET } from '@/data/stockStrengthRepo'
import {
  useSwing1hTrades, addTradesBatch, editTrade1h, removeTrade1h, saveLtps1h,
  useSwing1hConfig, saveDeployAmount, splitEqually,
  rewardRisk, atrView, hasStop, riskPerShare, openStats1h, aggregates1h,
  ENTRY_TYPES, ENTRY_TYPE, useBacktestNotes, addBacktestNote, setNoteChecked, removeBacktestNote,
  EXIT_REASONS, TARGET_RR,
} from '@/data/swing1hRepo'

/**
 * SwingWeekly.jsx — Swing Weekly (route /business/swing-weekly). Opportunities
 * found on the weekly chart, recorded without rules: no entry checklist, no
 * stop gate, no portfolio caps. The one thing it insists on is ATR(14) on the
 * weekly chart, so the ATR panel can show which stop distances actually paid.
 *
 * Stocks come from Stock Strength, the master universe for this book.
 * Storage is still the swing1h_* tables — renamed screen, same book.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const pct = (v) => `${(v * 100).toFixed(0)}%`
const todayISO = () => new Date().toISOString().slice(0, 10)
const nowLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const hoursLabel = (h) => {
  if (h == null) return '—'
  if (h < 24) return `${h.toFixed(1)}h`
  const d = h / 24
  return d < 14 ? `${d.toFixed(1)}d` : `${(d / 7).toFixed(1)}w`
}

const PnL = ({ v }) => <span className={v > 0 ? 'text-success fw-semibold' : v < 0 ? 'text-danger fw-semibold' : 'text-muted'}>{money(v, 'INR')}</span>
const RVal = ({ v }) => <span className={v > 0 ? 'text-success' : v < 0 ? 'text-danger' : 'text-muted'}>{v.toFixed(2)}R</span>

const Tile = ({ label, value, sub, icon, tone = 'primary', valueClass = '' }) => (
  <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
    <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
    <h4 className={'stat-value mt-3 mb-0 ' + valueClass}>{value}</h4>
    {sub && <span className="text-muted small">{sub}</span>}
  </div></div></div>
)

export default function SwingWeekly() {
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
    ? open.filter((t) => ltpDraft[t.id] !== undefined && num(ltpDraft[t.id]) !== num(t.ltp)).map((t) => ({ id: t.id, ltp: ltpDraft[t.id], symbol: t.symbol }))
    : []
  const saveLtpEdits = async () => {
    if (!changedLtps.length) { setLtpDraft(null); return }
    setLtpSaving(true)
    try { await saveLtps1h(changedLtps); await reload(); setLtpDraft(null) } finally { setLtpSaving(false) }
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Swing Weekly</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Swing Weekly</li>
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
        <button className="btn btn-sm btn-soft-secondary" onClick={() => setModal({ kind: 'notes' })}>
          <i className="ri-sticky-note-line me-1" />Weekly backtest notes
        </button>
      </div>

      <Basket stocks={stocks} deployAmount={deployAmount}
        onSaved={async () => { await reload(); await reloadConfig() }} />

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
                        {ENTRY_TYPE[t.entry_type] && (
                          <span className={`badge bg-${ENTRY_TYPE[t.entry_type].tone}-subtle text-${ENTRY_TYPE[t.entry_type].tone}`}>{ENTRY_TYPE[t.entry_type].label}</span>
                        )}
                      </td>
                      <td className="text-end">{t.qty}</td>
                      <td className="text-end">{price(st.entry, 'INR')}</td>
                      <td className="text-end">{hasStop(t.stop_price) ? price(num(t.stop_price), 'INR') : <span className="text-muted">—</span>}</td>
                      <td className="text-end">{t.target_price ? price(num(t.target_price), 'INR') : '—'}</td>
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
                          <input type="number" step="0.01" className="form-control form-control-sm text-end" value={ltpDraft[t.id] ?? ''}
                            onChange={(e) => setLtpDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveLtpEdits(); if (e.key === 'Escape') setLtpDraft(null) }} />
                        ) : price(st.ltp, 'INR')}
                      </td>
                      <td className="text-end"><PnL v={st.pnl} /></td>
                      <td className="text-end">{hasStop(t.stop_price) ? <RVal v={st.openR} /> : <span className="text-muted">—</span>}</td>
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

      {modal?.kind === 'notes' && <BacktestNotesModal onClose={() => setModal(null)} />}
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

// --- Weekly basket ----------------------------------------------------------
const blankRow = () => ({ key: Math.random().toString(36).slice(2, 8), stockId: '', symbol: '', bucket: '', sector: '', thesis: '', entry: '', stop: '', target: '', atr: '', qtyOverride: '', entryType: 'STRENGTH' })

/**
 * The weekly ritual, done in place: set the amount, add a row per stock, type
 * the entry price. The amount splits equally across the rows and each row buys
 * whole shares with its share of it. Nothing is written until Save.
 */
function Basket({ stocks, deployAmount, onSaved }) {
  const [amount, setAmount] = useState(String(deployAmount))
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => { setAmount(String(deployAmount)) }, [deployAmount])

  const setRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, blankRow()])
  const dropRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key))

  const pickStock = (key, id) => {
    const st = stocks.find((x) => x.id === id)
    setRow(key, st
      ? { stockId: id, symbol: st.symbol, bucket: st.bucket || '', sector: st.sector || '', thesis: st.rationale || '' }
      : { stockId: '', symbol: '', bucket: '', sector: '', thesis: '' })
  }

  const stockOptions = useMemo(() => [...stocks]
    .sort((a, b) => (a.bucket || 'Z').localeCompare(b.bucket || 'Z') || a.symbol.localeCompare(b.symbol))
    .map((st) => ({ value: st.id, label: `${st.symbol}${st.bucket ? ' · ' + st.bucket : ''}${st.sector ? ' · ' + st.sector : ''}` })), [stocks])

  // Equal split across every row in the basket, whatever state each row is in.
  const split = splitEqually(amount, rows.map((r) => r.entry))
  const qtyOf = (r, i) => (r.qtyOverride !== '' ? num(r.qtyOverride) : split[i]?.qty || 0)
  const valueOf = (r, i) => qtyOf(r, i) * num(r.entry)
  const perStock = split[0]?.per || 0
  const allocated = rows.reduce((acc, r, i) => acc + valueOf(r, i), 0)
  const readyCount = rows.filter((r, i) => r.symbol && num(r.entry) > 0 && qtyOf(r, i) > 0).length

  const save = async () => {
    const payload = rows
      .map((r, i) => ({ r, qty: qtyOf(r, i) }))
      .filter(({ r, qty }) => r.symbol && num(r.entry) > 0 && qty > 0)
      .map(({ r, qty }) => ({
        symbol: r.symbol, bucket: r.bucket, sector: r.sector,
        entry: r.entry, stop: r.stop, target: r.target, atr: r.atr, entryType: r.entryType,
        qty, entryAt: new Date().toISOString(), note: r.thesis || null,
      }))
    if (!payload.length) { setErr('Nothing to save — each row needs a stock, an entry price, and at least 1 share.'); return }
    setErr(null); setSaving(true)
    try {
      await addTradesBatch(payload)
      if (num(amount) > 0 && num(amount) !== num(deployAmount)) await saveDeployAmount(amount)
      setRows([])
      await onSaved()
    } catch (e) { setErr(e.message || 'Could not save.') } finally { setSaving(false) }
  }

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center flex-wrap gap-2">
        <h5 className="card-title mb-0 me-2">New basket</h5>
        <div className="input-group input-group-sm" style={{ maxWidth: 230 }}>
          <span className="input-group-text">Deploy ₹</span>
          <input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {rows.length > 0 && (
          <span className="text-muted small">{rows.length} stock{rows.length === 1 ? '' : 's'} · {money(perStock, 'INR')} each</span>
        )}
        <span className="flex-grow-1" />
        <button className="btn btn-sm btn-soft-primary" onClick={addRow}><i className="ri-add-line me-1" />Add stock</button>
        {rows.length > 0 && (
          <>
            <button className="btn btn-sm btn-light" onClick={() => { setRows([]); setErr(null) }} disabled={saving}>Clear</button>
            <button className="btn btn-sm btn-primary" onClick={save} disabled={saving || readyCount === 0}>
              <i className="ri-check-line me-1" />{saving ? 'Saving…' : `Save ${readyCount || ''} position${readyCount === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card-body text-center text-muted py-4">
          <i className="ri-shopping-basket-2-line fs-3 d-block mb-2" />
          Set the amount, then <strong>Add stock</strong> for each name. The amount splits equally and each row buys whole shares.
        </div>
      ) : (
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light"><tr>
                <th style={{ minWidth: 230 }}>Stock</th>
                <th style={{ width: 175 }}>Setup</th>
                <th className="text-end" style={{ width: 110 }}>Entry</th>
                <th className="text-end" style={{ width: 110 }}>Stop</th>
                <th className="text-end" style={{ width: 110 }}>Target</th>
                <th className="text-end" style={{ width: 110 }}>ATR(W)</th>
                <th className="text-end" style={{ width: 105 }}>Qty</th>
                <th className="text-end">Value</th>
                <th className="text-center">R:R</th>
                <th />
              </tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const qty = qtyOf(r, i)
                  const rr = rewardRisk(r.entry, r.stop, r.target)
                  const v = atrView({ entry: r.entry, stop: r.stop, target: r.target, atr: r.atr })
                  return (
                    <tr key={r.key}>
                      <td>
                        <SearchSelect value={r.stockId} onChange={(id) => pickStock(r.key, id)} options={stockOptions} placeholder="Search Stock Strength…" />
                      </td>
                      <td>
                        <select className="form-select form-select-sm" value={r.entryType} onChange={(e) => setRow(r.key, { entryType: e.target.value })}>
                          {ENTRY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td><input type="number" step="0.01" className="form-control form-control-sm text-end" value={r.entry} onChange={(e) => setRow(r.key, { entry: e.target.value })} /></td>
                      <td><input type="number" step="0.01" className="form-control form-control-sm text-end" placeholder="—" value={r.stop} onChange={(e) => setRow(r.key, { stop: e.target.value })} /></td>
                      <td><input type="number" step="0.01" className="form-control form-control-sm text-end" placeholder="—" value={r.target} onChange={(e) => setRow(r.key, { target: e.target.value })} /></td>
                      <td><input type="number" step="0.01" className="form-control form-control-sm text-end" placeholder="—" value={r.atr} onChange={(e) => setRow(r.key, { atr: e.target.value })} /></td>
                      <td>
                        <input type="number" className="form-control form-control-sm text-end"
                          value={r.qtyOverride !== '' ? r.qtyOverride : (qty || '')}
                          onChange={(e) => setRow(r.key, { qtyOverride: e.target.value })} />
                        {r.qtyOverride !== '' && <button type="button" className="btn btn-link btn-sm p-0 small" onClick={() => setRow(r.key, { qtyOverride: '' })}>reset</button>}
                      </td>
                      <td className="text-end">{valueOf(r, i) ? money(valueOf(r, i), 'INR') : <span className="text-muted">—</span>}</td>
                      <td className="text-center small">
                        {rr ? <span className={rr < TARGET_RR ? 'text-warning' : 'text-success'}>{rr.toFixed(2)}</span> : <span className="text-muted">—</span>}
                        {v && v.stopMult > 0 && <div className={'small ' + (v.stopMult < 1 ? 'text-warning' : 'text-muted')}>{v.stopMult.toFixed(1)}× ATR</div>}
                      </td>
                      <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-1" onClick={() => dropRow(r.key)}><i className="ri-close-line" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="table-light">
                <tr className="fw-semibold">
                  <td colSpan={7}>Allocated</td>
                  <td className="text-end">{money(allocated, 'INR')}</td>
                  <td colSpan={2} className={'small ' + (allocated > num(amount) ? 'text-danger' : 'text-muted')}>
                    {allocated > num(amount) ? `${money(allocated - num(amount), 'INR')} over` : `${money(num(amount) - allocated, 'INR')} unused`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {err && <div className="card-body pt-0"><div className="alert alert-danger py-2 mb-0">{err}</div></div>}
      <div className="card-footer text-muted small">
        Stop, target and ATR are optional — fill them when you have them. No rules here: {TARGET_RR}R is a nudge, not a gate.
      </div>
    </div>
  )
}

// --- Weekly backtest notes --------------------------------------------------
/**
 * A manual scratchpad, not a trade log. Jot the date and the symbol as you
 * spot candidates through the week, then tick them off at the weekend once
 * the real screener has confirmed or rejected each one.
 */
function BacktestNotesModal({ onClose }) {
  const { notes, reload } = useBacktestNotes()
  const [f, setF] = useState({ noteDate: todayISO(), symbol: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const add = async () => {
    if (!f.symbol.trim()) { setErr('Stock name is required.'); return }
    setErr(null); setBusy(true)
    try { await addBacktestNote(f); setF({ noteDate: f.noteDate, symbol: '', note: '' }); await reload() }
    catch (e) { setErr(e.message || 'Could not save.') } finally { setBusy(false) }
  }
  const toggle = async (n) => { await setNoteChecked(n.id, !n.checked); await reload() }
  const drop = async (id) => { await removeBacktestNote(id); await reload() }

  const pending = notes.filter((n) => !n.checked).length

  return (
    <Modal open size="lg" title={<><i className="ri-sticky-note-line me-2 text-primary" />Weekly backtest notes</>} onClose={onClose}>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-3">
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={f.noteDate} onChange={(e) => set('noteDate', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Stock</label>
          <input className="form-control form-control-sm text-uppercase" placeholder="e.g. INFY" value={f.symbol}
            onChange={(e) => set('symbol', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }} autoFocus />
        </div>
        <div className="col-md-5">
          <label className="form-label small mb-1">Note <span className="text-muted">(optional)</span></label>
          <input className="form-control form-control-sm" placeholder="What you saw" value={f.note}
            onChange={(e) => set('note', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        </div>
        <div className="col-md-1">
          <button className="btn btn-primary btn-sm w-100" onClick={add} disabled={busy}><i className="ri-add-line" /></button>
        </div>
      </div>

      {err && <div className="alert alert-danger py-2 mb-3">{err}</div>}

      <div className="d-flex align-items-center mb-2">
        <span className="text-muted small flex-grow-1">{notes.length} noted · {pending} still to check</span>
      </div>

      {notes.length === 0 ? (
        <p className="text-muted text-center py-4 mb-0">Nothing noted yet. Add a date and a stock as you spot it.</p>
      ) : (
        <div className="table-responsive" style={{ maxHeight: 340 }}>
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light"><tr>
              <th style={{ width: 40 }} />
              <th>Date</th><th>Stock</th><th>Note</th><th />
            </tr></thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className={n.checked ? 'text-muted' : undefined}>
                  <td>
                    <input className="form-check-input" type="checkbox" checked={Boolean(n.checked)} onChange={() => toggle(n)} title="Checked against the screener" />
                  </td>
                  <td className="text-nowrap">{fmtDate(n.note_date)}</td>
                  <td className={'fw-semibold ' + (n.checked ? 'text-decoration-line-through' : '')}>{n.symbol}</td>
                  <td className="small" style={{ whiteSpace: 'normal' }}>{n.note || <span className="text-muted">—</span>}</td>
                  <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-1" onClick={() => drop(n.id)}><i className="ri-delete-bin-line" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-flex justify-content-end mt-3">
        <button className="btn btn-light" onClick={onClose}>Close</button>
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
  const risk = riskPerShare(trade.entry, trade.stop_price)
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
        Entry {price(num(trade.entry), 'INR')} · stop {hasStop(trade.stop_price) ? price(num(trade.stop_price), 'INR') : 'not set'} · qty {trade.qty}
        {trade.atr ? ` · ATR ${price(num(trade.atr), 'INR')}` : ''}
      </div>
      <div className="row g-2">
        <div className="col-4"><label className="form-label small mb-1">Exit price</label><input type="number" step="0.01" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} autoFocus /></div>
        <div className="col-4"><label className="form-label small mb-1">Exit time</label><input type="datetime-local" className="form-control" value={f.at} onChange={(e) => set('at', e.target.value)} /></div>
        <div className="col-4"><label className="form-label small mb-1">Reason</label>
          <select className="form-select" value={f.reason} onChange={(e) => set('reason', e.target.value)}>{EXIT_REASONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </div>
      </div>
      <div className="d-flex gap-3 mt-3">
        <div className="border rounded p-2 flex-grow-1 text-center"><div className="text-muted small">P&L</div><div className="mt-1"><PnL v={pnl} /></div></div>
        <div className="border rounded p-2 flex-grow-1 text-center"><div className="text-muted small">R multiple</div><div className="mt-1">{risk > 0 ? <RVal v={r} /> : <span className="text-muted">no stop set</span>}</div></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" onClick={save} disabled={saving}><i className="ri-check-line me-1" />{saving ? 'Closing…' : 'Close position'}</button>
      </div>
    </Modal>
  )
}
