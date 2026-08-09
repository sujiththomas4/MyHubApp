import { useEffect, useMemo, useRef, useState } from 'react'
import { useActivityLog, catOf, LOG_CATEGORY } from '@/data/activityLogRepo'
import { timeAgo, fullDateTime } from '@/data/bookingCommentsRepo'

/**
 * RoadMap.jsx — a site-wide activity road (route /road-map). Every logged action
 * becomes a node on a snaking road that wraps to the next line automatically
 * (no horizontal scroll). Oldest → newest, so the road reads as a timeline.
 */
function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// This road map tracks plantation activity only.
const PLANT_CATS = new Set(['booking', 'plant', 'supervisor', 'schedule', 'activity', 'comment'])

function Node({ n }) {
  const c = catOf(n.category)
  return (
    <div className="rmap-cell">
      <div className="rmap-node">
        <span className={`rmap-dot bg-${c.tone}`} title={`${c.label} · ${fullDateTime(n.createdAt)}`}><i className={c.icon} /></span>
      </div>
      <div className="rmap-label">
        <div className="small fw-medium text-truncate" style={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.description}</div>
        <div className="text-muted" style={{ fontSize: 11 }} title={fullDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</div>
        {n.actorName && <div className="text-muted" style={{ fontSize: 10 }}>{n.actorName}</div>}
      </div>
    </div>
  )
}

export default function RoadMap() {
  const { logs: allLogs } = useActivityLog()
  const logs = useMemo(() => allLogs.filter((l) => PLANT_CATS.has(l.category)), [allLogs])
  const [cats, setCats] = useState(new Set())
  const wrapRef = useRef(null)
  const [perRow, setPerRow] = useState(4)

  // Responsive columns from container width (keeps cells a sensible size, no
  // horizontal scroll — the road just wraps onto more rows).
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setPerRow(Math.max(2, Math.min(6, Math.floor(el.clientWidth / 200))))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filtered = useMemo(() => {
    const list = cats.size ? logs.filter((l) => cats.has(l.category)) : logs
    return list.slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  }, [logs, cats])
  const rows = useMemo(() => chunk(filtered, perRow), [filtered, perRow])

  const toggleCat = (k) => setCats((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const countOf = (k) => logs.filter((l) => l.category === k).length

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Road Map</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Road Map</li>
          </ol>
        </nav>
      </div>

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-2">
          <span className="text-muted small me-1"><i className="ri-filter-3-line me-1" />Filter:</span>
          {Object.entries(LOG_CATEGORY).filter(([k]) => countOf(k) > 0).map(([k, c]) => (
            <button key={k} className={'btn btn-sm ' + (cats.has(k) ? `btn-${c.tone}` : `btn-soft-${c.tone}`)} onClick={() => toggleCat(k)}>
              <i className={c.icon + ' me-1'} />{c.label}<span className="badge bg-white text-dark ms-1">{countOf(k)}</span>
            </button>
          ))}
          {cats.size > 0 && <button className="btn btn-sm btn-link text-danger p-0 ms-1" onClick={() => setCats(new Set())}>Clear</button>}
          <span className="flex-grow-1" />
          <span className="text-muted small">{filtered.length} event{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="card mb-0">
        <div className="card-body" ref={wrapRef}>
          {filtered.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No activity logged yet. As you work across the app, events appear here on the road. 🛣️</p>
          ) : (
            <div className="rmap">
              {rows.map((row, r) => {
                const rev = r % 2 === 1
                const isLast = r === rows.length - 1
                // Turn drops down at the side where this row ends: right for L→R rows, left for R→L rows.
                const turnSide = rev ? 'left' : 'right'
                return (
                  <div className={'rmap-row' + (rev ? ' rev' : '')} key={r}>
                    {row.map((n) => <Node key={n.id} n={n} />)}
                    {/* pad short last row so cells keep a consistent width */}
                    {row.length < perRow && Array.from({ length: perRow - row.length }).map((_, i) => <div className="rmap-cell" key={'pad' + i} />)}
                    {!isLast && <span className={`rmap-turn ${turnSide}`} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
