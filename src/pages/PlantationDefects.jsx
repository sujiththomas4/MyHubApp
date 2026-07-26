import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import {
  useLands, useZones, useVerticals, usePoles, usePlants, editPlant, descendantsByLevel,
} from '@/data/plantationLandRepo'
import {
  useUpdates, addUpdate, DEFECT_STATUS, DEFECT_STATUS_BADGE, UPDATE_TYPE,
} from '@/data/plantationUpdatesRepo'
import Modal from '@/components/ui/Modal'
import SearchSelect from '@/components/ui/SearchSelect'
import ImageField from '@/components/plantation/ImageField'
import NodeTimeline from '@/components/plantation/NodeTimeline'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationDefects.jsx — a plantation-wide register of defects, now backed by the
 * unified updates log (type='defect'). Each defect carries a thread of remedies &
 * results, managed in the timeline. Log a defect against any node here; open the
 * timeline to add remedies/results over time.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const PARENT = { zone: 'land', vertical: 'zone', pole: 'vertical', plant: 'pole' }
const PFIELD = { zone: 'landId', vertical: 'zoneId', pole: 'verticalId', plant: 'poleId' }
const SINGULAR = { land: 'Property', zone: 'Zone', vertical: 'Row', pole: 'Pole', plant: 'Plant' }
const REF_ORDER = ['land', 'zone', 'vertical', 'pole', 'plant']
const STATUS_FOR = { defect: 'defect' }

export default function PlantationDefects() {
  const { lands } = useLands()
  const { zones } = useZones()
  const { verticals } = useVerticals()
  const { poles } = usePoles()
  const { plants } = usePlants()
  const { updates, reload } = useUpdates()

  const [property, setProperty] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [timeline, setTimeline] = useState(null)
  const [logging, setLogging] = useState(false)

  const byId = {
    land: Object.fromEntries(lands.map((x) => [x.id, x])),
    zone: Object.fromEntries(zones.map((x) => [x.id, x])),
    vertical: Object.fromEntries(verticals.map((x) => [x.id, x])),
    pole: Object.fromEntries(poles.map((x) => [x.id, x])),
    plant: Object.fromEntries(plants.map((x) => [x.id, x])),
  }
  const nameOf = (type, n) => (!n ? '' : type === 'pole' ? (n.label || 'Pole') : type === 'plant' ? (n.tag || n.variety || 'Plant') : n.name)

  // Walk up the tree from any node → { label, ref, landId, plantedDate }.
  const resolve = (type, id) => {
    const nodes = {}
    let curType = type, cur = byId[type]?.[id]
    nodes[type] = cur
    while (cur && PARENT[curType]) {
      const pt = PARENT[curType]
      cur = byId[pt]?.[cur[PFIELD[curType]]]
      nodes[pt] = cur; curType = pt
    }
    const ref = REF_ORDER.filter((t) => nodes[t]).map((t) => nodes[t].code).filter(Boolean).join('-')
    const self = byId[type]?.[id]
    return {
      label: self ? `${SINGULAR[type]} ${nameOf(type, self)}`.trim() : '(deleted node)',
      ref,
      landId: nodes.land?.id || (type === 'land' ? id : ''),
      plantedDate: type === 'plant' ? (self?.plantedDate || '') : '',
    }
  }

  // Every defect (top-level update of type 'defect'), newest first.
  const defects = updates.filter((u) => u.type === 'defect' && !u.parentId)
  const kids = (id) => updates.filter((u) => u.parentId === id)
  const scoped = defects
    .filter((d) => !property || d.landId === property)
    .filter((d) => statusFilter === 'all' || (d.status || 'open') === statusFilter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const counts = { open: 0, treating: 0, resolved: 0 }
  defects.filter((d) => !property || d.landId === property).forEach((d) => { counts[d.status || 'open'] = (counts[d.status || 'open'] || 0) + 1 })

  const openTimeline = (d) => {
    const r = resolve(d.entityType, d.entityId)
    setTimeline({
      entityType: d.entityType, entityId: d.entityId, landId: d.landId || r.landId,
      entityLabel: `${r.label}${r.ref ? ` · ${r.ref}` : ''}`, plantedDate: r.plantedDate,
      descendants: descendantsByLevel(d.entityType, d.entityId, { zones, verticals, poles, plants }),
      node: byId[d.entityType]?.[d.entityId],
    })
  }

  // ---- Log a new defect against any node -------------------------------------
  const entityOpts = [
    ...plants.map((p) => ({ v: 'plant:' + p.id, ...resolve('plant', p.id) })),
    ...poles.map((p) => ({ v: 'pole:' + p.id, ...resolve('pole', p.id) })),
    ...verticals.map((x) => ({ v: 'vertical:' + x.id, ...resolve('vertical', x.id) })),
    ...zones.map((x) => ({ v: 'zone:' + x.id, ...resolve('zone', x.id) })),
    ...lands.map((x) => ({ v: 'land:' + x.id, ...resolve('land', x.id) })),
  ].map((o) => ({ value: o.v, label: o.ref ? `${o.label} · ${o.ref}` : o.label }))

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

      <div className="row g-3 mb-3">
        {DEFECT_STATUS.map((s) => (
          <div className="col-md-4 col-6" key={s.value}>
            <button className={'card stat-card h-100 mb-0 w-100 text-start ' + (statusFilter === s.value ? 'border border-2 border-info' : 'border-0')} onClick={() => setStatusFilter(statusFilter === s.value ? 'all' : s.value)}>
              <div className="card-body">
                <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{s.label}</span></div><div className={'stat-icon ' + (DEFECT_STATUS_BADGE[s.value])}><i className="ri-bug-line" /></div></div>
                <h4 className="stat-value mt-3 mb-0">{counts[s.value] || 0}</h4>
                <span className="text-muted small">{statusFilter === s.value ? 'filtering' : 'tap to filter'}</span>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Defect register <span className="text-muted fs-13 fw-normal">({scoped.length})</span></h5>
          {statusFilter !== 'all' && <button className="btn btn-sm btn-light" onClick={() => setStatusFilter('all')}>Show all</button>}
          <button className="btn btn-primary btn-sm" onClick={() => setLogging(true)}><i className="ri-add-line me-1" />Log defect</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th></th><th>Defect</th><th>On</th><th>Identified</th>
                  <th className="text-center">Remedies</th><th className="text-center">Results</th>
                  <th className="text-center">Status</th><th className="text-end">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {scoped.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No defects{statusFilter === 'all' ? ' logged. 🌱' : ` that are ${statusFilter}.`}</td></tr>
                ) : scoped.map((d) => {
                  const r = resolve(d.entityType, d.entityId)
                  const rem = kids(d.id).filter((k) => k.type === 'remedy').length
                  const res = kids(d.id).filter((k) => k.type === 'result').length
                  return (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => openTimeline(d)}>
                      <td className="text-center">{d.image ? <img src={d.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} /> : <i className="ri-bug-line text-muted" />}</td>
                      <td><div className="fw-medium">{d.title || 'Defect'}</div>{d.detail && <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>{d.detail}</div>}</td>
                      <td className="text-muted"><div>{r.label}</div>{r.ref && <span className="ref-code">{r.ref}</span>}</td>
                      <td className="text-muted">{d.date ? fmtDate(d.date) : '—'}</td>
                      <td className="text-center">{rem > 0 ? <span className="badge bg-warning-subtle text-dark"><i className={UPDATE_TYPE.remedy.icon} /> {rem}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-center">{res > 0 ? <span className="badge bg-success-subtle text-success"><i className={UPDATE_TYPE.result.icon} /> {res}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-center"><span className={'badge ' + (DEFECT_STATUS_BADGE[d.status] || DEFECT_STATUS_BADGE.open)}>{d.status || 'open'}</span></td>
                      <td className="text-end"><button className="btn btn-sm btn-soft-info px-2" onClick={(e) => { e.stopPropagation(); openTimeline(d) }}><i className="ri-time-line me-1" />Open</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LogDefectModal
        open={logging} entityOpts={entityOpts}
        onClose={() => setLogging(false)}
        onSave={async ({ entity, title, detail, date, status, image }) => {
          const [entityType, entityId] = entity.split(':')
          const { landId } = resolve(entityType, entityId)
          await addUpdate({ entityType, entityId, landId, type: 'defect', title, detail, date, status, image, id: 'upd-' + rid() })
          if (entityType === 'plant' && STATUS_FOR.defect) {
            const plant = byId.plant[entityId]
            if (plant) editPlant({ ...plant, status: 'defect' }).catch(console.error)
          }
          await reload()
          setLogging(false)
        }}
      />

      <NodeTimeline
        open={Boolean(timeline)}
        entityType={timeline?.entityType} entityId={timeline?.entityId}
        entityLabel={timeline?.entityLabel} landId={timeline?.landId} plantedDate={timeline?.plantedDate}
        descendants={timeline?.descendants}
        onSyncStatus={timeline?.entityType === 'plant' && timeline?.node ? ((status) => editPlant({ ...timeline.node, status }).catch(console.error)) : undefined}
        onClose={() => setTimeline(null)}
      />
    </div>
  )
}

function LogDefectModal({ open, entityOpts, onClose, onSave }) {
  const [f, setF] = useState({ entity: '', title: '', detail: '', date: todayISO(), status: 'open', image: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.entity) { setErr('Pick which node this defect is on.'); return }
    if (!f.title.trim()) { setErr('Describe the defect.'); return }
    setErr(null); setSaving(true)
    try { await onSave(f); setF({ entity: '', title: '', detail: '', date: todayISO(), status: 'open', image: '' }) }
    catch (e) { setErr(e.message || 'Could not save.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={<><i className="ri-bug-line me-2 text-danger" />Log defect</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-12">
          <label className="form-label small mb-1">On which node</label>
          <SearchSelect value={f.entity} onChange={(v) => set('entity', v)} options={entityOpts} placeholder="Search plant / pole / row / zone…" />
        </div>
        <div className="col-12">
          <label className="form-label small mb-1">Defect</label>
          <input className="form-control form-control-sm" placeholder="Leaf spot / pest attack" value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label small mb-1">Details</label>
          <textarea className="form-control form-control-sm" rows={2} value={f.detail} onChange={(e) => set('detail', e.target.value)} />
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Identified on</label>
          <input type="date" className="form-control form-control-sm" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Status</label>
          <select className="form-select form-select-sm" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {DEFECT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label small mb-1">Photo</label>
          <ImageField value={f.image} folder="plantation/updates" onChange={(v) => set('image', v)} />
        </div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Log defect'}</button>
      </div>
    </Modal>
  )
}
