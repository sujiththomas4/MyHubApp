import { Link, useParams } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import {
  useLands, useZones, useVerticals, usePoles,
  usePlants, addPlant, editPlant, removePlant,
  useCare, addCare, editCare, removeCare,
} from '@/data/plantationLandRepo'
import CrudCard from '@/components/plantation/CrudCard'
import plantImg from '@/assets/plant.jpg'

const rid = () => Math.random().toString(36).slice(2, 8)
const STATUS = [
  { value: 'na', label: 'N/A (not planted)' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'defect', label: 'Defect' },
  { value: 'dead', label: 'Dead' },
]
const STATUS_BADGE = { na: 'bg-light text-muted', healthy: 'bg-success-subtle text-success', defect: 'bg-warning-subtle text-dark', dead: 'bg-danger-subtle text-danger' }
const STAGE = [{ value: 'planned', label: 'Planned' }, { value: 'planted', label: 'Planted' }]
const STAGE_BADGE = { planned: 'bg-secondary-subtle text-secondary', planted: 'bg-success-subtle text-success' }
const CARE_TYPES = [{ value: 'watering', label: 'Watering' }, { value: 'fertilizer', label: 'Fertilizer' }]

export default function PlantationPlants() {
  const { poleId } = useParams()
  const { lands } = useLands()
  const { zones } = useZones()
  const { verticals } = useVerticals()
  const { poles } = usePoles()
  const { plants } = usePlants()

  const { care } = useCare()
  const pole = poles.find((p) => p.id === poleId)
  const vertical = pole ? verticals.find((v) => v.id === pole.verticalId) : null
  const zone = vertical ? zones.find((z) => z.id === vertical.zoneId) : null
  const land = zone ? lands.find((l) => l.id === zone.landId) : null
  const myPlants = plants.filter((p) => p.poleId === poleId).sort((a, b) => a.sortOrder - b.sortOrder)
  const myCare = care.filter((c) => c.poleId === poleId)

  const fields = [
    { key: 'tag', label: 'Plant tag', type: 'text', placeholder: 'TAG-001', required: true },
    { key: 'variety', label: 'Variety', type: 'text', placeholder: 'e.g. Panniyur-1 pepper' },
    { key: 'stage', label: 'Stage', type: 'select', options: STAGE, colClass: 'col-md-4' },
    { key: 'plantedDate', label: 'Planted on', type: 'date', colClass: 'col-md-4' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, colClass: 'col-md-4' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/plants' },
  ]
  const makeBlank = () => ({ poleId, tag: '', variety: '', stage: 'planned', plantedDate: '', status: 'na', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editPlant(f); else await addPlant({ ...f, id: 'plant-' + rid(), poleId, sortOrder: myPlants.length }) }

  const columns = [
    {
      header: 'Plant',
      cell: (p) => (
        <div className="d-flex align-items-center gap-2">
          <img src={p.image || plantImg} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 6 }} />
          <span className="fw-medium">{p.tag || '—'}</span>
        </div>
      ),
    },
    { header: 'Variety', className: 'text-muted', cell: (p) => p.variety || '—' },
    { header: 'Stage', cell: (p) => <span className={'badge ' + (STAGE_BADGE[p.stage] || STAGE_BADGE.planted)}>{(STAGE.find((s) => s.value === p.stage) || {}).label || 'Planted'}</span> },
    { header: 'Planted', className: 'text-muted', cell: (p) => (p.plantedDate ? fmtDate(p.plantedDate) : '—') },
    { header: 'Status', cell: (p) => <span className={'badge ' + (STATUS_BADGE[p.status] || STATUS_BADGE.healthy)}>{p.status || 'healthy'}</span> },
  ]

  // Care (watering / fertilizer) — pole-wise.
  const careFields = [
    { key: 'type', label: 'Type', type: 'select', options: CARE_TYPES, colClass: 'col-6' },
    { key: 'scheduledDate', label: 'Scheduled', type: 'date', colClass: 'col-6' },
    { key: 'product', label: 'Product', type: 'text', placeholder: 'e.g. NPK 19:19:19', colClass: 'col-6' },
    { key: 'quantity', label: 'Quantity', type: 'text', placeholder: 'e.g. 50 g / 5 L', colClass: 'col-6' },
    { key: 'done', label: 'Status', type: 'switch', switchLabel: 'Done', colClass: 'col-6' },
    { key: 'doneDate', label: 'Done on', type: 'date', colClass: 'col-6', showIf: (f) => f.done },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const careBlank = () => ({ poleId, type: 'watering', product: '', quantity: '', scheduledDate: '', done: false, doneDate: '', note: '' })
  const careSave = async (f) => { if (f.id) await editCare(f); else await addCare({ ...f, id: 'care-' + rid() }) }
  const careColumns = [
    {
      header: 'Task',
      cell: (c) => (
        <>
          <span className={'badge ' + (c.type === 'fertilizer' ? 'bg-warning-subtle text-dark' : 'bg-info-subtle text-info')}>{c.type}</span>
          {c.product && <span className="ms-2">{c.product}</span>}
          {c.quantity && <span className="text-muted small ms-1">· {c.quantity}</span>}
        </>
      ),
    },
    { header: 'Scheduled', className: 'text-muted', cell: (c) => (c.scheduledDate ? fmtDate(c.scheduledDate) : '—') },
    {
      header: 'Status',
      cell: (c) => (c.done
        ? <span className="badge bg-success-subtle text-success">Done{c.doneDate ? ` · ${fmtDate(c.doneDate)}` : ''}</span>
        : <span className="badge bg-secondary-subtle text-secondary">Pending</span>),
    },
  ]

  if (!pole) {
    return (
      <div className="option-buying">
        <div className="page-title-box"><h4 className="mb-0">Pole not found</h4></div>
        <div className="card"><div className="card-body">
          <Link to="/business/plantations/explorer" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to Explorer</Link>
        </div></div>
      </div>
    )
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Pole {pole.label} · Plants</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/explorer" className="text-reset">Explorer</Link></li>
            {land && <li className="breadcrumb-item"><Link to={`/business/plantations/lands/${land.id}/zones`} className="text-reset">{land.name}</Link></li>}
            {zone && <li className="breadcrumb-item"><Link to={`/business/plantations/zones/${zone.id}/rows`} className="text-reset">{zone.name}</Link></li>}
            {vertical && <li className="breadcrumb-item"><Link to={`/business/plantations/rows/${vertical.id}/poles`} className="text-reset">{vertical.name}</Link></li>}
            <li className="breadcrumb-item active" aria-current="page">Pole {pole.label}</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3">
        <div className="col-xl-7">
          <CrudCard
            title="Plants on this pole" addLabel="Add plant" modalTitle="plant" emptyText="No plants yet. A pole can hold several plants."
            rows={myPlants} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removePlant}
          />
        </div>
        <div className="col-xl-5">
          <CrudCard
            title="Care (watering / fertilizer)" addLabel="Add task" modalTitle="care task" emptyText="No care planned for this pole yet."
            rows={myCare} columns={careColumns} fields={careFields} makeBlank={careBlank} onSave={careSave} onDelete={removeCare}
          />
        </div>
      </div>
    </div>
  )
}
