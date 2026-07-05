import ReactApexChart from 'react-apexcharts'
import { Link } from 'react-router-dom'
import { stockMarketAccounts, stockMarketHoldings, stockSum, money } from '@/data/AppData'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useFx } from '@/context/FxContext'

/**
 * StockPnL.jsx
 * -----------------------------------------------------------------------------
 * Stock-market P&L across every account (Zerodha / Upstox / Dhan / Mashreq /
 * Emirates NBD). Overall figures roll up in INR (AED converted via Settings).
 * `region` (India/UAE) optionally scopes it for the region menu items.
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')

export default function StockPnL({ region }) {
  const colors = useChartColors()
  const { toINR, aedToInr } = useFx()

  const accts = stockMarketAccounts.filter((a) => !region || a.region === region)
  const rows = accts.map((a) => {
    const s = stockSum(stockMarketHoldings.filter((h) => h.accountId === a.id))
    return {
      ...a, ...s,
      investedInr: toINR(s.invested, a.currency),
      valueInr: toINR(s.value, a.currency),
      pnlInr: toINR(s.pnl, a.currency),
    }
  })

  const invested = rows.reduce((t, a) => t + a.investedInr, 0)
  const value = rows.reduce((t, a) => t + a.valueInr, 0)
  const pnl = value - invested
  const pnlPct = invested ? (pnl / invested) * 100 : 0

  const regions = [...new Set(rows.map((a) => a.region))].map((rg) => {
    const rs = rows.filter((a) => a.region === rg)
    const inv = rs.reduce((t, a) => t + a.investedInr, 0)
    const val = rs.reduce((t, a) => t + a.valueInr, 0)
    return { region: rg, invested: inv, value: val, pnl: val - inv, pnlPct: inv ? ((val - inv) / inv) * 100 : 0, count: rs.length }
  })

  const bar = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
      plotOptions: { bar: { columnWidth: '45%', borderRadius: 4, distributed: true } },
      colors: rows.map((a) => (a.pnlInr >= 0 ? '#0ab39c' : '#f06548')),
      dataLabels: { enabled: false }, legend: { show: false },
      xaxis: { categories: rows.map((a) => a.StockmarketAccountName), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '11px' } } },
      yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, 'INR') } },
      grid: { borderColor: colors.grid, strokeDashArray: 3 },
      tooltip: { theme: 'light', y: { formatter: (v) => money(v, 'INR') } },
    },
    series: [{ name: 'P&L (INR)', data: rows.map((a) => Math.round(a.pnlInr)) }],
  }

  return (
    <div className="stock-market">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">{region ? `${region} — P&L` : 'Stock Market — P&L'}</h4>
          <small className="text-muted">Totals in INR · <Link to="/settings" className="text-reset">AED→INR {aedToInr}</Link></small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Stock Market</li>
            <li className="breadcrumb-item active" aria-current="page">{region || 'P&L'}</li>
          </ol>
        </nav>
      </div>

      {/* Tiles */}
      <div className="row">
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Invested</span>
          <h4 className="stat-value mt-2 mb-0">{money(invested, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Current value</span>
          <h4 className="stat-value mt-2 mb-0">{money(value, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">P&amp;L</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(pnl)}>{money(pnl, 'INR')}</h4>
          <span className={'small ' + pnlClass(pnl)}>{pnlPct.toFixed(2)}%</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Accounts</span>
          <h4 className="stat-value mt-2 mb-0">{rows.length}</h4>
          <span className="text-muted small">{regions.map((r) => `${r.region} ${r.count}`).join(' · ')}</span>
        </div></div></div>
      </div>

      <div className="row">
        {/* By account */}
        <div className="col-xl-7">
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">By account</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Account</th><th>Region</th><th className="text-end">Invested</th>
                      <th className="text-end">Value</th><th className="text-end">P&amp;L</th><th className="text-end">Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/investments/${a.slug}`} className="text-reset fw-medium">
                            <i className={a.icon + ' me-2 text-muted'} />{a.StockmarketAccountName}
                          </Link>
                          <span className="badge bg-light text-body border ms-2">{a.currency}</span>
                        </td>
                        <td className="text-muted">{a.region}</td>
                        <td className="text-end">{money(a.invested, a.currency)}</td>
                        <td className="text-end">{money(a.value, a.currency)}</td>
                        <td className={'text-end fw-semibold ' + pnlClass(a.pnl)}>{money(a.pnl, a.currency)}</td>
                        <td className={'text-end ' + pnlClass(a.pnl)}>{a.pnlPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-semibold border-top">
                      <td colSpan={2}>Total (INR)</td>
                      <td className="text-end">{money(invested, 'INR')}</td>
                      <td className="text-end">{money(value, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(pnl)}>{money(pnl, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(pnl)}>{pnlPct.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* P&L by account chart */}
        <div className="col-xl-5">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">P&amp;L by account (INR)</h5></div>
            <div className="card-body">
              <ReactApexChart key={colors.primary} options={bar.options} series={bar.series} type="bar" height={300} />
            </div>
          </div>
        </div>
      </div>

      {/* By region */}
      {!region && (
        <div className="card">
          <div className="card-header"><h5 className="card-title mb-0">By region</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Region</th><th className="text-center">Accounts</th><th className="text-end">Invested</th>
                    <th className="text-end">Value</th><th className="text-end">P&amp;L</th><th className="text-end">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r) => (
                    <tr key={r.region}>
                      <td className="fw-medium">{r.region}</td>
                      <td className="text-center">{r.count}</td>
                      <td className="text-end">{money(r.invested, 'INR')}</td>
                      <td className="text-end">{money(r.value, 'INR')}</td>
                      <td className={'text-end fw-semibold ' + pnlClass(r.pnl)}>{money(r.pnl, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(r.pnl)}>{r.pnlPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
