import { useMemo, useState } from 'react'
import CrudCard from '@/components/plantation/CrudCard'
import { useContacts, addContact, editContact, removeContact } from '@/data/proceduresRepo'

/**
 * PlantationContacts.jsx — a directory of useful contacts (route
 * /business/plantations/contacts): nurseries, brokers, suppliers, officers…
 * Each with a category, district, "specialised in", phone and address.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const CATEGORIES = ['Nursery', 'Broker', 'Supplier', 'Government officer', 'Electrician', 'Transport', 'Labour', 'Consultant', 'Other']
const CAT_TONE = { Nursery: 'success', Broker: 'primary', Supplier: 'info', 'Government officer': 'warning', Electrician: 'secondary', Transport: 'info', Labour: 'secondary', Consultant: 'primary', Other: 'secondary' }

export default function PlantationContacts() {
  const { contacts } = useContacts()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('')

  const cats = useMemo(() => [...new Set(contacts.map((c) => c.category).filter(Boolean))].sort(), [contacts])
  const catOptions = [...new Set([...CATEGORIES, ...cats])]

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter((c) => {
      if (cat && c.category !== cat) return false
      if (q) {
        const hay = [c.name, c.category, c.district, c.specialisedIn, c.phone, c.address, c.note].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [contacts, search, cat])

  const fields = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Green Leaf Nursery / Ramesh', required: true, colClass: 'col-md-7' },
    { key: 'category', label: 'Category', type: 'datalist', options: catOptions, placeholder: 'Nursery / Broker…', colClass: 'col-md-5' },
    { key: 'specialisedIn', label: 'Specialised in', type: 'text', placeholder: 'e.g. Pepper grafts, drip irrigation', colClass: 'col-md-6' },
    { key: 'phone', label: 'Contact number', type: 'text', placeholder: '98xxxxxxxx', colClass: 'col-md-6' },
    { key: 'district', label: 'District', type: 'text', placeholder: 'e.g. Idukki', colClass: 'col-md-6' },
    { key: 'email', label: 'Email', type: 'text', colClass: 'col-md-6' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const blank = () => ({ name: '', category: cat || '', specialisedIn: '', phone: '', district: '', email: '', address: '', note: '' })
  const save = async (f) => { if (f.id) await editContact(f); else await addContact({ ...f, id: 'ct-' + rid(), sortOrder: contacts.length }) }

  const columns = [
    { header: 'Name', cell: (c) => (<><span className="fw-medium">{c.name}</span>{c.note && <div className="text-muted small">{c.note}</div>}</>) },
    { header: 'Category', cell: (c) => (c.category ? <span className={`badge bg-${CAT_TONE[c.category] || 'secondary'}-subtle text-${CAT_TONE[c.category] || 'secondary'}`}>{c.category}</span> : '—') },
    { header: 'Specialised in', className: 'text-muted', cell: (c) => c.specialisedIn || '—' },
    { header: 'Contact', cell: (c) => (c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—') },
    { header: 'District', className: 'text-muted', cell: (c) => c.district || '—' },
    { header: 'Address', className: 'text-muted', cell: (c) => c.address || '—' },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Contacts</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Contacts</li>
          </ol>
        </nav>
      </div>

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Search name, phone, district…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || cat) && <button className="btn btn-sm btn-link text-danger p-0" onClick={() => { setSearch(''); setCat('') }}>Clear</button>}
          <span className="flex-grow-1" />
          <span className="text-muted small">{rows.length} of {contacts.length}</span>
        </div>
      </div>

      <CrudCard
        title="Contacts directory" addLabel="Add contact" modalTitle="contact" modalSize="lg"
        emptyText="No contacts yet. Save nurseries, brokers, suppliers, officers…"
        rows={rows} columns={columns} fields={fields} makeBlank={blank} onSave={save} onDelete={removeContact}
      />
    </div>
  )
}
