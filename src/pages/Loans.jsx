import ReactApexChart from 'react-apexcharts'
import { Link } from 'react-router-dom'
import { money, fmtMonth as fmtDate, trajectory, slugOf, tenureMonths, balanceAfter } from '@/data/AppData'
import { useLoans, useInstallments, usePrepayments } from '@/data/loansRepo'
import { useChartColors } from '@/components/dashboard/useChartColors'
import { useFx } from '@/context/FxContext'

/**
 * Loans.jsx
 * -----------------------------------------------------------------------------
 * Overview of every loan (see the schema in src/data/AppData.js).
 *   - Summary tiles: outstanding by currency, active loans, EMIs progress.
 *   - "Payoff trajectory": each loan's balance shrinking to zero over its
 *     tenure (as % of principal, so INR + AED sit on one scale), with a Today
 *     marker — so you can see how close each loan is to finishing.
 *   - Per-loan cards (link through to the loan's detail page): actual
 *     outstanding, EMI progress bar, and a mini declining-balance chart.
 */

// --- Summary tile ------------------------------------------------------------
function Tile({ label, value, sub, icon, tone }) {
  return (
    <div className="col-xl col-md-4 col-6">
      <div className="card stat-card h-100 mb-0">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="flex-grow-1"><span className="stat-label">{label}</span></div>
            <div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div>
          </div>
          <h4 className="stat-value mt-3 mb-0">{value}</h4>
          {sub && <span className="text-muted small">{sub}</span>}
        </div>
      </div>
    </div>
  )
}

// --- Per-loan card -----------------------------------------------------------
function LoanCard({ loan, color }) {
  const pctPaid = Math.round((loan.installmentsPaid / loan.numberOfInstallments) * 100)
  const emisLeft = loan.numberOfInstallments - loan.installmentsPaid

  const options = {
    chart: { sparkline: { enabled: true }, fontFamily: 'Poppins, sans-serif' },
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    colors: [color],
    tooltip: {
      theme: 'light',
      x: { format: 'MMM yyyy' },
      y: { formatter: (v) => money(v, loan.currency) },
    },
    xaxis: { type: 'datetime' },
  }

  return (
    <div className="col-lg-4">
      <div className="card h-100 mb-0">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <div className="stat-icon bg-light text-body me-2" style={{ width: 38, height: 38 }}>
              <i className="ri-bank-line" />
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-0">
                <Link to={`/loans/${slugOf(loan)}`} className="text-reset">{loan.bankName}</Link>
              </h6>
              <small className="text-muted">
                <i className={(loan.location === 'India' ? 'ri-flag-2-line' : 'ri-building-line') + ' me-1'} />
                {loan.location} · {loan.currency}
              </small>
            </div>
            <span className={'badge ' + (pctPaid >= 50 ? 'bg-success' : 'bg-warning')}>{pctPaid}% paid</span>
          </div>

          <div className="d-flex justify-content-between align-items-end mb-1">
            <div>
              <div className="text-muted small">Outstanding</div>
              <h4 className="mb-0" style={{ color: 'var(--hub-heading-color)' }}>
                {money(loan.outstanding, loan.currency)}
              </h4>
            </div>
            <div className="text-end">
              <div className="text-muted small">Borrowed</div>
              <span className="fw-medium">{money(loan.amount, loan.currency)}</span>
            </div>
          </div>

          <div className="progress mt-2" style={{ height: 6 }}>
            <div
              className={'progress-bar ' + (pctPaid >= 50 ? 'bg-success' : 'bg-primary')}
              style={{ width: pctPaid + '%' }}
            />
          </div>
          <div className="d-flex justify-content-between text-muted small mt-1">
            <span>{loan.installmentsPaid}/{loan.numberOfInstallments} EMIs · {emisLeft} left</span>
            <span>{fmtDate(loan.startDate)} → {fmtDate(loan.endDate)}</span>
          </div>

          <ReactApexChart
            key={color}
            options={options}
            series={[{ name: 'Outstanding', data: trajectory(loan) }]}
            type="area"
            height={70}
          />
        </div>
      </div>
    </div>
  )
}

// --- Page --------------------------------------------------------------------
export default function Loans() {
  const colors = useChartColors()
  const { toINR, aedToInr } = useFx()
  const loans = useLoans()
  const installments = useInstallments()
  const prepayments = usePrepayments()
  const palette = [colors.primary, '#4b93ff', '#f7b84b']

  // Paid count from the LIVE installments (so marks made on the detail page are
  // reflected here); outstanding = amortized balance at that count, LESS any
  // lump-sum prepayments — same as the loan detail page. Without the prepayment
  // subtraction this list overstated every balance.
  const rows = loans.map((l) => {
    const numberOfInstallments = tenureMonths(l)
    const installmentsPaid = installments.filter((i) => i.loanId === l.id && i.status === 'paid').length
    const prepaid = prepayments.filter((p) => p.loanId === l.id).reduce((s, p) => s + p.amount, 0)
    const outstanding = Math.max(0, balanceAfter(l, installmentsPaid) - prepaid)
    return { ...l, numberOfInstallments, installmentsPaid, prepaid, outstanding }
  })

  // Aggregates
  const byCurrency = rows.reduce((acc, l) => {
    const c = (acc[l.currency] = acc[l.currency] || { borrowed: 0, outstanding: 0 })
    c.borrowed += l.amount
    c.outstanding += l.outstanding
    return acc
  }, {})
  const outINR = byCurrency.INR?.outstanding || 0
  const outAED = byCurrency.AED?.outstanding || 0
  const totalOutInr = outINR + toINR(outAED, 'AED')
  const totalEmis = rows.reduce((s, l) => s + l.numberOfInstallments, 0)
  const paidEmis = rows.reduce((s, l) => s + l.installmentsPaid, 0)
  const emiPct = totalEmis ? Math.round((paidEmis / totalEmis) * 100) : 0
  const india = rows.filter((l) => l.location === 'India').length
  const uae = rows.filter((l) => l.location === 'UAE').length

  // Hero chart — % principal remaining per loan, converging to zero.
  const heroOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'Poppins, sans-serif' },
    colors: palette,
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: colors.text, fontSize: '11px' } },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        style: { colors: colors.text, fontSize: '11px' },
        formatter: (v) => Math.round(v) + '%',
      },
    },
    grid: { borderColor: colors.grid, strokeDashArray: 3 },
    legend: { show: true, labels: { colors: colors.text }, markers: { radius: 6 } },
    tooltip: {
      theme: 'light',
      x: { format: 'MMM yyyy' },
      y: { formatter: (v) => Math.round(v) + '% remaining' },
    },
    annotations: {
      xaxis: [
        {
          x: new Date().getTime(),
          borderColor: colors.text,
          strokeDashArray: 4,
          label: {
            text: 'Today',
            style: { background: colors.primary, color: '#fff', fontSize: '10px' },
          },
        },
      ],
    },
  }
  const heroSeries = rows.map((l) => ({ name: l.bankName, data: trajectory(l, { asPercent: true }) }))

  return (
    <div className="loans">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Loans</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item active" aria-current="page">Loans</li>
          </ol>
        </nav>
      </div>

      {/* Summary tiles */}
      <div className="row g-3 mb-4">
        <Tile
          label="Total Outstanding (INR)"
          value={money(totalOutInr, 'INR')}
          sub={`${money(outINR, 'INR')} + ${money(outAED, 'AED')} ≈ ${money(toINR(outAED, 'AED'), 'INR')} @ ${aedToInr}`}
          icon="ri-scales-3-line" tone="danger"
        />
        <Tile
          label="Outstanding (INR)"
          value={money(outINR, 'INR')}
          sub={`of ${money(byCurrency.INR?.borrowed || 0, 'INR')} borrowed`}
          icon="ri-money-rupee-circle-line" tone="warning"
        />
        <Tile
          label="Outstanding (AED)"
          value={money(outAED, 'AED')}
          sub={`≈ ${money(toINR(outAED, 'AED'), 'INR')}`}
          icon="ri-money-dollar-circle-line" tone="info"
        />
        <Tile
          label="Active loans" value={rows.length}
          sub={`India ${india} · UAE ${uae}`} icon="ri-hand-coin-line" tone="primary"
        />
        <Tile
          label="EMIs paid" value={`${paidEmis} / ${totalEmis}`}
          sub={`${emiPct}% cleared`} icon="ri-calendar-check-line" tone="success"
        />
      </div>

      {/* Payoff trajectory */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Payoff trajectory</h5>
          <small className="text-muted">% of principal remaining · sloping to zero</small>
        </div>
        <div className="card-body">
          <ReactApexChart
            key={colors.primary}
            options={heroOptions}
            series={heroSeries}
            type="area"
            height={340}
          />
        </div>
      </div>

      {/* Per-loan cards */}
      <div className="row g-3">
        {rows.map((loan, i) => (
          <LoanCard key={loan.id} loan={loan} color={palette[i % palette.length]} />
        ))}
      </div>
    </div>
  )
}
