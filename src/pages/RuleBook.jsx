import { useState } from 'react'
import Assessment from '@/components/trading/Assessment'

/**
 * RuleBook.jsx
 * -----------------------------------------------------------------------------
 * Pre-trade checklist. Run through it before EVERY trade:
 *   1. Assess the setup (market / OI / bias / S&R).
 *   2. Clear the risk-discipline gate (FOMO / qty / SL / averaging).
 * The verdict only turns green when the discipline rules pass.
 *
 * The checklist itself lives in <Assessment /> so the Journal can reuse it
 * per trade. This page is just a live, editable instance of it.
 */
export default function RuleBook() {
  const [answers, setAnswers] = useState({})
  const set = (id, value) => setAnswers((a) => ({ ...a, [id]: value }))
  const reset = () => setAnswers({})

  return (
    <>
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Rule Book</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Updates</li>
            <li className="breadcrumb-item active" aria-current="page">Rule Book</li>
          </ol>
        </nav>
      </div>

      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-4">
        <p className="text-muted mb-0">
          Complete this checklist <strong>before every trade</strong>. The verdict clears only
          when the risk-discipline rules are all satisfied.
        </p>
        <button type="button" className="btn btn-light btn-sm" onClick={reset}>
          <i className="ri-refresh-line me-1" /> Reset
        </button>
      </div>

      <Assessment answers={answers} onChange={set} />
    </>
  )
}
