import { useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { revenueSeries, revenueCategories, revenueSummary } from '@/data/dashboardData'
import { useChartColors } from './useChartColors'
import { Secret, usePrivacy } from '@/context/PrivacyContext'

export default function RevenueChart() {
  const colors = useChartColors()
  const { hidden } = usePrivacy()
  const [range, setRange] = useState('1Y')

  const options = {
    chart: {
      toolbar: { show: false },
      fontFamily: 'Poppins, sans-serif',
      stacked: false,
    },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
    fill: {
      type: ['solid', 'gradient'],
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
      opacity: [1, 0.25],
    },
    colors: [colors.primary, colors.secondary],
    dataLabels: { enabled: false },
    xaxis: {
      categories: revenueCategories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: colors.text, fontSize: '11px' } },
    },
    yaxis: { labels: { style: { colors: colors.text, fontSize: '11px' } } },
    grid: { borderColor: colors.grid, strokeDashArray: 3, padding: { top: 0 } },
    legend: { show: true, labels: { colors: colors.text }, markers: { radius: 6 } },
    tooltip: { theme: 'light' },
  }

  const ranges = ['ALL', '1M', '6M', '1Y']

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center">
        <h4 className="card-title flex-grow-1">Revenue</h4>
        <div className="btn-group btn-group-sm" role="group">
          {ranges.map((r) => (
            <button
              key={r}
              className={'btn btn-sm ' + (range === r ? 'btn-soft-primary' : 'btn-light')}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body">
        <div className="row g-0 text-center mb-3">
          {revenueSummary.map((s) => (
            <div className="col-6 col-sm-3 border-end" key={s.label}>
              <h5 className="mb-0" style={{ color: 'var(--hub-heading-color)' }}><Secret>{s.value}</Secret></h5>
              <p className="text-muted mb-0">{s.label}</p>
            </div>
          ))}
        </div>
        <div className={hidden ? 'chart-private' : undefined}>
          <ReactApexChart
            key={colors.primary /* force recolor on preset change */}
            options={options}
            series={revenueSeries}
            type="line"
            height={340}
          />
        </div>
      </div>
    </div>
  )
}
