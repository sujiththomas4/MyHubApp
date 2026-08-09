import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * inventoryRepo.js — plantation supplies / inventory (gloves, grow bags, boots…).
 * Each item is purchased or to-be-purchased with a unit price + quantity.
 * Backend-only.
 */
const iso = () => new Date().toISOString()

const rowTo = (r) => ({
  id: r.id,
  name: r.name || '',
  specification: r.specification || '',
  status: r.status || 'to_buy',
  unitPrice: r.unit_price ?? '',
  units: r.units ?? '',
  note: r.note || '',
  sortOrder: r.sort_order ?? 0,
})
const toRow = (x) => ({
  id: x.id,
  name: (x.name || '').trim(),
  specification: x.specification || null,
  status: x.status || 'to_buy',
  unit_price: x.unitPrice === '' || x.unitPrice == null ? null : Number(x.unitPrice),
  units: x.units === '' || x.units == null ? null : Number(x.units),
  note: x.note || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function useInventory() {
  const { data, loading, error, reload } = useCollection('plantation_inventory', [], { orderBy: 'sort_order', ascending: true, map: rowTo })
  return { items: data, loading, error, reload }
}
export const addInventory = (x) => insertRow('plantation_inventory', toRow(x))
export const editInventory = (x) => updateRow('plantation_inventory', x.id, toRow(x))
export const removeInventory = (id) => deleteRow('plantation_inventory', id)

export const totalOf = (x) => (Number(x.unitPrice) || 0) * (Number(x.units) || 0)

export const INV_STATUS = [
  { value: 'to_buy', label: 'To be purchased' },
  { value: 'purchased', label: 'Purchased' },
]
export const INV_STATUS_BADGE = { to_buy: 'bg-warning-subtle text-dark', purchased: 'bg-success-subtle text-success' }
export const INV_STATUS_LABEL = Object.fromEntries(INV_STATUS.map((s) => [s.value, s.label]))
