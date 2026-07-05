import { useEffect, useMemo, useState } from 'react'
import Assessment from '@/components/trading/Assessment'
import { evaluate } from '@/components/trading/assessmentRules'
import {
  useJournalDays, useJournalTrades, useJournalNotes,
  addDay as apiAddDay, setDayPremarket as apiSetPremarket,
  addTrade as apiAddTrade, editTrade as apiEditTrade, removeTrade as apiRemoveTrade,
  addNote as apiAddNote, editNote as apiEditNote, removeNote as apiRemoveNote,
} from '@/data/journalRepo'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import RichTextEditor from '@/components/ui/RichTextEditor'
import ImageDropZone from '@/components/ui/ImageDropZone'

/**
 * Journal.jsx  (DRAFT)
 * -----------------------------------------------------------------------------
 * One journal entry per trading day.
 *   - Top: a table of days (P&L, trade count, win rate at a glance). Pick one.
 *   - Below: the selected day's timeline, trades and notes interleaved by time.
 *       · Trade — expands to the full <Assessment /> (read-only once saved).
 *       · Note  — a timestamped market observation: text + optional image +
 *                 the setup assessment (market read only, no discipline gate).
 *
 * Times are stored 24h ('HH:MM') and always displayed 12h with AM/PM. New
 * entries prepopulate the current time, which stays editable.
 *
 * Everything is local mock state for now; wire to real storage later.
 */

// --- Time helpers ------------------------------------------------------------
const nowHM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// --- Mock seed data ----------------------------------------------------------
const money = (n) => (n < 0 ? '-' : '') + '₹' + Math.abs(n).toLocaleString('en-IN')
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const rid = () => Math.random().toString(36).slice(2, 8)

function dayStats(day) {
  const net = day.trades.reduce((s, t) => s + t.pnl, 0)
  const wins = day.trades.filter((t) => t.pnl > 0).length
  const followed = day.trades.filter((t) => evaluate(t.answers).ready).length
  return { net, wins, count: day.trades.length, followed }
}

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

// Plain-text excerpt of an HTML note, for the collapsed row.
const htmlExcerpt = (html, max = 90) => {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}
const htmlHasImage = (html) => /<img\b/i.test(html || '')

const TimeBadge = ({ time }) => (
  <span className="badge bg-light text-body border time-badge">
    <i className="ri-time-line me-1" />{fmtTime(time)}
  </span>
)

// --- Pre-market snapshot -----------------------------------------------------
// Global cues checked before the open. Each is a simple Bullish/Bearish read;
// advances/declines are raw counts whose ratio implies market breadth.
//
// `inverse` items move opposite to Indian equities: a BEARISH Crude / Dollar
// Index is BULLISH for the market. The overall bias below accounts for this.
const PM_ITEMS = [
  { id: 'dow', label: 'Dow', icon: 'ri-line-chart-line' },
  { id: 'crude', label: 'Crude Oil', icon: 'ri-drop-line', inverse: true },
  { id: 'dollar', label: 'Dollar Index', icon: 'ri-money-dollar-circle-line', inverse: true },
  { id: 'giftNifty', label: 'Gift Nifty', icon: 'ri-funds-line' },
  { id: 'niftyPreOpen', label: 'Nifty Pre-open', icon: 'ri-stock-line' },
]

// Weighted so inverse cues count backwards, then advances/declines breadth.
// Returns 'Bullish' | 'Bearish' | 'Neutral'.
function premarketBias(pm = {}) {
  let score = 0
  let any = false
  for (const item of PM_ITEMS) {
    const w = item.inverse ? -1 : 1
    if (pm[item.id] === 'Bullish') { score += w; any = true }
    else if (pm[item.id] === 'Bearish') { score -= w; any = true }
  }
  const adv = Number(pm.advances) || 0
  const dec = Number(pm.declines) || 0
  if (adv || dec) { score += adv >= dec ? 1 : -1; any = true }
  if (!any) return 'Neutral'
  return score > 0 ? 'Bullish' : score < 0 ? 'Bearish' : 'Neutral'
}

const biasBadge = (bias) =>
  bias === 'Bullish' ? 'bg-success' : bias === 'Bearish' ? 'bg-danger' : 'bg-secondary'
const biasIcon = (bias) =>
  bias === 'Bullish' ? 'ri-arrow-up-line' : bias === 'Bearish' ? 'ri-arrow-down-line' : 'ri-subtract-line'

function BullBearToggle({ value, onChange }) {
  return (
    <div className="btn-group btn-group-sm w-100" role="group">
      <button
        type="button"
        className={'btn ' + (value === 'Bullish' ? 'btn-success' : 'btn-light')}
        onClick={() => onChange(value === 'Bullish' ? null : 'Bullish')}
      >
        <i className="ri-arrow-up-line me-1" />Bull
      </button>
      <button
        type="button"
        className={'btn ' + (value === 'Bearish' ? 'btn-danger' : 'btn-light')}
        onClick={() => onChange(value === 'Bearish' ? null : 'Bearish')}
      >
        <i className="ri-arrow-down-line me-1" />Bear
      </button>
    </div>
  )
}

function PreMarket({ value = {}, onSave }) {
  const [draft, setDraft] = useState(value)
  const [justSaved, setJustSaved] = useState(false)
  const set = (id, v) => { setDraft((d) => ({ ...d, [id]: v })); setJustSaved(false) }

  const dirty = JSON.stringify(draft) !== JSON.stringify(value)
  const bias = premarketBias(draft) // live as you toggle
  const adv = Number(draft.advances) || 0
  const dec = Number(draft.declines) || 0
  const breadth = adv || dec ? (adv >= dec ? 'Bullish' : 'Bearish') : null

  const save = () => { onSave(draft); setJustSaved(true) }

  return (
    <div className="card border mb-3">
      <div className="card-header d-flex align-items-center flex-wrap gap-2 py-2">
        <h6 className="card-title mb-0">
          <i className="ri-sun-line me-2 text-warning" />Pre-market
        </h6>
        <span className={'badge ' + biasBadge(bias)}>
          <i className={biasIcon(bias) + ' me-1'} />{bias}
        </span>
        <small className="text-muted d-none d-md-inline">Global cues before the open</small>
        <div className="ms-auto d-flex align-items-center gap-2">
          {justSaved && !dirty && (
            <small className="text-success"><i className="ri-check-line me-1" />Saved</small>
          )}
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty}>
            <i className="ri-save-line me-1" />Save
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3 align-items-end">
          {PM_ITEMS.map((item) => (
            <div className="col-6 col-md-4 col-xl-2" key={item.id}>
              <div className="small text-muted mb-1 text-truncate">
                <i className={item.icon + ' me-1'} />{item.label}
                {item.inverse && (
                  <i
                    className="ri-arrow-left-right-line ms-1 text-warning"
                    title="Inverse indicator — bearish here is bullish for the market"
                  />
                )}
              </div>
              <BullBearToggle value={draft[item.id]} onChange={(v) => set(item.id, v)} />
            </div>
          ))}

          <div className="col-12 col-md-4 col-xl-2">
            <div className="small text-muted mb-1">
              Advances / Declines
              {breadth && (
                <span className={'badge ms-2 ' + (breadth === 'Bullish' ? 'bg-success' : 'bg-danger')}>
                  {breadth}
                </span>
              )}
            </div>
            <div className="input-group input-group-sm">
              <span className="input-group-text text-success">A</span>
              <input
                type="number" className="form-control" placeholder="0"
                value={draft.advances ?? ''} onChange={(e) => set('advances', e.target.value)}
              />
              <span className="input-group-text text-danger">D</span>
              <input
                type="number" className="form-control" placeholder="0"
                value={draft.declines ?? ''} onChange={(e) => set('declines', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Single trade log (collapsible) -----------------------------------------
function TradeRow({ trade, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const v = evaluate(trade.answers)
  const broken = !v.ready
  return (
    <div className={'card border mb-2' + (broken ? ' border-danger' : '')}>
      <div
        className={'card-body py-2 d-flex align-items-center flex-wrap gap-3' + (broken ? ' bg-danger-subtle' : '')}
        role="button"
        onClick={() => setOpen((o) => !o)}
      >
        <i className={'text-muted ' + (open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line')} />
        <TimeBadge time={trade.time} />
        <div className="flex-grow-1">
          <span className="fw-medium">{trade.instrument}</span>
          <span className={'badge ms-2 ' + (trade.side === 'Buy' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger')}>
            {trade.side}
          </span>
        </div>
        <div className="text-muted small">Qty {trade.qty}</div>
        <div className="text-muted small">{trade.entry} → {trade.exit}</div>
        <div className={'fw-semibold ' + pnlClass(trade.pnl)} style={{ minWidth: 90, textAlign: 'right' }}>
          {money(trade.pnl)}
        </div>
        <span className={'badge ' + (broken ? 'bg-danger' : 'bg-success')}>
          <i className={'me-1 ' + (broken ? 'ri-error-warning-line' : 'ri-shield-check-line')} />
          {broken ? 'Rules broken' : 'Rules followed'}
        </span>
        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit trade" onClick={onEdit}>
            <i className="ri-pencil-line" />
          </button>
          <button className="btn btn-sm btn-ghost-danger p-1" title="Delete trade" onClick={onDelete}>
            <i className="ri-delete-bin-line" />
          </button>
        </div>
      </div>
      {open && (
        <div className="card-body border-top bg-light-subtle">
          <Assessment answers={trade.answers} readOnly />
        </div>
      )}
    </div>
  )
}

// --- Single note (collapsible) ----------------------------------------------
function NoteRow({ note, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const hasAssessment = ['global', 'oi', 'bias15', 'bias1h', 'sr'].some((k) => note.answers?.[k])
  const excerpt = htmlExcerpt(note.text)
  return (
    <div className="card border border-info-subtle mb-2">
      <div
        className="card-body py-2 d-flex align-items-center flex-wrap gap-3"
        role="button"
        onClick={() => setOpen((o) => !o)}
      >
        <i className={'text-muted ' + (open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line')} />
        <TimeBadge time={note.time} />
        <span className="badge bg-info-subtle text-info"><i className="ri-sticky-note-line me-1" />Note</span>
        <div className="flex-grow-1 text-truncate" style={{ maxWidth: 460 }}>
          {excerpt || <span className="text-muted fst-italic">No text</span>}
        </div>
        {(note.image || htmlHasImage(note.text)) && <i className="ri-image-line text-muted" title="Has image" />}
        {hasAssessment && <i className="ri-radar-line text-muted" title="Has setup assessment" />}
        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit note" onClick={onEdit}>
            <i className="ri-pencil-line" />
          </button>
          <button className="btn btn-sm btn-ghost-danger p-1" title="Delete note" onClick={onDelete}>
            <i className="ri-delete-bin-line" />
          </button>
        </div>
      </div>
      {open && (
        <div className="card-body border-top bg-light-subtle">
          {note.text && (
            <div className="rte-content mb-3" dangerouslySetInnerHTML={{ __html: note.text }} />
          )}
          {note.image && (
            <img src={note.image} alt="attachment" className="rounded border mb-3 d-block" style={{ maxHeight: 320, maxWidth: '100%' }} />
          )}
          {hasAssessment && (
            <>
              <h6 className="text-uppercase text-muted fs-11 mb-2">Market observation</h6>
              <Assessment answers={note.answers} readOnly only="setup" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// --- Shared time field -------------------------------------------------------
const TimeField = ({ value, onChange }) => (
  <div>
    <label className="form-label small mb-1">Time</label>
    <div className="input-group input-group-sm">
      <input type="time" className="form-control" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="input-group-text">{fmtTime(value)}</span>
    </div>
  </div>
)

// --- Trade form (add / edit) -------------------------------------------------
function TradeForm({ initial, onSave, onCancel }) {
  const [meta, setMeta] = useState(
    initial
      ? {
          time: initial.time,
          instrument: initial.instrument,
          side: initial.side,
          qty: String(initial.qty ?? ''),
          entry: String(initial.entry ?? ''),
          exit: String(initial.exit ?? ''),
        }
      : { time: nowHM(), instrument: '', side: 'Buy', qty: '', entry: '', exit: '' }
  )
  const [answers, setAnswers] = useState(initial?.answers || {})
  const set = (id, value) => setAnswers((a) => ({ ...a, [id]: value }))
  const setM = (k, v) => setMeta((m) => ({ ...m, [k]: v }))

  const save = () => {
    const entry = parseFloat(meta.entry) || 0
    const exit = parseFloat(meta.exit) || 0
    const qty = parseInt(meta.qty) || 0
    const pnl = Math.round((exit - entry) * qty * (meta.side === 'Buy' ? 1 : -1))
    onSave({ id: initial?.id || 't' + rid(), ...meta, qty, entry, exit, pnl, answers })
  }

  return (
    <>
      <div className="row g-2 mb-3">
        <div className="col-md-2"><TimeField value={meta.time} onChange={(v) => setM('time', v)} /></div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Instrument</label>
          <input className="form-control form-control-sm" placeholder="NIFTY 24500 CE"
            value={meta.instrument} onChange={(e) => setM('instrument', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Side</label>
          <select className="form-select form-select-sm" value={meta.side} onChange={(e) => setM('side', e.target.value)}>
            <option>Buy</option><option>Sell</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Qty</label>
          <input type="number" className="form-control form-control-sm" value={meta.qty} onChange={(e) => setM('qty', e.target.value)} />
        </div>
        <div className="col-md-3 d-flex gap-2">
          <div>
            <label className="form-label small mb-1">Entry</label>
            <input type="number" className="form-control form-control-sm" value={meta.entry} onChange={(e) => setM('entry', e.target.value)} />
          </div>
          <div>
            <label className="form-label small mb-1">Exit</label>
            <input type="number" className="form-control form-control-sm" value={meta.exit} onChange={(e) => setM('exit', e.target.value)} />
          </div>
        </div>
      </div>

      {/* The reusable checklist, editable */}
      <Assessment answers={answers} onChange={set} />

      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}>
          <i className="ri-save-line me-1" /> {initial ? 'Save changes' : 'Save trade'}
        </button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

// --- Note form (add / edit) --------------------------------------------------
function NoteForm({ initial, onSave, onCancel }) {
  const [time, setTime] = useState(initial?.time || nowHM())
  const [text, setText] = useState(initial?.text || '')
  const [image, setImage] = useState(initial?.image || null)
  const [answers, setAnswers] = useState(initial?.answers || {})
  const set = (id, value) => setAnswers((a) => ({ ...a, [id]: value }))

  const save = () => onSave({ id: initial?.id || 'n' + rid(), time, text, image, answers })

  return (
    <>
      <div className="row g-3">
        {/* Left: time + observation + attachment */}
        <div className="col-lg-6">
          <div className="mb-3" style={{ maxWidth: 220 }}>
            <TimeField value={time} onChange={setTime} />
          </div>

          <label className="form-label small mb-1">Observation</label>
          <RichTextEditor
            value={text}
            onChange={setText}
            placeholder="Type your market observation…"
          />

          <label className="form-label small mb-1 mt-3">Attachment (screenshot)</label>
          <ImageDropZone value={image} onChange={setImage} minHeight={140} />
        </div>

        {/* Right: market observation (setup assessment) */}
        <div className="col-lg-6">
          <h6 className="text-uppercase text-muted fs-11 mb-2">Market observation (optional)</h6>
          <Assessment answers={answers} onChange={set} only="setup" />
        </div>
      </div>

      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-info btn-sm" onClick={save}>
          <i className="ri-save-line me-1" /> {initial ? 'Save changes' : 'Save note'}
        </button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

// --- Page --------------------------------------------------------------------
export default function Journal() {
  const daysRaw = useJournalDays()
  const tradesRaw = useJournalTrades()
  const notesRaw = useJournalNotes()
  const [activeDate, setActiveDate] = useState('')
  const [adding, setAdding] = useState(null) // null | 'trade' | 'note'
  const [editTrade, setEditTrade] = useState(null) // trade being edited
  const [deleteTradeItem, setDeleteTradeItem] = useState(null) // trade pending delete confirm
  const [editNote, setEditNote] = useState(null) // note being edited
  const [deleteNoteItem, setDeleteNoteItem] = useState(null) // note pending delete confirm

  // Join days with their trades + notes (newest day first).
  const days = useMemo(() => daysRaw.map((d) => ({
    ...d,
    trades: tradesRaw.filter((t) => t.day === d.date),
    notes: notesRaw.filter((n) => n.day === d.date),
  })), [daysRaw, tradesRaw, notesRaw])

  useEffect(() => {
    if ((!activeDate || !days.some((d) => d.date === activeDate)) && days.length) setActiveDate(days[0].date)
  }, [days, activeDate])

  const activeDay = useMemo(() => days.find((d) => d.date === activeDate), [days, activeDate])

  // Trades + notes, interleaved and sorted by time.
  const timeline = useMemo(() => {
    if (!activeDay) return []
    return [
      ...activeDay.trades.map((t) => ({ ...t, kind: 'trade' })),
      ...(activeDay.notes || []).map((n) => ({ ...n, kind: 'note' })),
    ].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }, [activeDay])

  // Create today's day if it doesn't exist yet, then select it.
  const newDay = () => {
    const now = new Date()
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (!days.some((d) => d.date === iso)) apiAddDay({ date: iso, note: '', premarket: {} }).catch(console.error)
    setActiveDate(iso)
    setAdding(null)
  }

  const addTrade = (trade) => { apiAddTrade({ ...trade, day: activeDate }).catch(console.error); setAdding(null) }
  const updateTrade = (trade) => { apiEditTrade({ ...trade, day: activeDate }).catch(console.error); setEditTrade(null) }
  const confirmDeleteTrade = () => { apiRemoveTrade(deleteTradeItem?.id).catch(console.error); setDeleteTradeItem(null) }
  const addNote = (note) => { apiAddNote({ ...note, day: activeDate }).catch(console.error); setAdding(null) }
  const updateNote = (note) => { apiEditNote({ ...note, day: activeDate }).catch(console.error); setEditNote(null) }
  const confirmDeleteNote = () => { apiRemoveNote(deleteNoteItem?.id).catch(console.error); setDeleteNoteItem(null) }
  const setPremarket = (pm) => apiSetPremarket(activeDate, pm).catch(console.error)

  return (
    <div className="journal">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Trading Journal</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Updates</li>
            <li className="breadcrumb-item active" aria-current="page">Journal</li>
          </ol>
        </nav>
      </div>

      {/* Days table */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Daily log</h5>
          <button className="btn btn-soft-primary btn-sm" onClick={newDay}>
            <i className="ri-add-line me-1" /> New day
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th className="text-center">Trades</th>
                  <th className="text-end">Net P&amp;L</th>
                  <th className="text-center">Win rate</th>
                  <th className="text-center">Rules kept</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const s = dayStats(day)
                  const isActive = day.date === activeDate
                  return (
                    <tr
                      key={day.date}
                      role="button"
                      className={isActive ? 'table-active' : ''}
                      onClick={() => { setActiveDate(day.date); setAdding(null) }}
                    >
                      <td className="fw-medium">{fmtDate(day.date)}</td>
                      <td className="text-center">{s.count}</td>
                      <td className={'text-end fw-semibold ' + pnlClass(s.net)}>{money(s.net)}</td>
                      <td className="text-center">{s.count ? Math.round((s.wins / s.count) * 100) : 0}%</td>
                      <td className="text-center">
                        <span className={'badge ' + (s.followed === s.count ? 'bg-success' : 'bg-warning')}>
                          {s.followed}/{s.count}
                        </span>
                      </td>
                      <td className="text-muted text-truncate" style={{ maxWidth: 260 }}>{day.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selected day timeline */}
      {activeDay && (
        <div className="card">
          <div className="card-header d-flex align-items-center flex-wrap gap-2">
            <div className="flex-grow-1">
              <h5 className="card-title mb-0">{fmtDate(activeDay.date)}</h5>
              <small className="text-muted">{activeDay.note}</small>
            </div>
            <div className="d-flex gap-3 align-items-center">
              <span className="text-muted small">Net</span>
              <span className={'fs-15 fw-semibold ' + pnlClass(dayStats(activeDay).net)}>
                {money(dayStats(activeDay).net)}
              </span>
              <button className="btn btn-info btn-sm" onClick={() => setAdding('note')} disabled={adding === 'note'}>
                <i className="ri-sticky-note-line me-1" /> Add note
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setAdding('trade')} disabled={adding === 'trade'}>
                <i className="ri-add-line me-1" /> Add trade
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Pre-market always shows first for the day */}
            <PreMarket key={activeDate} value={activeDay.premarket || {}} onSave={setPremarket} />

            {timeline.length === 0 && (
              <p className="text-muted text-center my-4 mb-0">No trades or notes logged for this day yet.</p>
            )}

            {timeline.map((item) =>
              item.kind === 'trade'
                ? (
                  <TradeRow
                    key={item.id}
                    trade={item}
                    onEdit={() => setEditTrade(item)}
                    onDelete={() => setDeleteTradeItem(item)}
                  />
                )
                : (
                  <NoteRow
                    key={item.id}
                    note={item}
                    onEdit={() => setEditNote(item)}
                    onDelete={() => setDeleteNoteItem(item)}
                  />
                )
            )}
          </div>
        </div>
      )}

      {/* Add / edit trade popup */}
      <Modal
        open={adding === 'trade' || Boolean(editTrade)}
        size="xxl"
        title={
          editTrade
            ? <><i className="ri-pencil-line me-2 text-primary" />Edit trade — {activeDay && fmtDate(activeDay.date)}</>
            : <><i className="ri-add-line me-2 text-primary" />New trade — {activeDay && fmtDate(activeDay.date)}</>
        }
        onClose={() => { setAdding(null); setEditTrade(null) }}
      >
        <TradeForm
          key={editTrade?.id || 'new'}
          initial={editTrade}
          onSave={editTrade ? updateTrade : addTrade}
          onCancel={() => { setAdding(null); setEditTrade(null) }}
        />
      </Modal>

      <Modal
        open={adding === 'note' || Boolean(editNote)}
        size="xl"
        title={
          editNote
            ? <><i className="ri-pencil-line me-2 text-info" />Edit note — {activeDay && fmtDate(activeDay.date)}</>
            : <><i className="ri-sticky-note-line me-2 text-info" />New note — {activeDay && fmtDate(activeDay.date)}</>
        }
        onClose={() => { setAdding(null); setEditNote(null) }}
      >
        <NoteForm
          key={editNote?.id || 'new'}
          initial={editNote}
          onSave={editNote ? updateNote : addNote}
          onCancel={() => { setAdding(null); setEditNote(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTradeItem)}
        title="Delete trade log?"
        message={deleteTradeItem
          ? `“${deleteTradeItem.instrument}” at ${fmtTime(deleteTradeItem.time)} will be permanently removed.`
          : ''}
        confirmLabel="Delete"
        onConfirm={confirmDeleteTrade}
        onCancel={() => setDeleteTradeItem(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteNoteItem)}
        title="Delete note?"
        message={deleteNoteItem
          ? `The note at ${fmtTime(deleteNoteItem.time)} will be permanently removed.`
          : ''}
        confirmLabel="Delete"
        onConfirm={confirmDeleteNote}
        onCancel={() => setDeleteNoteItem(null)}
      />
    </div>
  )
}
