import { useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InvestBanner from '@/components/wealth/InvestBanner'
import { rebalanceTopUp } from '@/data/allocation'
import { xirr, xirrReady } from '@/data/xirr'
import { monthKey, isoOf, nextInvestmentDate } from '@/data/investCalendar'
import { useMarketHolidays } from '@/data/investCommonRepo'
import { useCapital } from '@/context/CapitalContext'
import {
  useFunds, setFundValues, setFundDetails, brokerLabel,
  useFundAllotments, useFundAllotmentLines, recordFundAllotment, deleteFundAllotment,
} from '@/data/steady25Repo'

/**
 * Steady25.jsx — Steady 25 SIP (route /wealth/eva-ezaak/steady-25).
 * Four fixed funds, monthly top-up rebalancing (money only, no units).
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const RULE = 'Send money by the 20th. Invest on the 25th (or next trading day). Place orders before 3:00 PM IST for same-day NAV.'
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

export default function Steady25() {
  const { holidays } = useMarketHolidays()
  const { funds, reload: reloadFunds } = useFunds()
  const { allotments, reload: reloadAllots } = useFundAllotments()
  const { lines, reload: reloadLines } = useFundAllotmentLines()
  const { accounts } = useCapital()
  const [editVals, setEditVals] = useState(null)   // {[id]: currentValue}
  const [editFund, setEditFund] = useState(null)   // fund row being described
  const [allotOpen, setAllotOpen] = useState(() => new URLSearchParams(window.location.search).get('allot') === '1')
  const [delAllot, setDelAllot] = useState(null)

  const ordered = useMemo(() => [...funds].sort((a, b) => a.display_order - b.display_order), [funds])
  const totalInvested = ordered.reduce((s, f) => s + num(f.invested), 0)
  const totalCurrent = ordered.reduce((s, f) => s + num(f.current_value), 0)
  const pnl = totalCurrent - totalInvested
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : null
  const thisMonth = monthKey(new Date())
  const monthRecorded = allotments.some((a) => a.allotment_month === thisMonth)

  // Household XIRR: each allotment negative on its date + current value today.
  const flows = useMemo(() => {
    const f = allotments.map((a) => ({ amount: -num(a.total_amount), date: a.invest_date }))
    if (totalCurrent > 0) f.push({ amount: totalCurrent, date: isoOf(new Date()) })
    return f
  }, [allotments, totalCurrent])
  const rate = xirrReady(flows) ? xirr(flows) : null

  const saveValues = async () => {
    for (const f of ordered) {
      const v = editVals[f.id]
      if (v != null && num(v) !== num(f.current_value)) await setFundValues(f.id, f.invested, num(v))
    }
    setEditVals(null); await reloadFunds()
  }

  const confirmDelete = async () => {
    const a = delAllot; setDelAllot(null)
    await deleteFundAllotment(a, lines, funds)
    await Promise.all([reloadFunds(), reloadAllots(), reloadLines()])
  }

  return (
    <div className="steady-25">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Steady 25 SIP</h4>
          <small className="text-muted">Monthly top-up rebalancing — send by the 20th, invest on the 25th.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><a href="/wealth/eva-ezaak">Eva &amp; Ezaak Portfolio</a></li>
            <li className="breadcrumb-item active" aria-current="page">Steady 25 SIP</li>
          </ol>
        </nav>
      </div>

      <InvestBanner rule={RULE} holidays={holidays} monthRecorded={monthRecorded} />

      <div className="row g-3 mb-3">
        <Tile label="Total invested" value={money(totalInvested, 'INR')} icon="ri-wallet-3-line" tone="primary" />
        <Tile label="Current value" value={money(totalCurrent, 'INR')} icon="ri-line-chart-line" tone="info" />
        <Tile label="Overall P&L" value={<PnL v={pnl} />} sub={pnlPct == null ? '—' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`} icon="ri-funds-line" tone={pnl >= 0 ? 'success' : 'danger'} />
        <Tile label="XIRR" value={rate == null ? '—' : `${(rate * 100).toFixed(1)}%`} sub="annualised" icon="ri-rhythm-line" tone="warning" />
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Holdings</h5>
          {editVals ? (
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light" onClick={() => setEditVals(null)}>Cancel</button>
              <button className="btn btn-sm btn-success" onClick={saveValues}><i className="ri-save-3-line me-1" />Save values</button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-soft-primary" onClick={() => setEditVals(Object.fromEntries(ordered.map((f) => [f.id, f.current_value])))}><i className="ri-edit-line me-1" />Update values</button>
              <button className="btn btn-sm btn-primary" onClick={() => setAllotOpen(true)}><i className="ri-add-circle-line me-1" />Monthly Allotment</button>
            </div>
          )}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light">
                <tr><th>Fund</th><th>Where</th><th className="text-end">Target %</th><th className="text-end">Invested</th><th className="text-end">Current</th><th className="text-end">P&L</th><th className="text-end">P&L %</th><th className="text-end">Weight %</th></tr>
              </thead>
              <tbody>
                {ordered.map((f) => {
                  const inv = num(f.invested); const cur = num(f.current_value)
                  const fp = cur - inv; const fpp = inv > 0 ? (fp / inv) * 100 : null
                  const wt = totalCurrent > 0 ? (cur / totalCurrent) * 100 : 0
                  const tgt = num(f.target_weight) * 100
                  const where = brokerLabel(accounts, f)
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="fw-semibold">{f.name}</div>
                        {f.fund_name
                          ? <div className="text-muted small">{f.fund_name}</div>
                          : <div className="text-muted small fst-italic">scheme not set</div>}
                        <span className="badge bg-light text-muted mt-1">{f.code}</span>
                      </td>
                      <td style={{ minWidth: 150 }}>
                        {where
                          ? <span className="badge bg-primary-subtle text-primary"><i className="ri-bank-line me-1" />{where}</span>
                          : <span className="text-muted small">—</span>}
                        <button className="btn btn-sm btn-ghost-secondary px-1 ms-1" title="Edit fund details"
                          onClick={() => setEditFund(f)}><i className="ri-pencil-line" /></button>
                      </td>
                      <td className="text-end">{tgt.toFixed(0)}%</td>
                      <td className="text-end">{money(inv, 'INR')}</td>
                      <td className="text-end" style={{ minWidth: 130 }}>
                        {editVals ? (
                          <input type="number" className="form-control form-control-sm text-end" value={editVals[f.id] ?? ''} onChange={(e) => setEditVals((s) => ({ ...s, [f.id]: e.target.value }))} />
                        ) : money(cur, 'INR')}
                      </td>
                      <td className="text-end">{inv > 0 || cur > 0 ? <PnL v={fp} /> : <span className="text-muted">—</span>}</td>
                      <td className="text-end">{fpp == null ? <span className="text-muted">—</span> : <span className={fpp >= 0 ? 'text-success' : 'text-danger'}>{fpp >= 0 ? '+' : ''}{fpp.toFixed(1)}%</span>}</td>
                      <td className="text-end"><span className={Math.abs(wt - tgt) > 5 ? 'text-warning fw-semibold' : ''}>{wt.toFixed(1)}%</span> <span className="text-muted small">/ {tgt.toFixed(0)}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="table-light">
                <tr className="fw-semibold"><td>Total</td><td /><td className="text-end">100%</td><td className="text-end">{money(totalInvested, 'INR')}</td><td className="text-end">{money(totalCurrent, 'INR')}</td><td className="text-end"><PnL v={pnl} /></td><td className="text-end">{pnlPct == null ? '—' : `${pnlPct.toFixed(1)}%`}</td><td /></tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* History */}
      {allotments.length > 0 && (
        <div className="card mt-3">
          <div className="card-header"><h5 className="card-title mb-0">History</h5></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light"><tr><th>Month</th><th>Invest date</th><th className="text-end">Amount</th><th>Split</th><th /></tr></thead>
                <tbody>
                  {allotments.map((a) => {
                    const ls = lines.filter((l) => l.allotment_id === a.id)
                    return (
                      <tr key={a.id}>
                        <td className="fw-semibold">{a.allotment_month}</td>
                        <td>{a.invest_date}</td>
                        <td className="text-end">{money(num(a.total_amount), 'INR')}</td>
                        <td className="small text-muted">{ls.filter((l) => num(l.amount) > 0).map((l) => `${funds.find((f) => f.id === l.fund_id)?.code || l.fund_id}: ${money(num(l.amount), 'INR')}`).join(' · ')}</td>
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
        <AllotmentModal funds={ordered} holidays={holidays} monthRecorded={monthRecorded} lastAmount={num(allotments[0]?.total_amount) || 50000}
          onClose={() => setAllotOpen(false)}
          onConfirm={async (payload) => { await recordFundAllotment(payload); setAllotOpen(false); await Promise.all([reloadFunds(), reloadAllots(), reloadLines()]) }} />
      )}

      {editFund && (
        <FundDetailsModal fund={editFund} accounts={accounts}
          onClose={() => setEditFund(null)}
          onSaved={async () => { setEditFund(null); await reloadFunds() }} />
      )}

      <ConfirmDialog open={!!delAllot} title="Delete allotment?" message="This reverses each fund's invested total for that month." confirmLabel="Delete" tone="danger" onConfirm={confirmDelete} onCancel={() => setDelAllot(null)} />
    </div>
  )
}

// --- Monthly allotment popup ------------------------------------------------
function AllotmentModal({ funds, holidays, monthRecorded, lastAmount, onClose, onConfirm }) {
  const [amount, setAmount] = useState(String(lastAmount))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const amt = num(amount)
  const result = useMemo(() => {
    if (amt <= 0) return null
    const current = funds.map((f) => num(f.current_value))
    const targets = funds.map((f) => num(f.target_weight))
    return rebalanceTopUp(current, targets, amt)
  }, [amt, funds])

  const topIdx = result ? result.allocation.indexOf(Math.max(...result.allocation)) : -1

  const save = async () => {
    if (amt <= 0) { setErr('Enter an amount greater than 0.'); return }
    setErr(null); setSaving(true)
    const today = new Date()
    const investDate = isoOf(nextInvestmentDate(today, holidays, monthRecorded))
    try {
      await onConfirm({
        month: monthKey(today), investDate, total: amt, funds,
        lines: funds.map((f, i) => ({ fund_id: f.id, amount: result.allocation[i] })),
      })
    } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open size="lg" title={<><i className="ri-add-circle-line me-2 text-primary" />Monthly Allotment</>} onClose={onClose}>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-sm-5"><label className="form-label small mb-1">This month&apos;s amount</label><input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
        <div className="col-sm-7 text-muted small">Fill-the-gap top-up. Nothing is sold — new money flows to whatever is underweight.</div>
      </div>
      {monthRecorded && <div className="alert alert-warning py-2"><i className="ri-information-line me-1" />This month is already recorded — confirming will <strong>replace</strong> the existing allotment.</div>}

      {result && (
        <div className="table-responsive">
          <table className="table align-middle mb-2">
            <thead className="table-light"><tr><th>Fund</th><th className="text-end">Current weight</th><th className="text-end">Target</th><th className="text-end">Amount to invest</th></tr></thead>
            <tbody>
              {funds.map((f, i) => {
                const a = result.allocation[i]
                return (
                  <tr key={f.id} className={a === 0 ? 'text-muted' : ''}>
                    <td>{f.name}</td>
                    <td className="text-end">{(result.currentWeights[i] * 100).toFixed(1)}%</td>
                    <td className="text-end">{(num(f.target_weight) * 100).toFixed(0)}%</td>
                    <td className="text-end fw-semibold">{a === 0 ? <span className="badge bg-light text-muted">Skip</span> : money(a, 'INR')}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="table-light"><tr className="fw-semibold"><td colSpan={3}>Total</td><td className="text-end">{money(result.allocation.reduce((s, x) => s + x, 0), 'INR')}</td></tr></tfoot>
          </table>
          {topIdx >= 0 && <p className="text-muted small mb-0">Most goes to <strong>{funds[topIdx].name}</strong>. This suggests where new money goes — nothing is sold.</p>}
        </div>
      )}

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !result}><i className="ri-check-line me-1" />{saving ? 'Saving…' : 'Confirm allotment'}</button>
      </div>
    </Modal>
  )
}

// --- What this holding is, and where it sits --------------------------------
/**
 * `name` is the slot the allocation model cares about and stays fixed. This
 * edits the two things the model does not know: which scheme you actually
 * bought, and which capital account is holding it.
 */
function FundDetailsModal({ fund, accounts, onClose, onSaved }) {
  const [fundName, setFundName] = useState(fund.fund_name || '')
  const [acct, setAcct] = useState(fund.broker_slug ? `${fund.broker_slug}|${fund.broker_holder || ''}` : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const save = async () => {
    setErr(null); setSaving(true)
    const [brokerSlug, brokerHolder] = acct ? acct.split('|') : ['', '']
    try { await setFundDetails(fund.id, { fundName, brokerSlug, brokerHolder }); await onSaved() }
    catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open title={<><i className="ri-information-line me-2 text-primary" />{fund.name}</>} onClose={onClose}>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label small mb-1">Fund name</label>
          <input className="form-control" placeholder="e.g. UTI Nifty 50 Index Fund - Direct Growth"
            value={fundName} onChange={(e) => setFundName(e.target.value)} autoFocus />
          <div className="form-text">The actual scheme you bought into the <strong>{fund.name}</strong> slot.</div>
        </div>
        <div className="col-12">
          <label className="form-label small mb-1">Broker / account</label>
          <select className="form-select" value={acct} onChange={(e) => setAcct(e.target.value)}>
            <option value="">— not set —</option>
            {accounts.map((a) => (
              <option key={`${a.slug}|${a.holder || ''}`} value={`${a.slug}|${a.holder || ''}`}>
                {a.holder ? `${a.name} · ${a.holder}` : a.name}
              </option>
            ))}
          </select>
          <div className="form-text">Where this holding actually sits. Accounts come from Capital.</div>
        </div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  )
}
