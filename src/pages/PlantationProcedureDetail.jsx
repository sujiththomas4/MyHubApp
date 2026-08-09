import { Link, useParams } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useProcedures,
  useProcedureSteps, addProcedureStep, editProcedureStep, removeProcedureStep,
  PROC_STATUS, PROC_STATUS_BADGE,
} from '@/data/proceduresRepo'

/**
 * PlantationProcedureDetail.jsx — one procedure with its ordered steps
 * (route /business/plantations/records/:procId). Each step: what was done,
 * done/pending, date, note.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function PlantationProcedureDetail() {
  const { procId } = useParams()
  const { procedures } = useProcedures()
  const { steps } = useProcedureSteps()
  const proc = procedures.find((p) => p.id === procId)
  const mySteps = steps.filter((s) => s.procedureId === procId)
  const done = mySteps.filter((s) => s.done).length

  const fields = [
    { key: 'step', label: 'Step', type: 'text', placeholder: 'e.g. Applied online at KSEB portal', required: true },
    { key: 'done', label: 'Status', type: 'switch', switchLabel: 'Done', colClass: 'col-6' },
    { key: 'date', label: 'Date', type: 'date', colClass: 'col-6' },
    { key: 'note', label: 'Note / details', type: 'textarea' },
  ]
  const blank = () => ({ procedureId: procId, step: '', done: false, date: '', note: '' })
  const save = async (f) => { if (f.id) await editProcedureStep(f); else await addProcedureStep({ ...f, id: 'st-' + rid(), sortOrder: mySteps.length }) }
  // Drag-and-drop reorder: renumber sort_order to the new positions.
  const reorderSteps = (next) => {
    next.forEach((st, i) => { if (st.sortOrder !== i) editProcedureStep({ ...st, sortOrder: i }).catch(console.error) })
  }
  const columns = [
    { header: '#', className: 'text-muted', cell: (s) => mySteps.indexOf(s) + 1 },
    { header: 'Step', cell: (s) => (<div className="d-flex align-items-start gap-2">
      {s.done
        ? <i className="ri-checkbox-circle-fill text-success fs-5 mt-1" title="Done" />
        : <i className="ri-loader-4-line text-warning fs-5 mt-1" title="Pending" />}
      <div><div className="fw-medium">{s.step}</div>{s.note && <div className="text-muted small">{s.note}</div>}</div>
    </div>) },
    { header: 'Status', cell: (s) => (s.done
      ? <span className="text-success"><i className="ri-checkbox-circle-fill me-1" />Done{s.date ? ` · ${fmtDate(s.date)}` : ''}</span>
      : <span className="text-muted"><i className="ri-loader-4-line me-1" />Pending</span>) },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{proc ? proc.title : 'Procedure'}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/records" className="text-reset">Records</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{proc ? proc.title : procId}</li>
          </ol>
        </nav>
      </div>

      {proc && (
        <div className="card">
          <div className="card-body d-flex align-items-center gap-3 flex-wrap">
            {proc.image
              ? <img src={proc.image} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              : <span className="stat-icon bg-primary-subtle text-primary" style={{ width: 56, height: 56 }}><i className="ri-file-list-3-line fs-4" /></span>}
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">{proc.title}</h5>
                <span className={'badge ' + (PROC_STATUS_BADGE[proc.status] || PROC_STATUS_BADGE.done)}>{(PROC_STATUS.find((s) => s.value === proc.status) || {}).label || proc.status}</span>
                {proc.category && <span className="badge bg-light text-muted">{proc.category}</span>}
              </div>
              {proc.date && <div className="text-muted small mt-1"><i className="ri-calendar-line me-1" />{fmtDate(proc.date)}</div>}
              {proc.summary && <div className="text-muted small mt-1">{proc.summary}</div>}
              <div className="text-muted small mt-1">{done}/{mySteps.length} steps done</div>
            </div>
            <Link to="/business/plantations/records" className="btn btn-sm btn-light"><i className="ri-arrow-left-line me-1" />Back</Link>
          </div>
        </div>
      )}

      <CrudCard
        title={`Steps (${mySteps.length})`} addLabel="Add step" modalTitle="step"
        emptyText="No steps yet. Document each step you took."
        rows={mySteps} columns={columns} fields={fields} makeBlank={blank} onSave={save} onDelete={removeProcedureStep}
        onReorder={reorderSteps}
      />
    </div>
  )
}
