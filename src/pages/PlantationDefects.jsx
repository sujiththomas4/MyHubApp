import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import {
  usePoles, usePlants,
  useDefects, addDefect, editDefect, removeDefect,
  useLands, landLabel,
} from '@/data/plantationLandRepo'
import CrudCard from '@/components/plantation/CrudCard'
import PropertyBar from '@/components/plantation/PropertyBar'

const rid = () => Math.random().toString(36).slice(2, 8)
const STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'treating', label: 'Treating' },
  { value: 'resolved', label: 'Resolved' },
]
const STATUS_BADGE = { open: 'bg-danger-subtle text-danger', treating: 'bg-warning-subtle text-dark', resolved: 'bg-success-subtle text-success' }

export default function PlantationDefects() {
  const { poles } = usePoles()
  const { plants } = usePlants()
  const { defects } = useDefects()
  const { lands } = useLands()
  const [property, setProperty] = useState('')

  const poleById = Object.fromEntries(poles.map((p) => [p.id, p]))
  const plantById = Object.fromEntries(plants.map((p) => [p.id, p]))
  const poleOpts = [{ value: '', label: '— none —' }, ...poles.map((p) => ({ value: p.id, label: `Pole ${p.label || p.id.slice(-4)}` }))]
  const plantOpts = [{ value: '', label: '— none —' }, ...plants.map((p) => ({ value: p.id, label: `Plant ${p.tag || p.id.slice(-4)}` }))]
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const subject = (d) =>
    d.plantId && plantById[d.plantId] ? `Plant ${plantById[d.plantId].tag || ''}`.trim()
      : d.poleId && poleById[d.poleId] ? `Pole ${poleById[d.poleId].label || ''}`.trim()
        : '—'

  const fields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts },
    { key: 'title', label: 'Defect', type: 'text', placeholder: 'Leaf spot / pest attack', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'poleId', label: 'On pole', type: 'select', options: poleOpts, colClass: 'col-6' },
    { key: 'plantId', label: 'On plant', type: 'select', options: plantOpts, colClass: 'col-6' },
    { key: 'identifiedDate', label: 'Identified on', type: 'date', colClass: 'col-6' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, colClass: 'col-6' },
    { key: 'remedy', label: 'Remedy applied', type: 'textarea' },
    { key: 'remedyDate', label: 'Remedy on', type: 'date', colClass: 'col-6' },
    { key: 'result', label: 'Result', type: 'textarea', colClass: 'col-12' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/defects' },
  ]
  const makeBlank = () => ({ landId: '', title: '', description: '', poleId: '', plantId: '', identifiedDate: '', status: 'open', remedy: '', remedyDate: '', result: '', image: '' })
  const onSave = async (f) => { if (f.id) await editDefect(f); else await addDefect({ ...f, id: 'def-' + rid() }) }

  const columns = [
    { header: '', className: 'text-center', cell: (d) => (d.image ? <img src={d.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} /> : <i className="ri-bug-line text-muted" />) },
    { header: 'Defect', cell: (d) => (<><div className="fw-medium">{d.title}</div>{d.remedy && <div className="text-muted small">Remedy: {d.remedy}</div>}{d.result && <div className="text-success small">Result: {d.result}</div>}</>) },
    { header: 'Property', className: 'text-muted', cell: (d) => landName(d.landId) || '—' },
    { header: 'Subject', className: 'text-muted', cell: subject },
    { header: 'Identified', className: 'text-muted', cell: (d) => (d.identifiedDate ? fmtDate(d.identifiedDate) : '—') },
    { header: 'Status', cell: (d) => <span className={'badge ' + (STATUS_BADGE[d.status] || STATUS_BADGE.open)}>{d.status}</span> },
  ]

  // Open first, then treating, then resolved; newest identified first within each.
  const order = { open: 0, treating: 1, resolved: 2 }
  const scoped = property ? defects.filter((d) => d.landId === property) : defects
  const rows = [...scoped].sort((a, b) => (order[a.status] - order[b.status]) || (b.identifiedDate || '').localeCompare(a.identifiedDate || ''))

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Defects</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Defects</li>
          </ol>
        </nav>
      </div>

      <PropertyBar value={property} onChange={setProperty} />

      <CrudCard
        title="Defects &amp; remedies" addLabel="Log defect" modalTitle="defect" emptyText="No defects logged. 🌱"
        rows={rows} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeDefect}
      />
    </div>
  )
}
