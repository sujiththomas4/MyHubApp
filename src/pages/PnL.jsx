import { useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Link } from 'react-router-dom'
import { brokerStats, compoundedReturn, money, fmtMonth, fmtDate } from '@/data/AppData'
import { useBrokerAccounts, useBrokerTrades, brokerModuleMeta } from '@/data/brokerRepo'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useCapital } from '@/context/CapitalContext'

/**
 * PnL.jsx
 * -----------------------------------------------------------------------------
 * Business-wide P&L analytics: pulls every broker module (Option Buying,
 * Option Selling, Intraday Stocks), then rolls up totals, per-module and
 * per-account breakdowns, time series, and a few highlights.
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const netOf = (t) => t.grossPnl - t.brokerage - t.govtCharges

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

// Monday of the ISO week containing `d`, as YYYY-MM-DD.
const weekStart = (d) => {
  const dt = new Date(d + 'T00:00:00')
  const dow = (dt.getDay() + 6) % 7 // Mon=0 … Sun=6
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/* Bucket trades into a period and return [{ key, label, net }], oldest first. */
function bucketByPeriod(trades, period) {
  const keyOf = (date) =>
    period === 'daily' ? date
      : period === 'weekly' ? weekStart(date)
      : period === 'monthly' ? date.slice(0, 7)
      : date.slice(0, 4) // yearly
  const labelOf = (key) =>
    period === 'daily' ? fmtDate(key)
      : period === 'weekly' ? `w/c ${fmtDate(key)}`
      : period === 'monthly' ? fmtMonth(key + '-01')
      : key
  const map = new Map()
  trades.forEach((t) => { const k = keyOf(t.date); map.set(k, (map.get(k) || 0) + t.net) })
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, net]) => ({ key, label: labelOf(key), net: Math.round(net) }))
}

export default function PnL() {
  const colors = useChartColors()
  const [period, setPeriod] = useState('monthly') // daily | weekly | monthly | yearly
  const { getCapital, accounts: capitalAccounts } = useCapital()
  const allAccounts = useBrokerAccounts()
  const allTrades = useBrokerTrades()
  const metaById = Object.fromEntries(brokerModuleMeta.map((m) => [m.id, m]))

  // Flatten accounts (with stats) and trades (with net) across all modules.
  const accounts = allAccounts.map((a) => {
    const m = metaById[a.module] || {}
    const cap = getCapital(a.slug, a.holder)
    return { ...a, module: m.title, basePath: m.basePath, capital: cap, ...brokerStats(allTrades, a, cap) }
  })
  const acctById = Object.fromEntries(allAccounts.map((a) => [a.id, a]))
  const trades = allTrades.map((t) => {
    const acc = acctById[t.accountId] || {}
    return { ...t, module: metaById[acc.module]?.title, slug: acc.slug, net: netOf(t) }
  })

  // Deploy total = sum of every capital account (broker + holder).
  const capital = capitalAccounts.reduce((s, a) => s + a.capital, 0)
  const grossPnl = trades.reduce((s, t) => s + t.grossPnl, 0)
  const charges = trades.reduce((s, t) => s + t.brokerage + t.govtCharges, 0)
  const netPnl = grossPnl - charges
  const orders = trades.reduce((s, t) => s + t.orders, 0)
  const returnPct = compoundedReturn(trades, capital)
  const winTrades = trades.filter((t) => t.net > 0).length
  const winRate = trades.length ? (winTrades / trades.length) * 100 : 0

  // Combined P&L per calendar day → best / worst / avg + cumulative.
  const byDay = new Map()
  trades.forEach((t) => byDay.set(t.date, (byDay.get(t.date) || 0) + t.net))
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const best = days.reduce((m, d) => (d[1] > m[1] ? d : m), ['', -Infinity])
  const worst = days.reduce((m, d) => (d[1] < m[1] ? d : m), ['', Infinity])
  const avgDay = days.length ? days.reduce((s, d) => s + d[1], 0) / days.length : 0
  let cum = 0
  const cumSeries = days.map(([date, n]) => { cum += n; return [new Date(date + 'T00:00:00').getTime(), Math.round(cum)] })

  // Monthly net

  // Per-module rollup
  const modules = brokerModuleMeta.map((m) => {
    const accs = accounts.filter((a) => a.module === m.title)
    const tr = trades.filter((t) => t.module === m.title)
    const net = tr.reduce((s, t) => s + t.net, 0)
    const cap = accs.reduce((s, a) => s + a.capital, 0)
    return {
      title: m.title, basePath: m.basePath,
      capital: cap,
      gross: tr.reduce((s, t) => s + t.grossPnl, 0),
      charges: tr.reduce((s, t) => s + t.brokerage + t.govtCharges, 0),
      net, orders: tr.reduce((s, t) => s + t.orders, 0),
      days: tr.length, wins: tr.filter((t) => t.net > 0).length,
      returnPct: compoundedReturn(tr, cap),
    }
  })

  const accountsSorted = [...accounts].sort((a, b) => b.netPnl - a.netPnl)

  // Per-account rollup — one row per (broker, holder), net across ALL its
  // activities on that account's capital.
  const byBroker = capitalAccounts.map((b) => {
    const accs = accounts.filter((a) => a.slug === b.slug && (a.holder || '') === (b.holder || ''))
    const cap = b.capital
    const net = accs.reduce((s, a) => s + a.netPnl, 0)
    const accIds = new Set(accs.map((a) => a.id))
    return {
      ...b, capital: cap, net,
      orders: accs.reduce((s, a) => s + a.orders, 0),
      charges: accs.reduce((s, a) => s + a.charges, 0),
      returnPct: compoundedReturn(trades.filter((t) => accIds.has(t.accountId)), cap),
      value: cap + net,
      activities: accs.length,
    }
  })

  // --- Charts ---------------------------------------------------------------
  const moduleBar = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
      plotOptions: { bar: { columnWidth: '45%', borderRadius: 4, distributed: true } },
      colors: modules.map((m) => (m.net >= 0 ? '#0ab39c' : '#f06548')),
      dataLabels: { enabled: false }, legend: { show: false },
      xaxis: { categories: modules.map((m) => m.title), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '11px' } } },
      yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, 'INR') } },
      grid: { borderColor: colors.grid, strokeDashArray: 3 },
      tooltip: { theme: 'light', y: { formatter: (v) => money(v, 'INR') } },
    },
    series: [{ name: 'Net P&L', data: modules.map((m) => m.net) }],
  }
  const cumArea = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
      colors: [colors.primary], stroke: { width: 2, curve: 'smooth' },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.03 } },
      dataLabels: { enabled: false },
      xaxis: { type: 'datetime', axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '11px' } } },
      yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, 'INR') } },
      grid: { borderColor: colors.grid, strokeDashArray: 3 },
      tooltip: { theme: 'light', x: { format: 'dd MMM' }, y: { formatter: (v) => money(v, 'INR') } },
    },
    series: [{ name: 'Cumulative P&L', data: cumSeries }],
  }
  // Period bar — same chart, re-bucketed daily / weekly / monthly / yearly.
  const periodBuckets = bucketByPeriod(trades, period)
  const periodBar = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 3, colors: { ranges: [{ from: -1e9, to: -0.01, color: '#f06548' }, { from: 0, to: 1e9, color: '#0ab39c' }] } } },
      dataLabels: { enabled: false }, legend: { show: false },
      xaxis: { categories: periodBuckets.map((b) => b.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '11px' }, rotate: -45, hideOverlappingLabels: true } },
      yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, 'INR') } },
      grid: { borderColor: colors.grid, strokeDashArray: 3 },
      tooltip: { theme: 'light', y: { formatter: (v) => money(v, 'INR') } },
    },
    series: [{ name: 'Net P&L', data: periodBuckets.map((b) => b.net) }],
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">P&amp;L — Analytics</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">P&amp;L</li>
          </ol>
        </nav>
      </div>

      {/* Headline tiles */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Net P&amp;L</span></div>
            <div className={`stat-icon bg-${netPnl >= 0 ? 'success' : 'danger'}-subtle text-${netPnl >= 0 ? 'success' : 'danger'}`}><i className="ri-line-chart-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + pnlClass(netPnl)}>{money(netPnl, 'INR')}</h4>
          <span className="text-muted small">Gross {money(grossPnl, 'INR')} · Charges {money(charges, 'INR')}</span>
        </div></div></div>
        <div className="col-xl-3 col-md-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Capital deployed</span></div>
            <div className="stat-icon bg-primary-subtle text-primary"><i className="ri-wallet-3-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{money(capital, 'INR')}</h4>
          <span className="text-muted small">{accounts.length} accounts · {brokerModuleMeta.length} businesses</span>
        </div></div></div>
        <div className="col-xl-3 col-md-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Overall return</span></div>
            <div className="stat-icon bg-info-subtle text-info"><i className="ri-percent-line" /></div></div>
          <h4 className={'stat-value mt-3 mb-0 ' + pnlClass(netPnl)}>{returnPct.toFixed(2)}%</h4>
          <span className="text-muted small">on deployed capital</span>
        </div></div></div>
        <div className="col-xl-3 col-md-6"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">Win rate</span></div>
            <div className="stat-icon bg-warning-subtle text-warning"><i className="ri-trophy-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{winRate.toFixed(0)}%</h4>
          <span className="text-muted small">{winTrades}/{trades.length} green days · {orders} orders</span>
        </div></div></div>
      </div>

      {/* Highlights */}
      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="card mb-0"><div className="card-body d-flex align-items-center">
          <div className="stat-icon bg-success-subtle text-success me-3"><i className="ri-arrow-up-line" /></div>
          <div><div className="text-muted small">Best day</div><div className="fw-semibold">{best[0] ? `${money(best[1], 'INR')} · ${fmtDate(best[0])}` : '—'}</div></div>
        </div></div></div>
        <div className="col-md-4"><div className="card mb-0"><div className="card-body d-flex align-items-center">
          <div className="stat-icon bg-danger-subtle text-danger me-3"><i className="ri-arrow-down-line" /></div>
          <div><div className="text-muted small">Worst day</div><div className="fw-semibold">{worst[0] ? `${money(worst[1], 'INR')} · ${fmtDate(worst[0])}` : '—'}</div></div>
        </div></div></div>
        <div className="col-md-4"><div className="card mb-0"><div className="card-body d-flex align-items-center">
          <div className="stat-icon bg-primary-subtle text-primary me-3"><i className="ri-calendar-line" /></div>
          <div><div className="text-muted small">Avg / trading day</div><div className={'fw-semibold ' + pnlClass(avgDay)}>{money(avgDay, 'INR')}</div></div>
        </div></div></div>
      </div>

      {/* Charts */}
      <div className="row g-3 mb-4">
        <div className="col-xl-5">
          <div className="card h-100 mb-0">
            <div className="card-header"><h5 className="card-title mb-0">Net P&amp;L by business</h5></div>
            <div className="card-body"><ReactApexChart key={colors.primary + 'm'} options={moduleBar.options} series={moduleBar.series} type="bar" height={300} /></div>
          </div>
        </div>
        <div className="col-xl-7">
          <div className="card h-100 mb-0">
            <div className="card-header"><h5 className="card-title mb-0">Cumulative P&amp;L</h5></div>
            <div className="card-body"><ReactApexChart key={colors.primary + 'c'} options={cumArea.options} series={cumArea.series} type="area" height={300} /></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">P&amp;L over time</h5>
          <div className="btn-group btn-group-sm" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={'btn ' + (period === p.id ? 'btn-primary' : 'btn-light')}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {periodBuckets.length === 0
            ? <p className="text-muted text-center mb-0 py-4">No trades booked yet.</p>
            : <ReactApexChart key={colors.primary + period} options={periodBar.options} series={periodBar.series} type="bar" height={280} />}
        </div>
      </div>

      {/* Per-business report */}
      <div className="card">
        <div className="card-header"><h5 className="card-title mb-0">By business</h5></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Business</th><th className="text-end">Capital</th><th className="text-end">Gross</th>
                  <th className="text-end">Charges</th><th className="text-end">Net P&amp;L</th><th className="text-end">Return</th>
                  <th className="text-center">Orders</th><th className="text-center">Win days</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.title}>
                    <td><Link to={m.basePath} className="text-reset fw-medium">{m.title}</Link></td>
                    <td className="text-end">{money(m.capital, 'INR')}</td>
                    <td className={'text-end ' + pnlClass(m.gross)}>{money(m.gross, 'INR')}</td>
                    <td className="text-end text-muted">{money(m.charges, 'INR')}</td>
                    <td className={'text-end fw-semibold ' + pnlClass(m.net)}>{money(m.net, 'INR')}</td>
                    <td className={'text-end ' + pnlClass(m.net)}>{m.returnPct.toFixed(2)}%</td>
                    <td className="text-center">{m.orders}</td>
                    <td className="text-center">{m.wins}/{m.days}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td>Total</td>
                  <td className="text-end">{money(capital, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(grossPnl)}>{money(grossPnl, 'INR')}</td>
                  <td className="text-end">{money(charges, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(netPnl)}>{money(netPnl, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(netPnl)}>{returnPct.toFixed(2)}%</td>
                  <td className="text-center">{orders}</td>
                  <td className="text-center">{winTrades}/{trades.length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Per-broker report (shared capital) */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">By broker <span className="text-muted fs-13 fw-normal">(shared capital)</span></h5>
          <Link to="/business/capital" className="btn btn-soft-primary btn-sm"><i className="ri-wallet-3-line me-1" />Manage capital</Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Broker</th><th className="text-end">Capital</th><th className="text-end">Net P&amp;L</th>
                  <th className="text-end">Return</th><th className="text-end">Value</th>
                  <th className="text-center">Orders</th><th className="text-end">Charges</th>
                </tr>
              </thead>
              <tbody>
                {byBroker.map((b) => (
                  <tr key={b.holder ? `${b.slug}|${b.holder}` : b.slug}>
                    <td className="fw-medium">
                      <i className={b.icon + ' me-2 text-muted'} />{b.name}
                      {b.holder && <span className="text-muted small ms-1">· {b.holder}</span>}
                    </td>
                    <td className="text-end">{money(b.capital, b.currency)}</td>
                    <td className={'text-end fw-semibold ' + pnlClass(b.net)}>{money(b.net, b.currency)}</td>
                    <td className={'text-end ' + pnlClass(b.net)}>{b.returnPct.toFixed(2)}%</td>
                    <td className="text-end">{money(b.value, b.currency)}</td>
                    <td className="text-center">{b.orders}</td>
                    <td className="text-end text-muted">{money(b.charges, b.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td>Total</td>
                  <td className="text-end">{money(capital, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(netPnl)}>{money(netPnl, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(netPnl)}>{returnPct.toFixed(2)}%</td>
                  <td className="text-end">{money(capital + netPnl, 'INR')}</td>
                  <td className="text-center">{orders}</td>
                  <td className="text-end">{money(charges, 'INR')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Per-account report */}
      <div className="card">
        <div className="card-header"><h5 className="card-title mb-0">By account (activity)</h5></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Account</th><th>Business</th><th className="text-end">Capital</th>
                  <th className="text-end">Net P&amp;L</th><th className="text-end">Return</th>
                  <th className="text-center">Orders</th><th className="text-end">Charges</th>
                </tr>
              </thead>
              <tbody>
                {accountsSorted.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`${a.basePath}/${a.slug}`} className="text-reset fw-medium"><i className={a.icon + ' me-2 text-muted'} />{a.broker}</Link>
                      {a.holder && <span className="text-muted small ms-1">· {a.holder}</span>}
                    </td>
                    <td className="text-muted">{a.module}</td>
                    <td className="text-end">{money(a.capital, a.currency)}</td>
                    <td className={'text-end fw-semibold ' + pnlClass(a.netPnl)}>{money(a.netPnl, a.currency)}</td>
                    <td className={'text-end ' + pnlClass(a.netPnl)}>{a.returnPct.toFixed(2)}%</td>
                    <td className="text-center">{a.orders}</td>
                    <td className="text-end text-muted">{money(a.charges, a.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
