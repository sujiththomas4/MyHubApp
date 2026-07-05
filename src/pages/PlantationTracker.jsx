import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  plantationEntries, plantationIncomeCategories, plantationExpenseCategories, money, fmtDate,
} from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * PlantationTracker.jsx
 * -----------------------------------------------------------------------------
 * Income / Expense ledger for the plantation as two tabs. Totals across both
 * give the profit / loss. Add / edit / delete entries, each with a due date and
 * a settled / pending status. Entries are local state (seeded from AppData).
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const isOverdue = (e) => e.status === 'pending' && e.dueDate < todayISO()

// --- Add / edit form ---------------------------------------------------------
function EntryForm({ initial, type, onSave, onCancel }) {
  const cats = type === 'income' ? plantationIncomeCategories : plantationExpenseCategories
  const [f, setF] = useState({
    date: initial?.date || todayISO(),
    dueDate: initial?.dueDate || initial?.date || todayISO(),
    category: initial?.category || cats[0],
    amount: initial?.amount ?? '',
    status: initial?.status || 'settled',
    note: initial?.note || '',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = () => onSave({
    id: initial?.id || 'pe-' + rid(),
    type,
    date: f.date,
    dueDate: f.dueDate || f.date,
    category: f.category,
    amount: Math.round(parseFloat(f.amount) || 0),
    status: f.status,
    note: f.note.trim(),
  })

  return (
    <>
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Due date</label>
          <input type="date" className="form-control form-control-sm" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Amount (₹)</label>
          <input type="number" className="form-control form-control-sm" value={f.amount} onChange={(e) => set('amount', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Category</label>
          <select className="form-select form-select-sm" value={f.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Status</label>
          <select className="form-select form-select-sm" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="settled">Settled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add entry'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

export default function PlantationTracker() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tab = pathname.endsWith('/expense') ? 'expense' : 'income'

  const [entries, setEntries] = useState(plantationEntries)
  const [adding, setAdding] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)

  const totals = useMemo(() => {
    const income = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const expense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const pending = entries.filter((e) => e.status === 'pending')
      .reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0)
    return { income, expense, net: income - expense, pending }
  }, [entries])

  const rows = entries.filter((e) => e.type === tab).sort((a, b) => b.date.localeCompare(a.date))

  const addEntry = (e) => { setEntries((es) => [...es, e]); setAdding(false) }
  const updateEntry = (e) => { setEntries((es) => es.map((x) => (x.id === e.id ? e : x))); setEditRow(null) }
  const confirmDelete = () => { setEntries((es) => es.filter((x) => x.id !== deleteRow.id)); setDeleteRow(null) }

  const profit = totals.net >= 0

  return (
    <div className="plantation">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Plantation — Income &amp; Expense</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Plantation</li>
          </ol>
        </nav>
      </div>

      {/* Summary tiles */}
      <div className="row">
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Income</span>
          <h4 className="stat-value mt-2 mb-0 text-success">{money(totals.income, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Expense</span>
          <h4 className="stat-value mt-2 mb-0 text-danger">{money(totals.expense, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">{profit ? 'Profit' : 'Loss'}</span>
          <h4 className={'stat-value mt-2 mb-0 ' + (profit ? 'text-success' : 'text-danger')}>{money(totals.net, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Pending (net)</span>
          <h4 className="stat-value mt-2 mb-0">{money(totals.pending, 'INR')}</h4>
          <span className="text-muted small">receivable − payable</span>
        </div></div></div>
      </div>

      {/* Ledger */}
      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <ul className="nav nav-pills flex-grow-1">
            <li className="nav-item">
              <button className={'nav-link ' + (tab === 'income' ? 'active' : '')} onClick={() => navigate('/business/plantations/income')}>
                <i className="ri-arrow-down-circle-line me-1" />Income
              </button>
            </li>
            <li className="nav-item">
              <button className={'nav-link ' + (tab === 'expense' ? 'active' : '')} onClick={() => navigate('/business/plantations/expense')}>
                <i className="ri-arrow-up-circle-line me-1" />Expense
              </button>
            </li>
          </ul>
          <Link to="/business/plantations/activities" className="btn btn-light btn-sm"><i className="ri-list-check-2 me-1" />Activities</Link>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add {tab}</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Due date</th>
                  <th>Category</th>
                  <th className="text-end">Amount</th>
                  <th className="text-center">Status</th>
                  <th>Note</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-4">No {tab} entries yet.</td></tr>
                ) : rows.map((e) => (
                  <tr key={e.id}>
                    <td className="fw-medium">{fmtDate(e.date)}</td>
                    <td className={isOverdue(e) ? 'text-danger' : ''}>
                      {fmtDate(e.dueDate)}{isOverdue(e) && <i className="ri-alarm-warning-line ms-1" title="Overdue" />}
                    </td>
                    <td>{e.category}</td>
                    <td className={'text-end fw-semibold ' + (tab === 'income' ? 'text-success' : 'text-danger')}>{money(e.amount, 'INR')}</td>
                    <td className="text-center">
                      <span className={'badge ' + (e.status === 'settled' ? 'bg-success' : 'bg-warning')}>
                        {e.status === 'settled' ? 'Settled' : 'Pending'}
                      </span>
                    </td>
                    <td className="text-muted small">{e.note}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setEditRow(e)}><i className="ri-pencil-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDeleteRow(e)}><i className="ri-delete-bin-line" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td colSpan={3}>Total {tab}</td>
                  <td className="text-end">{money(tab === 'income' ? totals.income : totals.expense, 'INR')}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Add / edit popup */}
      <Modal
        open={adding || Boolean(editRow)}
        size="lg"
        title={editRow
          ? <><i className="ri-pencil-line me-2 text-primary" />Edit {editRow.type}</>
          : <><i className="ri-add-line me-2 text-primary" />New {tab}</>}
        onClose={() => { setAdding(false); setEditRow(null) }}
      >
        <EntryForm
          key={editRow?.id || 'new'}
          initial={editRow}
          type={editRow ? editRow.type : tab}
          onSave={editRow ? updateEntry : addEntry}
          onCancel={() => { setAdding(false); setEditRow(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete entry?"
        message={deleteRow ? `${deleteRow.category} · ${money(deleteRow.amount, 'INR')} (${fmtDate(deleteRow.date)}) will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  )
}
