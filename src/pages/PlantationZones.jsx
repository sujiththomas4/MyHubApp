import { Link, useParams } from 'react-router-dom'
import { useLands, useZones, addZone, editZone, removeZone, useVerticals, useZoneItems } from '@/data/plantationLandRepo'
import CrudCard from '@/components/plantation/CrudCard'

const rid = () => Math.random().toString(36).slice(2, 8)
const UNIT_OPTS = ['cent', 'acre', 'sqft', 'hectare'].map((u) => ({ value: u, label: u }))

export default function PlantationZones() {
  const { landId } = useParams()
  const { lands } = useLands()
  const { zones } = useZones()
  const { verticals } = useVerticals()
  const { items } = useZoneItems()

  const land = lands.find((l) => l.id === landId)
  const myZones = zones.filter((z) => z.landId === landId).sort((a, b) => a.sortOrder - b.sortOrder)
  const rowCount = (id) => verticals.filter((v) => v.zoneId === id).length
  const itemCount = (id) => items.filter((i) => i.zoneId === id).length

  const fields = [
    { key: 'name', label: 'Zone name', type: 'text', placeholder: 'Zone 1 / North plot', required: true },
    { key: 'area', label: 'Area', type: 'number', placeholder: '25', colClass: 'col-6' },
    { key: 'areaUnit', label: 'Unit', type: 'select', options: UNIT_OPTS, colClass: 'col-6' },
    { key: 'hasVerticals', label: 'Plants', type: 'switch', switchLabel: 'Has plants (enable rows)' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const makeBlank = () => ({ landId, name: '', area: '', areaUnit: 'cent', hasVerticals: false, note: '' })
  const onSave = async (f) => { if (f.id) await editZone(f); else await addZone({ ...f, id: 'zone-' + rid(), landId, sortOrder: myZones.length }) }

  const columns = [
    {
      header: 'Zone',
      cell: (z) => (
        <>
          <Link to={`/business/plantations/zones/${z.id}/rows`} className="text-reset fw-medium">{z.name}</Link>
          {z.hasVerticals && <span className="badge bg-success-subtle text-success ms-2">Plants</span>}
          {z.note && <div className="text-muted small">{z.note}</div>}
        </>
      ),
    },
    { header: 'Area', className: 'text-end', cell: (z) => (z.area !== '' ? `${z.area} ${z.areaUnit}` : '—') },
    { header: 'Items', className: 'text-center', cell: (z) => itemCount(z.id) },
    { header: 'Rows', className: 'text-center', cell: (z) => (z.hasVerticals ? rowCount(z.id) : '—') },
  ]

  if (!land) {
    return (
      <div className="option-buying">
        <div className="page-title-box"><h4 className="mb-0">Property not found</h4></div>
        <div className="card"><div className="card-body">
          <Link to="/business/plantations/explorer" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to Explorer</Link>
        </div></div>
      </div>
    )
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{land.name} · Zones</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><Link to="/business/plantations/explorer" className="text-reset">Explorer</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{land.name}</li>
          </ol>
        </nav>
      </div>

      <CrudCard
        title="Zones (plots)" addLabel="Add zone" modalTitle="zone" emptyText="No zones yet. Split this land into plots."
        rows={myZones} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeZone}
        openTo={(z) => `/business/plantations/zones/${z.id}/rows`} openLabel="Rows"
      />
    </div>
  )
}
