import { useLocation } from 'react-router-dom'

/* Generic stub for every route that isn't built yet. Derives a friendly title
   from the URL so the sidebar always leads somewhere sensible. */
export default function Placeholder() {
  const { pathname } = useLocation()
  const title = pathname
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page'

  return (
    <>
      <div className="page-title-box">
        <h4>{title}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item active" aria-current="page">{title}</li>
          </ol>
        </nav>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="placeholder-page">
            <i className="ri-tools-line ph-icon" />
            <h3>{title}</h3>
            <p className="mb-3" style={{ maxWidth: 420 }}>
              This screen is a placeholder. The layout, theming, and navigation are
              already wired up — drop your components in
              <code className="mx-1">src/pages</code> and add a route in
              <code className="mx-1">src/App.jsx</code>.
            </p>
            <a href="/" className="btn btn-primary">
              <i className="ri-arrow-left-line me-1" /> Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
