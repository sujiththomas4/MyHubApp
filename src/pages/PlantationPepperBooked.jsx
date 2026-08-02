import { useEffect, useRef, useState } from 'react'
import { money, fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import Modal from '@/components/ui/Modal'
import { usePepperBookings, addBooking, editBooking, removeBooking } from '@/data/pepperBookingRepo'
import { useLookups, valuesFor, VARIETY_LIST } from '@/data/lookupsRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import { useLands, landLabel, usePlants, usePoles, useVerticals, useZones, addPlant } from '@/data/plantationLandRepo'
import { useUpdates } from '@/data/plantationUpdatesRepo'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationPepperBooked.jsx — plants ordered for our plantation, one screen for
 * every crop (route /business/plantations/pepper-booked). Crop buttons switch
 * the whole view. Pepper carries Type / Variety / Climber-Bush; other crops
 * (Payyani, Thippali…) are always Normal and hide those fields/columns.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const pad2 = (n) => String(n).padStart(2, '0')
const PLANT_TONE = { healthy: 'success', defect: 'warning', dead: 'danger' }
const poleIsDeadFrom = (updates, poleId) => {
  const life = updates.filter((u) => u.entityType === 'pole' && u.entityId === poleId && !u.parentId && ['dead', 'replanted', 'recovered'].includes(u.type))
  if (!life.length) return false
  const latest = [...life].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')).pop()
  return latest.type === 'dead'
}
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

// Mini plot for the Track popup — only zones that hold a matching planned/planted pole.
function TrackPlot({ byPole, zones, verticals, poles }) {
  const relevant = new Set(Object.keys(byPole))
  const polesByVert = {}
  poles.forEach((p) => { if (relevant.has(p.id)) (polesByVert[p.verticalId] = polesByVert[p.verticalId] || []).push(p) })
  const vertsByZone = {}
  verticals.forEach((v) => { if (polesByVert[v.id]) (vertsByZone[v.zoneId] = vertsByZone[v.zoneId] || []).push(v) })
  const shownZones = zones.filter((z) => vertsByZone[z.id]).sort((a, b) => a.sortOrder - b.sortOrder)
  if (!shownZones.length) return <p className="text-muted text-center py-4 mb-0">No planned/planted poles to map yet.</p>
  const MAX = 6
  return (
    <>
      <div className="d-flex flex-wrap gap-3 small text-muted mb-2">
        <span><span className="plot-swatch bg-success" /> planted</span>
        <span><span className="plot-swatch bg-secondary" /> planned</span>
      </div>
      <div className="d-flex flex-column gap-3">
        {shownZones.map((z) => (
          <div className="plot-zone" key={z.id} style={{ minWidth: 190 }}>
            <div className="plot-zone-head"><span className="fw-medium text-truncate flex-grow-1">{z.name}</span>{z.code && <span className="ref-code ms-1">{z.code}</span>}</div>
            {vertsByZone[z.id].sort((a, b) => a.sortOrder - b.sortOrder).map((v) => (
              <div className="plot-row2" key={v.id}>
                <span className="plot-rowlabel" title={v.name}>{v.code || v.name}</span>
                <div className="plot-row-track">
                  {polesByVert[v.id].sort((a, b) => a.sortOrder - b.sortOrder).map((po) => {
                    const c = byPole[po.id] || { planned: 0, planted: 0 }
                    const dots = []
                    for (let i = 0; i < Math.min(c.planted, MAX); i++) dots.push('success')
                    for (let i = 0; i < Math.min(c.planned, MAX - dots.length); i++) dots.push('secondary')
                    const extra = (c.planted + c.planned) - dots.length
                    return (
                      <span className="plot-pole-col" key={po.id} title={`${c.planted} planted · ${c.planned} planned`}>
                        <span className={`plot-pole-box border-${c.planted > 0 ? 'success' : 'secondary'}`}>
                          {dots.map((d, i) => <span key={i} className={`plot-plant2 bg-${d}`} />)}
                          {extra > 0 && <span className="plot-plant-more2">+{extra}</span>}
                        </span>
                        <span className="plot-pole-cap">{po.code || po.label || ''}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

// Allocate tab — a clickable plot (zones → rows → poles, like Explorer). Click a
// live pole to add plants for this booking; validated against booking inventory.
function TrackAllocate({ booking, plants, bookings, poles, verticals, zones, updates, onClose }) {
  const b = booking
  const [stage, setStage] = useState('planned')
  const [counts, setCounts] = useState({})   // poleId -> pending count to add
  const [sel, setSel] = useState(null)        // pole being edited
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const usable = (x) => Math.max(0, (x.quantity || 0) - (x.defective || 0))
  const live = bookings.filter((x) => x.status !== 'cancelled' && x.crop === b.crop && (!b.plantType || x.plantType === b.plantType) && (!b.variety || x.variety === b.variety))
  const ordered = live.reduce((s, x) => s + usable(x), 0)
  const delivered = live.filter((x) => x.status === 'delivered').reduce((s, x) => s + usable(x), 0)
  const used = plants.filter((p) => p.crop === b.crop && (!b.plantType || p.plantType === b.plantType) && (!b.variety || p.variety === b.variety)).length
  const pool = stage === 'planted' ? Math.max(0, delivered - used) : Math.max(0, ordered - used)

  const vertById = Object.fromEntries(verticals.map((v) => [v.id, v]))
  const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]))
  const poleRef = (p) => { const v = vertById[p.verticalId]; const z = v && zoneById[v.zoneId]; return [z?.code, v?.code, p.code].filter(Boolean).join('-') }
  const plantsOnPole = (id) => plants.filter((p) => p.poleId === id)
  const poleTone = (ps) => { if (ps.some((p) => p.status === 'dead')) return 'danger'; if (ps.some((p) => p.status === 'defect')) return 'warning'; if (ps.some((p) => (p.status || 'healthy') === 'healthy')) return 'success'; return 'secondary' }

  const total = Object.values(counts).reduce((s, n) => s + (Math.floor(Number(n)) || 0), 0)
  const blocked = total > pool
  const setCount = (id, v) => setCounts((c) => ({ ...c, [id]: v }))

  // zones (scoped) that have rows with poles
  const polesByVert = {}
  poles.forEach((p) => { (polesByVert[p.verticalId] = polesByVert[p.verticalId] || []).push(p) })
  const vertsByZone = {}
  verticals.forEach((v) => { if (polesByVert[v.id]) (vertsByZone[v.zoneId] = vertsByZone[v.zoneId] || []).push(v) })
  const shownZones = zones
    .filter((z) => vertsByZone[z.id] && (!b.landId || z.landId === b.landId))
    .sort((a, c) => a.sortOrder - c.sortOrder)

  const allocate = async () => {
    if (total <= 0) { setErr('Click poles and set how many to add.'); return }
    if (blocked) { setErr(`Only ${pool} available for ${stage}. Reduce the counts.`); return }
    setSaving(true); setErr(null)
    try {
      const status = stage === 'planted' ? 'healthy' : 'na'
      for (const p of poles) {
        const n = Math.floor(Number(counts[p.id]) || 0)
        if (n <= 0) continue
        const start = plantsOnPole(p.id).reduce((m, pl) => { const mm = String(pl.code || pl.tag || '').match(/(\d+)\s*$/); return Math.max(m, mm ? Number(mm[1]) : 0) }, 0)
        for (let i = 1; i <= n; i++) {
          const num = start + i
          // eslint-disable-next-line no-await-in-loop
          await addPlant({ id: 'plant-' + rid(), poleId: p.id, tag: `Plant ${num}`, code: `BP${pad2(num)}`, crop: b.crop, plantType: b.plantType, variety: b.variety, stage, status, plantedDate: stage === 'planted' ? todayISO() : '', sortOrder: plantsOnPole(p.id).length + i - 1 })
        }
      }
      onClose()
    } catch (e) { setErr(e.message || 'Could not allocate.'); setSaving(false) }
  }

  return (
    <>
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
        <span className="badge bg-success-subtle text-success">{b.crop}</span>
        {b.plantType && <span className="badge bg-primary-subtle text-primary">{b.plantType}</span>}
        {b.variety && <span className="badge bg-light text-muted">{b.variety}</span>}
        <span className="ms-auto d-flex align-items-center gap-1">
          <span className="small text-muted">Stage</span>
          <select className="form-select form-select-sm w-auto" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="planned">Planned</option>
            <option value="planted">Planted</option>
          </select>
        </span>
      </div>
      <div className="border rounded p-2 mb-2 small d-flex flex-wrap gap-3">
        <span><i className="ri-truck-line me-1 text-success" />Usable delivered <strong>{delivered}</strong></span>
        <span><i className="ri-seedling-line me-1 text-muted" />Used <strong>{used}</strong></span>
        <span className="ms-auto">Available for <strong className={blocked ? 'text-danger' : 'text-primary'}>{stage}</strong>: {pool} · selecting {total}</span>
      </div>
      <div className="small text-muted mb-2">Click a pole to add plants. Red border = dead pole.</div>

      {sel && (
        <div className="border rounded p-2 mb-2 d-flex align-items-center gap-2">
          <span className="fw-medium">Pole {poleRef(sel) ? <span className="ref-code">{poleRef(sel)}</span> : (sel.label || '')}</span>
          {poleIsDeadFrom(updates, sel.id) && <span className="badge bg-danger-subtle text-danger">dead</span>}
          <span className="small text-muted ms-2">Add</span>
          <input type="number" min={0} className="form-control form-control-sm text-center" style={{ width: 80 }} value={counts[sel.id] || ''} onChange={(e) => setCount(sel.id, e.target.value)} autoFocus />
          <span className="small text-muted">plants here</span>
          <button className="btn btn-sm btn-light ms-auto" onClick={() => setSel(null)}>Done</button>
        </div>
      )}

      {shownZones.length === 0 ? (
        <p className="text-muted text-center py-4 mb-0">No poles{b.landId ? ' in this property' : ''} yet. Add them in the Explorer first.</p>
      ) : (
        <div className="d-flex flex-column gap-3" style={{ maxHeight: 380, overflowY: 'auto' }}>
          {shownZones.map((z) => {
            const zonePoles = vertsByZone[z.id].reduce((s, v) => s + (polesByVert[v.id]?.length || 0), 0)
            return (
            <div className="plot-zone" key={z.id} style={{ minWidth: 190 }}>
              <div className="plot-zone-head"><span className="fw-medium text-truncate flex-grow-1">{z.name}</span>{z.code && <span className="ref-code ms-1">{z.code}</span>}<span className="badge bg-light text-muted ms-1">{zonePoles} pole{zonePoles === 1 ? '' : 's'}</span></div>
              {vertsByZone[z.id].sort((a, c) => a.sortOrder - c.sortOrder).map((v) => (
                <div className="plot-row2" key={v.id}>
                  <span className="plot-rowlabel" title={v.name}>{v.code || v.name}</span>
                  <div className="plot-row-track">
                    {polesByVert[v.id].sort((a, c) => a.sortOrder - c.sortOrder).map((po) => {
                      const ps = plantsOnPole(po.id)
                      const dead = poleIsDeadFrom(updates, po.id)
                      const pending = Math.floor(Number(counts[po.id]) || 0)
                      const tone = dead ? 'danger' : (pending > 0 ? 'primary' : poleTone(ps))
                      return (
                        <button type="button" key={po.id} className="plot-pole-col" onClick={() => setSel(po)} title={`${ps.length} plants${pending ? ` · +${pending} pending` : ''}${dead ? ' · dead' : ''}`}>
                          <span className={`plot-pole-box border-${tone}` + (sel && sel.id === po.id ? ' shadow' : '')}>
                            {ps.slice(0, 6).map((pl) => <span key={pl.id} className={`plot-plant2 bg-${PLANT_TONE[pl.status] || 'secondary'}`} />)}
                            {pending > 0 && <span className="plot-plant-more2 text-primary">+{pending}</span>}
                            {ps.length === 0 && pending === 0 && <span className="plot-pole-empty">·</span>}
                          </span>
                          <span className="plot-pole-cap">{po.code || po.label || ''}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )})}
        </div>
      )}

      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={allocate} disabled={saving || total <= 0 || blocked}><i className="ri-add-line me-1" />{saving ? 'Allocating…' : `Allocate ${total || ''} plant${total === 1 ? '' : 's'}`}</button>
      </div>
    </>
  )
}

// Show/hide columns dropdown.
function ColumnMenu({ columns, vis, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div className="position-relative" ref={ref}>
      <button type="button" className="btn btn-sm btn-light border" onClick={() => setOpen((o) => !o)}>
        <i className="ri-layout-column-line me-1" />Columns
      </button>
      {open && (
        <div className="dropdown-menu show p-0 mt-1" style={{ minWidth: 200 }}>
          {columns.map((c) => (
            <button type="button" key={c.id} className={'ss-item' + (vis[c.id] !== false ? ' active' : '')} onClick={() => onToggle(c.id)}>
              <i className={'me-2 ' + (vis[c.id] !== false ? 'ri-checkbox-line text-primary' : 'ri-checkbox-blank-line')} />{c.header || c.id}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
  const { plants } = usePlants()
  const { poles } = usePoles()
  const { verticals } = useVerticals()
  const { zones } = useZones()
  const { updates } = useUpdates()
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  // Plants matching a booking's crop / type / variety (the inventory it feeds).
  const matchPlantsFor = (b) => plants.filter((p) => p.crop === b.crop && (!b.plantType || p.plantType === b.plantType) && (!b.variety || p.variety === b.variety))
  const plannedOf = (b) => matchPlantsFor(b).filter((p) => p.stage === 'planned').length
  const plantedOf = (b) => matchPlantsFor(b).filter((p) => p.stage !== 'planned').length

  const [trackBooking, setTrackBooking] = useState(null)
  const [trackTab, setTrackTab] = useState('allocated')
  const [visCols, setVisCols] = useState({ property: false })  // false = hidden; others default visible
  const toggleCol = (id) => setVisCols((v) => ({ ...v, [id]: v[id] === false ? true : false }))

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

  const allColumns = [
    {
      id: 'nursery', header: 'Nursery',
      cell: (b) => (
        <div>
          <div className="fw-medium">{b.nursery}</div>
          {b.phone && <div className="text-muted small"><i className="ri-phone-line me-1" />{b.phone}</div>}
          {b.address && <div className="text-muted small"><i className="ri-map-pin-line me-1" />{b.address}</div>}
        </div>
      ),
    },
    { id: 'property', header: 'Property', className: 'text-muted', cell: (b) => landName(b.landId) || '—' },
    ...(isPepper ? [{
      id: 'type', header: 'Type',
      cell: (b) => (
        <>
          {b.plantType && <span className={'badge ' + (PLANT_BADGE[b.plantType] || 'bg-light text-muted')}>{b.plantType}</span>}
          {b.growthForm && <span className={'badge ms-1 ' + (GROWTH_BADGE[b.growthForm] || 'bg-light text-muted')}>{b.growthForm}</span>}
          {!b.plantType && !b.growthForm && '—'}
        </>
      ),
    }] : []),
    { id: 'variety', header: 'Variety', cell: (b) => (b.variety ? <span className="badge bg-success-subtle text-success">{b.variety}</span> : '—') },
    { id: 'plants', header: 'Plants', className: 'text-center', cell: (b) => (<><span>{b.quantity || '—'}</span>{b.defective > 0 && <div className="text-danger small">{b.defective} defective</div>}</>) },
    {
      id: 'progress', header: 'Planned / Planted', className: 'text-center',
      cell: (b) => {
        const pl = plannedOf(b); const pt = plantedOf(b)
        const left = Math.max(0, (b.quantity || 0) - (b.defective || 0) - pl - pt)
        return (
          <div className="small">
            <span className="badge bg-secondary-subtle text-secondary">{pl} planned</span>
            <span className="badge bg-success-subtle text-success ms-1">{pt} planted</span>
            {left > 0 && <div className="text-muted mt-1">{left} left</div>}
          </div>
        )
      },
    },
    {
      id: 'amount', header: 'Amount', className: 'text-end',
      cell: (b) => (b.rate || b.deliveryCharge ? (
        <div>
          <div className="fw-semibold">{money(amountOf(b), 'INR')}</div>
          <div className="text-muted small">adv {money(b.advance, 'INR')} · bal {money(amountOf(b) - b.advance, 'INR')}{b.deliveryCharge ? ` · del ${money(b.deliveryCharge, 'INR')}` : ''}</div>
        </div>
      ) : '—'),
    },
    { id: 'assigned', header: 'Assigned', cell: (b) => (b.assigned ? <span className="badge bg-info-subtle text-info">{b.assigned}</span> : '—') },
    { id: 'action', header: 'Action', className: 'text-muted', cell: (b) => (b.actions ? <span title={b.actions}>{b.actions.length > 40 ? b.actions.slice(0, 40) + '…' : b.actions}</span> : '—') },
    { id: 'delivery', header: 'Delivery', className: 'text-muted', cell: (b) => (b.deliveryDate ? fmtDate(b.deliveryDate) : '—') },
    { id: 'status', header: 'Status', cell: (b) => <span className={'badge ' + (STATUS_BADGE[b.status] || STATUS_BADGE.booked)}>{STATUS_LABEL[b.status] || b.status}</span> },
    { id: 'track', header: 'Allocate', className: 'text-center', cell: (b) => <button className="btn btn-sm btn-soft-primary px-2" onClick={() => { setTrackTab('allocated'); setTrackBooking(b) }}><i className="ri-seedling-line me-1" />Allocate</button> },
  ]
  const columns = allColumns.filter((c) => visCols[c.id] !== false)

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
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <div className="btn-group btn-group-sm" role="group">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={'btn ' + (view === v.id ? 'btn-primary' : 'btn-light')} onClick={() => setView(v.id)}>
              <i className={v.icon + ' me-1'} />{v.label}
            </button>
          ))}
        </div>
        {view !== 'stats' && <span className="ms-auto"><ColumnMenu columns={allColumns} vis={visCols} onToggle={toggleCol} /></span>}
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

      {trackBooking && (() => {
        const b = trackBooking
        const poleById = Object.fromEntries(poles.map((p) => [p.id, p]))
        const vertById = Object.fromEntries(verticals.map((v) => [v.id, v]))
        const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]))
        const byPole = {}
        matchPlantsFor(b).forEach((p) => {
          const g = byPole[p.poleId] || { planned: 0, planted: 0 }
          if (p.stage === 'planned') g.planned += 1; else g.planted += 1
          byPole[p.poleId] = g
        })
        const locs = Object.entries(byPole).map(([poleId, c]) => {
          const pole = poleById[poleId]; const v = pole && vertById[pole.verticalId]; const z = v && zoneById[v.zoneId]
          const ref = [z?.code, v?.code, pole?.code].filter(Boolean).join('-')
          const label = [z?.name, v?.name, pole ? `Pole ${pole.label || ''}`.trim() : '(unknown)'].filter(Boolean).join(' / ')
          return { poleId, ref, label, ...c }
        }).sort((a, c) => (a.ref || '').localeCompare(c.ref || ''))
        const totPlanned = locs.reduce((s, r) => s + r.planned, 0)
        const totPlanted = locs.reduce((s, r) => s + r.planted, 0)
        return (
          <Modal open size="lg" title={<><i className="ri-map-pin-2-line me-2 text-primary" />Where planted — {b.crop}{b.variety ? ` · ${b.variety}` : ''}{b.plantType ? ` · ${b.plantType}` : ''}</>} onClose={() => setTrackBooking(null)}>
            <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
              <span className="badge bg-secondary-subtle text-secondary">{totPlanned} planned</span>
              <span className="badge bg-success-subtle text-success">{totPlanted} planted</span>
              <span className="text-muted small">across {locs.length} pole{locs.length === 1 ? '' : 's'}</span>
              <span className="ms-auto btn-group btn-group-sm">
                <button type="button" className={'btn ' + (trackTab === 'allocated' ? 'btn-primary' : 'btn-light')} onClick={() => setTrackTab('allocated')}><i className="ri-map-pin-2-line me-1" />Allocated</button>
                <button type="button" className={'btn ' + (trackTab === 'allocate' ? 'btn-primary' : 'btn-light')} onClick={() => setTrackTab('allocate')}><i className="ri-add-circle-line me-1" />Allocate</button>
              </span>
            </div>
            {trackTab === 'allocate'
              ? <TrackAllocate booking={b} plants={plants} bookings={bookings} poles={poles} verticals={verticals} zones={zones} updates={updates} onClose={() => setTrackBooking(null)} />
              : <TrackPlot byPole={byPole} zones={zones} verticals={verticals} poles={poles} />}
          </Modal>
        )
      })()}
    </div>
  )
}
