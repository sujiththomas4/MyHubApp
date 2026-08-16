/**
 * xirr.js — annualised return from dated cashflows (bisection).
 * flows: [{ amount, date:'YYYY-MM-DD' }] — contributions negative, final value positive.
 * Returns the rate (e.g. 0.14 = 14%) or null when it can't be computed.
 */
export function xirr(flows) {
  if (!flows || flows.length < 2) return null
  const hasNeg = flows.some((f) => f.amount < 0)
  const hasPos = flows.some((f) => f.amount > 0)
  if (!hasNeg || !hasPos) return null
  const t0 = new Date(flows[0].date + 'T00:00:00').getTime()
  const yf = (d) => (new Date(d + 'T00:00:00').getTime() - t0) / (365 * 86400000)
  const npv = (r) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, yf(f.date)), 0)

  let lo = -0.9999
  let hi = 10
  let flo = npv(lo)
  let fhi = npv(hi)
  if (Number.isNaN(flo) || Number.isNaN(fhi) || flo * fhi > 0) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (Math.abs(fm) < 1e-6) return mid
    if (flo * fm < 0) { hi = mid; fhi = fm } else { lo = mid; flo = fm }
  }
  return (lo + hi) / 2
}

/** Whether XIRR is meaningful yet: >= 2 cashflows and >= 90 days of history. */
export function xirrReady(flows) {
  if (!flows || flows.length < 2) return false
  const dates = flows.map((f) => new Date(f.date + 'T00:00:00').getTime()).sort((a, b) => a - b)
  return (dates[dates.length - 1] - dates[0]) >= 90 * 86400000
}
