import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtDate, price } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useStockStrength, addStock, editStock, removeStock,
  TREND_OPTIONS, STRENGTH_OPTIONS, BIAS_OPTIONS, BUCKET_OPTIONS, TREND, STRENGTH, BIAS, BUCKET,
  useHoldingsBySymbol, saveMasterLtps,
} from '@/data/stockStrengthRepo'

/**
 * StockStrength — a watch-table of stocks with observations. Add / edit / delete,
 * plus multi-select filters (sector, trend, strength, bias), a text search, and
 * sortable columns. Backend-only.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const makeBlank = (order) => ({ symbol: '', name: '', sector: '', bucket: '', rationale: '', fundamentallyStrong: false, trend: '', strength: '', bias: '', rating: '', observation: '', updatedDate: todayISO(), sortOrder: order })

const Tone = ({ map, value }) => {
  const o = map[value]
  if (!o) return <span className="text-muted">—</span>
  return <span className={`badge bg-${o.tone}-subtle text-${o.tone}`}>{o.label}</span>
}

const ratingTone = (r) => (r >= 4 ? 'success' : r >= 3 ? 'warning' : 'danger')

// --- Multi-select filter dropdown -------------------------------------------
function MultiFilter({ label, icon, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = (v) => { const n = new Set(selected); n.has(v) ? n.delete(v) : n.add(v); onChange(n) }
  const count = selected.size

  return (
    <div className="position-relative" ref={ref}>
      <button className={'btn btn-sm ' + (count ? 'btn-primary' : 'btn-soft-secondary')} onClick={() => setOpen((o) => !o)}>
        {icon && <i className={icon + ' me-1'} />}{label}{count > 0 && <span className="badge bg-white text-dark ms-1">{count}</span>}
        <i className="ri-arrow-down-s-line ms-1" />
      </button>
      {open && (
        <div className="card shadow-sm position-absolute mt-1" style={{ zIndex: 1000, minWidth: 180 }}>
          <div className="card-body p-2">
            {options.map((o) => (
              <div className="form-check" key={o.value}>
                <input className="form-check-input" type="checkbox" id={`f-${label}-${o.value}`} checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
                <label className="form-check-label small" htmlFor={`f-${label}-${o.value}`}>{o.label}</label>
              </div>
            ))}
            {count > 0 && <button className="btn btn-sm btn-link p-0 mt-1" onClick={() => onChange(new Set())}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Add / edit form --------------------------------------------------------
function StockForm({ initial, onSave, onCancel, sectorSuggestions }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.symbol.trim()) { setErr('Symbol is required.'); return }
    setErr(null); setSaving(true)
    try { await onSave(f) }
    catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <>
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small mb-1">Symbol</label>
          <input className="form-control text-uppercase" placeholder="e.g. RELIANCE" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} autoFocus />
        </div>
        <div className="col-md-5">
          <label className="form-label small mb-1">Name <span className="text-muted">(optional)</span></label>
          <input className="form-control" placeholder="Reliance Industries" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Sector</label>
          <input className="form-control" list="sector-dl" placeholder="e.g. Energy" value={f.sector} onChange={(e) => set('sector', e.target.value)} />
          <datalist id="sector-dl">{sectorSuggestions.map((s) => <option key={s} value={s} />)}</datalist>
        </div>

        <div className="col-md-4">
          <label className="form-label small mb-1">Bucket</label>
          <select className="form-select" value={f.bucket || ''} onChange={(e) => set('bucket', e.target.value)}>
            <option value="">— none —</option>
            {BUCKET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-8">
          <label className="form-label small mb-1">Why this bucket <span className="text-muted">(optional)</span></label>
          <input className="form-control" placeholder="e.g. Dollar earner, weak-rupee winner" value={f.rationale || ''} onChange={(e) => set('rationale', e.target.value)} />
        </div>

        <div className="col-md-3">
          <label className="form-label small mb-1">Trend</label>
          <select className="form-select" value={f.trend} onChange={(e) => set('trend', e.target.value)}>
            <option value="">—</option>
            {TREND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Strength</label>
          <select className="form-select" value={f.strength} onChange={(e) => set('strength', e.target.value)}>
            <option value="">—</option>
            {STRENGTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Bias</label>
          <select className="form-select" value={f.bias} onChange={(e) => set('bias', e.target.value)}>
            <option value="">—</option>
            {BIAS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Rating (1-5)</label>
          <input type="number" min="1" max="5" step="0.5" className="form-control" value={f.rating} onChange={(e) => set('rating', e.target.value)} />
        </div>

        <div className="col-md-12">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="fund-strong"
              checked={Boolean(f.fundamentallyStrong)} onChange={(e) => set('fundamentallyStrong', e.target.checked)} />
            <label className="form-check-label" htmlFor="fund-strong">
              Fundamentally strong
              <span className="text-muted small d-block">The slow judgement under the chart read. Flagged names sort to the top.</span>
            </label>
          </div>
        </div>

        <div className="col-md-8">
          <label className="form-label small mb-1">Observation</label>
          <textarea className="form-control" rows={2} placeholder="What you see — support/resistance, volume, pattern…" value={f.observation} onChange={(e) => set('observation', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Updated</label>
          <input type="date" className="form-control" value={f.updatedDate} onChange={(e) => set('updatedDate', e.target.value)} />
        </div>
      </div>

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <i className="ri-save-3-line me-1" />{saving ? 'Saving…' : f.id ? 'Update' : 'Save'}
        </button>
      </div>
    </>
  )
}

// --- Sortable header cell ---------------------------------------------------
function Th({ label, sortKey, sort, setSort, className }) {
  const active = sort.key === sortKey
  const next = () => setSort(active && sort.dir === 'asc' ? { key: sortKey, dir: 'desc' } : { key: sortKey, dir: 'asc' })
  return (
    <th className={className} role="button" onClick={next} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
      {label} <i className={'ri-arrow-' + (active ? (sort.dir === 'asc' ? 'up' : 'down') : 'up-down') + '-line text-muted small'} />
    </th>
  )
}

export default function StockStrength() {
  const { stocks, reload } = useStockStrength()
  const { forStock } = useHoldingsBySymbol()
  const [search, setSearch] = useState('')
  const [onlyStrong, setOnlyStrong] = useState(false)
  const [onlyHeld, setOnlyHeld] = useState(false)
  const [ltpDraft, setLtpDraft] = useState(null)
  const [ltpSaving, setLtpSaving] = useState(false)
  const [fSector, setFSector] = useState(new Set())
  const [fBucket, setFBucket] = useState(new Set())
  const [fTrend, setFTrend] = useState(new Set())
  const [fStrength, setFStrength] = useState(new Set())
  const [fBias, setFBias] = useState(new Set())
  const [sort, setSort] = useState({ key: 'symbol', dir: 'asc' })
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const sectors = useMemo(() => [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort(), [stocks])
  const sectorOptions = sectors.map((s) => ({ value: s, label: s }))

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = stocks.filter((s) => {
      if (onlyStrong && !s.fundamentallyStrong) return false
      if (onlyHeld && forStock(s).qty <= 0) return false
      if (fSector.size && !fSector.has(s.sector)) return false
      if (fBucket.size && !fBucket.has(s.bucket)) return false
      if (fTrend.size && !fTrend.has(s.trend)) return false
      if (fStrength.size && !fStrength.has(s.strength)) return false
      if (fBias.size && !fBias.has(s.bias)) return false
      if (q) {
        const hay = [s.symbol, s.name, s.sector, s.observation].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    // Fundamentally strong always floats to the top, whatever column is sorted.
    out = [...out].sort((a, b) => {
      const fa = a.fundamentallyStrong ? 1 : 0
      const fb = b.fundamentallyStrong ? 1 : 0
      if (fa !== fb) return fb - fa
      if (sort.key === 'holdings') return (forStock(b).qty - forStock(a).qty) * dir
      if (sort.key === 'ltp') return ((Number(a.ltp) || 0) - (Number(b.ltp) || 0)) * dir
      const av = a[sort.key] ?? ''; const bv = b[sort.key] ?? ''
      if (sort.key === 'rating') return ((Number(av) || 0) - (Number(bv) || 0)) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks, search, fSector, fBucket, fTrend, fStrength, fBias, sort, onlyStrong, onlyHeld])

  const activeFilters = fSector.size + fBucket.size + fTrend.size + fStrength.size + fBias.size
  const clearAll = () => { setFSector(new Set()); setFBucket(new Set()); setFTrend(new Set()); setFStrength(new Set()); setFBias(new Set()); setSearch(''); setOnlyStrong(false); setOnlyHeld(false) }
  // Batched LTP editing — nothing hits the network until Save, and saving also
  // pushes each price down into the books that hold the stock.
  const startLtpEdit = () => setLtpDraft(Object.fromEntries(stocks.map((s) => [s.id, String(s.ltp ?? '')])))
  const changedLtps = ltpDraft
    ? stocks.filter((s) => ltpDraft[s.id] !== undefined && Number(ltpDraft[s.id] || 0) !== Number(s.ltp || 0))
        .map((s) => ({ id: s.id, ltp: ltpDraft[s.id], symbol: s.symbol }))
    : []
  const saveLtpEdits = async () => {
    if (!changedLtps.length) { setLtpDraft(null); return }
    setLtpSaving(true)
    try { await saveMasterLtps(changedLtps); await reload(); setLtpDraft(null) } finally { setLtpSaving(false) }
  }

  const strongCount = stocks.filter((s) => s.fundamentallyStrong).length
  const heldCount = stocks.filter((s) => forStock(s).qty > 0).length

  const openAdd = () => setEditing(makeBlank(stocks.length))
  const openEdit = (s) => setEditing({ ...s })
  const onSave = async (f) => {
    if (f.id) await editStock(f)
    else await addStock({ ...f, id: 'stk-' + rid() })
    await reload(); setEditing(null)
  }
  const onDelete = async () => { const t = confirm; setConfirm(null); await removeStock(t.id); await reload() }

  return (
    <div className="card mb-0">
      <div className="card-header">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ maxWidth: 240 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Search symbol, name, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <MultiFilter label="Sector" icon="ri-building-2-line" options={sectorOptions} selected={fSector} onChange={setFSector} />
          <MultiFilter label="Bucket" icon="ri-stack-line" options={BUCKET_OPTIONS} selected={fBucket} onChange={setFBucket} />
          <MultiFilter label="Trend" icon="ri-line-chart-line" options={TREND_OPTIONS} selected={fTrend} onChange={setFTrend} />
          <MultiFilter label="Strength" icon="ri-flashlight-line" options={STRENGTH_OPTIONS} selected={fStrength} onChange={setFStrength} />
          <MultiFilter label="Bias" icon="ri-scales-3-line" options={BIAS_OPTIONS} selected={fBias} onChange={setFBias} />
          {ltpDraft ? (
            <>
              <span className="text-muted small">{changedLtps.length} changed</span>
              <button className="btn btn-sm btn-light" onClick={() => setLtpDraft(null)} disabled={ltpSaving}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={saveLtpEdits} disabled={ltpSaving}><i className="ri-save-line me-1" />{ltpSaving ? 'Saving…' : 'Save LTPs'}</button>
            </>
          ) : (
            <button className="btn btn-sm btn-soft-primary" onClick={startLtpEdit} disabled={stocks.length === 0}><i className="ri-price-tag-3-line me-1" />Update LTP</button>
          )}
          <button className={'btn btn-sm ' + (onlyStrong ? 'btn-success' : 'btn-soft-secondary')} onClick={() => setOnlyStrong((v) => !v)}>
            <i className="ri-shield-star-line me-1" />Fundamentally strong<span className="badge bg-white text-dark ms-1">{strongCount}</span>
          </button>
          <button className={'btn btn-sm ' + (onlyHeld ? 'btn-primary' : 'btn-soft-secondary')} onClick={() => setOnlyHeld((v) => !v)}>
            <i className="ri-briefcase-line me-1" />Held<span className="badge bg-white text-dark ms-1">{heldCount}</span>
          </button>
          {(activeFilters > 0 || search || onlyStrong || onlyHeld) && <button className="btn btn-sm btn-link text-danger p-0" onClick={clearAll}>Clear all</button>}
          <span className="flex-grow-1" />
          <span className="text-muted small">{rows.length} of {stocks.length}</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />Add stock</button>
        </div>
      </div>
      <div className="card-body p-0">
        {stocks.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No stocks yet. Add one to start tracking strength. 📊</p>
        ) : rows.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No stocks match the current filters.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <Th label="Symbol" sortKey="symbol" sort={sort} setSort={setSort} />
                  <Th label="Sector" sortKey="sector" sort={sort} setSort={setSort} />
                  <Th label="Bucket" sortKey="bucket" sort={sort} setSort={setSort} className="text-center" />
                  <Th label="Trend" sortKey="trend" sort={sort} setSort={setSort} />
                  <Th label="Strength" sortKey="strength" sort={sort} setSort={setSort} />
                  <Th label="Bias" sortKey="bias" sort={sort} setSort={setSort} />
                  <Th label="Rating" sortKey="rating" sort={sort} setSort={setSort} className="text-center" />
                  <Th label="LTP" sortKey="ltp" sort={sort} setSort={setSort} className="text-end" />
                  <Th label="Holdings" sortKey="holdings" sort={sort} setSort={setSort} className="text-center" />
                  <th>Observation</th>
                  <Th label="Updated" sortKey="updatedDate" sort={sort} setSort={setSort} />
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="fw-medium">
                        {s.fundamentallyStrong && <i className="ri-shield-star-fill text-success me-1" title="Fundamentally strong" />}
                        {s.symbol}
                      </div>
                      {s.name && <div className="text-muted small">{s.name}</div>}
                    </td>
                    <td>{s.sector ? <span className="badge bg-light text-body">{s.sector}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-center">{s.bucket
                      ? <span className={`badge bg-${(BUCKET[s.bucket] || {}).tone || 'secondary'}-subtle text-${(BUCKET[s.bucket] || {}).tone || 'secondary'}`} title={s.rationale || (BUCKET[s.bucket] || {}).label}>{s.bucket}</span>
                      : <span className="text-muted">—</span>}</td>
                    <td><Tone map={TREND} value={s.trend} /></td>
                    <td><Tone map={STRENGTH} value={s.strength} /></td>
                    <td><Tone map={BIAS} value={s.bias} /></td>
                    <td className="text-center">{s.rating !== '' && s.rating != null ? <span className={`badge bg-${ratingTone(Number(s.rating))}-subtle text-${ratingTone(Number(s.rating))}`}>{s.rating}/5</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-end" style={{ minWidth: 110 }}>
                      {ltpDraft ? (
                        <input type="number" step="0.01" className="form-control form-control-sm text-end" value={ltpDraft[s.id] ?? ''}
                          onChange={(e) => setLtpDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveLtpEdits(); if (e.key === 'Escape') setLtpDraft(null) }} />
                      ) : (s.ltp !== '' && s.ltp != null
                        ? <>{price(Number(s.ltp), 'INR')}{s.ltpUpdatedAt && <div className="text-muted small">{fmtDate(String(s.ltpUpdatedAt).slice(0, 10))}</div>}</>
                        : <span className="text-muted">—</span>)}
                    </td>
                    <td className="text-center">
                      {(() => {
                        const h = forStock(s)
                        if (h.qty <= 0) return <span className="text-muted">—</span>
                        return (
                          <>
                            <span className="badge bg-primary-subtle text-primary">{h.qty}</span>
                            <div className="text-muted small mt-1" style={{ whiteSpace: 'nowrap' }}>
                              in {h.holders} place{h.holders === 1 ? '' : 's'}
                            </div>
                            <div className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
                              {h.lines.map((l) => `${l.source} ${l.qty}`).join(' · ')}
                            </div>
                          </>
                        )
                      })()}
                    </td>
                    <td className="small" style={{ maxWidth: 260, whiteSpace: 'normal' }}>{s.observation || <span className="text-muted">—</span>}</td>
                    <td className="text-nowrap small text-muted">{s.updatedDate ? fmtDate(s.updatedDate) : '—'}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-ghost-secondary px-2" title="Edit" onClick={() => openEdit(s)}><i className="ri-pencil-line" /></button>
                      <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setConfirm(s)}><i className="ri-delete-bin-line" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={Boolean(editing)} size="lg" title={editing?.id ? 'Edit stock' : 'Add stock'} onClose={() => setEditing(null)}>
        {editing && <StockForm initial={editing} onSave={onSave} onCancel={() => setEditing(null)} sectorSuggestions={sectors} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)} title="Delete stock?"
        message={confirm ? `"${confirm.symbol}" will be permanently removed.` : ''}
        confirmLabel="Delete" onConfirm={onDelete} onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
