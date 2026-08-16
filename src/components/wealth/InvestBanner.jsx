import { nextInvestmentDate, daysLeft, isPending } from '@/data/investCalendar'

/**
 * InvestBanner.jsx — the fixed "send by the 20th, invest on the 25th" rule
 * banner shared by every Eva & Ezaak plan screen. Shows next investment date,
 * days left, an investment-day highlight, and a pending warning.
 *
 * props: rule (string), holidays (Set), monthRecorded (bool), extra (node).
 */
export default function InvestBanner({ rule, holidays, monthRecorded, extra }) {
  const today = new Date()
  const next = nextInvestmentDate(today, holidays, monthRecorded)
  const left = daysLeft(next, today)
  const pending = isPending(today, monthRecorded)
  const isToday = left === 0

  const tone = pending ? 'warning' : isToday ? 'success' : 'primary'
  const dateStr = next.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className={`alert alert-${tone} border-0 d-flex flex-wrap align-items-center gap-2 mb-3`} role="alert">
      <i className="ri-calendar-check-line fs-18" />
      <div className="flex-grow-1">
        <div className="fw-semibold">{rule}</div>
        <div className="small mt-1">
          {pending ? (
            <><i className="ri-error-warning-line me-1" />This month&apos;s investment is <strong>pending</strong>.</>
          ) : isToday ? (
            <><i className="ri-flashlight-line me-1" /><strong>Today is investment day</strong> ({dateStr}).</>
          ) : (
            <>Next investment: <strong>{dateStr}</strong> — {left} day{left === 1 ? '' : 's'} left.</>
          )}
          {extra ? <span className="ms-2">· {extra}</span> : null}
        </div>
      </div>
    </div>
  )
}
