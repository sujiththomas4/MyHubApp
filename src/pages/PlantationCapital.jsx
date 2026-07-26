import { money, fmtDate } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import { usePlantationCapital, addCapital, editCapital, removeCapital } from '@/data/plantationFinanceRepo'
import { useProfiles, personName } from '@/data/profilesRepo'
import { useLands, landLabel } from '@/data/plantationLandRepo'

/**
 * PlantationCapital.jsx — capital contributed into the plantation
 * (route /business/plantations/capital).
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function PlantationCapital() {
  const { capital } = usePlantationCapital()
  const { profiles } = useProfiles()
  const { lands } = useLands()
  const people = [...new Set(profiles.map(personName).filter(Boolean))]
  const landOpts = [{ value: '', label: '— select —' }, ...lands.map((l) => ({ value: l.id, label: landLabel(l) }))]
  const landName = (id) => landLabel(lands.find((l) => l.id === id))

  const total = capital.reduce((s, c) => s + c.amount, 0)

  // Roll up contributions per person, largest first.
  const byPerson = {}
  capital.forEach((c) => { const k = c.contributor || '—'; byPerson[k] = (byPerson[k] || 0) + c.amount })
  const contributors = Object.entries(byPerson).sort((a, b) => b[1] - a[1])

  const fields = [
    { key: 'landId', label: 'Property', type: 'select', options: landOpts },
    { key: 'contributor', label: 'Contributor', type: 'search', options: people, allowCustom: true, placeholder: 'Search people…', required: true },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true, colClass: 'col-6' },
    { key: 'date', label: 'Date', type: 'date', colClass: 'col-6' },
    { key: 'note', label: 'Note', type: 'textarea' },
    { key: 'image', label: 'Receipt', type: 'image', folder: 'plantation/capital' },
  ]
  const makeBlank = () => ({ landId: '', contributor: '', amount: '', date: todayISO(), note: '', image: '' })
  const onSave = async (f) => { if (f.id) await editCapital(f); else await addCapital({ ...f, id: 'cap-' + rid() }) }
  const columns = [
    { header: 'Contributor', cell: (c) => <span className="fw-medium">{c.contributor}</span> },
    { header: 'Property', className: 'text-muted', cell: (c) => landName(c.landId) || '—' },
    { header: 'Amount', className: 'text-end', cell: (c) => <span className="text-success fw-semibold">{money(c.amount, 'INR')}</span> },
    { header: 'Date', className: 'text-muted', cell: (c) => (c.date ? fmtDate(c.date) : '—') },
    { header: 'Note', className: 'text-muted', cell: (c) => c.note || '—' },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Capital</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Capital</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-xl-4 col-md-5">
          <div className="card stat-card h-100 mb-0"><div className="card-body">
            <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Total capital</span></div><div className="stat-icon bg-success-subtle text-success"><i className="ri-safe-2-line" /></div></div>
            <h4 className="stat-value mt-3 mb-0 text-success">{money(total, 'INR')}</h4>
            <span className="text-muted small">{capital.length} contribution{capital.length === 1 ? '' : 's'} · {contributors.length} contributor{contributors.length === 1 ? '' : 's'}</span>
          </div></div>
        </div>
        <div className="col-xl-8 col-md-7">
          <div className="card h-100 mb-0">
            <div className="card-header py-2"><h6 className="card-title mb-0">By contributor</h6></div>
            <div className="card-body p-0">
              {contributors.length === 0 ? (
                <p className="text-muted text-center py-3 mb-0">No contributions yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light"><tr><th>Contributor</th><th className="text-end">Contributed</th><th className="text-end">Share</th></tr></thead>
                    <tbody>
                      {contributors.map(([name, amt]) => (
                        <tr key={name}>
                          <td className="fw-medium">{name}</td>
                          <td className="text-end text-success fw-semibold">{money(amt, 'INR')}</td>
                          <td className="text-end text-muted">{total ? Math.round((amt / total) * 100) : 0}%</td>
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

      <CrudCard
        title="Capital contributions" addLabel="Add capital" modalTitle="capital" emptyText="No capital recorded yet."
        rows={capital} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeCapital}
      />
    </div>
  )
}
