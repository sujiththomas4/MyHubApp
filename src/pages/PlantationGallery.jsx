import { useState } from 'react'
import { useLands, useZones, useZoneItems, useVerticals, usePoles, usePlants, useDefects } from '@/data/plantationLandRepo'
import PropertyBar from '@/components/plantation/PropertyBar'

/**
 * PlantationGallery.jsx — every photo across the plantation, filterable by source.
 * Read-only: images are added on their own entity screens.
 */
const TAGS = ['All', 'Land', 'Item', 'Pole', 'Plant', 'Defect']

export default function PlantationGallery() {
  const { lands } = useLands()
  const { zones } = useZones()
  const { items } = useZoneItems()
  const { verticals } = useVerticals()
  const { poles } = usePoles()
  const { plants } = usePlants()
  const { defects } = useDefects()
  const [tag, setTag] = useState('All')
  const [property, setProperty] = useState('')

  // Resolve each entity's land by walking up the hierarchy.
  const zoneLand = Object.fromEntries(zones.map((z) => [z.id, z.landId]))
  const verticalLand = Object.fromEntries(verticals.map((v) => [v.id, zoneLand[v.zoneId]]))
  const poleLand = Object.fromEntries(poles.map((p) => [p.id, verticalLand[p.verticalId]]))

  const all = [
    ...lands.filter((x) => x.image).map((x) => ({ url: x.image, label: x.name, tag: 'Land', landId: x.id })),
    ...items.filter((x) => x.image).map((x) => ({ url: x.image, label: x.name, tag: 'Item', landId: zoneLand[x.zoneId] })),
    ...poles.filter((x) => x.image).map((x) => ({ url: x.image, label: x.label || 'Pole', tag: 'Pole', landId: poleLand[x.id] })),
    ...plants.filter((x) => x.image).map((x) => ({ url: x.image, label: x.tag || x.variety || 'Plant', tag: 'Plant', landId: poleLand[x.poleId] })),
    ...defects.filter((x) => x.image).map((x) => ({ url: x.image, label: x.title, tag: 'Defect', landId: x.landId })),
  ]
  const scoped = property ? all.filter((g) => g.landId === property) : all
  const shown = tag === 'All' ? scoped : scoped.filter((g) => g.tag === tag)

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Gallery</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Plantation</li>
            <li className="breadcrumb-item active" aria-current="page">Gallery</li>
          </ol>
        </nav>
      </div>

      <PropertyBar value={property} onChange={setProperty} />

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Photos <span className="text-muted fs-13 fw-normal">({scoped.length})</span></h5>
          <div className="btn-group btn-group-sm" role="group">
            {TAGS.map((t) => (
              <button key={t} type="button" className={'btn ' + (tag === t ? 'btn-primary' : 'btn-light')} onClick={() => setTag(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {shown.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No photos{tag === 'All' ? ' yet. Add images on lands, poles, plants and defects.' : ` tagged “${tag}”.`}</p>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {shown.map((g, i) => (
                <a key={i} href={g.url} target="_blank" rel="noreferrer" className="position-relative d-block" title={`${g.tag}: ${g.label}`}>
                  <img src={g.url} alt={g.label} style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }} />
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
