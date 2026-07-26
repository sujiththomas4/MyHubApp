import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EntityModal from '@/components/plantation/EntityModal'
import BulkAddModal from '@/components/plantation/BulkAddModal'
import NodeTimeline from '@/components/plantation/NodeTimeline'
import HierarchyFilter from '@/components/plantation/HierarchyFilter'
import { computeVisible, emptyHierarchyFilter } from '@/components/plantation/hierarchyScope'
import { ENTITY, POLE_TYPE_LABEL, PLANT_STATUS_BADGE } from '@/data/plantationForms'
import {
  useLands, useZones, useVerticals, usePoles, usePlants,
  useZoneItems, useCare, editPlant, descendantsByLevel,
  removeZoneItem, removeCare,
} from '@/data/plantationLandRepo'
import { useUpdates, removeUpdate } from '@/data/plantationUpdatesRepo'

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
  { id: 'cards', label: 'Cards', icon: 'ri-layout-grid-line' },
  { id: 'table', label: 'Table', icon: 'ri-table-line' },
  { id: 'board', label: 'Board', icon: 'ri-layout-column-line' },
]
const STATUSES = [
  { key: 'healthy', label: 'Healthy', tone: 'success' },
  { key: 'defect', label: 'Defect', tone: 'warning' },
  { key: 'dead', label: 'Dead', tone: 'danger' },
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
          {childType && ENTITY[childType].bulk && <button className="btn btn-sm btn-soft-secondary px-2 me-1" onClick={() => onBulk(childType, node.id, nodeRef)} title={`Bulk add ${ENTITY[childType].singular}s`}><i className="ri-stack-line" /></button>}
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
  const [modal, setModal] = useState(null)
  const [bulk, setBulk] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const toggle = (id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const expandAll = () => setExpanded(new Set([...lands, ...zones, ...verticals, ...poles].map((n) => n.id)))
  const collapseAll = () => setExpanded(new Set())

  const openAdd = (type, parentId) => setModal({ type, parentId, initial: ENTITY[type].blank() })
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
      {ENTITY[type].childType && ENTITY[ENTITY[type].childType].bulk && <button className="btn btn-sm btn-soft-secondary px-2 me-1" onClick={() => openBulk(ENTITY[type].childType, node.id, refOf(type, node))} title={`Bulk add ${ENTITY[ENTITY[type].childType].singular}s`}><i className="ri-stack-line" /></button>}
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
      ) : view === 'board' ? (
        <div className="card mb-0"><div className="card-body">
          <div className="row g-3">
            {STATUSES.map((s) => {
              const items = plants.filter((p) => (p.status || 'healthy') === s.key && keep.plant.has(p.id))
              return (
                <div className="col-md-4" key={s.key}>
                  <div className="card mb-0 h-100">
                    <div className="card-header"><h6 className={`mb-0 text-${s.tone}`}>{s.label} <span className="text-muted fw-normal">({items.length})</span></h6></div>
                    <div className="card-body p-2 d-flex flex-column gap-2">
                      {items.length === 0 ? <p className="text-muted small text-center mb-0 py-2">None</p> : items.map((p) => {
                        const a = ancestors('plant', p)
                        return (
                          <div className="border rounded p-2" key={p.id}>
                            <div className="d-flex align-items-center gap-2">
                              <img src={p.image || ENTITY.plant.img} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 5 }} />
                              <span className="fw-medium flex-grow-1">{p.tag || p.variety || 'Plant'}</span>
                              <button className="btn btn-sm btn-ghost-info px-2" onClick={() => openTimeline('plant', p)} title="Timeline / updates"><i className="ri-time-line" />{updByEntity['plant:' + p.id] > 0 && <span className="badge bg-info-subtle text-info ms-1">{updByEntity['plant:' + p.id]}</span>}</button>
                              <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => openEdit('plant', p)} title="Edit"><i className="ri-pencil-line" /></button>
                              <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => askDelete('plant', p)} title="Delete"><i className="ri-delete-bin-line" /></button>
                            </div>
                            {p.variety && <div className="small">{p.variety}</div>}
                            <div className="text-muted small text-truncate">{ancestorLine(a)}</div>
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

      <EntityModal
        open={Boolean(modal)}
        title={modal ? (modal.initial.id ? 'Edit ' : 'New ') + ENTITY[modal.type].singular : ''}
        fields={modal ? ENTITY[modal.type].fields : []}
        initial={modal ? modal.initial : {}}
        onSave={save} onClose={close}
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
