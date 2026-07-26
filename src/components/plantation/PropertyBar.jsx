import { useLands, landLabel } from '@/data/plantationLandRepo'

/**
 * PropertyBar — a top-of-screen property (land) selector used to scope a
 * plantation screen to one property. Empty value = all properties.
 */
export default function PropertyBar({ value, onChange }) {
  const { lands } = useLands()
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <span className="text-muted small text-nowrap"><i className="ri-map-2-line me-1" />Property</span>
      <select className="form-select form-select-sm" style={{ maxWidth: 300 }} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All properties</option>
        {lands.map((l) => <option key={l.id} value={l.id}>{landLabel(l)}</option>)}
      </select>
    </div>
  )
}
