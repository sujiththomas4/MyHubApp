import { useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InvestBanner from '@/components/wealth/InvestBanner'
import StockAllotmentModal from '@/components/wealth/StockAllotmentModal'
import { xirr, xirrReady } from '@/data/xirr'
import { monthKey, isoOf } from '@/data/investCalendar'
import { useMarketHolidays, usePlanState } from '@/data/investCommonRepo'
import { useEtfHoldings, setEtfLtp } from '@/data/metal25Repo'
import { useStockAllotments, useStockAllotmentLines, recordStockAllotment, deleteStockAllotment } from '@/data/focus25Repo'

/**
 * Metal25.jsx — Metal 25 (route /wealth/eva-ezaak/metal-25). GOLDBEES 70 /
 * SILVERBEES 30 hedge sleeve; whole-unit gap-fill on the 25th.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const PLAN = 'METAL25'
const TABLE = 'ee_etf_holdings'
const RULE = 'Send by the 20th. Invest on the 25th (or next trading day). Buy whole ETF units mid-session. This plan is the hedge — resist raising its amount when metals rally.'
const PnL = ({ v }) => <span className={(v >= 0 ? 'text-success' : 'text-danger') + ' fw-semibold'}>{v >= 0 ? '+' : ''}{money(v, 'INR')}</span>

const Tile = ({ label, value, sub, icon, tone }) => (
  <div className="col-md-3 col-6">
    <div className="card stat-card h-100 mb-0"><div className="card-body">
      <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
      <h4 className="stat-value mt-3 mb-0">{value}</h4>
      {sub && <span className="text-muted small">{sub}</span>}
    </div></div>
  </div>
)

export default function Metal25() {
  const { holidays } = useMarketHolidays()
  const { state, reload: reloadState } = usePlanState(PLAN)
  const { holdings, reload: reloadHoldings } = useEtfHoldings()
  const { allotments, reload: reloadAllots } = useStockAllotments(PLAN)
  const { lines, reload: reloadLines } = useStockAllotmentLines()
  const [editLtp, setEditLtp] = useState(null)
  const [allotOpen, setAllotOpen] = useState(() => new URLSearchParams(window.location.search).get('allot') === '1')
  const [delAllot, setDelAllot] = useState(null)

  const ordered = useMemo(() => [...holdings].sort((a, b) => a.display_order - b.display_order), [holdings])
  const cash = num(state.cash_balance)
  const totalInvested = ordered.reduce((s, h) => s + num(h.invested), 0)
  const totalCurrent = ordered.reduce((s, h) => s + num(h.ltp) * num(h.qty), 0) + cash
  const pnl = totalCurrent - cash - totalInvested
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : null
  const thisMonth = monthKey(new Date())
  const monthRecorded = allotments.some((a) => a.allotment_month === thisMonth)

  const flows = useMemo(() => {
    const f = allotments.map((a) => ({ amount: -num(a.amount), date: a.invest_date }))
    if (totalCurrent > 0) f.push({ amount: totalCurrent, date: isoOf(new Date()) })
    return f
  }, [allotments, totalCurrent])
  const rate = xirrReady(flows) ? xirr(flows) : null

  const saveLtps = async () => {
    for (const h of ordered) { const v = editLtp[h.id]; if (v != null && num(v) !== num(h.ltp)) await setEtfLtp(h.id, num(v)) }
    setEditLtp(null); await reloadHoldings()
  }
  const confirmDelete = async () => {
    const a = delAllot; setDelAllot(null)
    await deleteStockAllotment({ allot: a, lines, table: TABLE, holdings })
    await Promise.all([reloadHoldings(), reloadAllots(), reloadLines(), reloadState()])
  }

  return (
    <div className="metal-25">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Metal 25</h4>
          <small className="text-muted">Precious-metals hedge — GOLDBEES 70 / SILVERBEES 30, monthly on the 25th.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><a href="/wealth/eva-ezaak">Eva &amp; Ezaak Portfolio</a></li>
            <li className="breadcrumb-item active" aria-current="page">Metal 25</li>
          </ol>
        </nav>
      </div>

      <InvestBanner rule={RULE} holidays={holidays} monthRecorded={monthRecorded} />

      <div className="row g-3 mb-3">
        <Tile label="Invested" value={money(totalInvested, 'INR')} icon="ri-wallet-3-line" tone="primary" />
        <Tile label="Current value" value={money(totalCurrent, 'INR')} sub={`incl. cash ${money(cash, 'INR')}`} icon="ri-coin-line" tone="warning" />
        <Tile label="P&L %" value={<PnL v={pnl} />} sub={pnlPct == null ? '—' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`} icon="ri-funds-line" tone={pnl >= 0 ? 'success' : 'danger'} />
        <Tile label="XIRR" value={rate == null ? '—' : `${(rate * 100).toFixed(1)}%`} sub="annualised" icon="ri-rhythm-line" tone="info" />
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Holdings</h5>
          {editLtp ? (
            <div className="d-flex gap-2"><button className="btn btn-sm btn-light" onClick={() => setEditLtp(null)}>Cancel</button><button className="btn btn-sm btn-success" onClick={saveLtps}><i className="ri-save-3-line me-1" />Save LTPs</button></div>
          ) : (
            <div className="d-flex gap-2"><button className="btn btn-sm btn-soft-primary" onClick={() => setEditLtp(Object.fromEntries(ordered.map((h) => [h.id, h.ltp])))}><i className="ri-refresh-line me-1" />Update LTPs</button><button className="btn btn-sm btn-primary" onClick={() => setAllotOpen(true)}><i className="ri-add-circle-line me-1" />Monthly Allotment</button></div>
          )}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light"><tr><th>ETF</th><th className="text-end">Target %</th><th className="text-end">Qty</th><th className="text-end">LTP</th><th className="text-end">Invested</th><th className="text-end">Current</th><th className="text-end">P&L %</th><th className="text-end">Weight %</th></tr></thead>
              <tbody>
                {ordered.map((h) => {
                  const inv = num(h.invested); const cur = num(h.ltp) * num(h.qty)
                  const fp = cur - inv; const fpp = inv > 0 ? (fp / inv) * 100 : null
                  const holdingsValue = totalCurrent - cash
                  const wt = holdingsValue > 0 ? (cur / holdingsValue) * 100 : 0
                  const tgt = num(h.target_weight) * 100
                  return (
                    <tr key={h.id}>
                      <td><div className="fw-semibold">{h.symbol}</div><div className="text-muted small">{h.name}</div></td>
                      <td className="text-end">{tgt.toFixed(0)}%</td>
                      <td className="text-end">{num(h.qty)}</td>
                      <td className="text-end" style={{ minWidth: 120 }}>{editLtp ? <input type="number" className="form-control form-control-sm text-end" value={editLtp[h.id] ?? ''} onChange={(e) => setEditLtp((s) => ({ ...s, [h.id]: e.target.value }))} /> : money(num(h.ltp), 'INR')}</td>
                      <td className="text-end">{money(inv, 'INR')}</td>
                      <td className="text-end">{money(cur, 'INR')}</td>
                      <td className="text-end">{fpp == null ? <span className="text-muted">—</span> : <span className={fpp >= 0 ? 'text-success' : 'text-danger'}>{fpp >= 0 ? '+' : ''}{fpp.toFixed(1)}%</span>}</td>
                      <td className="text-end"><span className={Math.abs(wt - tgt) > 5 ? 'text-warning fw-semibold' : ''}>{wt.toFixed(1)}%</span> <span className="text-muted small">/ {tgt.toFixed(0)}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {allotments.length > 0 && (
        <div className="card mt-3">
          <div className="card-header"><h5 className="card-title mb-0">History</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light"><tr><th>Month</th><th>Invest date</th><th className="text-end">Amount</th><th>Bought</th><th className="text-end">Cash out</th><th /></tr></thead>
                <tbody>
                  {allotments.map((a) => {
                    const ls = lines.filter((l) => l.allotment_id === a.id)
                    return (
                      <tr key={a.id}>
                        <td className="fw-semibold">{a.allotment_month}</td>
                        <td>{a.invest_date}</td>
                        <td className="text-end">{money(num(a.amount), 'INR')}</td>
                        <td className="small text-muted">{ls.map((l) => `${holdings.find((h) => h.id === l.stock_id)?.symbol || l.stock_id}: ${num(l.shares)}`).join(' · ') || '—'}</td>
                        <td className="text-end">{money(num(a.cash_after), 'INR')}</td>
                        <td className="text-end"><button className="btn btn-sm btn-ghost-danger" onClick={() => setDelAllot(a)}><i className="ri-delete-bin-line" /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {allotOpen && (
        <StockAllotmentModal planCode={PLAN} table={TABLE} holdings={ordered} cashBalance={cash} topN={num(state.top_n) || 2}
          lastAmount={num(allotments[0]?.amount) || 5000} holidays={holidays} monthRecorded={monthRecorded}
          onClose={() => setAllotOpen(false)}
          onConfirm={async (payload) => { await recordStockAllotment(payload); setAllotOpen(false); await Promise.all([reloadHoldings(), reloadAllots(), reloadLines(), reloadState()]) }} />
      )}

      <ConfirmDialog open={!!delAllot} title="Delete allotment?" message="This reverses the units and cash for that month." confirmLabel="Delete" tone="danger" onConfirm={confirmDelete} onCancel={() => setDelAllot(null)} />
    </div>
  )
}
