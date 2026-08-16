import { useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import { allocateShares } from '@/data/allocation'
import { monthKey, isoOf, nextInvestmentDate } from '@/data/investCalendar'

/**
 * StockAllotmentModal.jsx — whole-unit gap-fill allotment popup shared by
 * Focus 25 and Metal 25. Converts money (+ carried cash) into whole share/unit
 * buys of the most-underweight holdings, top-N.
 *
 * props: planCode, table ('ee_focus_stocks' | 'ee_etf_holdings'), holdings
 * (each {id, symbol, name, ltp, qty, target_weight}), cashBalance, topN,
 * lastAmount, holidays, monthRecorded, onClose, onConfirm(payload).
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)

export default function StockAllotmentModal({ planCode, table, holdings, cashBalance, topN, lastAmount, holidays, monthRecorded, onClose, onConfirm }) {
  const [amount, setAmount] = useState(String(lastAmount || ''))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const amt = num(amount)
  const items = useMemo(() => holdings.map((h) => ({ id: h.id, ltp: num(h.ltp), qty: num(h.qty), target: num(h.target_weight) })), [holdings])
  const result = useMemo(() => (amt > 0 ? allocateShares(items, amt, num(cashBalance), topN) : null), [amt, items, cashBalance, topN])

  const byId = Object.fromEntries(holdings.map((h) => [h.id, h]))
  const boughtIds = new Set((result?.lines || []).map((l) => l.id))
  const totalCost = (result?.lines || []).reduce((s, l) => s + l.cost, 0)

  const save = async () => {
    if (amt <= 0) { setErr('Enter an amount greater than 0.'); return }
    if (holdings.some((h) => num(h.ltp) <= 0)) { setErr('Every holding needs a current price (LTP) before allotment.'); return }
    setErr(null); setSaving(true)
    const today = new Date()
    const investDate = isoOf(nextInvestmentDate(today, holidays, monthRecorded))
    try {
      await onConfirm({
        planCode, table, month: monthKey(today), investDate, amount: amt,
        cashBefore: num(cashBalance), cashAfter: result.cashBalance, holdings,
        lines: result.lines.map((l) => ({ stock_id: l.id, shares: l.shares, price: num(byId[l.id]?.ltp), cost: l.cost })),
      })
    } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open size="lg" title={<><i className="ri-add-circle-line me-2 text-primary" />Monthly Allotment</>} onClose={onClose}>
      <div className="row g-2 align-items-end mb-2">
        <div className="col-sm-4"><label className="form-label small mb-1">This month&apos;s amount</label><input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
        <div className="col-sm-8 text-muted small">Spendable = amount + carried cash {money(num(cashBalance), 'INR')}. Buys the {topN} most-underweight holdings in whole units.</div>
      </div>
      {monthRecorded && <div className="alert alert-warning py-2"><i className="ri-information-line me-1" />This month is already recorded — confirming will <strong>replace</strong> the existing allotment.</div>}

      {result && (
        <>
          <div className="table-responsive">
            <table className="table align-middle mb-2">
              <thead className="table-light"><tr><th>Holding</th><th className="text-end">LTP</th><th className="text-end">Shares to buy</th><th className="text-end">Cost</th></tr></thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="fw-semibold">{byId[l.id]?.symbol} <span className="text-muted small">{byId[l.id]?.name}</span></td>
                    <td className="text-end">{money(num(byId[l.id]?.ltp), 'INR')}</td>
                    <td className="text-end fw-semibold">{l.shares}</td>
                    <td className="text-end">{money(l.cost, 'INR')}</td>
                  </tr>
                ))}
                {result.lines.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-3">All holdings at/above target — money parks as cash this month.</td></tr>}
              </tbody>
              <tfoot className="table-light"><tr className="fw-semibold"><td colSpan={3}>Total cost</td><td className="text-end">{money(totalCost, 'INR')}</td></tr></tfoot>
            </table>
          </div>

          {holdings.filter((h) => !boughtIds.has(h.id)).length > 0 && (
            <p className="text-muted small mb-1">Skipped (on/above target): {holdings.filter((h) => !boughtIds.has(h.id)).map((h) => h.symbol).join(', ')}.</p>
          )}
          <p className="mb-0"><span className="badge bg-info-subtle text-info">Cash carried to next month: {money(result.cashBalance, 'INR')}</span> <span className="text-muted small ms-1">Buy these quantities via your broker, then confirm below.</span></p>
        </>
      )}

      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !result}><i className="ri-check-line me-1" />{saving ? 'Saving…' : 'Confirm allotment'}</button>
      </div>
    </Modal>
  )
}
