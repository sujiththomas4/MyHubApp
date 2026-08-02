import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { fmtDate } from '@/data/AppData'
import { useChartColors } from '@/components/dashboard/useChartColors'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EntityModal from '@/components/plantation/EntityModal'
import BulkAddModal from '@/components/plantation/BulkAddModal'
import AddPlantModal from '@/components/plantation/AddPlantModal'
import NodeTimeline from '@/components/plantation/NodeTimeline'
import Modal from '@/components/ui/Modal'
import HierarchyFilter from '@/components/plantation/HierarchyFilter'
import { computeVisible, emptyHierarchyFilter } from '@/components/plantation/hierarchyScope'
import { ENTITY, POLE_TYPE_LABEL, PLANT_STATUS_BADGE, PLANT_STATUS_LABEL, PLANT_STAGE_BADGE, PLANT_STAGE_LABEL } from '@/data/plantationForms'
import {
  useLands, useZones, useVerticals, usePoles, usePlants,
  useZoneItems, useCare, editPlant, descendantsByLevel,
  removeZoneItem, removeCare,
  usePlotFeatures, editPlotFeature, PLOT_FEATURE_KINDS,
} from '@/data/plantationLandRepo'
import { useUpdates, removeUpdate, UPDATE_TYPE } from '@/data/plantationUpdatesRepo'
import { useLookups, valuesFor } from '@/data/lookupsRepo'

const FEATURE_ICON = Object.fromEntries(PLOT_FEATURE_KINDS.map((k) => [k.value, k.icon]))
const FEATURE_LABEL = Object.fromEntries(PLOT_FEATURE_KINDS.map((k) => [k.value, k.label]))
const PLANT_TONE = { healthy: 'success', defect: 'warning', dead: 'danger' }
const uniqv = (a) => [...new Set(a.filter(Boolean))]

// Popup to locate poles that already hold PLANNED plants matching crop/type/variety.
function PlantLocateModal({ open, plants, onApply, onClose }) {
  const [crop, setCrop] = useState('')
  const [ptype, setPtype] = useState('')
  const [variety, setVariety] = useState('')
  const [count, setCount] = useState('')
  useEffect(() => { if (open) { setCrop(''); setPtype(''); setVariety(''); setCount('') } }, [open])
  const planned = plants.filter((p) => p.stage === 'planned')
  const crops = uniqv(planned.map((p) => p.crop))
  const types = uniqv(planned.filter((p) => !crop || p.crop === crop).map((p) => p.plantType))
  const varieties = uniqv(planned.filter((p) => (!crop || p.crop === crop) && (!ptype || p.plantType === ptype)).map((p) => p.variety))
  return (
    <Modal open={open} title={<><i className="ri-search-eye-line me-2 text-primary" />Find poles to plant</>} onClose={onClose}>
      <p className="text-muted small">Pick what you are about to plant — poles that already have matching <strong>planned</strong> plants get a ★ on the map.</p>
      <div className="row g-2">
        <div className="col-6">
          <label className="form-label small mb-1">Crop</label>
          <select className="form-select form-select-sm" value={crop} onChange={(e) => { setCrop(e.target.value); setPtype(''); setVariety('') }}>
            <option value="">— select —</option>
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Type</label>
          <select className="form-select form-select-sm" value={ptype} onChange={(e) => { setPtype(e.target.value); setVariety('') }}>
            <option value="">— any —</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Variety</label>
          <select className="form-select form-select-sm" value={variety} onChange={(e) => setVariety(e.target.value)}>
            <option value="">— any —</option>
            {varieties.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Number of plants (optional)</label>
          <input type="number" min={1} className="form-control form-control-sm" placeholder="all matching" value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
      </div>
      {crops.length === 0 && <div className="text-muted small mt-2">No planned plants yet.</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onApply({ crop, ptype, variety, count: Math.floor(Number(count) || 0) })} disabled={!crop}><i className="ri-star-line me-1" />Show on map</button>
      </div>
    </Modal>
  )
}
const PALETTE = ['#0ab39c', '#f7b84b', '#f06548', '#6c757d', '#4b93ff', '#6c5ffc', '#e83e8c', '#ffab00']
const BOARD_COLS = [
  { key: 'planned', label: 'Planned', tone: 'secondary', match: (p) => p.stage === 'planned' },
  { key: 'healthy', label: 'Healthy', tone: 'success', match: (p) => p.stage !== 'planned' && (p.status || 'healthy') === 'healthy' },
  { key: 'defect', label: 'Defect', tone: 'warning', match: (p) => p.stage !== 'planned' && p.status === 'defect' },
  { key: 'dead', label: 'Dead', tone: 'danger', match: (p) => p.stage !== 'planned' && p.status === 'dead' },
]

function Donut({ title, labels, series, colors, chartColors }) {
  const has = series.some((v) => v > 0)
  const options = {
    chart: { fontFamily: 'Poppins, sans-serif' },
    labels, colors,
    legend: { position: 'bottom', labels: { colors: chartColors.text } },
    dataLabels: { enabled: false }, stroke: { width: 0 }, tooltip: { theme: 'light' },
    plotOptions: { pie: { donut: { size: '64%' } } },
  }
  return (
    <div className="col-md-4">
      <div className="card h-100 mb-0">
        <div className="card-header py-2"><h6 className="card-title mb-0">{title}</h6></div>
        <div className="card-body d-flex align-items-center justify-content-center">
          {has ? <ReactApexChart key={chartColors.primary + title} options={options} series={series} type="donut" height={230} width="100%" /> : <p className="text-muted py-4 mb-0">No data yet.</p>}
        </div>
      </div>
    </div>
  )
}
const MAX_PLANT_DOTS = 9

/**
 * PlantationExplorer.jsx — the whole hierarchy in one screen, viewable four ways
 * (route /business/plantations/explorer):
 *   Tree   — Land > Zone > Row > Pole > Plant, expandable
 *   Cards  — photo cards, every level stacked in its own section
 *   Table  — flat parent-annotated tables, every level stacked
 *   Board  — plants grouped by health status
 * Add (tree) / edit / delete everywhere, all via popups.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const PARENT_TYPE = { zone: 'land', vertical: 'zone', pole: 'vertical', plant: 'pole' }
const LEVELS = [
  { type: 'land', label: 'Lands' }, { type: 'zone', label: 'Zones' }, { type: 'vertical', label: 'Rows' },
  { type: 'pole', label: 'Poles' }, { type: 'plant', label: 'Plants' },
]
const VIEWS = [
  { id: 'tree', label: 'Tree', icon: 'ri-node-tree' },
  { id: 'plot', label: 'Plot', icon: 'ri-layout-masonry-line' },
  { id: 'board', label: 'Board', icon: 'ri-layout-column-line' },
]
const area = (n) => (n.area !== '' && n.area != null ? `${n.area} ${n.areaUnit}` : '—')
const nameOf = (n) => (n ? n.name || n.label : '')

// Detail screens that hold extras the tree doesn't (zone items, pole care).
const DETAIL = {
  zone: { href: (id) => `/business/plantations/zones/${id}/rows`, title: 'Rows & items' },
  pole: { href: (id) => `/business/plantations/poles/${id}/plants`, title: 'Plants & care' },
}
const TYPE_PLURAL = { land: 'properties', zone: 'zones', vertical: 'rows', pole: 'poles', plant: 'plants', zoneItem: 'items', care: 'care tasks', update: 'updates' }

// Extra columns per level for the flat table: [header, (node, ancestors) => cell].
const TABLE_COLS = {
  land: [['Location', (n) => n.location || '—'], ['Area', area], ['Ownership', (n) => (n.ownership === 'leased' ? 'Leased' : 'Owned')]],
  zone: [['Area', area], ['Land', (n, a) => nameOf(a.land) || '—']],
  vertical: [['Zone', (n, a) => nameOf(a.zone) || '—'], ['Land', (n, a) => nameOf(a.land) || '—']],
  pole: [['Type', (n) => (n.poleType ? POLE_TYPE_LABEL[n.poleType] || n.poleType : '—')], ['Row', (n, a) => nameOf(a.vertical) || '—'], ['Zone', (n, a) => nameOf(a.zone) || '—'], ['Land', (n, a) => nameOf(a.land) || '—']],
  plant: [
    ['Variety', (n) => n.variety || '—'],
    ['Stage', (n) => <span className={'badge ' + (PLANT_STAGE_BADGE[n.stage] || PLANT_STAGE_BADGE.planted)}>{PLANT_STAGE_LABEL[n.stage] || 'Planted'}</span>],
    ['Status', (n) => <span className={'badge ' + (PLANT_STATUS_BADGE[n.status] || PLANT_STATUS_BADGE.healthy)}>{n.status || 'healthy'}</span>],
    ['Pole', (n, a) => nameOf(a.pole) || '—'], ['Row', (n, a) => nameOf(a.vertical) || '—'],
    ['Zone', (n, a) => nameOf(a.zone) || '—'], ['Land', (n, a) => nameOf(a.land) || '—'],
    ['Planted', (n) => (n.plantedDate ? fmtDate(n.plantedDate) : '—')],
  ],
}

function TreeNode({ type, node, depth, byType, keep, expanded, toggle, onAdd, onBulk, onTimeline, onDelete, onEdit, updCount, parentRef = '' }) {
  const cfg = ENTITY[type]
  const childType = cfg.childType
  const children = childType
    ? byType[childType].filter((c) => c[ENTITY[childType].parentField] === node.id && keep[childType].has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder)
    : []
  const isOpen = expanded.has(node.id)
  const childLabel = childType ? ENTITY[childType].singular.toLowerCase() + (children.length === 1 ? '' : 's') : null
  const nodeRef = [parentRef, node.code].filter(Boolean).join('-')

  return (
    <>
      <div className="tree-row" style={{ paddingLeft: 12 + depth * 22 }}>
        {childType
          ? <button type="button" className="tree-chevron" onClick={() => toggle(node.id)}><i className={isOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} /></button>
          : <span className="tree-chevron" />}
        <img src={node.image || cfg.img} alt="" title={cfg.singular} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6 }} />
        <span className="fw-medium">{cfg.name(node)}</span>
        {nodeRef && <span className="ref-code ms-2">{nodeRef}</span>}
        {type === 'plant' && node.stage === 'planned' && <span className="badge ms-2 bg-secondary-subtle text-secondary">Planned</span>}
        {type === 'plant' && <span className={'badge ms-2 ' + (PLANT_STATUS_BADGE[node.status] || PLANT_STATUS_BADGE.healthy)}>{node.status || 'healthy'}</span>}
        <span className="text-muted small ms-2">
          {type === 'land' && (node.ownership === 'leased' ? '· Leased' : '· Owned')}
          {(type === 'land' || type === 'zone') && node.area !== '' && ` · ${node.area} ${node.areaUnit}`}
          {type === 'pole' && node.poleType && `· ${POLE_TYPE_LABEL[node.poleType] || node.poleType}`}
          {type === 'plant' && node.variety && `· ${node.variety}`}
          {childLabel && ` · ${children.length} ${childLabel}`}
        </span>
        <span className="flex-grow-1" />
        <div className="text-nowrap">
          {childType && <button className="btn btn-sm btn-soft-primary px-2 me-1" onClick={() => onAdd(childType, node.id)} title={`Add ${ENTITY[childType].singular}`}><i className="ri-add-line" /> {ENTITY[childType].singular}</button>}
          {childType && ENTITY[childType].bulk && childType !== 'plant' && <button className="btn btn-sm btn-soft-secondary px-2 me-1" onClick={() => onBulk(childType, node.id, nodeRef)} title={`Bulk add ${ENTITY[childType].singular}s`}><i className="ri-stack-line" /></button>}
          <button className="btn btn-sm btn-ghost-info px-2" onClick={() => onTimeline(type, node)} title="Timeline / updates">
            <i className="ri-time-line" />{updCount(type, node.id) > 0 && <span className="badge bg-info-subtle text-info ms-1">{updCount(type, node.id)}</span>}
          </button>
          {DETAIL[type] && <Link to={DETAIL[type].href(node.id)} className="btn btn-sm btn-ghost-secondary px-2" title={DETAIL[type].title}><i className="ri-external-link-line" /></Link>}
          <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => onEdit(type, node)} title="Edit"><i className="ri-pencil-line" /></button>
          <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => onDelete(type, node)} title="Delete"><i className="ri-delete-bin-line" /></button>
        </div>
      </div>
      {isOpen && children.map((c) => (
        <TreeNode key={c.id} type={childType} node={c} depth={depth + 1} byType={byType} keep={keep}
          expanded={expanded} toggle={toggle} onAdd={onAdd} onBulk={onBulk} onTimeline={onTimeline} onEdit={onEdit} onDelete={onDelete} updCount={updCount} parentRef={nodeRef} />
      ))}
      {isOpen && childType && children.length === 0 && (
        <div className="text-muted small" style={{ paddingLeft: 12 + (depth + 1) * 22 + 34 }}>No {ENTITY[childType].singular.toLowerCase()}s yet.</div>
      )}
    </>
  )
}

export default function PlantationExplorer() {
  const { lands } = useLands()
  const { zones } = useZones()
  const { verticals } = useVerticals()
  const { poles } = usePoles()
  const { plants } = usePlants()
  const { items } = useZoneItems()
  const { care } = useCare()
  const { updates } = useUpdates()
  const { features } = usePlotFeatures()
  const { lookups } = useLookups()
  const chartColors = useChartColors()

  // Turn any field backed by a master-data list (declared in the entity's
  // bulk.lookups) into a searchable dropdown for the single add/edit form too.
  const modalFields = (type) => {
    const cfg = ENTITY[type]
    const lists = cfg.bulk?.lookups
    if (!lists) return cfg.fields
    return cfg.fields.map((f) => (lists[f.key]
      ? { ...f, type: 'search', allowCustom: true, options: valuesFor(lookups, lists[f.key]), placeholder: `Search ${f.label.toLowerCase()}…` }
      : f))
  }
  const byType = { land: lands, zone: zones, vertical: verticals, pole: poles, plant: plants }

  // Count of top-level updates per node, for the timeline button badge.
  const updByEntity = {}
  updates.forEach((u) => { if (u.parentId) return; const k = u.entityType + ':' + u.entityId; updByEntity[k] = (updByEntity[k] || 0) + 1 })
  const updatesFor = (type, id) => updates.filter((u) => u.entityType === type && u.entityId === id).map((u) => ({ type: 'update', id: u.id }))
  const byId = {
    land: Object.fromEntries(lands.map((x) => [x.id, x])),
    zone: Object.fromEntries(zones.map((x) => [x.id, x])),
    vertical: Object.fromEntries(verticals.map((x) => [x.id, x])),
    pole: Object.fromEntries(poles.map((x) => [x.id, x])),
    plant: Object.fromEntries(plants.map((x) => [x.id, x])),
  }

  const [view, setView] = useState('tree')
  const [filter, setFilter] = useState(emptyHierarchyFilter)
  const { keep } = computeVisible(filter, { lands, zones, verticals, poles, plants })
  const [expanded, setExpanded] = useState(new Set())
  // On first load: expand the properties (one level) + the first zone; rest collapsed.
  const didInitExpand = useRef(false)
  useEffect(() => {
    if (didInitExpand.current || !lands.length || !zones.length) return
    didInitExpand.current = true
    const firstLand = [...lands].sort((a, b) => a.sortOrder - b.sortOrder)[0]
    const firstZone = zones.filter((z) => z.landId === firstLand.id).sort((a, b) => a.sortOrder - b.sortOrder)[0]
    const init = new Set(lands.map((l) => l.id))
    if (firstZone) init.add(firstZone.id)
    setExpanded(init)
  }, [lands, zones])
  const [modal, setModal] = useState(null)
  const [bulk, setBulk] = useState(null)
  const [plantAdd, setPlantAdd] = useState(null)  // { poleId, poleRef, multiple } — inventory-aware add plant
  const [timeline, setTimeline] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const toggle = (id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const expandAll = () => setExpanded(new Set([...lands, ...zones, ...verticals, ...poles].map((n) => n.id)))
  const collapseAll = () => setExpanded(new Set())

  const openAdd = (type, parentId) => {
    // Plants go through the inventory-aware modal (crop/type/variety from bookings).
    if (type === 'plant') { setPlantAdd({ poleId: parentId, poleRef: refOf('pole', byId.pole[parentId] || {}) }); return }
    setModal({ type, parentId, initial: ENTITY[type].blank() })
  }
  const openEdit = (type, node) => setModal({ type, parentId: ENTITY[type].parentField ? node[ENTITY[type].parentField] : null, initial: { ...node } })
  const close = () => setModal(null)

  const save = async (form) => {
    const cfg = ENTITY[modal.type]
    if (form.id) { await cfg.edit(form); return }
    const sibs = byType[modal.type].filter((x) => (cfg.parentField ? x[cfg.parentField] === modal.parentId : true))
    const parent = cfg.parentField ? { [cfg.parentField]: modal.parentId } : {}
    await cfg.add({ ...form, id: `${cfg.idPrefix}-${rid()}`, ...parent, sortOrder: sibs.length })
  }

  const openBulk = (type, parentId, parentRef) => {
    if (type === 'plant') { setPlantAdd({ poleId: parentId, poleRef: parentRef }); return }
    const cfg = ENTITY[type]
    const sibs = byType[type].filter((x) => x[cfg.parentField] === parentId)
    setBulk({ type, parentId, parentRef, start: sibs.length + 1 })
  }
  const bulkCreate = async (rows) => {
    const cfg = ENTITY[bulk.type]
    let order = byType[bulk.type].filter((x) => x[cfg.parentField] === bulk.parentId).length
    for (const r of rows) {
      // eslint-disable-next-line no-await-in-loop
      await cfg.add({ ...r, id: `${cfg.idPrefix}-${rid()}`, [cfg.parentField]: bulk.parentId, sortOrder: order++ })
    }
  }

  // ---- cascade delete -------------------------------------------------------
  const REMOVE = {
    land: ENTITY.land.remove, zone: ENTITY.zone.remove, vertical: ENTITY.vertical.remove,
    pole: ENTITY.pole.remove, plant: ENTITY.plant.remove,
    zoneItem: removeZoneItem, care: removeCare, update: removeUpdate,
  }
  // Collect a node plus every descendant and linked record (children first).
  const collect = (type, node) => {
    const out = []
    const delPlant = (p) => { out.push(...updatesFor('plant', p.id)); out.push({ type: 'plant', id: p.id }) }
    const delPole = (po) => {
      plants.filter((pl) => pl.poleId === po.id).forEach(delPlant)
      care.filter((c) => c.poleId === po.id).forEach((c) => out.push({ type: 'care', id: c.id }))
      out.push(...updatesFor('pole', po.id))
      out.push({ type: 'pole', id: po.id })
    }
    const delVertical = (v) => { poles.filter((po) => po.verticalId === v.id).forEach(delPole); out.push(...updatesFor('vertical', v.id)); out.push({ type: 'vertical', id: v.id }) }
    const delZone = (z) => {
      items.filter((i) => i.zoneId === z.id).forEach((i) => out.push({ type: 'zoneItem', id: i.id }))
      verticals.filter((v) => v.zoneId === z.id).forEach(delVertical)
      out.push(...updatesFor('zone', z.id))
      out.push({ type: 'zone', id: z.id })
    }
    const delLand = (l) => { zones.filter((z) => z.landId === l.id).forEach(delZone); out.push(...updatesFor('land', l.id)); out.push({ type: 'land', id: l.id }) }
    const runner = { land: delLand, zone: delZone, vertical: delVertical, pole: delPole, plant: delPlant }
    runner[type](node)
    // de-dupe
    const seen = new Set()
    return out.filter((d) => { const k = d.type + ':' + d.id; if (seen.has(k)) return false; seen.add(k); return true })
  }

  const askDelete = (type, node) => {
    const deletions = collect(type, node)
    const counts = {}
    deletions.forEach((d) => { if (d.id !== node.id) counts[d.type] = (counts[d.type] || 0) + 1 })
    const parts = Object.entries(counts).map(([t, n]) => `${n} ${TYPE_PLURAL[t]}`)
    setConfirm({
      title: `Delete ${ENTITY[type].singular.toLowerCase()}?`,
      message: parts.length ? `This will also delete ${parts.join(', ')}. This cannot be undone.` : 'This cannot be undone.',
      deletions,
    })
  }

  // Records whose parent no longer exists (left behind by earlier deletes).
  const orphanDeletions = () => {
    const out = []
    zones.filter((z) => !byId.land[z.landId]).forEach((z) => out.push(...collect('zone', z)))
    verticals.filter((v) => !byId.zone[v.zoneId]).forEach((v) => out.push(...collect('vertical', v)))
    poles.filter((p) => !byId.vertical[p.verticalId]).forEach((p) => out.push(...collect('pole', p)))
    plants.filter((p) => !byId.pole[p.poleId]).forEach((p) => out.push(...collect('plant', p)))
    items.filter((i) => !byId.zone[i.zoneId]).forEach((i) => out.push({ type: 'zoneItem', id: i.id }))
    care.filter((c) => !byId.pole[c.poleId]).forEach((c) => out.push({ type: 'care', id: c.id }))
    updates.filter((u) => byId[u.entityType] && !byId[u.entityType][u.entityId]).forEach((u) => out.push({ type: 'update', id: u.id }))
    const seen = new Set()
    return out.filter((d) => { const k = d.type + ':' + d.id; if (seen.has(k)) return false; seen.add(k); return true })
  }
  const orphans = orphanDeletions()
  const askCleanupOrphans = () => setConfirm({
    title: 'Clean up orphaned items?',
    message: `${orphans.length} record${orphans.length === 1 ? '' : 's'} left behind by deleted parents will be removed. This cannot be undone.`,
    deletions: orphans,
  })

  const doDelete = async () => {
    const list = confirm.deletions || []
    setConfirm(null)
    for (const d of list) {
      // eslint-disable-next-line no-await-in-loop
      await REMOVE[d.type](d.id)
    }
  }

  const ancestors = (type, node) => {
    const chain = {}
    let curType = type, cur = node
    while (PARENT_TYPE[curType]) {
      const pType = PARENT_TYPE[curType]
      const parent = byId[pType][cur[ENTITY[curType].parentField]]
      if (!parent) break
      chain[pType] = parent; cur = parent; curType = pType
    }
    return chain
  }
  const ancestorLine = (a) => [a.land, a.zone, a.vertical, a.pole].filter(Boolean).map(nameOf).join(' · ')
  const refOf = (type, node) => {
    const a = ancestors(type, node)
    return [a.land?.code, a.zone?.code, a.vertical?.code, a.pole?.code, node.code].filter(Boolean).join('-')
  }
  const rowsOf = (type) => byType[type].filter((n) => keep[type].has(n.id)).sort((a, b) => a.sortOrder - b.sortOrder)

  // "Replanted" on a pole may change its support type (same pole, updated in place).
  const poleTypeOptions = Object.entries(POLE_TYPE_LABEL).map(([value, label]) => ({ value, label }))
  const replantPoleType = (newType) => {
    if (timeline?.entityType === 'pole' && timeline.node) {
      ENTITY.pole.edit({ ...timeline.node, poleType: newType }).catch(console.error)
    }
  }

  // ---- Plot view helpers ----------------------------------------------------
  const childrenOf = (type, parentId) => {
    const ct = ENTITY[type].childType
    if (!ct) return []
    return byType[ct].filter((c) => c[ENTITY[ct].parentField] === parentId && keep[ct].has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder)
  }
  const plantsOnPole = (poleId) => plants.filter((p) => p.poleId === poleId && keep.plant.has(p.id))
  const poleTone = (ps) => {
    if (ps.length === 0) return 'secondary'
    if (ps.some((p) => p.status === 'dead')) return 'danger'
    if (ps.some((p) => p.status === 'defect')) return 'warning'
    if (ps.some((p) => (p.status || 'healthy') === 'healthy')) return 'success'
    return 'secondary' // all planned / N/A
  }
  // A pole is "dead" if its latest life update (dead/replanted/recovered) is dead.
  const poleIsDead = (poleId) => {
    const life = updates.filter((u) => u.entityType === 'pole' && u.entityId === poleId && !u.parentId && ['dead', 'replanted', 'recovered'].includes(u.type))
    if (!life.length) return false
    const latest = [...life].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')).pop()
    return latest.type === 'dead'
  }
  // Border colour: red if the pole itself is dead, else green when it has healthy plants.
  const poleBorderTone = (po, ps) => (poleIsDead(po.id) ? 'danger' : poleTone(ps))

  // ---- Plot arrange (drag / resize zones & structures) ----------------------
  const [arrange, setArrange] = useState(false)
  const [live, setLive] = useState(null)   // { id, x, y, w, h } while dragging
  const [tip, setTip] = useState(null)     // { poleId, top, left } for the plot pole tooltip
  const [polePanel, setPolePanel] = useState(null)  // pole object — plot-tab side panel
  const [searchOpen, setSearchOpen] = useState(false)
  const [plantSearch, setPlantSearch] = useState(null)  // { crop, ptype, variety, count } — locate planned poles (not stored)

  // "Find to plant" — match planned plants (skip dead plants / dead poles) and
  // allocate first-pole-first: full pole → green star, partial → yellow star.
  const searchMatches = plantSearch
    ? plants.filter((p) => p.stage === 'planned' && p.status !== 'dead'
      && p.crop === plantSearch.crop && (!plantSearch.ptype || p.plantType === plantSearch.ptype) && (!plantSearch.variety || p.variety === plantSearch.variety)
      && !poleIsDead(p.poleId))
    : []
  const starInfo = (() => {
    if (!plantSearch) return {}
    const byPole = {}
    searchMatches.forEach((p) => { byPole[p.poleId] = (byPole[p.poleId] || 0) + 1 })
    const ids = Object.keys(byPole).sort((a, b) => (refOf('pole', byId.pole[a] || {}) || a).localeCompare(refOf('pole', byId.pole[b] || {}) || b))
    const info = {}
    const need = plantSearch.count
    if (!need) { ids.forEach((id) => { info[id] = { tone: 'success', available: byPole[id], planting: byPole[id] } }); return info }
    let acc = 0
    for (const id of ids) {
      if (acc >= need) break
      const available = byPole[id]
      const planting = Math.min(available, need - acc)
      info[id] = { tone: planting >= available ? 'success' : 'warning', available, planting }
      acc += planting
    }
    return info
  })()
  const unplacedZones = zones.filter((z) => !(Number(z.layoutW) > 0 && Number(z.layoutH) > 0))

  // Auto-generate a starting layout for zones that aren't positioned yet, so the
  // Plot shows boxes to fine-tune. Non-destructive — placed zones are left alone.
  const draftLayout = async () => {
    for (const land of lands) {
      const zs = zones.filter((z) => z.landId === land.id)
      const todo = zs.filter((z) => !(Number(z.layoutW) > 0 && Number(z.layoutH) > 0)).sort((a, b) => a.sortOrder - b.sortOrder)
      if (!todo.length) continue
      const startY = zs.filter((z) => Number(z.layoutH) > 0).reduce((m, z) => Math.max(m, (Number(z.layoutY) || 0) + (Number(z.layoutH) || 0)), 0)
      const cols = todo.length <= 1 ? 1 : (todo.length <= 4 ? 2 : 3)
      const cellW = 100 / cols
      const cellH = 26
      const gap = 2
      for (let i = 0; i < todo.length; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        // eslint-disable-next-line no-await-in-loop
        await ENTITY.zone.edit({
          ...todo[i],
          layoutX: Math.round(col * cellW + gap / 2),
          layoutY: Math.round(startY + row * cellH + gap / 2),
          layoutW: Math.round(cellW - gap),
          layoutH: Math.round(cellH - gap),
        })
      }
    }
  }
  const startBoxDrag = (e, kind, item, mode, ctx) => {
    if (!arrange) return
    const plan = e.currentTarget.closest('.plot-plan')
    if (!plan) return
    e.preventDefault(); e.stopPropagation()
    const rect = plan.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    const su = { x: item.x, y: item.y, w: item.w, h: item.h }
    const onMove = (ev) => {
      const dux = (ev.clientX - sx) / rect.width * ctx.totalW
      const duy = (ev.clientY - sy) / rect.height * ctx.totalH
      if (mode === 'resize') setLive({ id: item.id, x: su.x, y: su.y, w: Math.max(2, Math.round(su.w + dux)), h: Math.max(2, Math.round(su.h + duy)) })
      else setLive({ id: item.id, x: Math.max(0, Math.round(su.x + dux)), y: Math.max(0, Math.round(su.y + duy)), w: su.w, h: su.h })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setLive((cur) => {
        if (cur && cur.id === item.id) {
          if (kind === 'zone') ENTITY.zone.edit({ ...item.raw, layoutX: cur.x, layoutY: cur.y, layoutW: cur.w, layoutH: cur.h }).catch(console.error)
          else editPlotFeature({ ...item.raw, x: cur.x, y: cur.y, w: cur.w, h: cur.h }).catch(console.error)
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const openTimeline = (type, node) => {
    const a = ancestors(type, node)
    const landId = type === 'land' ? node.id : (a.land ? a.land.id : (node.landId || ''))
    const ref = refOf(type, node)
    setTimeline({
      entityType: type, entityId: node.id, landId,
      entityLabel: `${ENTITY[type].singular} ${ENTITY[type].name(node) || ''}`.trim() + (ref ? ` · ${ref}` : ''),
      plantedDate: type === 'plant' ? node.plantedDate : '',
      descendants: descendantsByLevel(type, node.id, { zones, verticals, poles, plants }),
      node,
    })
  }

  const RowActions = ({ type, node }) => (
    <>
      {ENTITY[type].childType && <button className="btn btn-sm btn-soft-primary px-2 me-1" onClick={() => openAdd(ENTITY[type].childType, node.id)} title={`Add ${ENTITY[ENTITY[type].childType].singular}`}><i className="ri-add-line" /></button>}
      {ENTITY[type].childType && ENTITY[ENTITY[type].childType].bulk && ENTITY[type].childType !== 'plant' && <button className="btn btn-sm btn-soft-secondary px-2 me-1" onClick={() => openBulk(ENTITY[type].childType, node.id, refOf(type, node))} title={`Bulk add ${ENTITY[ENTITY[type].childType].singular}s`}><i className="ri-stack-line" /></button>}
      <button className="btn btn-sm btn-ghost-info px-2 position-relative" onClick={() => openTimeline(type, node)} title="Timeline / updates">
        <i className="ri-time-line" />
        {updByEntity[type + ':' + node.id] > 0 && <span className="badge bg-info-subtle text-info ms-1">{updByEntity[type + ':' + node.id]}</span>}
      </button>
      {DETAIL[type] && <Link to={DETAIL[type].href(node.id)} className="btn btn-sm btn-ghost-secondary px-2" title={DETAIL[type].title}><i className="ri-external-link-line" /></Link>}
      <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => openEdit(type, node)} title="Edit"><i className="ri-pencil-line" /></button>
      <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => askDelete(type, node)} title="Delete"><i className="ri-delete-bin-line" /></button>
    </>
  )

  // ---- per-level renderers (used by Cards / Table, one section each) ---------
  const renderCards = (type) => {
    const rows = rowsOf(type)
    const c = ENTITY[type]
    if (rows.length === 0) return <p className="text-muted text-center py-3 mb-0">No {c.singular.toLowerCase()}s yet.</p>
    return (
      <div className="row g-3">
        {rows.map((n) => {
          const a = ancestors(type, n)
          return (
            <div className="col-xxl-3 col-md-4 col-6" key={n.id}>
              <div className="border rounded h-100 d-flex flex-column overflow-hidden">
                <img src={n.image || c.img} alt="" style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                <div className="p-2 flex-grow-1">
                  <div className="fw-medium text-truncate">{c.name(n)}
                    {type === 'plant' && n.stage === 'planned' && <span className="badge ms-1 bg-secondary-subtle text-secondary">Planned</span>}
                    {type === 'plant' && <span className={'badge ms-1 ' + (PLANT_STATUS_BADGE[n.status] || PLANT_STATUS_BADGE.healthy)}>{n.status || 'healthy'}</span>}
                  </div>
                  {refOf(type, n) && <div className="ref-code d-inline-block mt-1">{refOf(type, n)}</div>}
                  {ancestorLine(a) && <div className="text-muted small text-truncate">{ancestorLine(a)}</div>}
                  {type === 'land' && <div className="text-muted small">{n.location || '—'} · {area(n)}</div>}
                  {type === 'zone' && <div className="text-muted small">{area(n)}</div>}
                  {type === 'pole' && n.poleType && <div className="text-muted small">{POLE_TYPE_LABEL[n.poleType] || n.poleType}</div>}
                </div>
                <div className="d-flex justify-content-end gap-1 px-2 pb-2"><RowActions type={type} node={n} /></div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTable = (type) => {
    const rows = rowsOf(type)
    const c = ENTITY[type]
    if (rows.length === 0) return <p className="text-muted text-center py-3 mb-0">No {c.singular.toLowerCase()}s yet.</p>
    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr><th>{c.singular}</th>{TABLE_COLS[type].map((col, i) => <th key={i}>{col[0]}</th>)}<th className="text-end">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((n) => {
              const a = ancestors(type, n)
              return (
                <tr key={n.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <img src={n.image || c.img} alt="" title={c.singular} style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 5 }} />
                      <div>
                        <span className="fw-medium">{c.name(n)}</span>
                        {refOf(type, n) && <div className="ref-code d-inline-block ms-2">{refOf(type, n)}</div>}
                      </div>
                    </div>
                  </td>
                  {TABLE_COLS[type].map((col, i) => <td key={i} className="text-muted">{col[1](n, a)}</td>)}
                  <td className="text-end text-nowrap"><RowActions type={type} node={n} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Explorer</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Explorer</li>
          </ol>
        </nav>
      </div>

      {/* Toolbar */}
      <div className="card">
        <div className="card-body d-flex align-items-center flex-wrap gap-2 py-2">
          <div className="btn-group btn-group-sm" role="group">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className={'btn ' + (view === v.id ? 'btn-primary' : 'btn-light')} onClick={() => setView(v.id)}>
                <i className={v.icon + ' me-1'} />{v.label}
              </button>
            ))}
          </div>
          <span className="flex-grow-1" />
          {view === 'tree' && <>
            <button className="btn btn-sm btn-light" onClick={expandAll}>Expand all</button>
            <button className="btn btn-sm btn-light" onClick={collapseAll}>Collapse</button>
          </>}
          <button className="btn btn-sm btn-primary" onClick={() => openAdd('land', null)}><i className="ri-add-line me-1" />Add property</button>
        </div>
        {lands.length > 0 && (
          <div className="card-body border-top py-2">
            <HierarchyFilter data={{ lands, zones, verticals, poles, plants }} value={filter} onChange={setFilter} />
          </div>
        )}
      </div>

      {orphans.length > 0 && (
        <div className="alert alert-warning d-flex align-items-center">
          <i className="ri-error-warning-line me-2 fs-5" />
          <span className="flex-grow-1"><strong>{orphans.length}</strong> orphaned record{orphans.length === 1 ? '' : 's'} left behind by a deleted parent are not shown anywhere.</span>
          <button className="btn btn-sm btn-warning" onClick={askCleanupOrphans}><i className="ri-delete-bin-line me-1" />Clean up</button>
        </div>
      )}

      {lands.length === 0 && orphans.length === 0 ? (
        <div className="card mb-0"><div className="card-body text-center text-muted py-5"><i className="ri-plant-line fs-1 d-block mb-2" /><p className="mb-0">No properties yet. Add your first plantation land.</p></div></div>
      ) : lands.length === 0 ? null : view === 'tree' ? (
        <div className="card mb-0"><div className="card-body p-0">
          {rowsOf('land').length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">No nodes match the filter. <button className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setFilter(emptyHierarchyFilter())}>Clear filter</button></p>
          ) : rowsOf('land').map((l) => (
            <TreeNode key={l.id} type="land" node={l} depth={0} byType={byType} keep={keep}
              expanded={expanded} toggle={toggle} onAdd={openAdd} onBulk={openBulk} onTimeline={openTimeline} onEdit={openEdit} onDelete={askDelete} updCount={(t, id) => updByEntity[t + ':' + id] || 0} />
          ))}
        </div></div>
      ) : view === 'board' ? (() => {
        const bp = plants.filter((p) => keep.plant.has(p.id))
        const cnt = (fn) => bp.filter(fn).length
        const plannedN = cnt((p) => p.stage === 'planned')
        const plantedN = cnt((p) => p.stage !== 'planned')
        const healthyN = cnt((p) => p.stage !== 'planned' && (p.status || 'healthy') === 'healthy')
        const defectN = cnt((p) => p.stage !== 'planned' && p.status === 'defect')
        const deadN = cnt((p) => p.stage !== 'planned' && p.status === 'dead')
        const varietyGroups = Object.entries(bp.reduce((m, p) => { const v = p.variety || 'Unspecified'; m[v] = (m[v] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1])
        const BTile = ({ label, value, tone, icon }) => (
          <div className="col-md-2 col-4"><div className="card stat-card h-100 mb-0"><div className="card-body py-3">
            <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">{label}</span><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
            <h4 className={'stat-value mt-2 mb-0 text-' + tone}>{value}</h4>
          </div></div></div>
        )
        return (
          <>
            <div className="row g-3 mb-3">
              <BTile label="Plants" value={bp.length} tone="primary" icon="ri-seedling-line" />
              <BTile label="Planted" value={plantedN} tone="success" icon="ri-plant-line" />
              <BTile label="Planned" value={plannedN} tone="secondary" icon="ri-calendar-todo-line" />
              <BTile label="Healthy" value={healthyN} tone="success" icon="ri-heart-pulse-line" />
              <BTile label="Defect" value={defectN} tone="warning" icon="ri-bug-line" />
              <BTile label="Dead" value={deadN} tone="danger" icon="ri-skull-2-line" />
            </div>

            <div className="row g-3 mb-3">
              <Donut title="Planned vs Planted" chartColors={chartColors} labels={['Planted', 'Planned']} series={[plantedN, plannedN]} colors={['#0ab39c', '#6c757d']} />
              <Donut title="By status (planted)" chartColors={chartColors} labels={['Healthy', 'Defect', 'Dead']} series={[healthyN, defectN, deadN]} colors={['#0ab39c', '#f7b84b', '#f06548']} />
              <Donut title="By variety" chartColors={chartColors} labels={varietyGroups.map((g) => g[0])} series={varietyGroups.map((g) => g[1])} colors={varietyGroups.map((_, i) => PALETTE[i % PALETTE.length])} />
            </div>

            <div className="card mb-0"><div className="card-body">
              <div className="row g-3">
                {BOARD_COLS.map((s) => {
                  const items = bp.filter(s.match)
                  return (
                    <div className="col-md-3" key={s.key}>
                      <div className="card mb-0 h-100">
                        <div className="card-header py-2"><h6 className={`mb-0 text-${s.tone}`}>{s.label} <span className="text-muted fw-normal">({items.length})</span></h6></div>
                        <div className="card-body p-2 d-flex flex-column gap-2" style={{ maxHeight: 460, overflowY: 'auto' }}>
                          {items.length === 0 ? <p className="text-muted small text-center mb-0 py-2">None</p> : items.map((p) => {
                            const a = ancestors('plant', p)
                            return (
                              <div className="border rounded p-2" key={p.id}>
                                <div className="d-flex align-items-center gap-2">
                                  <img src={p.image || ENTITY.plant.img} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 5 }} />
                                  <span className="fw-medium flex-grow-1 text-truncate">{p.tag || p.variety || 'Plant'}</span>
                                  <button className="btn btn-sm btn-ghost-info px-2" onClick={() => openTimeline('plant', p)} title="Timeline / updates"><i className="ri-time-line" />{updByEntity['plant:' + p.id] > 0 && <span className="badge bg-info-subtle text-info ms-1">{updByEntity['plant:' + p.id]}</span>}</button>
                                  <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => openEdit('plant', p)} title="Edit"><i className="ri-pencil-line" /></button>
                                  <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => askDelete('plant', p)} title="Delete"><i className="ri-delete-bin-line" /></button>
                                </div>
                                {p.variety && <div className="small">{p.variety}</div>}
                                <div className="text-muted small text-truncate">{ancestorLine(a)}{refOf('plant', p) ? ` · ${refOf('plant', p)}` : ''}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div></div>
          </>
        )
      })() : view === 'plot' ? (
        <>
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center flex-wrap gap-3 mb-3 small text-muted">
                <span className="fw-medium text-body">Legend:</span>
                <span><span className="plot-swatch bg-success" /> healthy</span>
                <span><span className="plot-swatch bg-warning" /> has defect</span>
                <span><span className="plot-swatch bg-danger" /> has dead</span>
                <span><span className="plot-swatch bg-secondary" /> empty pole</span>
                <span className="ms-auto d-flex align-items-center gap-2">
                  {arrange && <span className="text-primary">Drag to move · corner to resize</span>}
                  <button className={'btn btn-sm ' + (plantSearch ? 'btn-warning' : 'btn-soft-warning')} onClick={() => setSearchOpen(true)} title="Find poles that already have planned plants">
                    <i className="ri-search-eye-line me-1" />Find to plant
                  </button>
                  {plantSearch && <button className="btn btn-sm btn-ghost-danger" onClick={() => setPlantSearch(null)}><i className="ri-close-line me-1" />Clear ★</button>}
                  {unplacedZones.length > 0 && (
                    <button className="btn btn-sm btn-soft-primary" onClick={draftLayout} title="Auto-place zones that aren't positioned yet">
                      <i className="ri-magic-line me-1" />Draft layout ({unplacedZones.length})
                    </button>
                  )}
                  <button className={'btn btn-sm ' + (arrange ? 'btn-primary' : 'btn-light')} onClick={() => { setArrange((a) => !a); setLive(null) }}>
                    <i className="ri-drag-move-2-line me-1" />{arrange ? 'Done' : 'Arrange'}
                  </button>
                </span>
              </div>
              {plantSearch && (
                <div className="alert alert-warning py-2 small mb-3 d-flex align-items-center">
                  <i className="ri-star-fill text-warning me-2" />
                  <span className="flex-grow-1">{searchMatches.length} planned {plantSearch.crop}{plantSearch.variety ? ` · ${plantSearch.variety}` : ''} plant{searchMatches.length === 1 ? '' : 's'} across <strong>{Object.keys(starInfo).length}</strong> pole{Object.keys(starInfo).length === 1 ? '' : 's'} — <span className="text-success">★ full</span> / <span className="text-warning">★ partial</span>{plantSearch.count ? ` · planting ${plantSearch.count}` : ''}.</span>
                  <button className="btn btn-sm btn-ghost-danger" onClick={() => setPlantSearch(null)}>Clear</button>
                </div>
              )}
              {rowsOf('land').length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No nodes match the filter.</p>
              ) : rowsOf('land').map((land) => {
                const zones = childrenOf('land', land.id)
                const placed = zones
                  .filter((z) => Number(z.layoutW) > 0 && Number(z.layoutH) > 0)
                  .map((z) => ({ zone: z, x: Number(z.layoutX) || 0, y: Number(z.layoutY) || 0, w: Number(z.layoutW), h: Number(z.layoutH) }))
                const unplaced = zones.filter((z) => !(Number(z.layoutW) > 0 && Number(z.layoutH) > 0))
                const feats = features
                  .filter((f) => f.landId === land.id && Number(f.w) > 0 && Number(f.h) > 0)
                  .map((f) => ({ feature: f, x: Number(f.x) || 0, y: Number(f.y) || 0, w: Number(f.w), h: Number(f.h) }))
                const boxes = [...placed, ...feats]
                const minX = boxes.length ? Math.min(...boxes.map((b) => b.x)) : 0
                const minY = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0
                const maxX = boxes.length ? Math.max(...boxes.map((b) => b.x + b.w)) : 1
                const maxY = boxes.length ? Math.max(...boxes.map((b) => b.y + b.h)) : 1
                const totalW = (maxX - minX) || 1
                const totalH = (maxY - minY) || 1
                const box = (b) => ({ position: 'absolute', left: `${(b.x - minX) / totalW * 100}%`, top: `${(b.y - minY) / totalH * 100}%`, width: `${b.w / totalW * 100}%`, height: `${b.h / totalH * 100}%` })
                return (
                  <div key={land.id} className="mb-4">
                    <h6 className="mb-2"><img src={ENTITY.land.img} alt="" style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4 }} className="me-2" />{land.name}{land.code && <span className="ref-code ms-2">{land.code}</span>}</h6>
                    {boxes.length === 0 ? (
                      <p className="text-muted small ms-2">No positioned zones yet. Set each zone&apos;s Width &amp; Height (and X / Y) to draw the plot.</p>
                    ) : (
                      <div className="plot-plan" style={{ position: 'relative', width: '100%', paddingTop: `${totalH / totalW * 100}%` }}>
                        {feats.map(({ feature, x, y, w, h }) => {
                          const eff = (live && live.id === feature.id) ? live : { x, y, w, h }
                          const item = { id: feature.id, raw: feature, x, y, w, h }
                          return (
                            <div key={feature.id} className={'plot-feature' + (arrange ? ' plot-arrange' : '')} style={box(eff)} title={feature.label || FEATURE_LABEL[feature.kind]}
                              onPointerDown={arrange ? (e) => startBoxDrag(e, 'feature', item, 'move', { totalW, totalH }) : undefined}>
                            <i className={FEATURE_ICON[feature.kind] || FEATURE_ICON.other} /> <span className="text-truncate">{feature.label || FEATURE_LABEL[feature.kind]}</span>
                            {arrange && <span className="plot-resize" onPointerDown={(e) => startBoxDrag(e, 'feature', item, 'resize', { totalW, totalH })} />}
                            </div>
                          )
                        })}
                        {placed.map(({ zone, x, y, w, h }) => {
                          const verticals = childrenOf('zone', zone.id)
                          const poleCount = verticals.reduce((s, v) => s + childrenOf('vertical', v.id).length, 0)
                          const deadPoleCount = verticals.reduce((s, v) => s + childrenOf('vertical', v.id).filter((po) => poleIsDead(po.id)).length, 0)
                          const plantCount = verticals.reduce((s, v) => s + childrenOf('vertical', v.id).reduce((t, po) => t + plantsOnPole(po.id).length, 0), 0)
                          const zEff = (live && live.id === zone.id) ? live : { x, y, w, h }
                          const zItem = { id: zone.id, raw: zone, x, y, w, h }
                          return (
                            <div key={zone.id} className={'plot-zone' + (arrange ? ' plot-arrange' : '')} style={{ ...box(zEff), minWidth: 0, overflow: 'hidden', margin: 0 }}
                              onPointerDown={arrange ? (e) => startBoxDrag(e, 'zone', zItem, 'move', { totalW, totalH }) : undefined}>
                              <div className="plot-zone-inner" style={{ pointerEvents: arrange ? 'none' : 'auto', overflow: 'auto', height: '100%' }}>
                              <div className="plot-zone-head">
                                <span className="fw-medium text-truncate flex-grow-1">{zone.name}</span>
                                {zone.code && <span className="ref-code ms-1">{zone.code}</span>}
                              </div>
                              <div className="text-muted mb-2" style={{ fontSize: '.68rem' }}>{verticals.length} rows · {poleCount} poles · {plantCount} plants{deadPoleCount > 0 && <span className="text-danger fw-semibold"> · {deadPoleCount} dead poles</span>}</div>
                              {verticals.length === 0 && (
                                <div className="text-muted small fst-italic d-flex align-items-center gap-1">
                                  <i className="ri-add-circle-line" />No rows yet — add rows, poles &amp; plants (Tree view) to draw them here.
                                </div>
                              )}
                              {verticals.map((v) => {
                                const poles = childrenOf('vertical', v.id)
                                if (poles.length === 0) return null
                                return (
                                  <div key={v.id} className="plot-row2">
                                    <span className="plot-rowlabel" title={v.name}>{v.code || v.name}</span>
                                    <div className="plot-row-track">
                                      {poles.map((po) => {
                                        const ps = plantsOnPole(po.id)
                                        return (
                                          <button
                                            type="button"
                                            key={po.id}
                                            className="plot-pole-col"
                                            onClick={() => { setTip(null); setPolePanel(po) }}
                                            onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ poleId: po.id, top: r.bottom + 6, left: r.left }) }}
                                            onMouseLeave={() => setTip(null)}
                                          >
                                            <span className="plot-pole-star">{starInfo[po.id] ? <span className={`text-${starInfo[po.id].tone}`}><i className="ri-star-fill" />{starInfo[po.id].tone === 'warning' && <span className="plot-star-note">{starInfo[po.id].planting}/{starInfo[po.id].available}</span>}</span> : null}</span>
                                            <span className={`plot-pole-box border-${poleBorderTone(po, ps)}`}>
                                              {ps.length === 0 ? (
                                                <span className="plot-pole-empty">·</span>
                                              ) : <>
                                                {ps.slice(0, MAX_PLANT_DOTS).map((pl) => <span key={pl.id} className={`plot-plant2 bg-${PLANT_TONE[pl.status] || 'secondary'}`} />)}
                                                {ps.length > MAX_PLANT_DOTS && <span className="plot-plant-more2">+{ps.length - MAX_PLANT_DOTS}</span>}
                                              </>}
                                            </span>
                                            <span className="plot-pole-cap">{po.code || po.label || ''}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                              </div>
                              {arrange && <span className="plot-resize" onPointerDown={(e) => startBoxDrag(e, 'zone', zItem, 'resize', { totalW, totalH })} />}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {unplaced.length > 0 && <div className="text-muted small mt-2"><i className="ri-information-line me-1" />Not positioned: {unplaced.map((z) => z.name).join(', ')} — set Width &amp; Height in the zone to place it.</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {tip && (() => {
            const po = poles.find((p) => p.id === tip.poleId)
            if (!po) return null
            const ps = plantsOnPole(po.id)
            const cnt = (st) => ps.filter((p) => p.status === st).length
            const na = ps.filter((p) => !['healthy', 'defect', 'dead'].includes(p.status)).length
            const planned = ps.filter((p) => p.stage === 'planned').length
            const varieties = Object.entries(ps.reduce((m, p) => { const v = p.variety || 'Unspecified'; m[v] = (m[v] || 0) + 1; return m }, {}))
            const defectN = updates.filter((u) => u.type === 'defect' && !u.parentId && u.status !== 'resolved'
              && ((u.entityType === 'pole' && u.entityId === po.id) || (u.entityType === 'plant' && ps.some((p) => p.id === u.entityId)))).length
            const ref = refOf('pole', po)
            return (
              <div className="plot-tip" style={{ top: tip.top, left: tip.left }}>
                <div className="plot-tip-head"><i className="ri-signal-tower-line me-1" />{po.label || 'Pole'}{ref && <span className="ref-code ms-2">{ref}</span>}</div>
                <div className="text-muted mb-2" style={{ fontSize: '.7rem' }}>{POLE_TYPE_LABEL[po.poleType] || 'Pole'}</div>
                <div className="plot-tip-row"><i className="ri-seedling-line text-success" /> <strong>{ps.length}</strong> plants{planned ? <span className="text-muted"> · {planned} planned</span> : ''}</div>
                <div className="plot-tip-row d-flex flex-wrap gap-2">
                  <span><span className="tipdot bg-success" />{cnt('healthy')} healthy</span>
                  <span><span className="tipdot bg-warning" />{cnt('defect')} defect</span>
                  <span><span className="tipdot bg-danger" />{cnt('dead')} dead</span>
                  {na > 0 && <span><span className="tipdot bg-secondary" />{na} n/a</span>}
                </div>
                <div className="plot-tip-row"><i className="ri-bug-line text-danger" /> <strong>{defectN}</strong> open defects</div>
                {varieties.length > 0 && (
                  <div className="plot-tip-row"><i className="ri-flask-line text-primary" /> {varieties.map(([v, n]) => `${v} (${n})`).join(', ')}</div>
                )}
                {starInfo[po.id] && (
                  <div className={'plot-tip-row text-' + starInfo[po.id].tone}><i className="ri-star-fill" /> Planting <strong>{starInfo[po.id].planting}</strong> of {starInfo[po.id].available} planned here</div>
                )}
              </div>
            )
          })()}
        </>
      ) : (
        // Cards / Table — one section per level, stacked
        LEVELS.map((l, idx) => (
          <div className={'card' + (idx === LEVELS.length - 1 ? ' mb-0' : '')} key={l.type}>
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1 d-flex align-items-center">
                <img src={ENTITY[l.type].img} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 5 }} className="me-2" />{l.label}
                <span className="text-muted fs-13 fw-normal ms-2">({byType[l.type].length})</span>
              </h5>
              {l.type === 'land' && <button className="btn btn-sm btn-soft-primary" onClick={() => openAdd('land', null)}><i className="ri-add-line me-1" />Add property</button>}
            </div>
            <div className="card-body">
              {view === 'cards' ? renderCards(l.type) : renderTable(l.type)}
            </div>
          </div>
        ))
      )}

      {/* Plot-tab pole popup: plants + their observations, without leaving the plot. */}
      <Modal
        open={Boolean(polePanel)}
        size="lg"
        title={polePanel ? <><i className="ri-signal-tower-line me-2 text-primary" />Pole {polePanel.label || ''}{refOf('pole', polePanel) ? <span className="ref-code ms-2">{refOf('pole', polePanel)}</span> : null}</> : ''}
        onClose={() => setPolePanel(null)}
      >
        {polePanel && (() => {
          const po = polePanel
          const ps = plants.filter((p) => p.poleId === po.id && keep.plant.has(p.id)).sort((a, b) => a.sortOrder - b.sortOrder)
          const ref = refOf('pole', po)
          const obsOf = (type, id) => updates.filter((u) => u.entityType === type && u.entityId === id && !u.parentId).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          const ObsList = ({ items }) => (
            items.length === 0 ? <div className="text-muted small fst-italic">No observations yet.</div> : (
              <div className="d-flex flex-column gap-1">
                {items.slice(0, 5).map((u) => {
                  const t = UPDATE_TYPE[u.type] || UPDATE_TYPE.regular
                  return (
                    <div key={u.id} className="small d-flex align-items-start gap-1">
                      <span className={`badge bg-${t.tone}-subtle text-${t.tone}`}><i className={t.icon + ' me-1'} />{t.label}</span>
                      <span className="text-muted">{u.date ? fmtDate(u.date) : ''}</span>
                      <span className="flex-grow-1">{u.title || u.detail}</span>
                    </div>
                  )
                })}
                {items.length > 5 && <div className="text-muted small">+{items.length - 5} more…</div>}
              </div>
            )
          )
          return (
            <>
              <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                <span className="text-muted small flex-grow-1">{POLE_TYPE_LABEL[po.poleType] || 'Pole'} · {ps.length} plant{ps.length === 1 ? '' : 's'}</span>
                <button className="btn btn-sm btn-primary" onClick={() => openAdd('plant', po.id)}><i className="ri-add-line me-1" />Add plants</button>
                <button className="btn btn-sm btn-soft-info" onClick={() => openTimeline('pole', po)}><i className="ri-time-line me-1" />Pole observations{updByEntity['pole:' + po.id] ? ` (${updByEntity['pole:' + po.id]})` : ''}</button>
              </div>
              <div className="mb-3 ps-1 border-start"><div className="ps-2"><ObsList items={obsOf('pole', po.id)} /></div></div>

              {ps.length === 0 ? (
                <p className="text-muted text-center py-3 mb-0">No plants on this pole yet. Add one above.</p>
              ) : ps.map((p) => (
                <div className="border rounded p-2 mb-2" key={p.id}>
                  <div className="d-flex align-items-center gap-2">
                    <img src={p.image || ENTITY.plant.img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-medium text-truncate">{p.tag || p.variety || 'Plant'}{p.code && <span className="ref-code ms-2">{[ref, p.code].filter(Boolean).join('-')}</span>}</div>
                      <div className="small">
                        <span className={'badge me-1 ' + (PLANT_STAGE_BADGE[p.stage] || PLANT_STAGE_BADGE.planted)}>{PLANT_STAGE_LABEL[p.stage] || 'Planted'}</span>
                        <span className={'badge me-1 ' + (PLANT_STATUS_BADGE[p.status] || PLANT_STATUS_BADGE.healthy)}>{PLANT_STATUS_LABEL[p.status] || p.status}</span>
                        {p.variety && <span className="text-muted">{p.variety}</span>}
                        {p.plantedDate && <span className="text-muted"> · planted {fmtDate(p.plantedDate)}</span>}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-soft-info px-2" title="Add / view observations" onClick={() => openTimeline('plant', p)}><i className="ri-time-line me-1" />Observations{updByEntity['plant:' + p.id] ? ` (${updByEntity['plant:' + p.id]})` : ''}</button>
                    <button className="btn btn-sm btn-ghost-secondary px-2" title="Edit plant" onClick={() => openEdit('plant', p)}><i className="ri-pencil-line" /></button>
                    <button className="btn btn-sm btn-ghost-danger px-2" title="Delete plant" onClick={() => askDelete('plant', p)}><i className="ri-delete-bin-line" /></button>
                  </div>
                  {p.note && <div className="text-muted small mt-1">{p.note}</div>}
                  <div className="mt-2 ps-1 border-start"><div className="ps-2"><ObsList items={obsOf('plant', p.id)} /></div></div>
                </div>
              ))}
            </>
          )
        })()}
      </Modal>

      <EntityModal
        open={Boolean(modal)}
        title={modal ? (modal.initial.id ? 'Edit ' : 'New ') + ENTITY[modal.type].singular : ''}
        fields={modal ? modalFields(modal.type) : []}
        initial={modal ? modal.initial : {}}
        onSave={save} onClose={close}
      />
      <PlantLocateModal
        open={searchOpen}
        plants={plants}
        onApply={(s) => { setPlantSearch(s); setSearchOpen(false) }}
        onClose={() => setSearchOpen(false)}
      />
      <AddPlantModal
        open={Boolean(plantAdd)}
        poleId={plantAdd?.poleId}
        poleRef={plantAdd?.poleRef}
        onClose={() => setPlantAdd(null)}
      />
      <BulkAddModal
        open={Boolean(bulk)}
        type={bulk ? bulk.type : null}
        parentRef={bulk ? bulk.parentRef : ''}
        defaultStart={bulk ? bulk.start : 1}
        onCreate={bulkCreate}
        onClose={() => setBulk(null)}
      />
      <NodeTimeline
        open={Boolean(timeline)}
        entityType={timeline?.entityType}
        entityId={timeline?.entityId}
        entityLabel={timeline?.entityLabel}
        landId={timeline?.landId}
        plantedDate={timeline?.plantedDate}
        descendants={timeline?.descendants}
        poleTypeOptions={timeline?.entityType === 'pole' ? poleTypeOptions : undefined}
        onReplantType={replantPoleType}
        onSyncStatus={timeline?.entityType === 'plant' ? ((status) => editPlant({ ...timeline.node, status }).catch(console.error)) : undefined}
        onClose={() => setTimeline(null)}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? confirm.title : 'Delete?'}
        message={confirm ? confirm.message : ''}
        confirmLabel="Delete" onConfirm={doDelete} onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
