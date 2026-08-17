import { Link, useParams } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useFlowers, useFlowerRefs, addFlowerRef, editFlowerRef, removeFlowerRef,
  FLOWER_STATUS_BADGE, FLOWER_STATUS_LABEL, isLive, daysUntil, growDays,
} from '@/data/flowersRepo'

/**
 * PlantationFlowerDetail.jsx — one flower plan with its references as separate
 * rows (route /business/plantations/flowers/:flowerId). A reference is whoever
 * or whatever you would go back to: nursery, supplier, buyer, guidance video.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function PlantationFlowerDetail() {
  const { flowerId } = useParams()
  const { flowers } = useFlowers()
  const { refs } = useFlowerRefs()
  const flower = flowers.find((f) => f.id === flowerId)
  const myRefs = refs.filter((r) => r.flowerId === flowerId)

  const fields = [
    { key: 'name', label: 'Reference / source', type: 'text', placeholder: 'e.g. Green Valley Nursery', required: true, colClass: 'col-md-6' },
    { key: 'phone', label: 'Contact number', type: 'text', placeholder: '98xxxxxxxx', colClass: 'col-md-6' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'youtube', label: 'YouTube / link (optional)', type: 'text', placeholder: 'https://youtu.be/…' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const blank = () => ({ flowerId, name: '', phone: '', address: '', youtube: '', note: '' })
  const save = async (f) => { if (f.id) await editFlowerRef(f); else await addFlowerRef({ ...f, id: 'fref-' + rid(), sortOrder: myRefs.length }) }
  const columns = [
    { header: 'Reference / source', cell: (r) => (<><div className="fw-medium">{r.name || '—'}</div>{r.note && <div className="text-muted small">{r.note}</div>}</>) },
    { header: 'Phone', cell: (r) => (r.phone ? <a href={`tel:${r.phone}`}>{r.phone}</a> : '—') },
    { header: 'Address', className: 'text-muted', cell: (r) => r.address || '—' },
    { header: 'Link', cell: (r) => (r.youtube ? <a href={r.youtube} target="_blank" rel="noreferrer"><i className="ri-youtube-line text-danger me-1" />Open</a> : '—') },
  ]

  const days = flower && isLive(flower) ? daysUntil(flower.deliveryDate) : null
  const grow = flower ? growDays(flower) : null

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{flower ? flower.name : 'Flower plan'}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/propagation?tab=flowers" className="text-reset">Plant Factory</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{flower ? flower.name : flowerId}</li>
          </ol>
        </nav>
      </div>

      {flower && (
        <div className="card">
          <div className="card-body d-flex align-items-center gap-3 flex-wrap">
            {flower.image
              ? <img src={flower.image} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              : <span className="stat-icon bg-danger-subtle text-danger" style={{ width: 56, height: 56 }}><i className="ri-flower-line fs-4" /></span>}
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="mb-0">{flower.name}</h5>
                {flower.variety && <span className="text-muted small">{flower.variety}</span>}
                <span className={'badge ' + (FLOWER_STATUS_BADGE[flower.status] || FLOWER_STATUS_BADGE.planned)}>{FLOWER_STATUS_LABEL[flower.status] || flower.status}</span>
                {days != null && (
                  <span className={'badge ' + (days < 0 ? 'bg-danger' : days <= 7 ? 'bg-warning text-dark' : 'bg-light text-muted')}>
                    {days < 0 ? `overdue by ${Math.abs(days)}d` : days === 0 ? 'due today' : `in ${days}d`}
                  </span>
                )}
              </div>
              <div className="text-muted small mt-1">
                {flower.startDate && <span className="me-3"><i className="ri-play-circle-line me-1" />Start {fmtDate(flower.startDate)}</span>}
                {flower.deliveryDate && <span className="me-3"><i className="ri-truck-line me-1" />Delivery {fmtDate(flower.deliveryDate)}</span>}
                {grow != null && <span className="me-3"><i className="ri-time-line me-1" />{grow} day window</span>}
                {flower.quantity !== '' && flower.quantity != null && <span className="me-3"><i className="ri-hashtag me-1" />{flower.quantity}</span>}
                {flower.location && <span><i className="ri-map-pin-line me-1" />{flower.location}</span>}
              </div>
              {flower.note && <div className="text-muted small mt-1">{flower.note}</div>}
            </div>
            <Link to="/business/plantations/propagation?tab=flowers" className="btn btn-sm btn-light"><i className="ri-arrow-left-line me-1" />Back</Link>
          </div>
        </div>
      )}

      <CrudCard
        title={`References (${myRefs.length})`} addLabel="Add reference" modalTitle="reference"
        emptyText="No references yet. Add the nursery, supplier, buyer or guidance links for this flower."
        rows={myRefs} columns={columns} fields={fields} makeBlank={blank} onSave={save} onDelete={removeFlowerRef}
      />
    </div>
  )
}
