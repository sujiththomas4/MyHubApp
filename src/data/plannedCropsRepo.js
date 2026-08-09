import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * plannedCropsRepo.js — the planned-crops register (backend-only, like every
 * plantation repo). A planning list of crops to grow with status, suggested
 * planting window, time-to-result and reference material.
 */
const iso = () => new Date().toISOString()

const rowToCrop = (r) => ({
  id: r.id,
  name: r.name || '',
  status: r.status || 'not_started',
  specification: r.specification || '',
  yieldValue: r.yield_value ?? '',
  yieldUnit: r.yield_unit || 'months',
  interested: r.interested ?? '',
  planted: r.planted ?? '',
  plantFrom: r.plant_from || '',
  plantTo: r.plant_to || '',
  duration: r.duration || '',
  youtube: r.youtube || '',
  contacts: r.contacts || '',
  note: r.note || '',
  image: r.image || '',
  sortOrder: r.sort_order ?? 0,
})
const cropToRow = (x) => ({
  id: x.id,
  name: x.name,
  status: x.status || 'not_started',
  specification: x.specification || null,
  yield_value: x.yieldValue === '' || x.yieldValue == null ? null : Number(x.yieldValue),
  yield_unit: x.yieldUnit || 'months',
  interested: x.interested === '' || x.interested == null ? null : Number(x.interested),
  planted: x.planted === '' || x.planted == null ? null : Number(x.planted),
  plant_from: x.plantFrom || null,
  plant_to: x.plantTo || null,
  duration: x.duration || null,
  youtube: x.youtube || null,
  contacts: x.contacts || null,
  note: x.note || null,
  image: x.image || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function usePlannedCrops() {
  const { data, loading, error } = useCollection('plantation_planned_crops', [], { orderBy: 'sort_order', ascending: true, map: rowToCrop })
  return { crops: data, loading, error }
}
export const addPlannedCrop = (x) => insertRow('plantation_planned_crops', cropToRow(x))
export const editPlannedCrop = (x) => updateRow('plantation_planned_crops', x.id, cropToRow(x))
export const removePlannedCrop = (id) => deleteRow('plantation_planned_crops', id)

// ---- Reference links (many per crop) ---------------------------------------
const rowToLink = (r) => ({ id: r.id, cropId: r.crop_id, title: r.title || '', url: r.url || '', contactId: r.contact_id || '', sortOrder: r.sort_order ?? 0 })
const linkToRow = (x) => ({ id: x.id, crop_id: x.cropId, title: x.title || null, url: x.url || null, contact_id: x.contactId || null, sort_order: x.sortOrder ?? 0, updated_at: iso() })
export function useCropLinks() {
  const { data, loading, error } = useCollection('plantation_crop_links', [], { orderBy: 'sort_order', ascending: true, map: rowToLink })
  return { links: data, loading, error }
}
export const addCropLink = (x) => insertRow('plantation_crop_links', linkToRow(x))
export const editCropLink = (x) => updateRow('plantation_crop_links', x.id, linkToRow(x))
export const removeCropLink = (id) => deleteRow('plantation_crop_links', id)

// ---- Points of contact (many per crop) -------------------------------------
const rowToContact = (r) => ({ id: r.id, cropId: r.crop_id, name: r.name || '', phone: r.phone || '', address: r.address || '', youtube: r.youtube || '', note: r.note || '', sortOrder: r.sort_order ?? 0 })
const contactToRow = (x) => ({ id: x.id, crop_id: x.cropId, name: x.name || null, phone: x.phone || null, address: x.address || null, youtube: x.youtube || null, note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso() })
export function useCropContacts() {
  const { data, loading, error } = useCollection('plantation_crop_contacts', [], { orderBy: 'sort_order', ascending: true, map: rowToContact })
  return { contacts: data, loading, error }
}
export const addCropContact = (x) => insertRow('plantation_crop_contacts', contactToRow(x))
export const editCropContact = (x) => updateRow('plantation_crop_contacts', x.id, contactToRow(x))
export const removeCropContact = (id) => deleteRow('plantation_crop_contacts', id)

export const CROP_STATUS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'started', label: 'Started' },
]
export const CROP_STATUS_BADGE = { not_started: 'bg-secondary-subtle text-secondary', started: 'bg-success-subtle text-success' }
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const YIELD_UNITS = [{ value: 'months', label: 'months' }, { value: 'years', label: 'years' }]
