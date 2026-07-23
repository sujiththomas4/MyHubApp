import { useEffect, useState } from 'react'
import { fmtDate } from '@/data/AppData'
import {
  useGymExercises, addGymExercise, editGymExercise, removeGymExercise,
  useGymPlan, addGymPlanItem, removeGymPlanItem, patchGymPlanItem,
} from '@/data/gymRepo'

/**
 * GymWorkouts.jsx
 * -----------------------------------------------------------------------------
 * Personal gym planner — no recurrence. Two tabs:
 *   - Workout tracker — for a chosen day, the workouts you planned, each with a
 *                       done toggle and a comment (actual weight / reps).
 *   - Plan workouts   — assign defined activities to specific dates, and manage
 *                       the reusable activity library.
 */
const TABS = [
  { id: 'tracker', label: 'Workout tracker', icon: 'ri-check-double-line' },
  { id: 'plan', label: 'Plan workouts', icon: 'ri-calendar-schedule-line' },
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

export default function GymWorkouts() {
  const [tab, setTab] = useState('tracker')

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">GYM Workouts</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Personal</li>
            <li className="breadcrumb-item active" aria-current="page">GYM Workouts</li>
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

      {tab === 'tracker' ? <WorkoutTracker /> : <PlanWorkouts />}
    </div>
  )
}

// ---- Workout tracker --------------------------------------------------------
function WorkoutTracker() {
  const { plan } = useGymPlan()
  const [date, setDate] = useState(todayISO())
  const [comments, setComments] = useState({}) // itemId -> local draft

  useEffect(() => { setComments({}) }, [date])

  const items = plan
    .filter((p) => p.date === date)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const doneCount = items.filter((i) => i.done).length
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const isToday = date === todayISO()

  const toggle = (i) => patchGymPlanItem(i.id, { done: !i.done })
  const commentValue = (i) => (comments[i.id] !== undefined ? comments[i.id] : i.comment)
  const saveComment = (i) => {
    const val = commentValue(i)
    if (val === i.comment) return
    patchGymPlanItem(i.id, { comment: val || null })
  }

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center flex-wrap gap-2">
        <h5 className="card-title mb-0 flex-grow-1">
          {isToday ? 'Today' : fmtDate(date)}
          <span className="text-muted fs-13 fw-normal ms-2">{doneCount}/{items.length} done</span>
        </h5>
        <div className="btn-group btn-group-sm" role="group">
          <button className="btn btn-light" onClick={() => setDate(addDays(date, -1))} title="Previous day"><i className="ri-arrow-left-s-line" /></button>
          <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }}
            value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn btn-light" onClick={() => setDate(addDays(date, 1))} title="Next day"><i className="ri-arrow-right-s-line" /></button>
        </div>
        {!isToday && <button className="btn btn-soft-primary btn-sm" onClick={() => setDate(todayISO())}>Today</button>}
      </div>

      {items.length > 0 && (
        <div className="progress rounded-0" style={{ height: 4 }}>
          <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="card-body p-0">
        {items.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="ri-run-line fs-1 d-block mb-2" />
            <p className="mb-1">Nothing planned for this day.</p>
            <p className="mb-0 small">Plan it in the <strong>Plan workouts</strong> tab.</p>
          </div>
        ) : items.map((i) => (
          <div key={i.id} className="d-flex align-items-center gap-3 p-3 border-bottom routine-row">
            <button
              type="button"
              className={'btn btn-sm rounded-circle p-0 routine-check ' + (i.done ? 'btn-success' : 'btn-outline-secondary')}
              onClick={() => toggle(i)} title={i.done ? 'Mark not done' : 'Mark done'}
            >
              <i className={i.done ? 'ri-check-line' : 'ri-checkbox-blank-circle-line'} />
            </button>
            <div className="flex-grow-1 min-w-0">
              <div className={'fw-medium ' + (i.done ? 'text-decoration-line-through text-muted' : '')}>
                {i.name}
                {i.target && <span className="badge bg-primary-subtle text-primary ms-2">{i.target}</span>}
              </div>
              {i.part && <div className="text-muted small">{i.part}</div>}
            </div>
            <input
              type="text" className="form-control form-control-sm" style={{ maxWidth: 280 }}
              placeholder="Actual (weight / reps / notes)…"
              value={commentValue(i)}
              onChange={(e) => setComments((c) => ({ ...c, [i.id]: e.target.value }))}
              onBlur={() => saveComment(i)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Plan workouts ----------------------------------------------------------
function PlanWorkouts() {
  const { exercises } = useGymExercises()
  const { plan } = useGymPlan()
  const [date, setDate] = useState(todayISO())
  const [draft, setDraft] = useState({ name: '', part: '', target: '' })
  const [err, setErr] = useState(null)

  const items = plan
    .filter((p) => p.date === date)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const addItem = async () => {
    setErr(null)
    const name = draft.name.trim()
    if (!name) { setErr('Type or pick an activity.'); return }
    // Link to the library if the name matches a defined activity (case-insensitive).
    const match = exercises.find((e) => e.name.toLowerCase() === name.toLowerCase())
    try {
      await addGymPlanItem({
        id: 'gp-' + rid(),
        date,
        exerciseId: match?.id || '',
        name,
        part: draft.part.trim() || match?.part || '',
        target: draft.target.trim(),
        sortOrder: items.length,
      })
      setDraft({ name: '', part: '', target: '' })
    } catch (e) {
      setErr(e.message || 'Could not add.')
    }
  }
  const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }
  const copyPrevDay = async () => {
    const prev = plan.filter((p) => p.date === addDays(date, -1)).sort((a, b) => a.sortOrder - b.sortOrder)
    for (let k = 0; k < prev.length; k++) {
      const p = prev[k]
      // eslint-disable-next-line no-await-in-loop
      await addGymPlanItem({ id: 'gp-' + rid(), date, exerciseId: p.exerciseId, name: p.name, part: p.part, target: p.target, sortOrder: items.length + k })
    }
  }

  return (
    <div className="row g-3">
      {/* Plan a date */}
      <div className="col-xl-7">
        <div className="card mb-0">
          <div className="card-header d-flex align-items-center flex-wrap gap-2">
            <h5 className="card-title mb-0 flex-grow-1">Plan for {date === todayISO() ? 'today' : fmtDate(date)}</h5>
            <div className="btn-group btn-group-sm" role="group">
              <button className="btn btn-light" onClick={() => setDate(addDays(date, -1))} title="Previous day"><i className="ri-arrow-left-s-line" /></button>
              <input type="date" className="form-control form-control-sm" style={{ maxWidth: 160 }}
                value={date} onChange={(e) => setDate(e.target.value)} />
              <button className="btn btn-light" onClick={() => setDate(addDays(date, 1))} title="Next day"><i className="ri-arrow-right-s-line" /></button>
            </div>
          </div>
          <div className="card-body">
            {/* Add row */}
            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-5">
                <label className="form-label small mb-1">Activity</label>
                <input type="text" className="form-control" list="gym-ex-list" placeholder="Bench press"
                  value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} onKeyDown={onKey} />
                <datalist id="gym-ex-list">
                  {exercises.filter((e) => e.active).map((e) => <option key={e.id} value={e.name}>{e.part}</option>)}
                </datalist>
              </div>
              <div className="col-md-3">
                <label className="form-label small mb-1">Part</label>
                <input type="text" className="form-control" placeholder="Chest"
                  value={draft.part} onChange={(e) => setDraft((d) => ({ ...d, part: e.target.value }))} onKeyDown={onKey} />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Target</label>
                <input type="text" className="form-control" placeholder="4 x 10"
                  value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} onKeyDown={onKey} />
              </div>
              <div className="col-md-2 d-grid">
                <button className="btn btn-primary" onClick={addItem}><i className="ri-add-line me-1" />Add</button>
              </div>
            </div>
            {err && <div className="alert alert-danger py-2">{err}</div>}

            {/* Planned items for the date */}
            {items.length === 0 ? (
              <div className="text-center text-muted py-4">
                <p className="mb-2">No workouts planned for this day yet.</p>
                {plan.some((p) => p.date === addDays(date, -1)) && (
                  <button className="btn btn-soft-primary btn-sm" onClick={copyPrevDay}>
                    <i className="ri-file-copy-line me-1" />Copy previous day
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th style={{ width: 36 }}>#</th><th>Activity</th><th>Part</th><th>Target</th><th className="text-end" /></tr>
                  </thead>
                  <tbody>
                    {items.map((i, idx) => (
                      <tr key={i.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="fw-medium">{i.name}</td>
                        <td className="text-muted">{i.part || '—'}</td>
                        <td>{i.target ? <span className="badge bg-primary-subtle text-primary">{i.target}</span> : '—'}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => removeGymPlanItem(i.id)} title="Remove"><i className="ri-close-line" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-muted small mt-2 mb-0">{items.length} workout{items.length === 1 ? '' : 's'} planned · execute them in the Workout tracker tab.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity library */}
      <div className="col-xl-5">
        <ExerciseLibrary exercises={exercises} />
      </div>
    </div>
  )
}

function ExerciseLibrary({ exercises }) {
  const [draft, setDraft] = useState({ name: '', part: '' })
  const [err, setErr] = useState(null)

  const add = async () => {
    setErr(null)
    const name = draft.name.trim()
    if (!name) { setErr('Give the activity a name.'); return }
    try {
      await addGymExercise({ id: 'ge-' + rid(), name, part: draft.part.trim(), sortOrder: exercises.length })
      setDraft({ name: '', part: '' })
    } catch (e) {
      setErr(e.message || 'Could not add.')
    }
  }
  const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }
  const toggleActive = (x) => editGymExercise({ ...x, active: !x.active })
  const del = async (id) => { if (window.confirm('Delete this activity? Existing plans keep it.')) await removeGymExercise(id) }

  return (
    <div className="card mb-0">
      <div className="card-header"><h5 className="card-title mb-0">Defined activities</h5></div>
      <div className="card-body">
        <div className="row g-2 align-items-end mb-3">
          <div className="col-6">
            <label className="form-label small mb-1">Activity</label>
            <input type="text" className="form-control" placeholder="Full body circuit"
              value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} onKeyDown={onKey} />
          </div>
          <div className="col-4">
            <label className="form-label small mb-1">Part</label>
            <input type="text" className="form-control" placeholder="Full body"
              value={draft.part} onChange={(e) => setDraft((d) => ({ ...d, part: e.target.value }))} onKeyDown={onKey} />
          </div>
          <div className="col-2 d-grid">
            <button className="btn btn-primary" onClick={add}><i className="ri-add-line" /></button>
          </div>
        </div>
        {err && <div className="alert alert-danger py-2">{err}</div>}

        {exercises.length === 0 ? (
          <p className="text-muted text-center py-3 mb-0">No activities yet. Add the ones you reuse.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Activity</th><th>Part</th><th className="text-center">Active</th><th className="text-end" /></tr>
              </thead>
              <tbody>
                {exercises.map((x) => (
                  <tr key={x.id}>
                    <td className={'fw-medium ' + (x.active ? '' : 'text-muted')}>{x.name}</td>
                    <td className="text-muted">{x.part || '—'}</td>
                    <td className="text-center">
                      <div className="form-check form-switch d-inline-block">
                        <input className="form-check-input" type="checkbox" checked={x.active} onChange={() => toggleActive(x)} />
                      </div>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => del(x.id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    </td>
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
