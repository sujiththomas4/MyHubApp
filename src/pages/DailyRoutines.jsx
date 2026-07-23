import { useEffect, useState } from 'react'
import { fmtDate } from '@/data/AppData'
import {
  useRoutines, useRoutineLogs, addRoutine, editRoutine, removeRoutine,
  saveRoutineLog, appliesOn,
} from '@/data/routinesRepo'

/**
 * DailyRoutines.jsx
 * -----------------------------------------------------------------------------
 * Personal accountability screen. Two tabs:
 *   - Routine tracker — for a chosen day, the routines that apply, each with a
 *                       done toggle and an optional comment.
 *   - Set routines    — define routines: every day, chosen weekdays (e.g. every
 *                       day except Sunday), or a one-off date.
 */
const TABS = [
  { id: 'tracker', label: 'Routine tracker', icon: 'ri-checkbox-multiple-line' },
  { id: 'set', label: 'Set routines', icon: 'ri-list-settings-line' },
]

const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon … Sun for display

function scheduleLabel(r) {
  if (r.schedule === 'daily') return 'Every day'
  if (r.schedule === 'once') return r.onDate ? `On ${fmtDate(r.onDate)}` : 'One-off'
  const days = [...r.days].sort((a, b) => a - b)
  if (days.length === 7) return 'Every day'
  if (days.length === 6) {
    const missing = [0, 1, 2, 3, 4, 5, 6].find((d) => !days.includes(d))
    return `Every day except ${WD_SHORT[missing]}`
  }
  if (days.length === 0) return 'No days set'
  return WEEK_ORDER.filter((d) => days.includes(d)).map((d) => WD_SHORT[d]).join(', ')
}

export default function DailyRoutines() {
  const [tab, setTab] = useState('tracker')

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Daily Routines</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Personal</li>
            <li className="breadcrumb-item active" aria-current="page">Daily Routines</li>
          </ol>
        </nav>
      </div>

      <ul className="nav nav-tabs nav-tabs-custom mb-3" role="tablist">
        {TABS.map((t) => (
          <li className="nav-item" key={t.id}>
            <button type="button" className={'nav-link ' + (tab === t.id ? 'active' : '')} onClick={() => setTab(t.id)}>
              <i className={t.icon + ' me-1'} />{t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'tracker' ? <RoutineTracker /> : <SetRoutines />}
    </div>
  )
}

// ---- Routine tracker --------------------------------------------------------
function RoutineTracker() {
  const { routines } = useRoutines()
  const { logs } = useRoutineLogs()
  const [date, setDate] = useState(todayISO())
  const [comments, setComments] = useState({}) // routineId -> local draft

  // Reset local comment drafts when the day changes (fall back to saved value).
  useEffect(() => { setComments({}) }, [date])

  const logByRoutine = {}
  logs.filter((l) => l.date === date).forEach((l) => { logByRoutine[l.routineId] = l })

  const todays = routines
    .filter((r) => appliesOn(r, date))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const doneCount = todays.filter((r) => logByRoutine[r.id]?.done).length
  const pct = todays.length ? Math.round((doneCount / todays.length) * 100) : 0

  const toggle = (r) => {
    const cur = logByRoutine[r.id]
    saveRoutineLog({ routineId: r.id, date, done: !cur?.done, comment: cur?.comment || '' })
  }
  const commentValue = (r) =>
    comments[r.id] !== undefined ? comments[r.id] : (logByRoutine[r.id]?.comment || '')
  const saveComment = (r) => {
    const val = commentValue(r)
    const cur = logByRoutine[r.id]
    if ((cur?.comment || '') === val) return // nothing changed
    saveRoutineLog({ routineId: r.id, date, done: cur?.done || false, comment: val })
  }

  const isToday = date === todayISO()

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center flex-wrap gap-2">
        <h5 className="card-title mb-0 flex-grow-1">
          {isToday ? 'Today' : fmtDate(date)}
          <span className="text-muted fs-13 fw-normal ms-2">{doneCount}/{todays.length} done</span>
        </h5>
        <div className="btn-group btn-group-sm" role="group">
          <button className="btn btn-light" onClick={() => setDate(addDays(date, -1))} title="Previous day"><i className="ri-arrow-left-s-line" /></button>
          <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }}
            value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-light" onClick={() => setDate(addDays(date, 1))} title="Next day"><i className="ri-arrow-right-s-line" /></button>
        </div>
        {!isToday && <button className="btn btn-soft-primary btn-sm" onClick={() => setDate(todayISO())}>Today</button>}
      </div>

      {todays.length > 0 && (
        <div className="progress rounded-0" style={{ height: 4 }}>
          <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="card-body p-0">
        {todays.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="ri-calendar-todo-line fs-1 d-block mb-2" />
            <p className="mb-1">No routines scheduled for this day.</p>
            <p className="mb-0 small">Add some in the <strong>Set routines</strong> tab.</p>
          </div>
        ) : todays.map((r) => {
          const done = logByRoutine[r.id]?.done || false
          return (
            <div key={r.id} className="d-flex align-items-center gap-3 p-3 border-bottom routine-row">
              <button
                type="button"
                className={'btn btn-sm rounded-circle p-0 routine-check ' + (done ? 'btn-success' : 'btn-outline-secondary')}
                onClick={() => toggle(r)} title={done ? 'Mark not done' : 'Mark done'}
              >
                <i className={done ? 'ri-check-line' : 'ri-checkbox-blank-circle-line'} />
              </button>
              <div className="flex-grow-1 min-w-0">
                <div className={'fw-medium ' + (done ? 'text-decoration-line-through text-muted' : '')}>{r.title}</div>
                <div className="text-muted small">{scheduleLabel(r)}</div>
              </div>
              <input
                type="text" className="form-control form-control-sm" style={{ maxWidth: 280 }}
                placeholder="Comment (optional)…"
                value={commentValue(r)}
                onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
                onBlur={() => saveComment(r)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Set routines -----------------------------------------------------------
const blankRoutine = () => ({ id: null, title: '', schedule: 'daily', days: [1, 2, 3, 4, 5, 6], onDate: todayISO(), active: true })

function SetRoutines() {
  const { routines } = useRoutines()
  const [form, setForm] = useState(blankRoutine())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const editing = Boolean(form.id)
  const reset = () => { setForm(blankRoutine()); setErr(null) }

  const toggleDay = (d) =>
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }))

  const save = async () => {
    setErr(null)
    if (!form.title.trim()) { setErr('Give the routine a name.'); return }
    if (form.schedule === 'weekly' && form.days.length === 0) { setErr('Pick at least one weekday.'); return }
    if (form.schedule === 'once' && !form.onDate) { setErr('Pick a date.'); return }
    setSaving(true)
    try {
      if (editing) await editRoutine(form)
      else await addRoutine({ ...form, id: 'rt-' + rid(), sortOrder: routines.length })
      reset()
    } catch (e) {
      setErr(e.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const edit = (r) => { setForm({ ...r, days: r.days.length ? r.days : [1, 2, 3, 4, 5, 6], onDate: r.onDate || todayISO() }); setErr(null) }
  const del = async (id) => { if (window.confirm('Delete this routine? Past logs stay.')) await removeRoutine(id) }
  const toggleActive = (r) => editRoutine({ ...r, active: !r.active })

  return (
    <div className="row g-3">
      {/* Form */}
      <div className="col-xl-5">
        <div className="card mb-0">
          <div className="card-header d-flex align-items-center">
            <h5 className="card-title mb-0 flex-grow-1">{editing ? 'Edit routine' : 'New routine'}</h5>
            {editing && <button className="btn btn-sm btn-light" onClick={reset}>Cancel</button>}
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label small mb-1">Routine</label>
              <input type="text" className="form-control" placeholder="e.g. Go to gym, Take bath, Read 20 min"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="mb-3">
              <label className="form-label small mb-1">Repeat</label>
              <select className="form-select" value={form.schedule}
                onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}>
                <option value="daily">Every day</option>
                <option value="weekly">Specific weekdays</option>
                <option value="once">A specific date</option>
              </select>
            </div>

            {form.schedule === 'weekly' && (
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {WEEK_ORDER.map((d) => (
                    <button key={d} type="button"
                      className={'btn btn-sm ' + (form.days.includes(d) ? 'btn-primary' : 'btn-outline-secondary')}
                      onClick={() => toggleDay(d)}>
                      {WD_SHORT[d]}
                    </button>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setForm((f) => ({ ...f, days: [0, 1, 2, 3, 4, 5, 6] }))}>All</button>
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setForm((f) => ({ ...f, days: [1, 2, 3, 4, 5, 6] }))}>Except Sunday</button>
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setForm((f) => ({ ...f, days: [1, 2, 3, 4, 5] }))}>Mon–Fri</button>
                </div>
              </div>
            )}

            {form.schedule === 'once' && (
              <div className="mb-3">
                <label className="form-label small mb-1">Date</label>
                <input type="date" className="form-control" value={form.onDate}
                  onChange={(e) => setForm((f) => ({ ...f, onDate: e.target.value }))} />
              </div>
            )}

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="rt-active" checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              <label className="form-check-label" htmlFor="rt-active">Active</label>
            </div>

            <button className="btn btn-primary" onClick={save} disabled={saving}>
              <i className="ri-save-3-line me-1" />{saving ? 'Saving…' : editing ? 'Update routine' : 'Add routine'}
            </button>
            {err && <div className="alert alert-danger py-2 mb-0 mt-3">{err}</div>}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="col-xl-7">
        <div className="card mb-0">
          <div className="card-header"><h5 className="card-title mb-0">My routines</h5></div>
          <div className="card-body p-0">
            {routines.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No routines yet. Create one on the left.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Routine</th><th>Schedule</th><th className="text-center">Active</th><th className="text-end">Actions</th></tr>
                  </thead>
                  <tbody>
                    {routines.map((r) => (
                      <tr key={r.id}>
                        <td className={'fw-medium ' + (r.active ? '' : 'text-muted')}>{r.title}</td>
                        <td className="text-muted">{scheduleLabel(r)}</td>
                        <td className="text-center">
                          <div className="form-check form-switch d-inline-block">
                            <input className="form-check-input" type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
                          </div>
                        </td>
                        <td className="text-end text-nowrap">
                          <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => edit(r)} title="Edit"><i className="ri-pencil-line" /></button>
                          <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => del(r.id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
