import { useState } from 'react'
import { fmtDate, money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import TradeCoach from '@/components/trading/TradeCoach'
import {
  useChallengeTrades, addChallengeTrade, editChallengeTrade, removeChallengeTrade,
  CLEAN_RULES, isClean, RESULTS, SIDES,
} from '@/data/challengeRepo'

/**
 * TradingChallenge10.jsx — the "10 Clean Trades" discipline page
 * (route /trading-challenge/10-clean). Log each trade with its pre-defined SL &
 * target, market read and logic, tick which rules you followed, and watch the
 * clean-trade count + rules-kept / rules-broken tally.
 */
const CHALLENGE = '10-clean'
const TARGET = 10
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const SIDE_LABEL = Object.fromEntries(SIDES.map((s) => [s.value, s.label]))
const RESULT_BADGE = { open: 'bg-secondary-subtle text-secondary', win: 'bg-success-subtle text-success', loss: 'bg-danger-subtle text-danger', breakeven: 'bg-warning-subtle text-dark' }
const RESULT_LABEL = Object.fromEntries(RESULTS.map((r) => [r.value, r.label]))

function TradeForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(() => ({
    date: initial?.date || todayISO(),
    symbol: initial?.symbol || '',
    side: initial?.side || 'sell_ce',
    qty: initial?.qty ?? 65,
    entry: initial?.entry ?? '',
    sl: initial?.sl ?? '',
    target: initial?.target ?? '',
    marketRead: initial?.marketRead || '',
    logic: initial?.logic || '',
    result: initial?.result || 'open',
    exit: initial?.exit ?? '',
    pnl: initial?.pnl ?? '',
    rules: initial?.rules && Object.keys(initial.rules).length ? { ...initial.rules } : Object.fromEntries(CLEAN_RULES.map((r) => [r.id, true])),
    note: initial?.note || '',
  }))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggleRule = (id) => setF((s) => ({ ...s, rules: { ...s.rules, [id]: !s.rules[id] } }))

  const slPts = (f.entry !== '' && f.sl !== '') ? Math.abs(Number(f.entry) - Number(f.sl)) : null
  const followed = CLEAN_RULES.filter((r) => f.rules[r.id]).length
  const clean = followed === CLEAN_RULES.length

  const save = async () => {
    if (!f.marketRead.trim()) { setErr('Set your market read before the trade.'); return }
    if (!f.symbol.trim()) { setErr('Enter the instrument.'); return }
    if (f.entry === '' || f.sl === '' || f.target === '') { setErr('Entry, SL and Target must all be set before the trade.'); return }
    setErr(null); setSaving(true)
    try { await onSave({ ...f }) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <>
      <div className="alert alert-info py-2 small d-flex align-items-center"><i className="ri-eye-line me-2 fs-6" />Set your market read first — bias, key levels, and the plan.</div>
      <label className="form-label small mb-1 fw-medium">Market read <span className="text-danger">*</span></label>
      <textarea className="form-control mb-3" rows={3} placeholder="Bias (up/down/range), key levels, expiry, why this trade…" value={f.marketRead} onChange={(e) => set('marketRead', e.target.value)} autoFocus />

      <div className="row g-2">
        <div className="col-md-5">
          <label className="form-label small mb-1">Instrument</label>
          <input className="form-control form-control-sm" placeholder="e.g. NIFTY 24500 CE (weekly)" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Side</label>
          <select className="form-select form-select-sm" value={f.side} onChange={(e) => set('side', e.target.value)}>
            {SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Qty (1 lot)</label>
          <input type="number" className="form-control form-control-sm" value={f.qty} onChange={(e) => set('qty', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Entry</label>
          <input type="number" className="form-control form-control-sm" value={f.entry} onChange={(e) => set('entry', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Stop loss</label>
          <input type="number" className="form-control form-control-sm" value={f.sl} onChange={(e) => set('sl', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Target</label>
          <input type="number" className="form-control form-control-sm" value={f.target} onChange={(e) => set('target', e.target.value)} />
        </div>
      </div>
      {slPts != null && (
        <div className={'small mt-1 ' + (slPts > 50 ? 'text-danger' : 'text-muted')}>
          SL distance: <strong>{slPts}</strong> pts{slPts > 50 ? ' — over the 50-point cap!' : ''}
        </div>
      )}

      <label className="form-label small mb-1 mt-3">Logic behind the trade</label>
      <textarea className="form-control form-control-sm mb-3" rows={2} placeholder="Setup / trigger / confluence" value={f.logic} onChange={(e) => set('logic', e.target.value)} />

      <div className="border rounded p-2 mb-3">
        <div className="d-flex align-items-center mb-1">
          <span className="fw-medium small flex-grow-1">Rules followed</span>
          <span className={'badge ' + (clean ? 'bg-success' : 'bg-warning')}>{followed}/{CLEAN_RULES.length}{clean ? ' · clean' : ''}</span>
        </div>
        {CLEAN_RULES.map((r) => (
          <div className="form-check" key={r.id}>
            <input className="form-check-input" type="checkbox" id={'rule-' + r.id} checked={!!f.rules[r.id]} onChange={() => toggleRule(r.id)} />
            <label className={'form-check-label small ' + (f.rules[r.id] ? '' : 'text-danger')} htmlFor={'rule-' + r.id}>{r.text}</label>
          </div>
        ))}
      </div>

      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small mb-1">Result</label>
          <select className="form-select form-select-sm" value={f.result} onChange={(e) => set('result', e.target.value)}>
            {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {f.result !== 'open' && <>
          <div className="col-md-4">
            <label className="form-label small mb-1">Exit</label>
            <input type="number" className="form-control form-control-sm" value={f.exit} onChange={(e) => set('exit', e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-1">P&amp;L (₹)</label>
            <input type="number" className="form-control form-control-sm" value={f.pnl} onChange={(e) => set('pnl', e.target.value)} />
          </div>
        </>}
        <div className="col-12">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Save trade'}</button>
      </div>
    </>
  )
}

export default function TradingChallenge10() {
  const { trades: all } = useChallengeTrades()
  const [modal, setModal] = useState(null)   // { initial } | null
  const [del, setDel] = useState(null)

  const trades = all.filter((t) => (t.challenge || '10-clean') === CHALLENGE)
  const cleanCount = trades.filter(isClean).length
  const remaining = Math.max(0, TARGET - cleanCount)
  const pct = Math.min(100, Math.round((cleanCount / TARGET) * 100))
  const rulesKept = trades.reduce((s, t) => s + CLEAN_RULES.filter((r) => t.rules && t.rules[r.id]).length, 0)
  const rulesBroken = trades.reduce((s, t) => s + CLEAN_RULES.filter((r) => !(t.rules && t.rules[r.id])).length, 0)
  const wins = trades.filter((t) => t.result === 'win').length
  const losses = trades.filter((t) => t.result === 'loss').length
  // Which rules get broken most.
  const brokenByRule = CLEAN_RULES.map((r) => ({ ...r, n: trades.filter((t) => !(t.rules && t.rules[r.id])).length })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n)

  const openAdd = () => setModal({ initial: null })
  const openEdit = (t) => setModal({ initial: t })
  const save = async (form) => {
    if (form.id) await editChallengeTrade(form)
    else await addChallengeTrade({ ...form, id: 'ct-' + rid(), challenge: CHALLENGE, sortOrder: trades.length })
    setModal(null)
  }

  return (
    <div className="option-buying">
      {/* Same "Set your market read" coach used in the Journal. */}
      <TradeCoach today={todayISO()} />

      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">10 Clean Trades Challenge</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Challenge</li>
            <li className="breadcrumb-item active" aria-current="page">10 Clean Trades</li>
          </ol>
        </nav>
      </div>

      {/* Progress + stats */}
      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center mb-2"><span className="stat-label flex-grow-1">Clean trades</span><span className="badge bg-success-subtle text-success">{remaining} to go</span></div>
            <h3 className="mb-2">{cleanCount} <span className="text-muted fs-5">/ {TARGET}</span></h3>
            <div className="progress" style={{ height: 8 }}><div className="progress-bar bg-success" style={{ width: pct + '%' }} /></div>
          </div></div>
        </div>
        <div className="col-lg-2 col-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">Rules kept</span><div className="stat-icon bg-success-subtle text-success"><i className="ri-shield-check-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{rulesKept}</h4>
        </div></div></div>
        <div className="col-lg-2 col-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">Rules broken</span><div className="stat-icon bg-danger-subtle text-danger"><i className="ri-error-warning-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + (rulesBroken ? 'text-danger' : 'text-muted')}>{rulesBroken}</h4>
        </div></div></div>
        <div className="col-lg-2 col-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">W / L</span><div className="stat-icon bg-info-subtle text-info"><i className="ri-bar-chart-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{wins} / {losses}</h4>
        </div></div></div>
      </div>

      <div className="row g-3">
        {/* Rules reminder */}
        <div className="col-xl-4">
          <div className="card h-100 mb-0">
            <div className="card-header"><h5 className="card-title mb-0"><i className="ri-list-check-2 me-1" />Rules — read before every trade</h5></div>
            <div className="card-body">
              <ol className="ps-3 mb-3 small">{CLEAN_RULES.map((r) => <li key={r.id} className="mb-2">{r.text}</li>)}</ol>
              <button className="btn btn-primary w-100" onClick={openAdd}><i className="ri-eye-line me-1" />Set your market read → log trade</button>
              {brokenByRule.length > 0 && (
                <div className="mt-3">
                  <div className="text-muted small mb-1">Most broken:</div>
                  {brokenByRule.map((r) => <div key={r.id} className="d-flex justify-content-between small"><span className="text-truncate me-2">{r.text}</span><span className="badge bg-danger-subtle text-danger">{r.n}</span></div>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trades log */}
        <div className="col-xl-8">
          <div className="card h-100 mb-0">
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1">Trades <span className="text-muted fs-13 fw-normal">({trades.length})</span></h5>
              <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />New trade</button>
            </div>
            <div className="card-body p-0">
              {trades.length === 0 ? (
                <p className="text-muted text-center py-5 mb-0">No trades yet. Take your first clean trade. 🎯</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light"><tr><th>#</th><th>Instrument</th><th className="text-center">E / SL / T</th><th className="text-center">Result</th><th className="text-center">Rules</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {trades.map((t, i) => {
                        const followed = CLEAN_RULES.filter((r) => t.rules && t.rules[r.id]).length
                        const clean = followed === CLEAN_RULES.length
                        return (
                          <tr key={t.id}>
                            <td className="text-muted">{i + 1}</td>
                            <td>
                              <div className="fw-medium">{t.symbol || '—'} {clean && <i className="ri-check-double-line text-success" title="Clean" />}</div>
                              <div className="text-muted small">{SIDE_LABEL[t.side] || t.side} · {t.date ? fmtDate(t.date) : ''}{t.pnl !== '' && t.pnl != null ? ` · ${money(Number(t.pnl), 'INR')}` : ''}</div>
                            </td>
                            <td className="text-center small text-nowrap">{t.entry || '—'} / <span className="text-danger">{t.sl || '—'}</span> / <span className="text-success">{t.target || '—'}</span></td>
                            <td className="text-center"><span className={'badge ' + (RESULT_BADGE[t.result] || RESULT_BADGE.open)}>{RESULT_LABEL[t.result] || t.result}</span></td>
                            <td className="text-center"><span className={'badge ' + (clean ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-dark')}>{followed}/{CLEAN_RULES.length}</span></td>
                            <td className="text-end text-nowrap">
                              <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => openEdit(t)} title="Edit"><i className="ri-pencil-line" /></button>
                              <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => setDel(t)} title="Delete"><i className="ri-delete-bin-line" /></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={Boolean(modal)} size="lg" title={<><i className="ri-eye-line me-2 text-primary" />{modal?.initial ? 'Edit trade' : 'Set your market read → log trade'}</>} onClose={() => setModal(null)}>
        {modal && <TradeForm key={modal.initial?.id || 'new'} initial={modal.initial} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(del)} title="Delete trade?" message={del ? `Trade ${del.symbol || ''} will be removed.` : ''} confirmLabel="Delete"
        onConfirm={async () => { const t = del; setDel(null); await removeChallengeTrade(t.id) }} onCancel={() => setDel(null)}
      />
    </div>
  )
}
