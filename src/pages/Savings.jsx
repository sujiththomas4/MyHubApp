import ReactApexChart from 'react-apexcharts'
import { Link } from 'react-router-dom'
import { savings, savingsCategories, savingsStats, money } from '@/data/AppData'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useFx } from '@/context/FxContext'

/**
 * Savings.jsx
 * -----------------------------------------------------------------------------
 * Overview across all savings categories (Stocks, Mutual funds, Tata AIA, Post
 * office, LIC). Aggregate tiles, allocation donut, and a per-category table
 * (each row links to its own screen with add / edit / delete).
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')

export default function Savings() {
  const colors = useChartColors()
  const { toINR, aedToInr } = useFx()
  const all = savingsStats(savings, toINR)

  const rows = savingsCategories.map((c) => {
    const list = savings.filter((s) => s.category === c.slug)
    return { ...c, ...savingsStats(list, toINR) }
  })

  const palette = [colors.primary, '#4b93ff', '#f7b84b', '#f06548', '#6c5ffc', '#0ab39c', '#e83e8c', '#ffab00', '#5b73e8']
  const donut = {
    options: {
      chart: { fontFamily: 'Poppins, sans-serif' },
      labels: rows.map((r) => r.name),
      colors: rows.map((_, i) => palette[i % palette.length]),
      legend: { position: 'bottom', labels: { colors: colors.text } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      tooltip: { theme: 'light', y: { formatter: (v) => money(v, 'INR') } },
      plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Value', formatter: () => money(all.value, 'INR') } } } } },
    },
    series: rows.map((r) => r.value),
  }

  return (
    <div className="savings">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Savings</h4>
          <small className="text-muted">
            Totals in INR · <Link to="/settings" className="text-reset">AED→INR {aedToInr}</Link>
          </small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Wealth</li>
            <li className="breadcrumb-item active" aria-current="page">Savings</li>
          </ol>
        </nav>
      </div>

      {/* Tiles */}
      <div className="row">
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Invested</span>
          <h4 className="stat-value mt-2 mb-0">{money(all.invested, 'INR')}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Current value</span>
          <h4 className="stat-value mt-2 mb-0">{money(all.value, 'INR')}</h4>
          <span className={'small ' + pnlClass(all.gain)}>{all.gain >= 0 ? '+' : ''}{money(all.gain, 'INR')} ({all.gainPct.toFixed(1)}%)</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Withdrawable</span>
          <h4 className="stat-value mt-2 mb-0 text-success">{money(all.withdrawable, 'INR')}</h4>
          <span className="text-muted small">liquid now</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Locked</span>
          <h4 className="stat-value mt-2 mb-0 text-warning">{money(all.locked, 'INR')}</h4>
          <span className="text-muted small">in lock-in</span>
        </div></div></div>
      </div>

      <div className="row">
        {/* Per-category table */}
        <div className="col-xl-7">
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Categories</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Category</th><th className="text-center">Holdings</th>
                      <th className="text-end">Invested</th><th className="text-end">Value</th>
                      <th className="text-end">Gain</th><th className="text-end">Withdrawable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.slug}>
                        <td>
                          <Link to={`/wealth/savings/${r.slug}`} className="text-reset fw-medium">
                            <i className={r.icon + ' me-2 text-muted'} />{r.name}
                          </Link>
                        </td>
                        <td className="text-center">{r.count}</td>
                        <td className="text-end">{money(r.invested, 'INR')}</td>
                        <td className="text-end">{money(r.value, 'INR')}</td>
                        <td className={'text-end fw-semibold ' + pnlClass(r.gain)}>{r.gainPct.toFixed(1)}%</td>
                        <td className="text-end text-muted">{money(r.withdrawable, 'INR')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-semibold border-top">
                      <td>Total</td>
                      <td className="text-center">{all.count}</td>
                      <td className="text-end">{money(all.invested, 'INR')}</td>
                      <td className="text-end">{money(all.value, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(all.gain)}>{all.gainPct.toFixed(1)}%</td>
                      <td className="text-end">{money(all.withdrawable, 'INR')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Allocation donut */}
        <div className="col-xl-5">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">Allocation by value</h5></div>
            <div className="card-body">
              <ReactApexChart key={colors.primary} options={donut.options} series={donut.series} type="donut" height={320} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
