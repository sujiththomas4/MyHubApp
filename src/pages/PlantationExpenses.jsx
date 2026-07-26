import { useState } from 'react'
import { money, fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import PropertyBar from '@/components/plantation/PropertyBar'
import {
  usePlantationCapital,
  usePlantationExpenses, addExpense, editExpense, removeExpense, settleExpense,
} from '@/data/plantationFinanceRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import { useLookups, valuesFor, EXPENSE_CATEGORY_LIST } from '@/data/lookupsRepo'
import { useLands, landLabel } from '@/data/plantationLandRepo'

/**
 * PlantationExpenses.jsx — money spent (route /business/plantations/expenses).
 * Category comes from master data; Paid by from profiles. Individual-paid
 * expenses show unsettled until reimbursed.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const cls = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')

export default function PlantationExpenses() {
  const { expenses } = usePlantationExpenses()
  const { capital } = usePlantationCapital()
  const { profiles } = useProfiles()
  const { lookups } = useLookups()
  const { lands } = useLands()

  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const categories = valuesFor(lookups, EXPENSE_CATEGORY_LIST)
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const [property, setProperty] = useState('')
  const scopedExpenses = property ? expenses.filter((e) => e.landId === property) : expenses
  const scopedCapital = property ? capital.filter((c) => c.landId === property) : capital

  const totalCapital = scopedCapital.reduce((s, c) => s + c.amount, 0)
  const totalSpent = scopedExpenses.reduce((s, e) => s + e.amount, 0)
  const balance = totalCapital - totalSpent
  const unsettled = scopedExpenses.filter((e) => e.source === 'personal' && !e.settled)
  const owed = unsettled.reduce((s, e) => s + e.amount, 0)

  const fields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts },
    { key: 'title', label: 'Item / purpose', type: 'text', placeholder: 'e.g. 2 bags urea', required: true },
    { key: 'category', label: 'Category', type: 'select', colClass: 'col-6', options: [{ value: '', label: '— none —' }, ...categories.map((c) => ({ value: c, label: c }))] },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true, colClass: 'col-6' },
    { key: 'billDate', label: 'Bill date', type: 'date', colClass: 'col-6' },
    { key: 'paidBy', label: 'Paid by', type: 'search', options: people, allowCustom: true, placeholder: 'Search people…', colClass: 'col-6' },
    { key: 'source', label: 'Paid from', type: 'select', colClass: 'col-6', options: [{ value: 'capital', label: 'Business capital' }, { value: 'personal', label: 'Individual (to settle)' }] },
    { key: 'settled', label: 'Reimbursed', type: 'switch', switchLabel: 'Settled', colClass: 'col-6', showIf: (f) => f.source === 'personal' },
    { key: 'settledDate', label: 'Settled on', type: 'date', showIf: (f) => f.source === 'personal' && f.settled },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Bill photo', type: 'image', folder: 'plantation/expenses' },
  ]
  const makeBlank = () => ({ landId: '', title: '', category: '', amount: '', billDate: todayISO(), paidBy: '', source: 'capital', settled: false, settledDate: '', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editExpense(f); else await addExpense({ ...f, id: 'exp-' + rid() }) }
  const statusBadge = (e) => {
    if (e.source === 'capital') return <span className="badge bg-info-subtle text-info">From capital</span>
    if (e.settled) return <span className="badge bg-success-subtle text-success">Settled{e.settledDate ? ` · ${fmtDate(e.settledDate)}` : ''}</span>
    return <span className="badge bg-danger-subtle text-danger">Unsettled</span>
  }
  const columns = [
    {
      header: 'Item',
      cell: (e) => (
        <div className="d-flex align-items-center gap-2">
          {e.image && <img src={e.image} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />}
          <div>
            <div className="fw-medium">{e.title}</div>
            {e.category && <span className="badge bg-light text-muted">{e.category}</span>}
          </div>
        </div>
      ),
    },
    { header: 'Property', className: 'text-muted', cell: (e) => landName(e.landId) || '—' },
    { header: 'Amount', className: 'text-end', cell: (e) => <span className="fw-semibold">{money(e.amount, 'INR')}</span> },
    { header: 'Bill date', className: 'text-muted', cell: (e) => (e.billDate ? fmtDate(e.billDate) : '—') },
    { header: 'Paid by', cell: (e) => e.paidBy || '—' },
    { header: 'Status', cell: statusBadge },
  ]
  const rowExtra = (e) => (e.source === 'personal' && !e.settled
    ? <button className="btn btn-sm btn-soft-primary px-2 me-1" onClick={() => settleExpense(e.id)} title="Mark reimbursed"><i className="ri-check-line me-1" />Settle</button>
    : null)

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Expenses</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Expenses</li>
          </ol>
        </nav>
      </div>

      <PropertyBar value={property} onChange={setProperty} />

      <div className="row g-3 mb-3">
        <div className="col-md-4 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Spent</span></div><div className="stat-icon bg-danger-subtle text-danger"><i className="ri-arrow-up-circle-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-danger">{money(totalSpent, 'INR')}</h4>
          <span className="text-muted small">{scopedExpenses.length} expense{scopedExpenses.length === 1 ? '' : 's'}</span>
        </div></div></div>
        <div className="col-md-4 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Balance</span></div><div className={'stat-icon bg-' + (balance >= 0 ? 'primary' : 'warning') + '-subtle text-' + (balance >= 0 ? 'primary' : 'warning')}><i className="ri-wallet-3-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + cls(balance)}>{money(balance, 'INR')}</h4>
          <span className="text-muted small">capital {money(totalCapital, 'INR')} − spent</span>
        </div></div></div>
        <div className="col-md-4 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Owed to individuals</span></div><div className="stat-icon bg-warning-subtle text-warning"><i className="ri-hand-coin-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + (owed > 0 ? 'text-warning' : 'text-muted')}>{money(owed, 'INR')}</h4>
          <span className="text-muted small">{unsettled.length} unsettled</span>
        </div></div></div>
      </div>

      <CrudCard
        title="Expenses" addLabel="Add expense" modalTitle="expense" emptyText="No expenses recorded yet."
        rows={scopedExpenses} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeExpense}
        rowExtra={rowExtra}
      />
    </div>
  )
}
