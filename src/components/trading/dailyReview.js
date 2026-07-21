/**
 * dailyReview.js
 * -----------------------------------------------------------------------------
 * CONFIG for the "Before I Trade" screen — the thing to read every morning
 * before the market opens.
 *
 * This is not a generic rule book. It's a record of the specific, repeated,
 * expensive mistakes of SIX YEARS of trading, written down so they get read
 * before the market makes them again. Everything here is editable.
 *
 * Sections:
 *   YEARS_TRADING / CREED  — the hard truth up top
 *   MISTAKES               — what actually cost money, and what it cost
 *   MORNING                — what to trust (and NOT trust) in the first hour
 *   PRE_TRADE_CHECKS       — the boxes to tick before any entry
 */

// Update this once a year. Drives the reality-check headline.
export const YEARS_TRADING = 6

export const CREED = {
  kicker: 'Read this before you click buy',
  headline: `${YEARS_TRADING} years in. The same handful of mistakes.`,
  body:
    'The market doesn’t take my money — I hand it over. Not one of these losses came ' +
    'from a setup I didn’t understand. They came from setups I understood perfectly ' +
    'and took anyway.',
  line: 'Knowing the rule was never the problem. Following it today is.',
}

/**
 * One mistake is spotlighted per day, rotating deterministically by date.
 *
 * A screen that looks identical every morning becomes wallpaper within a week —
 * which is exactly how the old rule book got ignored. Rotating the spotlight
 * means something is different each day, so there's a reason to actually look.
 *
 * @param dateIso 'YYYY-MM-DD'
 */
export function focusOfTheDay(dateIso, list = MISTAKES) {
  if (!list.length) return null
  // Day number since epoch — stable all day, advances exactly once per day.
  const days = Math.floor(Date.parse(`${dateIso}T00:00:00`) / 86400000)
  return list[((days % list.length) + list.length) % list.length]
}

/**
 * Tag types — drive the colour of the chips on each mistake card.
 *   account — a real broker account. Loudest on purpose: mixing up which
 *             account a trade belongs in is the most expensive mistake here,
 *             so the account name has to be spottable at a glance.
 *   when    — the session/day it happens on
 *   product — option buying vs selling
 *   habit   — the behaviour itself
 */
export const TAG = {
  ACCOUNT: 'account',
  WHEN: 'when',
  PRODUCT: 'product',
  HABIT: 'habit',
}

/**
 * The expensive ones. `cost` is what it actually did to the account — that's
 * the part worth remembering, not the rule itself.
 * severity: 'critical' (account-damaging) | 'high'
 */
export const MISTAKES = [
  {
    id: 'no-oi',
    severity: 'critical',
    icon: 'ri-bar-chart-box-fill',
    tags: [
      { label: 'OI', type: TAG.HABIT },
      { label: 'Camarilla', type: TAG.WHEN },
      { label: 'No data', type: TAG.HABIT },
    ],
    title: 'Entering without checking OI',
    detail: 'I take the trade on the level alone — even a clean Camarilla — without ever looking at OI.',
    cost: 'The level means nothing when OI is against it. Trading straight into the writers.',
    rule: 'OI is the key. Dominating side and % FIRST — the level only decides where, OI decides whether.',
  },
  {
    id: 'expiry-average',
    severity: 'critical',
    icon: 'ri-stack-fill',
    tags: [
      { label: 'Expiry day', type: TAG.WHEN },
      { label: 'Option buying', type: TAG.PRODUCT },
      { label: 'Averaging', type: TAG.HABIT },
    ],
    title: 'Averaging on expiry day',
    detail: 'Option buying on expiry, position goes against me, I average to “fix” it.',
    cost: 'Premium collapses to zero. Heavy loss, every time.',
    rule: 'On expiry: NO averaging. One entry, one SL, accept it.',
  },
  {
    id: 'dhan-account',
    severity: 'critical',
    icon: 'ri-safe-2-fill',
    tags: [
      { label: 'Dhan', type: TAG.ACCOUNT },
      { label: 'Option selling', type: TAG.PRODUCT },
      { label: 'Heavy quantity', type: TAG.HABIT },
    ],
    title: 'Option buying in the Dhan selling account',
    detail: 'The big Dhan account is for option SELLING. I take heavy-quantity option buys in it.',
    cost: 'Gave back everything the selling side earned. Months of work, gone.',
    rule: 'Dhan = option selling only. No buying in that account. Ever.',
  },
  {
    id: 'fomo-no-level',
    severity: 'critical',
    icon: 'ri-run-fill',
    tags: [
      { label: 'FOMO', type: TAG.HABIT },
      { label: 'Chasing', type: TAG.HABIT },
      { label: 'No level', type: TAG.HABIT },
      { label: 'No SL', type: TAG.HABIT },
    ],
    title: 'FOMO — chasing a move away from levels',
    detail: 'The move starts without me so I chase it, entering in mid-air because it “looks” like it’s going.',
    cost: 'Worst possible price, and no level means no invalidation — so no real SL and the loss just runs.',
    rule: 'Missed the entry = the trade is gone. Entry must be AT a level, or there is no trade.',
  },
  {
    id: 'not-present',
    severity: 'critical',
    icon: 'ri-mental-health-fill',
    tags: [
      { label: 'In a meeting', type: TAG.WHEN },
      { label: 'Family time', type: TAG.WHEN },
      { label: 'Distracted', type: TAG.HABIT },
    ],
    title: 'Trading when my mind isn’t on it',
    detail: 'Mind elsewhere, kids playing around, something to handle at home, or half-listening in a meeting — and I still take the trade.',
    cost: 'Always ends in a loss. Not one of these has ever gone well.',
    rule: 'Not fully present = strict NO trades. Set the mood in the coach and let the day go.',
  },
  {
    id: 'cold-start',
    severity: 'critical',
    icon: 'ri-timer-flash-fill',
    tags: [
      { label: 'No prep', type: TAG.HABIT },
      { label: 'No data', type: TAG.HABIT },
      { label: 'Mid-session', type: TAG.WHEN },
    ],
    title: 'Opening the laptop and trading within 5 minutes',
    detail: 'I open the laptop, glance at a 5-minute chart, and I’m already in a trade.',
    cost: 'Walking into a session already half over, with none of its context. No edge at all.',
    rule: 'Never trade the first thing I see. OI, VIX, global market, levels — then look for an entry.',
  },
  {
    id: 'repeat-touch',
    severity: 'high',
    icon: 'ri-repeat-2-fill',
    tags: [
      { label: 'Support / Resistance', type: TAG.WHEN },
      { label: 'Retest', type: TAG.HABIT },
    ],
    title: 'Trading the same level on repeat touches',
    detail: 'Price returns to the same support or resistance a second and third time, and I keep taking the bounce.',
    cost: 'Every retest chews through the orders holding it. The touch that finally breaks is the big loss.',
    rule: 'First touch is the trade. Second is a warning. Third means it’s breaking — stand aside.',
  },
  {
    id: 'random',
    severity: 'high',
    icon: 'ri-shuffle-fill',
    tags: [{ label: 'No data', type: TAG.HABIT }, { label: 'Impulse', type: TAG.HABIT }],
    title: 'Random trades off 2–3 candles',
    detail: 'I look at two or three candles, decide what happens next, and enter.',
    cost: 'No data, no level, no edge. Always ends in a loss.',
    rule: 'Two candles is not analysis. No data, no trade.',
  },
  {
    id: 'scalp-illusion',
    severity: 'high',
    icon: 'ri-magic-fill',
    tags: [{ label: 'Scalping', type: TAG.HABIT }, { label: 'False proof', type: TAG.HABIT }],
    title: 'Believing scalping always works',
    detail: 'A few small profits convince me this scalping works every time.',
    cost: 'Small wins, then one large loss that erases all of them.',
    rule: 'Small profits are not proof. One bad scalp erases twenty good ones.',
  },
]

/**
 * The first hour is different: today's intraday indicators have almost no data
 * in them yet, so they lie. Lean on yesterday and on the global picture instead.
 */
export const MORNING = {
  avoid: {
    title: 'Do NOT rely on these in the morning',
    why: 'Barely any data has formed yet — these will point you the wrong way.',
    items: ['9 EMA', 'Today’s VWAP', 'Today’s intraday trend (it doesn’t exist yet)'],
  },
  trust: {
    title: 'Rely on these instead',
    why: 'Fully formed before the open — real levels, real context.',
    items: [
      'Global market / Dow',
      'Pre-market read',
      'Previous day VWAP',
      'Camarilla / CPR',
      'Previous day High / Low / Close',
    ],
  },
}

/**
 * What has to be OPEN on the laptop and actually being watched before the first
 * trade — not a list of intentions, a list of windows. Ticked fresh each day.
 *
 * `url` is optional; when present the tile links straight to it.
 * Add your own with { id, label, hint, icon, url? }.
 */
export const SCREENS_OPEN = [
  {
    id: 'oipulse',
    label: 'Trending OI — OI Pulse',
    hint: 'The OI data. This is the one that decides whether I trade at all.',
    icon: 'ri-bar-chart-box-fill',
    url: 'https://oipulse.com/',
    key: true,
  },
  { id: 'chain', label: 'Option chain', hint: 'Read the decay before buying', icon: 'ri-table-2' },
  { id: 'premium', label: 'Premium chart', hint: 'The thing I’m actually buying', icon: 'ri-funds-fill' },
  { id: 'nifty', label: 'Nifty index + Future', hint: 'Both open, side by side', icon: 'ri-line-chart-fill' },
  { id: 'vix', label: 'VIX chart', hint: 'Volatility regime for the day', icon: 'ri-pulse-fill' },
  { id: 'global', label: 'Global market / Dow', hint: 'On its own chart, visible all session', icon: 'ri-earth-fill' },
]
