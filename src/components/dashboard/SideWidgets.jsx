import { recentActivity, topCategories } from '@/data/dashboardData'
import { Secret } from '@/context/PrivacyContext'

export function RecentActivity() {
  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex-grow-1">Recent Activity</h4>
        <button className="btn btn-sm btn-soft-primary">View All</button>
      </div>
      <div className="card-body">
        {recentActivity.map((a) => (
          <div className="activity-item" key={a.id}>
            <span className={`activity-icon bg-${a.tone}-subtle text-${a.tone}`}>
              <i className={a.icon} />
            </span>
            <div className="flex-grow-1">
              <p className="a-title">{a.title}</p>
              <p className="a-text">{a.text}</p>
              <span className="a-time">{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TopCategories() {
  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex-grow-1">Top Categories</h4>
      </div>
      <div className="card-body">
        <ul className="cat-list">
          {topCategories.map((c) => (
            <li key={c.name}>
              <span>{c.name}</span>
              <span className="cat-count"><Secret>{c.count}</Secret></span>
            </li>
          ))}
        </ul>
        <a href="#!" className="btn btn-soft-primary w-100 mt-3">View all Categories</a>
      </div>
    </div>
  )
}
