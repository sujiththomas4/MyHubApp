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

/**
 * The morning read. Written first-person on purpose — it's me talking to me,
 * not advice from anyone else. Every line here is editable; it only works if it
 * stays in my own words.
 */
export const CREED = {
  kicker: 'Read this before placing a single order',
  headline: `For the last ${YEARS_TRADING} years, I have known what my mistakes are.`,

  // Named plainly. Vague regret changes nothing; these do.
  known: [
    'I exited winning trades too early.',
    'I averaged losing positions instead of accepting a small loss.',
    'I traded oversized quantities, especially on expiry days.',
    'I let emotions make decisions instead of following my system.',
  ],

  turning: [
    'None of these mistakes happened because I didn’t know better. They happened because I chose emotion over discipline.',
    `If I continue trading the same way I have for the last ${YEARS_TRADING} years, I will most likely spend the next ${YEARS_TRADING} years repeating the same cycle.`,
  ],
  turningLine: 'Nothing changes unless I change.',

  system: [
    'My trading system has already defined my edge. My job is not to predict the market. My job is to execute the system exactly as it is designed.',
    'Every time I break a rule, I move farther away from the life I want.',
  ],

  wants: [
    'I want financial freedom.',
    'I want peace of mind.',
    'I want a beautiful life where money is a tool, not a source of stress.',
  ],
  wantsClose:
    'That life will never be built through impulsive trades, revenge trading, oversized positions, or breaking my own rules. ' +
    'It will be built one disciplined trade at a time.',

  // "Today, I choose ___ over ___."
  choices: [
    { take: 'Discipline', over: 'emotion' },
    { take: 'Consistency', over: 'excitement' },
    { take: 'Process', over: 'profits' },
    { take: 'Patience', over: 'fear' },
    { take: 'Execution', over: 'prediction' },
  ],

  pledge: [
    'I do not need to make money today.',
    'I need to become the trader who follows the system every single day.',
    'If I protect my process, the profits will follow.',
  ],

  promises: [
    'I will follow my trading system without exception.',
    'I will accept small losses without averaging.',
    'I will respect my predefined position size.',
    'I will never increase quantity because of emotion.',
    'I will let winners play out according to the plan.',
    'I will not judge today’s result. I will judge only whether I followed my rules.',
  ],

  close: 'My future is being built by the decisions I make in the next few minutes.',
  mantra: ['Trade the system.', 'Trust the process.', 'Respect the rules.'],
  last: 'Everything I want is on the other side of consistent discipline.',

  /* The life this is all FOR — read it, feel it, then trade like it matters. */
  vision: {
    kicker: 'This is what I’m trading for',
    lines: [
      'A Thar in the driveway and the road wide open — across Kerala, across India, across the world.',
      'Land in Mumbai on my own terms. Book the hotel. Book the table at the bar. Trade from there, make the money.',
      'Then go and see the people I love — visit relatives, wander, explore, with nowhere I have to be.',
      'No meetings. No deadlines. No “new framework” to relearn. No client on a call at 9pm.',
      'Just me, the market, and a freedom that answers to no one.',
    ],
    close: 'And all of it is bought with one currency — the discipline I show TODAY. Not tomorrow. Today.',
  },
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
  {
    id: 'overtrading',
    severity: 'high',
    icon: 'ri-numbers-fill',
    tags: [
      { label: 'Overtrading', type: TAG.HABIT },
      { label: '50+ trades', type: TAG.HABIT },
    ],
    title: 'Taking too many trades',
    detail: 'More than 50 trades in a day — clicking for the sake of clicking, not because a setup appeared.',
    cost: 'Brokerage and slippage bleed the account even on a flat day. Quantity is not an edge.',
    rule: 'A few good trades beat fifty average ones. If I’ve crossed 50, I’m done for the day.',
  },
  {
    id: 'exit-early-fear',
    severity: 'critical',
    icon: 'ri-door-open-fill',
    tags: [
      { label: 'Exited early', type: TAG.HABIT },
      { label: 'Fear', type: TAG.HABIT },
      { label: 'Weak indicator', type: TAG.HABIT },
    ],
    title: 'Exiting a valid trade out of fear',
    detail: 'The trade was taken on data and every criterion — then I bailed on a single candle breaking a weak indicator, or just fear.',
    cost: 'Cutting the winners that pay for the losers. The edge only works if I let it play out.',
    rule: 'I exit on my SL or my target — not on one candle, not on a weak indicator, not on fear.',
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
  { id: 'vix', label: 'VIX & Crude Oil', hint: 'Volatility regime + crude for the day', icon: 'ri-pulse-fill' },
  { id: 'global', label: 'Global market / Dow', hint: 'On its own chart, visible all session', icon: 'ri-earth-fill' },
]
