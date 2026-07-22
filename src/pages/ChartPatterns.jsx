import { useEffect, useMemo, useState } from 'react'
import { usePatterns, addPattern as apiAddPattern, editPattern as apiEditPattern, removePattern as apiRemovePattern, setPatternFeatured as apiSetFeatured, setPatternMorning as apiSetMorning } from '@/data/chartPatternsRepo'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ImageDropZone from '@/components/ui/ImageDropZone'
import MultiSelect from '@/components/ui/MultiSelect'
import ImageLightbox from '@/components/ui/ImageLightbox'
import MorningTrades from '@/components/trading/MorningTrades'

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
  { id: 'ema9-20-break', label: '9 and 20 EMA Break', options: ['9 & 20 EMA breakout'] },
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
  const [timeframe, setTimeframe] = useState(initial?.timeframe || '5m')
  const [image, setImage] = useState(initial?.image || null)
  const [conditions, setConditions] = useState(initial?.conditions || [])
  const [notes, setNotes] = useState(initial?.notes || '')
  const [featured, setFeatured] = useState(initial?.featured || false)
  const [morning, setMorning] = useState(initial?.morning || false)
  const [condQuery, setCondQuery] = useState('')

  const toggle = (opt) =>
    setConditions((c) => (c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt]))

  /* Match on the option OR its group name, so "ema" surfaces the whole 9 EMA /
     20 EMA groups rather than only options containing "ema". Already-selected
     conditions always stay visible — otherwise searching would hide what you've
     ticked and you'd lose track of it. */
  const q = condQuery.trim().toLowerCase()
  const shownGroups = INDICATORS
    .map((g) => {
      if (!q || g.label.toLowerCase().includes(q)) return g
      return { ...g, options: g.options.filter((o) => o.toLowerCase().includes(q) || conditions.includes(o)) }
    })
    .filter((g) => g.options.length > 0)

  const save = () =>
    onSave({ id: initial?.id || 'p' + rid(), title: title.trim() || 'Untitled pattern', timeframe, image, conditions, notes: notes.trim(), featured, morning })

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

      <div className="d-flex align-items-center gap-2 mt-3 mb-1">
        <label className="form-label small mb-0 flex-grow-1">Price &amp; indicator positions</label>
        {conditions.length > 0 && (
          <span className="badge bg-primary">{conditions.length} selected</span>
        )}
      </div>
      <div className="border rounded p-2 mb-3">
        <div className="ms-search mb-2">
          <i className="ri-search-line" />
          <input
            className="form-control form-control-sm"
            placeholder="Search conditions…"
            value={condQuery}
            onChange={(e) => setCondQuery(e.target.value)}
          />
          {condQuery && (
            <button type="button" className="ms-search-clear" aria-label="Clear search" onClick={() => setCondQuery('')}>
              <i className="ri-close-line" />
            </button>
          )}
        </div>

        {shownGroups.length === 0 && (
          <div className="small text-muted text-center py-2">No condition matches “{condQuery}”</div>
        )}

        {shownGroups.map((g) => (
          <div className="pattern-cond-group" key={g.id}>
            <div className="pattern-cond-label">{g.label}</div>
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

      {/* Featured + Morning patterns are surfaced on the Before I Trade screen. */}
      <label className={'pattern-featured' + (featured ? ' is-on' : '')}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        <i className={featured ? 'ri-star-fill' : 'ri-star-line'} />
        <span>
          <strong>Featured — check this daily</strong>
          <small>Shows up in “Patterns to review” on the Before I Trade screen.</small>
        </span>
      </label>
      <label className={'pattern-featured is-morning' + (morning ? ' is-on' : '')}>
        <input type="checkbox" checked={morning} onChange={(e) => setMorning(e.target.checked)} />
        <i className={morning ? 'ri-sun-fill' : 'ri-sun-line'} />
        <span>
          <strong>Morning Opening Trades</strong>
          <small>Shows in the Morning tab of “Patterns to review”.</small>
        </span>
      </label>

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
function PatternCard({ pattern, onOpen, onEdit, onDelete, onToggleFeatured, onToggleMorning }) {
  return (
    <div className={'card h-100 pattern-card' + (pattern.featured ? ' is-featured' : '')}>
      <div className="pattern-thumb" role="button" onClick={onOpen}>
        {pattern.image ? (
          <img src={pattern.image} alt={pattern.title} />
        ) : (
          <div className="pattern-thumb-empty"><i className="ri-line-chart-line" /></div>
        )}
        <span className="badge bg-dark pattern-tf">{tfLabel(pattern.timeframe)}</span>
        <div className="pattern-flags">
          {pattern.morning && (
            <span className="pattern-flag is-morning" title="Morning Opening Trades"><i className="ri-sun-fill" />Morning</span>
          )}
          {pattern.featured && (
            <span className="pattern-flag is-daily" title="Checked daily"><i className="ri-star-fill" />Daily</span>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="d-flex align-items-start">
          <h6 className="mb-2 flex-grow-1" role="button" onClick={onOpen}>{pattern.title}</h6>
          <button
            className={'btn btn-sm p-0 ms-2 pattern-sun' + (pattern.morning ? ' is-on' : '')}
            title={pattern.morning ? 'Remove from Morning Opening Trades' : 'Mark as Morning Opening Trades'}
            onClick={onToggleMorning}
          >
            <i className={pattern.morning ? 'ri-sun-fill' : 'ri-sun-line'} />
          </button>
          <button
            className={'btn btn-sm p-0 ms-2 pattern-star' + (pattern.featured ? ' is-on' : '')}
            title={pattern.featured ? 'Remove from daily review' : 'Check this daily'}
            onClick={onToggleFeatured}
          >
            <i className={pattern.featured ? 'ri-star-fill' : 'ri-star-line'} />
          </button>
          <button className="btn btn-sm btn-ghost-secondary p-0 ms-2" title="Edit" onClick={onEdit}>
            <i className="ri-pencil-line" />
          </button>
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
  const [mainTab, setMainTab] = useState('patterns') // 'patterns' | 'morning'
  const [filter, setFilter] = useState('all') // 'all' | '3m' | '5m'
  const [morningOnly, setMorningOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [condFilter, setCondFilter] = useState([]) // conditions that must all be present
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // pattern being edited
  const [viewing, setViewing] = useState(null) // pattern being viewed
  const [deleteTarget, setDeleteTarget] = useState(null) // pattern pending delete confirm
  const [saveError, setSaveError] = useState(null) // surfaced instead of console-only
  const [zoom, setZoom] = useState(null) // { src, alt } of the chart being viewed full-screen

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patterns.filter((p) => {
      if (filter !== 'all' && p.timeframe !== filter) return false
      if (morningOnly && !p.morning) return false
      if (!condFilter.every((c) => p.conditions.includes(c))) return false
      if (q) {
        const haystack = [p.title, p.notes, ...p.conditions].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [patterns, filter, morningOnly, search, condFilter])

  useEffect(() => { setPatterns(livePatterns) }, [livePatterns])

  const filtersActive = search.trim() || condFilter.length > 0 || filter !== 'all' || morningOnly
  const clearFilters = () => { setSearch(''); setCondFilter([]); setFilter('all'); setMorningOnly(false) }
  const morningCount = patterns.filter((p) => p.morning).length

  /* Only close the form once the write actually lands. Adding to local state and
     closing optimistically meant a rejected insert looked identical to a
     successful one — the pattern showed up, then silently vanished the moment
     the live query overwrote local state with the real table. */
  const addPattern = (p) => {
    setSaveError(null)
    return apiAddPattern(p)
      .then(() => setAdding(false))
      .catch((e) => setSaveError(e?.message || String(e)))
  }

  const savePatternEdit = (p) => {
    setSaveError(null)
    return apiEditPattern(p)
      .then(() => setEditing(null))
      .catch((e) => setSaveError(e?.message || String(e)))
  }

  // Optimistic, but put it back if the write is rejected.
  const toggleFeatured = (p) => {
    const featured = !p.featured
    setSaveError(null)
    setPatterns((ps) => ps.map((x) => (x.id === p.id ? { ...x, featured } : x)))
    apiSetFeatured(p.id, featured).catch((e) => {
      setPatterns((ps) => ps.map((x) => (x.id === p.id ? { ...x, featured: !featured } : x)))
      setSaveError(e?.message || String(e))
    })
  }

  const toggleMorning = (p) => {
    const morning = !p.morning
    setSaveError(null)
    setPatterns((ps) => ps.map((x) => (x.id === p.id ? { ...x, morning } : x)))
    apiSetMorning(p.id, morning).catch((e) => {
      setPatterns((ps) => ps.map((x) => (x.id === p.id ? { ...x, morning: !morning } : x)))
      setSaveError(e?.message || String(e))
    })
  }

  const confirmDelete = () => {
    const id = deleteTarget?.id
    setSaveError(null)
    apiRemovePattern(id)
      .catch((e) => setSaveError(e?.message || String(e)))
      .finally(() => setDeleteTarget(null))
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

      {/* Patterns library vs. dated morning-trade observations */}
      <ul className="nav nav-tabs nav-tabs-custom mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button" role="tab" aria-selected={mainTab === 'patterns'}
            className={'nav-link' + (mainTab === 'patterns' ? ' active' : '')}
            onClick={() => setMainTab('patterns')}
          >
            <i className="ri-shapes-line me-1" /> Chart Patterns
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button" role="tab" aria-selected={mainTab === 'morning'}
            className={'nav-link' + (mainTab === 'morning' ? ' active' : '')}
            onClick={() => setMainTab('morning')}
          >
            <i className="ri-sun-line me-1" /> Morning Trades
          </button>
        </li>
      </ul>

      {mainTab === 'morning' && <MorningTrades />}

      {mainTab === 'patterns' && (<>
      {/* Failures from the star toggle / delete, which have no form to report in */}
      {saveError && !adding && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
          <i className="ri-error-warning-line" />
          <div className="flex-grow-1"><strong>Couldn’t save.</strong> <span className="small">{saveError}</span></div>
          <button className="btn-close" aria-label="Dismiss" onClick={() => setSaveError(null)} />
        </div>
      )}

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

          <button
            className={'btn btn-sm ' + (morningOnly ? 'btn-warning' : 'btn-light')}
            onClick={() => setMorningOnly((v) => !v)}
            title="Show only Morning Opening Trades"
          >
            <i className="ri-sun-line me-1" />Morning
            {morningCount > 0 && <span className={'badge ms-1 ' + (morningOnly ? 'bg-dark' : 'bg-warning')}>{morningCount}</span>}
          </button>

          <button className="btn btn-soft-warning btn-sm ms-auto" onClick={() => setMainTab('morning')}>
            <i className="ri-sun-line me-1" /> Morning trades
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
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
                    onToggleFeatured={() => toggleFeatured(p)}
                    onToggleMorning={() => toggleMorning(p)}
                    onOpen={() => setViewing(p)}
                    onEdit={() => { setSaveError(null); setEditing(p) }}
                    onDelete={() => setDeleteTarget(p)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>)}

      {/* Add pattern popup */}
      <Modal open={adding} size="xl" title={<><i className="ri-add-line me-2 text-primary" />Add chart pattern</>} onClose={() => { setAdding(false); setSaveError(null) }}>
        {saveError && (
          <div className="alert alert-danger d-flex align-items-start gap-2 py-2">
            <i className="ri-error-warning-line mt-1" />
            <div>
              <strong>Couldn’t save this pattern.</strong>
              <div className="small">{saveError}</div>
              <div className="small mt-1">Nothing was lost — fix the issue and save again.</div>
            </div>
          </div>
        )}
        <PatternForm onSave={addPattern} onCancel={() => { setAdding(false); setSaveError(null) }} />
      </Modal>

      {/* Edit pattern popup */}
      <Modal
        open={Boolean(editing)}
        size="xl"
        title={<><i className="ri-pencil-line me-2 text-primary" />Edit chart pattern</>}
        onClose={() => { setEditing(null); setSaveError(null) }}
      >
        {saveError && (
          <div className="alert alert-danger d-flex align-items-start gap-2 py-2">
            <i className="ri-error-warning-line mt-1" />
            <div>
              <strong>Couldn’t save this pattern.</strong>
              <div className="small">{saveError}</div>
              <div className="small mt-1">Nothing was lost — fix the issue and save again.</div>
            </div>
          </div>
        )}
        {editing && (
          <PatternForm
            key={editing.id}
            initial={editing}
            onSave={savePatternEdit}
            onCancel={() => { setEditing(null); setSaveError(null) }}
          />
        )}
      </Modal>

      {/* View pattern popup */}
      <Modal
        open={Boolean(viewing)}
        size="xxl"
        title={viewing && <>{viewing.title} <span className="badge bg-dark ms-2">{tfLabel(viewing.timeframe)}</span></>}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          /* Chart left, description right — the screenshot is what you study,
             so it gets the larger half and the notes read alongside it rather
             than pushed below the fold. */
          <div className="row g-4 pattern-view">
            <div className="col-lg-7">
              {viewing.image ? (
                <img
                  src={viewing.image}
                  alt={viewing.title}
                  className="img-fluid rounded border pattern-view-img"
                  role="button"
                  onClick={() => setZoom({ src: viewing.image, alt: viewing.title })}
                />
              ) : (
                <div className="pattern-thumb-empty rounded border" style={{ height: 260 }}>
                  <i className="ri-line-chart-line" />
                </div>
              )}
            </div>

            <div className="col-lg-5">
              {viewing.featured && (
                <span className="badge bg-warning text-dark mb-3">
                  <i className="ri-star-fill me-1" />Checked daily
                </span>
              )}

              <h6 className="text-uppercase text-muted fs-11 mb-2">Price &amp; indicator positions</h6>
              {viewing.conditions?.length > 0
                ? <ConditionChips conditions={viewing.conditions} />
                : <p className="text-muted small mb-0">None tagged.</p>}

              <h6 className="text-uppercase text-muted fs-11 mb-2 mt-4">Notes</h6>
              {viewing.notes
                ? <p className="mb-0 pattern-view-notes">{viewing.notes}</p>
                : <p className="text-muted small mb-0">No notes yet.</p>}
            </div>
          </div>
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

      {zoom && <ImageLightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  )
}
