import { useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import CrudCard from '@/components/plantation/CrudCard'
import {
  useInventory, addInventory, editInventory, removeInventory,
  totalOf, INV_STATUS, INV_STATUS_BADGE, INV_STATUS_LABEL,
} from '@/data/inventoryRepo'

/**
 * PlantationInventory.jsx — supplies needed for the plantation (route
 * /business/plantations/inventory). Gloves, grow bags (with size spec), boots…
 * Each item: purchased / to-be-purchased, unit price, units, total.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

const Tile = ({ label, value, sub, icon, tone }) => (
  <div className="col-md-4 col-6">
    <div className="card stat-card h-100 mb-0"><div className="card-body">
      <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
      <h4 className="stat-value mt-3 mb-0">{value}</h4>
      {sub && <span className="text-muted small">{sub}</span>}
    </div></div>
  </div>
)

export default function PlantationInventory() {
  const { items } = useInventory()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (statusFilter && i.status !== statusFilter) return false
      if (q && !`${i.name} ${i.specification} ${i.note}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, statusFilter, search])

  const toBuy = items.filter((i) => i.status === 'to_buy').reduce((s, i) => s + totalOf(i), 0)
  const purchased = items.filter((i) => i.status === 'purchased').reduce((s, i) => s + totalOf(i), 0)

  const fields = [
    { key: 'name', label: 'Item', type: 'text', placeholder: 'e.g. Gloves, Grow bags, Boots', required: true, colClass: 'col-md-7' },
    { key: 'status', label: 'Status', type: 'select', options: INV_STATUS, colClass: 'col-md-5' },
    { key: 'specification', label: 'Specification', type: 'text', placeholder: 'e.g. Size 10x12, Large, 500g', colClass: 'col-md-12' },
    { key: 'unitPrice', label: 'Unit price (₹)', type: 'number', colClass: 'col-md-4' },
    { key: 'units', label: 'No. of units', type: 'number', colClass: 'col-md-4' },
    { key: 'total', label: 'Total (₹)', type: 'computed', compute: (f) => money((Number(f.unitPrice) || 0) * (Number(f.units) || 0), 'INR'), colClass: 'col-md-4' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]
  const blank = () => ({ name: '', status: statusFilter || 'to_buy', specification: '', unitPrice: '', units: '', note: '' })
  const save = async (f) => { if (f.id) await editInventory(f); else await addInventory({ ...f, id: 'inv-' + rid(), sortOrder: items.length }) }

  const columns = [
    { header: 'Item', cell: (i) => (<><div className="fw-medium">{i.name}</div>{i.note && <div className="text-muted small">{i.note}</div>}</>) },
    { header: 'Specification', className: 'text-muted', cell: (i) => i.specification || '—' },
    { header: 'Status', cell: (i) => <span className={'badge fw-normal ' + (INV_STATUS_BADGE[i.status] || INV_STATUS_BADGE.to_buy)}>{INV_STATUS_LABEL[i.status] || i.status}</span> },
    { header: 'Unit price', className: 'text-end', cell: (i) => (i.unitPrice !== '' && i.unitPrice != null ? money(Number(i.unitPrice), 'INR') : '—') },
    { header: 'Units', className: 'text-center', cell: (i) => (i.units !== '' && i.units != null ? i.units : '—') },
    { header: 'Total', className: 'text-end fw-semibold', cell: (i) => money(totalOf(i), 'INR') },
  ]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Inventory</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Inventory</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3 mb-3">
        <Tile label="To be purchased" value={money(Math.round(toBuy), 'INR')} sub={`${items.filter((i) => i.status === 'to_buy').length} items`} icon="ri-shopping-cart-2-line" tone="warning" />
        <Tile label="Purchased" value={money(Math.round(purchased), 'INR')} sub={`${items.filter((i) => i.status === 'purchased').length} items`} icon="ri-checkbox-circle-line" tone="success" />
        <Tile label="Total value" value={money(Math.round(toBuy + purchased), 'INR')} sub={`${items.length} items`} icon="ri-archive-line" tone="primary" />
      </div>

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ maxWidth: 240 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Search item, spec…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className={'btn btn-sm ' + (statusFilter === '' ? 'btn-primary' : 'btn-soft-secondary')} onClick={() => setStatusFilter('')}>All</button>
          <button className={'btn btn-sm ' + (statusFilter === 'to_buy' ? 'btn-warning' : 'btn-soft-warning')} onClick={() => setStatusFilter('to_buy')}>To buy</button>
          <button className={'btn btn-sm ' + (statusFilter === 'purchased' ? 'btn-success' : 'btn-soft-success')} onClick={() => setStatusFilter('purchased')}>Purchased</button>
          <span className="flex-grow-1" />
          <span className="text-muted small">{rows.length} of {items.length}</span>
        </div>
      </div>

      <CrudCard
        title="Supplies" addLabel="Add item" modalTitle="item" modalSize="lg"
        emptyText="No inventory yet. Add supplies you need — gloves, grow bags, boots…"
        rows={rows} columns={columns} fields={fields} makeBlank={blank} onSave={save} onDelete={removeInventory}
      />
    </div>
  )
}
