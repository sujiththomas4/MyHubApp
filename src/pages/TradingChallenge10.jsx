import { Fragment, useState } from 'react'
import { fmtDate, money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useChallengeTrades, addChallengeTrade, editChallengeTrade, removeChallengeTrade,
  CLEAN_RULES, isClean, ruleOk, RESULTS, SIDES, DIRECTIONS, slPoints, targetPoints, capturedPoints,
  SETUP_TYPES, SETUP_MAP, ENTRY_TRIGGERS, ENTRY_TRIGGER_MAP, STAGE_MAP, entryDeviation, ENTRY_DRIFT_LIMIT,
} from '@/data/challengeRepo'

/**
 * TradingChallenge10.jsx — the "10 Clean Trades" discipline page
 * (route /trading-challenge/10-clean). Log each trade with its pre-defined SL &
 * target, market read and logic, tick which rules you followed, and watch the
 * clean-trade count + rules-kept / rules-broken tally.
 */
const CHALLENGE = '10-clean'
const TARGET = 22
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const SIDE_LABEL = { ce: 'CE', pe: 'PE', sell_ce: 'CE', sell_pe: 'PE', other: '—' }
const RESULT_BADGE = { open: 'bg-secondary-subtle text-secondary', win: 'bg-success-subtle text-success', loss: 'bg-danger-subtle text-danger', breakeven: 'bg-warning-subtle text-dark' }
const RESULT_LABEL = Object.fromEntries(RESULTS.map((r) => [r.value, r.label]))

function TradeForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(() => ({
    date: initial?.date || todayISO(),
    symbol: initial?.symbol || '',
    dir: initial?.dir || 'buy',
    side: initial?.side === 'pe' || initial?.side === 'sell_pe' ? 'pe' : 'ce',
    setupType: initial?.setupType || 'support',
    qty: initial?.qty ?? 65,
    entry: initial?.entry ?? '',
    sl: initial?.sl ?? '',
    target: initial?.target ?? '',
    logic: initial?.logic || '',
    // Preserved through the plan editor (set via Activate / Exit), not shown here.
    stage: initial?.stage || 'planned',
    entryTrigger: initial?.entryTrigger || '',
    result: initial?.result || 'open',
    exit: initial?.exit ?? '',
    pnl: initial?.pnl ?? '',
    createdAt: initial?.createdAt || '',
    activatedAt: initial?.activatedAt || '',
    plannedEntry: initial?.plannedEntry || '',
    // Only manual rules are stored; the rest are auto-evaluated from the trade.
    rules: initial?.rules && Object.keys(initial.rules).length ? { ...initial.rules } : Object.fromEntries(CLEAN_RULES.filter((r) => !r.auto).map((r) => [r.id, true])),
    note: initial?.note || '',
  }))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggleRule = (id) => setF((s) => ({ ...s, rules: { ...s.rules, [id]: !s.rules[id] } }))

  const slPts = slPoints(f)
  const tgtPts = targetPoints(f)
  const followed = CLEAN_RULES.filter((r) => ruleOk(f, r)).length
  const clean = CLEAN_RULES.every((r) => ruleOk(f, r))

  const save = async () => {
    if (!f.symbol.trim()) { setErr('Enter the instrument.'); return }
    if (f.entry === '' || f.sl === '' || f.target === '') { setErr('Entry, SL and Target must all be set before the trade.'); return }
    setErr(null); setSaving(true)
    try { await onSave({ ...f }) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <>
      <div className="row g-2">
        <div className="col-md-5">
          <label className="form-label small mb-1">Instrument</label>
          <input className="form-control form-control-sm" placeholder="e.g. NIFTY 24500 CE (weekly)" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Entry direction</label>
          <div className="btn-group btn-group-sm w-100">
            {DIRECTIONS.map((d) => (
              <button type="button" key={d.value} className={'btn ' + (f.dir === d.value ? (d.value === 'buy' ? 'btn-success' : 'btn-danger') : 'btn-outline-secondary')} onClick={() => set('dir', d.value)}>{d.label}</button>
            ))}
          </div>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Qty (1 lot)</label>
          <input type="number" className="form-control form-control-sm" value={f.qty} onChange={(e) => set('qty', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Option</label>
          <select className="form-select form-select-sm" value={f.side} onChange={(e) => set('side', e.target.value)}>
            {SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Setup (entry criteria)</label>
          <select className="form-select form-select-sm" value={f.setupType} onChange={(e) => set('setupType', e.target.value)}>
            {SETUP_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Entry</label>
          <input type="number" className="form-control form-control-sm" value={f.entry} onChange={(e) => set('entry', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Stop loss</label>
          <input type="number" className="form-control form-control-sm" value={f.sl} onChange={(e) => set('sl', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Target</label>
          <input type="number" className="form-control form-control-sm" value={f.target} onChange={(e) => set('target', e.target.value)} />
        </div>
      </div>
      {(slPts != null || tgtPts != null) && (
        <div className="small mt-1 d-flex gap-3">
          {slPts != null && <span className={slPts < 0 ? 'text-danger' : 'text-muted'}>SL: <strong>{slPts}</strong> pts{slPts < 0 ? ' — SL on wrong side!' : ''}</span>}
          {tgtPts != null && <span className={tgtPts < 0 ? 'text-danger' : 'text-muted'}>Target: <strong>{tgtPts}</strong> pts{tgtPts < 0 ? ' — target on wrong side!' : ''}</span>}
          {slPts > 0 && tgtPts > 0 && <span className="text-muted">R:R <strong>1:{(tgtPts / slPts).toFixed(2)}</strong></span>}
        </div>
      )}

      <label className="form-label small mb-1 mt-3">Logic behind the trade</label>
      <textarea className="form-control form-control-sm mb-3" rows={2} placeholder="Setup / trigger / confluence" value={f.logic} onChange={(e) => set('logic', e.target.value)} />

      <div className="border rounded p-2 mb-3">
        <div className="d-flex align-items-center mb-1">
          <span className="fw-medium small flex-grow-1">Rules {clean && <span className="text-success">· clean</span>}</span>
          <span className={'badge ' + (clean ? 'bg-success' : 'bg-warning')}>{followed}/{CLEAN_RULES.length}</span>
        </div>
        {CLEAN_RULES.map((r) => {
          if (r.auto) {
            const ok = ruleOk(f, r)
            const pending = r.id === 'planahead' && !f.activatedAt
            return (
              <div className="d-flex align-items-center small mb-1" key={r.id}>
                <i className={(pending ? 'ri-time-line text-muted' : ok ? 'ri-checkbox-circle-fill text-success' : 'ri-close-circle-fill text-danger') + ' me-2'} />
                <span className={!pending && !ok ? 'text-danger' : ''}>{r.text}</span>
                <span className="badge bg-light text-muted ms-2">{pending ? 'checked on activation' : 'auto'}</span>
              </div>
            )
          }
          return (
            <div className="form-check" key={r.id}>
              <input className="form-check-input" type="checkbox" id={'rule-' + r.id} checked={!!f.rules[r.id]} onChange={() => toggleRule(r.id)} />
              <label className={'form-check-label small ' + (f.rules[r.id] ? '' : 'text-danger')} htmlFor={'rule-' + r.id}>{r.text}</label>
            </div>
          )
        })}
      </div>

      <label className="form-label small mb-1">Note</label>
      <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Save plan'}</button>
      </div>
    </>
  )
}

// Mark a planned trade active on entry — capture how it was entered and the
// actual entry price. Only active trades can be exited.
function ActivateForm({ trade, onSave, onCancel }) {
  const [f, setF] = useState({ entryTrigger: trade.entryTrigger || 'zone', entry: trade.entry ?? '', date: trade.date || todayISO() })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => { setSaving(true); try { await onSave({ ...trade, ...f, stage: 'active', activatedAt: new Date().toISOString() }) } catch { setSaving(false) } }
  return (
    <>
      <div className="small text-muted mb-2">
        {(SETUP_MAP[trade.setupType]?.label) || 'Setup'} · {trade.dir === 'buy' ? 'Buy' : 'Sell'} {trade.side?.toUpperCase()} · planned entry {trade.plannedEntry || trade.entry || '—'} · SL {trade.sl || '—'} · Target {trade.target || '—'}
      </div>
      <div className="row g-2">
        <div className="col-md-7">
          <label className="form-label small mb-1">How did it enter?</label>
          <select className="form-select" value={f.entryTrigger} onChange={(e) => set('entryTrigger', e.target.value)}>
            {ENTRY_TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="col-md-5">
          <label className="form-label small mb-1">Actual entry price</label>
          <input type="number" className="form-control" value={f.entry} onChange={(e) => set('entry', e.target.value)} autoFocus />
        </div>
      </div>
      <div className="text-muted small mt-2">SL &amp; Target can be adjusted inline in the trade row afterwards.</div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-flashlight-line me-1" />{saving ? 'Saving…' : 'Mark active'}</button>
      </div>
    </>
  )
}

// Compact exit / result form — record the outcome from the row without opening
// the full trade editor. P&L is a free custom number (can be negative).
function ExitForm({ trade, onSave, onCancel }) {
  const [f, setF] = useState({ result: trade.result && trade.result !== 'open' ? trade.result : 'win', exit: trade.exit ?? '', note: trade.note || '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const pts = capturedPoints({ ...trade, exit: f.exit })
  const qty = Number(trade.qty) || 0
  const pnl = pts != null ? pts * qty : null
  const save = async () => { setSaving(true); try { await onSave({ ...trade, result: f.result, exit: f.exit, note: f.note, pnl: pnl ?? '', stage: 'closed' }) } catch { setSaving(false) } }
  return (
    <>
      <div className="small text-muted mb-2">
        {trade.dir === 'buy' ? 'Buy' : 'Sell'} · entry {trade.entry || '—'} · qty {qty}
      </div>
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small mb-1">Result</label>
          <select className="form-select" value={f.result} onChange={(e) => set('result', e.target.value)}>
            {RESULTS.filter((r) => r.value !== 'open').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Entry price</label>
          <input type="number" className="form-control bg-light" value={trade.entry ?? ''} readOnly tabIndex={-1} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Exit price</label>
          <input type="number" className="form-control" value={f.exit} onChange={(e) => set('exit', e.target.value)} autoFocus />
        </div>
        <div className="col-12">
          <div className="border rounded p-2 bg-light d-flex gap-4">
            <span className="small">Points: {pts != null ? <span className={'fw-semibold ' + (pts >= 0 ? 'text-success' : 'text-danger')}>{pts >= 0 ? '+' : ''}{pts}</span> : '—'}</span>
            <span className="small">P&amp;L: {pnl != null ? <span className={'fw-semibold ' + (pnl >= 0 ? 'text-success' : 'text-danger')}>{pnl >= 0 ? '+' : ''}{money(Math.round(pnl), 'INR')}</span> : '—'} <span className="text-muted">(auto = pts × qty)</span></span>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-logout-box-r-line me-1" />{saving ? 'Saving…' : 'Save exit'}</button>
      </div>
    </>
  )
}

export default function TradingChallenge10() {
  const { trades: all } = useChallengeTrades()
  const [modal, setModal] = useState(null)   // { initial } | null
  const [activate, setActivate] = useState(null) // planned trade being activated
  const [exit, setExit] = useState(null)     // active trade being exited
  const [del, setDel] = useState(null)

  const trades = all.filter((t) => (t.challenge || '10-clean') === CHALLENGE)
  // A clean trade counts once it has been taken (active or closed), not while planned.
  const cleanCount = trades.filter((t) => t.stage !== 'planned' && isClean(t)).length
  const remaining = Math.max(0, TARGET - cleanCount)
  const pct = Math.min(100, Math.round((cleanCount / TARGET) * 100))
  const wins = trades.filter((t) => t.result === 'win').length
  const losses = trades.filter((t) => t.result === 'loss').length
  const totalPoints = trades.reduce((s, t) => s + (capturedPoints(t) ?? 0), 0)

  const openAdd = () => setModal({ initial: null })
  const openEdit = (t) => { if (t.stage === 'planned') setModal({ initial: t }) } // plan locked after activation
  const save = async (form) => {
    // While planned, the planned entry tracks the entry field; it freezes once activated.
    const withPlan = { ...form, plannedEntry: form.stage === 'planned' ? form.entry : (form.plannedEntry || form.entry) }
    if (form.id) await editChallengeTrade(withPlan)
    else await addChallengeTrade({ ...withPlan, id: 'ct-' + rid(), challenge: CHALLENGE, sortOrder: trades.length })
    setModal(null)
  }
  const saveActivate = async (form) => { await editChallengeTrade(form); setActivate(null) }
  const saveExit = async (form) => { await editChallengeTrade(form); setExit(null) }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">22 Clean Trades Challenge</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Challenge</li>
            <li className="breadcrumb-item active" aria-current="page">22 Clean Trades</li>
          </ol>
        </nav>
      </div>

      {/* Stats + rules on one row */}
      <div className="row g-3 mb-3">
        <div className="col-lg-3 col-6">
          <div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center mb-2"><span className="stat-label flex-grow-1">Clean trades</span><span className="badge bg-success-subtle text-success">{remaining} to go</span></div>
            <h3 className="mb-2">{cleanCount} <span className="text-muted fs-5">/ {TARGET}</span></h3>
            <div className="progress" style={{ height: 8 }}><div className="progress-bar bg-success" style={{ width: pct + '%' }} /></div>
          </div></div>
        </div>
        <div className="col-lg-2 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">Overall points</span><div className={`stat-icon bg-${totalPoints >= 0 ? 'success' : 'danger'}-subtle text-${totalPoints >= 0 ? 'success' : 'danger'}`}><i className="ri-focus-3-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + (totalPoints >= 0 ? 'text-success' : 'text-danger')}>{totalPoints >= 0 ? '+' : ''}{Math.round(totalPoints * 100) / 100}</h4>
        </div></div></div>
        <div className="col-lg-2 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">W / L</span><div className="stat-icon bg-info-subtle text-info"><i className="ri-bar-chart-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{wins} / {losses}</h4>
        </div></div></div>
        <div className="col-lg-5">
          <div className="card h-100 mb-0"><div className="card-body py-2">
            <h6 className="mb-2 small text-muted"><i className="ri-list-check-2 me-1" />Rules — read before every trade</h6>
            <ol className="ps-3 mb-0 small">{CLEAN_RULES.map((r) => <li key={r.id} className="mb-1">{r.text}</li>)}</ol>
          </div></div>
        </div>
      </div>

      {/* Trades (full width) */}
      <div className="card mb-0">
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1">Trades <span className="text-muted fs-13 fw-normal">({trades.length})</span></h5>
              <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />Plan a trade</button>
            </div>
            <div className="card-body p-0">
              {trades.length === 0 ? (
                <p className="text-muted text-center py-5 mb-0">No trades yet. Take your first clean trade. 🎯</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light"><tr><th>#</th><th>Instrument</th><th className="text-end">Entry</th><th className="text-end">SL</th><th className="text-end">Target</th><th className="text-center">Status</th><th className="text-center">Points</th><th className="text-end">P&amp;L</th><th className="text-center">Rules</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {(() => {
                        const groups = {}; const order = []
                        trades.forEach((t) => { const d = t.date || ''; if (!groups[d]) { groups[d] = []; order.push(d) } groups[d].push(t) })
                        order.sort((a, b) => b.localeCompare(a))
                        let n = 0
                        return order.map((d) => (
                          <Fragment key={d || 'nd'}>
                            <tr className="table-active"><td colSpan={10} className="fw-semibold py-1"><i className="ri-calendar-2-line me-1" />{d ? fmtDate(d) : 'No date'} <span className="text-muted fw-normal small">· {groups[d].length} trade{groups[d].length === 1 ? '' : 's'}</span></td></tr>
                            {groups[d].map((t) => {
                              n += 1
                              const followed = CLEAN_RULES.filter((r) => ruleOk(t, r)).length
                              const clean = followed === CLEAN_RULES.length
                              const slP = slPoints(t); const tgP = targetPoints(t); const capP = capturedPoints(t)
                              const qty = Number(t.qty) || 0
                              const dev = entryDeviation(t)
                              const drifted = t.stage !== 'planned' && dev != null && dev > ENTRY_DRIFT_LIMIT
                              return (
                                <tr key={t.id} className={drifted ? 'table-warning' : ''}>
                                  <td className="text-muted">{n}</td>
                            <td>
                              <div className="fw-medium">{t.symbol || '—'} {clean && <i className="ri-check-double-line text-success" title="Clean" />}</div>
                              <div className="text-muted small">
                                <span className={'badge fw-normal me-1 ' + (t.dir === 'buy' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger')}>{t.dir === 'buy' ? 'Buy' : 'Sell'}</span>
                                {SIDE_LABEL[t.side] || t.side}
                                {t.setupType && <span className={`badge fw-normal ms-1 bg-${SETUP_MAP[t.setupType]?.tone || 'secondary'}-subtle text-${SETUP_MAP[t.setupType]?.tone || 'secondary'}`}>{SETUP_MAP[t.setupType]?.label}</span>}
                                {t.entryTrigger && <span className="ms-1" title={ENTRY_TRIGGER_MAP[t.entryTrigger]?.label}><i className={t.entryTrigger === 'confirmation' ? 'ri-check-double-line' : 'ri-focus-2-line'} /></span>}
                                <span> · {t.date ? fmtDate(t.date) : ''}</span>
                              </div>
                            </td>
                            <td className="text-end small text-nowrap">
                              {t.entry || '—'}
                              {t.stage === 'closed' && t.exit !== '' && t.exit != null && <div className="text-muted" style={{ fontSize: 11 }}>exit {t.exit}</div>}
                              {drifted && <div className="text-danger" style={{ fontSize: 11 }}><i className="ri-error-warning-line me-1" />plan {t.plannedEntry} · {dev}p</div>}
                            </td>
                            <td className="text-end small text-nowrap">
                              <div className="text-danger">{t.sl || '—'}</div>
                              {slP != null && qty > 0 && <div className="text-danger" style={{ fontSize: 11 }}>({slP}p · −{money(Math.round(Math.abs(slP) * qty), 'INR')})</div>}
                            </td>
                            <td className="text-end small text-nowrap">
                              <div className="text-success">{t.target || '—'}</div>
                              {tgP != null && qty > 0 && <div className="text-success" style={{ fontSize: 11 }}>({tgP}p · +{money(Math.round(Math.abs(tgP) * qty), 'INR')})</div>}
                            </td>
                            <td className="text-center">
                              {t.stage === 'closed'
                                ? <span className={'badge ' + (RESULT_BADGE[t.result] || RESULT_BADGE.open)}>{RESULT_LABEL[t.result] || t.result}</span>
                                : <span className={`badge bg-${STAGE_MAP[t.stage]?.tone || 'secondary'}-subtle text-${STAGE_MAP[t.stage]?.tone || 'secondary'}`}>{STAGE_MAP[t.stage]?.label || t.stage}</span>}
                            </td>
                            <td className="text-center">
                              {t.stage === 'closed' && capP != null
                                ? <span className={'fw-semibold ' + (capP >= 0 ? 'text-success' : 'text-danger')}>{capP >= 0 ? '+' : ''}{capP} pts</span>
                                : <span className="text-muted">—</span>}
                            </td>
                            <td className="text-end">
                              {t.stage === 'closed' && capP != null
                                ? <span className={'fw-semibold ' + (capP >= 0 ? 'text-success' : 'text-danger')}>{capP >= 0 ? '+' : ''}{money(Math.round(capP * (Number(t.qty) || 0)), 'INR')}</span>
                                : <span className="text-muted">—</span>}
                            </td>
                            <td className="text-center"><span className={'badge ' + (clean ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-dark')}>{followed}/{CLEAN_RULES.length}</span></td>
                            <td className="text-end text-nowrap">
                              {t.stage === 'planned' && <button className="btn btn-sm btn-soft-primary px-2 me-1" onClick={() => setActivate(t)} title="Mark active"><i className="ri-flashlight-line me-1" />Activate</button>}
                              {t.stage === 'active' && <button className="btn btn-sm btn-soft-success px-2 me-1" onClick={() => setExit(t)} title="Exit trade"><i className="ri-logout-box-r-line me-1" />Exit</button>}
                              {t.stage === 'closed' && <button className="btn btn-sm btn-soft-secondary px-2 me-1" onClick={() => setExit(t)} title="Update result"><i className="ri-edit-2-line me-1" />Result</button>}
                              {/* Plan details are locked once activated — only exit / result after that. */}
                              {t.stage === 'planned'
                                ? <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => openEdit(t)} title="Edit plan"><i className="ri-pencil-line" /></button>
                                : <button className="btn btn-sm btn-ghost-secondary px-2 disabled" tabIndex={-1} title="Locked after activation" style={{ opacity: 0.35, pointerEvents: 'none' }}><i className="ri-lock-line" /></button>}
                              <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => setDel(t)} title="Delete"><i className="ri-delete-bin-line" /></button>
                                </td>
                              </tr>
                              )
                            })}
                          </Fragment>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

      <Modal open={Boolean(modal)} size="lg" title={<><i className="ri-focus-3-line me-2 text-primary" />{modal?.initial ? 'Edit trade plan' : 'Plan a trade'}</>} onClose={() => setModal(null)}>
        {modal && <TradeForm key={modal.initial?.id || 'new'} initial={modal.initial} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <Modal open={Boolean(activate)} title={<><i className="ri-flashlight-line me-2 text-primary" />Mark active{activate?.symbol ? ` — ${activate.symbol}` : ''}</>} onClose={() => setActivate(null)}>
        {activate && <ActivateForm trade={activate} onSave={saveActivate} onCancel={() => setActivate(null)} />}
      </Modal>

      <Modal open={Boolean(exit)} title={<><i className="ri-logout-box-r-line me-2 text-success" />Exit trade{exit?.symbol ? ` — ${exit.symbol}` : ''}</>} onClose={() => setExit(null)}>
        {exit && <ExitForm trade={exit} onSave={saveExit} onCancel={() => setExit(null)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(del)} title="Delete trade?" message={del ? `Trade ${del.symbol || ''} will be removed.` : ''} confirmLabel="Delete"
        onConfirm={async () => { const t = del; setDel(null); await removeChallengeTrade(t.id) }} onCancel={() => setDel(null)}
      />
    </div>
  )
}
