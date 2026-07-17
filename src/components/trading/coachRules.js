/**
 * coachRules.js
 * -----------------------------------------------------------------------------
 * CONFIG for the floating trade coach. This is the file you edit — add your own
 * signals and rules here and the widget picks them up with no other changes.
 *
 * ── THE MODEL ────────────────────────────────────────────────────────────────
 * Your state of mind gates everything. In a meeting / focused elsewhere ⇒ no
 * trades at all, whatever the chart says. Neutral ⇒ low quantity only. Good
 * mood ⇒ the market reads below decide.
 *
 * Then OI is king. Direction ALWAYS comes from the dominating OI side — the
 * coach never suggests trading against it. Every other read (5 min, 15 min,
 * VIX, premium) is a CONFLUENCE vote:
 *
 *   · votes agree with OI          → full size   ("Look for Buy only")
 *   · votes disagree with OI       → same direction, cut size
 *                                    ("Look for Buy — low quantity")
 *   · OI too weak / sideways       → don't trade at all
 *
 * ── Adding a SIGNAL ──────────────────────────────────────────────────────────
 * Pick-one signal — give it an `id` (used in rules), a `label`, and `options`:
 *
 *   { id: 'pcr', label: 'PCR', options: ['Above 1', 'Below 1'] }
 *
 * Number signal — for values you type in:
 *
 *   { id: 'iv', label: 'IV', type: 'number', suffix: '%' }
 *
 * To make a new signal vote on direction, add it to DIRECTION_OF below.
 *
 * ── Adding a RULE ────────────────────────────────────────────────────────────
 * `when` receives every signal by id, plus derived context, and returns true
 * when the message should show. `detail` may be a string or a function of the
 * same input.
 *
 *   {
 *     id: 'pcr-flip',
 *     message: 'PCR flipping — wait for confirmation',
 *     tone: 'warning',
 *     priority: 70,
 *     when: (s) => s.pcr === 'Above 1' && s.bias15 === 'Bearish',
 *   }
 *
 * tone:     'danger'  — do not trade (red, pulsing stop-sign)
 *           'warning' — caution / cut size (amber)
 *           'success' — green light, long side (green)
 *           'sell'    — green light, short side (red, but not a stop-sign)
 *           'info'    — neutral observation (blue)
 * priority: higher wins when several rules match. Keep "don't trade" rules
 *           highest so a stop-signal always beats a go-signal. Lower-priority
 *           matches still show as badges under the main message.
 *
 * Derived context available to `when` / `detail`:
 *   s.oiBias     — 'Bullish' | 'Bearish' | null   (from the dominating OI side)
 *   s.oiStrength — the OI change %, or null
 *   s.support    — how many other reads agree with oiBias
 *   s.oppose     — how many other reads disagree with oiBias
 *   s.opposing   — labels of the disagreeing reads, e.g. ['India VIX']
 *
 * Note: the pre-market snapshot deliberately does NOT feed the recommendation.
 */

// --- Thresholds --------------------------------------------------------------
// 40+ on the dominating side is a tradable build-up; under 35 is sideways.
// Between the two (35–39) is a deliberate grey zone: not strong enough to
// trade, not weak enough to call sideways — so the coach says "wait".
export const OI_STRONG = 40
export const OI_SIDEWAYS = 35

// How many disagreeing reads before the coach tells you to cut size.
// Raise to 2 if a single dissenting read shouldn't shrink your position.
export const LOW_QTY_OPPOSITION = 1

// Your own state of mind — a gate that sits above every market read.
// BUSY blocks trading outright; NEUTRAL forces low quantity even on a clean
// setup; GOOD lets the normal rules decide.
export const MOOD = {
  GOOD: 'Good Mood',
  NEUTRAL: 'Neutral',
  BUSY: 'In a meeting / focused elsewhere',
}

// --- The reads you set -------------------------------------------------------
// OI first — it decides direction; everything below only votes on size.
export const SIGNALS = [
  {
    id: 'oiSide',
    label: 'OI dominating side',
    options: ['Put', 'Call'],
    hint: 'Put dominating ⇒ put writing ⇒ bullish. Call ⇒ bearish. Trades are taken only with this side.',
  },
  {
    id: 'oiPct',
    label: 'OI change',
    type: 'number',
    suffix: '%',
    hint: `${OI_STRONG}%+ tradable · under ${OI_SIDEWAYS}% sideways`,
  },
  {
    id: 'bias5',
    label: 'BIAS — 5 min',
    options: ['Bullish', 'Bearish', 'Sideways'],
  },
  {
    id: 'bias15',
    label: 'BIAS — 15 min',
    options: ['Bullish', 'Bearish', 'Sideways'],
  },
  {
    id: 'vix',
    label: 'India VIX',
    options: ['Rising', 'Falling', 'Sideways'],
    hint: 'VIX rising ⇒ market may fall (bearish). Falling ⇒ bullish.',
  },
  {
    id: 'premium',
    label: 'Premium vs indicators',
    options: ['Above all indicators', 'Sideways', 'Below all indicators'],
    hint: 'Above ⇒ bullish, Below ⇒ bearish. Against the OI side ⇒ cut size.',
  },
  {
    id: 'mood',
    label: 'My state of mind',
    options: [MOOD.GOOD, MOOD.NEUTRAL, MOOD.BUSY],
    hint: 'In a meeting ⇒ no trades at all. Neutral ⇒ low quantity only.',
  },
]

/**
 * What each non-OI read means directionally. Options not listed here (e.g.
 * 'Sideways') are neutral — they neither support nor oppose.
 * Add an entry here to make a new signal vote on size.
 */
const DIRECTION_OF = {
  bias5: { Bullish: 'Bullish', Bearish: 'Bearish' },
  bias15: { Bullish: 'Bullish', Bearish: 'Bearish' },
  vix: { Falling: 'Bullish', Rising: 'Bearish' }, // VIX up ⇒ market down
  premium: { 'Above all indicators': 'Bullish', 'Below all indicators': 'Bearish' },
}

const labelOf = (id) => SIGNALS.find((s) => s.id === id)?.label || id

/**
 * Read direction + strength from the dominating OI side and its change %.
 *
 * Convention: the dominating OI build-up is the side being WRITTEN, and writers
 * defend their strike — so PUT dominating builds support (bullish) and CALL
 * dominating builds resistance (bearish).
 *
 * @returns { bias: 'Bullish'|'Bearish'|null, strength: number|null }
 */
export function oiRead({ oiSide, oiPct } = {}) {
  const pct = Number(oiPct)
  const hasPct = oiPct !== '' && oiPct != null && Number.isFinite(pct)
  const bias = oiSide === 'Put' ? 'Bullish' : oiSide === 'Call' ? 'Bearish' : null
  return { bias, strength: hasPct ? pct : null }
}

/**
 * Tally how the other reads vote relative to the OI direction.
 * @returns { support, oppose, supporting: string[], opposing: string[] } (labels)
 */
export function confluence(signals = {}, oiBias = null) {
  const supporting = []
  const opposing = []
  if (oiBias) {
    for (const [id, map] of Object.entries(DIRECTION_OF)) {
      const dir = map[signals[id]]
      if (!dir) continue
      ;(dir === oiBias ? supporting : opposing).push(labelOf(id))
    }
  }
  return { support: supporting.length, oppose: opposing.length, supporting, opposing }
}

/* Detail line for the low-quantity calls — spells out every reason size is
   being cut, so the message is never just "trust me". */
const lowQtyDetail = (dir) => (s) => {
  const reasons = []
  if (s.opposing.length) {
    reasons.push(`${s.opposing.join(', ')} ${s.opposing.length > 1 ? 'disagree' : 'disagrees'}`)
  }
  if (s.mood === MOOD.NEUTRAL) reasons.push('your mood is only neutral')
  const why = reasons.length ? ` — ${reasons.join(', and ')}` : ''
  return `OI is ${dir}${why}. Trade the OI side with low quantity, and observe before committing.`
}

// --- The messages ------------------------------------------------------------
// Listed roughly by priority for readability; `priority` is what decides.
export const RULES = [
  {
    id: 'mood-block',
    message: 'Strict NO trades',
    detail: 'You are in a meeting or focused on other things. This is not the time to trade.',
    tone: 'danger',
    priority: 120, // above every market read — being away beats any setup
    when: (s) => s.mood === MOOD.BUSY,
  },
  {
    id: 'bias-sideways',
    message: 'Side Ways — Dont trade',
    detail: 'A time-frame is sideways. No trend to ride — sitting out is a position.',
    tone: 'danger',
    priority: 100,
    when: (s) => s.bias5 === 'Sideways' || s.bias15 === 'Sideways',
  },
  {
    id: 'oi-sideways',
    message: 'Side Ways — stay tuned',
    detail: `OI build-up under ${OI_SIDEWAYS}%. Wait for a better entry and trend confirmation.`,
    tone: 'danger',
    priority: 95,
    when: (s) => s.oiStrength != null && s.oiStrength < OI_SIDEWAYS,
  },
  {
    id: 'oi-building',
    message: 'OI building up — wait for confirmation',
    detail: `Between ${OI_SIDEWAYS}% and ${OI_STRONG}%: not strong enough to trade yet.`,
    tone: 'warning',
    priority: 75,
    when: (s) => s.oiStrength != null && s.oiStrength >= OI_SIDEWAYS && s.oiStrength < OI_STRONG,
  },

  // --- Tradable: direction is always the OI side ---
  // A neutral mood forces low quantity even when every read agrees.
  {
    id: 'oi-buy-low',
    message: 'Look for Buy — low quantity',
    detail: lowQtyDetail('bullish'),
    tone: 'warning',
    priority: 62,
    when: (s) =>
      s.oiBias === 'Bullish' && s.oiStrength >= OI_STRONG &&
      (s.oppose >= LOW_QTY_OPPOSITION || s.mood === MOOD.NEUTRAL),
  },
  {
    id: 'oi-sell-low',
    message: 'Look for Sell — low quantity',
    detail: lowQtyDetail('bearish'),
    tone: 'warning',
    priority: 62,
    when: (s) =>
      s.oiBias === 'Bearish' && s.oiStrength >= OI_STRONG &&
      (s.oppose >= LOW_QTY_OPPOSITION || s.mood === MOOD.NEUTRAL),
  },
  {
    id: 'oi-buy',
    message: 'Look for Buy only',
    detail: `Put side dominating ${OI_STRONG}%+ and nothing disagrees. Wait for your entry.`,
    tone: 'success',
    priority: 60,
    when: (s) =>
      s.oiBias === 'Bullish' && s.oiStrength >= OI_STRONG &&
      s.oppose < LOW_QTY_OPPOSITION && s.mood !== MOOD.NEUTRAL,
  },
  {
    id: 'oi-sell',
    message: 'Look for Sell',
    detail: `Call side dominating ${OI_STRONG}%+ and nothing disagrees. Wait for your entry.`,
    tone: 'sell',
    priority: 60,
    when: (s) =>
      s.oiBias === 'Bearish' && s.oiStrength >= OI_STRONG &&
      s.oppose < LOW_QTY_OPPOSITION && s.mood !== MOOD.NEUTRAL,
  },
  {
    id: 'no-oi',
    message: 'Set the OI read first',
    detail: 'Trades are taken only with the OI side — set the dominating side and %.',
    tone: 'info',
    priority: 40,
    when: (s) => !s.oiBias && Boolean(s.bias5 || s.bias15 || s.vix || s.premium),
  },
]

/**
 * Match the current reads against RULES.
 * @param signals object keyed by SIGNAL id, e.g. { bias5: 'Bullish', oiPct: 45 }
 * @param context optional extras merged in for rules to use
 * @returns matching rules, highest priority first (empty when nothing matches)
 */
export function evaluateCoach(signals = {}, context = {}) {
  const { bias: oiBias, strength: oiStrength } = oiRead(signals)
  const { support, oppose, supporting, opposing } = confluence(signals, oiBias)
  const input = { ...signals, ...context, oiBias, oiStrength, support, oppose, supporting, opposing }

  return RULES
    .filter((rule) => {
      // A broken user-written condition should never take the page down.
      try {
        return Boolean(rule.when(input))
      } catch {
        return false
      }
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .map((rule) => ({
      ...rule,
      detail: typeof rule.detail === 'function' ? rule.detail(input) : rule.detail,
    }))
}
