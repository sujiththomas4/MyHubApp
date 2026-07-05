import ReactApexChart from 'react-apexcharts'
import { salesByLocation, storeVisitsSeries, storeVisitsLabels } from '@/data/dashboardData'
import { useChartColors } from './useChartColors'
import { Secret, usePrivacy } from '@/context/PrivacyContext'

export function SalesByLocation() {
  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex-grow-1">Sales by Locations</h4>
        <button className="btn btn-sm btn-soft-primary">Export</button>
      </div>
      <div className="card-body">
        {salesByLocation.map((loc) => (
          <div className="loc-row" key={loc.country}>
            <div className="d-flex justify-content-between mb-1">
              <span>{loc.country}</span>
              <span className="fw-medium"><Secret>{loc.percent}</Secret>%</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${loc.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StoreVisits() {
  const colors = useChartColors()
  const { hidden } = usePrivacy()
  const palette = [colors.primary, '#f7b84b', '#299cdb', '#f06548']

  const options = {
    chart: { fontFamily: 'Poppins, sans-serif' },
    labels: storeVisitsLabels,
    colors: palette,
    legend: { position: 'bottom', labels: { colors: colors.text } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '70%' } } },
  }

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex-grow-1">Store Visits by Source</h4>
      </div>
      <div className="card-body">
        <div className={hidden ? 'chart-private' : undefined}>
          <ReactApexChart
            key={colors.primary}
            options={options}
            series={storeVisitsSeries}
            type="donut"
            height={300}
          />
        </div>
      </div>
    </div>
  )
}
