import CrudCard from '@/components/plantation/CrudCard'
import {
  usePlannedCrops, addPlannedCrop, editPlannedCrop, removePlannedCrop,
  useCropContacts,
  CROP_STATUS, CROP_STATUS_BADGE, MONTHS,
} from '@/data/plannedCropsRepo'
import { useLookups, valuesFor, CROP_LIST } from '@/data/lookupsRepo'

/**
 * PlantationPlannedCrops.jsx — a planning register of crops to grow. Used both as
 * a standalone page and as the "Plants" tab inside Plant Factory (PlannedCropsPanel).
 * Tracks status, specification, expected yield, planned vs planted counts, best
 * planting window, time-to-result, plus reference links / contacts (detail page).
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const plantingWindow = (c) => (c.plantFrom && c.plantTo ? `${c.plantFrom} – ${c.plantTo}` : c.plantFrom || c.plantTo || '—')

// The list + tiles, without the page-title box — embeddable in Plant Factory.
export function PlannedCropsPanel({ showTiles = true }) {
  const { crops } = usePlannedCrops()
  const { contacts } = useCropContacts()
  const { lookups } = useLookups()
  const cropNames = valuesFor(lookups, CROP_LIST)
  const refCount = (id) => contacts.filter((c) => c.cropId === id).length
  const monthOpts = [{ value: '', label: '— any —' }, ...MONTHS.map((m) => ({ value: m, label: m }))]

  const fields = [
    { key: 'name', label: 'Crop / plant', type: 'datalist', options: cropNames, placeholder: 'e.g. Black Pepper (climber), Coffee, Cardamom', required: true, colClass: 'col-md-8' },
    { key: 'status', label: 'Status', type: 'select', options: CROP_STATUS, colClass: 'col-md-4' },
    { key: 'specification', label: 'Specification', type: 'text', placeholder: 'e.g. Grafted, high yielding, drought tolerant', colClass: 'col-md-12' },
    { key: 'duration', label: 'Expected yield in', type: 'text', placeholder: 'e.g. 3 years to first yield', colClass: 'col-md-4' },
    { key: 'interested', label: 'Interested (qty)', type: 'number', colClass: 'col-md-4' },
    { key: 'planted', label: 'Planted (qty)', type: 'number', colClass: 'col-md-4' },
    { key: 'plantFrom', label: 'Best planting from', type: 'select', options: monthOpts, colClass: 'col-md-6' },
    { key: 'plantTo', label: 'Best planting to', type: 'select', options: monthOpts, colClass: 'col-md-6' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/crops' },
  ]
  const makeBlank = () => ({ name: '', status: 'not_started', specification: '', interested: '', planted: '', plantFrom: '', plantTo: '', duration: '', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editPlannedCrop(f); else await addPlannedCrop({ ...f, id: 'crop-' + rid(), sortOrder: crops.length }) }

  const columns = [
    {
      header: 'Crop / plant',
      cell: (c) => (
        <div className="d-flex align-items-center gap-2">
          {c.image
            ? <img src={c.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
            : <span className="stat-icon bg-success-subtle text-success" style={{ width: 36, height: 36 }}><i className="ri-plant-line" /></span>}
          <div>
            <div className="fw-medium">{c.name}</div>
            {c.note && <div className="text-muted small text-truncate" style={{ maxWidth: 240 }}>{c.note}</div>}
          </div>
        </div>
      ),
    },
    { header: 'Status', cell: (c) => <span className={'badge fw-normal ' + (CROP_STATUS_BADGE[c.status] || CROP_STATUS_BADGE.not_started)}>{(CROP_STATUS.find((s) => s.value === c.status) || {}).label || c.status}</span> },
    { header: 'Specification', className: 'text-muted', cell: (c) => c.specification || '—' },
    { header: 'Expected yield in', className: 'text-muted', cell: (c) => c.duration || '—' },
    { header: 'Interested', className: 'text-center', cell: (c) => (c.interested !== '' && c.interested != null ? c.interested : '—') },
    { header: 'Planted', className: 'text-center', cell: (c) => (c.planted !== '' && c.planted != null ? <span className="badge bg-success-subtle text-success">{c.planted}</span> : '—') },
    { header: 'Best planting', className: 'text-muted', cell: (c) => plantingWindow(c) },
    { header: 'References', cell: (c) => { const n = refCount(c.id); return n > 0 ? <span className="badge bg-info-subtle text-info"><i className="ri-contacts-line me-1" />{n}</span> : <span className="text-muted">—</span> } },
  ]

  const started = crops.filter((c) => c.status === 'started').length

  return (
    <>
      {showTiles && (
        <div className="row g-3 mb-3">
          <div className="col-md-4 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Plants planned</span></div><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-seedling-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0">{crops.length}</h4>
          </div></div></div>
          <div className="col-md-4 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Started</span></div><div className="stat-icon bg-success-subtle text-success"><i className="ri-play-circle-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0 text-success">{started}</h4>
          </div></div></div>
          <div className="col-md-4 col-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Not started</span></div><div className="stat-icon bg-secondary-subtle text-secondary"><i className="ri-pause-circle-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0">{crops.length - started}</h4>
          </div></div></div>
        </div>
      )}

      <CrudCard
        title="Plants & planned crops" addLabel="Add plant" modalTitle="plant" modalSize="lg"
        emptyText="No plants planned yet. Add the plants/crops you want to grow. 🌱"
        rows={crops} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removePlannedCrop}
        openTo={(c) => `/business/plantations/planned-crops/${c.id}`} openLabel="References"
      />
    </>
  )
}

export default function PlantationPlannedCrops() {
  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Planned Crops</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Planned Crops</li>
          </ol>
        </nav>
      </div>
      <PlannedCropsPanel />
    </div>
  )
}
