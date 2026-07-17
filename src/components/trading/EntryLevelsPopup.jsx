import { useEffect, useRef, useState } from 'react'
import {
  ENTRY_LEVELS, POPUP_INTERVAL_MS, SNOOZE_OPTIONS, QUALITY_CLASS,
} from './entryLevels'

/**
 * EntryLevelsPopup
 * -----------------------------------------------------------------------------
 * Nags you every POPUP_INTERVAL_MS to re-check where price actually is against
 * your entry levels, so entries happen AT a level instead of at random.
 *
 * Deliberately non-blocking: at a 10s cadence a modal would make the page
 * unusable, so this is a floating card you can keep working around. Bottom-LEFT
 * to stay clear of the trade coach (bottom-right) and the customizer gear
 * (mid-right).
 *
 * Close  → hides; it returns on the next tick.
 * Snooze → suppressed until the chosen time, and the choice survives a reload
 *          (otherwise refreshing the page would defeat the snooze).
 *
 * Levels/cadence/snooze choices all live in entryLevels.js.
 */
const KEY = 'hub.entryLevels.snoozeUntil'

const readSnooze = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

export default function EntryLevelsPopup() {
  const [visible, setVisible] = useState(false)
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze)

  // Held in a ref so the interval below never needs to be torn down/recreated
  // when the snooze changes.
  const snoozeRef = useRef(snoozedUntil)
  snoozeRef.current = snoozedUntil

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < snoozeRef.current) return
      setVisible(true)
    }, POPUP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const snooze = (ms) => {
    const until = Date.now() + ms
    setSnoozedUntil(until)
    setVisible(false)
    try {
      localStorage.setItem(KEY, String(until))
    } catch {
      /* storage unavailable — snooze just won't survive a reload */
    }
  }

  const resume = () => {
    setSnoozedUntil(0)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* non-fatal */
    }
  }

  const isSnoozed = Date.now() < snoozedUntil

  // While snoozed, leave a small handle so the reminder is never lost for good.
  if (isSnoozed && !visible) {
    return (
      <button className="entry-levels-handle" onClick={resume} title="Resume entry-level reminders">
        <i className="ri-alarm-line me-1" /> Reminders snoozed
      </button>
    )
  }

  if (!visible) return null

  return (
    <div className="entry-levels-popup card" role="dialog" aria-label="Entry levels">
      <div className="card-header d-flex align-items-start gap-2 py-3">
        <h6 className="mb-0 flex-grow-1">
          <i className="ri-focus-3-line me-1" /> Only enter at one of these. No level, no trade.
        </h6>
        <button className="btn-close btn-close-white" aria-label="Close" onClick={() => setVisible(false)} />
      </div>

      <div className="card-body py-2">
        <ul className="entry-levels-list">
          {ENTRY_LEVELS.map((lvl) => (
            <li key={lvl.id}>
              <span className="entry-levels-label">{lvl.label}</span>
              {lvl.quality && (
                <span className={`badge ${QUALITY_CLASS[lvl.quality] || 'bg-secondary'}`}>
                  {lvl.quality}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card-footer d-flex align-items-center gap-2 py-2">
        <span className="entry-levels-snooze-label">Snooze</span>
        {SNOOZE_OPTIONS.map((opt) => (
          <button key={opt.label} className="btn btn-sm btn-outline-light" onClick={() => snooze(opt.ms)}>
            {opt.label}
          </button>
        ))}
        <button className="btn btn-sm btn-light ms-auto" onClick={() => setVisible(false)}>
          Got it
        </button>
      </div>
    </div>
  )
}
