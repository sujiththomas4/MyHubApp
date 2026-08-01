import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { usePlants, addPlant } from '@/data/plantationLandRepo'
import { usePepperBookings } from '@/data/pepperBookingRepo'

/**
 * AddPlantModal — inventory-aware add plant(s) on a pole.
 *
 * The pepper bookings are treated as inventory. Crop / type / variety are chosen
 * from what's booked. Stage decides which stock is usable:
 *   • Planned  → any non-cancelled booking (booked / need-action / delivered)
 *   • Planted  → only DELIVERED stock (blocks if not enough delivered)
 * `used` = plants already recorded for that crop/type/variety.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const pad2 = (n) => String(n).padStart(2, '0')
const uniq = (a) => [...new Set(a.filter(Boolean))]

export default function AddPlantModal({ open, poleId, poleRef, onClose }) {
  const { plants } = usePlants()
  const { bookings } = usePepperBookings()
  const [stage, setStage] = useState('planned')
  const [crop, setCrop] = useState('')
  const [ptype, setPtype] = useState('')
  const [variety, setVariety] = useState('')
  const [count, setCount] = useState(1)
  const [status, setStatus] = useState('na')
  const [plantedDate, setPlantedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  // Planned plants are always N/A; planted plants can't be N/A.
  const changeStage = (v) => { setStage(v); setStatus(v === 'planned' ? 'na' : 'healthy') }

  const live = bookings.filter((b) => b.status !== 'cancelled')
  const crops = uniq(live.map((b) => b.crop))
  const typesFor = uniq(live.filter((b) => !crop || b.crop === crop).map((b) => b.plantType))
  const types = typesFor.length ? typesFor : ['Grafted', 'Normal']
  const varieties = uniq(live.filter((b) => (!crop || b.crop === crop) && (!ptype || b.plantType === ptype)).map((b) => b.variety))

  useEffect(() => {
    if (!open) return
    setStage('planned'); setCount(1); setStatus('na'); setPlantedDate(''); setErr(null); setSaving(false)
    const c = uniq(bookings.filter((b) => b.status !== 'cancelled').map((b) => b.crop))
    setCrop(c[0] || ''); setPtype(''); setVariety('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Inventory for the chosen crop / type / variety. Usable = quantity − defective.
  const usable = (b) => Math.max(0, (b.quantity || 0) - (b.defective || 0))
  const match = live.filter((b) => (!crop || b.crop === crop) && (!ptype || b.plantType === ptype) && (!variety || b.variety === variety))
  const ordered = match.reduce((s, b) => s + usable(b), 0)
  const delivered = match.filter((b) => b.status === 'delivered').reduce((s, b) => s + usable(b), 0)
  const defectiveTotal = match.reduce((s, b) => s + (b.defective || 0), 0)
  const used = plants.filter((p) => (!crop || p.crop === crop) && (!ptype || p.plantType === ptype) && (!variety || p.variety === variety)).length
  const availAll = Math.max(0, ordered - used)
  const availDelivered = Math.max(0, delivered - used)
  const n = Math.max(1, Math.min(500, Math.floor(Number(count) || 1)))
  const pool = stage === 'planted' ? availDelivered : availAll
  const blocked = n > pool

  const save = async () => {
    if (!crop) { setErr('Pick a crop from the booking inventory.'); return }
    if (blocked) {
      setErr(stage === 'planted'
        ? `Only ${availDelivered} delivered plant(s) available for this selection. Deliver the booking (or reduce the count).`
        : `Only ${availAll} plant(s) available in inventory for this selection (usable ordered − used). Book/deliver more, or reduce the count.`)
      return
    }
    setSaving(true); setErr(null)
    try {
      const sibs = plants.filter((p) => p.poleId === poleId)
      const nums = sibs.map((p) => { const m = String(p.code || p.tag || '').match(/(\d+)\s*$/); return m ? Number(m[1]) : 0 })
      let next = (nums.length ? Math.max(...nums) : 0) + 1
      let order = sibs.length
      const finalStatus = stage === 'planned' ? 'na' : status
      for (let i = 0; i < n; i++) {
        // eslint-disable-next-line no-await-in-loop
        await addPlant({ id: 'plant-' + rid(), poleId, tag: `Plant ${next}`, code: `BP${pad2(next)}`, crop, plantType: ptype, variety, stage, status: finalStatus, plantedDate: stage === 'planted' ? plantedDate : '', sortOrder: order })
        next++; order++
      }
      setSaving(false)
      onClose()
    } catch (e) { setErr(e.message || 'Could not add plants.'); setSaving(false) }
  }

  return (
    <Modal open={open} title={<><i className="ri-seedling-line me-2 text-success" />Add plants{poleRef ? <span className="ref-code ms-2">{poleRef}</span> : null}</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-4">
          <label className="form-label small mb-1">Stage</label>
          <select className="form-select form-select-sm" value={stage} onChange={(e) => changeStage(e.target.value)}>
            <option value="planned">Planned</option>
            <option value="planted">Planted</option>
          </select>
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">Status</label>
          {stage === 'planned' ? (
            <input className="form-control form-control-sm" value="N/A (not planted)" disabled readOnly />
          ) : (
            <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="healthy">Healthy</option>
              <option value="defect">Defect</option>
              <option value="dead">Dead</option>
            </select>
          )}
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">How many</label>
          <input type="number" min={1} max={500} className="form-control form-control-sm" value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">Crop</label>
          <select className="form-select form-select-sm" value={crop} onChange={(e) => { setCrop(e.target.value); setPtype(''); setVariety('') }}>
            <option value="">— select —</option>
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">Type</label>
          <select className="form-select form-select-sm" value={ptype} onChange={(e) => { setPtype(e.target.value); setVariety('') }}>
            <option value="">— any —</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">Variety</label>
          <select className="form-select form-select-sm" value={variety} onChange={(e) => setVariety(e.target.value)}>
            <option value="">— any —</option>
            {varieties.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {stage === 'planted' && (
          <div className="col-6">
            <label className="form-label small mb-1">Planted on</label>
            <input type="date" className="form-control form-control-sm" value={plantedDate} onChange={(e) => setPlantedDate(e.target.value)} />
          </div>
        )}
      </div>

      {/* Inventory read-out */}
      <div className="border rounded p-2 mt-3 small">
        <div className="d-flex flex-wrap gap-3">
          <span><i className="ri-shopping-bag-3-line me-1 text-muted" />Usable ordered <strong>{ordered}</strong></span>
          <span><i className="ri-truck-line me-1 text-success" />Usable delivered <strong>{delivered}</strong></span>
          {defectiveTotal > 0 && <span className="text-danger"><i className="ri-close-circle-line me-1" />Defective <strong>{defectiveTotal}</strong></span>}
          <span><i className="ri-seedling-line me-1 text-muted" />Used <strong>{used}</strong></span>
        </div>
        <div className="mt-1">
          Available — <span className={stage === 'planned' ? 'fw-bold text-primary' : ''}>planned: {availAll}</span> · <span className={stage === 'planted' ? 'fw-bold text-primary' : ''}>planting: {availDelivered}</span>
        </div>
        {blocked && (
          <div className="text-danger mt-1"><i className="ri-error-warning-line me-1" />Not enough inventory — only <strong>{pool}</strong> available for {stage === 'planted' ? 'planting (delivered)' : 'planned'}. Reduce the count{stage === 'planted' && availAll > availDelivered ? ' or mark as Planned' : ''}.</div>
        )}
        {crops.length === 0 && <div className="text-muted mt-1">No bookings yet. Add stock in Plants Booked to use inventory.</div>}
      </div>

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || blocked}>
          <i className="ri-add-line me-1" />{saving ? 'Adding…' : `Add ${n} plant${n === 1 ? '' : 's'}`}
        </button>
      </div>
    </Modal>
  )
}
