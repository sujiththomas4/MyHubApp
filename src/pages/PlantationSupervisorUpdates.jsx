import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import EntityModal from '@/components/plantation/EntityModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PropertyBar from '@/components/plantation/PropertyBar'
import { useLands, landLabel } from '@/data/plantationLandRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import {
  useSupervisorUpdates, addSupervisorUpdate, editSupervisorUpdate, removeSupervisorUpdate,
} from '@/data/supervisorUpdatesRepo'

/**
 * PlantationSupervisorUpdates.jsx — bi-weekly supervisor updates
 * (route /business/plantations/supervisor-updates). Add periodic reports and read
 * them back in a clean timeline with sections (work done / highlights / concerns /
 * next plan).
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const period = (u) => {
  if (u.periodFrom && u.periodTo) return `${fmtDate(u.periodFrom)} – ${fmtDate(u.periodTo)}`
  return fmtDate(u.periodFrom || u.periodTo || u.date) || '—'
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

export default function PlantationSupervisorUpdates() {
  const { updates } = useSupervisorUpdates()
  const { lands } = useLands()
  const { profiles } = useProfiles()
  const [property, setProperty] = useState('')
  const [modal, setModal] = useState(null)   // { initial } | null
  const [del, setDel] = useState(null)

  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const landOpts = [{ value: '', label: '— all / property —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const scoped = (property ? updates.filter((u) => u.landId === property) : updates)
    .slice().sort((a, b) => (b.periodFrom || b.date || '').localeCompare(a.periodFrom || a.date || ''))

  const fields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts, colClass: 'col-md-6' },
    { key: 'supervisor', label: 'Supervisor', type: 'search', options: people, allowCustom: true, placeholder: 'Name', colClass: 'col-md-6' },
    { key: 'periodFrom', label: 'Period from', type: 'date', colClass: 'col-md-4' },
    { key: 'periodTo', label: 'Period to', type: 'date', colClass: 'col-md-4' },
    { key: 'date', label: 'Report date', type: 'date', colClass: 'col-md-4' },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Bi-weekly update — Zone A & B', required: true },
    { key: 'workDone', label: 'Work done', type: 'textarea' },
    { key: 'highlights', label: 'Highlights', type: 'textarea', colClass: 'col-md-6' },
    { key: 'concerns', label: 'Concerns / issues', type: 'textarea', colClass: 'col-md-6' },
    { key: 'nextPlan', label: 'Next plan', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/supervisor' },
  ]
  const blank = () => ({ landId: property || '', supervisor: '', periodFrom: '', periodTo: '', date: todayISO(), title: '', workDone: '', highlights: '', concerns: '', nextPlan: '', image: '' })
  const save = async (f) => { if (f.id) await editSupervisorUpdate(f); else await addSupervisorUpdate({ ...f, id: 'sup-' + rid(), sortOrder: updates.length }) }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Supervisor Updates</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Supervisor Updates</li>
          </ol>
        </nav>
      </div>

      <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
        <div className="flex-grow-1"><PropertyBar value={property} onChange={setProperty} /></div>
        <button className="btn btn-primary" onClick={() => setModal({ initial: blank() })}><i className="ri-add-line me-1" />Add update</button>
      </div>

      <div className="card mb-0">
        <div className="card-body">
          {scoped.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No supervisor updates yet. Add the first bi-weekly report.</p>
          ) : (
            <div className="tl">
              {scoped.map((u) => (
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

      <EntityModal
        open={Boolean(modal)}
        title={modal?.initial?.id ? 'Edit update' : 'New supervisor update'}
        fields={fields}
        initial={modal ? modal.initial : {}}
        onSave={save}
        onClose={() => setModal(null)}
      />
      <ConfirmDialog
        open={Boolean(del)} title="Delete update?" message={del ? `“${del.title}” will be removed.` : ''} confirmLabel="Delete"
        onConfirm={async () => { const t = del; setDel(null); await removeSupervisorUpdate(t.id) }} onCancel={() => setDel(null)}
      />
    </div>
  )
}
