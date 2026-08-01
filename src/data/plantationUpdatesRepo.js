import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * plantationUpdatesRepo.js — the unified updates / observations timeline.
 *
 * One row per event against any hierarchy node (land/zone/vertical/pole/plant):
 *   regular · defect · dead · recovered   (top-level entries)
 *   remedy · result                       (children of a defect, via parentId)
 *
 * Backend-only, like every plantation repo. The whole (small) table is read and
 * filtered in memory by entity.
 */
const iso = () => new Date().toISOString()

const rowToUpdate = (r) => ({
  id: r.id,
  entityType: r.entity_type || 'plant',
  entityId: r.entity_id || '',
  landId: r.land_id || '',
  date: r.date || '',
  type: r.type || 'regular',
  title: r.title || '',
  detail: r.detail || '',
  image: r.image || '',
  status: r.status || '',
  parentId: r.parent_id || '',
  createdAt: r.created_at || '',
})
const updateToRow = (x) => ({
  id: x.id,
  entity_type: x.entityType || 'plant',
  entity_id: x.entityId || '',
  land_id: x.landId || null,
  date: x.date || null,
  type: x.type || 'regular',
  title: x.title || null,
  detail: x.detail || null,
  image: x.image || null,
  status: x.status || null,
  parent_id: x.parentId || null,
  updated_at: iso(),
})

export function useUpdates() {
  const { data, loading, error, reload } = useCollection('plantation_updates', [], { orderBy: 'date', ascending: false, map: rowToUpdate })
  return { updates: data, loading, error, reload }
}
export const addUpdate = (x) => insertRow('plantation_updates', updateToRow(x))
export const editUpdate = (x) => updateRow('plantation_updates', x.id, updateToRow(x))
export const removeUpdate = (id) => deleteRow('plantation_updates', id)

// Update-type presentation (icon / label / bootstrap tone).
export const UPDATE_TYPE = {
  regular: { label: 'Observation', icon: 'ri-eye-line', tone: 'info' },
  defect: { label: 'Defect', icon: 'ri-bug-line', tone: 'danger' },
  dead: { label: 'Dead', icon: 'ri-skull-2-line', tone: 'dark' },
  recovered: { label: 'Recovered', icon: 'ri-heart-pulse-line', tone: 'success' },
  replanted: { label: 'Replanted', icon: 'ri-seedling-line', tone: 'success' },
  support_leg: { label: 'Installed supporting leg', icon: 'ri-tools-line', tone: 'info' },
  remedy: { label: 'Remedy', icon: 'ri-medicine-bottle-line', tone: 'warning' },
  result: { label: 'Result', icon: 'ri-flask-line', tone: 'success' },
}
export const DEFECT_STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'treating', label: 'Treating' },
  { value: 'resolved', label: 'Resolved' },
]
export const DEFECT_STATUS_BADGE = { open: 'bg-danger-subtle text-danger', treating: 'bg-warning-subtle text-dark', resolved: 'bg-success-subtle text-success' }
