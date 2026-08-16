/**
 * allocation.js — pure allocation algorithms shared by the Eva & Ezaak plans.
 * No imports / side effects (unit-testable).
 */

/**
 * Steady 25 SIP — "fill the gap to target" top-up split (money only, no units).
 * current[i], targets[i] (fractions summing to 1), monthlyAmount.
 * Returns { allocation:[rupees], currentWeights, newTotal }.
 */
export function rebalanceTopUp(current, targets, monthlyAmount) {
  const portfolioValue = current.reduce((a, b) => a + b, 0)
  const newTotal = portfolioValue + monthlyAmount
  const gaps = targets.map((t, i) => t * newTotal - current[i])
  const positiveGapSum = gaps.reduce((s, g) => s + (g > 0 ? g : 0), 0)

  let allocation
  if (positiveGapSum <= 0) allocation = targets.map((t) => monthlyAmount * t)
  else allocation = gaps.map((g) => (g > 0 ? monthlyAmount * (g / positiveGapSum) : 0))

  const rounded = allocation.map((a) => Math.round(a))
  const diff = monthlyAmount - rounded.reduce((a, b) => a + b, 0)
  const lastIdx = rounded.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0).pop() ?? (rounded.length - 1)
  if (rounded[lastIdx] !== undefined) rounded[lastIdx] += diff

  return { allocation: rounded, currentWeights: current.map((c) => (portfolioValue > 0 ? c / portfolioValue : 0)), newTotal }
}

/**
 * Focus 25 / Metal 25 — gap-fill, top-N, whole-unit allocation.
 * items: [{ id, ltp, qty, target }] (target fractions sum to 1).
 * Returns { lines:[{id, shares, cost}], cashBalance }.
 */
export function allocateShares(items, amount, cashBalance, topN = 3) {
  const current = items.map((s) => s.ltp * s.qty)
  const portfolioValue = current.reduce((a, b) => a + b, 0)
  const spendable = amount + cashBalance
  const newTotal = portfolioValue + spendable

  const gaps = items.map((s, i) => s.target * newTotal - current[i])
  const candidates = items
    .map((s, i) => ({ ...s, i, gap: gaps[i] }))
    .filter((c) => c.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, topN)

  const result = { lines: [], cashBalance: Math.round(spendable * 100) / 100 }
  if (candidates.length === 0) return result // all at/above target

  const gapSum = candidates.reduce((s, c) => s + c.gap, 0)
  let leftover = 0
  for (const c of candidates) {
    const pool = spendable * (c.gap / gapSum) + leftover
    let shares = Math.floor(pool / c.ltp)
    shares = Math.min(shares, Math.ceil(c.gap / c.ltp)) // don't overshoot target
    if (shares < 0) shares = 0
    const cost = shares * c.ltp
    leftover = pool - cost
    if (shares > 0) result.lines.push({ id: c.id, shares, cost: Math.round(cost * 100) / 100 })
  }
  result.cashBalance = Math.round(leftover * 100) / 100
  return result
}

/**
 * Lumpsum Seed — the minimum seed that opens every position with ≥ 1 share.
 * items: [{ id, ltp, target }]. Returns { minSeed, displayMin, bindingId }.
 * Targets are normalised so a 99.6% / 100.1% table still deploys 100%.
 */
export function seedMinimum(items) {
  const targetSum = items.reduce((s, x) => s + x.target, 0)
  if (targetSum <= 0) return { minSeed: 0, displayMin: 0, bindingId: null }
  let minSeed = 0
  let bindingId = null
  for (const it of items) {
    const nt = it.target / targetSum
    if (nt <= 0 || it.ltp <= 0) continue
    const need = it.ltp / nt
    if (need > minSeed) { minSeed = need; bindingId = it.id }
  }
  return { minSeed, displayMin: Math.ceil(minSeed / 5000) * 5000, bindingId }
}

/**
 * Lumpsum Seed allocation — every stock eligible (TOP_N ignored), sliced by
 * normalised target. items: [{ id, ltp, target }].
 * oneShareFloor (only when the user seeds BELOW the minimum): a stock that would
 * get 0 shares is bumped to 1 (starts overweight; monthly algo skips it later).
 * Returns { lines:[{id, shares, cost}], totalCost, cashLeft }.
 */
export function seedAllocateShares(items, seedAmount, { oneShareFloor = false } = {}) {
  const targetSum = items.reduce((s, x) => s + x.target, 0)
  const lines = []
  let totalCost = 0
  for (const it of items) {
    const nt = targetSum > 0 ? it.target / targetSum : 0
    if (it.ltp <= 0) continue
    let shares = Math.floor((nt * seedAmount) / it.ltp)
    if (oneShareFloor && shares === 0) shares = 1
    if (shares > 0) {
      const cost = shares * it.ltp
      lines.push({ id: it.id, shares, cost: Math.round(cost * 100) / 100 })
      totalCost += cost
    }
  }
  return { lines, totalCost: Math.round(totalCost * 100) / 100, cashLeft: Math.round((seedAmount - totalCost) * 100) / 100 }
}
