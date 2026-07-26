import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * plantationLandRepo.js — property lands and their planting hierarchy.
 *
 *   lands > zones > (zone items | verticals > poles > plants | care | defects)
 *
 * Backend-only, like every other repo. Screens read the whole (small) tables and
 * filter by parent id in memory.
 */
const num = (v) => (v === '' || v == null ? null : Number(v))
const iso = () => new Date().toISOString()

// ---- Lands ------------------------------------------------------------------
const rowToLand = (r) => ({
  id: r.id, name: r.name || '', code: r.code || '', location: r.location || '',
  area: r.area ?? '', areaUnit: r.area_unit || 'acre',
  ownership: r.ownership || 'owned', leaseFrom: r.lease_from || '', leaseTo: r.lease_to || '',
  note: r.note || '', image: r.image || '', sortOrder: r.sort_order ?? 0,
})
const landToRow = (x) => ({
  id: x.id, name: x.name, code: x.code || null, location: x.location || null,
  area: num(x.area), area_unit: x.areaUnit || 'acre',
  ownership: x.ownership || 'owned',
  lease_from: x.ownership === 'leased' ? (x.leaseFrom || null) : null,
  lease_to: x.ownership === 'leased' ? (x.leaseTo || null) : null,
  note: x.note || null, image: x.image || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function useLands() {
  const { data, loading, error } = useCollection('plantation_lands', [], { orderBy: 'sort_order', ascending: true, map: rowToLand })
  return { lands: data, loading, error }
}
export const landLabel = (l) => (l ? (l.code ? `${l.name} (${l.code})` : l.name) : '')
export const addLand = (x) => insertRow('plantation_lands', landToRow(x))
export const editLand = (x) => updateRow('plantation_lands', x.id, landToRow(x))
export const removeLand = (id) => deleteRow('plantation_lands', id)

// ---- Zones ------------------------------------------------------------------
const rowToZone = (r) => ({
  id: r.id, landId: r.land_id, name: r.name || '', code: r.code || '', area: r.area ?? '', areaUnit: r.area_unit || 'cent',
  hasVerticals: !!r.has_verticals, note: r.note || '', sortOrder: r.sort_order ?? 0,
})
const zoneToRow = (x) => ({
  id: x.id, land_id: x.landId, name: x.name, code: x.code || null, area: num(x.area), area_unit: x.areaUnit || 'cent',
  has_verticals: !!x.hasVerticals, note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function useZones() {
  const { data, loading, error } = useCollection('plantation_zones', [], { orderBy: 'sort_order', ascending: true, map: rowToZone })
  return { zones: data, loading, error }
}
export const addZone = (x) => insertRow('plantation_zones', zoneToRow(x))
export const editZone = (x) => updateRow('plantation_zones', x.id, zoneToRow(x))
export const removeZone = (id) => deleteRow('plantation_zones', id)

// ---- Zone items -------------------------------------------------------------
const rowToItem = (r) => ({
  id: r.id, zoneId: r.zone_id, name: r.name || '', kind: r.kind || '', quantity: r.quantity ?? '',
  note: r.note || '', image: r.image || '', sortOrder: r.sort_order ?? 0,
})
const itemToRow = (x) => ({
  id: x.id, zone_id: x.zoneId, name: x.name, kind: x.kind || null, quantity: num(x.quantity),
  note: x.note || null, image: x.image || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function useZoneItems() {
  const { data, loading, error } = useCollection('plantation_zone_items', [], { orderBy: 'sort_order', ascending: true, map: rowToItem })
  return { items: data, loading, error }
}
export const addZoneItem = (x) => insertRow('plantation_zone_items', itemToRow(x))
export const editZoneItem = (x) => updateRow('plantation_zone_items', x.id, itemToRow(x))
export const removeZoneItem = (id) => deleteRow('plantation_zone_items', id)

// ---- Verticals (rows) -------------------------------------------------------
const rowToVertical = (r) => ({ id: r.id, zoneId: r.zone_id, name: r.name || '', code: r.code || '', note: r.note || '', sortOrder: r.sort_order ?? 0 })
const verticalToRow = (x) => ({ id: x.id, zone_id: x.zoneId, name: x.name, code: x.code || null, note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso() })
export function useVerticals() {
  const { data, loading, error } = useCollection('plantation_verticals', [], { orderBy: 'sort_order', ascending: true, map: rowToVertical })
  return { verticals: data, loading, error }
}
export const addVertical = (x) => insertRow('plantation_verticals', verticalToRow(x))
export const editVertical = (x) => updateRow('plantation_verticals', x.id, verticalToRow(x))
export const removeVertical = (id) => deleteRow('plantation_verticals', id)

// ---- Poles ------------------------------------------------------------------
const rowToPole = (r) => ({
  id: r.id, verticalId: r.vertical_id, label: r.label || '', code: r.code || '', poleType: r.pole_type || '',
  note: r.note || '', image: r.image || '', sortOrder: r.sort_order ?? 0,
})
const poleToRow = (x) => ({
  id: x.id, vertical_id: x.verticalId, label: x.label || null, code: x.code || null, pole_type: x.poleType || null,
  note: x.note || null, image: x.image || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function usePoles() {
  const { data, loading, error } = useCollection('plantation_poles', [], { orderBy: 'sort_order', ascending: true, map: rowToPole })
  return { poles: data, loading, error }
}
export const addPole = (x) => insertRow('plantation_poles', poleToRow(x))
export const editPole = (x) => updateRow('plantation_poles', x.id, poleToRow(x))
export const removePole = (id) => deleteRow('plantation_poles', id)

// ---- Plants -----------------------------------------------------------------
const rowToPlant = (r) => ({
  id: r.id, poleId: r.pole_id, tag: r.tag || '', code: r.code || '', variety: r.variety || '', plantedDate: r.planted_date || '',
  status: r.status || 'healthy', isMother: !!r.is_mother, note: r.note || '', image: r.image || '', sortOrder: r.sort_order ?? 0,
})
const plantToRow = (x) => ({
  id: x.id, pole_id: x.poleId, tag: x.tag || null, code: x.code || null, variety: x.variety || null, planted_date: x.plantedDate || null,
  status: x.status || 'healthy', is_mother: !!x.isMother, note: x.note || null, image: x.image || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function usePlants() {
  const { data, loading, error } = useCollection('plantation_plants', [], { orderBy: 'sort_order', ascending: true, map: rowToPlant })
  return { plants: data, loading, error }
}
export const addPlant = (x) => insertRow('plantation_plants', plantToRow(x))
export const editPlant = (x) => updateRow('plantation_plants', x.id, plantToRow(x))
export const removePlant = (id) => deleteRow('plantation_plants', id)

// ---- Care (watering / fertilizer) -------------------------------------------
const rowToCare = (r) => ({
  id: r.id, poleId: r.pole_id, type: r.type || 'watering', product: r.product || '', quantity: r.quantity || '',
  scheduledDate: r.scheduled_date || '', done: !!r.done, doneDate: r.done_date || '', note: r.note || '',
})
const careToRow = (x) => ({
  id: x.id, pole_id: x.poleId, type: x.type || 'watering', product: x.product || null, quantity: x.quantity || null,
  scheduled_date: x.scheduledDate || null, done: !!x.done, done_date: x.doneDate || null, note: x.note || null, updated_at: iso(),
})
export function useCare() {
  const { data, loading, error } = useCollection('plantation_care', [], { orderBy: 'scheduled_date', ascending: false, map: rowToCare })
  return { care: data, loading, error }
}
export const addCare = (x) => insertRow('plantation_care', careToRow(x))
export const editCare = (x) => updateRow('plantation_care', x.id, careToRow(x))
export const removeCare = (id) => deleteRow('plantation_care', id)

// ---- Defects ----------------------------------------------------------------
const rowToDefect = (r) => ({
  id: r.id, landId: r.land_id || '', poleId: r.pole_id || '', plantId: r.plant_id || '', title: r.title || '', description: r.description || '',
  identifiedDate: r.identified_date || '', remedy: r.remedy || '', remedyDate: r.remedy_date || '',
  result: r.result || '', status: r.status || 'open', image: r.image || '',
})
const defectToRow = (x) => ({
  id: x.id, land_id: x.landId || null, pole_id: x.poleId || null, plant_id: x.plantId || null, title: x.title, description: x.description || null,
  identified_date: x.identifiedDate || null, remedy: x.remedy || null, remedy_date: x.remedyDate || null,
  result: x.result || null, status: x.status || 'open', image: x.image || null, updated_at: iso(),
})
export function useDefects() {
  const { data, loading, error } = useCollection('plantation_defects', [], { orderBy: 'identified_date', ascending: false, map: rowToDefect })
  return { defects: data, loading, error }
}
export const addDefect = (x) => insertRow('plantation_defects', defectToRow(x))
export const editDefect = (x) => updateRow('plantation_defects', x.id, defectToRow(x))
export const removeDefect = (id) => deleteRow('plantation_defects', id)

// ---- Hierarchy helper -------------------------------------------------------
/**
 * Descendant nodes below a given node, grouped by level (only levels strictly
 * below it are populated). Used to cascade an observation down to every child.
 *   descendantsByLevel('zone', zId, { zones, verticals, poles, plants })
 *     -> { zone: [], vertical: [...], pole: [...], plant: [...] }
 */
export function descendantsByLevel(type, id, { zones = [], verticals = [], poles = [], plants = [] }) {
  const out = { zone: [], vertical: [], pole: [], plant: [] }
  let zoneIds
  if (type === 'land') { out.zone = zones.filter((z) => z.landId === id); zoneIds = new Set(out.zone.map((z) => z.id)) }
  else if (type === 'zone') zoneIds = new Set([id])
  let vertIds
  if (type === 'vertical') vertIds = new Set([id])
  else if (zoneIds) { out.vertical = verticals.filter((v) => zoneIds.has(v.zoneId)); vertIds = new Set(out.vertical.map((v) => v.id)) }
  let poleIds
  if (type === 'pole') poleIds = new Set([id])
  else if (vertIds) { out.pole = poles.filter((p) => vertIds.has(p.verticalId)); poleIds = new Set(out.pole.map((p) => p.id)) }
  if (poleIds) out.plant = plants.filter((pl) => poleIds.has(pl.poleId))
  return out
}
