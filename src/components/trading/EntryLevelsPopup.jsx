import { useEffect, useRef, useState } from 'react'
import {
  POPUP_INTERVAL_MS, SNOOZE_OPTIONS, TRADE_RULES, levelsByTier, quantityFor, quantityPlans,
} from './entryLevels'

/**
 * EntryLevelsPopup
 * -----------------------------------------------------------------------------
 * Nags you every POPUP_INTERVAL_MS to re-check where price actually is against
 * your entry levels, so entries happen AT a level instead of at random.
 *
 * Design intent: the levels are GRADED, and that grading is the point — a
 * Camarilla-inside-CPR is not the same trade as a 20 EMA touch. So they're
 * grouped into tiers, best first, each with its own colour rail and star
 * weight, instead of seven identical rows you'd stop reading after a week.
 * Then the size cap as one hero number, then the do/don't rules.
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
 * Levels/cadence/snooze/rules all live in entryLevels.js.
 */
const KEY = 'hub.entryLevels.snoozeUntil'

const readSnooze = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

const Stars = ({ n }) => (
  <span className="elp-stars" aria-label={`${n} of 3`}>
    {[1, 2, 3].map((i) => (
      <i key={i} className={i <= n ? 'ri-star-fill' : 'ri-star-line is-off'} />
    ))}
  </span>
)

export default function EntryLevelsPopup({ capital }) {
  const [visible, setVisible] = useState(false)
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze)
  const qty = quantityFor(capital)
  const plans = quantityPlans(capital)
  const tiers = levelsByTier()

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

  const dos = TRADE_RULES.filter((r) => r.type !== 'dont')
  const donts = TRADE_RULES.filter((r) => r.type === 'dont')

  return (
    <div className="entry-levels-popup" role="dialog" aria-label="Entry levels">
      <header className="elp-head">
        <span className="elp-head-icon"><i className="ri-focus-3-line" /></span>
        <span className="elp-head-text">
          <span className="elp-title">Only enter at one of these</span>
          <span className="elp-sub">No level, no trade.</span>
        </span>
        <button className="btn-close elp-close" aria-label="Close" onClick={() => setVisible(false)} />
      </header>

      <div className="elp-body">
        {/* Left — the graded levels */}
        <div className="elp-col">
          {tiers.map((tier) => (
            <div className="elp-tier" key={tier.quality} style={{ '--tier': tier.color, '--tier-tint': tier.tint }}>
              <div className="elp-tier-head">
                <Stars n={tier.stars} />
                <span className="elp-tier-name">{tier.quality}</span>
                <span className="elp-tier-note">{tier.note}</span>
              </div>
              <ul className="elp-levels">
                {tier.levels.map((lvl) => (
                  <li key={lvl.id}>
                    <i className="ri-check-line" />
                    <span>{lvl.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Middle — the size cap, as one number you can't miss */}
        <div className="elp-col elp-col-hero">
          <div className="elp-hero">
            {qty && qty.lots > 0 ? (
              <>
                <span className="elp-hero-label">Max quantity</span>
                <span className="elp-hero-value">{qty.maxQty}</span>
                <span className="elp-hero-lots">{qty.lots} lot{qty.lots > 1 ? 's' : ''}</span>

                {/* Same three plans as the Before I Trade screen — decide which
                    one BEFORE entering, so an average is planned, not improvised. */}
                <div className="elp-plans">
                  {(plans || []).map((p) => (
                    <div className={'elp-plan' + (p.viable ? '' : ' is-dead')} key={p.entries}>
                      <span className="elp-plan-n">
                        {p.entries} {p.entries === 1 ? 'trade' : 'entries'}
                      </span>
                      <span className="elp-plan-qty">{p.viable ? p.qtyPerEntry : '—'}</span>
                      <small>{p.viable ? (p.entries === 1 ? 'all at once' : 'qty each') : 'too small'}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="elp-hero-empty">
                <i className="ri-wallet-3-line d-block mb-2" />
                {qty ? 'Capital is under one lot' : 'Set your capital to get today’s max quantity'}
              </div>
            )}
          </div>
        </div>

        {/* Right — the discipline, stacked */}
        <div className="elp-col elp-rules">
          <div className="elp-rule-group">
            <div className="elp-rule-head is-do"><i className="ri-check-double-line" /> Always</div>
            <ul className="elp-rule-col">
              {dos.map((r) => (
                <li key={r.id} className="is-do">
                  <i className="ri-checkbox-circle-fill" /><span>{r.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="elp-rule-group">
            <div className="elp-rule-head is-dont"><i className="ri-forbid-2-line" /> Never</div>
            <ul className="elp-rule-col">
              {donts.map((r) => (
                <li key={r.id} className="is-dont">
                  <i className="ri-close-circle-fill" /><span>{r.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="elp-foot">
        <span className="elp-snooze-label">Snooze</span>
        {SNOOZE_OPTIONS.map((opt) => (
          <button key={opt.label} className="btn btn-sm btn-outline-secondary" onClick={() => snooze(opt.ms)}>
            {opt.label}
          </button>
        ))}
        <button className="btn btn-sm btn-primary ms-auto" onClick={() => setVisible(false)}>
          Got it
        </button>
      </footer>
    </div>
  )
}
