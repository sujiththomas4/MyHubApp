import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import { usePlantationActivities, addActivity as apiAdd, editActivity as apiEdit, removeActivity as apiRemove } from '@/data/plantationRepo'
import { useLands, landLabel } from '@/data/plantationLandRepo'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationActivities.jsx
 * -----------------------------------------------------------------------------
 * Plantation activity log / to-do with due dates and done/planned status.
 * Add / edit / delete; overdue planned items are flagged. Local state for now.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const isOverdue = (a) => a.status === 'planned' && a.dueDate < todayISO()

function ActivityForm({ initial, onSave, onCancel, landOpts }) {
  const [f, setF] = useState({
    date: initial?.date || todayISO(),
    dueDate: initial?.dueDate || todayISO(),
    activity: initial?.activity || '',
    status: initial?.status || 'planned',
    note: initial?.note || '',
    landId: initial?.landId || '',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = () => onSave({
    id: initial?.id || 'pa-' + rid(),
    date: f.date,
    dueDate: f.dueDate || f.date,
    activity: f.activity.trim() || 'Activity',
    status: f.status,
    note: f.note.trim(),
    landId: f.landId,
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
        <div className="col-md-9">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add activity'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

export default function PlantationActivities() {
  const live = usePlantationActivities()
  const { lands } = useLands()
  const [items, setItems] = useState([])
  const [property, setProperty] = useState('')
  const [adding, setAdding] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)

  useEffect(() => { setItems(live) }, [live])

  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const scoped = property ? items.filter((a) => a.landId === property) : items
  const rows = [...scoped].sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const done = scoped.filter((a) => a.status === 'done').length
  const overdue = scoped.filter(isOverdue).length

  const addItem = (a) => { setItems((xs) => [...xs, a]); setAdding(false); apiAdd(a).catch(console.error) }
  const updateItem = (a) => { setItems((xs) => xs.map((x) => (x.id === a.id ? a : x))); setEditRow(null); apiEdit(a).catch(console.error) }
  const confirmDelete = () => { const id = deleteRow.id; setItems((xs) => xs.filter((x) => x.id !== id)); setDeleteRow(null); apiRemove(id).catch(console.error) }
  const toggleDone = (a) => { const next = { ...a, status: a.status === 'done' ? 'planned' : 'done' }; setItems((xs) => xs.map((x) => (x.id === a.id ? next : x))); apiEdit(next).catch(console.error) }

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
          <h5 className="card-title mb-0 flex-grow-1">Activity log</h5>
          <span className="text-muted small">{done}/{scoped.length} done{overdue > 0 && <span className="text-danger"> · {overdue} overdue</span>}</span>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add activity</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Activity</th>
                  <th>Property</th>
                  <th>Date</th>
                  <th>Due date</th>
                  <th className="text-center">Status</th>
                  <th>Note</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-4">No activities yet.</td></tr>
                ) : rows.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-medium">{a.activity}</td>
                    <td className="text-muted">{landName(a.landId) || '—'}</td>
                    <td>{fmtDate(a.date)}</td>
                    <td className={isOverdue(a) ? 'text-danger' : ''}>
                      {fmtDate(a.dueDate)}{isOverdue(a) && <i className="ri-alarm-warning-line ms-1" title="Overdue" />}
                    </td>
                    <td className="text-center">
                      <button
                        className={'badge border-0 ' + (a.status === 'done' ? 'bg-success' : 'bg-warning')}
                        title="Toggle done" onClick={() => toggleDone(a)}
                      >
                        {a.status === 'done' ? 'Done' : 'Planned'}
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
