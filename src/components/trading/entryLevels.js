/**
 * entryLevels.js
 * -----------------------------------------------------------------------------
 * CONFIG for the entry-level reminder popup. Edit this file to change the
 * levels, their quality, how often the reminder shows, or the snooze choices.
 *
 * The point of the popup: force a quick re-look at where price actually is
 * before taking a trade, so entries happen AT a level instead of at random.
 *
 * ── Adding a level ───────────────────────────────────────────────────────────
 *   { id: 'orb', label: 'Opening range high/low', quality: QUALITY.GOOD }
 *
 * `quality` may be omitted when a level isn't rated yet — it just renders
 * without a badge.
 */

// How often the reminder pops up (when not snoozed).
export const POPUP_INTERVAL_MS = 10_000

// Offered when you snooze the reminder.
export const SNOOZE_OPTIONS = [
  { label: '1 min', ms: 1 * 60_000 },
  { label: '3 min', ms: 3 * 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
]

export const QUALITY = {
  EXCELLENT: 'Excellent',
  VERY_GOOD: 'Very Good',
  GOOD: 'Good',
}

// Best levels first, so a glance lands on the highest-quality entries.
export const ENTRY_LEVELS = [
  { id: 'camarilla-cpr', label: 'Camarilla within CPR', quality: QUALITY.EXCELLENT },
  { id: 'vwap', label: 'VWAP — price is near', quality: QUALITY.VERY_GOOD },
  { id: 'prev-day-vwap', label: 'Previous day VWAP (till 10:30)', quality: QUALITY.VERY_GOOD },
  { id: 'camarilla', label: 'Camarilla', quality: QUALITY.GOOD },
  { id: 'ema-20', label: '20 EMA', quality: QUALITY.GOOD },
  { id: 'prev-day-hl', label: 'Previous day High / Low', quality: QUALITY.GOOD },
  { id: 'ema-9-retrace', label: 'Retracing to 9 EMA in a trending move', quality: QUALITY.GOOD },
]

// Quality -> bootstrap badge class. Avoids bg-primary on purpose: the accent
// preset is user-configurable (green by default), which would make "Very Good"
// indistinguishable from the green "Excellent" badge.
export const QUALITY_CLASS = {
  [QUALITY.EXCELLENT]: 'bg-success',
  [QUALITY.VERY_GOOD]: 'bg-info',
  [QUALITY.GOOD]: 'bg-light text-dark',
}
