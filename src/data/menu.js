/**
 * menu.js
 * -----------------------------------------------------------------------------
 * Sidebar navigation model. Rendered by <Sidebar />.
 *
 * Node shape:
 *   { id, label, icon?, to?, badge?, children?, isTitle? }
 *   - isTitle: renders a section header (e.g. "Wealth", "Stock Market Investments")
 *   - to: a route path (leaf link)
 *   - children: makes it a collapsible parent
 *
 * Every route resolves to the generic <Placeholder /> page (via the catch-all
 * route in App.jsx) until a real screen is built for it.
 */
export const menu = [
  { id: 'title-wealth', label: 'Overall Wealth', isTitle: true },

  { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-2-line', to: '/' },

  {
    id: 'savings',
    label: 'Savings',
    icon: 'ri-safe-2-line',
    to: '/wealth/savings',
    children: [
      { id: 'hdfc-bank', label: 'HDFC Bank', to: '/wealth/savings/hdfc-bank' },
      { id: 'sbi-bank', label: 'SBI Bank', to: '/wealth/savings/sbi-bank' },
      { id: 'mashreq-bank', label: 'Mashreq Bank', to: '/wealth/savings/mashreq-bank' },
      { id: 'emirates-nbd', label: 'Emirates NBD', to: '/wealth/savings/emirates-nbd' },
      { id: 'tata-aia', label: 'Tata AIA', to: '/wealth/savings/tata-aia' },
      { id: 'post-office', label: 'Post office', to: '/wealth/savings/post-office' },
      { id: 'lic', label: 'LIC', to: '/wealth/savings/lic' },
      { id: 'nishanth-chitty', label: 'Nishanth Chitty', to: '/wealth/savings/nishanth-chitty' },
    ],
  },

  {
    id: 'loans',
    label: 'Loans',
    icon: 'ri-hand-coin-line',
    to: '/loans',
    children: [
      { id: 'loan-hdfc', label: 'HDFC', to: '/loans/hdfc' },
      { id: 'loan-south-indian', label: 'South Indian', to: '/loans/south-indian' },
      { id: 'loan-mashreq', label: 'Mashreq', to: '/loans/mashreq' },
      { id: 'loan-kunjumon', label: 'Kunjumon Appappi', to: '/loans/kunjumon-appappi' },
      { id: 'loan-ksfe-25k', label: 'KSFE Chitty 25k', to: '/loans/ksfe-25k' },
      { id: 'loan-ksfe-10k', label: 'KSFE Chitty 10k', to: '/loans/ksfe-10k' },
    ],
  },

  { id: 'title-money', label: 'Money', isTitle: true },

  { id: 'monthly-emis', label: 'Monthly EMIs & Expenses', icon: 'ri-bank-card-line', to: '/money/emis' },
  { id: 'money-lent', label: 'Money Lent', icon: 'ri-user-shared-line', to: '/money/lent' },

  { id: 'title-stock-market', label: 'Stock Market Investments', isTitle: true },

  { id: 'investments-pnl', label: 'P&L', icon: 'ri-line-chart-line', to: '/investments/pnl' },
  {
    id: 'investments-india',
    label: 'India',
    icon: 'ri-flag-2-line',
    to: '/investments/india',
    children: [
      { id: 'zerodha', label: 'Zerodha', to: '/investments/zerodha' },
      { id: 'upstox', label: 'Upstox', to: '/investments/upstox' },
      { id: 'dhan', label: 'Dhan', to: '/investments/dhan' },
    ],
  },
  {
    id: 'investments-uae',
    label: 'UAE',
    icon: 'ri-building-line',
    to: '/investments/uae',
    children: [
      { id: 'inv-mashreq-securities', label: 'Mashreq Securities', to: '/investments/mashreq-securities' },
      { id: 'inv-emirates-nbd', label: 'Emirates NBD', to: '/investments/emirates-nbd' },
    ],
  },

  { id: 'title-trading', label: 'Trading Updates', isTitle: true },

  {
    id: 'trading-rulebook',
    label: 'Before I Trade',
    icon: 'ri-shield-star-line',
    to: '/trading/before-i-trade',
    badge: { text: 'Daily', variant: 'danger' },
  },
  {
    id: 'trading-journal',
    label: 'Journal',
    icon: 'ri-quill-pen-line',
    to: '/trading/journal',
    badge: { text: 'Imp', variant: 'warning' },
  },
  {
    id: 'trading-chart-patterns',
    label: 'Chart patterns',
    icon: 'ri-line-chart-line',
    to: '/trading/chart-patterns',
  },

  { id: 'title-business', label: 'Business', isTitle: true },

  { id: 'trading-pnl', label: 'P&L', icon: 'ri-line-chart-line', to: '/trading/pnl' },
  { id: 'business-capital', label: 'Capital', icon: 'ri-wallet-3-line', to: '/business/capital' },
  { id: 'daily-option-selling', label: 'Daily Option Selling', icon: 'ri-star-line', to: '/business/daily-option-selling' },

  {
    id: 'intraday-stocks',
    label: 'Intraday Stocks',
    icon: 'ri-funds-line',
    to: '/business/intraday-stocks',
    children: [
      { id: 'is-zerodha', label: 'Zerodha', to: '/business/intraday-stocks/zerodha' },
      { id: 'is-dhan', label: 'Dhan', to: '/business/intraday-stocks/dhan' },
      { id: 'is-tradesmart', label: 'Tradesmart', to: '/business/intraday-stocks/tradesmart' },
    ],
  },

  {
    id: 'brokers',
    label: 'Option Buying',
    icon: 'ri-briefcase-line',
    to: '/trading/brokers',
    children: [
      { id: 'broker-zerodha', label: 'Zerodha', to: '/trading/brokers/zerodha' },
      { id: 'broker-dhan', label: 'Dhan', to: '/trading/brokers/dhan' },
      { id: 'broker-tradesmart', label: 'Tradesmart', to: '/trading/brokers/tradesmart' },
    ],
  },

  {
    id: 'option-selling',
    label: 'Option Selling',
    icon: 'ri-coins-line',
    to: '/business/option-selling',
    children: [
      { id: 'opt-dhan', label: 'Dhan', to: '/business/option-selling/dhan' },
    ],
  },

  {
    id: 'plantations',
    label: 'Plantation',
    icon: 'ri-plant-line',
    to: '/business/plantations',
    children: [
      { id: 'plantation-income', label: 'Income', to: '/business/plantations/income' },
      { id: 'plantation-expense', label: 'Expense', to: '/business/plantations/expense' },
      { id: 'plantation-activities', label: 'Activities', to: '/business/plantations/activities' },
    ],
  },

  {
    id: 'exporting',
    label: 'Exporting',
    icon: 'ri-ship-line',
    to: '/business/exporting',
    children: [
      { id: 'export-updates', label: 'Updates', to: '/business/exporting/updates' },
      { id: 'export-products', label: 'Products', to: '/business/exporting/products' },
      { id: 'export-clients', label: 'Clients', to: '/business/exporting/clients' },
      { id: 'export-orders', label: 'Orders', to: '/business/exporting/orders' },
    ],
  },

  { id: 'title-personal', label: 'Personal', isTitle: true },

  { id: 'daily-routines', label: 'Daily Routines', icon: 'ri-calendar-check-line', to: '/personal/daily-routines' },
  { id: 'gym-workouts', label: 'GYM Workouts', icon: 'ri-run-line', to: '/personal/gym-workouts' },

  { id: 'title-system', label: 'System', isTitle: true },

  { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line', to: '/settings' },
]

/**
 * Profile modes — which sections of the nav are visible.
 *   full     — everything (wealth, investments, trading, business, system)
 *   business — trading + business only, so the money-management screens don't
 *              pull focus during market hours
 *
 * Listed by section-title id. `menu` is a FLAT array where `isTitle` marks the
 * start of a section, so a section owns every node up to the next title.
 */
export const PROFILE_MODES = [
  { id: 'full', label: 'Full', icon: 'ri-layout-grid-line', hint: 'Everything' },
  { id: 'business', label: 'Business', icon: 'ri-briefcase-line', hint: 'Trading + business only' },
]

const MODE_SECTIONS = {
  business: ['title-trading', 'title-business', 'title-personal', 'title-system'],
}

/** The nav for a given mode. Unknown modes fall back to the full menu. */
export function menuForMode(mode) {
  const allowed = MODE_SECTIONS[mode]
  if (!allowed) return menu

  const out = []
  let keeping = false
  for (const node of menu) {
    if (node.isTitle) {
      keeping = allowed.includes(node.id)
      if (keeping) out.push(node)
      continue
    }
    if (keeping) out.push(node)
  }
  return out
}
