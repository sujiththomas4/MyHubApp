import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtDate } from '@/data/AppData'
import EntityModal from '@/components/plantation/EntityModal'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PropertyBar from '@/components/plantation/PropertyBar'
import { useLands, landLabel } from '@/data/plantationLandRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import {
  useSupervisorUpdates, addSupervisorUpdate, editSupervisorUpdate, removeSupervisorUpdate,
} from '@/data/supervisorUpdatesRepo'
import {
  useUpdateSchedules, addSchedule, editSchedule, removeSchedule,
  generateOccurrences, describeSchedule, FREQUENCIES, WEEKDAYS,
} from '@/data/updateSchedulesRepo'
import { useActivityLogger } from '@/data/activityLogRepo'

/**
 * PlantationSupervisorUpdates.jsx — recurring supervisor updates.
 *   - Schedules: define recurrence rules (weekly/monthly, every N, weekdays…).
 *     Only the rule is stored; occurrences are computed from start/end + today.
 *   - Due: each computed occurrence with its status (done / overdue / due / upcoming)
 *     and an action to fill in the update.
 *   - Updates: the saved reports timeline.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const period = (u) => (u.periodFrom && u.periodTo ? `${fmtDate(u.periodFrom)} – ${fmtDate(u.periodTo)}` : fmtDate(u.periodFrom || u.periodTo || u.date) || '—')
const relDay = (iso) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00'); d.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const days = Math.round((d - now) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1) return `in ${days} days`
  return `${-days} days ago`
}

function Section({ icon, tone, title, text }) {
  if (!text) return null
  return (
    <div className="col-md-6">
      <div className="border rounded h-100 p-2">
        <h6 className={`text-${tone} mb-1 small`}><i className={icon + ' me-1'} />{title}</h6>
        <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
      </div>
    </div>
  )
}

// A winding "roadmap" of occurrences: a connected road with a pin per week,
// alternating above / below the road. Each node coloured by status.
function Callout({ n }) {
  return (
    <div className="rm-box">
      <div className="fw-medium small">W{n.week}</div>
      <div className="text-muted" style={{ fontSize: 11 }}>{fmtDate(n.date)}</div>
      {n.hex
        ? <span className="badge fw-normal" style={{ fontSize: 10, backgroundColor: '#ffe8d6', color: n.hex }}>{n.label}</span>
        : <span className={`badge fw-normal bg-${n.tone}-subtle text-${n.tone}`} style={{ fontSize: 10 }}>{n.label}</span>}
    </div>
  )
}
function Road({ nodes }) {
  const scrollRef = useRef(null)
  const focusRef = useRef(null)
  useEffect(() => {
    const c = scrollRef.current, el = focusRef.current
    if (!c || !el) return
    const cr = c.getBoundingClientRect(), er = el.getBoundingClientRect()
    c.scrollLeft += (er.left - cr.left) - c.clientWidth / 2 + er.width / 2
  }, [nodes])
  return (
    <div className="rm-scroll" ref={scrollRef}>
      <div className="rm-track">
        {nodes.map((n, i) => (
          <div className="rm-cell" key={n.key} ref={n.focus ? focusRef : undefined}>
            <div className="rm-slot rm-top">{i % 2 === 0 && <><Callout n={n} /></>}</div>
            <div className="rm-mid">
              <span className={'rm-dot' + (n.hex ? '' : ` bg-${n.tone}`)} style={n.hex ? { backgroundColor: n.hex } : undefined} title={`${fmtDate(n.date)} · ${n.label}`}><i className={n.icon} /></span>
            </div>
            <div className="rm-slot rm-bottom">{i % 2 === 1 && <><Callout n={n} /></>}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Schedule add / edit form ----------------------------------------------
function ScheduleForm({ initial, landOpts, people, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggleDay = (d) => setF((s) => ({ ...s, weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d] }))

  const save = async () => {
    if (!f.title.trim()) { setErr('Title is required.'); return }
    if (!f.startDate) { setErr('Start date is required.'); return }
    if (f.frequency === 'weekly' && f.weekdays.length === 0) { setErr('Pick at least one weekday.'); return }
    setErr(null); setSaving(true)
    try { await onSave(f) }
    catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <>
      <div className="row g-2">
        <div className="col-md-12">
          <label className="form-label small mb-1">Title</label>
          <input className="form-control" placeholder="e.g. Bi-weekly zone report" value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Property</label>
          <select className="form-select" value={f.landId} onChange={(e) => set('landId', e.target.value)}>
            {landOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Reported by</label>
          <input className="form-control" list="sup-dl" placeholder="Name" value={f.supervisor} onChange={(e) => set('supervisor', e.target.value)} />
          <datalist id="sup-dl">{people.map((p) => <option key={p} value={p} />)}</datalist>
        </div>

        <div className="col-md-4">
          <label className="form-label small mb-1">Frequency</label>
          <select className="form-select" value={f.frequency} onChange={(e) => set('frequency', e.target.value)}>
            {FREQUENCIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className={f.frequency === 'once' ? 'col-md-8' : 'col-md-4'}>
          <label className="form-label small mb-1">{f.frequency === 'once' ? 'Date' : 'Start date'}</label>
          <input type="date" className="form-control" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        {f.frequency !== 'once' && (
          <div className="col-md-4">
            <label className="form-label small mb-1">End date <span className="text-muted">(optional)</span></label>
            <input type="date" className="form-control" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </div>
        )}

        {f.frequency !== 'once' && (
          <div className="col-md-4">
            <label className="form-label small mb-1">Repeat every</label>
            <div className="input-group">
              <input type="number" min="1" className="form-control" value={f.interval} onChange={(e) => set('interval', e.target.value)} style={{ maxWidth: 90 }} />
              <span className="input-group-text">{f.frequency === 'monthly' ? 'month(s)' : 'week(s)'}</span>
            </div>
          </div>
        )}

        {f.frequency === 'weekly' && (
          <div className="col-md-8">
            <label className="form-label small mb-1">On these days</label>
            <div className="d-flex flex-wrap gap-1">
              {WEEKDAYS.map((w) => (
                <button type="button" key={w.value} className={'btn btn-sm ' + (f.weekdays.includes(w.value) ? 'btn-primary' : 'btn-soft-secondary')} onClick={() => toggleDay(w.value)} title={w.label} style={{ minWidth: 44 }}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {f.frequency === 'monthly' && (
          <div className="col-md-4">
            <label className="form-label small mb-1">Day of month</label>
            <input type="number" min="1" max="31" className="form-control" value={f.dayOfMonth || ''} onChange={(e) => set('dayOfMonth', e.target.value)} />
          </div>
        )}

        <div className="col-md-6">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
        <div className="col-md-6 d-flex align-items-end">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="sch-active" checked={f.active} onChange={(e) => set('active', e.target.checked)} />
            <label className="form-check-label" htmlFor="sch-active">Active</label>
          </div>
        </div>
      </div>

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : f.id ? 'Update' : 'Save'}</button>
      </div>
    </>
  )
}

const TABS = [
  { id: 'due', label: 'Due', icon: 'ri-calendar-todo-line' },
  { id: 'roadmap', label: 'Road Map', icon: 'ri-road-map-line' },
  { id: 'schedules', label: 'Schedules', icon: 'ri-repeat-line' },
  { id: 'updates', label: 'Updates', icon: 'ri-file-list-3-line' },
]

const OCC_STATUS = (update, date) => {
  if (update) return { label: 'Done', tone: 'success', icon: 'ri-check-line' }
  if (date < todayISO()) return { label: 'Overdue', tone: 'danger', icon: 'ri-alarm-warning-line' }
  if (date === todayISO()) return { label: 'Due', tone: 'warning', icon: 'ri-time-line' }
  return { label: 'Planned', tone: 'secondary', icon: 'ri-map-pin-2-fill' }
}

export default function PlantationSupervisorUpdates() {
  const { updates, reload: reloadUpdates } = useSupervisorUpdates()
  const { schedules, reload: reloadSchedules } = useUpdateSchedules()
  const { lands } = useLands()
  const { profiles } = useProfiles()
  const log = useActivityLogger()
  const [property, setProperty] = useState('')
  const [tab, setTab] = useState('due')
  const [modal, setModal] = useState(null)          // update EntityModal
  const [schModal, setSchModal] = useState(null)    // schedule form
  const [del, setDel] = useState(null)              // update to delete
  const [delSch, setDelSch] = useState(null)        // schedule to delete

  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const landOpts = [{ value: '', label: '— all / property —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const scopedUpdates = (property ? updates.filter((u) => u.landId === property) : updates)
    .slice().sort((a, b) => (b.periodFrom || b.date || '').localeCompare(a.periodFrom || a.date || ''))

  // Computed occurrences from every active schedule for THIS month + NEXT month,
  // in ascending date order.
  const occurrences = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0')
    const fmtISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const now = new Date()
    const fromISO = fmtISO(new Date(now.getFullYear(), now.getMonth(), 1))
    const toISO = fmtISO(new Date(now.getFullYear(), now.getMonth() + 2, 0)) // last day of next month
    const list = []
    schedules.filter((s) => s.active && (!property || s.landId === property)).forEach((s) => {
      generateOccurrences(s, fromISO, toISO).forEach((date) => {
        const done = updates.find((u) => u.scheduleId === s.id && u.occurrenceDate === date)
        list.push({ key: s.id + ':' + date, schedule: s, date, update: done || null })
      })
    })
    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [schedules, updates, property])
  const shownOcc = occurrences

  const statusOf = (o) => {
    if (o.update) return { label: 'Done', tone: 'success' }
    if (o.date < todayISO()) return { label: 'Overdue', tone: 'danger' }
    if (o.date === todayISO()) return { label: 'Due today', tone: 'warning' }
    return { label: 'Upcoming', tone: 'secondary' }
  }

  // --- update save/blank ---
  const blankUpdate = (seed = {}) => ({ landId: property || '', supervisor: '', periodFrom: '', periodTo: '', date: todayISO(), title: '', workDone: '', highlights: '', concerns: '', nextPlan: '', image: '', scheduleId: '', occurrenceDate: '', ...seed })
  const updateFields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts, colClass: 'col-md-6' },
    { key: 'supervisor', label: 'Reported by', type: 'search', options: people, allowCustom: true, placeholder: 'Name', colClass: 'col-md-6' },
    { key: 'periodFrom', label: 'Scheduled date', type: 'computed', compute: (f) => (f.periodFrom ? fmtDate(f.periodFrom) : '—'), colClass: 'col-md-6' },
    { key: 'date', label: 'Report date', type: 'computed', compute: (f) => fmtDate(f.date || todayISO()), colClass: 'col-md-6' },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Bi-weekly update — Zone A & B', required: true },
    { key: 'workDone', label: 'Work done', type: 'textarea' },
    { key: 'highlights', label: 'Highlights', type: 'textarea', colClass: 'col-md-6' },
    { key: 'concerns', label: 'Concerns / issues', type: 'textarea', colClass: 'col-md-6' },
    { key: 'nextPlan', label: 'Next plan', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/supervisor' },
  ]
  const saveUpdate = async (f) => {
    if (f.id) await editSupervisorUpdate(f)
    else {
      await addSupervisorUpdate({ ...f, id: 'sup-' + rid(), sortOrder: updates.length })
      log('supervisor', `Site update: "${f.title}"${f.supervisor ? ' by ' + f.supervisor : ''}`, { landId: f.landId })
    }
    await reloadUpdates()
  }
  const fillOccurrence = (o) => setModal({ initial: blankUpdate({
    landId: o.schedule.landId || '', supervisor: o.schedule.supervisor || '',
    date: todayISO(), periodFrom: o.date, title: o.schedule.title,
    scheduleId: o.schedule.id, occurrenceDate: o.date,
  }) })

  // --- schedule save/blank ---
  const blankSchedule = () => ({ title: '', landId: property || '', supervisor: '', startDate: todayISO(), endDate: '', frequency: 'weekly', interval: 1, weekdays: [6], dayOfMonth: 1, active: true, note: '' })
  const saveSchedule = async (f) => {
    if (f.id) await editSchedule(f)
    else {
      await addSchedule({ ...f, id: 'sch-' + rid(), sortOrder: schedules.length })
      log('schedule', `Schedule created: "${f.title}" (${describeSchedule(f)})`, {})
    }
    await reloadSchedules(); setSchModal(null)
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Site Updates</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Site Updates</li>
          </ol>
        </nav>
      </div>

      <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
        <div className="flex-grow-1"><PropertyBar value={property} onChange={setProperty} /></div>
      </div>

      <div className="d-inline-flex flex-wrap bg-light rounded-pill p-1 mb-3 gap-1">
        {TABS.map((t) => (
          <button key={t.id} className={'btn btn-sm rounded-pill px-3 ' + (tab === t.id ? 'btn-primary shadow-sm' : 'btn-link text-body text-decoration-none')} onClick={() => setTab(t.id)}>
            <i className={t.icon + ' me-1'} />{t.label}
          </button>
        ))}
      </div>

      {/* DUE */}
      {tab === 'due' && (
        <div className="card mb-0">
          <div className="card-header d-flex align-items-center">
            <h5 className="card-title mb-0 flex-grow-1">Due &amp; upcoming</h5>
            <span className="text-muted small">{occurrences.length} occurrence{occurrences.length === 1 ? '' : 's'}{occurrences.length > shownOcc.length ? ` · showing ${shownOcc.length}` : ''}</span>
          </div>
          <div className="card-body p-0">
            {shownOcc.length === 0 ? (
              <p className="text-muted text-center py-5 mb-0">No occurrences. Create a schedule first.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Date</th><th>Schedule</th><th>Property</th><th>Reported by</th><th className="text-center">Status</th><th className="text-end">Action</th></tr>
                  </thead>
                  <tbody>
                    {shownOcc.map((o) => {
                      const st = statusOf(o)
                      return (
                        <tr key={o.key}>
                          <td><div className="fw-medium">{fmtDate(o.date)}</div><div className="text-muted small">{relDay(o.date)}</div></td>
                          <td>{o.schedule.title}</td>
                          <td className="text-muted">{o.schedule.landId ? landName(o.schedule.landId) : '—'}</td>
                          <td className="text-muted">{o.schedule.supervisor || '—'}</td>
                          <td className="text-center"><span className={`badge fw-normal bg-${st.tone}-subtle text-${st.tone}`}>{st.label}</span></td>
                          <td className="text-end">
                            {o.update ? (
                              <button className="btn btn-sm btn-soft-primary px-2" onClick={() => setModal({ initial: { ...o.update } })}><i className="ri-eye-line me-1" />View / edit</button>
                            ) : (
                              <button className="btn btn-sm btn-primary px-2" onClick={() => fillOccurrence(o)}><i className="ri-add-line me-1" />Add update</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROAD MAP */}
      {tab === 'roadmap' && (() => {
        const active = schedules.filter((s) => s.active && (!property || s.landId === property))
        if (active.length === 0) return <div className="card mb-0"><div className="card-body text-center text-muted py-5">No active schedules to map. Add one under Schedules.</div></div>
        return (
          <div className="d-flex flex-column gap-3">
            {active.map((s) => {
              const dates = generateOccurrences(s, undefined, s.endDate || undefined)
              const capped = dates.length > 300
              const nodes = dates.slice(0, 300).map((date, i) => {
                const update = updates.find((u) => u.scheduleId === s.id && u.occurrenceDate === date)
                return { key: s.id + ':' + date, date, week: i + 1, done: !!update, ...OCC_STATUS(update, date) }
              })
              // The single next task still to do (today or later) → orange highlight.
              const nextIdx = nodes.findIndex((n) => !n.done && n.date >= todayISO())
              if (nextIdx >= 0) nodes[nextIdx] = { ...nodes[nextIdx], label: 'Next up', icon: 'ri-flag-2-fill', hex: '#fd7e14' }
              // Auto-scroll target: the next task, else the first occurrence from today, else the last.
              let focusIdx = nextIdx
              if (focusIdx < 0) focusIdx = nodes.findIndex((n) => n.date >= todayISO())
              if (focusIdx < 0) focusIdx = nodes.length - 1
              if (nodes[focusIdx]) nodes[focusIdx] = { ...nodes[focusIdx], focus: true }
              const doneN = nodes.filter((n) => n.done).length
              return (
                <div className="card mb-0" key={s.id}>
                  <div className="card-header d-flex flex-wrap align-items-center gap-2">
                    <h6 className="card-title mb-0 flex-grow-1">{s.title}</h6>
                    <span className="badge fw-normal bg-primary-subtle text-primary">{describeSchedule(s)}</span>
                    <span className="text-muted small">{s.frequency === 'once' ? fmtDate(s.startDate) : `${fmtDate(s.startDate)} → ${s.endDate ? fmtDate(s.endDate) : '6 yrs'}`} · {doneN}/{nodes.length}{capped ? '+' : ''} done</span>
                  </div>
                  <div className="card-body">
                    {nodes.length === 0 ? <p className="text-muted text-center mb-0">No occurrences in range.</p> : <Road nodes={nodes} />}
                    {capped && <div className="text-muted small mt-2">Showing the first 300 occurrences.</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* SCHEDULES */}
      {tab === 'schedules' && (
        <div className="card mb-0">
          <div className="card-header d-flex align-items-center">
            <h5 className="card-title mb-0 flex-grow-1">Recurring schedules</h5>
            <button className="btn btn-primary btn-sm" onClick={() => setSchModal({ initial: blankSchedule() })}><i className="ri-add-line me-1" />Add schedule</button>
          </div>
          <div className="card-body p-0">
            {schedules.length === 0 ? (
              <p className="text-muted text-center py-5 mb-0">No schedules yet. Add a recurring update requirement.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Title</th><th>Recurrence</th><th>Property</th><th>Reported by</th><th>Range</th><th className="text-center">Active</th><th className="text-end">Actions</th></tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-medium">{s.title}</td>
                        <td><span className="badge fw-normal bg-primary-subtle text-primary">{describeSchedule(s)}</span></td>
                        <td className="text-muted">{s.landId ? landName(s.landId) : '—'}</td>
                        <td className="text-muted">{s.supervisor || '—'}</td>
                        <td className="text-muted small">{s.frequency === 'once' ? fmtDate(s.startDate) : `${fmtDate(s.startDate)} → ${s.endDate ? fmtDate(s.endDate) : '6 yrs'}`}</td>
                        <td className="text-center">{s.active ? <span className="badge bg-success-subtle text-success">Active</span> : <span className="badge bg-secondary-subtle text-secondary">Off</span>}</td>
                        <td className="text-end text-nowrap">
                          <button className="btn btn-sm btn-ghost-secondary px-2" title="Edit" onClick={() => setSchModal({ initial: { ...s } })}><i className="ri-pencil-line" /></button>
                          <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDelSch(s)}><i className="ri-delete-bin-line" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPDATES */}
      {tab === 'updates' && (
        <div className="card mb-0">
          <div className="card-header d-flex align-items-center">
            <h5 className="card-title mb-0 flex-grow-1">Saved updates</h5>
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ initial: blankUpdate() })}><i className="ri-add-line me-1" />Add update</button>
          </div>
          <div className="card-body">
            {scopedUpdates.length === 0 ? (
              <p className="text-muted text-center py-5 mb-0">No updates yet.</p>
            ) : (
              <div className="tl">
                {scopedUpdates.map((u) => (
                  <div className="tl-item" key={u.id}>
                    <span className="tl-dot bg-primary-subtle text-primary"><i className="ri-user-star-line" /></span>
                    <div className="tl-body">
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <span className="badge bg-primary-subtle text-primary"><i className="ri-calendar-2-line me-1" />{period(u)}</span>
                        {u.supervisor && <span className="badge bg-info-subtle text-info"><i className="ri-user-line me-1" />{u.supervisor}</span>}
                        {u.landId && <span className="badge bg-light text-muted">{landName(u.landId)}</span>}
                        <span className="flex-grow-1" />
                        <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setModal({ initial: { ...u } })}><i className="ri-pencil-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDel(u)}><i className="ri-delete-bin-line" /></button>
                      </div>
                      <h6 className="mt-1 mb-2">{u.title}</h6>
                      {u.image && <a href={u.image} target="_blank" rel="noreferrer"><img src={u.image} alt="" className="mb-2" style={{ maxWidth: 220, maxHeight: 150, objectFit: 'cover', borderRadius: 8 }} /></a>}
                      {u.workDone && <div className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{u.workDone}</div>}
                      <div className="row g-2">
                        <Section icon="ri-star-line" tone="success" title="Highlights" text={u.highlights} />
                        <Section icon="ri-error-warning-line" tone="danger" title="Concerns / issues" text={u.concerns} />
                        <Section icon="ri-calendar-todo-line" tone="primary" title="Next plan" text={u.nextPlan} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <EntityModal
        open={Boolean(modal)}
        title={modal?.initial?.id ? 'Edit update' : 'New site update'}
        fields={updateFields}
        initial={modal ? modal.initial : {}}
        onSave={saveUpdate}
        onClose={() => setModal(null)}
      />

      <Modal open={Boolean(schModal)} size="lg" title={schModal?.initial?.id ? 'Edit schedule' : 'New schedule'} onClose={() => setSchModal(null)}>
        {schModal && <ScheduleForm initial={schModal.initial} landOpts={landOpts} people={people} onSave={saveSchedule} onCancel={() => setSchModal(null)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(del)} title="Delete update?" message={del ? `“${del.title}” will be removed.` : ''} confirmLabel="Delete"
        onConfirm={async () => { const t = del; setDel(null); await removeSupervisorUpdate(t.id); await reloadUpdates() }} onCancel={() => setDel(null)}
      />
      <ConfirmDialog
        open={Boolean(delSch)} title="Delete schedule?" message={delSch ? `“${delSch.title}” and its future occurrences will stop. Saved updates are kept.` : ''} confirmLabel="Delete"
        onConfirm={async () => { const t = delSch; setDelSch(null); await removeSchedule(t.id); await reloadSchedules() }} onCancel={() => setDelSch(null)}
      />
    </div>
  )
}
