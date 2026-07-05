import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { brokerStats, compoundedReturn, money, fmtDate, fmtMonth } from '@/data/AppData'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useCapital } from '@/context/CapitalContext'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * BrokerModule.jsx
 * -----------------------------------------------------------------------------
 * Reusable broker-account screens driven by a `module` config
 * ({ title, basePath, accounts, trades }). Powers both Option Buying and
 * Intraday Stocks:
 *   <BrokerOverview module={...} />  — aggregate + per-account table
 *   <BrokerAccount  module={...} />  — one account: tiles, chart, day P&L with
 *                                       day/week/month/year views + CRUD.
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const netOf = (t) => t.grossPnl - t.brokerage - t.govtCharges
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)

const VIEWS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date - firstThu) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7)
  return { year: date.getUTCFullYear(), week }
}
function bucketOf(dateISO, view) {
  const d = new Date(dateISO + 'T00:00:00')
  if (view === 'year') return { key: String(d.getFullYear()), label: String(d.getFullYear()) }
  if (view === 'month') {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: fmtMonth(key + '-01') }
  }
  if (view === 'week') {
    const { year, week } = isoWeek(d)
    return { key: `${year}-W${String(week).padStart(2, '0')}`, label: `W${week} ${year}` }
  }
  return { key: dateISO, label: fmtDate(dateISO) }
}

/* =========================================================================
 * Overview
 * ========================================================================= */
function Tile({ label, value, sub, icon, tone }) {
  return (
    <div className="col-xl-3 col-md-6">
      <div className="card stat-card h-100"><div className="card-body">
        <div className="d-flex align-items-center">
          <div className="flex-grow-1"><span className="stat-label">{label}</span></div>
          <div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div>
        </div>
        <h4 className="stat-value mt-3 mb-0">{value}</h4>
        {sub && <span className="text-muted small">{sub}</span>}
      </div></div>
    </div>
  )
}

export function BrokerOverview({ module }) {
  const colors = useChartColors()
  const { getCapital } = useCapital()
  const rows = module.accounts.map((a) => {
    const capital = getCapital(a.slug)
    return { ...a, capital, ...brokerStats(module.trades, a, capital) }
  })

  const totalCapital = rows.reduce((s, a) => s + a.capital, 0)
  const totalNet = rows.reduce((s, a) => s + a.netPnl, 0)
  const totalCharges = rows.reduce((s, a) => s + a.charges, 0)
  const totalOrders = rows.reduce((s, a) => s + a.orders, 0)
  const totalReturn = totalCapital ? (totalNet / totalCapital) * 100 : 0

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4, distributed: true } },
    colors: rows.map((a) => (a.netPnl >= 0 ? '#0ab39c' : '#f06548')),
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: { categories: rows.map((a) => a.broker), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '12px' } } },
    yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, 'INR') } },
    grid: { borderColor: colors.grid, strokeDashArray: 3 },
    tooltip: { theme: 'light', y: { formatter: (v) => money(v, 'INR') } },
  }
  const chartSeries = [{ name: 'Net P&L', data: rows.map((a) => a.netPnl) }]

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{module.title}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">{module.title}</li>
          </ol>
        </nav>
      </div>

      <div className="row">
        <Tile label="Total capital" value={money(totalCapital, 'INR')} sub={`${rows.length} accounts`} icon="ri-wallet-3-line" tone="primary" />
        <Tile label="Net P&L" value={<span className={pnlClass(totalNet)}>{money(totalNet, 'INR')}</span>} sub={`after ${money(totalCharges, 'INR')} charges`} icon="ri-line-chart-line" tone={totalNet >= 0 ? 'success' : 'danger'} />
        <Tile label="Overall return" value={<span className={pnlClass(totalNet)}>{totalReturn.toFixed(2)}%</span>} sub="on deployed capital" icon="ri-percent-line" tone="info" />
        <Tile label="Orders" value={totalOrders} sub={`${money(totalCharges, 'INR')} in charges`} icon="ri-list-check-2" tone="warning" />
      </div>

      <div className="row">
        <div className="col-xl-7">
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Accounts</h5></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Broker</th><th className="text-end">Capital</th><th className="text-end">Net P&amp;L</th>
                      <th className="text-end">Return</th><th className="text-center">Orders</th><th className="text-end">Charges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link to={`${module.basePath}/${a.slug}`} className="text-reset fw-medium">
                            <i className={a.icon + ' me-2 text-muted'} />{a.broker}
                          </Link>
                        </td>
                        <td className="text-end">{money(a.capital, a.currency)}</td>
                        <td className={'text-end fw-semibold ' + pnlClass(a.netPnl)}>{money(a.netPnl, a.currency)}</td>
                        <td className={'text-end ' + pnlClass(a.netPnl)}>{a.returnPct.toFixed(2)}%</td>
                        <td className="text-center">{a.orders}</td>
                        <td className="text-end text-muted">{money(a.charges, a.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-semibold border-top">
                      <td>Total</td>
                      <td className="text-end">{money(totalCapital, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(totalNet)}>{money(totalNet, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(totalNet)}>{totalReturn.toFixed(2)}%</td>
                      <td className="text-center">{totalOrders}</td>
                      <td className="text-end">{money(totalCharges, 'INR')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card h-100">
            <div className="card-header"><h5 className="card-title mb-0">Net P&amp;L by broker</h5></div>
            <div className="card-body">
              <ReactApexChart key={colors.primary} options={chartOptions} series={chartSeries} type="bar" height={300} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
 * Account detail
 * ========================================================================= */
function DayForm({ initial, currency, onSave, onCancel }) {
  const [f, setF] = useState({
    date: initial?.date || todayISO(),
    orders: initial?.orders ?? '',
    grossPnl: initial?.grossPnl ?? '',
    brokerage: initial?.brokerage ?? '',
    govtCharges: initial?.govtCharges ?? '',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const num = (v) => Math.round(parseFloat(v) || 0)
  const preview = num(f.grossPnl) - num(f.brokerage) - num(f.govtCharges)

  const save = () => onSave({
    id: initial?.id || 't-' + rid(),
    date: f.date,
    orders: parseInt(f.orders) || 0,
    grossPnl: num(f.grossPnl),
    brokerage: num(f.brokerage),
    govtCharges: num(f.govtCharges),
  })

  return (
    <>
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Orders</label>
          <input type="number" className="form-control form-control-sm" value={f.orders} onChange={(e) => set('orders', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Gross P&amp;L ({currency})</label>
          <input type="number" className="form-control form-control-sm" placeholder="+ / −" value={f.grossPnl} onChange={(e) => set('grossPnl', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Brokerage</label>
          <input type="number" className="form-control form-control-sm" value={f.brokerage} onChange={(e) => set('brokerage', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Govt charges</label>
          <input type="number" className="form-control form-control-sm" value={f.govtCharges} onChange={(e) => set('govtCharges', e.target.value)} />
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Net P&amp;L</label>
          <div className={'form-control form-control-sm bg-light ' + pnlClass(preview)}>{money(preview, currency)}</div>
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add entry'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

export function BrokerAccount({ module }) {
  const { slug } = useParams()
  const colors = useChartColors()
  const { getCapital } = useCapital()
  const account = useMemo(() => module.accounts.find((a) => a.slug === slug), [module, slug])
  const capital = getCapital(slug)

  const [trades, setTrades] = useState([])
  const [view, setView] = useState('day')
  const [adding, setAdding] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)

  useEffect(() => {
    setView('day'); setAdding(false); setEditRow(null); setDeleteRow(null)
    setTrades(account ? module.trades.filter((t) => t.accountId === account.id) : [])
  }, [module, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!account) {
    return (
      <>
        <div className="page-title-box"><h4 className="mb-0">Account not found</h4></div>
        <div className="card"><div className="card-body">
          <p className="mb-3">No account matches “{slug}”.</p>
          <Link to={module.basePath} className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to {module.title}</Link>
        </div></div>
      </>
    )
  }

  const cur = account.currency
  const addTrade = (t) => { setTrades((ts) => [...ts, { ...t, accountId: account.id }]); setAdding(false) }
  const updateTrade = (t) => { setTrades((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...t } : x))); setEditRow(null) }
  const confirmDelete = () => { setTrades((ts) => ts.filter((x) => x.id !== deleteRow.id)); setDeleteRow(null) }

  const grossPnl = trades.reduce((s, t) => s + t.grossPnl, 0)
  const brokerage = trades.reduce((s, t) => s + t.brokerage, 0)
  const govtCharges = trades.reduce((s, t) => s + t.govtCharges, 0)
  const orders = trades.reduce((s, t) => s + t.orders, 0)
  const charges = brokerage + govtCharges
  const netPnl = grossPnl - charges
  const balance = capital + netPnl
  const returnPct = compoundedReturn(trades, capital)

  const asc = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  let run = capital
  const daily = asc.map((t) => { const n = netOf(t); run += n; return { ...t, net: n, balance: run } })
  const wins = daily.filter((t) => t.net > 0).length

  let tableRows
  if (view === 'day') {
    tableRows = [...daily].reverse()
  } else {
    const groups = new Map()
    let bal = capital
    asc.forEach((t) => {
      const { key, label } = bucketOf(t.date, view)
      const g = groups.get(key) || { key, label, days: 0, orders: 0, grossPnl: 0, brokerage: 0, govtCharges: 0 }
      g.days++; g.orders += t.orders; g.grossPnl += t.grossPnl; g.brokerage += t.brokerage; g.govtCharges += t.govtCharges
      groups.set(key, g)
    })
    tableRows = [...groups.values()].map((g) => { const n = g.grossPnl - g.brokerage - g.govtCharges; bal += n; return { ...g, net: n, balance: bal } }).reverse()
  }

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
    colors: [colors.primary],
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.03 } },
    dataLabels: { enabled: false },
    xaxis: { type: 'datetime', axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, cur) } },
    grid: { borderColor: colors.grid, strokeDashArray: 3 },
    tooltip: { theme: 'light', x: { format: 'dd MMM' }, y: { formatter: (v) => money(v, cur) } },
    annotations: { yaxis: [{ y: capital, borderColor: colors.text, strokeDashArray: 4, label: { text: 'Capital', style: { background: colors.text, color: '#fff', fontSize: '10px' } } }] },
  }
  const chartSeries = [{ name: 'Account value', data: daily.map((t) => [new Date(t.date + 'T00:00:00').getTime(), t.balance]) }]

  const isDay = view === 'day'

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0"><i className={account.icon + ' me-2 text-muted'} />{account.broker}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><Link to={module.basePath}>{module.title}</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{account.broker}</li>
          </ol>
        </nav>
      </div>

      <div className="row">
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Net P&amp;L</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(netPnl)}>{money(netPnl, cur)}</h4>
          <span className="text-muted small">Gross {money(grossPnl, cur)}</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Return</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(netPnl)}>{returnPct.toFixed(2)}%</h4>
          <span className="text-muted small">Capital {money(capital, cur)}</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Account value</span>
          <h4 className="stat-value mt-2 mb-0">{money(balance, cur)}</h4>
          <span className="text-muted small">{wins}/{daily.length} green days</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Charges</span>
          <h4 className="stat-value mt-2 mb-0">{money(charges, cur)}</h4>
          <span className="text-muted small">{orders} orders · Bkg {money(brokerage, cur)} · Govt {money(govtCharges, cur)}</span>
        </div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h5 className="card-title mb-0">Account value over time</h5></div>
        <div className="card-body">
          <ReactApexChart key={colors.primary} options={chartOptions} series={chartSeries} type="area" height={300} />
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">P&amp;L history</h5>
          <div className="btn-group btn-group-sm" role="group">
            {VIEWS.map((v) => (
              <button key={v.id} className={'btn ' + (view === v.id ? 'btn-primary' : 'btn-light')} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add entry</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{isDay ? 'Date' : 'Period'}</th>
                  {!isDay && <th className="text-center">Days</th>}
                  <th className="text-center">Orders</th>
                  <th className="text-end">Gross P&amp;L</th>
                  <th className="text-end">Brokerage</th>
                  <th className="text-end">Govt charges</th>
                  <th className="text-end">Net P&amp;L</th>
                  <th className="text-end">Balance</th>
                  {isDay && <th className="text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No entries yet.</td></tr>
                ) : tableRows.map((t) => (
                  <tr key={t.id || t.key}>
                    <td className="fw-medium">{isDay ? fmtDate(t.date) : t.label}</td>
                    {!isDay && <td className="text-center">{t.days}</td>}
                    <td className="text-center">{t.orders}</td>
                    <td className={'text-end ' + pnlClass(t.grossPnl)}>{money(t.grossPnl, cur)}</td>
                    <td className="text-end text-muted">{money(t.brokerage, cur)}</td>
                    <td className="text-end text-muted">{money(t.govtCharges, cur)}</td>
                    <td className={'text-end fw-semibold ' + pnlClass(t.net)}>{money(t.net, cur)}</td>
                    <td className="text-end">{money(t.balance, cur)}</td>
                    {isDay && (
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setEditRow(t)}><i className="ri-pencil-line" /></button>
                          <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDeleteRow(t)}><i className="ri-delete-bin-line" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td>Total</td>
                  {!isDay && <td className="text-center">{daily.length}</td>}
                  <td className="text-center">{orders}</td>
                  <td className={'text-end ' + pnlClass(grossPnl)}>{money(grossPnl, cur)}</td>
                  <td className="text-end">{money(brokerage, cur)}</td>
                  <td className="text-end">{money(govtCharges, cur)}</td>
                  <td className={'text-end ' + pnlClass(netPnl)}>{money(netPnl, cur)}</td>
                  <td className="text-end">{money(balance, cur)}</td>
                  {isDay && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={adding || Boolean(editRow)}
        size="lg"
        title={editRow
          ? <><i className="ri-pencil-line me-2 text-primary" />Edit entry — {account.broker}</>
          : <><i className="ri-add-line me-2 text-primary" />New entry — {account.broker}</>}
        onClose={() => { setAdding(false); setEditRow(null) }}
      >
        <DayForm
          key={editRow?.id || 'new'}
          initial={editRow}
          currency={cur}
          onSave={editRow ? updateTrade : addTrade}
          onCancel={() => { setAdding(false); setEditRow(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete entry?"
        message={deleteRow ? `The ${fmtDate(deleteRow.date)} entry will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  )
}
