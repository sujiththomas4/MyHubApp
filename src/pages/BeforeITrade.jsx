import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Assessment from '@/components/trading/Assessment'
import ImageLightbox from '@/components/ui/ImageLightbox'
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

  const qty = quantityFor(capitalDraft)
  const plans = quantityPlans(capitalDraft)
  // Only the ones starred as "check this daily" belong on a pre-market screen.
  const dailyPatterns = patterns.filter((p) => p.featured)

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
        <h4 className="flex-grow-1 mb-0">Before I Trade</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Updates</li>
            <li className="breadcrumb-item active" aria-current="page">Before I Trade</li>
          </ol>
        </nav>
      </div>

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
            <p>{CREED.body}</p>
            <p className="bt-creed-line">{CREED.line}</p>
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
                    <div className={'bt-plan' + (p.viable ? '' : ' is-dead')}>
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
          {dailyPatterns.length === 0 ? (
            <p className="text-muted text-center mb-0 py-3">
              {patterns.length === 0 ? (
                <>No patterns saved yet. <Link to="/trading/chart-patterns">Add the setups you trade</Link> so
                they’re in front of you every morning.</>
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
              {dailyPatterns.map((p) => (
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

      {/* 6 — The full per-trade assessment, kept but out of the way */}
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

      {zoom && <ImageLightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  )
}
