import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { savings, savingsCategories, savingsStats, money, fmtDate } from '@/data/AppData'
import { useFx } from '@/context/FxContext'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * SavingsCategory.jsx
 * -----------------------------------------------------------------------------
 * One savings category (route /wealth/savings/:category): its holdings with
 * add / edit / delete. `lockedYears === 0` shows as Withdrawable, otherwise
 * Locked with the years + derived unlock date. Local state (seeded from AppData).
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)

// Unlock date = start + lockedYears; also whether the lock has already lapsed.
function lockInfo(s) {
  if (!s.lockedYears) return { locked: false }
  const d = new Date(s.startDate + 'T00:00:00')
  const unlock = new Date(d.getFullYear() + s.lockedYears, d.getMonth(), d.getDate())
  return { locked: unlock > new Date(), unlockISO: unlock.toISOString().slice(0, 10) }
}

function SavingForm({ initial, defaultCurrency = 'INR', onSave, onCancel }) {
  const [f, setF] = useState({
    name: initial?.name || '',
    currency: initial?.currency || defaultCurrency,
    invested: initial?.invested ?? '',
    currentValue: initial?.currentValue ?? '',
    startDate: initial?.startDate || todayISO(),
    lockedYears: initial?.lockedYears ?? 0,
    note: initial?.note || '',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const num = (v) => Math.round(parseFloat(v) || 0)
  const save = () => onSave({
    id: initial?.id || 'sv-' + rid(),
    name: f.name.trim() || 'Untitled',
    currency: f.currency,
    invested: num(f.invested),
    currentValue: num(f.currentValue),
    startDate: f.startDate,
    lockedYears: parseInt(f.lockedYears) || 0,
    note: f.note.trim(),
  })

  return (
    <>
      <div className="row g-2">
        <div className="col-md-5">
          <label className="form-label small mb-1">Name</label>
          <input className="form-control form-control-sm" placeholder="e.g. Infosys / PPF" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Currency</label>
          <select className="form-select form-select-sm" value={f.currency} onChange={(e) => set('currency', e.target.value)}>
            <option value="INR">INR</option>
            <option value="AED">AED</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Invested</label>
          <input type="number" className="form-control form-control-sm" value={f.invested} onChange={(e) => set('invested', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Current value</label>
          <input type="number" className="form-control form-control-sm" value={f.currentValue} onChange={(e) => set('currentValue', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Start date</label>
          <input type="date" className="form-control form-control-sm" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Locked years <span className="text-muted">(0 = withdrawable)</span></label>
          <input type="number" min="0" className="form-control form-control-sm" value={f.lockedYears} onChange={(e) => set('lockedYears', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add holding'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

export default function SavingsCategory() {
  const { category } = useParams()
  const { toINR } = useFx()
  const cat = useMemo(() => savingsCategories.find((c) => c.slug === category), [category])

  const [items, setItems] = useState([])
  const [adding, setAdding] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)

  useEffect(() => {
    setAdding(false); setEditRow(null); setDeleteRow(null)
    setItems(savings.filter((s) => s.category === category))
  }, [category])

  if (!cat) {
    return (
      <>
        <div className="page-title-box"><h4 className="mb-0">Not found</h4></div>
        <div className="card"><div className="card-body">
          <p className="mb-3">No savings category “{category}”.</p>
          <Link to="/wealth/savings" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to Savings</Link>
        </div></div>
      </>
    )
  }

  const s = savingsStats(items, toINR)
  const mixed = items.some((x) => x.currency === 'AED')
  const rows = [...items].sort((a, b) => toINR(b.currentValue, b.currency) - toINR(a.currentValue, a.currency))

  const addItem = (x) => { setItems((xs) => [...xs, { ...x, category }]); setAdding(false) }
  const updateItem = (x) => { setItems((xs) => xs.map((i) => (i.id === x.id ? { ...i, ...x } : i))); setEditRow(null) }
  const confirmDelete = () => { setItems((xs) => xs.filter((i) => i.id !== deleteRow.id)); setDeleteRow(null) }

  return (
    <div className="savings">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0"><i className={cat.icon + ' me-2 text-muted'} />{cat.name}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><Link to="/wealth/savings">Savings</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{cat.name}</li>
          </ol>
        </nav>
      </div>

      {/* Tiles */}
      <div className="row">
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Invested</span>
          <h4 className="stat-value mt-2 mb-0">{money(s.invested, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Current value</span>
          <h4 className="stat-value mt-2 mb-0">{money(s.value, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Gain</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(s.gain)}>{money(s.gain, 'INR')}</h4>
          <span className={'small ' + pnlClass(s.gain)}>{s.gainPct.toFixed(1)}%</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Withdrawable</span>
          <h4 className="stat-value mt-2 mb-0 text-success">{money(s.withdrawable, 'INR')}</h4>
          <span className="text-muted small">{money(s.locked, 'INR')} locked</span>
        </div></div></div>
      </div>

      {/* Holdings */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Holdings</h5>
          {mixed && <small className="text-muted me-2">Totals converted to INR</small>}
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add holding</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th><th className="text-end">Invested</th><th className="text-end">Value</th>
                  <th className="text-end">Gain</th><th>Start</th><th className="text-center">Lock</th>
                  <th>Note</th><th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No holdings yet.</td></tr>
                ) : rows.map((x) => {
                  const gain = x.currentValue - x.invested
                  const li = lockInfo(x)
                  return (
                    <tr key={x.id}>
                      <td className="fw-medium">{x.name}</td>
                      <td className="text-end">{money(x.invested, 'INR')}</td>
                      <td className="text-end">{money(x.currentValue, 'INR')}</td>
                      <td className={'text-end fw-semibold ' + pnlClass(gain)}>
                        {money(gain, 'INR')} <span className="small">({x.invested ? ((gain / x.invested) * 100).toFixed(1) : 0}%)</span>
                      </td>
                      <td>{fmtDate(x.startDate)}</td>
                      <td className="text-center">
                        {x.lockedYears === 0 ? (
                          <span className="badge bg-success"><i className="ri-lock-unlock-line me-1" />Withdrawable</span>
                        ) : (
                          <span className={'badge ' + (li.locked ? 'bg-warning' : 'bg-success')} title={li.unlockISO ? 'Unlocks ' + fmtDate(li.unlockISO) : ''}>
                            <i className={'me-1 ' + (li.locked ? 'ri-lock-line' : 'ri-lock-unlock-line')} />
                            {li.locked ? `Locked · ${x.lockedYears} yr` : 'Matured'}
                          </span>
                        )}
                      </td>
                      <td className="text-muted small">{x.note}</td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setEditRow(x)}><i className="ri-pencil-line" /></button>
                          <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDeleteRow(x)}><i className="ri-delete-bin-line" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td>Total</td>
                  <td className="text-end">{money(s.invested, 'INR')}</td>
                  <td className="text-end">{money(s.value, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(s.gain)}>{money(s.gain, 'INR')}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={adding || Boolean(editRow)}
        size="lg"
        title={editRow
          ? <><i className="ri-pencil-line me-2 text-primary" />Edit holding — {cat.name}</>
          : <><i className="ri-add-line me-2 text-primary" />New holding — {cat.name}</>}
        onClose={() => { setAdding(false); setEditRow(null) }}
      >
        <SavingForm
          key={editRow?.id || 'new'}
          initial={editRow}
          defaultCurrency={cat.currency}
          onSave={editRow ? updateItem : addItem}
          onCancel={() => { setAdding(false); setEditRow(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete holding?"
        message={deleteRow ? `“${deleteRow.name}” (${money(deleteRow.currentValue, 'INR')}) will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  )
}
