import { Fragment, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Link } from 'react-router-dom'
import { stockSum, money } from '@/data/AppData'
import {
  useStockAccounts, useStockHoldings,
  addStockAccount as apiAddAccount, editStockAccount as apiEditAccount, removeStockAccount as apiRemoveAccount,
} from '@/data/stockRepo'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useFx } from '@/context/FxContext'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const REGIONS = ['India', 'UAE']
const CURRENCIES = ['INR', 'AED']
const rid = () => Math.random().toString(36).slice(2, 8)
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/* Account form used three ways:
   - `initial`: edit an existing account (all fields editable)
   - `broker` : add another holder under a broker (broker fields locked)
   - neither  : add a brand-new broker */
function AccountForm({ initial, broker, onSave, onCancel }) {
  const editing = Boolean(initial)
  const locked = Boolean(broker)
  const [name, setName] = useState(initial?.StockmarketAccountName || broker?.StockmarketAccountName || '')
  const [holder, setHolder] = useState(initial?.holder || '')
  const [region, setRegion] = useState(initial?.region || broker?.region || 'India')
  const [currency, setCurrency] = useState(initial?.currency || broker?.currency || 'INR')

  const save = () => {
    if (editing) {
      // DB column names — updateRow passes the patch straight through.
      onSave({ account_name: name.trim() || initial.StockmarketAccountName, holder: holder.trim(), region, currency })
      return
    }
    const slug = broker?.slug || slugify(name) || 'account'
    const hs = slugify(holder) || 'primary'
    onSave({
      id: `sm-${slug}-${hs}-${rid()}`,
      slug,
      StockmarketAccountName: name.trim() || broker?.StockmarketAccountName || 'Account',
      holder: holder.trim(),
      region,
      currency,
      icon: broker?.icon || 'ri-stock-line',
    })
  }

  return (
    <>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small mb-1">Broker</label>
          <input className="form-control form-control-sm" placeholder="e.g. Zerodha" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Account holder</label>
          <input className="form-control form-control-sm" placeholder="e.g. Sujith / Priya" value={holder} onChange={(e) => setHolder(e.target.value)} autoFocus />
          <div className="form-text small">Leave blank for the primary account.</div>
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Region</label>
          <select className="form-select form-select-sm" value={region} disabled={locked} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small mb-1">Currency</label>
          <select className="form-select form-select-sm" value={currency} disabled={locked} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}>
          <i className="ri-save-line me-1" />{editing ? 'Save changes' : 'Add account'}
        </button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

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
  const stockMarketAccounts = useStockAccounts()
  const stockMarketHoldings = useStockHoldings()

  const [addFor, setAddFor] = useState(null)   // null | 'new' | broker object
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

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

  // Two-level grouping: region -> broker -> accounts. First-seen order kept, so
  // adding an account slots into its region/broker section automatically.
  const regionGroups = []
  const rIdx = new Map()
  rows.forEach((a) => {
    if (!rIdx.has(a.region)) {
      rIdx.set(a.region, regionGroups.length)
      regionGroups.push({ region: a.region, bIdx: new Map(), brokers: [], count: 0 })
    }
    const rg = regionGroups[rIdx.get(a.region)]
    rg.count++
    if (!rg.bIdx.has(a.slug)) {
      rg.bIdx.set(a.slug, rg.brokers.length)
      rg.brokers.push({ slug: a.slug, name: a.StockmarketAccountName, icon: a.icon, region: a.region, currency: a.currency, accounts: [] })
    }
    rg.brokers[rg.bIdx.get(a.slug)].accounts.push(a)
  })

  const saveAccount = (a) => { apiAddAccount(a).catch(console.error); setAddFor(null) }
  const saveEdit = (patch) => { apiEditAccount(editTarget.id, patch).catch(console.error); setEditTarget(null) }
  const confirmDeleteAccount = () => { apiRemoveAccount(deleteTarget.id).catch(console.error); setDeleteTarget(null) }

  const bar = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
      plotOptions: { bar: { columnWidth: '45%', borderRadius: 4, distributed: true } },
      colors: rows.map((a) => (a.pnlInr >= 0 ? '#0ab39c' : '#f06548')),
      dataLabels: { enabled: false }, legend: { show: false },
      /* Include the holder so two accounts of the same broker are distinct —
         identical category labels get collapsed by ApexCharts (one bar doubled,
         the next blank). */
      xaxis: { categories: rows.map((a) => (a.holder ? `${a.StockmarketAccountName} · ${a.holder}` : a.StockmarketAccountName)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: colors.text, fontSize: '11px' }, rotate: -45, hideOverlappingLabels: false } },
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
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1">By account</h5>
              <button className="btn btn-soft-primary btn-sm" onClick={() => setAddFor('new')}><i className="ri-add-line me-1" />Add account</button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Account holder</th><th className="text-end">Invested</th>
                      <th className="text-end">Value</th><th className="text-end">P&amp;L</th><th className="text-end">Return</th>
                      <th style={{ width: 76 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {regionGroups.map((rg) => (
                      <Fragment key={rg.region}>
                        <tr className="stock-region-row">
                          <td colSpan={6} className="fw-bold">
                            <i className="ri-map-pin-line me-2 text-muted" />{rg.region}
                            <span className="text-muted small ms-2">{rg.count} account{rg.count === 1 ? '' : 's'}</span>
                          </td>
                        </tr>
                        {rg.brokers.map((g) => (
                          <Fragment key={g.slug}>
                            <tr className="table-light">
                              <td colSpan={5} className="fw-semibold ps-4">
                                <Link to={`/investments/${g.slug}`} className="text-reset">
                                  <i className={g.icon + ' me-2 text-muted'} />{g.name}
                                </Link>
                                <span className="badge bg-light text-body border ms-2">{g.currency}</span>
                              </td>
                              <td className="text-end">
                                <button className="btn btn-sm btn-ghost-secondary p-1" title={`Add account under ${g.name}`} onClick={() => setAddFor(g)}>
                                  <i className="ri-add-line" />
                                </button>
                              </td>
                            </tr>
                            {g.accounts.map((a) => (
                              <tr key={a.id}>
                                <td className="ps-5 fw-medium">{a.holder || <span className="text-muted fst-italic">Primary</span>}</td>
                                <td className="text-end">{money(a.invested, a.currency)}</td>
                                <td className="text-end">{money(a.value, a.currency)}</td>
                                <td className={'text-end fw-semibold ' + pnlClass(a.pnl)}>{money(a.pnl, a.currency)}</td>
                                <td className={'text-end ' + pnlClass(a.pnl)}>{a.pnlPct.toFixed(1)}%</td>
                                <td className="text-end text-nowrap">
                                  <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit account" onClick={() => setEditTarget(a)}>
                                    <i className="ri-pencil-line" />
                                  </button>
                                  <button className="btn btn-sm btn-ghost-danger p-1" title="Remove account" onClick={() => setDeleteTarget(a)}>
                                    <i className="ri-delete-bin-line" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-semibold border-top">
                      <td>Total (INR)</td>
                      <td className="text-end">{money(invested, 'INR')}</td>
                      <td className="text-end">{money(value, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(pnl)}>{money(pnl, 'INR')}</td>
                      <td className={'text-end ' + pnlClass(pnl)}>{pnlPct.toFixed(1)}%</td>
                      <td />
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

      <Modal
        open={Boolean(addFor)}
        size="lg"
        title={<>
          <i className="ri-add-line me-2 text-primary" />
          {addFor && addFor !== 'new' ? `Add account — ${addFor.name}` : 'Add stock account'}
        </>}
        onClose={() => setAddFor(null)}
      >
        {addFor && (
          <AccountForm
            broker={addFor === 'new' ? null : addFor}
            onSave={saveAccount}
            onCancel={() => setAddFor(null)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        size="lg"
        title={<><i className="ri-pencil-line me-2 text-primary" />Edit account</>}
        onClose={() => setEditTarget(null)}
      >
        {editTarget && (
          <AccountForm
            key={editTarget.id}
            initial={editTarget}
            onSave={saveEdit}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this account?"
        message={deleteTarget && (
          <>“{deleteTarget.StockmarketAccountName}{deleteTarget.holder ? ` · ${deleteTarget.holder}` : ''}” will be removed. Its holdings are not deleted automatically.</>
        )}
        confirmLabel="Remove"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
