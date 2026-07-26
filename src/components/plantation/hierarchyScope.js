/**
 * hierarchyScope.js — pure helpers for the cascading Property → Zone → Row → Pole
 * → Plant scope filter used by HierarchyFilter and the Explorer. Kept separate
 * from the component so the component file only exports a component.
 */
const nodeName = (key, n) => (key === 'pole' ? (n.label || 'Pole') : key === 'plant' ? (n.tag || n.variety || 'Plant') : n.name)

export const LEVELS = [
  { key: 'land', label: 'Property', icon: 'ri-map-2-line' },
  { key: 'zone', label: 'Zone', icon: 'ri-grid-line' },
  { key: 'vertical', label: 'Row', icon: 'ri-menu-line' },
  { key: 'pole', label: 'Pole', icon: 'ri-signal-tower-line' },
  { key: 'plant', label: 'Plant', icon: 'ri-seedling-line' },
]
export const ORDER = LEVELS.map((l) => l.key)
export const emptyHierarchyFilter = () => ({ land: new Set(), zone: new Set(), vertical: new Set(), pole: new Set(), plant: new Set() })
export const hierarchyFilterActive = (v) => ORDER.some((k) => (v[k] || new Set()).size > 0)

export function computeVisible(value, { lands, zones, verticals, poles, plants }) {
  const S = (k) => value[k] || new Set()
  const effLand = S('land').size ? S('land') : new Set(lands.map((l) => l.id))
  const zonesUnder = zones.filter((z) => effLand.has(z.landId))
  const zoneIds = new Set(zonesUnder.map((z) => z.id))
  const effZone = S('zone').size ? new Set([...S('zone')].filter((id) => zoneIds.has(id))) : zoneIds
  const vertsUnder = verticals.filter((v) => effZone.has(v.zoneId))
  const vertIds = new Set(vertsUnder.map((v) => v.id))
  const effVert = S('vertical').size ? new Set([...S('vertical')].filter((id) => vertIds.has(id))) : vertIds
  const polesUnder = poles.filter((p) => effVert.has(p.verticalId))
  const poleIds = new Set(polesUnder.map((p) => p.id))
  const effPole = S('pole').size ? new Set([...S('pole')].filter((id) => poleIds.has(id))) : poleIds
  const plantsUnder = plants.filter((pl) => effPole.has(pl.poleId))
  const plantIds = new Set(plantsUnder.map((pl) => pl.id))
  const effPlant = S('plant').size ? new Set([...S('plant')].filter((id) => plantIds.has(id))) : plantIds

  const options = {
    land: lands.map((l) => ({ value: l.id, label: nodeName('land', l) })),
    zone: zonesUnder.map((z) => ({ value: z.id, label: nodeName('zone', z) })),
    vertical: vertsUnder.map((v) => ({ value: v.id, label: nodeName('vertical', v) })),
    pole: polesUnder.map((p) => ({ value: p.id, label: nodeName('pole', p) })),
    plant: plantsUnder.map((pl) => ({ value: pl.id, label: nodeName('plant', pl) })),
  }

  // Prune bottom-up so a branch only shows if it can reach a chosen descendant.
  const deeper = {
    land: S('zone').size || S('vertical').size || S('pole').size || S('plant').size,
    zone: S('vertical').size || S('pole').size || S('plant').size,
    vertical: S('pole').size || S('plant').size,
    pole: S('plant').size,
  }
  const keepPlant = effPlant
  const keepPole = new Set(polesUnder.filter((p) => {
    if (!effPole.has(p.id)) return false
    const kids = plantsUnder.filter((pl) => pl.poleId === p.id)
    return kids.length === 0 ? !deeper.pole : kids.some((pl) => keepPlant.has(pl.id))
  }).map((p) => p.id))
  const keepVert = new Set(vertsUnder.filter((v) => {
    if (!effVert.has(v.id)) return false
    const kids = polesUnder.filter((p) => p.verticalId === v.id)
    return kids.length === 0 ? !deeper.vertical : kids.some((p) => keepPole.has(p.id))
  }).map((v) => v.id))
  const keepZone = new Set(zonesUnder.filter((z) => {
    if (!effZone.has(z.id)) return false
    const kids = vertsUnder.filter((v) => v.zoneId === z.id)
    return kids.length === 0 ? !deeper.zone : kids.some((v) => keepVert.has(v.id))
  }).map((z) => z.id))
  const keepLand = new Set(lands.filter((l) => {
    if (!effLand.has(l.id)) return false
    const kids = zonesUnder.filter((z) => z.landId === l.id)
    return kids.length === 0 ? !deeper.land : kids.some((z) => keepZone.has(z.id))
  }).map((l) => l.id))

  return { options, keep: { land: keepLand, zone: keepZone, vertical: keepVert, pole: keepPole, plant: keepPlant } }
}
