import { useMemo } from 'react'
import { brokers, compoundedReturn, money } from '@/data/AppData'
import { useCapital } from '@/context/CapitalContext'
import { useBrokerAccounts, useBrokerTrades } from '@/data/brokerRepo'

/**
 * Capital.jsx
 * -----------------------------------------------------------------------------
 * Allocate capital per broker (Zerodha / Dhan / Upstox / Tradesmart). The same
 * broker capital is shared across every activity (Option Buying / Selling /
 * Intraday), so this is the single place to change it.
 *
 * Capital comes from CapitalContext (the `brokers` table); the P&L comes from
 * the `broker_trades` table via useBrokerTrades(). It used to read the sample
 * arrays in AppData directly, so the Net P&L shown was seed data rather than
 * anything actually booked.
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const netOf = (t) => t.grossPnl - t.brokerage - t.govtCharges

export default function Capital() {
  const { getCapital, setCapital, resetCapital } = useCapital()
  const accounts = useBrokerAccounts()
  const trades = useBrokerTrades()

  // Broker slug -> its day-P&L rows, across every module that broker trades in.
  const tradesBySlug = useMemo(() => {
    const accIds = new Map()            // account id -> broker slug
    accounts.forEach((a) => accIds.set(a.id, a.slug))
    const out = {}
    trades.forEach((t) => {
      const slug = accIds.get(t.accountId)
      if (!slug) return                 // orphaned row: account deleted
      ;(out[slug] = out[slug] || []).push(t)
    })
    return out
  }, [accounts, trades])

  const rows = brokers.map((b) => {
    const capital = getCapital(b.slug)
    const t = tradesBySlug[b.slug] || []
    const net = t.reduce((s, x) => s + netOf(x), 0)
    return { ...b, capital, net, value: capital + net, returnPct: compoundedReturn(t, capital) }
  })
  const total = rows.reduce((s, b) => s + b.capital, 0)
  const totalNet = rows.reduce((s, b) => s + b.net, 0)
  const totalValue = total + totalNet
  const totalReturn = compoundedReturn(trades, total)

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Capital</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Capital</li>
          </ol>
        </nav>
      </div>

      {/* Tiles */}
      <div className="row">
        <div className="col-md-4"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Total capital</span>
          <h4 className="stat-value mt-2 mb-0">{money(total, 'INR')}</h4>
          <span className="text-muted small">{rows.length} brokers</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Net P&amp;L</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(totalNet)}>{money(totalNet, 'INR')}</h4>
          <span className="text-muted small">across all activities</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Current value</span>
          <h4 className="stat-value mt-2 mb-0">{money(totalValue, 'INR')}</h4>
          <span className="text-muted small">capital + P&amp;L</span>
        </div></div></div>
      </div>

      {/* Allocation table with editable capital */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Allocation by broker</h5>
          <button className="btn btn-light btn-sm" onClick={resetCapital}><i className="ri-refresh-line me-1" />Reset defaults</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Broker</th>
                  <th style={{ width: 200 }}>Capital</th>
                  <th className="text-end">Allocation</th>
                  <th className="text-end">Net P&amp;L</th>
                  <th className="text-end">Return</th>
                  <th className="text-end">Current value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.slug}>
                    <td className="fw-medium"><i className={b.icon + ' me-2 text-muted'} />{b.name}</td>
                    <td>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number" className="form-control" value={b.capital}
                          onChange={(e) => setCapital(b.slug, e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="text-end text-muted">{total ? ((b.capital / total) * 100).toFixed(0) : 0}%</td>
                    <td className={'text-end fw-semibold ' + pnlClass(b.net)}>{money(b.net, b.currency)}</td>
                    <td className={'text-end ' + pnlClass(b.net)}>{b.returnPct.toFixed(2)}%</td>
                    <td className="text-end">{money(b.value, b.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td>Total</td>
                  <td>{money(total, 'INR')}</td>
                  <td className="text-end">100%</td>
                  <td className={'text-end ' + pnlClass(totalNet)}>{money(totalNet, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(totalNet)}>{totalReturn.toFixed(2)}%</td>
                  <td className="text-end">{money(totalValue, 'INR')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="card-footer text-muted small">
          <i className="ri-information-line me-1" />
          The same broker capital is shared across Option Buying, Option Selling and Intraday Stocks. Changes here update every business screen and the P&amp;L analytics.
        </div>
      </div>
    </div>
  )
}
