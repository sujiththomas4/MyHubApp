import { money } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useIncomePlans, addIncomePlan, editIncomePlan, removeIncomePlan,
  FREQUENCY, toMonthly, perDay, perYear,
} from '@/data/incomePlannerRepo'

/**
 * IncomePlanner.jsx — plan projected income sources (route /money/income-planner).
 * Each source has an expected return + cadence; totals are normalised to show how
 * much can be earned per day / month / year. Backend-only.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const FREQ_LABEL = Object.fromEntries(FREQUENCY.map((f) => [f.value, f.label]))

export default function IncomePlanner() {
  const { plans } = useIncomePlans()

  const totalMonthly = plans.reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0)

  const fields = [
    { key: 'type', label: 'Income type', type: 'text', placeholder: 'e.g. Pepper sales, Rent, Nursery plants', required: true, colClass: 'col-md-6' },
    { key: 'amount', label: 'Expected return (₹)', type: 'number', required: true, colClass: 'col-md-3' },
    { key: 'frequency', label: 'Per', type: 'select', options: FREQUENCY, colClass: 'col-md-3' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const makeBlank = () => ({ type: '', amount: '', frequency: 'monthly', note: '' })
  const onSave = async (f) => { if (f.id) await editIncomePlan(f); else await addIncomePlan({ ...f, id: 'inc-' + rid(), sortOrder: plans.length }) }

  const columns = [
    { header: 'Income type', cell: (p) => (<><div className="fw-medium">{p.type}</div>{p.note && <div className="text-muted small">{p.note}</div>}</>) },
    { header: 'Expected', className: 'text-end', cell: (p) => <span className="fw-semibold">{money(Number(p.amount) || 0, 'INR')}</span> },
    { header: 'Per', cell: (p) => <span className="badge bg-light text-muted">{FREQ_LABEL[p.frequency] || p.frequency}</span> },
    { header: 'Per month', className: 'text-end text-success', cell: (p) => money(Math.round(toMonthly(p.amount, p.frequency)), 'INR') },
  ]

  const Tile = ({ label, value, icon, tone, highlight }) => (
    <div className="col-md-4 col-6">
      <div className={'card stat-card h-100 mb-0' + (highlight ? ' border border-2 border-success' : '')}><div className="card-body">
        <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
        <h4 className={'stat-value mt-3 mb-0 ' + (highlight ? 'text-success' : '')}>{money(Math.round(value), 'INR')}</h4>
      </div></div>
    </div>
  )

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Income Planner</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Money</li>
            <li className="breadcrumb-item active" aria-current="page">Income Planner</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3 mb-3">
        <Tile label="Per day" value={perDay(totalMonthly)} icon="ri-sun-line" tone="info" />
        <Tile label="Per month" value={totalMonthly} icon="ri-calendar-2-line" tone="success" highlight />
        <Tile label="Per year" value={perYear(totalMonthly)} icon="ri-calendar-check-line" tone="primary" />
      </div>

      <CrudCard
        title="Income sources" addLabel="Add income" modalTitle="income" modalSize="lg"
        emptyText="No income sources yet. Add expected returns to see monthly potential. 💰"
        rows={plans} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeIncomePlan}
      />
    </div>
  )
}
