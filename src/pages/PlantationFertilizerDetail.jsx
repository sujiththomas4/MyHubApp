import { Link, useParams } from 'react-router-dom'
import { useFertilizers, FERT_PURPOSE_LABEL, FERT_PURPOSE_BADGE } from '@/data/fertilizersRepo'

/**
 * PlantationFertilizerDetail.jsx — full read-out of one Health Center method
 * (route /business/plantations/health-center/:fertId).
 */
function Section({ icon, tone, title, text }) {
  if (!text) return null
  return (
    <div className="col-md-6">
      <div className="border rounded h-100 p-3">
        <h6 className={`text-${tone} mb-2`}><i className={icon + ' me-1'} />{title}</h6>
        <div className="text-body" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
      </div>
    </div>
  )
}

export default function PlantationFertilizerDetail() {
  const { fertId } = useParams()
  const { fertilizers } = useFertilizers()
  const f = fertilizers.find((x) => x.id === fertId)

  if (!f) {
    return (
      <div className="option-buying">
        <div className="page-title-box"><h4 className="mb-0">Method not found</h4></div>
        <div className="card"><div className="card-body"><Link to="/business/plantations/health-center" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back</Link></div></div>
      </div>
    )
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">{f.name}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/business/plantations/health-center" className="text-reset">Health Center</Link></li>
            {f.section && <li className="breadcrumb-item">{f.section}</li>}
            <li className="breadcrumb-item active" aria-current="page">{f.name}</li>
          </ol>
        </nav>
      </div>

      <div className="card">
        <div className="card-body d-flex align-items-center gap-3 flex-wrap">
          {f.image
            ? <img src={f.image} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
            : <span className="stat-icon bg-success-subtle text-success" style={{ width: 64, height: 64 }}><i className="ri-flask-line fs-4" /></span>}
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0">{f.name}</h5>
              {f.section && <span className="badge bg-primary-subtle text-primary">{f.section}</span>}
              {f.purpose && <span className={'badge ' + (FERT_PURPOSE_BADGE[f.purpose] || FERT_PURPOSE_BADGE.other)}>{FERT_PURPOSE_LABEL[f.purpose] || f.purpose}</span>}
            </div>
            {f.dosage && <div className="text-muted small mt-1"><i className="ri-drop-line me-1" />{f.dosage}</div>}
            {(f.referralName || f.referralPhone) && (
              <div className="text-muted small mt-1"><i className="ri-user-line me-1" />{f.referralName}{f.referralPhone && <> · <a href={`tel:${f.referralPhone}`}>{f.referralPhone}</a></>}</div>
            )}
          </div>
          <Link to="/business/plantations/health-center" className="btn btn-sm btn-light"><i className="ri-arrow-left-line me-1" />Back</Link>
        </div>
      </div>

      {f.whatItDoes && (
        <div className="card"><div className="card-body">
          <h6 className="text-primary mb-2"><i className="ri-information-line me-1" />What it does</h6>
          <div style={{ whiteSpace: 'pre-wrap' }}>{f.whatItDoes}</div>
        </div></div>
      )}

      {f.howToUse && (
        <div className="card"><div className="card-body">
          <h6 className="text-info mb-2"><i className="ri-guide-line me-1" />How to use</h6>
          <div style={{ whiteSpace: 'pre-wrap' }}>{f.howToUse}</div>
        </div></div>
      )}

      <div className="row g-3">
        <Section icon="ri-thumb-up-line" tone="success" title="Pros" text={f.pros} />
        <Section icon="ri-thumb-down-line" tone="danger" title="Cons" text={f.cons} />
        <Section icon="ri-check-line" tone="success" title="When to use" text={f.whenUse} />
        <Section icon="ri-forbid-line" tone="danger" title="When NOT to use" text={f.whenNotUse} />
      </div>

      {f.note && (
        <div className="card mt-3 mb-0"><div className="card-body">
          <h6 className="text-muted mb-2"><i className="ri-sticky-note-line me-1" />Note</h6>
          <div style={{ whiteSpace: 'pre-wrap' }}>{f.note}</div>
        </div></div>
      )}
    </div>
  )
}
