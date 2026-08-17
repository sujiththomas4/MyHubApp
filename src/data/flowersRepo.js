import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * flowersRepo.js — the flower planning register (backend-only, like every
 * plantation repo). A flower plan is anchored to two real dates: when it
 * starts and when it is promised. References (nursery, supplier, buyer,
 * guidance video) hang off it one-to-many.
 */
const iso = () => new Date().toISOString()
const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

const rowToFlower = (r) => ({
  id: r.id,
  name: r.name || '',
  variety: r.variety || '',
  status: r.status || 'planned',
  startDate: r.start_date || '',
  deliveryDate: r.delivery_date || '',
  quantity: r.quantity ?? '',
  location: r.location || '',
  note: r.note || '',
  image: r.image || '',
  sortOrder: r.sort_order ?? 0,
})
const flowerToRow = (x) => ({
  id: x.id,
  name: x.name,
  variety: x.variety || null,
  status: x.status || 'planned',
  start_date: x.startDate || null,
  delivery_date: x.deliveryDate || null,
  quantity: numOrNull(x.quantity),
  location: x.location || null,
  note: x.note || null,
  image: x.image || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function useFlowers() {
  const { data, loading, error } = useCollection('plantation_flowers', [], { orderBy: 'delivery_date', ascending: true, map: rowToFlower })
  return { flowers: data, loading, error }
}
export const addFlower = (x) => insertRow('plantation_flowers', flowerToRow(x))
export const editFlower = (x) => updateRow('plantation_flowers', x.id, flowerToRow(x))
export const removeFlower = (id) => deleteRow('plantation_flowers', id)

// ---- References (many per flower) ------------------------------------------
const rowToRef = (r) => ({ id: r.id, flowerId: r.flower_id, name: r.name || '', phone: r.phone || '', address: r.address || '', youtube: r.youtube || '', note: r.note || '', sortOrder: r.sort_order ?? 0 })
const refToRow = (x) => ({ id: x.id, flower_id: x.flowerId, name: x.name || null, phone: x.phone || null, address: x.address || null, youtube: x.youtube || null, note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso() })
export function useFlowerRefs() {
  const { data, loading, error } = useCollection('plantation_flower_refs', [], { orderBy: 'sort_order', ascending: true, map: rowToRef })
  return { refs: data, loading, error }
}
export const addFlowerRef = (x) => insertRow('plantation_flower_refs', refToRow(x))
export const editFlowerRef = (x) => updateRow('plantation_flower_refs', x.id, refToRow(x))
export const removeFlowerRef = (id) => deleteRow('plantation_flower_refs', id)

export const FLOWER_STATUS = [
  { value: 'planned', label: 'Planned' },
  { value: 'growing', label: 'Growing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]
export const FLOWER_STATUS_BADGE = {
  planned: 'bg-secondary-subtle text-secondary',
  growing: 'bg-warning-subtle text-dark',
  ready: 'bg-info-subtle text-info',
  delivered: 'bg-success-subtle text-success',
  cancelled: 'bg-light text-muted',
}
export const FLOWER_STATUS_LABEL = Object.fromEntries(FLOWER_STATUS.map((s) => [s.value, s.label]))
/** A plan still running against its delivery date — the only rows that can slip. */
export const isLive = (f) => f.status !== 'delivered' && f.status !== 'cancelled'

/** Whole days from today to an ISO date. Negative = in the past. Null if unset. */
export function daysUntil(isoDate) {
  if (!isoDate) return null
  const target = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(target.getTime())) return null
  return Math.round((target - new Date(new Date().toDateString())) / 86400000)
}
/** Grow window in days between start and delivery. Null unless both are set. */
export function growDays(f) {
  if (!f.startDate || !f.deliveryDate) return null
  const d = Math.round((new Date(f.deliveryDate + 'T00:00:00') - new Date(f.startDate + 'T00:00:00')) / 86400000)
  return Number.isNaN(d) ? null : d
}
