import { useEffect, useMemo, useState } from 'react'
import { usePatterns, addPattern as apiAddPattern, removePattern as apiRemovePattern } from '@/data/chartPatternsRepo'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ImageDropZone from '@/components/ui/ImageDropZone'
import MultiSelect from '@/components/ui/MultiSelect'

/**
 * ChartPatterns.jsx  (DRAFT)
 * -----------------------------------------------------------------------------
 * A reference library of intraday chart patterns for the 3-min and 5-min
 * timeframes. Each pattern holds a chart SCREENSHOT plus the price / indicator
 * conditions that define it (VWAP position, volume, 9/20 EMA, Camarilla/CPR).
 *
 * Browse as a filterable gallery; click a card to view it large; add new ones
 * by pasting a screenshot and tagging the conditions.
 *
 * Local mock state for now; wire to real storage later.
 */

const TIMEFRAMES = [
  { id: '3m', label: '3 min' },
  { id: '5m', label: '5 min' },
]
const tfLabel = (id) => TIMEFRAMES.find((t) => t.id === id)?.label || id

// Price / indicator conditions, grouped. Selecting is free multi-toggle so a
// pattern can combine any of these.
const INDICATORS = [
  { id: 'vwap', label: 'VWAP', options: ['Price above VWAP', 'Price below VWAP', 'Price at VWAP'] },
  { id: 'volume', label: 'Volume', options: ['High volume breakout', 'Big candle, low volume', 'Volume climax'] },
  { id: 'ema9', label: '9 EMA', options: ['9 EMA support', '9 EMA resistance'] },
  { id: 'ema20', label: '20 EMA', options: ['20 EMA support', '20 EMA resistance'] },
  {
    id: 'camarilla', label: 'Camarilla / CPR',
    options: [
      'Camarilla pivot support',
      'Camarilla pivot resistance',
      'Camarilla within CPR support',
      'Camarilla within CPR resistance',
    ],
  },
  {
    id: 'prevday', label: 'Previous day levels',
    options: [
      'Previous day high support',
      'Previous day high resistance',
      'Previous day low support',
      'Previous day low resistance',
    ],
  },
  { id: 'gap', label: 'Gap', options: ['Gap filled and reverses'] },
]

const rid = () => Math.random().toString(36).slice(2, 8)

// --- Mock seed ---------------------------------------------------------------
// --- Add / edit form ---------------------------------------------------------
function PatternForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [timeframe, setTimeframe] = useState(initial?.timeframe || '3m')
  const [image, setImage] = useState(initial?.image || null)
  const [conditions, setConditions] = useState(initial?.conditions || [])
  const [notes, setNotes] = useState(initial?.notes || '')

  const toggle = (opt) =>
    setConditions((c) => (c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt]))

  const save = () =>
    onSave({ id: initial?.id || 'p' + rid(), title: title.trim() || 'Untitled pattern', timeframe, image, conditions, notes: notes.trim() })

  return (
    <>
      <div className="row g-2 mb-3">
        <div className="col-md-8">
          <label className="form-label small mb-1">Pattern name</label>
          <input className="form-control form-control-sm" placeholder="e.g. VWAP reclaim breakout"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Timeframe</label>
          <select className="form-select form-select-sm" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {TIMEFRAMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <label className="form-label small mb-1">Chart screenshot</label>
      <ImageDropZone value={image} onChange={setImage} />

      <label className="form-label small mb-1 mt-3">Price &amp; indicator positions</label>
      <div className="border rounded p-2 mb-3">
        {INDICATORS.map((g) => (
          <div className="pattern-cond-group" key={g.id}>
            <div className="small text-muted mb-1">{g.label}</div>
            <div className="d-flex flex-wrap gap-2">
              {g.options.map((opt) => {
                const on = conditions.includes(opt)
                return (
                  <button key={opt} type="button"
                    className={'btn btn-sm ' + (on ? 'btn-primary' : 'btn-light')}
                    onClick={() => toggle(opt)}>
                    {on && <i className="ri-check-line me-1" />}{opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <label className="form-label small mb-1">Notes (exact levels, entry / SL, context)</label>
      <textarea className="form-control form-control-sm mb-3" rows={3}
        placeholder="e.g. Enter on retest hold above VWAP, SL below 9 EMA…"
        value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="d-flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={save}>
          <i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add pattern'}
        </button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

// --- Condition chips (read-only) --------------------------------------------
const ConditionChips = ({ conditions }) => (
  <div className="d-flex flex-wrap gap-1">
    {conditions.map((c) => (
      <span key={c} className="badge bg-primary-subtle text-primary">{c}</span>
    ))}
  </div>
)

// --- Gallery card ------------------------------------------------------------
function PatternCard({ pattern, onOpen, onDelete }) {
  return (
    <div className="card h-100 pattern-card">
      <div className="pattern-thumb" role="button" onClick={onOpen}>
        {pattern.image ? (
          <img src={pattern.image} alt={pattern.title} />
        ) : (
          <div className="pattern-thumb-empty"><i className="ri-line-chart-line" /></div>
        )}
        <span className="badge bg-dark pattern-tf">{tfLabel(pattern.timeframe)}</span>
      </div>
      <div className="card-body">
        <div className="d-flex align-items-start">
          <h6 className="mb-2 flex-grow-1" role="button" onClick={onOpen}>{pattern.title}</h6>
          <button className="btn btn-sm btn-ghost-danger p-0 ms-2" title="Delete" onClick={onDelete}>
            <i className="ri-delete-bin-line" />
          </button>
        </div>
        <ConditionChips conditions={pattern.conditions} />
        {pattern.notes && <p className="text-muted small mt-2 mb-0 pattern-notes">{pattern.notes}</p>}
      </div>
    </div>
  )
}

// --- Page --------------------------------------------------------------------
export default function ChartPatterns() {
  const livePatterns = usePatterns()
  const [patterns, setPatterns] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | '3m' | '5m'
  const [search, setSearch] = useState('')
  const [condFilter, setCondFilter] = useState([]) // conditions that must all be present
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState(null) // pattern being viewed
  const [deleteTarget, setDeleteTarget] = useState(null) // pattern pending delete confirm

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patterns.filter((p) => {
      if (filter !== 'all' && p.timeframe !== filter) return false
      if (!condFilter.every((c) => p.conditions.includes(c))) return false
      if (q) {
        const haystack = [p.title, p.notes, ...p.conditions].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [patterns, filter, search, condFilter])

  useEffect(() => { setPatterns(livePatterns) }, [livePatterns])

  const filtersActive = search.trim() || condFilter.length > 0 || filter !== 'all'
  const clearFilters = () => { setSearch(''); setCondFilter([]); setFilter('all') }

  const addPattern = (p) => { setPatterns((ps) => [p, ...ps]); setAdding(false); apiAddPattern(p).catch(console.error) }
  const confirmDelete = () => {
    const id = deleteTarget?.id
    setPatterns((ps) => ps.filter((p) => p.id !== id))
    apiRemovePattern(id).catch(console.error)
    setDeleteTarget(null)
  }

  return (
    <div className="chart-patterns">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Chart Patterns</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Updates</li>
            <li className="breadcrumb-item active" aria-current="page">Chart Patterns</li>
          </ol>
        </nav>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 me-2">Reference library</h5>

          <div className="input-group input-group-sm pattern-search">
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input
              className="form-control" placeholder="Search name, notes, conditions…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-light" title="Clear search" onClick={() => setSearch('')}>
                <i className="ri-close-line" />
              </button>
            )}
          </div>

          <div className="btn-group btn-group-sm" role="group">
            <button className={'btn ' + (filter === 'all' ? 'btn-primary' : 'btn-light')} onClick={() => setFilter('all')}>All</button>
            {TIMEFRAMES.map((t) => (
              <button key={t.id} className={'btn ' + (filter === t.id ? 'btn-primary' : 'btn-light')} onClick={() => setFilter(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <MultiSelect label="Conditions" groups={INDICATORS} selected={condFilter} onChange={setCondFilter} />

          <button className="btn btn-primary btn-sm ms-auto" onClick={() => setAdding(true)}>
            <i className="ri-add-line me-1" /> Add pattern
          </button>
        </div>
        <div className="card-body">
          {filtersActive && (
            <div className="d-flex align-items-center mb-3">
              <span className="text-muted small">
                {visible.length} of {patterns.length} pattern{patterns.length === 1 ? '' : 's'}
              </span>
              <button className="btn btn-link btn-sm p-0 ms-2" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
          {visible.length === 0 ? (
            <p className="text-muted text-center my-4 mb-0">
              {filtersActive ? 'No patterns match your filters.' : 'No patterns yet.'}
            </p>
          ) : (
            <div className="row g-3">
              {visible.map((p) => (
                <div className="col-md-6 col-xl-4" key={p.id}>
                  <PatternCard
                    pattern={p}
                    onOpen={() => setViewing(p)}
                    onDelete={() => setDeleteTarget(p)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add pattern popup */}
      <Modal open={adding} size="lg" title={<><i className="ri-add-line me-2 text-primary" />Add chart pattern</>} onClose={() => setAdding(false)}>
        <PatternForm onSave={addPattern} onCancel={() => setAdding(false)} />
      </Modal>

      {/* View pattern popup */}
      <Modal
        open={Boolean(viewing)}
        size="lg"
        title={viewing && <>{viewing.title} <span className="badge bg-dark ms-2">{tfLabel(viewing.timeframe)}</span></>}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <>
            {viewing.image ? (
              <img src={viewing.image} alt={viewing.title} className="img-fluid rounded border mb-3" />
            ) : (
              <div className="pattern-thumb-empty rounded border mb-3" style={{ height: 220 }}>
                <i className="ri-line-chart-line" />
              </div>
            )}
            <h6 className="text-uppercase text-muted fs-11 mb-2">Price &amp; indicator positions</h6>
            <ConditionChips conditions={viewing.conditions} />
            {viewing.notes && (
              <>
                <h6 className="text-uppercase text-muted fs-11 mb-2 mt-3">Notes</h6>
                <p className="mb-0">{viewing.notes}</p>
              </>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete pattern?"
        message={deleteTarget ? `“${deleteTarget.title}” will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
