import { useState } from 'react'
import RichTextEditor from '@/components/ui/RichTextEditor'
import ImageDropZone from '@/components/ui/ImageDropZone'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useMorningTrades, addMorningTrade as apiAdd, editMorningTrade as apiEdit, removeMorningTrade as apiRemove,
} from '@/data/morningTradesRepo'

/**
 * MorningTrades — dated pre-open observations, managed from the Chart Patterns
 * screen. Two screenshots (global market + chart), a rich-text note, market
 * breadth and the pre-market move. Full DB CRUD + Storage-backed images.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtDate = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : ''

const pmClass = (v) => (Number(v) > 0 ? 'text-success' : Number(v) < 0 ? 'text-danger' : 'text-muted')
const pmLabel = (v) => (v === '' || v == null ? '—' : (Number(v) > 0 ? '+' : '') + Number(v))

function MorningTradeForm({ initial, onSave, onCancel, saving, error }) {
  const [date, setDate] = useState(initial?.date || todayISO())
  const [advances, setAdvances] = useState(initial?.advances ?? '')
  const [declines, setDeclines] = useState(initial?.declines ?? '')
  const [premarket, setPremarket] = useState(initial?.premarket ?? '')
  const [globalImage, setGlobalImage] = useState(initial?.globalImage || null)
  const [premarketImage, setPremarketImage] = useState(initial?.premarketImage || null)
  const [cePrevImage, setCePrevImage] = useState(initial?.cePrevImage || null)
  const [pePrevImage, setPePrevImage] = useState(initial?.pePrevImage || null)
  const [nifty5Image, setNifty5Image] = useState(initial?.nifty5Image || null)
  const [ce5Image, setCe5Image] = useState(initial?.ce5Image || null)
  const [pe5Image, setPe5Image] = useState(initial?.pe5Image || null)
  const [nifty5Change, setNifty5Change] = useState(initial?.nifty5Change ?? '')
  const [ce5Change, setCe5Change] = useState(initial?.ce5Change ?? '')
  const [pe5Change, setPe5Change] = useState(initial?.pe5Change ?? '')
  const [observation, setObservation] = useState(initial?.observation || '')

  const save = () => onSave({
    id: initial?.id || 'mt-' + rid(),
    date, advances, declines, premarket,
    globalImage, premarketImage, cePrevImage, pePrevImage,
    nifty5Image, ce5Image, pe5Image,
    nifty5Change, ce5Change, pe5Change,
    observation,
  })

  const total = (Number(advances) || 0) + (Number(declines) || 0)

  return (
    <>
      {/* Row 1 — date + breadth + pre-market on one line */}
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">Advances</label>
          <input type="number" className="form-control form-control-sm" placeholder="0" value={advances} onChange={(e) => setAdvances(e.target.value)} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">Declines</label>
          <input type="number" className="form-control form-control-sm" placeholder="0" value={declines} onChange={(e) => setDeclines(e.target.value)} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">Pre-market (+ / −)</label>
          <input type="number" className="form-control form-control-sm" placeholder="e.g. 120 / -80" value={premarket} onChange={(e) => setPremarket(e.target.value)} />
        </div>
      </div>
      {total > 0 && (
        <div className="small text-muted mt-1">
          Breadth: <strong className="text-success">{advances || 0}</strong> adv · <strong className="text-danger">{declines || 0}</strong> dec
          {' '}({Math.round(((Number(advances) || 0) / total) * 100)}% advancing)
        </div>
      )}

      {/* Row 2 — global market opening, on its own line */}
      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <label className="form-label small mb-1">Global market opening</label>
          <ImageDropZone value={globalImage} onChange={setGlobalImage} minHeight={130} />
        </div>
      </div>

      {/* Row 4 — Nifty pre-market opening + CE / PE previous day */}
      <div className="row g-3 mt-1">
        <div className="col-md-4">
          <label className="form-label small mb-1">Nifty pre-market opening</label>
          <ImageDropZone value={premarketImage} onChange={setPremarketImage} minHeight={130} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">CE previous day</label>
          <ImageDropZone value={cePrevImage} onChange={setCePrevImage} minHeight={130} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">PE previous day</label>
          <ImageDropZone value={pePrevImage} onChange={setPePrevImage} minHeight={130} />
        </div>
      </div>

      {/* Row 5 — +5min screenshots, each with its 5-min change below */}
      <div className="row g-3 mt-1">
        <div className="col-md-4">
          <label className="form-label small mb-1">Nifty after 5 min</label>
          <ImageDropZone value={nifty5Image} onChange={setNifty5Image} minHeight={130} />
          <input type="number" className="form-control form-control-sm mt-2" placeholder="Nifty 5-min change (+ / −)" value={nifty5Change} onChange={(e) => setNifty5Change(e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">CE after 5 min</label>
          <ImageDropZone value={ce5Image} onChange={setCe5Image} minHeight={130} />
          <input type="number" className="form-control form-control-sm mt-2" placeholder="CE 5-min change (+ / −)" value={ce5Change} onChange={(e) => setCe5Change(e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">PE after 5 min</label>
          <ImageDropZone value={pe5Image} onChange={setPe5Image} minHeight={130} />
          <input type="number" className="form-control form-control-sm mt-2" placeholder="PE 5-min change (+ / −)" value={pe5Change} onChange={(e) => setPe5Change(e.target.value)} />
        </div>
      </div>

      {/* Row 6 — observation, full width */}
      <div className="mt-3">
        <label className="form-label small mb-1">Observation</label>
        <RichTextEditor value={observation} onChange={setObservation} placeholder="What's the read this morning?" />
      </div>

      {error && <div className="alert alert-danger py-2 mt-3 mb-0"><strong>Couldn’t save.</strong> <span className="small">{error}</span></div>}

      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>
          <i className="ri-save-line me-1" />{saving ? 'Saving…' : (initial ? 'Save changes' : 'Add morning trade')}
        </button>
        <button className="btn btn-light btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </>
  )
}

export default function MorningTrades() {
  const trades = useMorningTrades()
  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [zoom, setZoom] = useState(null)

  const openAdd = () => { setEditRow(null); setError(null); setFormOpen(true) }
  const openEdit = (t) => { setEditRow(t); setError(null); setFormOpen(true) }

  const save = (t) => {
    setSaving(true); setError(null)
    const op = editRow ? apiEdit(t) : apiAdd(t)
    return op
      .then(() => setFormOpen(false))
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setSaving(false))
  }
  const confirmDelete = () => {
    apiRemove(deleteTarget.id).catch(console.error).finally(() => setDeleteTarget(null))
  }

  return (
    <>
      <div className="d-flex align-items-center mb-3">
        <div className="flex-grow-1">
          <h5 className="mb-0">Morning trades</h5>
          <small className="text-muted">{trades.length} recorded · newest first</small>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />Add morning trade</button>
      </div>

      {trades.length === 0 ? (
        <div className="card"><div className="card-body text-center text-muted py-5">
          <i className="ri-sun-line fs-1 d-block mb-2" />
          No morning trades yet. Capture the global market, the chart, and your read before the open.
        </div></div>
      ) : (
        <div className="mt-rows">
          {trades.map((t) => {
            const hasNum = (v) => v !== '' && v != null
            const preMarketTrio = [
              ['Nifty pre-market opening', t.premarketImage],
              ['CE previous day', t.cePrevImage],
              ['PE previous day', t.pePrevImage],
            ].filter(([, src]) => src)
            const fiveMinTrio = [
              ['Nifty', t.nifty5Image, t.nifty5Change],
              ['CE', t.ce5Image, t.ce5Change],
              ['PE', t.pe5Image, t.pe5Change],
            ].filter(([, src, ch]) => src || hasNum(ch))
            return (
              <article className="card mt-row mb-3" key={t.id}>
                <div className="card-header d-flex align-items-center gap-2 py-2">
                  <h6 className="mb-0 flex-grow-1"><i className="ri-sun-line me-2 text-warning" />{fmtDate(t.date)}</h6>
                  <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => openEdit(t)}><i className="ri-pencil-line" /></button>
                  <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDeleteTarget(t)}><i className="ri-delete-bin-line" /></button>
                </div>
                <div className="card-body">
                  {/* Global market opening + the day's numbers beside it, centred */}
                  <div className="row g-3 align-items-center mt-shots">
                    <div className="col-md-5">
                      <div className="small text-muted mb-1">Global market opening</div>
                      {t.globalImage
                        ? <img src={t.globalImage} alt="Global market opening" className="rounded border mt-shot img-zoomable" role="button" onClick={() => setZoom({ src: t.globalImage, alt: 'Global market opening' })} />
                        : <div className="bt-pattern-empty"><i className="ri-image-line" /></div>}
                    </div>
                    <div className="col-md-7">
                      <div className="mt-stats">
                        <div className="mt-stat">
                          <span className="mt-stat-label">Advances</span>
                          <span className="mt-stat-value text-success">{t.advances || 0}</span>
                        </div>
                        <div className="mt-stat">
                          <span className="mt-stat-label">Declines</span>
                          <span className="mt-stat-value text-danger">{t.declines || 0}</span>
                        </div>
                        <div className="mt-stat">
                          <span className="mt-stat-label">Pre-market</span>
                          <span className={'mt-stat-value ' + pmClass(t.premarket)}>{pmLabel(t.premarket)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {preMarketTrio.length > 0 && (
                    <div className="row g-3 mt-shots">
                      {preMarketTrio.map(([label, src]) => (
                        <div className="col-6 col-md-4" key={label}>
                          <div className="small text-muted mb-1">{label}</div>
                          <img src={src} alt={label} className="rounded border mt-shot img-zoomable" role="button" onClick={() => setZoom({ src, alt: label })} />
                        </div>
                      ))}
                    </div>
                  )}

                  {fiveMinTrio.length > 0 && (
                    <div className="row g-3 mt-shots">
                      {fiveMinTrio.map(([leg, src, ch]) => (
                        <div className="col-6 col-md-4" key={leg}>
                          <div className="d-flex align-items-baseline justify-content-between mb-1">
                            <span className="small text-muted">{leg} +5 min</span>
                            {hasNum(ch) && <span className={'mt-change ' + pmClass(ch)}>{pmLabel(ch)}</span>}
                          </div>
                          {src
                            ? <img src={src} alt={`${leg} +5 min`} className="rounded border mt-shot img-zoomable" role="button" onClick={() => setZoom({ src, alt: `${leg} +5 min` })} />
                            : <div className="bt-pattern-empty"><i className="ri-image-line" /></div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {t.observation && (
                    <>
                      <div className="small text-muted mt-3 mb-1">Observation</div>
                      <div className="rte-content" dangerouslySetInnerHTML={{ __html: t.observation }} />
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        size="xl"
        title={<><i className="ri-sun-line me-2 text-warning" />{editRow ? 'Edit morning trade' : 'New morning trade'}</>}
        onClose={() => setFormOpen(false)}
      >
        {formOpen && (
          <MorningTradeForm
            key={editRow?.id || 'new'}
            initial={editRow}
            saving={saving}
            error={error}
            onSave={save}
            onCancel={() => setFormOpen(false)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this morning trade?"
        message={deleteTarget && <>The entry for <strong>{fmtDate(deleteTarget.date)}</strong> will be permanently removed.</>}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {zoom && <ImageLightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </>
  )
}
