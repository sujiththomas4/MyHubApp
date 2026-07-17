import { useEffect, useMemo, useState } from 'react'
import { SIGNALS, evaluateCoach, oiRead } from './coachRules'

/**
 * TradeCoach
 * -----------------------------------------------------------------------------
 * Floating coach that tells you when to trade and — more importantly — when not
 * to. You set your live market reads in the "Market now" panel; the rules in
 * coachRules.js turn those into a message.
 *
 * Edit coachRules.js to add signals/messages. Nothing here needs to change.
 *
 * The reads are "right now", so they're stamped with today's date and stored
 * per-device in localStorage. Opening the page on a new day starts clean rather
 * than showing yesterday's stale read.
 */
const KEY = 'hub.coach.signals'

function readStored(today) {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === today) return parsed.signals || {}
    }
  } catch {
    /* ignore malformed storage */
  }
  return {}
}

// tone -> bootstrap classes + icon.
// `coach-stop` (danger only) is what drives the pulse — the sell tone is red
// too, but it's a green light for the short side, not a stop-sign.
const TONES = {
  danger: { bg: 'bg-danger coach-stop', text: 'text-white', icon: 'ri-forbid-2-line' },
  sell: { bg: 'bg-danger', text: 'text-white', icon: 'ri-arrow-down-line' },
  warning: { bg: 'bg-warning', text: 'text-dark', icon: 'ri-alert-line' },
  success: { bg: 'bg-success', text: 'text-white', icon: 'ri-check-double-line' },
  info: { bg: 'bg-info', text: 'text-white', icon: 'ri-information-line' },
}

export default function TradeCoach({ today }) {
  const [signals, setSignals] = useState(() => readStored(today))
  const [open, setOpen] = useState(false)

  // Persist the reads against the day they were made.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ date: today, signals }))
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [today, signals])

  // Drop yesterday's reads if the page is left open across midnight.
  useEffect(() => {
    setSignals(readStored(today))
  }, [today])

  const matches = useMemo(() => evaluateCoach(signals), [signals])
  const top = matches[0]
  const tone = TONES[top?.tone] || TONES.info

  const pick = (id, option) =>
    setSignals((s) => ({ ...s, [id]: s[id] === option ? undefined : option }))
  // Kept as a raw string while typing so partial input ('', '-', '4.') doesn't
  // fight the field; coachRules coerces with Number().
  const setNumber = (id, raw) =>
    setSignals((s) => ({ ...s, [id]: raw === '' ? undefined : raw }))
  const clear = () => setSignals({})
  const anySet = Object.values(signals).some((v) => v !== undefined && v !== '')

  const oi = oiRead(signals)

  return (
    <div className="trade-coach">
      {/* The message */}
      <button
        type="button"
        className={`coach-banner ${top ? `${tone.bg} ${tone.text}` : 'coach-idle'}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Set your market read"
      >
        <i className={`${top ? tone.icon : 'ri-compass-3-line'} coach-icon`} />
        <span className="coach-text">
          <strong>{top ? top.message : 'Set your market read'}</strong>
          {top?.detail && <small className="d-block">{top.detail}</small>}
          {!top && anySet && <small className="d-block">No rule matches this read.</small>}
        </span>
        <i className={`ri-arrow-${open ? 'down' : 'up'}-s-line ms-auto`} />
      </button>

      {/* Other rules that also matched, so a green light never hides a warning */}
      {!open && matches.length > 1 && (
        <div className="coach-more">
          {matches.slice(1).map((m) => (
            <span key={m.id} className={`badge ${TONES[m.tone]?.bg || 'bg-secondary'}`}>
              {m.message}
            </span>
          ))}
        </div>
      )}

      {/* Market now panel */}
      {open && (
        <div className="coach-panel card mb-0">
          <div className="card-header py-2">
            <h6 className="mb-0">Market now</h6>
          </div>
          <div className="card-body py-2">
            {SIGNALS.map((sig) => (
              <div className="coach-signal" key={sig.id}>
                <label className="coach-signal-label" htmlFor={`coach-${sig.id}`}>
                  {sig.label}
                </label>
                {sig.type === 'number' ? (
                  <div className="input-group input-group-sm">
                    <input
                      id={`coach-${sig.id}`}
                      type="number"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="0"
                      value={signals[sig.id] ?? ''}
                      onChange={(e) => setNumber(sig.id, e.target.value)}
                    />
                    {sig.suffix && <span className="input-group-text">{sig.suffix}</span>}
                  </div>
                ) : (
                  <div className="d-flex flex-wrap gap-1">
                    {sig.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={'btn btn-sm ' + (signals[sig.id] === opt ? 'btn-primary' : 'btn-light')}
                        onClick={() => pick(sig.id, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {sig.hint && <div className="coach-signal-hint">{sig.hint}</div>}
              </div>
            ))}

            {/* Derived OI read, so the direction is never a guess */}
            {oi.bias && (
              <div className="d-flex align-items-center gap-2 mb-2 small">
                <span className="text-muted">OI read:</span>
                <span className={'badge ' + (
                  oi.bias === 'Bullish' ? 'bg-success'
                    : oi.bias === 'Bearish' ? 'bg-danger' : 'bg-secondary'
                )}>
                  {oi.bias} · {oi.strength}%
                </span>
              </div>
            )}
            <button className="btn btn-sm btn-soft-danger w-100 mt-1" onClick={clear} disabled={!anySet}>
              <i className="ri-eraser-line me-1" /> Clear reads
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
