import { Link, useParams } from 'react-router-dom'
import {
  useLands, useZones, useVerticals,
  usePoles, addPole, editPole, removePole,
  usePlants,
} from '@/data/plantationLandRepo'
import CrudCard from '@/components/plantation/CrudCard'
import poleImg from '@/assets/pole.webp'

const rid = () => Math.random().toString(36).slice(2, 8)
const POLE_TYPES = [
  { value: 'payyani', label: 'Payyani (live tree)' },
  { value: 'pvc', label: 'PVC' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'plant', label: 'Plant itself' },
  { value: 'other', label: 'Other' },
]
const POLE_LABEL = Object.fromEntries(POLE_TYPES.map((t) => [t.value, t.label]))

export default function PlantationPoles() {
  const { verticalId } = useParams()
  const { lands } = useLands()
  const { zones } = useZones()
  const { verticals } = useVerticals()
  const { poles } = usePoles()
  const { plants } = usePlants()

  const vertical = verticals.find((v) => v.id === verticalId)
  const zone = vertical ? zones.find((z) => z.id === vertical.zoneId) : null
  const land = zone ? lands.find((l) => l.id === zone.landId) : null
  const myPoles = poles.filter((p) => p.verticalId === verticalId).sort((a, b) => a.sortOrder - b.sortOrder)
  const plantCount = (id) => plants.filter((p) => p.poleId === id).length

  const fields = [
    { key: 'label', label: 'Pole label / no.', type: 'text', placeholder: 'P1', required: true },
    { key: 'poleType', label: 'Pole type', type: 'select', options: [{ value: '', label: '— select —' }, ...POLE_TYPES] },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/poles' },
  ]
  const makeBlank = () => ({ verticalId, label: '', poleType: '', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editPole(f); else await addPole({ ...f, id: 'pole-' + rid(), verticalId, sortOrder: myPoles.length }) }

  const columns = [
    {
      header: 'Pole',
      cell: (p) => (
        <div className="d-flex align-items-center gap-2">
          <img src={p.image || poleImg} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 6 }} />
          <Link to={`/business/plantations/poles/${p.id}/plants`} className="text-reset fw-medium">{p.label || '—'}</Link>
        </div>
      ),
    },
    { header: 'Type', cell: (p) => (p.poleType ? <span className="badge bg-info-subtle text-info">{POLE_LABEL[p.poleType] || p.poleType}</span> : '—') },
    { header: 'Plants', className: 'text-center', cell: (p) => <Link to={`/business/plantations/poles/${p.id}/plants`} className="text-reset">{plantCount(p.id)}</Link> },
    { header: 'Note', className: 'text-muted', cell: (p) => p.note || '—' },
  ]

  if (!vertical) {
    return (
      <div className="option-buying">
        <div className="page-title-box"><h4 className="mb-0">Row not found</h4></div>
        <div className="card"><div className="card-body">
          <Link to="/business/plantations/explorer" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to Explorer</Link>
        </div></div>
      </div>
    )
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{vertical.name} · Poles</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/explorer" className="text-reset">Explorer</Link></li>
            {land && <li className="breadcrumb-item"><Link to={`/business/plantations/lands/${land.id}/zones`} className="text-reset">{land.name}</Link></li>}
            {zone && <li className="breadcrumb-item"><Link to={`/business/plantations/zones/${zone.id}/rows`} className="text-reset">{zone.name}</Link></li>}
            <li className="breadcrumb-item active" aria-current="page">{vertical.name}</li>
          </ol>
        </nav>
      </div>

      <CrudCard
        title="Poles" addLabel="Add pole" modalTitle="pole" emptyText="No poles yet. Add supports for this row."
        rows={myPoles} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removePole}
        openTo={(p) => `/business/plantations/poles/${p.id}/plants`} openLabel="Plants"
      />
    </div>
  )
}
