import { useFx } from '@/context/FxContext'
import { money } from '@/data/AppData'

/**
 * Settings.jsx
 * -----------------------------------------------------------------------------
 * App settings. Currently the AED → INR conversion rate used to roll up
 * multi-currency balances (Savings, etc.) into a single INR figure.
 */
export default function Settings() {
  const { aedToInr, setAedToInr } = useFx()

  return (
    <div className="settings">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Settings</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item active" aria-current="page">Settings</li>
          </ol>
        </nav>
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Currency conversion</h5></div>
            <div className="card-body">
              <label className="form-label small mb-1">AED → INR rate</label>
              <div className="input-group" style={{ maxWidth: 320 }}>
                <span className="input-group-text">1 AED =</span>
                <input
                  type="number" step="0.01" min="0" className="form-control"
                  value={aedToInr}
                  onChange={(e) => setAedToInr(e.target.value)}
                />
                <span className="input-group-text">INR</span>
              </div>
              <p className="text-muted small mt-3 mb-0">
                Used to convert AED balances to INR wherever totals mix currencies (e.g. Savings).
                <br />
                <i className="ri-arrow-right-line me-1" />
                Example: <strong>{money(1000, 'AED')}</strong> = <strong>{money(1000 * aedToInr, 'INR')}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
