import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Field from '@/components/plantation/Field'
import { ENTITY } from '@/data/plantationForms'
import { useLookups, valuesFor } from '@/data/lookupsRepo'

/**
 * BulkAddModal — create many siblings at once (zones / rows / poles / plants).
 *
 * The user picks a count and a name/code pattern; each item is auto-numbered so
 * the reference code composes correctly down the tree (e.g. CHRY-ZA-R1-P1..P10).
 * `parentRef` is the composed reference of the parent, shown in the live preview.
 * `onCreate(rows)` receives the ready-to-insert row objects (no id/parent yet —
 * the caller stamps those).
 */
const MAX = 500

export default function BulkAddModal({ open, type, parentRef = '', defaultStart = 1, onClose, onCreate }) {
  const cfg = type ? ENTITY[type] : null
  const bulk = cfg?.bulk
  const { lookups } = useLookups()

  const [count, setCount] = useState(5)
  const [namePrefix, setNamePrefix] = useState('')
  const [codePrefix, setCodePrefix] = useState('')
  const [start, setStart] = useState(1)
  const [pad, setPad] = useState(2)
  const [shared, setShared] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!open || !cfg) return
    setCount(5)
    setNamePrefix(bulk?.namePrefix ?? '')
    setCodePrefix(bulk?.codePrefix ?? '')
    setStart(defaultStart || 1)
    setPad(2)
    setShared(cfg.blank())
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type, defaultStart])

  if (!cfg) return null

  const setSharedField = (k, v) => setShared((s) => ({ ...s, [k]: v }))
  const sharedFields = (bulk?.shared || []).map((k) => {
    const base = cfg.fields.find((f) => f.key === k)
    if (!base) return null
    const listName = bulk?.lookups?.[k]
    // A lookup-backed field becomes a searchable dropdown of its master-data values.
    if (listName) return { ...base, type: 'search', allowCustom: true, options: valuesFor(lookups, listName), placeholder: `Search ${base.label.toLowerCase()}…` }
    return base
  }).filter(Boolean)

  const n = Math.max(0, Math.min(MAX, Math.floor(Number(count) || 0)))
  const s0 = Math.max(0, Math.floor(Number(start) || 0))
  const suffix = (i) => { const raw = String(s0 + i); return pad > 0 ? raw.padStart(pad, '0') : raw }
  const items = Array.from({ length: n }, (_, i) => ({ name: namePrefix + suffix(i), code: codePrefix + suffix(i) }))
  const refFor = (code) => [parentRef, code].filter(Boolean).join('-')

  const create = async () => {
    if (n < 1) { setErr('Enter how many to create.'); return }
    setErr(null); setSaving(true)
    try {
      const rows = items.map((it) => ({ ...shared, [bulk.nameKey]: it.name, code: it.code }))
      await onCreate(rows)
      onClose()
    } catch (e) { setErr(e.message || 'Could not create.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={<><i className="ri-stack-line me-2 text-primary" />Bulk add {cfg.singular}s</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-4">
          <label className="form-label small mb-1">How many</label>
          <input type="number" min={1} max={MAX} className="form-control" value={count} onChange={(e) => setCount(e.target.value)} autoFocus />
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">Start at</label>
          <input type="number" min={0} className="form-control" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="col-4">
          <label className="form-label small mb-1">Pad digits</label>
          <input type="number" min={0} max={6} className="form-control" value={pad} onChange={(e) => setPad(Math.max(0, Math.min(6, Math.floor(Number(e.target.value) || 0))))} />
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Name prefix</label>
          <input className="form-control" value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} placeholder="Pole " />
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Code prefix</label>
          <input className="form-control" value={codePrefix} onChange={(e) => setCodePrefix(e.target.value)} placeholder="P" />
        </div>
        {sharedFields.map((f) => (
          <div key={f.key} className={f.colClass || 'col-6'}>
            <label className="form-label small mb-1">{f.label} <span className="text-muted">(all)</span></label>
            <Field field={f} form={shared} set={setSharedField} />
          </div>
        ))}
      </div>

      <label className="form-label small mb-1 mt-3">Preview</label>
      <div className="border rounded p-2 bg-light small" style={{ maxHeight: 190, overflowY: 'auto' }}>
        {n === 0 ? (
          <span className="text-muted">Nothing to create yet.</span>
        ) : (
          <>
            {items.slice(0, 8).map((it, i) => (
              <div key={i} className="d-flex align-items-center justify-content-between">
                <span className="fw-medium text-truncate">{it.name}</span>
                <span className="ref-code ms-2">{refFor(it.code) || it.code}</span>
              </div>
            ))}
            {n > 8 && <div className="text-muted mt-1">… and {n - 8} more</div>}
          </>
        )}
      </div>

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={create} disabled={saving || n < 1}>
          <i className="ri-stack-line me-1" />{saving ? 'Creating…' : `Create ${n} ${cfg.singular}${n === 1 ? '' : 's'}`}
        </button>
      </div>
    </Modal>
  )
}
