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

// --- Position sizing ---------------------------------------------------------
// Capital needed per 1 quantity, and how many quantity make a lot.
export const CAPITAL_PER_QTY = 200
export const LOT_SIZE = 65

/* Always held back and never traded. Subtracted before any quantity is worked
   out, so every screen quotes a size the account can actually survive. */
export const CAPITAL_RESERVE = 30_000

// Most entries a position may be split into (1 entry + up to 2 averages).
export const MAX_ENTRIES = 3

/**
 * Turn the day's trading capital into a tradable size.
 *
 * Options only trade in whole lots, so the affordable quantity is rounded DOWN
 * to a lot boundary — rounding up would quietly put you over your capital.
 *
 * Because you allow yourself exactly one average, the ENTRY size is half the
 * cap — that keeps the other half in reserve for it. A single lot can't be
 * split, so there entry == max and `canAverage` is false: averaging at all
 * would breach the capital.
 *
 * @returns null when no usable capital is set, otherwise
 *   { capital, affordableQty, lots, maxQty, entryQty, canAverage, perLot }
 *   - affordableQty: raw capital / 200, before lot rounding
 *   - maxQty:        the real cap — whole lots only
 *   - entryQty:      what to open the position with
 */
export function quantityFor(capital) {
  const c = Number(capital)
  if (!Number.isFinite(c) || c <= 0) return null
  // The reserve never trades — take it off the top before sizing anything.
  const usable = Math.max(0, c - CAPITAL_RESERVE)
  const affordableQty = Math.floor(usable / CAPITAL_PER_QTY)
  const lots = Math.floor(affordableQty / LOT_SIZE)
  const entryLots = Math.floor(lots / 2)
  return {
    capital: c,
    reserve: CAPITAL_RESERVE,
    usable,
    affordableQty,
    lots,
    maxQty: lots * LOT_SIZE,
    entryQty: entryLots > 0 ? entryLots * LOT_SIZE : lots * LOT_SIZE,
    canAverage: entryLots > 0,
    perLot: LOT_SIZE * CAPITAL_PER_QTY, // capital one lot ties up
  }
}

/**
 * The same capital split three ways: all-in-one, two entries, or three.
 * Decide WHICH plan before entering — that's what stops an unplanned average
 * turning into a third and a fourth.
 *
 * Each entry is a whole number of lots, so `totalQty` can be below `maxQty`
 * when the lots don't divide evenly (7 lots over 3 entries = 2 each, 1 unused).
 * Rounding up instead would breach the capital.
 *
 * @returns null when nothing is tradable, else an array of MAX_ENTRIES plans
 */
export function quantityPlans(capital) {
  const q = quantityFor(capital)
  if (!q || q.lots < 1) return null
  return Array.from({ length: MAX_ENTRIES }, (_, i) => {
    const entries = i + 1
    const lotsPerEntry = Math.floor(q.lots / entries)
    return {
      entries,
      lotsPerEntry,
      qtyPerEntry: lotsPerEntry * LOT_SIZE,
      totalLots: lotsPerEntry * entries,
      totalQty: lotsPerEntry * entries * LOT_SIZE,
      viable: lotsPerEntry >= 1,
    }
  })
}

// --- Discipline reminders ----------------------------------------------------
// Shown under the levels. Edit freely — add/remove/reword.
//   type: 'do'   -> green tick   (things to always do)
//         'dont' -> red cross    (things to never do)
export const TRADE_RULES = [
  { id: 'levels', type: 'do', text: 'Trade only on levels — no level, no trade' },
  { id: 'average', type: 'do', text: 'Only 1 average. Never a second one' },
  { id: 'sl', type: 'do', text: 'Define your SL before entering — not after' },
  { id: 'points', type: 'do', text: 'Look for more points. Don’t exit early' },
  { id: 'data', type: 'do', text: 'Data is the key — never trade without data' },
  { id: 'random', type: 'dont', text: 'No random trades' },
  { id: 'fomo', type: 'dont', text: 'No FOMO — the next setup will come' },
]

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

/**
 * How each tier is drawn. Literal hex rather than theme vars: the popup is a
 * fixed light surface in both themes, and the accent preset is user-swappable
 * (green by default) — which would make a themed "Very Good" identical to the
 * green "Excellent".
 *
 * `stars` is the weight the tier carries at a glance — the whole point of the
 * grouping is that a Camarilla-in-CPR is not the same trade as a 20 EMA touch.
 */
export const QUALITY_META = {
  [QUALITY.EXCELLENT]: { color: '#0ab39c', tint: '#e7f8f5', stars: 3, note: 'Best entry — size up to your max' },
  [QUALITY.VERY_GOOD]: { color: '#299cdb', tint: '#e8f4fc', stars: 2, note: 'Strong entry' },
  [QUALITY.GOOD]: { color: '#f7b84b', tint: '#fdf4e4', stars: 1, note: 'Playable — keep size honest' },
}

// Best first. Drives the render order of the tiers.
export const QUALITY_ORDER = [QUALITY.EXCELLENT, QUALITY.VERY_GOOD, QUALITY.GOOD]

/** Group ENTRY_LEVELS into tiers, best first. Empty tiers are dropped. */
export function levelsByTier() {
  return QUALITY_ORDER
    .map((quality) => ({
      quality,
      ...QUALITY_META[quality],
      levels: ENTRY_LEVELS.filter((l) => l.quality === quality),
    }))
    .filter((t) => t.levels.length > 0)
}
