import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import { usePropagation, addPropagation, editPropagation, removePropagation } from '@/data/propagationRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import { usePlants, usePoles, useVerticals, useZones, useLands, landLabel } from '@/data/plantationLandRepo'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationPropagation.jsx — "Plant Factory": in-house plant development
 * (route /business/plantations/propagation). Tabs:
 *   Mother Plants · Thippali Nursery · Layering Unit · Grafting Unit ·
 *   Bush Pepper · Production Planning · Nursery Inventory · Reports
 * The four method tabs share one batch tracker (type locked per tab).
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const STATUS = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'planted', label: 'Planted out' },
  { value: 'failed', label: 'Failed' },
]
const STATUS_BADGE = {
  in_progress: 'bg-warning-subtle text-dark',
  ready: 'bg-success-subtle text-success',
  planted: 'bg-primary-subtle text-primary',
  failed: 'bg-danger-subtle text-danger',
}
const STATUS_LABEL = Object.fromEntries(STATUS.map((s) => [s.value, s.label]))
const TABS = [
  { id: 'mothers', label: 'Mother Plants', icon: 'ri-plant-line' },
  { id: 'thippali', label: 'Thippali Nursery', method: 'Thippali Nursery', icon: 'ri-seedling-line' },
  { id: 'layering', label: 'Layering Unit', method: 'Layering Unit', icon: 'ri-git-branch-line' },
  { id: 'grafting', label: 'Grafting Unit', method: 'Grafting Unit', icon: 'ri-scissors-cut-line' },
  { id: 'bush', label: 'Bush Pepper', method: 'Bush Pepper', icon: 'ri-leaf-line' },
  { id: 'planning', label: 'Production Planning', icon: 'ri-calendar-schedule-line' },
  { id: 'inventory', label: 'Nursery Inventory', icon: 'ri-archive-2-line' },
  { id: 'reports', label: 'Reports', icon: 'ri-bar-chart-2-line' },
]

// Shared plant-label helper (tag · Zone / Row) from the hierarchy.
function usePlantOptions() {
  const { plants } = usePlants()
  const { poles } = usePoles()
  const { verticals } = useVerticals()
  const { zones } = useZones()
  const poleById = Object.fromEntries(poles.map((p) => [p.id, p]))
  const vertById = Object.fromEntries(verticals.map((v) => [v.id, v]))
  const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]))
  const label = (p) => {
    const pole = poleById[p.poleId]; const v = pole && vertById[pole.verticalId]; const z = v && zoneById[v.zoneId]
    const loc = [z?.name, v?.name].filter(Boolean).join(' / ')
    return `${p.tag || p.variety || 'Plant'}${loc ? ' · ' + loc : ''}`
  }
  const landOfPlant = (p) => {
    const pole = poleById[p.poleId]; const v = pole && vertById[pole.verticalId]; const z = v && zoneById[v.zoneId]
    return z?.landId || ''
  }
  return {
    plants,
    options: plants.map((p) => ({ value: p.id, label: label(p) })),
    labelById: Object.fromEntries(plants.map((p) => [p.id, label(p)])),
    landOfPlant,
  }
}

export default function PlantationPropagation() {
  const [tab, setTab] = useState('thippali')
  const [property, setProperty] = useState('')
  const active = TABS.find((t) => t.id === tab)

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Plant Factory</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Plant Factory</li>
          </ol>
        </nav>
      </div>

      <div className="pf-tabs mb-3">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={'pf-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <i className={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <PropertyBar value={property} onChange={setProperty} />

      {active.method && <BatchTracker lockType={active.method} property={property} />}
      {tab === 'mothers' && <MotherPlants property={property} />}
      {tab === 'inventory' && <NurseryInventory property={property} />}
      {tab === 'reports' && <Reports property={property} />}
      {tab === 'planning' && (
        <div className="card mb-0"><div className="card-body text-center text-muted py-5">
          <i className="ri-calendar-schedule-line fs-1 d-block mb-2" />
          <h5 className="mb-1">Production Planning</h5>
          <p className="mb-0">Set targets per method/season and track progress against them. Tell me the fields you want and I&apos;ll build it.</p>
        </div></div>
      )}
    </div>
  )
}

// ---- Batch tracker (one propagation method) --------------------------------
function BatchTracker({ lockType, property }) {
  const { batches } = usePropagation()
  const { profiles } = useProfiles()
  const { lands } = useLands()
  const { options: plantOpts, labelById: plantLabelById } = usePlantOptions()
  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const [filters, setFilters] = useState({ q: '', status: '' })
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const anyFilter = filters.q || filters.status

  const mine = batches.filter((b) => b.type === lockType && (!property || b.landId === property))
  const activeB = mine.filter((b) => b.status !== 'failed')
  const inProgress = mine.filter((b) => b.status === 'in_progress').length
  const created = activeB.reduce((s, b) => s + b.quantity, 0)
  const ready = activeB.reduce((s, b) => s + b.readyQty, 0)

  const matches = (b) => {
    if (filters.status && b.status !== filters.status) return false
    if (filters.q) {
      const hay = [b.label, b.location, b.assigned, b.note, plantLabelById[b.parentPlantId] || ''].join(' ').toLowerCase()
      if (!hay.includes(filters.q.toLowerCase())) return false
    }
    return true
  }
  const rows = mine.filter(matches)

  const fields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts, colClass: 'col-md-6' },
    { key: 'parentPlantId', label: 'Parent plant (zone / row)', type: 'search', options: plantOpts, placeholder: 'Search plants…', colClass: 'col-md-6' },
    { key: 'label', label: 'Batch name / code', type: 'text', colClass: 'col-md-6' },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'Zone / shed', colClass: 'col-md-4' },
    { key: 'startDate', label: 'Start date', type: 'date', colClass: 'col-md-4' },
    { key: 'expectedDate', label: 'Expected ready', type: 'date', colClass: 'col-md-4' },
    { key: 'quantity', label: 'Plants created', type: 'number', colClass: 'col-md-4' },
    { key: 'readyQty', label: 'Ready', type: 'number', colClass: 'col-md-4' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, colClass: 'col-md-4' },
    { key: 'assigned', label: 'Assigned to', type: 'search', options: people, placeholder: 'Search people…', colClass: 'col-md-6' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/propagation' },
  ]
  const makeBlank = () => ({ type: lockType, landId: '', parentPlantId: '', label: '', location: '', startDate: todayISO(), expectedDate: '', quantity: '', readyQty: '', status: 'in_progress', assigned: '', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editPropagation(f); else await addPropagation({ ...f, id: 'prop-' + rid(), type: lockType }) }

  const columns = [
    {
      header: 'Batch',
      cell: (b) => (
        <div className="d-flex align-items-center gap-2">
          {b.image && <img src={b.image} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />}
          <div>
            <div className="fw-medium">{b.label || '—'}</div>
            {b.parentPlantId && <div className="text-muted small"><i className="ri-parent-line me-1" />{plantLabelById[b.parentPlantId] || 'parent'}</div>}
          </div>
        </div>
      ),
    },
    { header: 'Property', className: 'text-muted', cell: (b) => landName(b.landId) || '—' },
    { header: 'Location', className: 'text-muted', cell: (b) => b.location || '—' },
    { header: 'Created', className: 'text-center', cell: (b) => b.quantity || '—' },
    { header: 'Ready', className: 'text-center', cell: (b) => <span className={b.readyQty ? 'text-success fw-semibold' : 'text-muted'}>{b.readyQty || '—'}</span> },
    { header: 'Expected', className: 'text-muted', cell: (b) => (b.expectedDate ? fmtDate(b.expectedDate) : '—') },
    { header: 'Assigned', cell: (b) => (b.assigned ? <span className="badge bg-info-subtle text-info">{b.assigned}</span> : '—') },
    { header: 'Status', cell: (b) => <span className={'badge ' + (STATUS_BADGE[b.status] || STATUS_BADGE.in_progress)}>{STATUS_LABEL[b.status] || b.status}</span> },
  ]

  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Batches</span></div><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-stack-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{mine.length}</h4>
        </div></div></div>
        <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">In progress</span></div><div className="stat-icon bg-warning-subtle text-warning"><i className="ri-loader-4-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{inProgress}</h4><span className="text-muted small">batches</span>
        </div></div></div>
        <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Created</span></div><div className="stat-icon bg-info-subtle text-info"><i className="ri-seedling-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{created}</h4><span className="text-muted small">plants</span>
        </div></div></div>
        <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Ready</span></div><div className="stat-icon bg-success-subtle text-success"><i className="ri-plant-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{ready}</h4><span className="text-muted small">plants</span>
        </div></div></div>
      </div>

      <div className="card">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md"><input type="text" className="form-control form-control-sm" placeholder="Search batch, parent, location, assigned…" value={filters.q} onChange={(e) => setF('q', e.target.value)} /></div>
            <div className="col-6 col-md-auto">
              <select className="form-select form-select-sm" value={filters.status} onChange={(e) => setF('status', e.target.value)}>
                <option value="">All statuses</option>
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {anyFilter && <div className="col-auto"><button className="btn btn-sm btn-ghost-danger" onClick={() => setFilters({ q: '', status: '' })}><i className="ri-close-line me-1" />Clear</button></div>}
          </div>
        </div>
      </div>
      <CrudCard
        title={`${lockType} (${rows.length}${anyFilter ? ' of ' + mine.length : ''})`}
        addLabel="Add batch" modalTitle={lockType.toLowerCase() + ' batch'} modalSize="lg"
        emptyText={anyFilter ? 'No batches match.' : `No ${lockType.toLowerCase()} batches yet.`}
        rows={rows} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removePropagation}
      />
    </>
  )
}

// ---- Mother Plants ---------------------------------------------------------
function MotherPlants({ property }) {
  const { plants, labelById, landOfPlant } = usePlantOptions()
  const { batches } = usePropagation()
  const childrenOf = (plantId) => batches.filter((b) => b.parentPlantId === plantId).reduce((s, b) => s + b.quantity, 0)
  const shown = property ? plants.filter((p) => landOfPlant(p) === property) : plants
  const rows = shown
    .map((p) => ({ id: p.id, label: labelById[p.id], variety: p.variety || '', tag: p.tag || '', children: childrenOf(p.id) }))
    .sort((a, b) => b.children - a.children)

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1">Mother plants</h5>
        <span className="text-muted small">from Explorer · children created from each</span>
      </div>
      <div className="card-body p-0">
        {rows.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">No plants yet. Add plants in the Explorer to use them as mothers.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Plant</th><th>Variety</th><th className="text-center">Children created</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-medium">{r.label}</td>
                    <td className="text-muted">{r.variety || '—'}</td>
                    <td className="text-center">{r.children ? <span className="badge bg-success-subtle text-success">{r.children}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Nursery Inventory (ready stock by method) -----------------------------
function NurseryInventory({ property }) {
  const { batches: all } = usePropagation()
  const batches = property ? all.filter((b) => b.landId === property) : all
  const m = new Map()
  batches.filter((b) => b.status === 'ready').forEach((b) => {
    const k = b.type || '—'
    m.set(k, (m.get(k) || 0) + b.readyQty)
  })
  const rows = [...m.entries()].map(([type, qty]) => ({ type, qty })).sort((a, b) => b.qty - a.qty)
  const total = rows.reduce((s, r) => s + r.qty, 0)

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1">Nursery inventory</h5>
        <span className="text-muted small">ready-to-plant stock</span>
      </div>
      <div className="card-body p-0">
        {rows.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">No ready stock. Mark batches “Ready” to build inventory.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Type</th><th className="text-end">Ready plants</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.type}><td className="fw-medium">{r.type}</td><td className="text-end text-success fw-semibold">{r.qty}</td></tr>)}</tbody>
              <tfoot><tr className="fw-semibold border-top"><td>Total available</td><td className="text-end text-success">{total}</td></tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Reports (by type + by status) -----------------------------------------
function Reports({ property }) {
  const { batches: all } = usePropagation()
  const batches = property ? all.filter((b) => b.landId === property) : all
  const byType = new Map()
  batches.forEach((b) => {
    const k = b.type || '—'
    const g = byType.get(k) || { key: k, count: 0, created: 0, ready: 0 }
    g.count += 1; g.created += b.quantity; g.ready += b.readyQty
    byType.set(k, g)
  })
  const typeRows = [...byType.values()].sort((a, b) => b.created - a.created)
  const statusRows = STATUS.map((s) => ({ ...s, count: batches.filter((b) => b.status === s.value).length }))

  return (
    <div className="row g-3">
      <div className="col-xl-8">
        <div className="card mb-0 h-100">
          <div className="card-header"><h5 className="card-title mb-0">By propagation method</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Method</th><th className="text-center">Batches</th><th className="text-center">Created</th><th className="text-center">Ready</th><th className="text-end">Success %</th></tr></thead>
                <tbody>
                  {typeRows.length === 0 ? <tr><td colSpan={5} className="text-muted text-center py-3">No batches yet.</td></tr> : typeRows.map((g) => (
                    <tr key={g.key}>
                      <td className="fw-medium">{g.key}</td>
                      <td className="text-center">{g.count}</td>
                      <td className="text-center">{g.created}</td>
                      <td className="text-center text-success">{g.ready}</td>
                      <td className="text-end">{g.created ? Math.round((g.ready / g.created) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="col-xl-4">
        <div className="card mb-0 h-100">
          <div className="card-header"><h5 className="card-title mb-0">By status</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Status</th><th className="text-end">Batches</th></tr></thead>
                <tbody>{statusRows.map((s) => <tr key={s.value}><td><span className={'badge ' + STATUS_BADGE[s.value]}>{s.label}</span></td><td className="text-end">{s.count}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
