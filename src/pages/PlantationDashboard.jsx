import ReactApexChart from 'react-apexcharts'
import { Link } from 'react-router-dom'
import { fmtDate } from '@/data/AppData'
import { useChartColors } from '@/components/dashboard/useChartColors'
import {
  useLands, useZones, useZoneItems, useVerticals, usePoles, usePlants, useCare, useDefects,
} from '@/data/plantationLandRepo'
import landImg from '@/assets/land.webp'
import zoneImg from '@/assets/zone.jpg'
import rowsImg from '@/assets/rows.webp'
import poleImg from '@/assets/pole.webp'
import plantImg from '@/assets/plant.jpg'

/**
 * PlantationDashboard.jsx — a detailed overview of the whole plantation
 * (route /business/plantations/dashboard). Rolls the Land -> Zone -> Vertical ->
 * Pole -> Plant hierarchy into headline tiles, breakdown charts, per-land cards,
 * open defects, pending care and an image gallery.
 */
const PALETTE = ['#0ab39c', '#4b93ff', '#f7b84b', '#f06548', '#6c5ffc', '#e83e8c', '#ffab00', '#5b73e8', '#26a0fc', '#2ab57d']
const groupCount = (arr, keyOf) => {
  const m = new Map()
  arr.forEach((x) => { const k = keyOf(x) || 'Unspecified'; m.set(k, (m.get(k) || 0) + 1) })
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
const STATUS_COLOR = { healthy: '#0ab39c', defect: '#f7b84b', dead: '#f06548' }
const DEFECT_BADGE = { open: 'bg-danger-subtle text-danger', treating: 'bg-warning-subtle text-dark', resolved: 'bg-success-subtle text-success' }

function Tile({ label, value, sub, icon, img, tone }) {
  return (
    <div className="col-xl-2 col-md-4 col-6">
      <div className="card stat-card h-100 mb-0"><div className="card-body">
        <div className="d-flex align-items-center">
          <div className="flex-grow-1"><span className="stat-label">{label}</span></div>
          {img
            ? <img src={img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
            : <div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div>}
        </div>
        <h4 className="stat-value mt-3 mb-0">{value}</h4>
        {sub && <span className="text-muted small">{sub}</span>}
      </div></div>
    </div>
  )
}

function DonutCard({ title, labels, series, colors, chartColors }) {
  const has = series.some((v) => v > 0)
  const options = {
    chart: { fontFamily: 'Poppins, sans-serif' },
    labels,
    colors,
    legend: { position: 'bottom', labels: { colors: chartColors.text } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { theme: 'light' },
    plotOptions: { pie: { donut: { size: '66%' } } },
  }
  return (
    <div className="col-xl-4">
      <div className="card h-100 mb-0">
        <div className="card-header"><h5 className="card-title mb-0">{title}</h5></div>
        <div className="card-body d-flex align-items-center justify-content-center">
          {has
            ? <ReactApexChart key={chartColors.primary + title} options={options} series={series} type="donut" height={280} width="100%" />
            : <p className="text-muted text-center py-5 mb-0">No data yet.</p>}
        </div>
      </div>
    </div>
  )
}

export default function PlantationDashboard() {
  const chartColors = useChartColors()
  const { lands } = useLands()
  const { zones } = useZones()
  const { items } = useZoneItems()
  const { verticals } = useVerticals()
  const { poles } = usePoles()
  const { plants } = usePlants()
  const { care } = useCare()
  const { defects } = useDefects()

  // Lookups for defect/care subjects.
  const poleById = Object.fromEntries(poles.map((p) => [p.id, p]))
  const plantById = Object.fromEntries(plants.map((p) => [p.id, p]))

  const perLand = lands.map((l) => {
    const zoneIds = new Set(zones.filter((z) => z.landId === l.id).map((z) => z.id))
    const vertIds = new Set(verticals.filter((v) => zoneIds.has(v.zoneId)).map((v) => v.id))
    const poleIds = new Set(poles.filter((p) => vertIds.has(p.verticalId)).map((p) => p.id))
    const plantCount = plants.filter((p) => poleIds.has(p.poleId)).length
    return { ...l, zones: zoneIds.size, rows: vertIds.size, poles: poleIds.size, plants: plantCount }
  })

  const owned = lands.filter((l) => l.ownership !== 'leased').length
  const openDefects = defects.filter((d) => d.status !== 'resolved')
  const pendingCare = care.filter((c) => !c.done)

  // Charts
  const varietyGroups = groupCount(plants, (p) => p.variety)
  const poleTypeGroups = groupCount(poles, (p) => p.poleType)
  const statusOrder = ['healthy', 'defect', 'dead']
  const statusSeries = statusOrder.map((s) => plants.filter((p) => (p.status || 'healthy') === s).length)

  // Image gallery from across the hierarchy.
  const gallery = [
    ...lands.filter((x) => x.image).map((x) => ({ url: x.image, label: x.name, tag: 'Land' })),
    ...items.filter((x) => x.image).map((x) => ({ url: x.image, label: x.name, tag: 'Item' })),
    ...poles.filter((x) => x.image).map((x) => ({ url: x.image, label: x.label || 'Pole', tag: 'Pole' })),
    ...plants.filter((x) => x.image).map((x) => ({ url: x.image, label: x.tag || x.variety || 'Plant', tag: 'Plant' })),
    ...defects.filter((x) => x.image).map((x) => ({ url: x.image, label: x.title, tag: 'Defect' })),
  ].slice(0, 18)

  const defectSubject = (d) =>
    d.plantId && plantById[d.plantId] ? `Plant ${plantById[d.plantId].tag || plantById[d.plantId].variety || ''}`.trim()
      : d.poleId && poleById[d.poleId] ? `Pole ${poleById[d.poleId].label || ''}`.trim()
        : '—'

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Plantation Dashboard</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Dashboard</li>
          </ol>
        </nav>
      </div>

      {/* Headline tiles */}
      <div className="row g-3 mb-3">
        <Tile label="Properties" value={lands.length} sub={`${owned} owned · ${lands.length - owned} leased`} img={landImg} tone="success" />
        <Tile label="Zones" value={zones.length} sub={`${items.length} items`} img={zoneImg} tone="primary" />
        <Tile label="Rows" value={verticals.length} sub="verticals" img={rowsImg} tone="info" />
        <Tile label="Poles" value={poles.length} sub="supports" img={poleImg} tone="secondary" />
        <Tile label="Plants" value={plants.length} sub="tagged" img={plantImg} tone="success" />
        <Tile label="Open defects" value={openDefects.length} sub={`${pendingCare.length} care due`} icon="ri-error-warning-line" tone={openDefects.length ? 'danger' : 'success'} />
      </div>

      {/* Breakdown charts */}
      <div className="row g-3 mb-3">
        <DonutCard title="Plants by status" chartColors={chartColors}
          labels={statusOrder.map((s) => s[0].toUpperCase() + s.slice(1))}
          series={statusSeries} colors={statusOrder.map((s) => STATUS_COLOR[s])} />
        <DonutCard title="Plants by variety" chartColors={chartColors}
          labels={varietyGroups.map((g) => g[0])} series={varietyGroups.map((g) => g[1])}
          colors={varietyGroups.map((_, i) => PALETTE[i % PALETTE.length])} />
        <DonutCard title="Poles by type" chartColors={chartColors}
          labels={poleTypeGroups.map((g) => g[0])} series={poleTypeGroups.map((g) => g[1])}
          colors={poleTypeGroups.map((_, i) => PALETTE[i % PALETTE.length])} />
      </div>

      {/* Per-land cards */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Properties</h5>
          <Link to="/business/plantations/explorer" className="btn btn-soft-primary btn-sm"><i className="ri-add-line me-1" />Manage</Link>
        </div>
        <div className="card-body">
          {perLand.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">No properties yet. <Link to="/business/plantations/explorer">Add your first land.</Link></p>
          ) : (
            <div className="row g-3">
              {perLand.map((l) => (
                <div className="col-xl-4 col-md-6" key={l.id}>
                  <div className="border rounded h-100 p-3 d-flex gap-3">
                    <img src={l.image || landImg} alt="" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8 }} />
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-center">
                        <Link to={`/business/plantations/lands/${l.id}/zones`} className="text-reset fw-semibold flex-grow-1 text-truncate">{l.name}</Link>
                        {l.ownership === 'leased'
                          ? <span className="badge bg-warning-subtle text-dark">Leased</span>
                          : <span className="badge bg-success-subtle text-success">Owned</span>}
                      </div>
                      <div className="text-muted small mb-2">{l.location || '—'}{l.area !== '' ? ` · ${l.area} ${l.areaUnit}` : ''}</div>
                      <div className="d-flex flex-wrap gap-3 small">
                        <span><span className="fw-semibold">{l.zones}</span> <span className="text-muted">zones</span></span>
                        <span><span className="fw-semibold">{l.rows}</span> <span className="text-muted">rows</span></span>
                        <span><span className="fw-semibold">{l.poles}</span> <span className="text-muted">poles</span></span>
                        <span><span className="fw-semibold">{l.plants}</span> <span className="text-muted">plants</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="row g-3">
        {/* Open defects */}
        <div className="col-xl-7">
          <div className="card mb-0 h-100">
            <div className="card-header"><h5 className="card-title mb-0">Open defects <span className="text-muted fs-13 fw-normal">({openDefects.length})</span></h5></div>
            <div className="card-body p-0">
              {openDefects.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No open defects. 🌱</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th /><th>Defect</th><th>Subject</th><th>Identified</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {openDefects.map((d) => (
                        <tr key={d.id}>
                          <td style={{ width: 44 }}>{d.image && <img src={d.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />}</td>
                          <td>
                            <div className="fw-medium">{d.title}</div>
                            {d.remedy && <div className="text-muted small">Remedy: {d.remedy}</div>}
                          </td>
                          <td className="text-muted">{defectSubject(d)}</td>
                          <td className="text-muted">{d.identifiedDate ? fmtDate(d.identifiedDate) : '—'}</td>
                          <td><span className={'badge ' + (DEFECT_BADGE[d.status] || DEFECT_BADGE.open)}>{d.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending care */}
        <div className="col-xl-5">
          <div className="card mb-0 h-100">
            <div className="card-header"><h5 className="card-title mb-0">Care due <span className="text-muted fs-13 fw-normal">({pendingCare.length})</span></h5></div>
            <div className="card-body p-0">
              {pendingCare.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">Nothing scheduled.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>Task</th><th>Pole</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {pendingCare
                        .slice()
                        .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
                        .map((c) => (
                          <tr key={c.id}>
                            <td>
                              <span className={'badge ' + (c.type === 'fertilizer' ? 'bg-warning-subtle text-dark' : 'bg-info-subtle text-info')}>{c.type}</span>
                              {c.product && <span className="ms-2">{c.product}</span>}
                            </td>
                            <td className="text-muted">{poleById[c.poleId]?.label || '—'}</td>
                            <td className="text-muted">{c.scheduledDate ? fmtDate(c.scheduledDate) : '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image gallery */}
      <div className="card mb-0">
        <div className="card-header"><h5 className="card-title mb-0">Gallery</h5></div>
        <div className="card-body">
          {gallery.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">No photos yet. Add images on lands, poles, plants and defects.</p>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {gallery.map((g, i) => (
                <a key={i} href={g.url} target="_blank" rel="noreferrer" className="position-relative d-block" title={`${g.tag}: ${g.label}`}>
                  <img src={g.url} alt={g.label} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  <span className="badge bg-dark position-absolute bottom-0 start-0 m-1 opacity-75">{g.tag}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
