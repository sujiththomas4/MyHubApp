import { useState } from 'react'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useFertilizers, addFertilizer, editFertilizer, removeFertilizer,
  FERT_PURPOSE, FERT_PURPOSE_LABEL, FERT_PURPOSE_BADGE,
} from '@/data/fertilizersRepo'
import { useLookups, valuesFor, HEALTH_SECTION_LIST } from '@/data/lookupsRepo'

/**
 * PlantationFertilizers.jsx — "Health Center": a tabbed reference library
 * (route /business/plantations/health-center). One table, many sections (Soil,
 * Pepper Plant, …); each entry is a method/input with what it does, pros/cons,
 * when to use / not use, how to use, purpose, and an optional referral contact.
 * Open a row for the full read-out.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const clip = (s, n = 90) => (!s ? '—' : s.length > n ? s.slice(0, n) + '…' : s)
const DEFAULT_SECTIONS = ['Soil', 'Pepper Plant']

export default function PlantationFertilizers() {
  const { fertilizers } = useFertilizers()
  const { lookups } = useLookups()
  const [active, setActive] = useState('')

  const sections = [...new Set([...valuesFor(lookups, HEALTH_SECTION_LIST), ...fertilizers.map((f) => f.section).filter(Boolean), ...DEFAULT_SECTIONS])]
  const section = sections.includes(active) ? active : (sections[0] || '')
  const rows = fertilizers.filter((f) => (f.section || DEFAULT_SECTIONS[0]) === section)
  const countIn = (s) => fertilizers.filter((f) => (f.section || DEFAULT_SECTIONS[0]) === s).length

  const fields = [
    { key: 'name', label: 'Name / method', type: 'text', placeholder: 'e.g. NPK 19:19:19, Neem cake, Liming', required: true, colClass: 'col-md-6' },
    { key: 'section', label: 'Section (tab)', type: 'datalist', options: sections, required: true, colClass: 'col-md-3' },
    { key: 'purpose', label: 'Purpose', type: 'select', options: FERT_PURPOSE, colClass: 'col-md-3' },
    { key: 'whatItDoes', label: 'What it does', type: 'textarea' },
    { key: 'pros', label: 'Pros', type: 'textarea', colClass: 'col-md-6' },
    { key: 'cons', label: 'Cons', type: 'textarea', colClass: 'col-md-6' },
    { key: 'whenUse', label: 'When to use', type: 'textarea', colClass: 'col-md-6' },
    { key: 'whenNotUse', label: 'When NOT to use', type: 'textarea', colClass: 'col-md-6' },
    { key: 'howToUse', label: 'How to use', type: 'textarea', placeholder: 'Application method / steps' },
    { key: 'dosage', label: 'Dosage / application', type: 'text', placeholder: 'e.g. 5 g per litre, foliar spray' },
    { key: 'referralName', label: 'Referral contact', type: 'text', placeholder: 'Who suggested / supplier', colClass: 'col-md-6' },
    { key: 'referralPhone', label: 'Referral phone', type: 'text', placeholder: '98xxxxxxxx', colClass: 'col-md-6' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/health-center' },
  ]
  const makeBlank = () => ({ name: '', section, purpose: '', whatItDoes: '', pros: '', cons: '', whenUse: '', whenNotUse: '', howToUse: '', dosage: '', referralName: '', referralPhone: '', note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editFertilizer(f); else await addFertilizer({ ...f, id: 'hc-' + rid(), sortOrder: fertilizers.length }) }

  const columns = [
    {
      header: 'Method',
      cell: (f) => (
        <div className="d-flex align-items-center gap-2">
          {f.image
            ? <img src={f.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
            : <span className="stat-icon bg-success-subtle text-success" style={{ width: 36, height: 36 }}><i className="ri-flask-line" /></span>}
          <div>
            <div className="fw-medium">{f.name}</div>
            {f.purpose && <span className={'badge ' + (FERT_PURPOSE_BADGE[f.purpose] || FERT_PURPOSE_BADGE.other)}>{FERT_PURPOSE_LABEL[f.purpose] || f.purpose}</span>}
          </div>
        </div>
      ),
    },
    { header: 'What it does', className: 'text-muted', cell: (f) => clip(f.whatItDoes) },
    { header: 'When to use', className: 'text-muted', cell: (f) => clip(f.whenUse, 70) },
    { header: 'Referral', cell: (f) => (f.referralName || f.referralPhone ? <span>{f.referralName}{f.referralPhone ? <a className="ms-1" href={`tel:${f.referralPhone}`}>{f.referralPhone}</a> : ''}</span> : <span className="text-muted">—</span>) },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Health Center</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Health Center</li>
          </ol>
        </nav>
      </div>

      <div className="pf-tabs mb-3">
        {sections.map((s) => (
          <button key={s} type="button" className={'pf-tab' + (s === section ? ' active' : '')} onClick={() => setActive(s)}>
            <i className="ri-heart-pulse-line" />
            <span>{s} <span className="text-muted">({countIn(s)})</span></span>
          </button>
        ))}
      </div>

      <CrudCard
        title={`${section} — methods`} addLabel="Add method" modalTitle="method" modalSize="lg"
        emptyText={`No methods under “${section}” yet. Add references for this section. 🌿`}
        rows={rows} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeFertilizer}
        openTo={(f) => `/business/plantations/health-center/${f.id}`} openLabel="Open"
      />
    </div>
  )
}
