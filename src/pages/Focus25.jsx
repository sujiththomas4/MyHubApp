import { useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import InvestBanner from '@/components/wealth/InvestBanner'
import StockAllotmentModal from '@/components/wealth/StockAllotmentModal'
import { monthKey, nextReviewMonth, isoOf, nextInvestmentDate } from '@/data/investCalendar'
import { seedMinimum, seedAllocateShares } from '@/data/allocation'
import { useMarketHolidays, usePlanState, useReviewLog, addReview, removeReview } from '@/data/investCommonRepo'
import {
  useFocusStocks, addFocusStock, editFocusStock, setFocusLtp, softRemoveFocusStock,
  useStockAllotments, useStockAllotmentLines, recordStockAllotment, deleteStockAllotment,
} from '@/data/focus25Repo'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * Focus25.jsx — Focus 25 Stocks (route /wealth/eva-ezaak/focus-25). Direct
 * stock plan: 10–12 quality stocks, whole-share gap-fill top-up on the 25th,
 * quarterly review.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const PLAN = 'FOCUS25'
const TABLE = 'ee_focus_stocks'
const RULE = 'Send money by the 20th. Invest on the 25th (or next trading day). Buy only the most-underweight stocks each month. Review fundamentals quarterly — never exit on price alone.'
const TIERS = [
  { key: 'large', label: 'Largecap', target: 0.60, capRank: '1–100', count: '6', countMin: 6, countMax: 6 },
  { key: 'mid', label: 'Midcap', target: 0.25, capRank: '101–250', count: '3–4', countMin: 3, countMax: 4 },
  { key: 'small', label: 'Smallcap', target: 0.15, capRank: '251–500', count: '1–2', countMin: 1, countMax: 2 },
]
const CHECKLIST = [
  'Debt-to-equity below 1 (below 0.5 preferred)',
  'Promoter holding above 45%',
  'Promoter pledging below 10%',
  'ROE above 15% sustained 3+ years',
  'Positive free cash flow',
  'I can explain this business in one sentence',
  'Adding it keeps the portfolio within sector-spread rules',
]
const REMOVE_REASONS = ['Pledging crossed 10%', 'Debt ballooned', 'ROE collapsed (multi-quarter)', 'Governance red flag', 'Other']
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

export default function Focus25() {
  const { holidays } = useMarketHolidays()
  const { state, reload: reloadState } = usePlanState(PLAN)
  const { stocks, reload: reloadStocks } = useFocusStocks()
  const { allotments, reload: reloadAllots } = useStockAllotments(PLAN)
  const { lines, reload: reloadLines } = useStockAllotmentLines()
  const { reviews, reload: reloadReviews } = useReviewLog(PLAN)
  const [editLtp, setEditLtp] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [allotOpen, setAllotOpen] = useState(() => new URLSearchParams(window.location.search).get('allot') === '1')
  const [seedOpen, setSeedOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [delAllot, setDelAllot] = useState(null)

  const active = useMemo(() => stocks.filter((s) => s.active !== false), [stocks])
  const cash = num(state.cash_balance)
  const totalInvested = active.reduce((s, x) => s + num(x.invested), 0)
  const holdingsValue = active.reduce((s, x) => s + num(x.ltp) * num(x.qty), 0)
  const pnl = holdingsValue - totalInvested
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : null
  const targetSum = active.reduce((s, x) => s + num(x.target_weight), 0)
  const unallocated = (1 - targetSum) * 100
  const thisMonth = monthKey(new Date())
  const monthRecorded = allotments.some((a) => a.allotment_month === thisMonth && (a.type || 'monthly') === 'monthly')
  const reviewStr = nextReviewMonth().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  const saveLtps = async () => {
    for (const s of active) { const v = editLtp[s.id]; if (v != null && num(v) !== num(s.ltp)) await setFocusLtp(s.id, num(v)) }
    setEditLtp(null); await reloadStocks()
  }
  const confirmRemove = async (reason) => {
    const s = removeTarget; setRemoveTarget(null)
    await softRemoveFocusStock(s.id)
    await addReview(PLAN, thisMonth, `Removed ${s.symbol}: ${reason}`)
    await Promise.all([reloadStocks(), reloadReviews()])
  }
  const confirmDelete = async () => {
    const a = delAllot; setDelAllot(null)
    await deleteStockAllotment({ allot: a, lines, table: TABLE, holdings: stocks })
    await Promise.all([reloadStocks(), reloadAllots(), reloadLines(), reloadState()])
  }

  return (
    <div className="focus-25">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Focus 25 Stocks</h4>
          <small className="text-muted">Direct stock plan — 10–12 quality stocks, monthly top-up on the 25th, quarterly review.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><a href="/wealth/eva-ezaak">Eva &amp; Ezaak Portfolio</a></li>
            <li className="breadcrumb-item active" aria-current="page">Focus 25 Stocks</li>
          </ol>
        </nav>
      </div>

      <InvestBanner rule={RULE} holidays={holidays} monthRecorded={monthRecorded} extra={<>Next review: <strong>{reviewStr}</strong></>} />

      <div className="row g-3 mb-3">
        <Tile label="Invested" value={money(totalInvested, 'INR')} icon="ri-wallet-3-line" tone="primary" />
        <Tile label="Current value" value={money(holdingsValue, 'INR')} icon="ri-line-chart-line" tone="info" />
        <Tile label="P&L %" value={<PnL v={pnl} />} sub={pnlPct == null ? '—' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`} icon="ri-funds-line" tone={pnl >= 0 ? 'success' : 'danger'} />
        <Tile label="Cash carryover" value={money(cash, 'INR')} sub={`${active.length} stocks`} icon="ri-coins-line" tone="warning" />
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Holdings
            <button type="button" className="btn btn-link btn-sm p-0 ms-1 align-baseline text-muted" title="Portfolio structure guide" onClick={() => setInfoOpen(true)}><i className="ri-information-line fs-16" /></button>
            {Math.abs(unallocated) > 0.05 && <span className={`badge ms-2 ${unallocated > 0 ? 'bg-warning-subtle text-warning' : 'bg-danger-subtle text-danger'}`}>{unallocated > 0 ? `${unallocated.toFixed(1)}% unallocated` : `${(-unallocated).toFixed(1)}% over-allocated`}</span>}
            {active.length > 15 && <span className="badge bg-danger-subtle text-danger ms-1">Over 15 stocks</span>}
          </h5>
          {editLtp ? (
            <div className="d-flex gap-2"><button className="btn btn-sm btn-light" onClick={() => setEditLtp(null)}>Cancel</button><button className="btn btn-sm btn-success" onClick={saveLtps}><i className="ri-save-3-line me-1" />Save LTPs</button></div>
          ) : (
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-soft-secondary" onClick={() => setAddOpen(true)}><i className="ri-add-line me-1" />Add stock</button>
              <button className="btn btn-sm btn-soft-primary" onClick={() => setEditLtp(Object.fromEntries(active.map((s) => [s.id, s.ltp])))}><i className="ri-refresh-line me-1" />Update LTPs</button>
              <button className="btn btn-sm btn-soft-success" onClick={() => setSeedOpen(true)} disabled={active.length === 0}><i className="ri-seedling-line me-1" />Lumpsum Seed</button>
              <button className="btn btn-sm btn-primary" onClick={() => setAllotOpen(true)} disabled={active.length === 0}><i className="ri-add-circle-line me-1" />Monthly Allotment</button>
            </div>
          )}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light"><tr><th>Stock</th><th className="text-end">Target %</th><th className="text-end">Qty</th><th className="text-end">LTP</th><th className="text-end">Invested</th><th className="text-end">Current</th><th className="text-end">P&L %</th><th className="text-end">Weight %</th><th /></tr></thead>
              <tbody>
                {active.length === 0 && <tr><td colSpan={9} className="text-center text-muted py-4">No stocks yet. Add one to begin.</td></tr>}
                {TIERS.map((tier) => {
                  const rows = active.filter((s) => (s.tier || 'large') === tier.key)
                  if (rows.length === 0) return null
                  const tierCur = rows.reduce((s, x) => s + num(x.ltp) * num(x.qty), 0)
                  const tierWt = holdingsValue > 0 ? (tierCur / holdingsValue) * 100 : 0
                  return (
                    <FocusTierGroup key={tier.key} tier={tier} tierWt={tierWt} rows={rows} holdingsValue={holdingsValue} editLtp={editLtp} setEditLtp={setEditLtp} onEdit={setEditStock} onRemove={setRemoveTarget} />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History + reviews */}
      <div className="row g-3 mt-0">
        {allotments.length > 0 && (
          <div className="col-lg-7">
            <div className="card h-100"><div className="card-header"><h5 className="card-title mb-0">Allotment history</h5></div>
              <div className="card-body p-0"><div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light"><tr><th>Month</th><th>Type</th><th className="text-end">Amount</th><th>Bought</th><th className="text-end">Cash</th><th /></tr></thead>
                  <tbody>{allotments.map((a) => {
                    const ls = lines.filter((l) => l.allotment_id === a.id)
                    const isSeed = (a.type || 'monthly') === 'lumpsum'
                    return (<tr key={a.id}>
                      <td className="fw-semibold">{a.allotment_month}</td>
                      <td><span className={`badge ${isSeed ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>{isSeed ? 'Lumpsum' : 'Monthly'}</span></td>
                      <td className="text-end">{money(num(a.amount), 'INR')}</td>
                      <td className="small text-muted">{ls.map((l) => `${stocks.find((s) => s.id === l.stock_id)?.symbol || l.stock_id}×${num(l.shares)}`).join(' · ') || '—'}</td>
                      <td className="text-end">{money(num(a.cash_after), 'INR')}</td>
                      <td className="text-end"><button className="btn btn-sm btn-ghost-danger" onClick={() => setDelAllot(a)}><i className="ri-delete-bin-line" /></button></td>
                    </tr>)
                  })}</tbody>
                </table>
              </div></div>
            </div>
          </div>
        )}
        <div className={allotments.length > 0 ? 'col-lg-5' : 'col-12'}>
          <div className="card h-100"><div className="card-header d-flex align-items-center"><h5 className="card-title mb-0 flex-grow-1">Review log</h5><button className="btn btn-sm btn-soft-secondary" onClick={async () => { const n = window.prompt('Quarterly review note'); if (n) { await addReview(PLAN, thisMonth, n); await reloadReviews() } }}><i className="ri-add-line me-1" />Note</button></div>
            <div className="card-body p-0">
              {reviews.length === 0 ? <p className="text-muted text-center py-4 mb-0">No review notes yet.</p> : (
                <ul className="list-group list-group-flush">{reviews.map((r) => (
                  <li key={r.id} className="list-group-item d-flex align-items-start gap-2">
                    <div className="flex-grow-1"><div className="small text-muted">{r.review_month}</div>{r.note}</div>
                    <button className="btn btn-sm btn-ghost-danger px-1" title="Delete note" onClick={async () => { await removeReview(r.id); await reloadReviews() }}><i className="ri-delete-bin-line" /></button>
                  </li>
                ))}</ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {infoOpen && <StructureInfoModal active={active} onClose={() => setInfoOpen(false)} />}

      {(addOpen || editStock) && (
        <StockFormModal initial={editStock} onClose={() => { setAddOpen(false); setEditStock(null) }}
          onSave={async (form) => {
            if (editStock) await editFocusStock(editStock.id, { symbol: form.symbol, name: form.name, tier: form.tier, sector: form.sector, target_weight: num(form.targetPct) / 100, ltp: num(form.ltp), notes: form.notes, checklist: form.checklist })
            else await addFocusStock({ symbol: form.symbol, name: form.name, tier: form.tier, sector: form.sector, target_weight: num(form.targetPct) / 100, ltp: form.ltp, qty: form.qty, invested: form.invested, notes: form.notes, checklist: form.checklist, display_order: stocks.length })
            setAddOpen(false); setEditStock(null); await reloadStocks()
          }} />
      )}

      {allotOpen && (
        <StockAllotmentModal planCode={PLAN} table={TABLE} holdings={active} cashBalance={cash} topN={num(state.top_n) || 3}
          lastAmount={num(allotments[0]?.amount) || 25000} holidays={holidays} monthRecorded={monthRecorded}
          onClose={() => setAllotOpen(false)}
          onConfirm={async (payload) => { await recordStockAllotment(payload); setAllotOpen(false); await Promise.all([reloadStocks(), reloadAllots(), reloadLines(), reloadState()]) }} />
      )}

      {seedOpen && (
        <LumpsumSeedModal stocks={active} cashBalance={cash} holidays={holidays}
          onClose={() => setSeedOpen(false)}
          onConfirm={async (payload) => { await recordStockAllotment(payload); setSeedOpen(false); await Promise.all([reloadStocks(), reloadAllots(), reloadLines(), reloadState()]) }} />
      )}

      {removeTarget && <RemoveStockModal stock={removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={confirmRemove} />}
      <ConfirmDialog open={!!delAllot} title="Delete allotment?" message="This reverses the shares and cash for that month." confirmLabel="Delete" tone="danger" onConfirm={confirmDelete} onCancel={() => setDelAllot(null)} />
    </div>
  )
}

// --- Tier group -------------------------------------------------------------
function FocusTierGroup({ tier, tierWt, rows, holdingsValue, editLtp, setEditLtp, onEdit, onRemove }) {
  return (
    <>
      <tr className="table-light"><td colSpan={9} className="fw-semibold small text-uppercase text-muted">{tier.label} <span className="ms-2">{tierWt.toFixed(1)}% / {(tier.target * 100).toFixed(0)}%</span></td></tr>
      {rows.map((s) => {
        const inv = num(s.invested); const cur = num(s.ltp) * num(s.qty)
        const fp = cur - inv; const fpp = inv > 0 ? (fp / inv) * 100 : null
        const wt = holdingsValue > 0 ? (cur / holdingsValue) * 100 : 0
        const tgt = num(s.target_weight) * 100
        return (
          <tr key={s.id}>
            <td><div className="fw-semibold">{s.symbol}</div><div className="text-muted small">{s.name}{s.sector ? ` · ${s.sector}` : ''}</div></td>
            <td className="text-end">{tgt.toFixed(1)}%</td>
            <td className="text-end">{num(s.qty)}</td>
            <td className="text-end" style={{ minWidth: 120 }}>{editLtp ? <input type="number" className="form-control form-control-sm text-end" value={editLtp[s.id] ?? ''} onChange={(e) => setEditLtp((st) => ({ ...st, [s.id]: e.target.value }))} /> : money(num(s.ltp), 'INR')}</td>
            <td className="text-end">{money(inv, 'INR')}</td>
            <td className="text-end">{money(cur, 'INR')}</td>
            <td className="text-end">{fpp == null ? <span className="text-muted">—</span> : <span className={fpp >= 0 ? 'text-success' : 'text-danger'}>{fpp >= 0 ? '+' : ''}{fpp.toFixed(1)}%</span>}</td>
            <td className="text-end">{wt.toFixed(1)}% <span className="text-muted small">/ {tgt.toFixed(1)}%</span></td>
            <td className="text-end text-nowrap">
              <button className="btn btn-sm btn-ghost-secondary" onClick={() => onEdit(s)}><i className="ri-edit-line" /></button>
              <button className="btn btn-sm btn-ghost-danger" onClick={() => onRemove(s)}><i className="ri-delete-bin-line" /></button>
            </td>
          </tr>
        )
      })}
    </>
  )
}

// --- Portfolio structure guide ----------------------------------------------
function StructureInfoModal({ active, onClose }) {
  const total = active.length
  const totalMin = TIERS.reduce((s, t) => s + t.countMin, 0)
  const totalMax = TIERS.reduce((s, t) => s + t.countMax, 0)
  return (
    <Modal open size="lg" title={<><i className="ri-information-line me-2 text-primary" />Portfolio structure guide</>} onClose={onClose}>
      <p className="text-muted small mb-3">Target shape for Focus 25 — use it as a guide while adding stocks. Each stock&apos;s own target weight should roll up to its tier&apos;s allocation, and all target weights across the portfolio should sum to 100%.</p>
      <div className="table-responsive">
        <table className="table align-middle mb-3">
          <thead className="table-light"><tr><th>Tier</th><th>NSE cap rank</th><th className="text-center">Expected stocks</th><th className="text-center">You have</th><th className="text-end">Tier allocation</th></tr></thead>
          <tbody>
            {TIERS.map((t) => {
              const have = active.filter((s) => (s.tier || 'large') === t.key).length
              const ok = have >= t.countMin && have <= t.countMax
              return (
                <tr key={t.key}>
                  <td className="fw-semibold">{t.label}</td>
                  <td>{t.capRank}</td>
                  <td className="text-center">{t.count}</td>
                  <td className="text-center"><span className={`badge ${ok ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>{have}</span></td>
                  <td className="text-end">{(t.target * 100).toFixed(0)}%</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="table-light"><tr className="fw-semibold"><td colSpan={2}>Total</td><td className="text-center">{totalMin}–{totalMax}</td><td className="text-center"><span className={`badge ${total >= 10 && total <= 12 ? 'bg-success-subtle text-success' : total > 15 ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'}`}>{total}</span></td><td className="text-end">100%</td></tr></tfoot>
        </table>
      </div>
      <ul className="text-muted small mb-0 ps-3">
        <li>Aim for <strong>10–12 stocks</strong> total. Soft-warn outside this range; hard-block above 15.</li>
        <li>Keep at least <strong>5–6 distinct sectors</strong> across the portfolio; warn if any one sector exceeds 30% of total target weight.</li>
        <li>Admit each stock through the evaluation checklist (shown in the Add Stock form).</li>
        <li>Exits happen only at the quarterly review on filter failure — never on price alone.</li>
      </ul>
      <div className="d-flex justify-content-end mt-3"><button className="btn btn-primary" onClick={onClose}>Got it</button></div>
    </Modal>
  )
}

// --- Lumpsum seed -----------------------------------------------------------
const SEED_MULTS = [1, 1.5, 2, 2.5, 3]
function LumpsumSeedModal({ stocks, cashBalance, holidays, onClose, onConfirm }) {
  const items = useMemo(() => stocks.map((s) => ({ id: s.id, ltp: num(s.ltp), qty: num(s.qty), target: num(s.target_weight) })), [stocks])
  const targetSum = items.reduce((s, x) => s + x.target, 0)
  const { minSeed, displayMin, bindingId } = useMemo(() => seedMinimum(items), [items])
  const binding = stocks.find((s) => s.id === bindingId)

  const [mult, setMult] = useState(1)
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const seedAmount = useCustom ? num(custom) : Math.round(displayMin * mult)
  const belowMin = seedAmount > 0 && seedAmount < displayMin
  const result = useMemo(() => (seedAmount > 0 ? seedAllocateShares(items, seedAmount, { oneShareFloor: belowMin }) : null), [items, seedAmount, belowMin])

  const byId = Object.fromEntries(stocks.map((s) => [s.id, s]))
  const boughtIds = new Set((result?.lines || []).map((l) => l.id))
  // Resulting start weights after the seed.
  const newTotalValue = (result?.lines || []).reduce((sum, l) => sum + (num(byId[l.id]?.qty) + l.shares) * num(byId[l.id]?.ltp), 0)
    + stocks.filter((s) => !boughtIds.has(s.id)).reduce((sum, s) => sum + num(s.qty) * num(s.ltp), 0)
  const startWeight = (s, shares) => (newTotalValue > 0 ? ((num(s.qty) + shares) * num(s.ltp)) / newTotalValue * 100 : 0)
  let over = 0; let under = 0
  for (const s of stocks) {
    const line = result?.lines.find((l) => l.id === s.id)
    const w = startWeight(s, line?.shares || 0)
    const tgt = targetSum > 0 ? (num(s.target_weight) / targetSum) * 100 : 0
    if (w > tgt + 0.05) over++; else if (w < tgt - 0.05) under++
  }

  const save = async () => {
    if (seedAmount <= 0) { setErr('Enter a seed amount.'); return }
    if (stocks.some((s) => num(s.ltp) <= 0)) { setErr('Every stock needs a current price (LTP) before seeding.'); return }
    setErr(null); setSaving(true)
    const today = new Date()
    const investDate = isoOf(nextInvestmentDate(today, holidays, true))
    try {
      await onConfirm({
        planCode: PLAN, table: TABLE, type: 'lumpsum', month: monthKey(today), investDate,
        amount: seedAmount, cashBefore: num(cashBalance), cashAfter: Math.round((num(cashBalance) + seedAmount - result.totalCost) * 100) / 100,
        lines: result.lines.map((l) => ({ stock_id: l.id, shares: l.shares, price: num(byId[l.id]?.ltp), cost: l.cost })),
      })
    } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open size="lg" title={<><i className="ri-seedling-line me-2 text-success" />Lumpsum Seed</>} onClose={onClose}>
      <p className="text-muted small mb-2">Opens every position at once, sliced by target weight. Minimum: <strong>{money(displayMin, 'INR')}</strong>{binding ? <> (set by {binding.symbol})</> : null}{minSeed ? <span className="ms-1">· exact {money(Math.round(minSeed), 'INR')}</span> : null}.</p>

      <div className="d-flex flex-wrap gap-2 mb-2">
        {SEED_MULTS.map((m) => (
          <button key={m} className={'btn btn-sm ' + (!useCustom && mult === m ? 'btn-success' : 'btn-soft-success')} onClick={() => { setUseCustom(false); setMult(m) }}>
            {m}× <span className="small">· {money(Math.round(displayMin * m), 'INR')}</span>
          </button>
        ))}
        <button className={'btn btn-sm ' + (useCustom ? 'btn-success' : 'btn-soft-secondary')} onClick={() => setUseCustom(true)}>Custom</button>
        {useCustom && <input type="number" className="form-control form-control-sm" style={{ maxWidth: 160 }} placeholder="Amount" value={custom} onChange={(e) => setCustom(e.target.value)} autoFocus />}
      </div>

      {belowMin && <div className="alert alert-warning py-2"><i className="ri-alert-line me-1" />Below the minimum — stocks that can&apos;t reach a full slice are floored to 1 share and start overweight.</div>}

      {result && (
        <div className="table-responsive">
          <table className="table align-middle mb-2">
            <thead className="table-light"><tr><th>Stock</th><th className="text-end">LTP</th><th className="text-end">Shares</th><th className="text-end">Cost</th><th className="text-end">Start wt / target</th></tr></thead>
            <tbody>
              {stocks.map((s) => {
                const line = result.lines.find((l) => l.id === s.id)
                const shares = line?.shares || 0
                const tgt = targetSum > 0 ? (num(s.target_weight) / targetSum) * 100 : 0
                return (
                  <tr key={s.id} className={shares === 0 ? 'text-muted' : ''}>
                    <td className="fw-semibold">{s.symbol}</td>
                    <td className="text-end">{money(num(s.ltp), 'INR')}</td>
                    <td className="text-end fw-semibold">{shares || '—'}</td>
                    <td className="text-end">{line ? money(line.cost, 'INR') : '—'}</td>
                    <td className="text-end">{startWeight(s, shares).toFixed(1)}% <span className="text-muted small">/ {tgt.toFixed(1)}%</span></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="table-light"><tr className="fw-semibold"><td colSpan={3}>Total cost</td><td className="text-end">{money(result.totalCost, 'INR')}</td><td /></tr></tfoot>
          </table>
        </div>
      )}

      {result && (
        <p className="mb-0"><span className="badge bg-info-subtle text-info">Cash carried: {money(result.cashLeft, 'INR')}</span> <span className="text-muted small ms-1">{under} underweight · {over} overweight at start. Place CNC/delivery limit orders mid-session, then confirm.</span></p>
      )}

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving || !result || result.lines.length === 0}><i className="ri-check-line me-1" />{saving ? 'Saving…' : 'Confirm seed'}</button>
      </div>
    </Modal>
  )
}

// --- Add / edit stock -------------------------------------------------------
function StockFormModal({ initial, onClose, onSave }) {
  const [f, setF] = useState(() => ({
    symbol: initial?.symbol || '', name: initial?.name || '', tier: initial?.tier || 'large', sector: initial?.sector || '',
    targetPct: initial ? String(num(initial.target_weight) * 100) : '', ltp: initial?.ltp ?? '', qty: initial?.qty ?? 0, invested: initial?.invested ?? 0,
    notes: initial?.notes || '', checklist: initial?.checklist || {},
  }))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggle = (i) => setF((s) => ({ ...s, checklist: { ...s.checklist, [i]: !s.checklist[i] } }))

  const save = async () => {
    if (!f.symbol.trim()) { setErr('NSE ticker is required.'); return }
    if (!f.name.trim()) { setErr('Name is required.'); return }
    if (num(f.ltp) <= 0) { setErr('LTP must be greater than 0.'); return }
    setErr(null); setSaving(true)
    try { await onSave(f) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open size="lg" title={<><i className="ri-stock-line me-2 text-primary" />{initial ? 'Edit stock' : 'Add stock'}</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-md-4"><label className="form-label small mb-1">NSE ticker</label><input className="form-control text-uppercase" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} autoFocus /></div>
        <div className="col-md-5"><label className="form-label small mb-1">Name</label><input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Tier</label><select className="form-select" value={f.tier} onChange={(e) => set('tier', e.target.value)}><option value="large">Largecap</option><option value="mid">Midcap</option><option value="small">Smallcap</option></select></div>
        <div className="col-md-4"><label className="form-label small mb-1">Sector</label><input className="form-control" value={f.sector} onChange={(e) => set('sector', e.target.value)} placeholder="e.g. Banking" /></div>
        <div className="col-md-2"><label className="form-label small mb-1">Target %</label><input type="number" className="form-control" value={f.targetPct} onChange={(e) => set('targetPct', e.target.value)} /></div>
        <div className="col-md-2"><label className="form-label small mb-1">LTP</label><input type="number" className="form-control" value={f.ltp} onChange={(e) => set('ltp', e.target.value)} /></div>
        {!initial && <>
          <div className="col-md-2"><label className="form-label small mb-1">Qty held</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></div>
          <div className="col-md-2"><label className="form-label small mb-1">Invested</label><input type="number" className="form-control" value={f.invested} onChange={(e) => set('invested', e.target.value)} /></div>
        </>}
        <div className="col-12"><label className="form-label small mb-1">Notes</label><input className="form-control" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="one-line business description" /></div>
      </div>

      <div className="mt-3">
        <div className="small text-muted mb-2">Evaluation checklist</div>
        {CHECKLIST.map((c, i) => (
          <div className="form-check" key={i}>
            <input className="form-check-input" type="checkbox" id={`chk-${i}`} checked={!!f.checklist[i]} onChange={() => toggle(i)} />
            <label className="form-check-label small" htmlFor={`chk-${i}`}>{c}</label>
          </div>
        ))}
      </div>

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : initial ? 'Save' : 'Add stock'}</button>
      </div>
    </Modal>
  )
}

// --- Remove stock (reason) --------------------------------------------------
function RemoveStockModal({ stock, onClose, onConfirm }) {
  const [reason, setReason] = useState(REMOVE_REASONS[0])
  const [other, setOther] = useState('')
  const [saving, setSaving] = useState(false)
  const finalReason = reason === 'Other' ? (other.trim() || 'Other') : reason
  return (
    <Modal open size="md" title={<><i className="ri-delete-bin-line me-2 text-danger" />Remove {stock.symbol}</>} onClose={onClose}>
      <p className="text-muted small">Exit only on filter failure — price falling is not a reason. The stock is soft-deleted (history kept) and logged to the review log.</p>
      <label className="form-label small mb-1">Reason</label>
      <select className="form-select mb-2" value={reason} onChange={(e) => setReason(e.target.value)}>{REMOVE_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
      {reason === 'Other' && <input className="form-control mb-2" placeholder="Describe" value={other} onChange={(e) => setOther(e.target.value)} />}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" disabled={saving} onClick={async () => { setSaving(true); await onConfirm(finalReason) }}><i className="ri-check-line me-1" />Remove</button>
      </div>
    </Modal>
  )
}
