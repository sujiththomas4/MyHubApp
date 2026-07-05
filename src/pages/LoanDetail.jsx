import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { loans, installments, prepayments, money, fmtDate, fmtMonth, slugOf, loanStats, balanceAfter, rateOf, remainingMonths, forwardBalances } from '@/data/AppData'
import { useChartColors } from '@/components/dashboard/useChartColors'

const PAGE_SIZE = 12

/**
 * LoanDetail.jsx
 * -----------------------------------------------------------------------------
 * A single loan's sub-page (route /loans/:slug).
 *
 * The installments array only holds PAID records; the future months are
 * generated here as 'not paid' rows with a "Mark paid" action. Marking a month
 * paid, or adding a lump-sum, reduces the outstanding by the EMI / lump amount
 * and everything recomputes reactively: EMIs paid, remaining count, payoff
 * date, and the projected-outstanding chart.
 *
 * Marks + prepayments are local state for now (seeded from AppData).
 */

const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// --- Lump-sum add form -------------------------------------------------------
function AddPrepayment({ currency, onAdd }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  const save = () => {
    const value = parseFloat(amount)
    if (!value || value <= 0) return
    onAdd({ id: 'p-' + rid(), date, amount: value, note: note.trim() })
    setAmount(''); setNote(''); setDate(todayISO()); setOpen(false)
  }

  if (!open) {
    return (
      <button className="btn btn-soft-primary btn-sm w-100" onClick={() => setOpen(true)}>
        <i className="ri-add-line me-1" /> Add lump-sum prepayment
      </button>
    )
  }
  return (
    <div className="border rounded p-2">
      <div className="mb-2">
        <label className="form-label small mb-1">Amount ({currency})</label>
        <input type="number" className="form-control form-control-sm" placeholder="e.g. 50000"
          value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </div>
      <div className="mb-2">
        <label className="form-label small mb-1">Date</label>
        <input type="date" className="form-control form-control-sm" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="form-label small mb-1">Note (optional)</label>
        <input className="form-control form-control-sm" placeholder="e.g. Annual bonus"
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />Save</button>
        <button className="btn btn-light btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}

export default function LoanDetail() {
  const { slug } = useParams()
  const colors = useChartColors()

  const loan = useMemo(() => {
    const found = loans.find((l) => slugOf(l) === slug)
    return found ? { ...found, ...loanStats(found) } : null
  }, [slug])

  // Session state: months marked paid (future) + lump-sum prepayments.
  const [markedPaid, setMarkedPaid] = useState(() => new Set())
  const [prepays, setPrepays] = useState([])
  const [page, setPage] = useState(1)
  const [chartType, setChartType] = useState('area') // 'area' | 'bar'

  // Reset when switching between loan detail pages (same component instance).
  useEffect(() => {
    setPage(1)
    setMarkedPaid(new Set())
    setPrepays(
      prepayments.filter((p) => loan && p.loanId === loan.id).sort((a, b) => b.date.localeCompare(a.date))
    )
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loan) {
    return (
      <>
        <div className="page-title-box"><h4 className="mb-0">Loan not found</h4></div>
        <div className="card"><div className="card-body">
          <p className="mb-3">No loan matches “{slug}”.</p>
          <Link to="/loans" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to Loans</Link>
        </div></div>
      </>
    )
  }

  const emi = loan.emi
  const r = rateOf(loan)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(loan.startDate + 'T00:00:00')

  // Static installments (only up to the current month). 'not paid' rows can be
  // marked paid; already-paid rows are locked.
  const schedule = installments.filter((i) => i.loanId === loan.id)
  const allRows = schedule
    .map((s) => ({
      ...s,
      editable: s.status !== 'paid',
      status: s.status === 'paid' || markedPaid.has(s.id) ? 'paid' : 'not paid',
    }))
    .sort((a, b) => b.date.localeCompare(a.date))

  // Reactive calculations
  const emisPaid = allRows.filter((s) => s.status === 'paid').length // base + marked
  const totalPrepaid = prepays.reduce((s, p) => s + p.amount, 0)
  const outstanding = Math.max(0, balanceAfter(loan, emisPaid) - totalPrepaid)
  const remainingEmis = remainingMonths(outstanding, emi, r)
  const totalEmis = emisPaid + remainingEmis
  const payoffDate = addMonths(today, remainingEmis)
  const cleared = loan.amount - outstanding
  const pctPaid = Math.round((cleared / loan.amount) * 100)

  const togglePaid = (id) => setMarkedPaid((s) => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const addPrepay = (p) => setPrepays((ps) => [...ps, { ...p, loanId: loan.id }].sort((a, b) => b.date.localeCompare(a.date)))
  const removePrepay = (id) => setPrepays((ps) => ps.filter((p) => p.id !== id))

  // Pagination
  const pageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = allRows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // Chart: amortized balances up to today, then re-amortized forward from the
  // (possibly prepaid) balance to zero — reaches the end date with no
  // prepayments, or earlier once you prepay / catch up.
  const map = new Map()
  for (let k = 0; k <= emisPaid; k++) map.set(addMonths(start, k).getTime(), balanceAfter(loan, k))
  forwardBalances(outstanding, emi, r).forEach((b, j) => map.set(addMonths(today, j).getTime(), b))
  const proj = [...map.entries()].sort((a, b) => a[0] - b[0])

  const chartOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
    colors: [colors.primary],
    stroke: { width: chartType === 'bar' ? 0 : 2, curve: 'smooth' },
    fill: chartType === 'bar' ? { type: 'solid', opacity: 0.85 } : { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.03 } },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      min: start.getTime(),
      max: new Date(loan.endDate + 'T00:00:00').getTime(),
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { style: { colors: colors.text, fontSize: '11px' } },
    },
    yaxis: { min: 0, labels: { style: { colors: colors.text, fontSize: '11px' }, formatter: (v) => money(v, loan.currency) } },
    grid: { borderColor: colors.grid, strokeDashArray: 3 },
    tooltip: { theme: 'light', x: { format: 'MMM yyyy' }, y: { formatter: (v) => money(v, loan.currency) } },
    annotations: {
      xaxis: [{
        x: today.getTime(), borderColor: colors.text, strokeDashArray: 4,
        label: { text: 'Today', style: { background: colors.primary, color: '#fff', fontSize: '10px' } },
      }],
    },
  }
  const chartSeries = [{ name: 'Outstanding', data: proj }]

  return (
    <div className="loans">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{loan.bankName}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><Link to="/loans">Loans</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{loan.bankName}</li>
          </ol>
        </nav>
      </div>

      {/* Summary row */}
      <div className="row">
        <div className="col-md-3 col-6">
          <div className="card stat-card"><div className="card-body">
            <span className="stat-label">Outstanding</span>
            <h4 className="stat-value mt-2 mb-0">{money(outstanding, loan.currency)}</h4>
            {totalPrepaid > 0 && (
              <span className="text-success small">−{money(totalPrepaid, loan.currency)} prepaid</span>
            )}
          </div></div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card stat-card"><div className="card-body">
            <span className="stat-label">Borrowed</span>
            <h4 className="stat-value mt-2 mb-0">{money(loan.amount, loan.currency)}</h4>
            <span className="text-muted small">{pctPaid}% repaid</span>
          </div></div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card stat-card"><div className="card-body">
            <span className="stat-label">EMIs paid</span>
            <h4 className="stat-value mt-2 mb-0">{emisPaid} / {totalEmis}</h4>
            <span className="text-muted small">{remainingEmis} left</span>
          </div></div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card stat-card"><div className="card-body">
            <span className="stat-label">Payoff by</span>
            <h4 className="stat-value mt-2 mb-0">{fmtMonth(isoOf(payoffDate))}</h4>
            <span className="text-muted small">{remainingEmis} EMIs to go</span>
          </div></div>
        </div>
      </div>

      {/* Payoff chart */}
      <div className="card">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Outstanding over time</h5>
          <small className="text-muted d-none d-md-inline">re-slopes with each prepayment</small>
          <div className="btn-group btn-group-sm" role="group">
            <button className={'btn ' + (chartType === 'area' ? 'btn-primary' : 'btn-light')} title="Line" onClick={() => setChartType('area')}>
              <i className="ri-line-chart-line" />
            </button>
            <button className={'btn ' + (chartType === 'bar' ? 'btn-primary' : 'btn-light')} title="Bar" onClick={() => setChartType('bar')}>
              <i className="ri-bar-chart-2-line" />
            </button>
          </div>
        </div>
        <div className="card-body">
          <ReactApexChart key={colors.primary + chartType} options={chartOptions} series={chartSeries} type={chartType} height={300} />
        </div>
      </div>

      <div className="row">
        {/* Installments */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1">Installments</h5>
              <small className="text-muted">{emisPaid} paid · {remainingEmis} to go</small>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th><th className="text-end">Amount</th><th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-muted py-4">No installments listed.</td></tr>
                    ) : pageRows.map((i) => {
                      const paid = i.status === 'paid'
                      return (
                        <tr key={i.id}>
                          <td>{fmtDate(i.date)}</td>
                          <td className="text-end">{money(i.amount, loan.currency)}</td>
                          <td className="text-center">
                            {paid ? (
                              <span className="d-inline-flex align-items-center gap-1">
                                <span className="badge bg-success">Paid</span>
                                {i.editable && (
                                  <button className="btn btn-sm btn-ghost-secondary p-0" title="Mark unpaid" onClick={() => togglePaid(i.id)}>
                                    <i className="ri-close-circle-line" />
                                  </button>
                                )}
                              </span>
                            ) : (
                              <button className="btn btn-sm btn-soft-primary py-0" onClick={() => togglePaid(i.id)}>
                                <i className="ri-check-line me-1" />Mark paid
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {pageCount > 1 && (
              <div className="card-footer d-flex align-items-center justify-content-between">
                <small className="text-muted">
                  Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, allRows.length)} of {allRows.length}
                </small>
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-light" disabled={current === 1} onClick={() => setPage(current - 1)}>
                    <i className="ri-arrow-left-s-line" /> Prev
                  </button>
                  <span className="btn btn-light disabled">{current} / {pageCount}</span>
                  <button className="btn btn-light" disabled={current === pageCount} onClick={() => setPage(current + 1)}>
                    Next <i className="ri-arrow-right-s-line" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prepayments */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header d-flex align-items-center">
              <h5 className="card-title mb-0 flex-grow-1">Lump-sum prepayments</h5>
              {totalPrepaid > 0 && <span className="badge bg-success-subtle text-success">{money(totalPrepaid, loan.currency)}</span>}
            </div>
            <div className="card-body">
              {prepays.length === 0 ? (
                <p className="text-muted small">No prepayments yet. Add a one-time amount to knock down the outstanding.</p>
              ) : (
                <ul className="list-unstyled mb-3">
                  {prepays.map((p) => (
                    <li key={p.id} className="d-flex align-items-center gap-2 py-2 border-bottom">
                      <div className="flex-grow-1">
                        <div className="fw-medium">{money(p.amount, loan.currency)}</div>
                        <small className="text-muted">{fmtDate(p.date)}{p.note ? ' · ' + p.note : ''}</small>
                      </div>
                      <button className="btn btn-sm btn-ghost-danger p-1" title="Remove" onClick={() => removePrepay(p.id)}>
                        <i className="ri-delete-bin-line" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <AddPrepayment currency={loan.currency} onAdd={addPrepay} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
