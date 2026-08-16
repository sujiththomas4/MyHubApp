import StockStrength from '@/components/business/StockStrength'

/**
 * StockStrengthPage.jsx — Stock Strength watch-table (route
 * /investments/stock-strength), under Stock Market Investments. Moved here from
 * the business Strategies screen.
 */
export default function StockStrengthPage() {
  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Stock Strength</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Stock Market Investments</li>
            <li className="breadcrumb-item active" aria-current="page">Stock Strength</li>
          </ol>
        </nav>
      </div>

      <StockStrength />
    </div>
  )
}
