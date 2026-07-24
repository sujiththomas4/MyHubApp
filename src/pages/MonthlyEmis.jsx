import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { money } from '@/data/AppData'
import { useFx } from '@/context/FxContext'
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

// Monthly item kinds and their small labels.
const KIND_BADGE = {
  emi: { label: 'EMI', cls: 'bg-info-subtle text-info' },
  'sharjah-expense': { label: 'Sharjah Expense', cls: 'bg-warning-subtle text-dark' },
  'india-expense': { label: 'India Expense', cls: 'bg-secondary-subtle text-secondary' },
  savings: { label: 'Savings', cls: 'bg-success text-white' },
}
const kindOf = (x) => (KIND_BADGE[x.kind] ? x.kind : 'emi')

export default function MonthlyEmis() {
  const { emis } = useEmis()
  const { incomes } = useIncomeSources()
  const { toINR, aedToInr } = useFx()

  const activeEmis = emis.filter((e) => e.active)
  const activeIncome = incomes.filter((i) => i.active)
  const kindCount = (k) => activeEmis.filter((e) => kindOf(e) === k).length
  const emiCount = kindCount('emi')
  const sharjahCount = kindCount('sharjah-expense')
  const indiaCount = kindCount('india-expense')
  const savingsCount = kindCount('savings')
  // Totals in INR (AED converted), since EMIs / income can be in either currency.
  const totalEmi = activeEmis.reduce((s, e) => s + toINR(e.amount, e.currency), 0)
  // Monthly income funds the monthly outgoings; lump-sum is a one-off reserve.
  const monthlyIncome = activeIncome.filter((i) => i.frequency !== 'lumpsum').reduce((s, i) => s + toINR(i.amount, i.currency), 0)
  const lumpsumTotal = activeIncome.filter((i) => i.frequency === 'lumpsum').reduce((s, i) => s + toINR(i.amount, i.currency), 0)
  const left = monthlyIncome - totalEmi
  const monthsCovered = left < 0 && lumpsumTotal > 0 ? Math.floor(lumpsumTotal / -left) : 0

  // Per-income coverage (all in INR so mixed-currency legs compare cleanly).
  const coverage = activeIncome.map((i) => {
    const assigned = activeEmis.filter((e) => e.incomeId === i.id).reduce((s, e) => s + toINR(e.amount, e.currency), 0)
    const incomeInr = toINR(i.amount, i.currency)
    return { ...i, incomeInr, assigned, remaining: incomeInr - assigned }
  })
  const unassigned = activeEmis.filter((e) => !e.incomeId || !activeIncome.some((i) => i.id === e.incomeId))
  const unassignedTotal = unassigned.reduce((s, e) => s + toINR(e.amount, e.currency), 0)

  // Outgoings grouped by type (INR), for the right-side breakdown.
  const byType = Object.keys(KIND_BADGE).map((k) => {
    const items = activeEmis.filter((e) => kindOf(e) === k)
    return { kind: k, ...KIND_BADGE[k], count: items.length, total: items.reduce((s, e) => s + toINR(e.amount, e.currency), 0) }
  })

  // Suggestions for the payment-source field: defaults + whatever's already used.
  const sources = [...new Set([...SOURCE_HINTS, ...emis.map((e) => e.source), ...incomes.map((i) => i.source)].filter(Boolean))]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Monthly EMIs &amp; Expenses</h4>
          <small className="text-muted">Totals in INR · <Link to="/settings" className="text-reset">AED→INR {aedToInr}</Link></small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Money</li>
            <li className="breadcrumb-item active" aria-current="page">EMIs &amp; Expenses</li>
          </ol>
        </nav>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Monthly income</span></div>
            <div className="stat-icon bg-success-subtle text-success"><i className="ri-arrow-down-circle-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{money(monthlyIncome, 'INR')}</h4>
          <span className="text-muted small">{activeIncome.length} source{activeIncome.length === 1 ? '' : 's'}{lumpsumTotal > 0 ? ` · +${money(lumpsumTotal, 'INR')} lump-sum` : ''}</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Monthly outgoings</span></div>
            <div className="stat-icon bg-danger-subtle text-danger"><i className="ri-arrow-up-circle-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-danger">{money(totalEmi, 'INR')}</h4>
          <span className="text-muted small">{emiCount} EMI{emiCount === 1 ? '' : 's'} · {sharjahCount} Sharjah · {indiaCount} India · {savingsCount} savings</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Left after EMIs</span></div>
            <div className={'stat-icon bg-' + (left >= 0 ? 'primary' : 'warning') + '-subtle text-' + (left >= 0 ? 'primary' : 'warning')}><i className="ri-wallet-3-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + cls(left)}>{money(left, 'INR')}</h4>
          <span className="text-muted small">income − EMIs</span>
        </div></div></div>
      </div>

      {/* Coverage banner */}
      {(totalEmi > 0 || monthlyIncome > 0 || lumpsumTotal > 0) && (
        <div className={'alert d-flex align-items-center ' + (left >= 0 ? 'alert-success' : 'alert-warning')}>
          <i className={'me-2 fs-5 ' + (left >= 0 ? 'ri-checkbox-circle-line' : 'ri-error-warning-line')} />
          {left >= 0
            ? <span>Your monthly income covers every outgoing, with <strong>{money(left, 'INR')}</strong> free each month.{lumpsumTotal > 0 && <> Plus <strong>{money(lumpsumTotal, 'INR')}</strong> lump-sum available.</>}</span>
            : <span>Your outgoings exceed monthly income by <strong>{money(-left, 'INR')}</strong>.{lumpsumTotal > 0
                ? <> Your <strong>{money(lumpsumTotal, 'INR')}</strong> lump-sum can cover ~{monthsCovered} month{monthsCovered === 1 ? '' : 's'}.</>
                : <> Add an income source or trim an expense.</>}</span>}
        </div>
      )}

      <div className="row g-3">
        <div className="col-xl-7"><EmiSection emis={emis} incomes={incomes} sources={sources} totalEmi={totalEmi} /></div>
        <div className="col-xl-5">
          <div className="mb-3"><IncomeSection incomes={incomes} sources={sources} monthlyIncome={monthlyIncome} lumpsumTotal={lumpsumTotal} /></div>

          {/* Coverage by income source */}
          {activeIncome.length > 0 && (
            <div className="card mb-3">
              <div className="card-header"><h5 className="card-title mb-0">Coverage by income source</h5></div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Income source</th><th>Into</th>
                        <th className="text-end">Income</th><th className="text-end">Funded</th><th className="text-end">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverage.map((c) => (
                        <tr key={c.id}>
                          <td className="fw-medium">{c.name}{c.currency !== 'INR' && <span className="text-muted small ms-1">({money(c.amount, c.currency)})</span>}</td>
                          <td className="text-muted">{c.source || '—'}</td>
                          <td className="text-end text-success">{money(c.incomeInr, 'INR')}</td>
                          <td className="text-end text-danger">{money(c.assigned, 'INR')}</td>
                          <td className={'text-end fw-semibold ' + cls(c.remaining)}>{money(c.remaining, 'INR')}</td>
                        </tr>
                      ))}
                      {unassignedTotal > 0 && (
                        <tr>
                          <td className="fw-medium text-warning"><i className="ri-error-warning-line me-1" />Unassigned</td>
                          <td className="text-muted">{unassigned.length} item{unassigned.length === 1 ? '' : 's'}</td>
                          <td className="text-end text-muted">—</td>
                          <td className="text-end text-danger">{money(unassignedTotal, 'INR')}</td>
                          <td className="text-end text-muted">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Outgoings by type */}
          {activeEmis.length > 0 && (
            <div className="card mb-0">
              <div className="card-header"><h5 className="card-title mb-0">Outgoings by type</h5></div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>Type</th><th className="text-center">Items</th><th className="text-end">Monthly (INR)</th></tr>
                    </thead>
                    <tbody>
                      {byType.map((t) => (
                        <tr key={t.kind}>
                          <td><span className={'badge ' + t.cls}>{t.label}</span></td>
                          <td className="text-center">{t.count}</td>
                          <td className="text-end fw-semibold">{money(t.total, 'INR')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-semibold border-top">
                        <td>Total</td>
                        <td className="text-center">{activeEmis.length}</td>
                        <td className="text-end text-danger">{money(totalEmi, 'INR')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- EMIs -------------------------------------------------------------------
const blankEmi = () => ({ id: null, activity: '', kind: 'emi', amount: '', currency: 'INR', dueDay: '', source: '', incomeId: '', active: true })

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
  const del = async (id) => { if (window.confirm('Delete this item?')) await removeEmi(id) }
  const toggleActive = (x) => editEmi({ ...x, active: !x.active })

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1">EMIs &amp; Expenses {editing && <span className="text-muted fs-13 fw-normal">· editing</span>}</h5>
        {editing && <button className="btn btn-sm btn-light" onClick={reset}>Cancel</button>}
      </div>
      <div className="card-body">
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-2">
            <label className="form-label small mb-1">Type</label>
            <select className="form-select" value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              <option value="emi">EMI</option>
              <option value="sharjah-expense">Sharjah Expense</option>
              <option value="india-expense">India Expense</option>
              <option value="savings">Savings</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-1">Activity</label>
            <input type="text" className="form-control" placeholder="Car loan / Maid salary / Rent" value={form.activity}
              onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1">Amount</label>
            <input type="number" className="form-control" placeholder="15000" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1">Currency</label>
            <select className="form-select" value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small mb-1">Due day</label>
            <input type="number" min="1" max="31" className="form-control" placeholder="5" value={form.dueDay}
              onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))} />
          </div>
          <div className="col-md-5">
            <label className="form-label small mb-1">Source (account)</label>
            <input type="text" className="form-control" list="emi-src" placeholder="HDFC NRO" value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </div>
          <div className="col-md-5">
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
          <i className={(editing ? 'ri-save-3-line' : 'ri-add-line') + ' me-1'} />
          {editing ? 'Update' : 'Add ' + KIND_BADGE[kindOf(form)].label}
        </button>
        {err && <div className="alert alert-danger py-2">{err}</div>}
        <datalist id="emi-src">{sources.map((s) => <option key={s} value={s} />)}</datalist>

        {emis.length === 0 ? (
          <p className="text-muted text-center py-3 mb-0">No items yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Item</th><th className="text-end">Amount</th><th>Due</th><th>Source</th><th>Income</th><th className="text-center">Active</th><th className="text-end" /></tr>
              </thead>
              <tbody>
                {Object.keys(KIND_BADGE)
                  .map((k) => ({ k, badge: KIND_BADGE[k], items: emis.filter((e) => kindOf(e) === k) }))
                  .filter((g) => g.items.length > 0)
                  .map((g) => (
                    <Fragment key={g.k}>
                      <tr className="table-light">
                        <td colSpan={7}>
                          <span className={'badge ' + g.badge.cls}>{g.badge.label}</span>
                          <span className="text-muted small ms-2">{g.items.length} item{g.items.length === 1 ? '' : 's'}</span>
                        </td>
                      </tr>
                      {g.items.map((x) => (
                        <tr key={x.id} className={x.active ? '' : 'text-muted'}>
                          <td className="fw-medium ps-3">{x.activity}</td>
                          <td className="text-end">{money(x.amount, x.currency)}</td>
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
                    </Fragment>
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
const blankIncome = () => ({ id: null, name: '', amount: '', currency: 'INR', frequency: 'monthly', source: '', active: true })

function IncomeSection({ incomes, sources, monthlyIncome, lumpsumTotal }) {
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
          <div className="col-12 col-md-4">
            <label className="form-label small mb-1">Source</label>
            <input type="text" className="form-control" placeholder="Salary" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Amount</label>
            <input type="number" className="form-control" placeholder="80000" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Currency</label>
            <select className="form-select" value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Frequency</label>
            <select className="form-select" value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="lumpsum">Lump-sum</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
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
                    <td className="fw-medium">
                      {x.name}
                      {x.frequency === 'lumpsum'
                        ? <span className="badge bg-primary-subtle text-primary ms-2">Lump-sum</span>
                        : <span className="badge bg-light text-muted ms-2">Monthly</span>}
                    </td>
                    <td className="text-end text-success">{money(x.amount, x.currency)}</td>
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
                <tr className="fw-semibold border-top">
                  <td>Monthly</td>
                  <td className="text-end text-success">{money(monthlyIncome, 'INR')}</td>
                  <td colSpan={3} className="text-muted small">{lumpsumTotal > 0 ? `+ ${money(lumpsumTotal, 'INR')} lump-sum` : ''}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
