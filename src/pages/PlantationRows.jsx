import { Link, useParams } from 'react-router-dom'
import {
  useLands, useZones,
  useVerticals, addVertical, editVertical, removeVertical,
  useZoneItems, addZoneItem, editZoneItem, removeZoneItem,
  usePoles,
} from '@/data/plantationLandRepo'
import CrudCard from '@/components/plantation/CrudCard'

const rid = () => Math.random().toString(36).slice(2, 8)
const ITEM_KINDS = ['water-reservoir', 'plants', 'shed', 'pump', 'pathway', 'other']

export default function PlantationRows() {
  const { zoneId } = useParams()
  const { lands } = useLands()
  const { zones } = useZones()
  const { verticals } = useVerticals()
  const { items } = useZoneItems()
  const { poles } = usePoles()

  const zone = zones.find((z) => z.id === zoneId)
  const land = zone ? lands.find((l) => l.id === zone.landId) : null
  const myRows = verticals.filter((v) => v.zoneId === zoneId).sort((a, b) => a.sortOrder - b.sortOrder)
  const myItems = items.filter((i) => i.zoneId === zoneId).sort((a, b) => a.sortOrder - b.sortOrder)
  const poleCount = (vId) => poles.filter((p) => p.verticalId === vId).length

  // Rows
  const rowFields = [
    { key: 'name', label: 'Row / vertical', type: 'text', placeholder: 'Row 1', required: true },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const rowBlank = () => ({ zoneId, name: '', note: '' })
  const rowSave = async (f) => { if (f.id) await editVertical(f); else await addVertical({ ...f, id: 'vt-' + rid(), zoneId, sortOrder: myRows.length }) }
  const rowColumns = [
    { header: 'Row', cell: (v) => (<><Link to={`/business/plantations/rows/${v.id}/poles`} className="text-reset fw-medium">{v.name}</Link>{v.note && <div className="text-muted small">{v.note}</div>}</>) },
    { header: 'Poles', className: 'text-center', cell: (v) => <Link to={`/business/plantations/rows/${v.id}/poles`} className="text-reset">{poleCount(v.id)}</Link> },
  ]

  // Items
  const itemFields = [
    { key: 'name', label: 'Item', type: 'text', placeholder: 'Water reservoir', required: true },
    { key: 'kind', label: 'Kind', type: 'datalist', options: ITEM_KINDS, placeholder: 'water-reservoir', colClass: 'col-6' },
    { key: 'quantity', label: 'Qty', type: 'number', placeholder: '1', colClass: 'col-6' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/items' },
  ]
  const itemBlank = () => ({ zoneId, name: '', kind: '', quantity: '', note: '', image: '' })
  const itemSave = async (f) => { if (f.id) await editZoneItem(f); else await addZoneItem({ ...f, id: 'zi-' + rid(), zoneId, sortOrder: myItems.length }) }
  const itemColumns = [
    { header: 'Item', cell: (x) => <span className="fw-medium">{x.name}</span> },
    { header: 'Kind', className: 'text-muted', cell: (x) => x.kind || '—' },
    { header: 'Qty', className: 'text-end', cell: (x) => (x.quantity !== '' ? x.quantity : '—') },
  ]

  if (!zone) {
    return (
      <div className="option-buying">
        <div className="page-title-box"><h4 className="mb-0">Zone not found</h4></div>
        <div className="card"><div className="card-body">
          <Link to="/business/plantations/explorer" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to Explorer</Link>
        </div></div>
      </div>
    )
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{zone.name}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/explorer" className="text-reset">Explorer</Link></li>
            {land && <li className="breadcrumb-item"><Link to={`/business/plantations/lands/${land.id}/zones`} className="text-reset">{land.name}</Link></li>}
            <li className="breadcrumb-item active" aria-current="page">{zone.name}</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3">
        <div className="col-xl-6">
          <CrudCard title="Rows (verticals)" addLabel="Add row" modalTitle="row" emptyText="No rows yet."
            rows={myRows} columns={rowColumns} fields={rowFields} makeBlank={rowBlank} onSave={rowSave} onDelete={removeVertical}
            openTo={(v) => `/business/plantations/rows/${v.id}/poles`} openLabel="Poles" />
        </div>
        <div className="col-xl-6">
          <CrudCard title="Zone items" addLabel="Add item" modalTitle="item" emptyText="No items yet."
            rows={myItems} columns={itemColumns} fields={itemFields} makeBlank={itemBlank} onSave={itemSave} onDelete={removeZoneItem} />
        </div>
      </div>
    </div>
  )
}
