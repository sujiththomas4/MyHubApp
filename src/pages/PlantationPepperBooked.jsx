import { useState } from 'react'
import { money, fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import { usePepperBookings, addBooking, editBooking, removeBooking } from '@/data/pepperBookingRepo'
import { useLookups, valuesFor, VARIETY_LIST } from '@/data/lookupsRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import { useLands, landLabel } from '@/data/plantationLandRepo'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationPepperBooked.jsx — plants ordered for our plantation, one screen for
 * every crop (route /business/plantations/pepper-booked). Crop buttons switch
 * the whole view. Pepper carries Type / Variety / Climber-Bush; other crops
 * (Payyani, Thippali…) are always Normal and hide those fields/columns.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const CROP_LIST = 'Crop'
const STATUS = [
  { value: 'booked', label: 'Booked' },
  { value: 'booked_need_action', label: 'Booked & Need Action' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]
const STATUS_BADGE = {
  booked: 'bg-warning-subtle text-dark',
  booked_need_action: 'bg-danger-subtle text-danger',
  delivered: 'bg-success-subtle text-success',
  cancelled: 'bg-secondary-subtle text-secondary',
}
const STATUS_LABEL = Object.fromEntries(STATUS.map((s) => [s.value, s.label]))
const PLANT_TYPES = [{ value: 'Grafted', label: 'Grafted' }, { value: 'Normal', label: 'Normal' }]
const PLANT_BADGE = { Grafted: 'bg-primary-subtle text-primary', Normal: 'bg-secondary-subtle text-secondary' }
const GROWTH_OPTS = [{ value: '', label: '—' }, { value: 'Climber', label: 'Climber' }, { value: 'Bush', label: 'Bush' }]
const GROWTH_BADGE = { Climber: 'bg-info-subtle text-info', Bush: 'bg-warning-subtle text-dark' }
const VIEWS = [
  { id: 'nursery', label: 'By nursery', icon: 'ri-store-2-line' },
  { id: 'delivery', label: 'By delivery date', icon: 'ri-calendar-line' },
  { id: 'stats', label: 'Statistics', icon: 'ri-bar-chart-2-line' },
]
const amountOf = (b) => b.quantity * b.rate + (b.deliveryCharge || 0)

function StatTable({ title, colLabel, rows }) {
  return (
    <div className="card mb-0 h-100">
      <div className="card-header py-2"><h6 className="card-title mb-0">{title}</h6></div>
      <div className="card-body p-0">
        {rows.length === 0 ? <p className="text-muted text-center py-3 mb-0">No data.</p> : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead className="table-light">
                <tr><th>{colLabel}</th><th className="text-center">Bookings</th><th className="text-center">Plants</th><th className="text-end">Payable</th><th className="text-end">Paid</th><th className="text-end">Balance</th></tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.key}>
                    <td className="fw-medium">{g.key}</td>
                    <td className="text-center">{g.count}</td>
                    <td className="text-center">{g.plants}</td>
                    <td className="text-end">{money(g.payable, 'INR')}</td>
                    <td className="text-end text-success">{money(g.paid, 'INR')}</td>
                    <td className="text-end">{money(g.payable - g.paid, 'INR')}</td>
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

export default function PlantationPepperBooked() {
  const { bookings } = usePepperBookings()
  const { lookups } = useLookups()
  const { profiles } = useProfiles()
  const varieties = valuesFor(lookups, VARIETY_LIST)
  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const crops = valuesFor(lookups, CROP_LIST)
  const cropButtons = crops.length ? crops : ['Pepper']
  const { lands } = useLands()
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const [crop, setCrop] = useState('Pepper')
  const [view, setView] = useState('nursery')
  const [property, setProperty] = useState('')
  const [filters, setFilters] = useState({ q: '', nursery: '', variety: '', type: '', growth: '', status: '' })
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const clearFilters = () => setFilters({ q: '', nursery: '', variety: '', type: '', growth: '', status: '' })
  const selectCrop = (c) => { setCrop(c); clearFilters() }

  const isPepper = /pepper/i.test(crop)

  // This crop's bookings, scoped to the selected property, drive the screen.
  const cropBookings = bookings.filter((b) => (b.crop || 'Pepper') === crop)
  const scoped = property ? cropBookings.filter((b) => b.landId === property) : cropBookings
  const active = scoped.filter((b) => b.status !== 'cancelled')

  const bookedCount = scoped.filter((b) => b.status === 'booked' || b.status === 'booked_need_action').length
  const needActionCount = scoped.filter((b) => b.status === 'booked_need_action').length
  const deliveredCount = scoped.filter((b) => b.status === 'delivered').length
  const totalPlants = active.reduce((s, b) => s + b.quantity, 0)
  const grafted = active.filter((b) => b.plantType === 'Grafted').reduce((s, b) => s + b.quantity, 0)
  const normal = active.filter((b) => b.plantType === 'Normal').reduce((s, b) => s + b.quantity, 0)
  const totalPayable = active.reduce((s, b) => s + amountOf(b), 0)
  const totalPaid = active.reduce((s, b) => s + b.advance, 0)

  const byNursery = [...scoped].sort((a, b) => a.nursery.localeCompare(b.nursery) || (a.deliveryDate || '').localeCompare(b.deliveryDate || ''))
  const byDelivery = [...scoped].sort((a, b) => {
    const ad = a.deliveryDate || '9999', bd = b.deliveryDate || '9999'
    return ad.localeCompare(bd) || a.nursery.localeCompare(b.nursery)
  })
  const sorted = view === 'delivery' ? byDelivery : byNursery

  const nurseryOpts = [...new Set(scoped.map((b) => b.nursery).filter(Boolean))].sort()
  const varietyOpts = [...new Set(scoped.map((b) => b.variety).filter(Boolean))].sort()
  const matches = (b) => {
    if (filters.nursery && b.nursery !== filters.nursery) return false
    if (filters.variety && b.variety !== filters.variety) return false
    if (filters.type && b.plantType !== filters.type) return false
    if (filters.growth && b.growthForm !== filters.growth) return false
    if (filters.status && b.status !== filters.status) return false
    if (filters.q) {
      const hay = [b.nursery, b.variety, b.phone, b.address, b.assigned, b.actions].join(' ').toLowerCase()
      if (!hay.includes(filters.q.toLowerCase())) return false
    }
    return true
  }
  const rows = sorted.filter(matches)
  const anyFilter = filters.q || filters.nursery || filters.variety || filters.type || filters.growth || filters.status

  const groupStats = (keyFn) => {
    const m = new Map()
    active.forEach((b) => {
      const k = keyFn(b) || '—'
      const g = m.get(k) || { key: k, count: 0, plants: 0, payable: 0, paid: 0 }
      g.count += 1; g.plants += b.quantity; g.payable += amountOf(b); g.paid += b.advance
      m.set(k, g)
    })
    return [...m.values()].sort((a, b) => b.plants - a.plants)
  }

  const fields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts, colClass: 'col-md-6' },
    { key: 'nursery', label: 'Nursery', type: 'text', placeholder: 'Nursery name', required: true, colClass: 'col-md-6' },
    { key: 'phone', label: 'Phone', type: 'text', colClass: 'col-md-6' },
    { key: 'address', label: 'Address', type: 'text', colClass: 'col-md-6' },
    ...(isPepper ? [
      { key: 'plantType', label: 'Type', type: 'select', options: PLANT_TYPES, colClass: 'col-md-4' },
      { key: 'growthForm', label: 'Climber / Bush', type: 'select', options: GROWTH_OPTS, colClass: 'col-md-4' },
      { key: 'variety', label: 'Variety', type: 'search', options: varieties, allowCustom: true, placeholder: 'Search varieties…', colClass: 'col-md-4' },
    ] : []),
    { key: 'quantity', label: 'Plants', type: 'number', required: true, colClass: 'col-md-4' },
    { key: 'defective', label: 'Defective (unusable)', type: 'number', colClass: 'col-md-4' },
    { key: 'rate', label: 'Price / plant (₹)', type: 'number', colClass: 'col-md-4' },
    { key: 'deliveryCharge', label: 'Delivery charge (₹)', type: 'number', colClass: 'col-md-4' },
    { key: 'advance', label: 'Advance (₹)', type: 'number', colClass: 'col-md-4' },
    { key: 'total', label: 'Total (incl. delivery)', type: 'computed', colClass: 'col-md-4 offset-md-4', compute: (f) => money((Number(f.quantity) || 0) * (Number(f.rate) || 0) + (Number(f.deliveryCharge) || 0), 'INR') },
    { key: 'bookingDate', label: 'Booking date', type: 'date', colClass: 'col-md-6' },
    { key: 'deliveryDate', label: 'Delivery date', type: 'date', colClass: 'col-md-6' },
    { key: 'assigned', label: 'Assigned to', type: 'search', options: people, placeholder: 'Search people…', colClass: 'col-md-6' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS, colClass: 'col-md-6' },
    { key: 'actions', label: 'Action to be done', type: 'textarea' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const makeBlank = () => ({ crop, landId: '', nursery: '', phone: '', address: '', variety: '', plantType: isPepper ? 'Grafted' : 'Normal', growthForm: '', quantity: '', defective: '', rate: '', deliveryCharge: '', advance: '', bookingDate: todayISO(), deliveryDate: '', assigned: '', status: 'booked', actions: '', note: '' })
  const onSave = async (f) => { if (f.id) await editBooking(f); else await addBooking({ ...f, id: 'pb-' + rid(), crop }) }

  const columns = [
    {
      header: 'Nursery',
      cell: (b) => (
        <div>
          <div className="fw-medium">{b.nursery}{isPepper && b.variety && <span className="badge bg-success-subtle text-success ms-2">{b.variety}</span>}</div>
          {b.phone && <div className="text-muted small"><i className="ri-phone-line me-1" />{b.phone}</div>}
          {b.address && <div className="text-muted small"><i className="ri-map-pin-line me-1" />{b.address}</div>}
        </div>
      ),
    },
    { header: 'Property', className: 'text-muted', cell: (b) => landName(b.landId) || '—' },
    ...(isPepper ? [{
      header: 'Type',
      cell: (b) => (
        <>
          {b.plantType && <span className={'badge ' + (PLANT_BADGE[b.plantType] || 'bg-light text-muted')}>{b.plantType}</span>}
          {b.growthForm && <span className={'badge ms-1 ' + (GROWTH_BADGE[b.growthForm] || 'bg-light text-muted')}>{b.growthForm}</span>}
          {!b.plantType && !b.growthForm && '—'}
        </>
      ),
    }] : []),
    { header: 'Plants', className: 'text-center', cell: (b) => (<><span>{b.quantity || '—'}</span>{b.defective > 0 && <div className="text-danger small">{b.defective} defective</div>}</>) },
    {
      header: 'Amount', className: 'text-end',
      cell: (b) => (b.rate || b.deliveryCharge ? (
        <div>
          <div className="fw-semibold">{money(amountOf(b), 'INR')}</div>
          <div className="text-muted small">adv {money(b.advance, 'INR')} · bal {money(amountOf(b) - b.advance, 'INR')}{b.deliveryCharge ? ` · del ${money(b.deliveryCharge, 'INR')}` : ''}</div>
        </div>
      ) : '—'),
    },
    { header: 'Assigned', cell: (b) => (b.assigned ? <span className="badge bg-info-subtle text-info">{b.assigned}</span> : '—') },
    { header: 'Action', className: 'text-muted', cell: (b) => (b.actions ? <span title={b.actions}>{b.actions.length > 40 ? b.actions.slice(0, 40) + '…' : b.actions}</span> : '—') },
    { header: 'Delivery', className: 'text-muted', cell: (b) => (b.deliveryDate ? fmtDate(b.deliveryDate) : '—') },
    { header: 'Status', cell: (b) => <span className={'badge ' + (STATUS_BADGE[b.status] || STATUS_BADGE.booked)}>{STATUS_LABEL[b.status] || b.status}</span> },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{crop} Booked</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Plants Booked</li>
          </ol>
        </nav>
      </div>

      <PropertyBar value={property} onChange={setProperty} />

      {/* Crop buttons */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {cropButtons.map((c) => (
          <button key={c} type="button" className={'btn ' + (crop === c ? 'btn-primary' : 'btn-soft-primary')} onClick={() => selectCrop(c)}>
            <i className="ri-plant-line me-1" />{c}
          </button>
        ))}
      </div>

      {/* Status / plant counts */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-4 col-xl"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Booked</span></div><div className="stat-icon bg-warning-subtle text-warning"><i className="ri-bookmark-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{bookedCount}</h4><span className="text-muted small">bookings</span>
        </div></div></div>
        <div className="col-6 col-md-4 col-xl"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Delivered</span></div><div className="stat-icon bg-success-subtle text-success"><i className="ri-truck-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{deliveredCount}</h4><span className="text-muted small">bookings</span>
        </div></div></div>
        <div className="col-6 col-md-4 col-xl"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Need action</span></div><div className="stat-icon bg-danger-subtle text-danger"><i className="ri-error-warning-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + (needActionCount ? 'text-danger' : 'text-muted')}>{needActionCount}</h4><span className="text-muted small">bookings</span>
        </div></div></div>
        {isPepper ? (
          <>
            <div className="col-6 col-md-6 col-xl"><div className="card stat-card h-100 mb-0"><div className="card-body">
              <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Grafted</span></div><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-plant-line" /></div></div>
              <h4 className="stat-value mt-3 mb-0">{grafted}</h4><span className="text-muted small">plants</span>
            </div></div></div>
            <div className="col-6 col-md-6 col-xl"><div className="card stat-card h-100 mb-0"><div className="card-body">
              <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Normal</span></div><div className="stat-icon bg-secondary-subtle text-secondary"><i className="ri-plant-line" /></div></div>
              <h4 className="stat-value mt-3 mb-0">{normal}</h4><span className="text-muted small">plants</span>
            </div></div></div>
          </>
        ) : (
          <div className="col-6 col-md-6 col-xl"><div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Plants</span></div><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-plant-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0">{totalPlants}</h4><span className="text-muted small">total</span>
          </div></div></div>
        )}
      </div>

      {/* Money totals */}
      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Total to be paid</span></div><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-price-tag-3-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{money(totalPayable, 'INR')}</h4><span className="text-muted small">incl. delivery</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Paid (advance)</span></div><div className="stat-icon bg-success-subtle text-success"><i className="ri-hand-coin-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0 text-success">{money(totalPaid, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Balance due</span></div><div className="stat-icon bg-warning-subtle text-warning"><i className="ri-time-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + (totalPayable - totalPaid > 0 ? 'text-warning' : 'text-muted')}>{money(totalPayable - totalPaid, 'INR')}</h4>
        </div></div></div>
      </div>

      {/* View switcher */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <div className="btn-group btn-group-sm" role="group">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={'btn ' + (view === v.id ? 'btn-primary' : 'btn-light')} onClick={() => setView(v.id)}>
              <i className={v.icon + ' me-1'} />{v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'stats' ? (
        <div className="row g-3">
          <div className="col-xl-6"><StatTable title="By nursery" colLabel="Nursery" rows={groupStats((b) => b.nursery)} /></div>
          {isPepper && <div className="col-xl-6"><StatTable title="By variety" colLabel="Variety" rows={groupStats((b) => b.variety)} /></div>}
          {isPepper && <div className="col-xl-6"><StatTable title="By type" colLabel="Type" rows={groupStats((b) => b.plantType)} /></div>}
          {isPepper && <div className="col-xl-6"><StatTable title="By climber / bush" colLabel="Form" rows={groupStats((b) => b.growthForm)} /></div>}
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-body py-2">
              <div className="row g-2 align-items-center">
                <div className="col-md">
                  <input type="text" className="form-control form-control-sm" placeholder="Search nursery, phone, assigned…" value={filters.q} onChange={(e) => setF('q', e.target.value)} />
                </div>
                <div className="col-6 col-md-auto">
                  <select className="form-select form-select-sm" value={filters.nursery} onChange={(e) => setF('nursery', e.target.value)}>
                    <option value="">All nurseries</option>
                    {nurseryOpts.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {isPepper && <div className="col-6 col-md-auto">
                  <select className="form-select form-select-sm" value={filters.variety} onChange={(e) => setF('variety', e.target.value)}>
                    <option value="">All varieties</option>
                    {varietyOpts.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>}
                {isPepper && <div className="col-6 col-md-auto">
                  <select className="form-select form-select-sm" value={filters.type} onChange={(e) => setF('type', e.target.value)}>
                    <option value="">All types</option>
                    {PLANT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>}
                {isPepper && <div className="col-6 col-md-auto">
                  <select className="form-select form-select-sm" value={filters.growth} onChange={(e) => setF('growth', e.target.value)}>
                    <option value="">All forms</option>
                    <option value="Climber">Climber</option>
                    <option value="Bush">Bush</option>
                  </select>
                </div>}
                <div className="col-6 col-md-auto">
                  <select className="form-select form-select-sm" value={filters.status} onChange={(e) => setF('status', e.target.value)}>
                    <option value="">All statuses</option>
                    {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {anyFilter && <div className="col-auto"><button className="btn btn-sm btn-ghost-danger" onClick={clearFilters}><i className="ri-close-line me-1" />Clear</button></div>}
              </div>
            </div>
          </div>
          <CrudCard
            title={`${crop} bookings (${rows.length}${anyFilter ? ' of ' + cropBookings.length : ''})`}
            addLabel={`Add ${crop.toLowerCase()} booking`} modalTitle={`${crop.toLowerCase()} booking`} modalSize="lg"
            emptyText={anyFilter ? 'No bookings match the filters.' : `No ${crop.toLowerCase()} bookings yet.`}
            rows={rows} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeBooking}
          />
        </>
      )}
    </div>
  )
}
