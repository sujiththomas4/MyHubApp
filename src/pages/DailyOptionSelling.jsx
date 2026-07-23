import { Fragment, useState } from 'react'
import { fmtDate, money } from '@/data/AppData'
import { useBacktests, addBacktest, editBacktest, removeBacktest } from '@/data/optionSellingBacktestRepo'

/**
 * DailyOptionSelling.jsx
 * -----------------------------------------------------------------------------
 * Daily Option Selling desk. Three tabs:
 *   - Live trades  (todo)
 *   - Past trades  (todo)
 *   - Backtest     (built here) — log a dated/timed set of option legs with
 *                  lots, entry/exit prices and times, and see per-leg premium,
 *                  P&L (points and ₹) and status. Saved runs group by day.
 */
const TABS = [
  { id: 'live', label: 'Live trades', icon: 'ri-radio-button-line' },
  { id: 'past', label: 'Past trades', icon: 'ri-history-line' },
  { id: 'backtest', label: 'Backtest', icon: 'ri-flask-line' },
]

const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const blankLeg = () => ({
  strike: '', type: 'CE', lots: '', side: 'SELL',
  price: '', entryTime: '', exit: '', exitTime: '',
})
const blankForm = () => ({ id: null, date: todayISO(), time: '', lotSize: 65, notes: '', legs: [blankLeg()] })

const has = (v) => v !== '' && v != null
const num = (v) => Number(v) || 0
const signed = (n) => (n > 0 ? '+' : '') + n
const inr = (n) => (n >= 0 ? '' : '−') + money(Math.abs(Math.round(n)), 'INR')
const closeSide = (side) => (side === 'SELL' ? 'BUY' : 'SELL')

// Contracts on a leg = lots × lot size.
const legQty = (l, lotSize) => (has(l.lots) ? num(l.lots) * num(lotSize) : null)

// Realized P&L per leg, in points. null while the leg has no exit yet.
//   SELL: collect entry, pay exit  -> entry - exit
//   BUY : pay entry, collect exit  -> exit - entry
const legPnlPts = (l) => {
  if (!has(l.exit)) return null
  return l.side === 'SELL' ? num(l.price) - num(l.exit) : num(l.exit) - num(l.price)
}
const legPnlInr = (l, lotSize) => {
  const p = legPnlPts(l); const q = legQty(l, lotSize)
  return p == null || q == null ? null : p * q
}
// Premium value of a leg = entry × qty (collected on SELL, paid on BUY).
const legPremiumInr = (l, lotSize) => {
  const q = legQty(l, lotSize)
  return q == null || !has(l.price) ? null : num(l.price) * q
}
const legStatus = (l) => (has(l.exit) ? 'Closed' : 'Open')

const totalPnlPts = (legs) => legs.reduce((s, l) => { const p = legPnlPts(l); return p == null ? s : s + p }, 0)
const totalPnlInr = (legs, lotSize) => legs.reduce((s, l) => { const p = legPnlInr(l, lotSize); return p == null ? s : s + p }, 0)
const hasAnyExit = (legs) => legs.some((l) => has(l.exit))

export default function DailyOptionSelling() {
  const [tab, setTab] = useState('backtest')

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Daily Option Selling</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Option Selling</li>
          </ol>
        </nav>
      </div>

      <ul className="nav nav-tabs nav-tabs-custom mb-3" role="tablist">
        {TABS.map((t) => (
          <li className="nav-item" key={t.id}>
            <button
              type="button"
              className={'nav-link ' + (tab === t.id ? 'active' : '')}
              onClick={() => setTab(t.id)}
            >
              <i className={t.icon + ' me-1'} />{t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'live' && <ComingSoon title="Live trades" hint="Track open positions and today's running P&L here." />}
      {tab === 'past' && <ComingSoon title="Past trades" hint="A history of closed option-selling trades will land here." />}
      {tab === 'backtest' && <BacktestTab />}
    </div>
  )
}

function ComingSoon({ title, hint }) {
  return (
    <div className="card">
      <div className="card-body text-center text-muted py-5">
        <i className="ri-tools-line fs-1 d-block mb-2" />
        <h5 className="mb-1">{title}</h5>
        <p className="mb-0">{hint}</p>
      </div>
    </div>
  )
}

function BacktestTab() {
  const { backtests, loading, error } = useBacktests()
  const [form, setForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [openDays, setOpenDays] = useState({}) // date -> expanded?
  const toggleDay = (date) => setOpenDays((o) => ({ ...o, [date]: !o[date] }))

  const editing = Boolean(form.id)
  const pnlPts = totalPnlPts(form.legs)
  const pnlInr = totalPnlInr(form.legs, form.lotSize)
  const anyExit = hasAnyExit(form.legs)

  const setLeg = (i, patch) =>
    setForm((f) => ({ ...f, legs: f.legs.map((l, j) => (j === i ? { ...l, ...patch } : l)) }))
  const addLeg = () => setForm((f) => ({ ...f, legs: [...f.legs, blankLeg()] }))
  const removeLeg = (i) =>
    setForm((f) => ({ ...f, legs: f.legs.length > 1 ? f.legs.filter((_, j) => j !== i) : f.legs }))

  const reset = () => { setForm(blankForm()); setErr(null) }

  const save = async () => {
    setErr(null)
    if (!form.date) { setErr('Pick a date.'); return }
    const legs = form.legs.filter((l) => has(l.strike) || has(l.price))
    if (legs.length === 0) { setErr('Add at least one leg with a strike or price.'); return }
    setSaving(true)
    try {
      if (editing) await editBacktest({ ...form, legs })
      else await addBacktest({ ...form, id: 'ob-' + rid(), legs })
      reset()
    } catch (e) {
      setErr(e.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const edit = (b) => { setForm({ ...b, legs: b.legs.length ? b.legs : [blankLeg()] }); setErr(null) }
  const del = async (id) => { if (window.confirm('Delete this backtest?')) await removeBacktest(id) }

  const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')

  // Group saved backtests by day (already newest-first). Each day rolls up its P&L.
  const days = []
  const dayIndex = {}
  backtests.forEach((b) => {
    if (dayIndex[b.date] == null) { dayIndex[b.date] = days.length; days.push({ date: b.date, items: [] }) }
    days[dayIndex[b.date]].items.push(b)
  })
  days.forEach((d) => {
    d.pnl = d.items.reduce((s, b) => s + totalPnlInr(b.legs, b.lotSize), 0)
    d.open = d.items.every((b) => !hasAnyExit(b.legs))
  })

  return (
    <>
      {/* Entry form */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">{editing ? 'Edit backtest' : 'New backtest'}</h5>
          {editing && <button className="btn btn-sm btn-light" onClick={reset}>Cancel</button>}
        </div>
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-sm-3 col-6">
              <label className="form-label small mb-1">Date</label>
              <input type="date" className="form-control" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="col-sm-3 col-6">
              <label className="form-label small mb-1">Time</label>
              <input type="time" className="form-control" value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="col-sm-3 col-6">
              <label className="form-label small mb-1">Lot size</label>
              <input type="number" className="form-control" placeholder="65" value={form.lotSize}
                onChange={(e) => setForm((f) => ({ ...f, lotSize: e.target.value }))} />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle mb-2 leg-table">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '78px' }}>Strike</th>
                  <th style={{ width: '74px' }}>Type</th>
                  <th style={{ width: '64px' }}>Lots</th>
                  <th style={{ width: '92px' }}>Side</th>
                  <th style={{ width: '84px' }}>Entry @</th>
                  <th style={{ width: '120px' }}>Entry time</th>
                  <th style={{ width: '84px' }}>Exit @</th>
                  <th style={{ width: '120px' }}>Exit time</th>
                  <th className="text-end" style={{ width: '100px' }}>Premium ₹</th>
                  <th className="text-end" style={{ width: '110px' }}>P&amp;L</th>
                  <th style={{ width: '84px' }}>Status</th>
                  <th style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {form.legs.map((l, i) => {
                  const pts = legPnlPts(l)
                  const rup = legPnlInr(l, form.lotSize)
                  const prem = legPremiumInr(l, form.lotSize)
                  const closed = has(l.exit)
                  return (
                    <tr key={i}>
                      <td>
                        <input type="number" className="form-control form-control-sm" placeholder="24300"
                          value={l.strike} onChange={(e) => setLeg(i, { strike: e.target.value })} />
                      </td>
                      <td>
                        <select className="form-select form-select-sm" value={l.type}
                          onChange={(e) => setLeg(i, { type: e.target.value })}>
                          <option value="CE">CE</option>
                          <option value="PE">PE</option>
                        </select>
                      </td>
                      <td>
                        <input type="number" className="form-control form-control-sm" placeholder="1"
                          value={l.lots} onChange={(e) => setLeg(i, { lots: e.target.value })} />
                      </td>
                      <td>
                        <select
                          className={'form-select form-select-sm fw-semibold ' + (l.side === 'SELL' ? 'text-danger' : 'text-success')}
                          value={l.side} onChange={(e) => setLeg(i, { side: e.target.value })}>
                          <option value="SELL">SELL</option>
                          <option value="BUY">BUY</option>
                        </select>
                      </td>
                      <td>
                        <input type="number" className="form-control form-control-sm" placeholder="90"
                          value={l.price} onChange={(e) => setLeg(i, { price: e.target.value })} />
                      </td>
                      <td>
                        <input type="time" className="form-control form-control-sm"
                          value={l.entryTime} onChange={(e) => setLeg(i, { entryTime: e.target.value })} />
                      </td>
                      <td>
                        <input type="number" className="form-control form-control-sm"
                          placeholder={closeSide(l.side).toLowerCase()} title={`Closed by a ${closeSide(l.side)}`}
                          value={l.exit} onChange={(e) => setLeg(i, { exit: e.target.value })} />
                      </td>
                      <td>
                        <input type="time" className="form-control form-control-sm"
                          value={l.exitTime} onChange={(e) => setLeg(i, { exitTime: e.target.value })} />
                      </td>
                      <td className="text-end">{prem == null ? <span className="text-muted">—</span> : inr(prem)}</td>
                      <td className="text-end">
                        {pts == null ? <span className="text-muted">—</span> : (
                          <>
                            <span className={'fw-semibold ' + pnlClass(pts)}>{signed(pts)}</span>
                            {rup != null && <span className={'d-block small ' + pnlClass(rup)}>{inr(rup)}</span>}
                          </>
                        )}
                      </td>
                      <td>
                        <span className={'badge ' + (closed ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary')}>
                          {legStatus(l)}
                        </span>
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-ghost-danger px-2"
                          onClick={() => removeLeg(i)} title="Remove leg" disabled={form.legs.length === 1}>
                          <i className="ri-close-line" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-top">
                  <td colSpan={9} className="text-end fw-semibold">
                    {anyExit ? 'Overall P&L (realized)' : 'Overall P&L'}
                  </td>
                  <td className="text-end">
                    <span className={'fw-bold ' + pnlClass(pnlPts)}>{signed(pnlPts)}</span>
                    <span className={'d-block small ' + pnlClass(pnlInr)}>{inr(pnlInr)}</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <button type="button" className="btn btn-soft-primary btn-sm" onClick={addLeg}>
            <i className="ri-add-line me-1" />Add leg
          </button>

          <div className="mt-3">
            <label className="form-label small mb-1">Notes</label>
            <textarea className="form-control" rows={2} placeholder="Setup, reasoning, exit plan…"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="d-flex align-items-center mt-3">
            <div className="flex-grow-1">
              <span className="text-muted small d-block">Overall P&amp;L {anyExit ? '(realized)' : ''}</span>
              <span className={'fw-semibold fs-4 ' + pnlClass(pnlInr)}>{inr(pnlInr)}</span>
              <span className={'ms-2 ' + pnlClass(pnlPts)}>{signed(pnlPts)} pts</span>
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              <i className="ri-save-3-line me-1" />{saving ? 'Saving…' : editing ? 'Update' : 'Save backtest'}
            </button>
          </div>
          {err && <div className="alert alert-danger py-2 mb-0 mt-3">{err}</div>}
        </div>
      </div>

      {/* Saved backtests */}
      <div className="card mb-0">
        <div className="card-header"><h5 className="card-title mb-0">Saved backtests</h5></div>
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error.message}</div>}
          {loading && !backtests.length && <p className="text-muted text-center py-4 mb-0">Loading…</p>}
          {!loading && !backtests.length && !error && (
            <p className="text-muted text-center py-4 mb-0">No backtests yet. Log one above.</p>
          )}
          {backtests.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '32px' }} />
                    <th>Time</th>
                    <th>Strike</th><th>Type</th><th>Lots</th><th>Side</th>
                    <th>Entry @</th><th>Entry time</th><th>Exit @</th><th>Exit time</th>
                    <th className="text-end">Premium ₹</th>
                    <th className="text-end">P&amp;L</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const isOpen = !!openDays[d.date]
                    return (
                      <Fragment key={d.date}>
                        {/* Day heading — click to expand its trades */}
                        <tr className="day-row" style={{ cursor: 'pointer' }} onClick={() => toggleDay(d.date)}>
                          <td className="text-center">
                            <i className={isOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                          </td>
                          <td colSpan={10} className="fw-semibold">
                            {fmtDate(d.date)}
                            <span className="badge bg-light text-muted ms-2">{d.items.length}</span>
                          </td>
                          <td className={'text-end fw-bold ' + pnlClass(d.pnl)}>{inr(d.pnl)}</td>
                          <td colSpan={2}>{d.open && <span className="text-muted small">open</span>}</td>
                        </tr>
                        {/* Each backtest's legs — one row per leg, columns like the entry table */}
                        {isOpen && d.items.flatMap((b) => {
                          const bp = totalPnlInr(b.legs, b.lotSize)
                          const bopen = !hasAnyExit(b.legs)
                          const n = b.legs.length || 1
                          return b.legs.map((l, li) => {
                            const pts = legPnlPts(l)
                            const rup = legPnlInr(l, b.lotSize)
                            const prem = legPremiumInr(l, b.lotSize)
                            return (
                              <tr key={b.id + '-' + li} className="day-child">
                                <td />
                                {li === 0 && (
                                  <td rowSpan={n} className="align-top">
                                    <div className="text-muted">{b.time || '—'}</div>
                                    <div className={'small fw-semibold ' + pnlClass(bp)}>{inr(bp)}{bopen && ' · open'}</div>
                                    {b.notes && <div className="text-muted small">{b.notes}</div>}
                                  </td>
                                )}
                                <td className="fw-medium">{l.strike || '—'}</td>
                                <td>{l.type}</td>
                                <td>{has(l.lots) ? l.lots : '—'}</td>
                                <td className={l.side === 'SELL' ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>{l.side}</td>
                                <td>{has(l.price) ? l.price : '—'}</td>
                                <td className="text-muted">{l.entryTime || '—'}</td>
                                <td>{has(l.exit) ? l.exit : '—'}</td>
                                <td className="text-muted">{l.exitTime || '—'}</td>
                                <td className="text-end">{prem == null ? <span className="text-muted">—</span> : inr(prem)}</td>
                                <td className="text-end">
                                  {pts == null ? <span className="text-muted">—</span> : (
                                    <>
                                      <span className={'fw-semibold ' + pnlClass(pts)}>{signed(pts)}</span>
                                      {rup != null && <span className={'d-block small ' + pnlClass(rup)}>{inr(rup)}</span>}
                                    </>
                                  )}
                                </td>
                                <td>
                                  <span className={'badge ' + (has(l.exit) ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary')}>{legStatus(l)}</span>
                                </td>
                                {li === 0 && (
                                  <td rowSpan={n} className="text-end text-nowrap align-top">
                                    <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => edit(b)} title="Edit"><i className="ri-pencil-line" /></button>
                                    <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => del(b.id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                                  </td>
                                )}
                              </tr>
                            )
                          })
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
