import { useState } from 'react'
import { money } from '@/data/AppData'
import {
  useEmis, addEmi, editEmi, removeEmi,
  useIncomeSources, addIncome, editIncome, removeIncome,
} from '@/data/emisRepo'

/**
 * MonthlyEmis.jsx
 * -----------------------------------------------------------------------------
 * Defined monthly EMIs (activity, amount, due day, payment source) plus the
 * income sources that fund them — with a coverage summary showing whether income
 * covers the commitments and how much is left over each month.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const cls = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const ordinal = (d) => {
  if (!d) return '—'
  const n = Number(d)
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const SOURCE_HINTS = ['HDFC NRO', 'HDFC NRE', 'HDFC Savings', 'SBI', 'Mashreq', 'Emirates NBD']

export default function MonthlyEmis() {
  const { emis } = useEmis()
  const { incomes } = useIncomeSources()

  const activeEmis = emis.filter((e) => e.active)
  const activeIncome = incomes.filter((i) => i.active)
  const totalEmi = activeEmis.reduce((s, e) => s + e.amount, 0)
  const totalIncome = activeIncome.reduce((s, i) => s + i.amount, 0)
  const left = totalIncome - totalEmi

  // Per-income coverage: EMIs funded by each source vs its amount.
  const coverage = activeIncome.map((i) => {
    const assigned = activeEmis.filter((e) => e.incomeId === i.id).reduce((s, e) => s + e.amount, 0)
    return { ...i, assigned, remaining: i.amount - assigned }
  })
  const unassigned = activeEmis.filter((e) => !e.incomeId || !activeIncome.some((i) => i.id === e.incomeId))
  const unassignedTotal = unassigned.reduce((s, e) => s + e.amount, 0)

  // Suggestions for the payment-source field: defaults + whatever's already used.
  const sources = [...new Set([...SOURCE_HINTS, ...emis.map((e) => e.source), ...incomes.map((i) => i.source)].filter(Boolean))]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Monthly EMIs</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Money</li>
            <li className="breadcrumb-item active" aria-current="page">Monthly EMIs</li>
          </ol>
        </nav>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Monthly income</span></div>
            <div className="stat-icon bg-success-subtle text-success"><i className="ri-arrow-down-circle-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{money(totalIncome, 'INR')}</h4>
          <span className="text-muted small">{activeIncome.length} source{activeIncome.length === 1 ? '' : 's'}</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Monthly EMIs</span></div>
            <div className="stat-icon bg-danger-subtle text-danger"><i className="ri-arrow-up-circle-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-danger">{money(totalEmi, 'INR')}</h4>
          <span className="text-muted small">{activeEmis.length} EMI{activeEmis.length === 1 ? '' : 's'}</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Left after EMIs</span></div>
            <div className={'stat-icon bg-' + (left >= 0 ? 'primary' : 'warning') + '-subtle text-' + (left >= 0 ? 'primary' : 'warning')}><i className="ri-wallet-3-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + cls(left)}>{money(left, 'INR')}</h4>
          <span className="text-muted small">income − EMIs</span>
        </div></div></div>
      </div>

      {/* Coverage banner */}
      {(totalEmi > 0 || totalIncome > 0) && (
        <div className={'alert d-flex align-items-center ' + (left >= 0 ? 'alert-success' : 'alert-warning')}>
          <i className={'me-2 fs-5 ' + (left >= 0 ? 'ri-checkbox-circle-line' : 'ri-error-warning-line')} />
          {left >= 0
            ? <span>Your income covers every EMI, with <strong>{money(left, 'INR')}</strong> free each month.</span>
            : <span>Your EMIs exceed income by <strong>{money(-left, 'INR')}</strong> — add an income source or trim an EMI.</span>}
        </div>
      )}

      <div className="row g-3">
        <div className="col-xl-7"><EmiSection emis={emis} incomes={incomes} sources={sources} totalEmi={totalEmi} /></div>
        <div className="col-xl-5"><IncomeSection incomes={incomes} sources={sources} totalIncome={totalIncome} /></div>
      </div>

      {/* Coverage by income source */}
      {activeIncome.length > 0 && (
        <div className="card mt-3 mb-0">
          <div className="card-header"><h5 className="card-title mb-0">Coverage by income source</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Income source</th><th>Into</th>
                    <th className="text-end">Income</th><th className="text-end">EMIs funded</th><th className="text-end">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-medium">{c.name}</td>
                      <td className="text-muted">{c.source || '—'}</td>
                      <td className="text-end text-success">{money(c.amount, 'INR')}</td>
                      <td className="text-end text-danger">{money(c.assigned, 'INR')}</td>
                      <td className={'text-end fw-semibold ' + cls(c.remaining)}>{money(c.remaining, 'INR')}</td>
                    </tr>
                  ))}
                  {unassignedTotal > 0 && (
                    <tr>
                      <td className="fw-medium text-warning"><i className="ri-error-warning-line me-1" />Unassigned EMIs</td>
                      <td className="text-muted">{unassigned.length} EMI{unassigned.length === 1 ? '' : 's'}</td>
                      <td className="text-end text-muted">—</td>
                      <td className="text-end text-danger">{money(unassignedTotal, 'INR')}</td>
                      <td className="text-end text-muted">not funded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- EMIs -------------------------------------------------------------------
const blankEmi = () => ({ id: null, activity: '', amount: '', dueDay: '', source: '', incomeId: '', active: true })

function EmiSection({ emis, incomes, sources, totalEmi }) {
  const [form, setForm] = useState(blankEmi())
  const incomeById = Object.fromEntries(incomes.map((i) => [i.id, i]))
  const [err, setErr] = useState(null)
  const editing = Boolean(form.id)
  const reset = () => { setForm(blankEmi()); setErr(null) }

  const save = async () => {
    setErr(null)
    if (!form.activity.trim()) { setErr('Name the EMI / activity.'); return }
    if (form.amount === '' || Number(form.amount) <= 0) { setErr('Enter an amount.'); return }
    try {
      if (editing) await editEmi(form)
      else await addEmi({ ...form, id: 'emi-' + rid(), sortOrder: emis.length })
      reset()
    } catch (e) { setErr(e.message || 'Could not save.') }
  }
  const edit = (x) => { setForm(x); setErr(null) }
  const del = async (id) => { if (window.confirm('Delete this EMI?')) await removeEmi(id) }
  const toggleActive = (x) => editEmi({ ...x, active: !x.active })

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1">EMIs {editing && <span className="text-muted fs-13 fw-normal">· editing</span>}</h5>
        {editing && <button className="btn btn-sm btn-light" onClick={reset}>Cancel</button>}
      </div>
      <div className="card-body">
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-4">
            <label className="form-label small mb-1">Activity</label>
            <input type="text" className="form-control" placeholder="Car loan" value={form.activity}
              onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1">Amount</label>
            <input type="number" className="form-control" placeholder="15000" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1">Due day</label>
            <input type="number" min="1" max="31" className="form-control" placeholder="5" value={form.dueDay}
              onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-1">Source (account)</label>
            <input type="text" className="form-control" list="emi-src" placeholder="HDFC NRO" value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-1">Paid by (income source)</label>
            <select className="form-select" value={form.incomeId}
              onChange={(e) => setForm((f) => ({ ...f, incomeId: e.target.value }))}>
              <option value="">— none —</option>
              {incomes.filter((i) => i.active || i.id === form.incomeId).map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary btn-sm mb-3" onClick={save}>
          <i className={(editing ? 'ri-save-3-line' : 'ri-add-line') + ' me-1'} />{editing ? 'Update EMI' : 'Add EMI'}
        </button>
        {err && <div className="alert alert-danger py-2">{err}</div>}
        <datalist id="emi-src">{sources.map((s) => <option key={s} value={s} />)}</datalist>

        {emis.length === 0 ? (
          <p className="text-muted text-center py-3 mb-0">No EMIs yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Activity</th><th className="text-end">Amount</th><th>Due</th><th>Source</th><th>Income</th><th className="text-center">Active</th><th className="text-end" /></tr>
              </thead>
              <tbody>
                {emis.map((x) => (
                  <tr key={x.id} className={x.active ? '' : 'text-muted'}>
                    <td className="fw-medium">{x.activity}</td>
                    <td className="text-end">{money(x.amount, 'INR')}</td>
                    <td>{ordinal(x.dueDay)}</td>
                    <td className="text-muted">{x.source || '—'}</td>
                    <td>{x.incomeId && incomeById[x.incomeId]
                      ? <span className="badge bg-success-subtle text-success">{incomeById[x.incomeId].name}</span>
                      : <span className="text-warning small">unassigned</span>}</td>
                    <td className="text-center">
                      <div className="form-check form-switch d-inline-block">
                        <input className="form-check-input" type="checkbox" checked={x.active} onChange={() => toggleActive(x)} />
                      </div>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => edit(x)} title="Edit"><i className="ri-pencil-line" /></button>
                      <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => del(x.id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top"><td>Total (active)</td><td className="text-end text-danger">{money(totalEmi, 'INR')}</td><td colSpan={5} /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Income -----------------------------------------------------------------
const blankIncome = () => ({ id: null, name: '', amount: '', source: '', active: true })

function IncomeSection({ incomes, sources, totalIncome }) {
  const [form, setForm] = useState(blankIncome())
  const [err, setErr] = useState(null)
  const editing = Boolean(form.id)
  const reset = () => { setForm(blankIncome()); setErr(null) }

  const save = async () => {
    setErr(null)
    if (!form.name.trim()) { setErr('Name the income source.'); return }
    if (form.amount === '' || Number(form.amount) <= 0) { setErr('Enter an amount.'); return }
    try {
      if (editing) await editIncome(form)
      else await addIncome({ ...form, id: 'inc-' + rid(), sortOrder: incomes.length })
      reset()
    } catch (e) { setErr(e.message || 'Could not save.') }
  }
  const edit = (x) => { setForm(x); setErr(null) }
  const del = async (id) => { if (window.confirm('Delete this income source?')) await removeIncome(id) }
  const toggleActive = (x) => editIncome({ ...x, active: !x.active })

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1">Income sources {editing && <span className="text-muted fs-13 fw-normal">· editing</span>}</h5>
        {editing && <button className="btn btn-sm btn-light" onClick={reset}>Cancel</button>}
      </div>
      <div className="card-body">
        <div className="row g-2 align-items-end mb-3">
          <div className="col-5">
            <label className="form-label small mb-1">Source</label>
            <input type="text" className="form-control" placeholder="Salary" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="col-4">
            <label className="form-label small mb-1">Amount</label>
            <input type="number" className="form-control" placeholder="80000" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="col-3">
            <label className="form-label small mb-1">Into</label>
            <input type="text" className="form-control" list="inc-src" placeholder="HDFC NRE" value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
            <datalist id="inc-src">{sources.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
        </div>
        <button className="btn btn-primary btn-sm mb-3" onClick={save}>
          <i className={(editing ? 'ri-save-3-line' : 'ri-add-line') + ' me-1'} />{editing ? 'Update' : 'Add income'}
        </button>
        {err && <div className="alert alert-danger py-2">{err}</div>}

        {incomes.length === 0 ? (
          <p className="text-muted text-center py-3 mb-0">No income sources yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Source</th><th className="text-end">Amount</th><th>Into</th><th className="text-center">Active</th><th className="text-end" /></tr>
              </thead>
              <tbody>
                {incomes.map((x) => (
                  <tr key={x.id} className={x.active ? '' : 'text-muted'}>
                    <td className="fw-medium">{x.name}</td>
                    <td className="text-end text-success">{money(x.amount, 'INR')}</td>
                    <td className="text-muted">{x.source || '—'}</td>
                    <td className="text-center">
                      <div className="form-check form-switch d-inline-block">
                        <input className="form-check-input" type="checkbox" checked={x.active} onChange={() => toggleActive(x)} />
                      </div>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => edit(x)} title="Edit"><i className="ri-pencil-line" /></button>
                      <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => del(x.id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top"><td>Total (active)</td><td className="text-end text-success">{money(totalIncome, 'INR')}</td><td colSpan={3} /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
