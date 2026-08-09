import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useProcedures, addProcedure, editProcedure, removeProcedure,
  useProcedureSteps,
  PROC_STATUS, PROC_STATUS_BADGE,
} from '@/data/proceduresRepo'
import { useLookups, valuesFor, PROC_CATEGORY_LIST } from '@/data/lookupsRepo'

/**
 * PlantationProcedures.jsx — "Setup & Procedures" (route /business/plantations/records):
 * document things done and the steps taken (open a row for steps). Contacts now
 * live on their own Contacts screen.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function PlantationProcedures() {
  const { procedures } = useProcedures()
  const { steps } = useProcedureSteps()
  const { lookups } = useLookups()
  const stepCount = (id) => steps.filter((s) => s.procedureId === id).length
  const stepDone = (id) => steps.filter((s) => s.procedureId === id && s.done).length

  // ---- Procedures ----
  const procFields = [
    { key: 'title', label: 'What was done', type: 'text', placeholder: 'e.g. Electricity connection', required: true, colClass: 'col-md-8' },
    { key: 'status', label: 'Status', type: 'select', options: PROC_STATUS, colClass: 'col-md-4' },
    { key: 'category', label: 'Category', type: 'datalist', options: valuesFor(lookups, PROC_CATEGORY_LIST), placeholder: 'Electricity / Water / Legal…', colClass: 'col-md-8' },
    { key: 'date', label: 'Date', type: 'date', colClass: 'col-md-4' },
    { key: 'summary', label: 'Summary', type: 'textarea' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/procedures' },
  ]
  const procBlank = () => ({ title: '', status: 'done', category: '', date: '', summary: '', note: '', image: '' })
  const procSave = async (f) => { if (f.id) await editProcedure(f); else await addProcedure({ ...f, id: 'proc-' + rid(), sortOrder: procedures.length }) }
  const procColumns = [
    { header: 'Procedure', cell: (p) => (<><div className="fw-medium">{p.title}</div>{p.category && <span className="badge bg-light text-muted">{p.category}</span>}</>) },
    { header: 'Status', cell: (p) => <span className={'badge ' + (PROC_STATUS_BADGE[p.status] || PROC_STATUS_BADGE.done)}>{(PROC_STATUS.find((s) => s.value === p.status) || {}).label || p.status}</span> },
    { header: 'Steps', className: 'text-center', cell: (p) => (stepCount(p.id) ? <span className="badge bg-info-subtle text-info">{stepDone(p.id)}/{stepCount(p.id)}</span> : <span className="text-muted">—</span>) },
    { header: 'Date', className: 'text-muted', cell: (p) => (p.date ? fmtDate(p.date) : '—') },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Setup &amp; Procedures</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Setup &amp; Procedures</li>
          </ol>
        </nav>
      </div>

      <CrudCard
        title="Procedures" addLabel="Add procedure" modalTitle="procedure" modalSize="lg"
        emptyText="No procedures yet. Document things you've done and the steps taken."
        rows={procedures} columns={procColumns} fields={procFields} makeBlank={procBlank} onSave={procSave} onDelete={removeProcedure}
        openTo={(p) => `/business/plantations/records/${p.id}`} openLabel="Steps"
      />
    </div>
  )
}
