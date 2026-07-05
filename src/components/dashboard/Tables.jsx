import {
  bestSellingProducts,
  recentOrders,
  statusVariant,
} from '@/data/dashboardData'
import { Secret } from '@/context/PrivacyContext'

export function BestSellingProducts() {
  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex-grow-1">Best Selling Products</h4>
        <button className="btn btn-sm btn-soft-primary">
          <i className="ri-file-list-3-line me-1" /> Report
        </button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Orders</th>
                <th>Stock</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bestSellingProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="product-thumb"><i className="ri-shopping-bag-line" /></span>
                      <div>
                        <span className="d-block fw-medium">{p.name}</span>
                        <small className="text-muted">{p.date}</small>
                      </div>
                    </div>
                  </td>
                  <td><Secret>{p.price}</Secret></td>
                  <td><Secret>{p.orders}</Secret></td>
                  <td>
                    {p.stock === 'Out of stock' ? (
                      <span className="badge bg-danger-subtle text-danger">Out of stock</span>
                    ) : (
                      <Secret>{p.stock}</Secret>
                    )}
                  </td>
                  <td className="fw-medium"><Secret>{p.amount}</Secret></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function RecentOrders() {
  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex-grow-1">Recent Orders</h4>
        <button className="btn btn-sm btn-soft-primary">Generate Report</button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><a href="#!" className="fw-medium">{o.id}</a></td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="avatar-xs">
                        <span className="avatar-title bg-primary-subtle text-primary rounded-circle">
                          {o.customer.charAt(0)}
                        </span>
                      </span>
                      {o.customer}
                    </div>
                  </td>
                  <td>{o.product}</td>
                  <td><Secret>{o.amount}</Secret></td>
                  <td>{o.vendor}</td>
                  <td>
                    <span className={`badge bg-${statusVariant[o.status]}-subtle text-${statusVariant[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-light text-body">
                      <i className="ri-star-fill text-warning me-1" /><Secret>{o.rating}</Secret>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
