/**
 * Assessment.jsx
 * -----------------------------------------------------------------------------
 * Reusable pre-trade checklist. Rule definitions + helpers live in
 * ./assessmentRules — the user never edits the questions, only picks answers.
 *
 * Used in three places:
 *   1. Rule Book  — a live, editable checklist run before a trade.
 *   2. Journal trade — attached to each trade log; editable while logging,
 *                      `readOnly` once the trade is saved.
 *   3. Journal note  — `only="setup"` captures just the market-observation half
 *                      (no risk-discipline gate / verdict).
 *
 * Controlled component:
 *   <Assessment answers={obj} onChange={(id, value) => ...} />
 *   <Assessment answers={obj} readOnly />               // locked, summary view
 *   <Assessment answers={obj} only="setup" />           // setup section only
 *
 * The quantity / SL free-text inputs live in `answers` under the reserved keys
 * `maxQtyValue` and `slValue`, so the whole state is one flat object.
 */
import { assessment, discipline, sentiment, evaluate } from './assessmentRules'

/* Soft, tinted badge class for a directional value — light bull/bear/neutral
   background so the read-only setup pills read at a glance. Falls back to a
   plain light pill for non-directional values (VIX, S&R, etc.). */
function softSentimentTone(value) {
  const o = String(value || '').toLowerCase()
  if (o.includes('turning') || o.includes('neutral')) return 'bg-warning-subtle text-warning'
  if (o.includes('bullish')) return 'bg-success-subtle text-success'
  if (o.includes('bearish')) return 'bg-danger-subtle text-danger'
  // Non-directional (VIX, S&R): fixed light pill → keep text dark in dark mode.
  return 'bg-light text-body border pill-light'
}

/* Read-only summary of a single rule: label + the chosen value as a pill.
   `tone` (a solid bg-* class) forces the discipline pass/fail look with white
   text; otherwise the pill is softly tinted by sentiment. */
function ReadonlyRow({ label, value, tone }) {
  const s = sentiment(value)
  const solid = Boolean(tone)
  const badgeClass = solid ? tone + ' text-white' : softSentimentTone(value)
  return (
    <div className="rule-row d-flex align-items-center justify-content-between">
      <span className="fw-medium">{label}</span>
      {value ? (
        <span className={'badge fs-11 ' + badgeClass}>
          {s && <i className={s.icon + ' me-1'} style={{ color: solid ? '#fff' : s.color }} />}
          {value}
        </span>
      ) : (
        <span className="text-muted small fst-italic">—</span>
      )}
    </div>
  )
}

export default function Assessment({
  answers = {},
  onChange = () => {},
  readOnly = false,
  showVerdict = true,
  only = null, // null = both sections, 'setup' or 'discipline' = just one
  className = '',
}) {
  const set = (id, value) => onChange(id, value)
  const { assessed, failing, ready } = evaluate(answers)

  const showSetup = only !== 'discipline'
  const showDiscipline = only !== 'setup'
  const solo = only != null // only one section visible → let it span full width

  // ---- Read-only: compact summary (used inside a saved trade / note) --------
  if (readOnly) {
    return (
      <div className={'assessment row g-3 ' + className}>
        {showSetup && (
          <div className={solo ? 'col-12' : 'col-md-6'}>
            <h6 className="text-uppercase text-muted fs-11 mb-2">
              <i className="ri-radar-line me-1 text-primary" />Setup Assessment
            </h6>
            {assessment.map((rule) => (
              <ReadonlyRow key={rule.id} label={rule.label} value={answers[rule.id]} />
            ))}
          </div>
        )}
        {showDiscipline && (
          <div className={solo ? 'col-12' : 'col-md-6'}>
            <h6 className="text-uppercase text-muted fs-11 mb-2">
              <i className="ri-shield-check-line me-1 text-primary" />Risk Discipline
            </h6>
            {discipline.map((rule) => {
              const val = answers[rule.id]
              const tone = val ? (val === rule.safe ? 'bg-success' : 'bg-danger') : ''
              return <ReadonlyRow key={rule.id} label={rule.label} value={val} tone={tone} />
            })}
            {(answers.maxQtyValue || answers.slValue) && (
              <div className="d-flex gap-3 mt-2 small text-muted">
                {answers.maxQtyValue && <span>Max qty: <strong>{answers.maxQtyValue}</strong></span>}
                {answers.slValue && <span>SL: <strong>{answers.slValue}</strong></span>}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ---- Editable: the interactive checklist ---------------------------------
  return (
    <div className={'assessment ' + className}>
      <div className="row g-3">
      {/* Setup assessment — label/hint on the left, options inline on the right */}
      {showSetup && (
        <div className={showDiscipline ? 'col-xl-7' : 'col-12'}>
        <div className="card mb-0 h-100">
          <div className="card-header">
            <h6 className="card-title mb-0">
              <i className="ri-radar-line me-2 text-primary" />Setup Assessment
            </h6>
          </div>
          <div className="card-body">
            {assessment.map((rule) => (
              <div className="rule-row rule-inline" key={rule.id}>
                <div className="rule-label">
                  <span className="fw-medium d-block">{rule.label}</span>
                  <small className="text-muted">{rule.hint}</small>
                </div>
                <div className="d-flex flex-wrap gap-2 flex-grow-1">
                  {rule.options.map((opt) => {
                    const s = sentiment(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={'btn btn-sm ' + (answers[rule.id] === opt ? 'btn-primary' : 'btn-light')}
                        onClick={() => set(rule.id, opt)}
                      >
                        {s && <i className={s.icon + ' sentiment-arrow me-1'} style={{ color: s.color }} />}
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* Risk discipline — beside the setup, same inline row layout */}
      {showDiscipline && (
        <div className={showSetup ? 'col-xl-5' : 'col-12'}>
        <div className="card mb-0 h-100">
          <div className="card-header">
            <h6 className="card-title mb-0">
              <i className="ri-shield-check-line me-2 text-primary" />Risk Discipline
            </h6>
          </div>
          <div className="card-body">
            {discipline.map((rule) => {
              const val = answers[rule.id]
              const isSafe = val === rule.safe
              return (
                <div className="rule-row rule-inline" key={rule.id}>
                  <div className="rule-label">
                    <span className="fw-medium d-block">{rule.label}</span>
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                    {rule.options.map((opt) => {
                      const selected = val === opt
                      const tone = opt === rule.safe ? 'btn-success' : 'btn-danger'
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={'btn btn-sm ' + (selected ? tone : 'btn-light')}
                          onClick={() => set(rule.id, opt)}
                        >
                          {opt}
                        </button>
                      )
                    })}
                    {rule.id === 'maxqty' && isSafe && (
                      <input
                        type="number"
                        className="form-control form-control-sm rule-inline-input"
                        placeholder="Max quantity (e.g. 75)"
                        value={answers.maxQtyValue || ''}
                        onChange={(e) => set('maxQtyValue', e.target.value)}
                      />
                    )}
                    {rule.id === 'sl' && isSafe && (
                      <input
                        type="number"
                        className="form-control form-control-sm rule-inline-input"
                        placeholder="SL price / points"
                        value={answers.slValue || ''}
                        onChange={(e) => set('slValue', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </div>
      )}
      </div>

      {/* Verdict — only meaningful when the discipline gate is present */}
      {showVerdict && showDiscipline && (
        <div className={'card border-0 verdict mt-3 mb-0 ' + (ready ? 'verdict-go' : 'verdict-wait')}>
          <div className="card-body d-flex align-items-center flex-wrap gap-3">
            <i className={'verdict-icon ' + (ready ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill')} />
            <div className="flex-grow-1">
              <h5 className="mb-1">
                {ready ? 'All rules satisfied — you may take the trade.' : 'Do not trade yet.'}
              </h5>
              <p className="mb-0 small">
                {!assessed && 'Complete the setup assessment. '}
                {failing.length > 0 && (
                  <>Fix these: {failing.map((r) => r.label.replace('?', '')).join(', ')}.</>
                )}
                {ready && 'Stick to your defined quantity and stop-loss. Average only once.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
