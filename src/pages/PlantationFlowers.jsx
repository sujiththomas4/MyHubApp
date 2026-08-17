import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useFlowers, addFlower, editFlower, removeFlower, useFlowerRefs,
  FLOWER_STATUS, FLOWER_STATUS_BADGE, FLOWER_STATUS_LABEL,
  isLive, daysUntil, growDays,
} from '@/data/flowersRepo'

/**
 * PlantationFlowers.jsx — the "Flowers" tab inside Plant Factory. A flower plan
 * is date-anchored at both ends (start → planned delivery), so the register is
 * sorted by delivery date and every live row is scored against it: due soon,
 * due today, or overdue. References live on the detail page.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)

/** The delivery-date verdict for a row — the reason this tab exists. */
function DeliveryCell({ f }) {
  if (!f.deliveryDate) return <span className="text-muted">—</span>
  const d = daysUntil(f.deliveryDate)
  const date = <div>{fmtDate(f.deliveryDate)}</div>
  if (!isLive(f)) return <div className="text-muted">{date}</div>
  let cls = 'text-muted'; let text = `in ${d} days`
  if (d < 0) { cls = 'text-danger fw-semibold'; text = `overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}` }
  else if (d === 0) { cls = 'text-danger fw-semibold'; text = 'due today' }
  else if (d <= 7) { cls = 'text-warning fw-semibold'; text = `in ${d} day${d === 1 ? '' : 's'}` }
  return <>{date}<div className={'small ' + cls}>{text}</div></>
}

export function FlowersPanel({ showTiles = true }) {
  const { flowers } = useFlowers()
  const { refs } = useFlowerRefs()
  const refCount = (id) => refs.filter((r) => r.flowerId === id).length

  const fields = [
    { key: 'name', label: 'Flower', type: 'text', placeholder: 'e.g. Marigold, Jasmine, Orchid', required: true, colClass: 'col-md-8' },
    { key: 'status', label: 'Status', type: 'select', options: FLOWER_STATUS, colClass: 'col-md-4' },
    { key: 'variety', label: 'Variety / specification', type: 'text', placeholder: 'e.g. African tall, orange', colClass: 'col-md-8' },
    { key: 'quantity', label: 'Quantity', type: 'number', colClass: 'col-md-4' },
    { key: 'startDate', label: 'Start date', type: 'date', colClass: 'col-md-4' },
    { key: 'deliveryDate', label: 'Planned delivery', type: 'date', colClass: 'col-md-4' },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'Zone / shed / bed', colClass: 'col-md-4' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/flowers' },
  ]
  const makeBlank = () => ({ name: '', variety: '', status: 'planned', startDate: todayISO(), deliveryDate: '', quantity: '', location: '', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editFlower(f); else await addFlower({ ...f, id: 'flw-' + rid(), sortOrder: flowers.length }) }

  const columns = [
    {
      header: 'Flower',
      cell: (f) => (
        <div className="d-flex align-items-center gap-2">
          {f.image
            ? <img src={f.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
            : <span className="stat-icon bg-danger-subtle text-danger" style={{ width: 36, height: 36 }}><i className="ri-flower-line" /></span>}
          <div>
            <div className="fw-medium">{f.name}</div>
            {f.variety && <div className="text-muted small">{f.variety}</div>}
          </div>
        </div>
      ),
    },
    { header: 'Status', cell: (f) => <span className={'badge fw-normal ' + (FLOWER_STATUS_BADGE[f.status] || FLOWER_STATUS_BADGE.planned)}>{FLOWER_STATUS_LABEL[f.status] || f.status}</span> },
    { header: 'Start', className: 'text-muted', cell: (f) => (f.startDate ? fmtDate(f.startDate) : '—') },
    { header: 'Planned delivery', cell: (f) => <DeliveryCell f={f} /> },
    { header: 'Grow window', className: 'text-muted text-center', cell: (f) => { const g = growDays(f); return g == null ? '—' : `${g} days` } },
    { header: 'Qty', className: 'text-center', cell: (f) => (f.quantity !== '' && f.quantity != null ? f.quantity : '—') },
    { header: 'Location', className: 'text-muted', cell: (f) => f.location || '—' },
    { header: 'References', cell: (f) => { const n = refCount(f.id); return n > 0 ? <span className="badge bg-info-subtle text-info"><i className="ri-contacts-line me-1" />{n}</span> : <span className="text-muted">—</span> } },
  ]

  const live = flowers.filter(isLive)
  const overdue = live.filter((f) => f.deliveryDate && daysUntil(f.deliveryDate) < 0).length
  const dueSoon = live.filter((f) => { const d = f.deliveryDate ? daysUntil(f.deliveryDate) : null; return d != null && d >= 0 && d <= 7 }).length
  const delivered = flowers.filter((f) => f.status === 'delivered').length

  return (
    <>
      {showTiles && (
        <div className="row g-3 mb-3">
          <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Active plans</span></div><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-flower-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0">{live.length}</h4>
          </div></div></div>
          <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Due in 7 days</span></div><div className="stat-icon bg-warning-subtle text-warning"><i className="ri-time-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0">{dueSoon}</h4>
          </div></div></div>
          <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Overdue</span></div><div className="stat-icon bg-danger-subtle text-danger"><i className="ri-alarm-warning-line" /></div></div>
            <h4 className={'stat-value mt-3 mb-0' + (overdue ? ' text-danger' : '')}>{overdue}</h4>
          </div></div></div>
          <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Delivered</span></div><div className="stat-icon bg-success-subtle text-success"><i className="ri-check-double-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0 text-success">{delivered}</h4>
          </div></div></div>
        </div>
      )}

      <CrudCard
        title="Flower plans" addLabel="Add flower" modalTitle="flower plan" modalSize="lg"
        emptyText="No flowers planned yet. Add one with a start date and a planned delivery date. 🌼"
        rows={flowers} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeFlower}
        openTo={(f) => `/business/plantations/flowers/${f.id}`} openLabel="References"
      />
    </>
  )
}

export default function PlantationFlowers() {
  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Flowers</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Flowers</li>
          </ol>
        </nav>
      </div>
      <FlowersPanel />
    </div>
  )
}
