/**
 * assessmentRules.js
 * -----------------------------------------------------------------------------
 * Read-only rule definitions + pure helpers for the pre-trade checklist.
 * Kept separate from <Assessment /> so both the Rule Book and the Journal can
 * import the data/logic without pulling in a component (and so Fast Refresh
 * stays happy).
 *
 * The rule DEFINITIONS are reference data — the user never edits the questions,
 * only picks answers.
 */

// Setup assessment — informational, pick what you observe.
export const assessment = [
  {
    id: 'global',
    label: 'Global market',
    hint: 'What is the broader market doing right now?',
    options: ['Bullish', 'Bearish', 'Neutral', 'Unable to predict'],
  },
  {
    id: 'oi',
    label: 'Open Interest (OI)',
    hint: 'Read of the option chain / OI build-up.',
    options: [
      'Strong Bullish',
      'Strong Bearish',
      'Neutral',
      'Bullish → turning Bearish',
      'Bearish → turning Bullish',
    ],
  },
  {
    id: 'vix',
    label: 'India VIX',
    hint: 'Volatility regime — expected move / fear gauge.',
    options: ['Low', 'Rising', 'High', 'Falling'],
  },
  {
    id: 'bias15',
    label: 'BIAS — 15 min',
    hint: 'Short-term trend on the 15-minute chart.',
    options: ['Bullish', 'Bearish', 'Neutral'],
  },
  {
    id: 'bias1h',
    label: 'BIAS — 1 hour',
    hint: 'Higher time-frame trend on the 1-hour chart.',
    options: ['Bullish', 'Bearish', 'Neutral'],
  },
  {
    id: 'sr',
    label: 'Price is near',
    hint: 'Where is price relative to key levels?',
    options: ['Support', 'Resistance', 'Neither / mid-range'],
  },
]

// Risk discipline — each has a `safe` answer that must be met to trade.
export const discipline = [
  { id: 'fomo', label: 'Am I entering this trade in FOMO?', options: ['No', 'Yes'], safe: 'No' },
  { id: 'maxqty', label: 'Max quantity is defined?', options: ['Yes', 'No'], safe: 'Yes' },
  { id: 'sl', label: 'Stop-loss (SL) is defined?', options: ['Yes', 'No'], safe: 'Yes' },
  { id: 'avg', label: 'I will average only once?', options: ['Yes', 'No'], safe: 'Yes' },
]

/* Directional arrow for a sentiment option: green ↑ bullish, red ↓ bearish,
   orange ↕ neutral / transitional. Returns null for non-directional options. */
export function sentiment(opt) {
  const o = String(opt).toLowerCase()
  if (o.includes('turning')) return { icon: 'ri-arrow-up-down-line', color: '#f7b84b' }
  if (o.includes('bullish')) return { icon: 'ri-arrow-up-line', color: '#0ab39c' }
  if (o.includes('bearish')) return { icon: 'ri-arrow-down-line', color: '#f06548' }
  if (o.includes('neutral')) return { icon: 'ri-arrow-up-down-line', color: '#f7b84b' }
  return null
}

/* Derive pass/fail state from a set of answers. */
export function evaluate(answers = {}) {
  const assessed = assessment.every((r) => answers[r.id])
  const disciplineOk = discipline.every((r) => answers[r.id] === r.safe)
  const failing = discipline.filter((r) => answers[r.id] && answers[r.id] !== r.safe)
  return { assessed, disciplineOk, failing, ready: assessed && disciplineOk }
}
