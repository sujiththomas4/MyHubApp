import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import { usePropagation, addPropagation, editPropagation, removePropagation } from '@/data/propagationRepo'
import { PlannedCropsPanel } from '@/pages/PlantationPlannedCrops'
import { FlowersPanel } from '@/pages/PlantationFlowers'
import { useProfiles, personName } from '@/data/profilesRepo'
import { usePlants, usePoles, useVerticals, useZones, useLands, landLabel, editPlant } from '@/data/plantationLandRepo'
import HierarchyFilter, { MultiSelect } from '@/components/plantation/HierarchyFilter'
import { computeVisible, emptyHierarchyFilter } from '@/components/plantation/hierarchyScope'
import Modal from '@/components/ui/Modal'

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
  { id: 'plants', label: 'Plants', icon: 'ri-plant-fill' },
  { id: 'flowers', label: 'Flowers', icon: 'ri-flower-line' },
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
    plants, poles, verticals, zones,
    options: plants.map((p) => ({ value: p.id, label: label(p) })),
    motherOptions: plants.filter((p) => p.isMother).map((p) => ({ value: p.id, label: label(p) })),
    labelById: Object.fromEntries(plants.map((p) => [p.id, label(p)])),
    landOfPlant,
  }
}

export default function PlantationPropagation() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState(TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'plants')
  const [filter, setFilter] = useState(emptyHierarchyFilter)
  const [motherSel, setMotherSel] = useState(new Set())
  const active = TABS.find((t) => t.id === tab)

  const { lands } = useLands()
  const { plants, poles, verticals, zones, motherOptions } = usePlantOptions()
  const data = { lands, zones, verticals, poles, plants }
  const { keep } = computeVisible(filter, data)

  const landActive = filter.land.size > 0
  const deeperActive = filter.zone.size || filter.vertical.size || filter.pole.size || filter.plant.size
  const motherActive = motherSel.size > 0

  // A batch is scoped by its property and by its mother plant's position/identity.
  const matchBatch = (b) => {
    if (landActive && !keep.land.has(b.landId)) return false
    if (deeperActive && !(b.parentPlantId && keep.plant.has(b.parentPlantId))) return false
    if (motherActive && !motherSel.has(b.parentPlantId)) return false
    return true
  }
  const plantVisible = (id) => keep.plant.has(id)
  // Mother-plant dropdown options, limited to mothers within the current scope.
  const scopedMotherOptions = motherOptions.filter((o) => keep.plant.has(o.value))

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

      {lands.length > 0 && (
        <div className="card mb-3"><div className="card-body py-2 d-flex align-items-center flex-wrap gap-2">
          <HierarchyFilter data={data} value={filter} onChange={setFilter} />
          <MultiSelect icon="ri-plant-line" label="Mother plant" options={scopedMotherOptions} selected={motherSel} onChange={setMotherSel} />
        </div></div>
      )}

      {active.method && <BatchTracker lockType={active.method} matchBatch={matchBatch} />}
      {tab === 'plants' && <PlannedCropsPanel />}
      {tab === 'flowers' && <FlowersPanel />}
      {tab === 'mothers' && <MotherPlants plantVisible={plantVisible} motherSel={motherSel} data={data} />}
      {tab === 'inventory' && <NurseryInventory matchBatch={matchBatch} />}
      {tab === 'reports' && <Reports matchBatch={matchBatch} />}
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
function BatchTracker({ lockType, matchBatch }) {
  const { batches } = usePropagation()
  const { profiles } = useProfiles()
  const { lands } = useLands()
  const { motherOptions, labelById: plantLabelById } = usePlantOptions()
  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const [filters, setFilters] = useState({ q: '', status: '' })
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const anyFilter = filters.q || filters.status

  const mine = batches.filter((b) => b.type === lockType && matchBatch(b))
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
    { key: 'parentPlantId', label: 'Mother plant', type: 'search', options: motherOptions, placeholder: motherOptions.length ? 'Search mother plants…' : 'No mother plants — add them in the Mother Plants tab', colClass: 'col-md-6' },
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

// ---- Mother Plants (explicitly designated) ---------------------------------
function MotherPlants({ plantVisible, motherSel, data }) {
  const { plants, labelById } = usePlantOptions()
  const { batches } = usePropagation()
  const [adding, setAdding] = useState(false)

  const childrenOf = (plantId) => batches.filter((b) => b.parentPlantId === plantId).reduce((s, b) => s + b.quantity, 0)
  const inScope = (p) => plantVisible(p.id) && (!motherSel.size || motherSel.has(p.id))
  const mothers = plants.filter((p) => p.isMother && inScope(p))
  const rows = mothers
    .map((p) => ({ id: p.id, plant: p, label: labelById[p.id], variety: p.variety || '', children: childrenOf(p.id) }))
    .sort((a, b) => b.children - a.children)

  const existingMotherIds = new Set(plants.filter((p) => p.isMother).map((p) => p.id))
  const undesignate = (p) => editPlant({ ...p, isMother: false }).catch(console.error)
  const designateMany = async (ids) => {
    for (const id of ids) {
      const p = plants.find((x) => x.id === id)
      // eslint-disable-next-line no-await-in-loop
      if (p) await editPlant({ ...p, isMother: true })
    }
  }

  return (
    <>
      <div className="card mb-0">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Mother plants <span className="text-muted fs-13 fw-normal">({rows.length})</span></h5>
          <span className="text-muted small me-3 d-none d-md-inline">designate plants to use as parents for batches</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Designate mother plants</button>
        </div>
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">No mother plants designated. Add some to use as parents when creating batches.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Plant</th><th>Variety</th><th className="text-center">Children created</th><th className="text-end">Actions</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-medium"><i className="ri-plant-line text-success me-1" />{r.label}</td>
                      <td className="text-muted">{r.variety || '—'}</td>
                      <td className="text-center">{r.children ? <span className="badge bg-success-subtle text-success">{r.children}</span> : '—'}</td>
                      <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-2" title="Remove from mother plants" onClick={() => undesignate(r.plant)}><i className="ri-close-circle-line me-1" />Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DesignateMothersModal
        open={adding} data={data} labelById={labelById} existingMotherIds={existingMotherIds}
        onClose={() => setAdding(false)} onConfirm={designateMany}
      />
    </>
  )
}

// ---- Designate mother plants (filterable multi-select) ----------------------
function DesignateMothersModal({ open, data, labelById, existingMotherIds, onClose, onConfirm }) {
  const [filter, setFilter] = useState(emptyHierarchyFilter)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setFilter(emptyHierarchyFilter()); setQ(''); setSel(new Set()) } }, [open])

  const { keep } = computeVisible(filter, data)
  const candidates = (data.plants || [])
    .filter((p) => !existingMotherIds.has(p.id) && keep.plant.has(p.id))
    .filter((p) => !q || (labelById[p.id] || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (labelById[a.id] || '').localeCompare(labelById[b.id] || ''))

  const allSelected = candidates.length > 0 && candidates.every((p) => sel.has(p.id))
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => {
    const n = new Set(s)
    if (allSelected) candidates.forEach((p) => n.delete(p.id))
    else candidates.forEach((p) => n.add(p.id))
    return n
  })

  const confirm = async () => {
    setSaving(true)
    try { await onConfirm([...sel]); onClose() }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} size="lg" title={<><i className="ri-plant-line me-2 text-success" />Designate mother plants</>} onClose={onClose}>
      <HierarchyFilter data={data} value={filter} onChange={setFilter} hide={['plant']} />
      <div className="d-flex align-items-center gap-2 mt-3 mb-2">
        <input className="form-control form-control-sm" placeholder="Search plants…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <span className="flex-grow-1" />
        <span className="text-muted small">{sel.size} selected</span>
        <button className="btn btn-sm btn-light" onClick={toggleAll} disabled={candidates.length === 0}>
          <i className={'me-1 ' + (allSelected ? 'ri-checkbox-indeterminate-line' : 'ri-checkbox-multiple-line')} />{allSelected ? 'Unselect all' : `Select all (${candidates.length})`}
        </button>
      </div>
      <div className="border rounded" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {candidates.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">No plants to add here. Adjust the filter, or all matching plants are already mothers.</p>
        ) : candidates.map((p) => (
          <button type="button" key={p.id} className={'ss-item' + (sel.has(p.id) ? ' active' : '')} onClick={() => toggle(p.id)}>
            <i className={'me-2 ' + (sel.has(p.id) ? 'ri-checkbox-line text-primary' : 'ri-checkbox-blank-line')} />{labelById[p.id]}
          </button>
        ))}
      </div>
      <p className="text-muted small mt-2 mb-0">Only designated mother plants appear in the batch parent-plant picker.</p>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={confirm} disabled={sel.size === 0 || saving}><i className="ri-check-line me-1" />{saving ? 'Adding…' : `Add ${sel.size || ''} as mother${sel.size === 1 ? '' : 's'}`}</button>
      </div>
    </Modal>
  )
}

// ---- Nursery Inventory (ready stock by method) -----------------------------
function NurseryInventory({ matchBatch }) {
  const { batches: all } = usePropagation()
  const batches = all.filter(matchBatch)
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
function Reports({ matchBatch }) {
  const { batches: all } = usePropagation()
  const batches = all.filter(matchBatch)
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
