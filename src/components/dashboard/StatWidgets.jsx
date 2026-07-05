import { statWidgets } from '@/data/dashboardData'
import { Secret } from '@/context/PrivacyContext'

export default function StatWidgets() {
  return (
    <div className="row">
      {statWidgets.map((w) => {
        const up = w.delta >= 0
        return (
          <div className="col-xl-3 col-md-6" key={w.id}>
            <div className="card stat-card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <span className="stat-label">{w.label}</span>
                  </div>
                  <div className={`stat-delta ${up ? 'up' : 'down'}`}>
                    <i className={up ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} />
                    <Secret>{Math.abs(w.delta).toFixed(2)}</Secret> %
                  </div>
                </div>
                <div className="d-flex align-items-end justify-content-between mt-2">
                  <div>
                    <h4 className="stat-value"><Secret>{w.value}</Secret></h4>
                    <a href="#!" className="stat-link">
                      {w.link} <i className="ri-arrow-right-line" />
                    </a>
                  </div>
                  <div className={`stat-icon bg-${w.tone}-subtle text-${w.tone}`}>
                    <i className={w.icon} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
