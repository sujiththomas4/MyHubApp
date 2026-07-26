import CrudCard from '@/components/plantation/CrudCard'
import { useLookups, addLookup, editLookup, removeLookup } from '@/data/lookupsRepo'

/**
 * MasterData.jsx — admin-only. Manage the values behind app dropdowns. Each row
 * is (Dropdown name, Value); e.g. the "Expense Category" list feeds the expense
 * screen's Category dropdown.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

export default function MasterData() {
  const { lookups } = useLookups()
  const lists = [...new Set(lookups.map((l) => l.list).filter(Boolean))]
  const rows = [...lookups].sort((a, b) => a.list.localeCompare(b.list) || a.sortOrder - b.sortOrder)

  const fields = [
    { key: 'list', label: 'Dropdown name', type: 'datalist', options: lists, placeholder: 'e.g. Expense Category', required: true },
    { key: 'value', label: 'Value', type: 'text', placeholder: 'e.g. Fertilizer', required: true },
  ]
  const makeBlank = () => ({ list: '', value: '' })
  const onSave = async (f) => {
    if (f.id) { await editLookup(f); return }
    const sortOrder = lookups.filter((l) => l.list === f.list).length
    await addLookup({ ...f, id: 'lk-' + rid(), sortOrder })
  }
  const columns = [
    { header: 'Dropdown', cell: (l) => <span className="badge bg-primary-subtle text-primary">{l.list}</span> },
    { header: 'Value', cell: (l) => <span className="fw-medium">{l.value}</span> },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Master Data</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">System</li>
            <li className="breadcrumb-item active" aria-current="page">Master Data</li>
          </ol>
        </nav>
      </div>

      <div className="alert alert-info d-flex align-items-center">
        <i className="ri-information-line me-2 fs-5" />
        <span>Values here populate app dropdowns. The <strong>Expense Category</strong> list feeds the Plantation → Expenses category picker.</span>
      </div>

      <CrudCard
        title="Dropdown values" addLabel="Add value" modalTitle="value" emptyText="No dropdown values yet."
        rows={rows} columns={columns} fields={fields} makeBlank={makeBlank} onSave={onSave} onDelete={removeLookup}
      />
    </div>
  )
}
