import { useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Link, useNavigate } from 'react-router-dom'
import {
  savingsStats, stockSum,
  brokerStats,
  balanceAfter,
  money,
} from '@/data/AppData'
import { useSavings } from '@/data/savingsRepo'
import { useStockAccounts, useStockHoldings } from '@/data/stockRepo'
import { useBrokerAccounts, useBrokerTrades } from '@/data/brokerRepo'
import { usePlantationEntries } from '@/data/plantationRepo'
import { useLoans, useInstallments, usePrepayments } from '@/data/loansRepo'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useFx } from '@/context/FxContext'
import { useCapital } from '@/context/CapitalContext'
import { PrivacyProvider, usePrivacy, Secret } from '@/context/PrivacyContext'

const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())

function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy()
  return (
    <button
      type="button"
      className={'btn btn-sm ' + (hidden ? 'btn-primary' : 'btn-soft-primary')}
      onClick={toggle}
      title={hidden ? 'Show amounts' : 'Hide amounts'}
    >
      <i className={hidden ? 'ri-eye-off-line' : 'ri-eye-line'} />
    </button>
  )
}

// A summary card that links through to its section.
function SummaryCard({ label, value, sub, subClass, icon, tone, to, valueClass }) {
  return (
    <div className="col-xl-4 col-md-6">
      <div className="card stat-card h-100 mb-0">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="flex-grow-1"><span className="stat-label">{label}</span></div>
            <div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div>
          </div>
          {/* valueClass overrides the value colour (e.g. red on a negative);
              the icon keeps `tone` so the card's identity stays consistent. */}
          <h4 className={'stat-value mt-3 mb-0 ' + (valueClass || 'text-' + tone)}><Secret>{value}</Secret></h4>
          {sub && <span className={'small ' + (subClass || 'text-muted')}><Secret>{sub}</Secret></span>}
          <div className="mt-2">
            <Link to={to} className="stat-link">View <i className="ri-arrow-right-line" /></Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardInner() {
  const colors = useChartColors()
  const navigate = useNavigate()
  const { toINR } = useFx()
  const { accounts: capitalAccounts } = useCapital()
  const [chartType, setChartType] = useState('area') // 'area' | 'bar'
  const { savings } = useSavings()
  const stockMarketAccounts = useStockAccounts()
  const stockMarketHoldings = useStockHoldings()
  const brokerAccounts = useBrokerAccounts()
  const brokerTrades = useBrokerTrades()
  const plantationEntries = usePlantationEntries()
  const loans = useLoans()
  const installments = useInstallments()
  const prepayments = usePrepayments()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  // Savings (INR)
  const sav = savingsStats(savings, toINR)

  // Stock market (INR)
  const stock = stockMarketAccounts.reduce((acc, a) => {
    const s = stockSum(stockMarketHoldings.filter((h) => h.accountId === a.id))
    acc.value += toINR(s.value, a.currency)
    acc.pnl += toINR(s.pnl, a.currency)
    return acc
  }, { value: 0, pnl: 0 })

  // Business income (broker net P&L + plantation profit) + business value
  const brokerNet = brokerAccounts.reduce((s, a) => s + brokerStats(brokerTrades, a, 0).netPnl, 0)
  // Sum every capital account (broker + holder), not once per broker.
  const brokerCapital = capitalAccounts.reduce((s, a) => s + a.capital, 0)
  const plIncome = plantationEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const plExpense = plantationEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const plantationNet = plIncome - plExpense
  const businessIncome = brokerNet + plantationNet
  const businessValue = brokerCapital + brokerNet

  // Loans outstanding (INR) — live paid counts, minus lump-sum prepayments so
  // it matches the Loans list and the loan detail page.
  const loansOutstanding = loans.reduce((s, l) => {
    const paid = installments.filter((i) => i.loanId === l.id && i.status === 'paid').length
    const prepaid = prepayments.filter((p) => p.loanId === l.id).reduce((a, p) => a + p.amount, 0)
    const bal = Math.max(0, balanceAfter(l, paid) - prepaid)
    return s + toINR(bal, l.currency)
  }, 0)

  // Net worth
  const assets = sav.value + stock.value + businessValue
  const netWorth = assets - loansOutstanding

  const palette = [colors.primary, '#4b93ff', '#f7b84b']
  const donut = {
    options: {
      chart: { fontFamily: 'Poppins, sans-serif' },
      labels: ['Savings', 'Stock market', 'Business'],
      colors: palette,
      legend: { position: 'bottom', labels: { colors: colors.text } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      tooltip: { theme: 'light', y: { formatter: (v) => money(v, 'INR') } },
      plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Assets', formatter: () => money(assets, 'INR') } } } } },
    },
    series: [Math.round(sav.value), Math.round(stock.value), Math.round(businessValue)],
  }

  // Monthly business income (trading net + plantation) — added on top of the
  // holdings base so the "income growth" line reflects total wealth: savings +
  // stock market + business capital + accumulating business income.
  const incMap = new Map()
  brokerTrades.forEach((t) => {
    const k = t.date.slice(0, 7)
    incMap.set(k, (incMap.get(k) || 0) + (t.grossPnl - t.brokerage - t.govtCharges))
  })
  plantationEntries.forEach((e) => {
    const k = e.date.slice(0, 7)
    incMap.set(k, (incMap.get(k) || 0) + (e.type === 'income' ? e.amount : -e.amount))
  })
  const base = sav.value + stock.value + brokerCapital

  // Income growth (base holdings + cumulative income) and total loan
  // outstanding (INR), month-by-month up to the current month.
  const lStarts = loans.map((l) => new Date(l.startDate + 'T00:00:00'))
  const now = new Date()
  const lMin = new Date(Math.min(...lStarts))
  const incomeSeries = []
  const loanSeries = []
  let cum = 0
  for (let d = new Date(lMin.getFullYear(), lMin.getMonth(), 1); d <= now; d = addMonths(d, 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    cum += incMap.get(key) || 0
    incomeSeries.push([d.getTime(), Math.round(base + cum)])
    // End of this month — anything dated on or before it counts by now.
    const monthEnd = addMonths(d, 1).getTime()
    const loanTotal = loans.reduce((s, l) => {
      if (new Date(l.startDate + 'T00:00:00').getTime() >= monthEnd) return s
      // Drive the curve off ACTUAL installment + prepayment dates, not the
      // calendar-month schedule. This makes the newest point equal the total
      // outstanding on the Loans page (same paid-count + prepayment basis),
      // instead of drifting because a loan is ahead of or behind schedule.
      const paidByThen = installments.filter(
        (i) => i.loanId === l.id && i.status === 'paid'
          && new Date(i.date + 'T00:00:00').getTime() < monthEnd
      ).length
      const prepaidByThen = prepayments
        .filter((p) => p.loanId === l.id && new Date(p.date + 'T00:00:00').getTime() < monthEnd)
        .reduce((a, p) => a + p.amount, 0)
      return s + toINR(Math.max(0, balanceAfter(l, paidByThen) - prepaidByThen), l.currency)
    }, 0)
    loanSeries.push([d.getTime(), Math.round(loanTotal)])
  }

  // Combined trends — income growth (rising) vs loan outstanding (falling) on a
  // single INR axis; category axis so both line and bar render cleanly.
  const isBar = chartType === 'bar'
  const monthLabels = incomeSeries.map(([ts]) => new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }))
  const trendChart = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
      colors: ['#0ab39c', '#f06548'],
      dataLabels: { enabled: false },
      stroke: { width: isBar ? 0 : 2, curve: 'smooth' },
      fill: isBar ? { type: 'solid', opacity: 0.85 } : { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.03 } },
      plotOptions: { bar: { columnWidth: '70%', borderRadius: 2 } },
      xaxis: { categories: monthLabels, tickAmount: 10, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: -45, style: { colors: colors.text, fontSize: '10px' } } },
      yaxis: { min: 0, labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, 'INR') } },
      grid: { borderColor: colors.grid, strokeDashArray: 3 },
      legend: { show: true, labels: { colors: colors.text }, markers: { radius: 4 } },
      tooltip: { theme: 'light', shared: true, intersect: false, y: { formatter: (v) => money(v, 'INR') } },
    },
    series: [
      { name: 'Income growth', data: incomeSeries.map(([, v]) => v) },
      { name: 'Loan outstanding', data: loanSeries.map(([, v]) => v) },
    ],
  }

  return (
    <>
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Dashboard</h4>
        <PrivacyToggle />
        <nav aria-label="breadcrumb" className="ms-3">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item active" aria-current="page">Wealth</li>
          </ol>
        </nav>
      </div>

      {/* Greeting + net worth */}
      <div className="card mb-4" style={{ overflow: 'hidden' }}>
        <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="greeting">
            <h2>{greeting}, Sujith! 🎉</h2>
            <p className="mb-0">Here&apos;s your consolidated wealth snapshot (in INR).</p>
          </div>
          <div className="text-end">
            <div className="text-muted small">Net worth</div>
            <h2 className={'mb-0 ' + pnlClass(netWorth)}><Secret>{money(netWorth, 'INR')}</Secret></h2>
            <div className="text-muted small">
              <Secret>{money(assets, 'INR')}</Secret> assets − <Secret>{money(loansOutstanding, 'INR')}</Secret> loans
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        <SummaryCard
          label="Savings" value={money(sav.value, 'INR')}
          sub={`+${money(sav.gain, 'INR')} (${sav.gainPct.toFixed(1)}%)`} subClass={pnlClass(sav.gain)}
          icon="ri-safe-2-line" tone="success" to="/wealth/savings"
        />
        <SummaryCard
          label="Locked" value={money(sav.locked, 'INR')}
          sub={`${money(sav.withdrawable, 'INR')} withdrawable`} icon="ri-lock-line" tone="warning" to="/wealth/savings"
        />
        <SummaryCard
          label="Stock market" value={money(stock.value, 'INR')}
          sub={`${stock.pnl >= 0 ? '+' : ''}${money(stock.pnl, 'INR')} P&L`} subClass={pnlClass(stock.pnl)}
          icon="ri-line-chart-line" tone="success" to="/investments/pnl"
        />
        <SummaryCard
          label="Business income" value={money(businessIncome, 'INR')} subClass={pnlClass(businessIncome)}
          valueClass={businessIncome < 0 ? 'text-danger' : 'text-success'}
          sub={`Trading ${money(brokerNet, 'INR')} · Plantation ${money(plantationNet, 'INR')}`}
          icon="ri-briefcase-line" tone="success" to="/trading/pnl"
        />
        <SummaryCard
          label="Business capital" value={money(brokerCapital, 'INR')}
          sub="deployed across brokers" icon="ri-wallet-3-line" tone="success" to="/business/capital"
        />
        <SummaryCard
          label="Loans outstanding" value={money(loansOutstanding, 'INR')}
          sub={`${loans.length} active`} icon="ri-hand-coin-line" tone="danger" to="/loans"
        />
      </div>

      {/* Allocation */}
      <div className="row g-3">
        <div className="col-xl-5">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">Asset allocation</h5></div>
            <div className="card-body">
              <ReactApexChart key={colors.primary} options={donut.options} series={donut.series} type="donut" height={320} />
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">Breakdown</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Area</th><th className="text-end">Value / Amount</th><th>Detail</th></tr>
                  </thead>
                  <tbody>
                    <tr role="button" onClick={() => navigate('/wealth/savings')}>
                      <td className="fw-medium"><i className="ri-safe-2-line me-2 text-success" />Savings</td>
                      <td className="text-end"><Secret>{money(sav.value, 'INR')}</Secret></td>
                      <td className="text-muted small">{money(sav.withdrawable, 'INR')} liquid · {money(sav.locked, 'INR')} locked</td>
                    </tr>
                    <tr role="button" onClick={() => navigate('/investments/pnl')}>
                      <td className="fw-medium"><i className="ri-line-chart-line me-2 text-success" />Stock market</td>
                      <td className="text-end"><Secret>{money(stock.value, 'INR')}</Secret></td>
                      <td className={'small ' + pnlClass(stock.pnl)}>{stock.pnl >= 0 ? '+' : ''}{money(stock.pnl, 'INR')} P&L</td>
                    </tr>
                    <tr role="button" onClick={() => navigate('/trading/pnl')}>
                      <td className="fw-medium"><i className="ri-briefcase-line me-2 text-success" />Business</td>
                      <td className="text-end"><Secret>{money(businessValue, 'INR')}</Secret></td>
                      <td className={'small ' + pnlClass(businessIncome)}>{money(businessIncome, 'INR')} income</td>
                    </tr>
                    <tr role="button" onClick={() => navigate('/loans')}>
                      <td className="fw-medium"><i className="ri-hand-coin-line me-2 text-danger" />Loans</td>
                      <td className="text-end text-danger">−<Secret>{money(loansOutstanding, 'INR')}</Secret></td>
                      <td className="text-muted small">{loans.length} active loans</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="fw-semibold border-top">
                      <td>Net worth</td>
                      <td className={'text-end ' + pnlClass(netWorth)}><Secret>{money(netWorth, 'INR')}</Secret></td>
                      <td className="text-muted small">assets − loans</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends — income growth vs loan reduction */}
      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Income growth vs Loan reduction</h5>
          <small className="text-muted d-none d-md-inline me-2">income rising · loans falling (to today)</small>
          <div className="btn-group btn-group-sm" role="group">
            <button className={'btn ' + (chartType === 'area' ? 'btn-primary' : 'btn-light')} title="Line" onClick={() => setChartType('area')}>
              <i className="ri-line-chart-line" />
            </button>
            <button className={'btn ' + (chartType === 'bar' ? 'btn-primary' : 'btn-light')} title="Bar" onClick={() => setChartType('bar')}>
              <i className="ri-bar-chart-2-line" />
            </button>
          </div>
        </div>
        <div className="card-body">
          <ReactApexChart key={colors.primary + chartType} options={trendChart.options} series={trendChart.series} type={chartType} height={320} />
        </div>
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <PrivacyProvider>
      <DashboardInner />
    </PrivacyProvider>
  )
}
