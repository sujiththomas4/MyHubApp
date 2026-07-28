import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useProcedures, addProcedure, editProcedure, removeProcedure,
  useProcedureSteps,
  useContacts, addContact, editContact, removeContact,
  PROC_STATUS, PROC_STATUS_BADGE,
} from '@/data/proceduresRepo'
import { useLookups, valuesFor, CONTACT_TYPE_LIST, PROC_CATEGORY_LIST } from '@/data/lookupsRepo'

/**
 * PlantationProcedures.jsx — "Records" (route /business/plantations/records):
 *   • Procedures — document things done and the steps taken (open a row for steps).
 *   • Contacts — a directory of brokers, electricians, officers, suppliers…
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const TABS = [
  { id: 'procedures', label: 'Procedures', icon: 'ri-file-list-3-line' },
  { id: 'contacts', label: 'Contacts', icon: 'ri-contacts-book-2-line' },
]

export default function PlantationProcedures() {
  const [tab, setTab] = useState('procedures')
  const { procedures } = useProcedures()
  const { steps } = useProcedureSteps()
  const { contacts } = useContacts()
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

  // ---- Contacts ----
  const contactFields = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Ramesh', required: true, colClass: 'col-md-7' },
    { key: 'role', label: 'Type', type: 'datalist', options: valuesFor(lookups, CONTACT_TYPE_LIST), placeholder: 'Broker / Electrician…', colClass: 'col-md-5' },
    { key: 'phone', label: 'Phone', type: 'text', placeholder: '98xxxxxxxx', colClass: 'col-md-6' },
    { key: 'email', label: 'Email', type: 'text', colClass: 'col-md-6' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const contactBlank = () => ({ name: '', role: '', phone: '', email: '', address: '', note: '' })
  const contactSave = async (f) => { if (f.id) await editContact(f); else await addContact({ ...f, id: 'ct-' + rid(), sortOrder: contacts.length }) }
  const contactColumns = [
    { header: 'Name', cell: (c) => (<><span className="fw-medium">{c.name}</span>{c.note && <div className="text-muted small">{c.note}</div>}</>) },
    { header: 'Type', cell: (c) => (c.role ? <span className="badge bg-primary-subtle text-primary">{c.role}</span> : '—') },
    { header: 'Phone', cell: (c) => (c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—') },
    { header: 'Email', cell: (c) => (c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—') },
    { header: 'Address', className: 'text-muted', cell: (c) => c.address || '—' },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Records</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Records</li>
          </ol>
        </nav>
      </div>

      <div className="pf-tabs mb-3">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={'pf-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <i className={t.icon} /><span>{t.label} <span className="text-muted">({t.id === 'procedures' ? procedures.length : contacts.length})</span></span>
          </button>
        ))}
      </div>

      {tab === 'procedures' ? (
        <CrudCard
          title="Procedures" addLabel="Add procedure" modalTitle="procedure" modalSize="lg"
          emptyText="No procedures yet. Document things you've done and the steps taken."
          rows={procedures} columns={procColumns} fields={procFields} makeBlank={procBlank} onSave={procSave} onDelete={removeProcedure}
          openTo={(p) => `/business/plantations/records/${p.id}`} openLabel="Steps"
        />
      ) : (
        <CrudCard
          title="Contacts" addLabel="Add contact" modalTitle="contact" modalSize="lg"
          emptyText="No contacts yet. Save brokers, electricians, officers, suppliers…"
          rows={contacts} columns={contactColumns} fields={contactFields} makeBlank={contactBlank} onSave={contactSave} onDelete={removeContact}
        />
      )}
    </div>
  )
}
