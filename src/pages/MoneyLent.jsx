import { useState } from 'react'
import { money, fmtDate } from '@/data/AppData'
import { useMoneyLent, addLent, editLent, removeLent } from '@/data/moneyLentRepo'

/**
 * MoneyLent.jsx
 * -----------------------------------------------------------------------------
 * Track people who took money and haven't fully returned it.
 * Outstanding = amount - returned. A row is settled once returned >= amount.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const outstandingOf = (l) => Math.max(0, l.amount - l.returned)

const blankLent = () => ({ id: null, person: '', amount: '', dateGiven: todayISO(), reason: '', returned: '', returnedDate: '', note: '' })

export default function MoneyLent() {
  const { lent } = useMoneyLent()
  const [form, setForm] = useState(blankLent())
  const [err, setErr] = useState(null)
  const editing = Boolean(form.id)

  const totalLent = lent.reduce((s, l) => s + l.amount, 0)
  const totalReturned = lent.reduce((s, l) => s + l.returned, 0)
  const outstanding = lent.reduce((s, l) => s + outstandingOf(l), 0)
  const pending = lent.filter((l) => outstandingOf(l) > 0).length

  const reset = () => { setForm(blankLent()); setErr(null) }
  const save = async () => {
    setErr(null)
    if (!form.person.trim()) { setErr('Whose name?'); return }
    if (form.amount === '' || Number(form.amount) <= 0) { setErr('Enter the amount lent.'); return }
    try {
      const payload = { ...form, returned: form.returned === '' ? 0 : Number(form.returned) }
      if (editing) await editLent(payload)
      else await addLent({ ...payload, id: 'ml-' + rid() })
      reset()
    } catch (e) { setErr(e.message || 'Could not save.') }
  }
  const edit = (l) => { setForm({ ...l, amount: l.amount, returned: l.returned || '' }); setErr(null) }
  const del = async (id) => { if (window.confirm('Delete this record?')) await removeLent(id) }
  const settle = (l) => editLent({ ...l, returned: l.amount, returnedDate: l.returnedDate || todayISO() })

  const statusBadge = (l) => {
    const out = outstandingOf(l)
    if (out <= 0) return <span className="badge bg-success-subtle text-success">Settled</span>
    if (l.returned > 0) return <span className="badge bg-warning-subtle text-warning">Partial</span>
    return <span className="badge bg-danger-subtle text-danger">Pending</span>
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Money Lent</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Money</li>
            <li className="breadcrumb-item active" aria-current="page">Money Lent</li>
          </ol>
        </nav>
      </div>

      {/* Summary */}
      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Outstanding</span></div>
            <div className="stat-icon bg-danger-subtle text-danger"><i className="ri-time-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-danger">{money(outstanding, 'INR')}</h4>
          <span className="text-muted small">{pending} pending</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Total lent</span></div>
            <div className="stat-icon bg-primary-subtle text-primary"><i className="ri-user-shared-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{money(totalLent, 'INR')}</h4>
          <span className="text-muted small">{lent.length} record{lent.length === 1 ? '' : 's'}</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Returned</span></div>
            <div className="stat-icon bg-success-subtle text-success"><i className="ri-check-double-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{money(totalReturned, 'INR')}</h4>
          <span className="text-muted small">recovered so far</span>
        </div></div></div>
      </div>

      <div className="row g-3">
        {/* Form */}
        <div className="col-xl-4">
          <div className="card mb-0">
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1">{editing ? 'Edit record' : 'Lend money'}</h5>
              {editing && <button className="btn btn-sm btn-light" onClick={reset}>Cancel</button>}
            </div>
            <div className="card-body">
              <div className="mb-2">
                <label className="form-label small mb-1">Person</label>
                <input type="text" className="form-control" placeholder="Name" value={form.person}
                  onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))} />
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small mb-1">Amount</label>
                  <input type="number" className="form-control" placeholder="5000" value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="col-6">
                  <label className="form-label small mb-1">Date given</label>
                  <input type="date" className="form-control" value={form.dateGiven}
                    onChange={(e) => setForm((f) => ({ ...f, dateGiven: e.target.value }))} />
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label small mb-1">Reason</label>
                <input type="text" className="form-control" placeholder="e.g. medical, personal" value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small mb-1">Returned</label>
                  <input type="number" className="form-control" placeholder="0" value={form.returned}
                    onChange={(e) => setForm((f) => ({ ...f, returned: e.target.value }))} />
                </div>
                <div className="col-6">
                  <label className="form-label small mb-1">Returned on</label>
                  <input type="date" className="form-control" value={form.returnedDate}
                    onChange={(e) => setForm((f) => ({ ...f, returnedDate: e.target.value }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small mb-1">Note</label>
                <input type="text" className="form-control" placeholder="Optional" value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={save}>
                <i className={(editing ? 'ri-save-3-line' : 'ri-add-line') + ' me-1'} />{editing ? 'Update' : 'Add record'}
              </button>
              {err && <div className="alert alert-danger py-2 mb-0 mt-3">{err}</div>}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="col-xl-8">
          <div className="card mb-0">
            <div className="card-header"><h5 className="card-title mb-0">Who owes me</h5></div>
            <div className="card-body p-0">
              {lent.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No records yet. Add one on the left.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Person</th><th className="text-end">Amount</th><th className="text-end">Returned</th>
                        <th className="text-end">Outstanding</th><th>Given</th><th>Status</th><th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lent.map((l) => {
                        const out = outstandingOf(l)
                        return (
                          <tr key={l.id}>
                            <td>
                              <div className="fw-medium">{l.person}</div>
                              {(l.reason || l.note) && <div className="text-muted small">{[l.reason, l.note].filter(Boolean).join(' · ')}</div>}
                            </td>
                            <td className="text-end">{money(l.amount, 'INR')}</td>
                            <td className="text-end text-success">{l.returned ? money(l.returned, 'INR') : '—'}</td>
                            <td className={'text-end fw-semibold ' + (out > 0 ? 'text-danger' : 'text-muted')}>{money(out, 'INR')}</td>
                            <td className="text-muted">{l.dateGiven ? fmtDate(l.dateGiven) : '—'}</td>
                            <td>{statusBadge(l)}</td>
                            <td className="text-end text-nowrap">
                              {out > 0 && <button className="btn btn-sm btn-soft-primary px-2 me-1" onClick={() => settle(l)} title="Mark fully returned"><i className="ri-check-line" /></button>}
                              <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => edit(l)} title="Edit"><i className="ri-pencil-line" /></button>
                              <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => del(l.id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="fw-semibold border-top">
                        <td>Total</td>
                        <td className="text-end">{money(totalLent, 'INR')}</td>
                        <td className="text-end text-success">{money(totalReturned, 'INR')}</td>
                        <td className="text-end text-danger">{money(outstanding, 'INR')}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
