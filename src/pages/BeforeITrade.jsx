import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import tharImg from '@/assets/thar.jpg'
import boatImg from '@/assets/boat.jpg'
import manaliImg from '@/assets/manali.jpg'
import Assessment from '@/components/trading/Assessment'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useDailyReviews, saveDailyReview as apiSaveReview, removeDailyReview as apiRemoveReview,
} from '@/data/dailyReviewRepo'
import { usePatterns } from '@/data/chartPatternsRepo'
import { useJournalDays, setDayPremarket as apiSetPremarket } from '@/data/journalRepo'
import {
  CREED, MISTAKES, MORNING, SCREENS_OPEN, YEARS_TRADING, focusOfTheDay,
} from '@/components/trading/dailyReview'
import {
  quantityFor, quantityPlans, CAPITAL_PER_QTY, LOT_SIZE, CAPITAL_RESERVE,
} from '@/components/trading/entryLevels'

/**
 * BeforeITrade.jsx
 * -----------------------------------------------------------------------------
 * The screen to read every morning before the open. Formerly "Rule Book" — a
 * passive checklist that was easy to skip. This is built to actually be read:
 *
 *   1. The hard truth — six years, and why the account isn't where it should be.
 *   2. The mistakes that cost real money, worst first, each with its price tag.
 *   3. The morning playbook — what lies in the first hour, what to trust.
 *   4. Today's checks — ticked fresh each day, progress shown.
 *   5. Chart patterns to review, pulled from the pattern library.
 *
 * Content lives in components/trading/dailyReview.js. The daily state (checks,
 * acknowledgement, streak) is per-device in localStorage — it's a personal
 * ritual, not shared data.
 */
const KEY = 'hub.beforeITrade'

// Mirrors the timeframes in ChartPatterns; falls back to the raw id.
const TF_LABEL = { '3m': '3 min', '5m': '5 min' }
const tfLabel = (id) => TF_LABEL[id] || id

// Short day label for the review history, e.g. "21 Jul".
const fmtDay = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
// Full label for the modal title, e.g. "Tue, 21 Jul 2026".
const fmtFullDay = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const yesterdayIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readState(today) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    // Checks and read-marks are per-day: a new day starts fresh, so every
    // mistake has to be faced again rather than staying acknowledged forever.
    const sameDay = raw.date === today
    return {
      checked: sameDay ? raw.checked || [] : [],
      readMistakes: sameDay ? raw.readMistakes || [] : [],
      readOn: raw.readOn || null,
      streak: raw.streak || 0,
    }
  } catch {
    return { checked: [], readMistakes: [], readOn: null, streak: 0 }
  }
}

/* End-of-day honesty check: tick anything actually done today. Deliberately
   phrased as "I did this" — the whole value is in admitting it, so the tick is
   the confession, not a to-do. */
function ReviewForm({ initial, onSave, onCancel, saving, error }) {
  /* Three states per rule: 'yes' (did the mistake), 'no' (followed the rule),
     or unanswered. Editing an existing review fills every row in; a fresh one
     starts blank so each rule has to be answered deliberately rather than a
     clean day being the accidental default. */
  const [answers, setAnswers] = useState(() =>
    initial
      ? Object.fromEntries(MISTAKES.map((m) => [m.id, initial.mistakes.includes(m.id) ? 'yes' : 'no']))
      : {}
  )
  const [note, setNote] = useState(initial?.note || '')

  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: a[id] === v ? undefined : v }))

  const slipped = MISTAKES.filter((m) => answers[m.id] === 'yes').length
  const clean = MISTAKES.filter((m) => answers[m.id] === 'no').length
  const unanswered = MISTAKES.length - slipped - clean

  const save = () =>
    onSave({ mistakes: MISTAKES.filter((m) => answers[m.id] === 'yes').map((m) => m.id), note })

  return (
    <>
      <div className="dr-tally">
        <div className="dr-tally-item is-clean">
          <span>{clean}</span><small>followed</small>
        </div>
        <div className="dr-tally-item is-slip">
          <span>{slipped}</span><small>broken</small>
        </div>
        {unanswered > 0 && (
          <div className="dr-tally-item is-open">
            <span>{unanswered}</span><small>unanswered</small>
          </div>
        )}
        <p className="dr-tally-note mb-0">
          {unanswered > 0
            ? `${unanswered} still to answer — they’ll save as followed.`
            : slipped === 0
              ? 'A clean day. This is what it looks like — remember it.'
              : `${slipped} mistake${slipped > 1 ? 's' : ''} today. Naming it is how it stops.`}
        </p>
      </div>

      <div className="dr-list">
        {MISTAKES.map((m) => {
          const a = answers[m.id]
          return (
            <div
              key={m.id}
              className={'dr-item' + (a === 'yes' ? ' is-on' : a === 'no' ? ' is-off' : '')}
            >
              <span className="dr-item-icon"><i className={m.icon} /></span>
              <span className="dr-item-text">
                <strong>{m.title}</strong>
                <small>{a === 'yes' ? m.cost : m.rule}</small>
              </span>
              {m.severity === 'critical' && <span className="dr-item-sev">Critical</span>}

              {/* Did I do this today? */}
              <div className="dr-yn" role="group" aria-label={`Did I do this: ${m.title}`}>
                <button
                  type="button"
                  className={'dr-yn-btn is-yes' + (a === 'yes' ? ' active' : '')}
                  aria-pressed={a === 'yes'}
                  onClick={() => set(m.id, 'yes')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={'dr-yn-btn is-no' + (a === 'no' ? ' active' : '')}
                  aria-pressed={a === 'no'}
                  onClick={() => set(m.id, 'no')}
                >
                  No
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <label className="form-label small mb-1 mt-3">Anything else about today?</label>
      <textarea
        className="form-control"
        rows={2}
        placeholder="What happened, what triggered it, what to do differently…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <div className="alert alert-danger py-2 mt-3 mb-0">
          <strong>Couldn’t save.</strong> <span className="small">{error}</span>
        </div>
      )}

      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary" disabled={saving} onClick={save}>
          <i className="ri-save-line me-1" />{saving ? 'Saving…' : 'Save review'}
        </button>
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </>
  )
}

/* One mistake, told graphically: icon medallion + a faded watermark of the same
   icon, the tags that identify it (account / when / product / habit), then the
   cost and the rule as two labelled blocks — red for what it took, green for
   what prevents it. */
function MistakeCard({ m, read, onRead }) {
  const critical = m.severity === 'critical'
  return (
    <article
      className={'bt-mistake' + (critical ? ' is-critical' : '') + (read ? ' is-read' : ' is-unread')}
      /* The card itself is the target — clicking it acknowledges the mistake.
         Only interactive while unread, since marking is one-way. */
      role={read ? undefined : 'button'}
      tabIndex={read ? undefined : 0}
      aria-label={read ? undefined : `Mark “${m.title}” as read`}
      onClick={read ? undefined : () => onRead(m.id)}
      onKeyDown={read ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRead(m.id) }
      }}
    >
      <i className={`${m.icon} bt-mistake-watermark`} aria-hidden="true" />
      {read && <span className="bt-mistake-done" title="Read today"><i className="ri-check-line" /></span>}

      <header className="bt-mistake-head">
        <span className="bt-mistake-icon"><i className={m.icon} /></span>
        <div className="bt-mistake-heading">
          {critical && <span className="bt-mistake-sev">Account damage</span>}
          <h6>{m.title}</h6>
        </div>
      </header>

      {m.tags?.length > 0 && (
        <div className="bt-tags">
          {m.tags.map((t) => (
            <span className={`bt-tag is-${t.type}`} key={t.label}>
              {t.type === 'account' && <i className="ri-bank-card-fill" />}
              {t.label}
            </span>
          ))}
        </div>
      )}

      <p className="bt-mistake-detail">{m.detail}</p>

      <div className="bt-mistake-block is-cost">
        <span className="bt-block-label"><i className="ri-arrow-right-down-line" />What it cost</span>
        {m.cost}
      </div>
      <div className="bt-mistake-block is-rule">
        <span className="bt-block-label"><i className="ri-shield-check-fill" />The rule</span>
        {m.rule}
      </div>
    </article>
  )
}

export default function BeforeITrade() {
  const today = todayIso()
  const [state, setState] = useState(() => readState(today))
  const [zoom, setZoom] = useState(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [answers, setAnswers] = useState({})
  const patterns = usePatterns()

  /* Capital is stored on today's journal day, not here — it's the same number
     the Journal header and the reminder popup read, so setting it in the
     morning flows through to the whole app. */
  const days = useJournalDays()
  const todayPremarket = days.find((d) => d.date === today)?.premarket
  const savedCapital = todayPremarket?.capital
  const [capitalDraft, setCapitalDraft] = useState(savedCapital ?? '')
  useEffect(() => { setCapitalDraft(savedCapital ?? '') }, [savedCapital])

  const commitCapital = () => {
    if (String(capitalDraft) === String(savedCapital ?? '')) return
    // setDayPremarket writes the column whole, so merge to keep the day's cues.
    apiSetPremarket(today, {
      ...(todayPremarket || {}),
      capital: capitalDraft === '' ? null : capitalDraft,
    }).catch(console.error)
  }

  /* End-of-day review — its own table, so it never touches the journal or the
     morning checklist state. */
  const [tab, setTab] = useState('prep') // 'prep' | 'reviews'
  const [patternTab, setPatternTab] = useState('daily') // 'daily' | 'morning'
  const reviews = useDailyReviews()
  // Which day the modal is editing — today, or any day picked from the history.
  const [reviewDate, setReviewDate] = useState(null)
  const [savingReview, setSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // review pending delete confirm
  const [deleteError, setDeleteError] = useState(null)
  const todayReview = reviews.find((r) => r.date === today) || null
  const editingReview = reviews.find((r) => r.date === reviewDate) || null

  /* Deleting loses the honest record of a day, so it only closes the dialog once
     the delete actually lands — and says so if it doesn't. */
  const confirmDelete = () => {
    const date = deleteTarget?.date
    setDeleteError(null)
    return apiRemoveReview(date)
      .then(() => setDeleteTarget(null))
      .catch((e) => setDeleteError(e?.message || String(e)))
  }

  const saveReview = ({ mistakes, note }) => {
    setSavingReview(true)
    setReviewError(null)
    return apiSaveReview({ date: reviewDate, mistakes, note })
      .then(() => setReviewDate(null))
      .catch((e) => setReviewError(e?.message || String(e)))
      .finally(() => setSavingReview(false))
  }

  /* Consecutive clean days ending today (or yesterday, before today's review
     exists). A day with any mistake breaks it; an unreviewed day stops the
     count rather than silently counting as clean. */
  const cleanStreak = (() => {
    let n = 0
    for (const r of reviews) {          // already newest-first
      if (r.date > today) continue
      if (r.mistakes.length > 0) break
      n++
    }
    return n
  })()

  /* Quick view across every reviewed day. `totalChecks` treats each mistake on
     each day as one rule that either held or didn't, so "followed %" is a real
     ratio rather than a count of good days. */
  const stats = (() => {
    const days = reviews.length
    const totalChecks = days * MISTAKES.length
    const broken = reviews.reduce((sum, r) => sum + r.mistakes.length, 0)
    const followed = totalChecks - broken
    const counts = {}
    for (const r of reviews) for (const id of r.mistakes) counts[id] = (counts[id] || 0) + 1
    const worstId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
    return {
      days,
      totalChecks,
      broken,
      followed,
      followedPct: totalChecks ? Math.round((followed / totalChecks) * 100) : 0,
      cleanDays: reviews.filter((r) => r.mistakes.length === 0).length,
      worst: worstId
        ? { title: MISTAKES.find((m) => m.id === worstId)?.title || worstId, count: counts[worstId] }
        : null,
    }
  })()

  const qty = quantityFor(capitalDraft)
  const plans = quantityPlans(capitalDraft)
  // Only the ones starred as "check this daily" belong on a pre-market screen.
  const dailyPatterns = patterns.filter((p) => p.featured)
  const morningPatterns = patterns.filter((p) => p.morning)
  const shownPatterns = patternTab === 'morning' ? morningPatterns : dailyPatterns

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ date: today, ...state }))
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [today, state])

  const toggle = (id) =>
    setState((s) => ({
      ...s,
      checked: s.checked.includes(id) ? s.checked.filter((x) => x !== id) : [...s.checked, id],
    }))

  /* One-way on purpose: a mistake can be marked read but not un-read. The point
     is to face each one today, and letting it toggle back would turn it into a
     switch to fidget with rather than an acknowledgement. It resets tomorrow. */
  const markRead = (id) =>
    setState((s) =>
      s.readMistakes.includes(id) ? s : { ...s, readMistakes: [...s.readMistakes, id] }
    )

  /* Reading it two days running continues the streak; a missed day resets it.
     The streak is the only thing here that rewards showing up. */
  const acknowledge = () =>
    setState((s) => {
      if (s.readOn === today) return s
      const streak = s.readOn === yesterdayIso() ? s.streak + 1 : 1
      return { ...s, readOn: today, streak }
    })

  const readToday = state.readOn === today
  const done = state.checked.length
  const total = SCREENS_OPEN.length
  const allDone = done === total
  const critical = MISTAKES.filter((m) => m.severity === 'critical')
  const high = MISTAKES.filter((m) => m.severity !== 'critical')
  const focus = focusOfTheDay(today)
  const allRead = state.readMistakes.length === MISTAKES.length

  return (
    <div className="before-trade">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{tab === 'prep' ? 'Before I Trade' : 'Trade Reviews'}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Updates</li>
            <li className="breadcrumb-item active" aria-current="page">
              {tab === 'prep' ? 'Before I Trade' : 'Reviews'}
            </li>
          </ol>
        </nav>
      </div>

      {/* Prep before the open vs. the honest look back after it */}
      <ul className="nav nav-tabs nav-tabs-custom mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button" role="tab" aria-selected={tab === 'prep'}
            className={'nav-link' + (tab === 'prep' ? ' active' : '')}
            onClick={() => setTab('prep')}
          >
            <i className="ri-shield-star-line me-1" /> Before I Trade
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button" role="tab" aria-selected={tab === 'reviews'}
            className={'nav-link' + (tab === 'reviews' ? ' active' : '')}
            onClick={() => setTab('reviews')}
          >
            <i className="ri-history-line me-1" /> Reviews
            {reviews.length > 0 && <span className="badge bg-secondary ms-1">{reviews.length}</span>}
          </button>
        </li>
      </ul>

      {tab === 'prep' && (<>

      {/* 1 — The hard truth */}
      <section className="bt-creed">
        <div className="bt-creed-kicker">
          <i className="ri-alarm-warning-fill" />{CREED.kicker}
        </div>

        <div className="bt-creed-main">
          <div className="bt-creed-years">
            <span className="bt-creed-num">{YEARS_TRADING}</span>
            <span className="bt-creed-unit">years<br />in</span>
          </div>

          <div className="bt-creed-text">
            <h5>{CREED.headline}</h5>
            <ul className="bt-known">
              {CREED.known.map((k) => <li key={k}>{k}</li>)}
            </ul>
          </div>

          <div className="bt-creed-ack">
            <button
              className={'btn ' + (readToday ? 'btn-success' : 'btn-light')}
              onClick={acknowledge}
              disabled={readToday}
            >
              <i className={(readToday ? 'ri-check-double-line' : 'ri-eye-line') + ' me-1'} />
              {readToday ? 'Read today' : 'I’ve read this'}
            </button>
            <div className={'bt-streak' + (state.streak > 0 ? '' : ' is-zero')}>
              <i className="ri-fire-fill" />
              {state.streak > 0
                ? `${state.streak} day${state.streak > 1 ? 's' : ''} in a row`
                : 'Start the streak'}
            </div>
          </div>
        </div>

        {/* The part meant to be felt rather than skimmed */}
        <div className="bt-reflect">
          {CREED.turning.map((p) => <p key={p}>{p}</p>)}
          <p className="bt-reflect-close">{CREED.turningLine}</p>

          {CREED.system.map((p) => <p key={p}>{p}</p>)}

          <ul className="bt-wants">
            {CREED.wants.map((w) => <li key={w}><i className="ri-arrow-right-line" />{w}</li>)}
          </ul>
          <p>{CREED.wantsClose}</p>

          <div className="bt-choices">
            <span className="bt-choices-lead">Today, I choose</span>
            {CREED.choices.map((c) => (
              <span className="bt-choice" key={c.take}>
                <strong>{c.take}</strong>
                <em>over</em>
                <span>{c.over}</span>
              </span>
            ))}
          </div>

          <div className="bt-pledge">
            {CREED.pledge.map((p) => <p key={p}>{p}</p>)}
          </div>

          <div className="bt-promise">
            <div className="bt-promise-title">Today’s promise to myself</div>
            <ul>
              {CREED.promises.map((p) => (
                <li key={p}><i className="ri-checkbox-circle-fill" />{p}</li>
              ))}
            </ul>
          </div>

          <p className="bt-reflect-close">{CREED.close}</p>
          <div className="bt-mantra">
            {CREED.mantra.map((m) => <span key={m}>{m}</span>)}
          </div>
          <p className="bt-last">{CREED.last}</p>
        </div>

        {/* Rotates daily so this screen is never the same wallpaper twice */}
        {focus && (
          <div className="bt-focus">
            <span className="bt-focus-tag">Today’s trap</span>
            <div className="bt-focus-body">
              <strong>{focus.title}</strong>
              <span className="bt-focus-cost">{focus.cost}</span>
            </div>
            <div className="bt-focus-rule">
              <i className="ri-shield-check-fill me-1" />{focus.rule}
            </div>
          </div>
        )}
      </section>

      {/* 1b — The life it's all for */}
      <section className="bt-vision">
        <div className="bt-vision-text">
          <div className="bt-vision-kicker"><i className="ri-road-map-line me-2" />{CREED.vision.kicker}</div>
          <div className="bt-vision-lines">
            {CREED.vision.lines.map((l) => <p key={l}>{l}</p>)}
          </div>
          <p className="bt-vision-close"><i className="ri-key-2-line me-2" />{CREED.vision.close}</p>
        </div>
        <div className="bt-vision-photos">
          <img src={tharImg} alt="The Thar on the open road" />
          <img src={boatImg} alt="Kerala backwaters" />
          <img src={manaliImg} alt="Manali mountains" />
        </div>
      </section>

      {/* 2 — What actually cost money */}
      <div className="bt-section-head">
        <h5><i className="ri-money-rupee-circle-line me-2" />The mistakes that cost me money</h5>
        <span className={'badge ' + (allRead ? 'bg-success' : 'bg-danger')}>
          {allRead
            ? <><i className="ri-check-double-line me-1" />All {MISTAKES.length} read today</>
            : `${state.readMistakes.length} / ${MISTAKES.length} read`}
        </span>
      </div>

      <div className="row g-3 mb-3">
        {critical.map((m) => (
          <div className="col-lg-4" key={m.id}>
            <MistakeCard m={m} read={state.readMistakes.includes(m.id)} onRead={markRead} />
          </div>
        ))}
      </div>
      <div className="row g-3 mb-4">
        {high.map((m) => (
          <div className="col-lg-4" key={m.id}>
            <MistakeCard m={m} read={state.readMistakes.includes(m.id)} onRead={markRead} />
          </div>
        ))}
      </div>

      {/* 3 — Morning playbook */}
      <div className="bt-section-head">
        <h5><i className="ri-sun-line me-2" />Morning playbook</h5>
        <span className="text-muted small">The first hour has no data in it yet.</span>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="bt-morning is-avoid">
            <div className="bt-morning-head"><i className="ri-close-circle-fill" />{MORNING.avoid.title}</div>
            <p className="bt-morning-why">{MORNING.avoid.why}</p>
            <ul>
              {MORNING.avoid.items.map((i) => <li key={i}><i className="ri-close-line" />{i}</li>)}
            </ul>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="bt-morning is-trust">
            <div className="bt-morning-head"><i className="ri-checkbox-circle-fill" />{MORNING.trust.title}</div>
            <p className="bt-morning-why">{MORNING.trust.why}</p>
            <ul>
              {MORNING.trust.items.map((i) => <li key={i}><i className="ri-check-line" />{i}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* 4 — What must be open on the laptop */}
      <div className="bt-section-head">
        <h5><i className="ri-macbook-line me-2" />Open on the laptop</h5>
        <span className={'badge ' + (allDone ? 'bg-success' : 'bg-secondary')}>{done} / {total}</span>
      </div>
      {/* Red until every window is actually open, green once it is. */}
      <div className={'card bt-panel mb-4 ' + (allDone ? 'is-ready' : 'is-notready')}>
        <div className="card-body">
          <div className="bt-progress mb-3">
            <div
              className={'bt-progress-bar' + (allDone ? ' is-done' : '')}
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
          <div className="row g-2">
            {SCREENS_OPEN.map((c) => {
              const on = state.checked.includes(c.id)
              return (
                <div className="col-md-6 col-xl-4" key={c.id}>
                  <div
                    className={'bt-screen' + (on ? ' is-on' : '') + (c.key ? ' is-key' : '')}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.id) }
                    }}
                  >
                    <span className="bt-screen-icon"><i className={c.icon} /></span>
                    <span className="bt-screen-text">
                      <strong>
                        {c.label}
                        {c.key && <span className="bt-screen-key">Key</span>}
                      </strong>
                      <small>{c.hint}</small>
                    </span>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bt-screen-link"
                        title={`Open ${c.label}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="ri-external-link-line" />
                      </a>
                    )}
                    <i className={'bt-screen-tick ' + (on ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line')} />
                  </div>
                </div>
              )
            })}
          </div>
          {allDone && (
            <div className="alert alert-success mt-3 mb-0 py-2">
              <i className="ri-check-double-line me-1" /> Everything is open and in front of me.
            </div>
          )}
        </div>
      </div>

      {/* 5 — Quantity, worked out from capital */}
      <div className="bt-section-head">
        <h5><i className="ri-calculator-fill me-2" />Quantity for today</h5>
        <span className="text-muted small">
          ₹{CAPITAL_PER_QTY}/qty · {LOT_SIZE} qty per lot · ₹{CAPITAL_RESERVE.toLocaleString('en-IN')} always kept out
        </span>
      </div>
      {/* Red until capital gives a tradable size, green once it does. */}
      <div className={'card bt-panel mb-4 ' + (plans ? 'is-ready' : 'is-notready')}>
        <div className="card-body">
          <div className="row g-3 align-items-end mb-3">
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small mb-1" htmlFor="bt-capital">Trading capital</label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  id="bt-capital"
                  type="number"
                  className="form-control"
                  placeholder="0"
                  value={capitalDraft}
                  onChange={(e) => setCapitalDraft(e.target.value)}
                  onBlur={commitCapital}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                />
              </div>
            </div>
            {qty && (
              <div className="col-sm-6 col-lg-9">
                <div className="bt-capital-flow">
                  <span><small>Capital</small>₹{qty.capital.toLocaleString('en-IN')}</span>
                  <i className="ri-subtract-line" />
                  <span className="is-reserve"><small>Kept out</small>₹{qty.reserve.toLocaleString('en-IN')}</span>
                  <i className="ri-arrow-right-line" />
                  <span className="is-usable"><small>Tradable</small>₹{qty.usable.toLocaleString('en-IN')}</span>
                  <i className="ri-arrow-right-line" />
                  <span className="is-max"><small>Max</small>{qty.maxQty} qty</span>
                </div>
              </div>
            )}
          </div>

          {!qty && <p className="text-muted mb-0">Enter your capital to get today’s quantity plan.</p>}
          {qty && !plans && (
            <div className="alert alert-warning mb-0 py-2">
              ₹{qty.capital.toLocaleString('en-IN')} leaves ₹{qty.usable.toLocaleString('en-IN')} after the
              reserve — not enough for one lot (needs ₹{qty.perLot.toLocaleString('en-IN')}).
            </div>
          )}

          {plans && (
            <>
              <div className="row g-3">
                {plans.map((p) => (
                  <div className="col-md-4" key={p.entries}>
                    <div className={'bt-plan bt-plan-e' + p.entries + (p.viable ? '' : ' is-dead')}>
                      <div className="bt-plan-head">
                        {p.entries} {p.entries === 1 ? 'entry' : 'entries'}
                        <small>{p.entries === 1 ? 'no averaging' : `1 entry + ${p.entries - 1} average${p.entries > 2 ? 's' : ''}`}</small>
                      </div>
                      {p.viable ? (
                        <>
                          <div className="bt-plan-qty">{p.qtyPerEntry}<small>qty each</small></div>
                          <div className="bt-plan-dots">
                            {Array.from({ length: p.entries }, (_, i) => (
                              <span key={i}>{p.qtyPerEntry}</span>
                            ))}
                          </div>
                          <div className="bt-plan-total">
                            {p.lotsPerEntry} lot{p.lotsPerEntry > 1 ? 's' : ''} each · {p.totalQty} total
                          </div>
                        </>
                      ) : (
                        <div className="bt-plan-dead">Not enough capital to split this far</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted small mb-0 mt-3">
                <i className="ri-information-line me-1" />
                Pick the plan <strong>before</strong> entering. Entries are whole lots, so an uneven split
                leaves a lot unused rather than going over capital.
              </p>
            </>
          )}
        </div>
      </div>

      {/* 5 — Patterns to review */}
      <div className="bt-section-head">
        <h5><i className="ri-line-chart-line me-2" />Patterns to review</h5>
        <Link className="btn btn-sm btn-soft-primary" to="/trading/chart-patterns">
          <i className="ri-add-line me-1" />Add / manage patterns
        </Link>
      </div>
      <div className="card bt-panel is-patterns mb-4">
        <div className="card-body">
          <ul className="nav nav-tabs nav-tabs-custom mb-3" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button" role="tab" aria-selected={patternTab === 'daily'}
                className={'nav-link' + (patternTab === 'daily' ? ' active' : '')}
                onClick={() => setPatternTab('daily')}
              >
                <i className="ri-star-line me-1" />Daily
                {dailyPatterns.length > 0 && <span className="badge bg-secondary ms-1">{dailyPatterns.length}</span>}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button" role="tab" aria-selected={patternTab === 'morning'}
                className={'nav-link' + (patternTab === 'morning' ? ' active' : '')}
                onClick={() => setPatternTab('morning')}
              >
                <i className="ri-sun-line me-1" />Morning Opening Trades
                {morningPatterns.length > 0 && <span className="badge bg-warning ms-1">{morningPatterns.length}</span>}
              </button>
            </li>
          </ul>

          {shownPatterns.length === 0 ? (
            <p className="text-muted text-center mb-0 py-3">
              {patterns.length === 0 ? (
                <>No patterns saved yet. <Link to="/trading/chart-patterns">Add the setups you trade</Link> so
                they’re in front of you every morning.</>
              ) : patternTab === 'morning' ? (
                <>No patterns tagged “Morning Opening Trades”.{' '}
                <Link to="/trading/chart-patterns">Tag the ones you watch at the open</Link> and they’ll appear here.</>
              ) : (
                <>None of your {patterns.length} patterns are marked for daily review.{' '}
                <Link to="/trading/chart-patterns">Star the ones that matter</Link> and they’ll appear here.</>
              )}
            </p>
          ) : (
            /* One full-width row per pattern: what to look for on the left,
               the chart on the right — so the notes are readable rather than
               truncated under a thumbnail. */
            <div className="bt-pattern-rows">
              {shownPatterns.map((p) => (
                <article className="bt-prow" key={p.id}>
                  <div className="bt-prow-text">
                    <header className="bt-prow-head">
                      <h6>{p.title}</h6>
                      {p.timeframe && <span className="badge bg-dark">{tfLabel(p.timeframe)}</span>}
                    </header>

                    {p.conditions?.length > 0 && (
                      <>
                        <div className="bt-prow-label">Price &amp; indicator positions</div>
                        <div className="bt-prow-chips">
                          {p.conditions.map((c) => <span key={c}>{c}</span>)}
                        </div>
                      </>
                    )}

                    {p.notes && (
                      <>
                        <div className="bt-prow-label">What to look for</div>
                        <p className="bt-prow-notes">{p.notes}</p>
                      </>
                    )}
                  </div>

                  <div className="bt-prow-img">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        role="button"
                        onClick={() => setZoom({ src: p.image, alt: p.title })}
                      />
                    ) : (
                      <div className="bt-pattern-empty"><i className="ri-image-line" /></div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      </>)}

      {tab === 'reviews' && (
        <div className="dr-tab">
          {/* Quick view — rules followed vs broken across every reviewed day */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3">
              <div className="dr-stat">
                <span className="dr-stat-label">Rules followed</span>
                <span className="dr-stat-value text-success">{stats.followedPct}%</span>
                <small>{stats.followed} of {stats.totalChecks} across {stats.days} day{stats.days === 1 ? '' : 's'}</small>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="dr-stat">
                <span className="dr-stat-label">Rules broken</span>
                <span className="dr-stat-value text-danger">{stats.broken}</span>
                <small>{stats.days ? (stats.broken / stats.days).toFixed(1) : 0} per day on average</small>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="dr-stat">
                <span className="dr-stat-label">Clean days</span>
                <span className="dr-stat-value text-primary">{stats.cleanDays}<em>/{stats.days}</em></span>
                <small>{cleanStreak > 0 ? `${cleanStreak} in a row right now` : 'no active streak'}</small>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="dr-stat">
                <span className="dr-stat-label">Most repeated</span>
                {stats.worst ? (
                  <>
                    <span className="dr-stat-worst">{stats.worst.title}</span>
                    <small>{stats.worst.count} day{stats.worst.count > 1 ? 's' : ''} — this is the one to fix</small>
                  </>
                ) : (
                  <><span className="dr-stat-value text-success">—</span><small>nothing repeating</small></>
                )}
              </div>
            </div>
          </div>

          <div className="bt-section-head">
            <h5><i className="ri-history-line me-2" />Every reviewed day</h5>
            <button className="btn btn-primary btn-sm" onClick={() => setReviewDate(today)}>
              <i className={(todayReview ? 'ri-pencil-line' : 'ri-add-line') + ' me-1'} />
              {todayReview ? 'Edit today' : 'Review today'}
            </button>
          </div>

          <div className="card bt-panel is-patterns">
            <div className="card-body">
              {reviews.length === 0 ? (
                <p className="text-muted text-center mb-0 py-4">
                  No reviews yet. After the close, hit <strong>Review today</strong> and be honest —
                  that record is what makes the pattern visible.
                </p>
              ) : (
                <div className="dr-rows">
                  {reviews.map((r) => {
                    const broken = r.mistakes.length
                    const followed = MISTAKES.length - broken
                    return (
                      <article
                        className={'dr-row' + (broken === 0 ? ' is-clean' : broken <= 2 ? ' is-mid' : ' is-bad')}
                        key={r.date}
                        role="button"
                        tabIndex={0}
                        onClick={() => setReviewDate(r.date)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReviewDate(r.date) }
                        }}
                      >
                        <div className="dr-row-date">
                          <strong>{fmtDay(r.date)}</strong>
                          <small>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</small>
                          {r.date === today && <span className="dr-row-today">Today</span>}
                        </div>

                        <div className="dr-row-score">
                          <span className="dr-row-followed">{followed}</span>
                          <span className="dr-row-sep">/</span>
                          <span className="dr-row-total">{MISTAKES.length}</span>
                          <small>followed</small>
                        </div>

                        <div className="dr-row-bar" title={`${followed} followed, ${broken} broken`}>
                          <span style={{ width: `${(followed / MISTAKES.length) * 100}%` }} />
                        </div>

                        <div className="dr-row-body">
                          {broken === 0 ? (
                            <span className="dr-row-clean"><i className="ri-check-double-line me-1" />Clean day — every rule held</span>
                          ) : (
                            <div className="dr-chips">
                              {r.mistakes.map((id) => {
                                const m = MISTAKES.find((x) => x.id === id)
                                return <span key={id}>{m ? m.title : id}</span>
                              })}
                            </div>
                          )}
                          {r.note && <p className="dr-row-note">{r.note}</p>}
                        </div>

                        <div className="dr-row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-ghost-secondary p-1"
                            title="Edit this review"
                            onClick={() => setReviewDate(r.date)}
                          >
                            <i className="ri-pencil-line" />
                          </button>
                          <button
                            className="btn btn-sm btn-ghost-danger p-1"
                            title="Delete this review"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(reviewDate)}
        size="lg"
        title={reviewDate && (
          <>
            <i className="ri-emotion-line me-2 text-primary" />
            {reviewDate === today ? 'How did I trade today?' : 'Review'} — {fmtFullDay(reviewDate)}
          </>
        )}
        onClose={() => { setReviewDate(null); setReviewError(null) }}
      >
        <ReviewForm
          /* Remount per day so switching days resets the ticks to that day's. */
          key={reviewDate}
          initial={editingReview}
          saving={savingReview}
          error={reviewError}
          onCancel={() => { setReviewDate(null); setReviewError(null) }}
          onSave={saveReview}
        />
      </Modal>

      {/* 7 — The full per-trade assessment, kept but out of the way */}
      {tab === 'prep' && (
        <div className="card">
          <div className="card-header d-flex align-items-center">
            <h5 className="card-title mb-0 flex-grow-1">
              <i className="ri-radar-line me-2" />Full pre-trade assessment
            </h5>
            <button className="btn btn-sm btn-light" onClick={() => setShowAssessment((v) => !v)}>
              {showAssessment ? 'Hide' : 'Open'}
            </button>
          </div>
          {showAssessment && (
            <div className="card-body">
              <div className="d-flex justify-content-end mb-2">
                <button className="btn btn-light btn-sm" onClick={() => setAnswers({})}>
                  <i className="ri-refresh-line me-1" />Reset
                </button>
              </div>
              <Assessment answers={answers} onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this review?"
        message={deleteTarget && (
          <>
            The review for <strong>{fmtFullDay(deleteTarget.date)}</strong> will be permanently removed
            {deleteTarget.mistakes.length > 0
              ? <> — including the {deleteTarget.mistakes.length} mistake{deleteTarget.mistakes.length > 1 ? 's' : ''} recorded that day.</>
              : ' — it was a clean day.'}
            {/* spans, not divs — ConfirmDialog renders `message` inside a <p> */}
            <span className="d-block small mt-2">
              It also drops out of your followed/broken stats and the clean-day streak.
            </span>
            {deleteError && (
              <span className="d-block text-danger small mt-2">
                <i className="ri-error-warning-line me-1" />{deleteError}
              </span>
            )}
          </>
        )}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />

      {zoom && <ImageLightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  )
}
