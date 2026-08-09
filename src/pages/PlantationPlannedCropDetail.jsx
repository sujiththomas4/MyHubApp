import { Link, useParams } from 'react-router-dom'
import CrudCard from '@/components/plantation/CrudCard'
import {
  usePlannedCrops,
  useCropContacts, addCropContact, editCropContact, removeCropContact,
  CROP_STATUS_BADGE, CROP_STATUS,
} from '@/data/plannedCropsRepo'

/**
 * PlantationPlannedCropDetail.jsx — one planned crop with its references &
 * contacts as separate rows (route /business/plantations/planned-crops/:cropId).
 * Each reference row: name, phone, address, and an optional YouTube link.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function PlantationPlannedCropDetail() {
  const { cropId } = useParams()
  const { crops } = usePlannedCrops()
  const { contacts } = useCropContacts()
  const crop = crops.find((c) => c.id === cropId)
  const myRefs = contacts.filter((c) => c.cropId === cropId)

  const fields = [
    { key: 'name', label: 'Contact / source', type: 'text', placeholder: 'e.g. Ramesh (pepper farmer)', required: true, colClass: 'col-md-6' },
    { key: 'phone', label: 'Contact number', type: 'text', placeholder: '98xxxxxxxx', colClass: 'col-md-6' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'youtube', label: 'YouTube link (optional)', type: 'text', placeholder: 'https://youtu.be/…' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const blank = () => ({ cropId, name: '', phone: '', address: '', youtube: '', note: '' })
  const save = async (f) => { if (f.id) await editCropContact(f); else await addCropContact({ ...f, id: 'ref-' + rid(), sortOrder: myRefs.length }) }
  const columns = [
    { header: 'Contact / source', cell: (r) => (<><div className="fw-medium">{r.name || '—'}</div>{r.note && <div className="text-muted small">{r.note}</div>}</>) },
    { header: 'Phone', cell: (r) => (r.phone ? <a href={`tel:${r.phone}`}>{r.phone}</a> : '—') },
    { header: 'Address', className: 'text-muted', cell: (r) => r.address || '—' },
    { header: 'YouTube', cell: (r) => (r.youtube ? <a href={r.youtube} target="_blank" rel="noreferrer"><i className="ri-youtube-line text-danger me-1" />Watch</a> : '—') },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{crop ? crop.name : 'Planned crop'}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/propagation?tab=plants" className="text-reset">Plant Factory</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{crop ? crop.name : cropId}</li>
          </ol>
        </nav>
      </div>

      {crop && (
        <div className="card">
          <div className="card-body d-flex align-items-center gap-3 flex-wrap">
            {crop.image
              ? <img src={crop.image} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              : <span className="stat-icon bg-success-subtle text-success" style={{ width: 56, height: 56 }}><i className="ri-plant-line fs-4" /></span>}
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">{crop.name}</h5>
                <span className={'badge ' + (CROP_STATUS_BADGE[crop.status] || CROP_STATUS_BADGE.not_started)}>{(CROP_STATUS.find((s) => s.value === crop.status) || {}).label || crop.status}</span>
              </div>
              <div className="text-muted small mt-1">
                {(crop.plantFrom || crop.plantTo) && <span className="me-3"><i className="ri-calendar-line me-1" />{crop.plantFrom && crop.plantTo ? `${crop.plantFrom} – ${crop.plantTo}` : crop.plantFrom || crop.plantTo}</span>}
                {crop.duration && <span><i className="ri-time-line me-1" />{crop.duration}</span>}
              </div>
              {crop.note && <div className="text-muted small mt-1">{crop.note}</div>}
            </div>
            <Link to="/business/plantations/propagation?tab=plants" className="btn btn-sm btn-light"><i className="ri-arrow-left-line me-1" />Back</Link>
          </div>
        </div>
      )}

      <CrudCard
        title={`References & contacts (${myRefs.length})`} addLabel="Add reference" modalTitle="reference"
        emptyText="No references yet. Add contacts, addresses and YouTube links for guidance."
        rows={myRefs} columns={columns} fields={fields} makeBlank={blank} onSave={save} onDelete={removeCropContact}
      />
    </div>
  )
}
