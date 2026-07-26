import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ImageField from '@/components/plantation/ImageField'
import { editPlant } from '@/data/plantationLandRepo'
import { useLookups, valuesFor, UPDATE_TYPE_LIST } from '@/data/lookupsRepo'
import {
  useUpdates, addUpdate, editUpdate, removeUpdate,
  UPDATE_TYPE, DEFECT_STATUS,
} from '@/data/plantationUpdatesRepo'

const LEVEL_LABEL = { zone: 'Zones', vertical: 'Rows', pole: 'Poles', plant: 'Plants' }
const LEVEL_ORDER = ['zone', 'vertical', 'pole', 'plant']
const DEFAULT_TYPES = ['regular', 'defect', 'dead', 'recovered']
const typeLabel = (v) => (UPDATE_TYPE[v]?.label || (v ? v.charAt(0).toUpperCase() + v.slice(1) : v))

/**
 * NodeTimeline — the updates / observations timeline for one hierarchy node.
 *
 * Shows every update against the node newest-first: observations, defects (with
 * a nested thread of remedies + results), dead/recovered marks, plus the planted
 * date as the origin. Add / edit / delete inline. When `onSyncStatus` is given
 * (plants), logging a defect/dead/recovered update flips the plant's status too.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
// Tie-break on created_at (true insertion order) so same-day entries keep the
// order they were added — not a random id order.
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
const byDateAsc = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')
// A logged type that should also move a plant's status badge.
const STATUS_FOR = { defect: 'defect', dead: 'dead', recovered: 'healthy' }

function Composer({ initial, kind, cascadeLevels, typeOptions, onSave, onCancel }) {
  // kind: 'entry' (regular/defect/dead/recovered) | 'remedy' | 'result'
  const fixedType = kind === 'remedy' ? 'remedy' : kind === 'result' ? 'result' : null
  const [f, setF] = useState({
    type: initial?.type || fixedType || 'regular',
    date: initial?.date || todayISO(),
    title: initial?.title || '',
    detail: initial?.detail || '',
    image: initial?.image || '',
    status: initial?.status || 'open',
  })
  const [sel, setSel] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const toggle = (t, on) => setSel((s) => { const n = new Set(s); on ? n.add(t) : n.delete(t); return n })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const isDefect = f.type === 'defect'
  const save = async () => {
    setErr(null); setSaving(true)
    try { await onSave({ ...f, type: fixedType || f.type, cascade: [...sel] }) }
    catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <div className="border rounded p-2 bg-light">
      <div className="row g-2">
        {!fixedType && (
          <div className="col-6">
            <label className="form-label small mb-1">Type</label>
            <select className="form-select form-select-sm" value={f.type} onChange={(e) => set('type', e.target.value)}>
              {(typeOptions && typeOptions.length ? typeOptions : DEFAULT_TYPES).map((v) => <option key={v} value={v}>{typeLabel(v)}</option>)}
            </select>
          </div>
        )}
        <div className={fixedType ? 'col-12' : 'col-6'}>
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        {!fixedType && (
          <div className="col-12">
            <label className="form-label small mb-1">{isDefect ? 'Defect' : 'Title'}</label>
            <input className="form-control form-control-sm" placeholder={isDefect ? 'Leaf spot / pest attack' : 'Short summary'} value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>
        )}
        <div className="col-12">
          <label className="form-label small mb-1">{fixedType === 'remedy' ? 'What was applied' : fixedType === 'result' ? 'Outcome' : 'Details'}</label>
          <textarea className="form-control form-control-sm" rows={2} value={f.detail} onChange={(e) => set('detail', e.target.value)} autoFocus={Boolean(fixedType)} />
        </div>
        {isDefect && (
          <div className="col-6">
            <label className="form-label small mb-1">Status</label>
            <select className="form-select form-select-sm" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {DEFECT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
        <div className="col-12">
          <label className="form-label small mb-1">Photo</label>
          <ImageField value={f.image} folder="plantation/updates" onChange={(v) => set('image', v)} />
        </div>
      </div>
      {cascadeLevels && cascadeLevels.length > 0 && (
        <div className="mt-2 pt-2 border-top">
          <label className="form-label small mb-1"><i className="ri-git-branch-line me-1" />Also record this individually on every…</label>
          <div className="d-flex flex-wrap gap-3">
            {cascadeLevels.map((l) => (
              <div className="form-check" key={l.type}>
                <input className="form-check-input" type="checkbox" id={'casc-' + l.type} checked={sel.has(l.type)} onChange={(e) => toggle(l.type, e.target.checked)} />
                <label className="form-check-label" htmlFor={'casc-' + l.type}>{l.label} <span className="text-muted">({l.count})</span></label>
              </div>
            ))}
          </div>
        </div>
      )}
      {err && <div className="alert alert-danger py-2 mt-2 mb-0 small">{err}</div>}
      <div className="d-flex gap-2 mt-2">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}><i className="ri-save-line me-1" />{saving ? 'Saving…' : initial ? 'Save' : 'Add'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}

function Dot({ type }) {
  const t = UPDATE_TYPE[type] || UPDATE_TYPE.regular
  return <span className={`tl-dot bg-${t.tone}-subtle text-${t.tone}`}><i className={t.icon} /></span>
}

export default function NodeTimeline({ open, entityType, entityId, entityLabel, landId, plantedDate, descendants, onSyncStatus, onClose }) {
  const { updates, reload } = useUpdates()
  const { lookups } = useLookups()
  const typeOptions = valuesFor(lookups, UPDATE_TYPE_LIST)
  const [composer, setComposer] = useState(null)  // { mode:'entry'|'remedy'|'result', parentId?, edit? }
  const [del, setDel] = useState(null)

  const mine = updates.filter((u) => u.entityType === entityType && u.entityId === entityId)
  const entries = mine.filter((u) => !u.parentId).sort(byDateDesc)
  const childrenOf = (id) => mine.filter((u) => u.parentId === id).sort(byDateAsc)

  // Levels below this node an observation can be cascaded down to.
  const cascadeLevels = LEVEL_ORDER
    .filter((t) => descendants && (descendants[t] || []).length > 0)
    .map((t) => ({ type: t, label: LEVEL_LABEL[t], count: descendants[t].length }))

  const closeComposer = () => setComposer(null)

  const saveEntry = async (form) => {
    const { cascade = [], ...fields } = form
    const base = { entityType, entityId, landId }
    if (composer.edit) {
      await editUpdate({ ...composer.edit, ...fields })
    } else if (composer.mode === 'entry') {
      await addUpdate({ ...base, ...fields, id: 'upd-' + rid() })
      if (onSyncStatus && STATUS_FOR[fields.type]) onSyncStatus(STATUS_FOR[fields.type])
      // Cascade the same entry individually onto each selected descendant.
      for (const lvl of cascade) {
        for (const n of descendants[lvl] || []) {
          // eslint-disable-next-line no-await-in-loop
          await addUpdate({ entityType: lvl, entityId: n.id, landId, ...fields, id: 'upd-' + rid() })
          if (lvl === 'plant' && STATUS_FOR[fields.type]) editPlant({ ...n, status: STATUS_FOR[fields.type] }).catch(console.error)
        }
      }
    } else {
      // remedy / result — child of a defect
      await addUpdate({ ...base, ...fields, id: 'upd-' + rid(), parentId: composer.parentId })
    }
    await reload()
    closeComposer()
  }

  const changeDefectStatus = (entry, status) => editUpdate({ ...entry, status }).then(reload).catch(console.error)

  const confirmDelete = async () => {
    const target = del
    setDel(null)
    const ids = [target.id, ...childrenOf(target.id).map((c) => c.id)]
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await removeUpdate(id)
    }
    await reload()
  }

  const editingId = composer?.edit?.id

  return (
    <Modal open={open} size="lg" title={<><i className="ri-time-line me-2 text-primary" />Timeline — {entityLabel}</>} onClose={onClose}>
      <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
        {plantedDate && <span className="badge bg-success-subtle text-success"><i className="ri-seedling-line me-1" />Planted {fmtDate(plantedDate)}</span>}
        <span className="text-muted small flex-grow-1">{entries.length} update{entries.length === 1 ? '' : 's'}</span>
        {!composer && <button className="btn btn-primary btn-sm" onClick={() => setComposer({ mode: 'entry' })}><i className="ri-add-line me-1" />Add update</button>}
      </div>

      {composer && composer.mode === 'entry' && !composer.edit && (
        <div className="mb-3"><Composer kind="entry" cascadeLevels={cascadeLevels} typeOptions={typeOptions} onSave={saveEntry} onCancel={closeComposer} /></div>
      )}

      {entries.length === 0 && !composer ? (
        <p className="text-muted text-center py-4 mb-0">No updates yet. Log the first observation.</p>
      ) : (
        <div className="tl">
          {entries.map((e) => {
            const t = UPDATE_TYPE[e.type] || UPDATE_TYPE.regular
            const kids = childrenOf(e.id)
            return (
              <div className="tl-item" key={e.id}>
                <Dot type={e.type} />
                <div className="tl-body">
                  {editingId === e.id ? (
                    <Composer kind="entry" initial={e} typeOptions={typeOptions} onSave={saveEntry} onCancel={closeComposer} />
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className={`badge bg-${t.tone}-subtle text-${t.tone}`}>{t.label}</span>
                        {e.type === 'defect' && (
                          <select className="form-select form-select-sm w-auto py-0" style={{ height: 24 }} value={e.status || 'open'} onChange={(ev) => changeDefectStatus(e, ev.target.value)}>
                            {DEFECT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        )}
                        <span className="text-muted small">{e.date ? fmtDate(e.date) : '—'}</span>
                        <span className="flex-grow-1" />
                        <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setComposer({ mode: 'entry', edit: e })}><i className="ri-pencil-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDel(e)}><i className="ri-delete-bin-line" /></button>
                      </div>
                      {e.title && <div className="fw-medium mt-1">{e.title}</div>}
                      {e.detail && <div className="text-muted small">{e.detail}</div>}
                      {e.image && <a href={e.image} target="_blank" rel="noreferrer"><img src={e.image} alt="" className="mt-1" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>}
                    </>
                  )}

                  {/* Defect thread: remedies & results */}
                  {e.type === 'defect' && editingId !== e.id && (
                    <div className="tl-thread mt-2">
                      {kids.map((c) => {
                        const ct = UPDATE_TYPE[c.type] || UPDATE_TYPE.remedy
                        return editingId === c.id ? (
                          <div className="mb-2" key={c.id}><Composer kind={c.type} initial={c} onSave={saveEntry} onCancel={closeComposer} /></div>
                        ) : (
                          <div className="d-flex align-items-start gap-2 mb-1" key={c.id}>
                            <i className={`${ct.icon} text-${ct.tone} mt-1`} />
                            <div className="flex-grow-1">
                              <span className={`badge bg-${ct.tone}-subtle text-${ct.tone} me-1`}>{ct.label}</span>
                              <span className="text-muted small">{c.date ? fmtDate(c.date) : ''}</span>
                              <div className="small">{c.detail}</div>
                              {c.image && <a href={c.image} target="_blank" rel="noreferrer"><img src={c.image} alt="" className="mt-1" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 5 }} /></a>}
                            </div>
                            <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setComposer({ mode: c.type, edit: c, parentId: e.id })}><i className="ri-pencil-line" /></button>
                            <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDel(c)}><i className="ri-delete-bin-line" /></button>
                          </div>
                        )
                      })}
                      {composer && composer.parentId === e.id && !composer.edit ? (
                        <div className="mt-2"><Composer kind={composer.mode} onSave={saveEntry} onCancel={closeComposer} /></div>
                      ) : (
                        <div className="d-flex gap-2 mt-1">
                          <button className="btn btn-sm btn-soft-warning px-2" onClick={() => setComposer({ mode: 'remedy', parentId: e.id })}><i className="ri-medicine-bottle-line me-1" />Add remedy</button>
                          <button className="btn btn-sm btn-soft-success px-2" onClick={() => setComposer({ mode: 'result', parentId: e.id })}><i className="ri-flask-line me-1" />Add result</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(del)}
        title="Delete update?"
        message={del ? `This ${(UPDATE_TYPE[del.type] || {}).label || 'update'}${del.type === 'defect' ? ' and its remedies/results' : ''} will be permanently removed.` : ''}
        confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)}
      />
    </Modal>
  )
}
