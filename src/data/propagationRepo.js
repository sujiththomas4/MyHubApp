import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * propagationRepo.js — in-house propagation / nursery batches. Backend-only.
 */
export const PROPAGATION_TYPE_LIST = 'Propagation Type'
const num = (v) => (v === '' || v == null ? 0 : Number(v))

const rowTo = (r) => ({
  id: r.id, type: r.type || '', landId: r.land_id || '', parentPlantId: r.parent_plant_id || '', label: r.label || '', location: r.location || '',
  startDate: r.start_date || '', expectedDate: r.expected_date || '',
  quantity: Number(r.quantity) || 0, readyQty: Number(r.ready_qty) || 0,
  status: r.status || 'in_progress', assigned: r.assigned || '', note: r.note || '', image: r.image || '',
})
const toRow = (x) => ({
  id: x.id, type: x.type || null, land_id: x.landId || null, parent_plant_id: x.parentPlantId || null, label: x.label || null, location: x.location || null,
  start_date: x.startDate || null, expected_date: x.expectedDate || null,
  quantity: num(x.quantity), ready_qty: num(x.readyQty),
  status: x.status || 'in_progress', assigned: x.assigned || null, note: x.note || null, image: x.image || null,
})

export function usePropagation() {
  const { data, loading, error } = useCollection('plantation_propagation', [], { orderBy: 'start_date', ascending: false, map: rowTo })
  return { batches: data, loading, error }
}
export const addPropagation = (x) => insertRow('plantation_propagation', toRow(x))
export const editPropagation = (x) => updateRow('plantation_propagation', x.id, toRow(x))
export const removePropagation = (id) => deleteRow('plantation_propagation', id)
