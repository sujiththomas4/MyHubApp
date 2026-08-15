import EeHoldings from '@/components/wealth/EeHoldings'

/**
 * EvaEzaakMetals.jsx — Gold & Silver (and future metals) investment for
 * Eva & Ezaak (route /wealth/eva-ezaak/metals). Shares the holdings engine with
 * the stocks screen; add more metals by extending METAL_CATEGORIES.
 */
const METAL_CATEGORIES = [
  { key: 'gold', label: 'Gold', tone: 'warning', icon: 'ri-coin-line' },
  { key: 'silver', label: 'Silver', tone: 'secondary', icon: 'ri-copper-coin-line' },
  { key: 'other', label: 'Other', tone: 'info', icon: 'ri-hand-coin-line' },
]

export default function EvaEzaakMetals() {
  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Gold &amp; Silver</h4>
          <small className="text-muted">For Eva &amp; Ezaak · precious-metal holdings</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Eva &amp; Ezaak Portfolio</li>
            <li className="breadcrumb-item active" aria-current="page">Gold &amp; Silver</li>
          </ol>
        </nav>
      </div>

      <EeHoldings categories={METAL_CATEGORIES} itemLabel="holding" tabbed={false} />
    </div>
  )
}
