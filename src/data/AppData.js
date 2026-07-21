/**
 * AppData.js
 * -----------------------------------------------------------------------------
 * Sample data + the small helpers the Loans screens need (no separate utils
 * file). Replace with real storage / API later.
 *
 * Loan schema:
 *   id, bankName, amount, currency('INR'|'AED'), startDate, endDate,
 *   emi (fixed monthly installment), outstandingAmount (reference), location.
 *
 * Installment schema (STATIC — like rows from a backend table). Only the
 * installments up to the current month are listed; future months are not shown.
 *   id, loanId (FK -> loans.id), number, date (ISO), amount(=emi),
 *   status ('paid' | 'not paid').
 */
export const loans = [
  {
    id: 'loan-hdfc',
    bankName: 'HDFC Bank',
    amount: 500000,
    currency: 'INR',
    startDate: '2022-01-01',
    endDate: '2027-01-01',
    emi: 10624,
    outstandingAmount: 94139,
    location: 'India',
  },
  {
    id: 'loan-south-indian',
    bankName: 'South Indian Bank',
    amount: 500000,
    currency: 'INR',
    startDate: '2025-03-01',
    endDate: '2029-03-01',
    emi: 12680,
    outstandingAmount: 380082,
    location: 'India',
  },
  {
    id: 'loan-mashreq',
    bankName: 'Mashreq Bank',
    amount: 209000,
    currency: 'AED',
    /* First installment 05 Dec 2025, 48 EMIs, last one 05 Nov 2029.
       endDate is start + tenure (the convention tenureMonths() counts, and the
       one the other loans use) — so 05 Dec 2029, one month past the final
       payment. Using the bank's last-payment date would give 47. */
    startDate: '2025-12-05',
    endDate: '2029-12-05',
    emi: 5211,
    outstandingAmount: 178827,
    location: 'UAE',
  },
  {
    id: 'loan-kunjumon-appappi',
    bankName: 'Kunjumon Appappi',
    amount: 1000000,
    currency: 'INR',
    startDate: '2026-05-01',
    endDate: '2027-03-01',
    emi: 100000, // 0% family loan (emi × tenure = amount)
    outstandingAmount: 800000,
    location: 'India',
  },
]

// ---- Helpers ---------------------------------------------------------------
const monthsBetween = (a, b) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1)

export const money = (n, currency) => {
  const r = Math.round(n)
  return currency === 'AED' ? 'AED ' + r.toLocaleString('en-AE') : '₹' + r.toLocaleString('en-IN')
}
export const fmtMonth = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
export const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
export const slugOf = (loan) => loan.id.replace(/^loan-/, '')

// Total number of monthly installments over the tenure.
export const tenureMonths = (loan) =>
  Math.max(1, monthsBetween(new Date(loan.startDate + 'T00:00:00'), new Date(loan.endDate + 'T00:00:00')))

// Solve the monthly interest rate so a fixed `emi` amortizes `P` over `n`
// months (bisection). Returns 0 when the EMI barely covers principal.
const solveRate = (P, emi, n) => {
  if (n <= 0 || emi * n <= P) return 0
  const pay = (r) => (r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
  let lo = 0, hi = 1
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (pay(mid) > emi) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}
export const rateOf = (loan) => solveRate(loan.amount, loan.emi, tenureMonths(loan))

// Amortized balance after k payments.
export const balanceAfter = (loan, k) => {
  const { amount: P, emi } = loan
  const r = rateOf(loan)
  if (k <= 0) return P
  if (r <= 0) return Math.max(0, P - emi * k)
  const f = Math.pow(1 + r, k)
  return Math.max(0, Math.round(P * f - (emi * (f - 1)) / r))
}

// Months to clear `balance` paying `emi` at monthly rate `r` (amortization).
export const remainingMonths = (balance, emi, r) => {
  if (balance <= 0) return 0
  if (r <= 0) return Math.ceil(balance / emi)
  const x = 1 - (balance * r) / emi
  if (x <= 0) return 600 // EMI ≤ interest — would never amortize; safety cap
  return Math.ceil(-Math.log(x) / Math.log(1 + r))
}

// Forward balance path clearing `balance` at `emi` / rate `r`: [b0, b1, … 0].
export const forwardBalances = (balance, emi, r) => {
  const out = [Math.max(0, Math.round(balance))]
  let b = balance
  const n = remainingMonths(balance, emi, r)
  for (let j = 1; j <= n; j++) {
    b = r <= 0 ? b - emi : b * (1 + r) - emi
    out.push(Math.max(0, Math.round(b)))
  }
  return out
}

// Amortized balance curve over the whole tenure (start → end), reaching zero at
// the end date. `asPercent` expresses it as % of the original principal.
export function trajectory(loan, { asPercent = false } = {}) {
  const start = new Date(loan.startDate + 'T00:00:00')
  const bals = forwardBalances(loan.amount, loan.emi, rateOf(loan))
  return bals.map((b, k) => {
    const d = new Date(start.getFullYear(), start.getMonth() + k, start.getDate())
    const y = asPercent ? (b / loan.amount) * 100 : b
    return [d.getTime(), +y.toFixed(asPercent ? 1 : 0)]
  })
}

/**
 * Installment records up to the current month (static). Each row is one EMI;
 * the latest month is left 'not paid' to show the "Mark paid" action.
 */
export const installments = [
  // loan-hdfc
  { id: 'loan-hdfc-emi-1', loanId: 'loan-hdfc', number: 1, date: '2022-02-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-2', loanId: 'loan-hdfc', number: 2, date: '2022-03-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-3', loanId: 'loan-hdfc', number: 3, date: '2022-04-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-4', loanId: 'loan-hdfc', number: 4, date: '2022-05-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-5', loanId: 'loan-hdfc', number: 5, date: '2022-06-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-6', loanId: 'loan-hdfc', number: 6, date: '2022-07-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-7', loanId: 'loan-hdfc', number: 7, date: '2022-08-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-8', loanId: 'loan-hdfc', number: 8, date: '2022-09-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-9', loanId: 'loan-hdfc', number: 9, date: '2022-10-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-10', loanId: 'loan-hdfc', number: 10, date: '2022-11-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-11', loanId: 'loan-hdfc', number: 11, date: '2022-12-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-12', loanId: 'loan-hdfc', number: 12, date: '2023-01-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-13', loanId: 'loan-hdfc', number: 13, date: '2023-02-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-14', loanId: 'loan-hdfc', number: 14, date: '2023-03-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-15', loanId: 'loan-hdfc', number: 15, date: '2023-04-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-16', loanId: 'loan-hdfc', number: 16, date: '2023-05-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-17', loanId: 'loan-hdfc', number: 17, date: '2023-06-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-18', loanId: 'loan-hdfc', number: 18, date: '2023-07-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-19', loanId: 'loan-hdfc', number: 19, date: '2023-08-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-20', loanId: 'loan-hdfc', number: 20, date: '2023-09-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-21', loanId: 'loan-hdfc', number: 21, date: '2023-10-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-22', loanId: 'loan-hdfc', number: 22, date: '2023-11-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-23', loanId: 'loan-hdfc', number: 23, date: '2023-12-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-24', loanId: 'loan-hdfc', number: 24, date: '2024-01-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-25', loanId: 'loan-hdfc', number: 25, date: '2024-02-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-26', loanId: 'loan-hdfc', number: 26, date: '2024-03-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-27', loanId: 'loan-hdfc', number: 27, date: '2024-04-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-28', loanId: 'loan-hdfc', number: 28, date: '2024-05-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-29', loanId: 'loan-hdfc', number: 29, date: '2024-06-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-30', loanId: 'loan-hdfc', number: 30, date: '2024-07-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-31', loanId: 'loan-hdfc', number: 31, date: '2024-08-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-32', loanId: 'loan-hdfc', number: 32, date: '2024-09-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-33', loanId: 'loan-hdfc', number: 33, date: '2024-10-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-34', loanId: 'loan-hdfc', number: 34, date: '2024-11-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-35', loanId: 'loan-hdfc', number: 35, date: '2024-12-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-36', loanId: 'loan-hdfc', number: 36, date: '2025-01-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-37', loanId: 'loan-hdfc', number: 37, date: '2025-02-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-38', loanId: 'loan-hdfc', number: 38, date: '2025-03-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-39', loanId: 'loan-hdfc', number: 39, date: '2025-04-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-40', loanId: 'loan-hdfc', number: 40, date: '2025-05-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-41', loanId: 'loan-hdfc', number: 41, date: '2025-06-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-42', loanId: 'loan-hdfc', number: 42, date: '2025-07-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-43', loanId: 'loan-hdfc', number: 43, date: '2025-08-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-44', loanId: 'loan-hdfc', number: 44, date: '2025-09-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-45', loanId: 'loan-hdfc', number: 45, date: '2025-10-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-46', loanId: 'loan-hdfc', number: 46, date: '2025-11-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-47', loanId: 'loan-hdfc', number: 47, date: '2025-12-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-48', loanId: 'loan-hdfc', number: 48, date: '2026-01-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-49', loanId: 'loan-hdfc', number: 49, date: '2026-02-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-50', loanId: 'loan-hdfc', number: 50, date: '2026-03-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-51', loanId: 'loan-hdfc', number: 51, date: '2026-04-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-52', loanId: 'loan-hdfc', number: 52, date: '2026-05-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-53', loanId: 'loan-hdfc', number: 53, date: '2026-06-01', amount: 10624, status: 'paid' },
  { id: 'loan-hdfc-emi-54', loanId: 'loan-hdfc', number: 54, date: '2026-07-01', amount: 10624, status: 'not paid' },
  // loan-south-indian
  { id: 'loan-south-indian-emi-1', loanId: 'loan-south-indian', number: 1, date: '2025-04-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-2', loanId: 'loan-south-indian', number: 2, date: '2025-05-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-3', loanId: 'loan-south-indian', number: 3, date: '2025-06-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-4', loanId: 'loan-south-indian', number: 4, date: '2025-07-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-5', loanId: 'loan-south-indian', number: 5, date: '2025-08-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-6', loanId: 'loan-south-indian', number: 6, date: '2025-09-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-7', loanId: 'loan-south-indian', number: 7, date: '2025-10-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-8', loanId: 'loan-south-indian', number: 8, date: '2025-11-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-9', loanId: 'loan-south-indian', number: 9, date: '2025-12-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-10', loanId: 'loan-south-indian', number: 10, date: '2026-01-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-11', loanId: 'loan-south-indian', number: 11, date: '2026-02-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-12', loanId: 'loan-south-indian', number: 12, date: '2026-03-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-13', loanId: 'loan-south-indian', number: 13, date: '2026-04-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-14', loanId: 'loan-south-indian', number: 14, date: '2026-05-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-15', loanId: 'loan-south-indian', number: 15, date: '2026-06-01', amount: 12680, status: 'paid' },
  { id: 'loan-south-indian-emi-16', loanId: 'loan-south-indian', number: 16, date: '2026-07-01', amount: 12680, status: 'not paid' },
  // loan-mashreq — 48 EMIs of 5211 from 05 Dec 2025; 8 due so far.
  { id: 'loan-mashreq-emi-1', loanId: 'loan-mashreq', number: 1, date: '2025-12-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-2', loanId: 'loan-mashreq', number: 2, date: '2026-01-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-3', loanId: 'loan-mashreq', number: 3, date: '2026-02-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-4', loanId: 'loan-mashreq', number: 4, date: '2026-03-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-5', loanId: 'loan-mashreq', number: 5, date: '2026-04-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-6', loanId: 'loan-mashreq', number: 6, date: '2026-05-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-7', loanId: 'loan-mashreq', number: 7, date: '2026-06-05', amount: 5211, status: 'paid' },
  { id: 'loan-mashreq-emi-8', loanId: 'loan-mashreq', number: 8, date: '2026-07-05', amount: 5211, status: 'paid' },
  // loan-kunjumon-appappi (2 EMIs paid)
  { id: 'loan-kunjumon-appappi-emi-1', loanId: 'loan-kunjumon-appappi', number: 1, date: '2026-06-01', amount: 100000, status: 'paid' },
  { id: 'loan-kunjumon-appappi-emi-2', loanId: 'loan-kunjumon-appappi', number: 2, date: '2026-07-01', amount: 100000, status: 'paid' },
]

// Counts for a loan: total from tenure, paid from the (static) installments.
export const loanStats = (loan) => ({
  numberOfInstallments: tenureMonths(loan),
  installmentsPaid: installments.filter((i) => i.loanId === loan.id && i.status === 'paid').length,
})

// Outstanding today = amortized balance after the paid installments.
export const outstandingOf = (loan) =>
  balanceAfter(loan, installments.filter((i) => i.loanId === loan.id && i.status === 'paid').length)

/**
 * One-time lump-sum prepayments — deducted from a loan's outstanding.
 *   id, loanId (FK), date (ISO), amount, note. Starts empty; added in the UI.
 */
export const prepayments = []

/* ===========================================================================
 * BROKERS — capital is allocated per broker and SHARED across every activity
 * (Option Buying, Option Selling, Intraday). This is the single source of
 * truth for capital; the Capital screen edits it (via CapitalContext). These
 * are the seed/default values.
 *   slug, name, icon, currency, capital.
 * =========================================================================== */
export const brokers = [
  { slug: 'zerodha', name: 'Zerodha', icon: 'ri-stock-line', currency: 'INR', capital: 200000 },
  { slug: 'dhan', name: 'Dhan', icon: 'ri-exchange-funds-line', currency: 'INR', capital: 150000 },
  { slug: 'upstox', name: 'Upstox', icon: 'ri-funds-line', currency: 'INR', capital: 100000 },
  { slug: 'tradesmart', name: 'Tradesmart', icon: 'ri-bar-chart-box-line', currency: 'INR', capital: 80000 },
]

/* ===========================================================================
 * OPTION BUYING — broker accounts + day-wise P&L. Capital is NOT stored on the
 * account; it comes from the broker (by slug). Static objects (swap for API).
 *
 * Account schema: id, slug (broker), broker (name), icon, currency.
 * Day P&L schema (FK accountId -> account.id):
 *   id, accountId, date (ISO), orders, grossPnl, brokerage, govtCharges.
 * =========================================================================== */
export const optionBuyingAccounts = [
  { id: 'ob-zerodha', slug: 'zerodha', broker: 'Zerodha', icon: 'ri-stock-line', currency: 'INR' },
  { id: 'ob-dhan', slug: 'dhan', broker: 'Dhan', icon: 'ri-exchange-funds-line', currency: 'INR' },
  { id: 'ob-tradesmart', slug: 'tradesmart', broker: 'Tradesmart', icon: 'ri-bar-chart-box-line', currency: 'INR' },
]

export const optionBuyingTrades = [
  // Zerodha
  { id: 'obt-z1', accountId: 'ob-zerodha', date: '2026-06-15', orders: 8, grossPnl: 5200, brokerage: 160, govtCharges: 95 },
  { id: 'obt-z2', accountId: 'ob-zerodha', date: '2026-06-16', orders: 5, grossPnl: -1800, brokerage: 100, govtCharges: 40 },
  { id: 'obt-z3', accountId: 'ob-zerodha', date: '2026-06-18', orders: 12, grossPnl: 7400, brokerage: 240, govtCharges: 130 },
  { id: 'obt-z4', accountId: 'ob-zerodha', date: '2026-06-22', orders: 6, grossPnl: -2600, brokerage: 120, govtCharges: 48 },
  { id: 'obt-z5', accountId: 'ob-zerodha', date: '2026-06-25', orders: 9, grossPnl: 3100, brokerage: 180, govtCharges: 88 },
  { id: 'obt-z6', accountId: 'ob-zerodha', date: '2026-06-30', orders: 4, grossPnl: 1500, brokerage: 80, govtCharges: 35 },
  { id: 'obt-z7', accountId: 'ob-zerodha', date: '2026-07-02', orders: 10, grossPnl: -3400, brokerage: 200, govtCharges: 70 },
  { id: 'obt-z8', accountId: 'ob-zerodha', date: '2026-07-03', orders: 7, grossPnl: 4200, brokerage: 140, govtCharges: 96 },

  // Dhan
  { id: 'obt-d1', accountId: 'ob-dhan', date: '2026-06-16', orders: 6, grossPnl: 2400, brokerage: 120, govtCharges: 55 },
  { id: 'obt-d2', accountId: 'ob-dhan', date: '2026-06-19', orders: 4, grossPnl: -1200, brokerage: 80, govtCharges: 30 },
  { id: 'obt-d3', accountId: 'ob-dhan', date: '2026-06-23', orders: 8, grossPnl: 3600, brokerage: 160, govtCharges: 82 },
  { id: 'obt-d4', accountId: 'ob-dhan', date: '2026-06-26', orders: 5, grossPnl: 900, brokerage: 100, govtCharges: 28 },
  { id: 'obt-d5', accountId: 'ob-dhan', date: '2026-07-01', orders: 7, grossPnl: -2100, brokerage: 140, govtCharges: 52 },
  { id: 'obt-d6', accountId: 'ob-dhan', date: '2026-07-03', orders: 9, grossPnl: 4800, brokerage: 180, govtCharges: 110 },

  // Tradesmart
  { id: 'obt-t1', accountId: 'ob-tradesmart', date: '2026-06-17', orders: 5, grossPnl: -1500, brokerage: 60, govtCharges: 25 },
  { id: 'obt-t2', accountId: 'ob-tradesmart', date: '2026-06-20', orders: 7, grossPnl: 2800, brokerage: 84, govtCharges: 62 },
  { id: 'obt-t3', accountId: 'ob-tradesmart', date: '2026-06-24', orders: 4, grossPnl: 1200, brokerage: 48, govtCharges: 22 },
  { id: 'obt-t4', accountId: 'ob-tradesmart', date: '2026-06-27', orders: 6, grossPnl: -900, brokerage: 72, govtCharges: 30 },
  { id: 'obt-t5', accountId: 'ob-tradesmart', date: '2026-07-02', orders: 8, grossPnl: 3500, brokerage: 96, govtCharges: 78 },
]

/* ===========================================================================
 * PLANTATION — income / expense ledger + activities (static).
 *
 * Entry schema: id, type ('income'|'expense'), date, dueDate (ISO),
 *   category, amount, status ('settled'|'pending'), note.
 * Activity schema: id, date, dueDate (ISO), activity, status ('done'|'planned'),
 *   note.
 * =========================================================================== */
export const plantationIncomeCategories = ['Harvest sale', 'Subsidy', 'Intercrop sale', 'Other']
export const plantationExpenseCategories = ['Fertilizer', 'Labour', 'Saplings', 'Irrigation', 'Pesticide', 'Equipment', 'Other']

export const plantationEntries = [
  // income
  { id: 'pe-i1', type: 'income', date: '2026-04-10', dueDate: '2026-04-10', category: 'Subsidy', amount: 12000, status: 'settled', note: 'Govt subsidy' },
  { id: 'pe-i2', type: 'income', date: '2026-05-20', dueDate: '2026-05-20', category: 'Harvest sale', amount: 48000, status: 'settled', note: 'Rubber sheet lot 1' },
  { id: 'pe-i3', type: 'income', date: '2026-06-15', dueDate: '2026-06-30', category: 'Harvest sale', amount: 52000, status: 'pending', note: 'Rubber sheet lot 2' },
  { id: 'pe-i4', type: 'income', date: '2026-06-28', dueDate: '2026-07-10', category: 'Intercrop sale', amount: 8000, status: 'pending', note: 'Banana' },

  // expense
  { id: 'pe-e1', type: 'expense', date: '2026-04-05', dueDate: '2026-04-05', category: 'Fertilizer', amount: 9500, status: 'settled', note: 'NPK 50kg x2' },
  { id: 'pe-e2', type: 'expense', date: '2026-04-18', dueDate: '2026-04-18', category: 'Labour', amount: 14000, status: 'settled', note: 'Tapping - month' },
  { id: 'pe-e3', type: 'expense', date: '2026-05-12', dueDate: '2026-05-12', category: 'Pesticide', amount: 3200, status: 'settled', note: 'Fungicide spray' },
  { id: 'pe-e4', type: 'expense', date: '2026-06-25', dueDate: '2026-06-25', category: 'Labour', amount: 15000, status: 'settled', note: 'Weeding + tapping' },
  { id: 'pe-e5', type: 'expense', date: '2026-06-20', dueDate: '2026-07-05', category: 'Irrigation', amount: 2600, status: 'pending', note: 'Pump electricity' },
]

export const plantationActivities = [
  { id: 'pa-1', date: '2026-06-01', dueDate: '2026-06-05', activity: 'Weeding', status: 'done', note: 'Full plot' },
  { id: 'pa-2', date: '2026-06-10', dueDate: '2026-06-15', activity: 'Fertilizer application', status: 'done', note: 'NPK' },
  { id: 'pa-3', date: '2026-06-28', dueDate: '2026-07-02', activity: 'Harvest / tapping', status: 'planned', note: 'Lot 3' },
  { id: 'pa-4', date: '2026-07-01', dueDate: '2026-07-08', activity: 'Pesticide spray', status: 'planned', note: 'Fungicide' },
  { id: 'pa-5', date: '2026-07-01', dueDate: '2026-07-20', activity: 'Rain guard fixing', status: 'planned', note: 'Before monsoon' },
]

/* ===========================================================================
 * INTRADAY STOCKS — same shape as Option Buying (broker accounts + day P&L).
 * =========================================================================== */
export const intradayStocksAccounts = [
  { id: 'is-zerodha', slug: 'zerodha', broker: 'Zerodha', icon: 'ri-stock-line', currency: 'INR' },
  { id: 'is-dhan', slug: 'dhan', broker: 'Dhan', icon: 'ri-exchange-funds-line', currency: 'INR' },
  { id: 'is-tradesmart', slug: 'tradesmart', broker: 'Tradesmart', icon: 'ri-bar-chart-box-line', currency: 'INR' },
]

export const intradayStocksTrades = [
  // Zerodha
  { id: 'ist-z1', accountId: 'is-zerodha', date: '2026-06-15', orders: 14, grossPnl: 6800, brokerage: 280, govtCharges: 160 },
  { id: 'ist-z2', accountId: 'is-zerodha', date: '2026-06-17', orders: 9, grossPnl: -3200, brokerage: 180, govtCharges: 70 },
  { id: 'ist-z3', accountId: 'is-zerodha', date: '2026-06-19', orders: 16, grossPnl: 9400, brokerage: 320, govtCharges: 210 },
  { id: 'ist-z4', accountId: 'is-zerodha', date: '2026-06-24', orders: 7, grossPnl: 2100, brokerage: 140, govtCharges: 58 },
  { id: 'ist-z5', accountId: 'is-zerodha', date: '2026-06-29', orders: 11, grossPnl: -4100, brokerage: 220, govtCharges: 90 },
  { id: 'ist-z6', accountId: 'is-zerodha', date: '2026-07-02', orders: 13, grossPnl: 5600, brokerage: 260, govtCharges: 150 },

  // Dhan
  { id: 'ist-d1', accountId: 'is-dhan', date: '2026-06-16', orders: 8, grossPnl: 3200, brokerage: 160, govtCharges: 78 },
  { id: 'ist-d2', accountId: 'is-dhan', date: '2026-06-20', orders: 6, grossPnl: -1900, brokerage: 120, govtCharges: 44 },
  { id: 'ist-d3', accountId: 'is-dhan', date: '2026-06-25', orders: 10, grossPnl: 4500, brokerage: 200, govtCharges: 108 },
  { id: 'ist-d4', accountId: 'is-dhan', date: '2026-07-01', orders: 7, grossPnl: 1300, brokerage: 140, govtCharges: 40 },
  { id: 'ist-d5', accountId: 'is-dhan', date: '2026-07-03', orders: 9, grossPnl: -2400, brokerage: 180, govtCharges: 60 },

  // Tradesmart
  { id: 'ist-t1', accountId: 'is-tradesmart', date: '2026-06-18', orders: 6, grossPnl: 2600, brokerage: 72, govtCharges: 58 },
  { id: 'ist-t2', accountId: 'is-tradesmart', date: '2026-06-23', orders: 5, grossPnl: -1400, brokerage: 60, govtCharges: 30 },
  { id: 'ist-t3', accountId: 'is-tradesmart', date: '2026-06-26', orders: 8, grossPnl: 3900, brokerage: 96, govtCharges: 92 },
  { id: 'ist-t4', accountId: 'is-tradesmart', date: '2026-07-02', orders: 7, grossPnl: 1800, brokerage: 84, govtCharges: 48 },
]

/* ===========================================================================
 * OPTION SELLING — same shape; only Dhan for now.
 * =========================================================================== */
export const optionSellingAccounts = [
  { id: 'os-dhan', slug: 'dhan', broker: 'Dhan', icon: 'ri-exchange-funds-line', currency: 'INR' },
]

export const optionSellingTrades = [
  { id: 'ost-d1', accountId: 'os-dhan', date: '2026-06-15', orders: 3, grossPnl: 4200, brokerage: 60, govtCharges: 90 },
  { id: 'ost-d2', accountId: 'os-dhan', date: '2026-06-18', orders: 2, grossPnl: -3500, brokerage: 40, govtCharges: 55 },
  { id: 'ost-d3', accountId: 'os-dhan', date: '2026-06-22', orders: 4, grossPnl: 6100, brokerage: 80, govtCharges: 130 },
  { id: 'ost-d4', accountId: 'os-dhan', date: '2026-06-26', orders: 3, grossPnl: 2800, brokerage: 60, govtCharges: 76 },
  { id: 'ost-d5', accountId: 'os-dhan', date: '2026-07-01', orders: 2, grossPnl: -1900, brokerage: 40, govtCharges: 48 },
  { id: 'ost-d6', accountId: 'os-dhan', date: '2026-07-03', orders: 5, grossPnl: 7300, brokerage: 100, govtCharges: 165 },
]

/**
 * Time-weighted (compounded) return: each day's net P&L as a % of the equity at
 * that time, chained together — rather than total net over the current capital.
 * `capital` is the equity at the start of the period; equity then grows/shrinks
 * with each day's P&L. Robust to capital being different now than in the past.
 */
export const compoundedReturn = (trades, capital) => {
  if (!capital || !trades.length) return 0
  const byDay = new Map()
  trades.forEach((t) => {
    const net = t.grossPnl - t.brokerage - t.govtCharges
    byDay.set(t.date, (byDay.get(t.date) || 0) + net)
  })
  let equity = capital
  let factor = 1
  ;[...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([, net]) => {
    if (equity > 0) factor *= 1 + net / equity
    equity += net
  })
  return (factor - 1) * 100
}

// Aggregate performance for a broker account from its day P&L rows.
// `capital` is passed in (comes from the shared per-broker capital).
export const brokerStats = (trades, account, capital = 0) => {
  const rows = trades.filter((t) => t.accountId === account.id)
  const grossPnl = rows.reduce((s, t) => s + t.grossPnl, 0)
  const brokerage = rows.reduce((s, t) => s + t.brokerage, 0)
  const govtCharges = rows.reduce((s, t) => s + t.govtCharges, 0)
  const orders = rows.reduce((s, t) => s + t.orders, 0)
  const charges = brokerage + govtCharges
  const netPnl = grossPnl - charges
  return {
    grossPnl, brokerage, govtCharges, charges, netPnl, orders,
    days: rows.length,
    wins: rows.filter((t) => t.grossPnl - t.brokerage - t.govtCharges > 0).length,
    returnPct: compoundedReturn(rows, capital),
    balance: capital + netPnl,
  }
}

// Module configs consumed by the shared BrokerOverview / BrokerAccount screens.
export const optionBuyingModule = {
  id: 'option-buying', title: 'Option Buying', basePath: '/trading/brokers',
  accounts: optionBuyingAccounts, trades: optionBuyingTrades,
}
export const intradayStocksModule = {
  id: 'intraday-stocks', title: 'Intraday Stocks', basePath: '/business/intraday-stocks',
  accounts: intradayStocksAccounts, trades: intradayStocksTrades,
}
export const optionSellingModule = {
  id: 'option-selling', title: 'Option Selling', basePath: '/business/option-selling',
  accounts: optionSellingAccounts, trades: optionSellingTrades,
}

// All broker modules — consumed by the Business P&L analytics screen.
export const brokerModules = [optionBuyingModule, optionSellingModule, intradayStocksModule]

/* ===========================================================================
 * SAVINGS — one object per holding/instrument (static; swap for API response).
 * `category` is the FK into savingsCategories[].slug (matches the sidebar).
 * `lockedYears`: 0 → withdrawable now; otherwise locked for that many years
 * (unlock date derived from startDate + lockedYears).
 *   id, category, name, invested, currentValue, startDate (ISO), lockedYears, note.
 * =========================================================================== */
export const savingsCategories = [
  { slug: 'hdfc-bank', name: 'HDFC Bank', icon: 'ri-bank-line', currency: 'INR' },
  { slug: 'sbi-bank', name: 'SBI Bank', icon: 'ri-bank-line', currency: 'INR' },
  { slug: 'mashreq-bank', name: 'Mashreq Bank', icon: 'ri-bank-line', currency: 'AED' },
  { slug: 'emirates-nbd', name: 'Emirates NBD', icon: 'ri-bank-line', currency: 'AED' },
  { slug: 'tata-aia', name: 'Tata AIA', icon: 'ri-shield-check-line', currency: 'INR' },
  { slug: 'post-office', name: 'Post office', icon: 'ri-government-line', currency: 'INR' },
  { slug: 'lic', name: 'LIC', icon: 'ri-refund-2-line', currency: 'INR' },
]

export const savings = [
  // Banks — each bank is its own category
  { id: 'sv-hdfc1', category: 'hdfc-bank', name: 'Fixed deposit', currency: 'INR', invested: 200000, currentValue: 214000, startDate: '2024-02-01', lockedYears: 1, note: '1-year FD' },
  { id: 'sv-sbi1', category: 'sbi-bank', name: 'Tax-saver FD', currency: 'INR', invested: 150000, currentValue: 159000, startDate: '2023-11-01', lockedYears: 2, note: '' },
  { id: 'sv-msq1', category: 'mashreq-bank', name: 'Savings account', currency: 'AED', invested: 20000, currentValue: 21200, startDate: '2024-05-01', lockedYears: 0, note: '' },
  { id: 'sv-enbd1', category: 'emirates-nbd', name: 'Fixed deposit', currency: 'AED', invested: 15000, currentValue: 15750, startDate: '2024-08-01', lockedYears: 1, note: '' },

  // Tata AIA
  { id: 'sv-ta1', category: 'tata-aia', name: 'Fortune Guarantee Plus', currency: 'INR', invested: 100000, currentValue: 112000, startDate: '2022-03-01', lockedYears: 5, note: 'Guaranteed return plan' },

  // Post office
  { id: 'sv-po1', category: 'post-office', name: 'PPF', currency: 'INR', invested: 150000, currentValue: 168000, startDate: '2021-04-01', lockedYears: 15, note: 'Public Provident Fund' },
  { id: 'sv-po2', category: 'post-office', name: 'NSC', currency: 'INR', invested: 50000, currentValue: 58000, startDate: '2023-05-01', lockedYears: 5, note: 'National Savings Certificate' },

  // LIC
  { id: 'sv-lic1', category: 'lic', name: 'Jeevan Anand', currency: 'INR', invested: 90000, currentValue: 96000, startDate: '2020-06-01', lockedYears: 10, note: 'Endowment policy' },
]

// Aggregate a list of savings holdings, converting each to INR via `toInr`
// (amount, currency) — so mixed INR/AED lists roll up in a single INR figure.
export const savingsStats = (list, toInr = (a) => a) => {
  const invested = list.reduce((s, x) => s + toInr(x.invested, x.currency), 0)
  const value = list.reduce((s, x) => s + toInr(x.currentValue, x.currency), 0)
  const withdrawable = list.filter((x) => x.lockedYears === 0).reduce((s, x) => s + toInr(x.currentValue, x.currency), 0)
  return {
    invested, value,
    gain: value - invested,
    gainPct: invested ? ((value - invested) / invested) * 100 : 0,
    withdrawable, locked: value - withdrawable,
    count: list.length,
  }
}

/* ===========================================================================
 * STOCK MARKET INVESTMENTS — accounts (India / UAE) + holdings (line items).
 * Static objects (swap for API). Amounts are in the account's currency.
 *
 * Account schema:
 *   id, slug (route), StockmarketAccountName, region ('India'|'UAE'),
 *   currency ('INR'|'AED'), icon.
 * Holding schema (FK accountId -> account.id):
 *   id, accountId, name, qty, invested, currentValue, note.
 *   pnl = currentValue - invested (derived).
 * =========================================================================== */
export const stockMarketAccounts = [
  { id: 'sm-zerodha', slug: 'zerodha', StockmarketAccountName: 'Zerodha', region: 'India', currency: 'INR', icon: 'ri-stock-line' },
  { id: 'sm-upstox', slug: 'upstox', StockmarketAccountName: 'Upstox', region: 'India', currency: 'INR', icon: 'ri-funds-line' },
  { id: 'sm-dhan', slug: 'dhan', StockmarketAccountName: 'Dhan', region: 'India', currency: 'INR', icon: 'ri-exchange-funds-line' },
  { id: 'sm-mashreq-sec', slug: 'mashreq-securities', StockmarketAccountName: 'Mashreq Securities', region: 'UAE', currency: 'AED', icon: 'ri-bar-chart-box-line' },
  { id: 'sm-enbd', slug: 'emirates-nbd', StockmarketAccountName: 'Emirates NBD', region: 'UAE', currency: 'AED', icon: 'ri-bank-line' },
]

export const stockMarketHoldings = [
  // Zerodha (India, INR)
  { id: 'sh-z1', accountId: 'sm-zerodha', name: 'Infosys', qty: 100, invested: 80000, currentValue: 96000, note: '' },
  { id: 'sh-z2', accountId: 'sm-zerodha', name: 'HDFC Bank', qty: 40, invested: 60000, currentValue: 68000, note: '' },
  { id: 'sh-z3', accountId: 'sm-zerodha', name: 'Reliance', qty: 20, invested: 50000, currentValue: 47000, note: '' },
  // Upstox (India, INR)
  { id: 'sh-u1', accountId: 'sm-upstox', name: 'TCS', qty: 15, invested: 52000, currentValue: 61000, note: '' },
  { id: 'sh-u2', accountId: 'sm-upstox', name: 'ICICI Bank', qty: 50, invested: 45000, currentValue: 52500, note: '' },
  // Dhan (India, INR)
  { id: 'sh-d1', accountId: 'sm-dhan', name: 'Tata Motors', qty: 60, invested: 42000, currentValue: 39000, note: '' },
  { id: 'sh-d2', accountId: 'sm-dhan', name: 'ITC', qty: 120, invested: 48000, currentValue: 55000, note: '' },
  // Mashreq Securities (UAE, AED)
  { id: 'sh-m1', accountId: 'sm-mashreq-sec', name: 'Emaar Properties', qty: 500, invested: 32000, currentValue: 37500, note: '' },
  { id: 'sh-m2', accountId: 'sm-mashreq-sec', name: 'DAMAC', qty: 400, invested: 18000, currentValue: 16800, note: '' },
  // Emirates NBD (UAE, AED)
  { id: 'sh-e1', accountId: 'sm-enbd', name: 'ADNOC Gas', qty: 300, invested: 24000, currentValue: 28200, note: '' },
  { id: 'sh-e2', accountId: 'sm-enbd', name: 'Etisalat (e&)', qty: 150, invested: 21000, currentValue: 22400, note: '' },
]

// Sum a list of holdings (raw, in the account's own currency).
export const stockSum = (list) => {
  const invested = list.reduce((s, h) => s + h.invested, 0)
  const value = list.reduce((s, h) => s + h.currentValue, 0)
  return { invested, value, pnl: value - invested, pnlPct: invested ? ((value - invested) / invested) * 100 : 0, count: list.length }
}
