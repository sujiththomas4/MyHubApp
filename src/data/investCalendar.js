/**
 * investCalendar.js — the "invest on the 25th (or next trading day)" schedule
 * shared by the Eva & Ezaak plans. Pure helpers.
 */
const pad = (n) => String(n).padStart(2, '0')
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

const isClosed = (d, holidays) => d.getDay() === 0 || d.getDay() === 6 || holidays.has(isoOf(d))
const rollForward = (d, holidays) => { const x = new Date(d); while (isClosed(x, holidays)) x.setDate(x.getDate() + 1); return x }

/**
 * Next investment date. today: Date; holidays: Set<'YYYY-MM-DD'>;
 * monthRecorded: is the CURRENT month's allotment already recorded?
 */
export function nextInvestmentDate(today, holidays, monthRecorded) {
  const t = new Date(today); t.setHours(0, 0, 0, 0)
  let cand = new Date(t.getFullYear(), t.getMonth(), 25)
  if (t > cand && monthRecorded) cand = new Date(t.getFullYear(), t.getMonth() + 1, 25)
  return rollForward(cand, holidays)
}

export function daysLeft(target, today = new Date()) {
  const t = new Date(today); t.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - t.getTime()) / 86400000)
}

/** True when it's past the 25th this month and no allotment recorded. */
export function isPending(today, monthRecorded) {
  const t = new Date(today); t.setHours(0, 0, 0, 0)
  return t.getDate() > 25 && !monthRecorded
}

/** Next quarterly review month (Jan / Apr / Jul / Oct), as a Date on the 1st. */
export function nextReviewMonth(today = new Date()) {
  const months = [0, 3, 6, 9]
  const y = today.getFullYear(); const m = today.getMonth()
  let rm = months.find((x) => x >= m); let ry = y
  if (rm === undefined) { rm = 0; ry = y + 1 }
  return new Date(ry, rm, 1)
}
