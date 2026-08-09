import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import { usePlantationActivities, addActivity as apiAdd, editActivity as apiEdit, removeActivity as apiRemove } from '@/data/plantationRepo'
import { useLands, landLabel } from '@/data/plantationLandRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationActivities.jsx
 * -----------------------------------------------------------------------------
 * Plantation activity log / to-do with due dates, assignment, and done/planned
 * status. Tabs: All / Pending / Completed / Delayed. Add / edit / delete.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const isCompleted = (a) => a.status === 'done'
const isPending = (a) => a.status !== 'done'
const isDelayed = (a) => a.status !== 'done' && a.dueDate < todayISO()

function ActivityForm({ initial, onSave, onCancel, landOpts, userOpts }) {
  const [f, setF] = useState({
    date: initial?.date || todayISO(),
    dueDate: initial?.dueDate || todayISO(),
    activity: initial?.activity || '',
    status: initial?.status || 'planned',
    note: initial?.note || '',
    landId: initial?.landId || '',
    assignedTo: Array.isArray(initial?.assignedTo) ? initial.assignedTo : (initial?.assignedTo ? [initial.assignedTo] : []),
    important: initial?.important || false,
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggleUser = (id) => setF((s) => ({ ...s, assignedTo: s.assignedTo.includes(id) ? s.assignedTo.filter((x) => x !== id) : [...s.assignedTo, id] }))
  const save = () => onSave({
    id: initial?.id || 'pa-' + rid(),
    date: f.date,
    dueDate: f.dueDate || f.date,
    activity: f.activity.trim() || 'Activity',
    status: f.status,
    note: f.note.trim(),
    landId: f.landId,
    assignedTo: f.assignedTo,
    important: f.important,
  })

  return (
    <>
      <div className="row g-2">
        <div className="col-md-12">
          <label className="form-label small mb-1">Property</label>
          <select className="form-select form-select-sm" value={f.landId} onChange={(e) => set('landId', e.target.value)}>
            {landOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Activity</label>
          <input className="form-control form-control-sm" placeholder="e.g. Fertilizer application" value={f.activity} onChange={(e) => set('activity', e.target.value)} autoFocus />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Due date</label>
          <input type="date" className="form-control form-control-sm" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Status</label>
          <select className="form-select form-select-sm" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="planned">Planned</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Assigned to <span className="text-muted">({f.assignedTo.length || 'none'})</span></label>
          <div className="border rounded p-2" style={{ maxHeight: 140, overflowY: 'auto' }}>
            {userOpts.length === 0 ? <div className="text-muted small fst-italic">No users found.</div> : userOpts.map((o) => (
              <div className="form-check" key={o.value}>
                <input className="form-check-input" type="checkbox" id={'asg-' + o.value} checked={f.assignedTo.includes(o.value)} onChange={() => toggleUser(o.value)} />
                <label className="form-check-label small" htmlFor={'asg-' + o.value}>{o.label}</label>
              </div>
            ))}
          </div>
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="act-important" checked={f.important} onChange={(e) => set('important', e.target.checked)} />
            <label className="form-check-label" htmlFor="act-important"><i className="ri-star-fill text-warning me-1" />Mark as high importance (pin to top)</label>
          </div>
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add activity'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

// Multi-select dropdown to filter activities by assignee.
function AssigneeFilter({ users, selected, onChange, includeUnassigned }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const toggle = (v) => { const n = new Set(selected); n.has(v) ? n.delete(v) : n.add(v); onChange(n) }
  const count = selected.size

  return (
    <div className="position-relative" ref={ref}>
      <button className={'btn btn-sm ' + (count ? 'btn-info' : 'btn-soft-info')} onClick={() => setOpen((o) => !o)}>
        <i className="ri-user-line me-1" />{count ? `${count} assignee${count === 1 ? '' : 's'}` : 'Assignee'}<i className="ri-arrow-down-s-line ms-1" />
      </button>
      {open && (
        <div className="card shadow-sm position-absolute mt-1" style={{ zIndex: 1000, minWidth: 200, right: 0 }}>
          <div className="card-body p-2" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {users.length === 0 && <div className="text-muted small fst-italic">No users found.</div>}
            {includeUnassigned && (
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="asgf-none" checked={selected.has('__none__')} onChange={() => toggle('__none__')} />
                <label className="form-check-label small fst-italic" htmlFor="asgf-none">Unassigned</label>
              </div>
            )}
            {users.map((o) => (
              <div className="form-check" key={o.value}>
                <input className="form-check-input" type="checkbox" id={'asgf-' + o.value} checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
                <label className="form-check-label small" htmlFor={'asgf-' + o.value}>{o.label}</label>
              </div>
            ))}
            {count > 0 && <button className="btn btn-sm btn-link p-0 mt-1" onClick={() => onChange(new Set())}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  )
}

const TABS = [
  { id: 'all', label: 'All', icon: 'ri-list-check-2', tone: 'secondary', filter: () => true },
  { id: 'pending', label: 'Pending', icon: 'ri-time-line', tone: 'warning', filter: isPending },
  { id: 'completed', label: 'Completed', icon: 'ri-checkbox-circle-line', tone: 'success', filter: isCompleted },
  { id: 'delayed', label: 'Delayed', icon: 'ri-alarm-warning-line', tone: 'danger', filter: isDelayed },
]

export default function PlantationActivities() {
  const live = usePlantationActivities()
  const { lands } = useLands()
  const { profiles } = useProfiles()
  const [items, setItems] = useState([])
  const [property, setProperty] = useState('')
  const [tab, setTab] = useState('pending')
  const [assignee, setAssignee] = useState(new Set())
  const [adding, setAdding] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)

  useEffect(() => { setItems(live) }, [live])

  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))
  const userOpts = profiles.map((p) => ({ value: p.id, label: personName(p) }))
  const userName = (id) => { const p = profiles.find((x) => x.id === id); return p ? personName(p) : '' }

  const matchAssignee = (a) => {
    if (!assignee.size) return true
    const ids = a.assignedTo || []
    if (assignee.has('__none__') && ids.length === 0) return true
    return ids.some((id) => assignee.has(id))
  }
  const scoped = (property ? items.filter((a) => a.landId === property) : items).filter(matchAssignee)
  const countFor = (t) => scoped.filter(t.filter).length
  const rows = [...scoped].filter(TABS.find((t) => t.id === tab).filter)
    .sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || b.dueDate.localeCompare(a.dueDate))

  const addItem = (a) => { setItems((xs) => [...xs, a]); setAdding(false); apiAdd(a).catch(console.error) }
  const updateItem = (a) => { setItems((xs) => xs.map((x) => (x.id === a.id ? a : x))); setEditRow(null); apiEdit(a).catch(console.error) }
  const confirmDelete = () => { const id = deleteRow.id; setItems((xs) => xs.filter((x) => x.id !== id)); setDeleteRow(null); apiRemove(id).catch(console.error) }
  const toggleDone = (a) => { const next = { ...a, status: a.status === 'done' ? 'planned' : 'done' }; setItems((xs) => xs.map((x) => (x.id === a.id ? next : x))); apiEdit(next).catch(console.error) }
  const toggleImportant = (a) => { const next = { ...a, important: !a.important }; setItems((xs) => xs.map((x) => (x.id === a.id ? next : x))); apiEdit(next).catch(console.error) }

  return (
    <div className="plantation">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Plantation — Activities</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><Link to="/business/plantations/income">Plantation</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Activities</li>
          </ol>
        </nav>
      </div>

      <PropertyBar value={property} onChange={setProperty} />

      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <div className="d-flex flex-wrap gap-2 flex-grow-1">
            {TABS.map((t) => (
              <button key={t.id} className={'btn btn-sm ' + (tab === t.id ? `btn-${t.tone}` : `btn-soft-${t.tone}`)} onClick={() => setTab(t.id)}>
                <i className={t.icon + ' me-1'} />{t.label}
                <span className={'badge ms-1 ' + (tab === t.id ? 'bg-white text-dark' : `bg-${t.tone}-subtle text-${t.tone}`)}>{countFor(t)}</span>
              </button>
            ))}
          </div>
          <AssigneeFilter users={userOpts} selected={assignee} onChange={setAssignee} includeUnassigned />
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add activity</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Activity</th>
                  <th>Property</th>
                  <th>Assigned to</th>
                  <th>Date</th>
                  <th>Due date</th>
                  <th className="text-center">Status</th>
                  <th>Note</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No {tab === 'all' ? '' : tab} activities.</td></tr>
                ) : rows.map((a) => (
                  <tr key={a.id} className={a.important ? 'table-warning' : ''}>
                    <td className="fw-medium">
                      <button className={'btn btn-sm p-0 me-1 ' + (a.important ? 'text-warning' : 'text-muted')} title={a.important ? 'Unmark important' : 'Mark high importance'} onClick={() => toggleImportant(a)}>
                        <i className={a.important ? 'ri-star-fill' : 'ri-star-line'} />
                      </button>
                      {a.activity}
                    </td>
                    <td className="text-muted">{landName(a.landId) || '—'}</td>
                    <td>
                      {a.assignedTo && a.assignedTo.length ? (
                        <div className="d-flex flex-wrap gap-1">
                          {a.assignedTo.map((id) => <span key={id} className="badge bg-info-subtle text-info"><i className="ri-user-line me-1" />{userName(id) || 'Unknown'}</span>)}
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>{fmtDate(a.date)}</td>
                    <td className={isDelayed(a) ? 'text-danger' : ''}>
                      {fmtDate(a.dueDate)}{isDelayed(a) && <i className="ri-alarm-warning-line ms-1" title="Delayed" />}
                    </td>
                    <td className="text-center">
                      <button
                        className={'badge border-0 ' + (a.status === 'done' ? 'bg-success' : isDelayed(a) ? 'bg-danger' : 'bg-warning')}
                        title="Toggle done" onClick={() => toggleDone(a)}
                      >
                        {a.status === 'done' ? 'Done' : isDelayed(a) ? 'Delayed' : 'Pending'}
                      </button>
                    </td>
                    <td className="text-muted small">{a.note}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setEditRow(a)}><i className="ri-pencil-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDeleteRow(a)}><i className="ri-delete-bin-line" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={adding || Boolean(editRow)}
        size="lg"
        title={editRow
          ? <><i className="ri-pencil-line me-2 text-primary" />Edit activity</>
          : <><i className="ri-add-line me-2 text-primary" />New activity</>}
        onClose={() => { setAdding(false); setEditRow(null) }}
      >
        <ActivityForm
          key={editRow?.id || 'new'}
          initial={editRow}
          landOpts={landOpts}
          userOpts={userOpts}
          onSave={editRow ? updateItem : addItem}
          onCancel={() => { setAdding(false); setEditRow(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete activity?"
        message={deleteRow ? `“${deleteRow.activity}” (${fmtDate(deleteRow.dueDate)}) will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  )
}
