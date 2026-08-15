import EeHoldings from '@/components/wealth/EeHoldings'
import { EE_CATEGORIES } from '@/data/eeStocksRepo'

/**
 * EvaEzaakTopStocks.jsx — "Investment in Top 20 Stocks" for Eva & Ezaak
 * (route /wealth/eva-ezaak/top-stocks). 20 large + 20 mid + 20 small cap.
 */
export default function EvaEzaakTopStocks() {
  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Top 20 Stocks</h4>
          <small className="text-muted">For Eva &amp; Ezaak · equal amount across large / mid / small cap</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Eva &amp; Ezaak Portfolio</li>
            <li className="breadcrumb-item active" aria-current="page">Top 20 Stocks</li>
          </ol>
        </nav>
      </div>

      <EeHoldings categories={EE_CATEGORIES} target={20} itemLabel="stock" />
    </div>
  )
}
