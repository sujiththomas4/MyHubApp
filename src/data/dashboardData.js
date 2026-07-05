/**
 * dashboardData.js
 * -----------------------------------------------------------------------------
 * Mock data for the Ecommerce dashboard screen. Replace these with API calls
 * when the backend is ready — the components only care about the shapes here.
 */

export const statWidgets = [
  {
    id: 'earnings',
    label: 'Total Earnings',
    value: '$559.25k',
    delta: 16.24,
    icon: 'ri-money-dollar-circle-fill',
    tone: 'success',
    link: 'View net earnings',
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '36,894',
    delta: -3.57,
    icon: 'ri-shopping-bag-fill',
    tone: 'info',
    link: 'View all orders',
  },
  {
    id: 'customers',
    label: 'Customers',
    value: '183.35M',
    delta: 29.08,
    icon: 'ri-user-3-fill',
    tone: 'warning',
    link: 'See details',
  },
  {
    id: 'balance',
    label: 'My Balance',
    value: '$165.89k',
    delta: 0.0,
    icon: 'ri-wallet-3-fill',
    tone: 'primary',
    link: 'Withdraw money',
  },
]

// Revenue series (orders vs earnings) used by the ApexCharts area/bar chart.
export const revenueSeries = [
  {
    name: 'Orders',
    type: 'bar',
    data: [89, 56, 74, 98, 72, 106, 92, 108, 79, 122, 90, 138],
  },
  {
    name: 'Earnings',
    type: 'area',
    data: [70, 42, 60, 80, 58, 90, 76, 92, 66, 104, 78, 118],
  },
]
export const revenueCategories = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
export const revenueSummary = [
  { label: 'Orders', value: '7,585' },
  { label: 'Earnings', value: '$22.89k' },
  { label: 'Refunds', value: '367' },
  { label: 'Conversion Ratio', value: '18.92%' },
]

export const salesByLocation = [
  { country: 'Canada', percent: 75 },
  { country: 'Greenland', percent: 47 },
  { country: 'Russia', percent: 82 },
  { country: 'India', percent: 63 },
]

export const bestSellingProducts = [
  { id: 1, name: 'Branded T-Shirts', date: '24 Apr 2021', price: '$29.00', orders: 62, stock: '510', amount: '$1,798' },
  { id: 2, name: 'Bentwood Chair', date: '19 Mar 2021', price: '$85.20', orders: 35, stock: 'Out of stock', amount: '$2,982' },
  { id: 3, name: 'Borosil Paper Cup', date: '01 Mar 2021', price: '$14.00', orders: 80, stock: '749', amount: '$1,120' },
  { id: 4, name: 'One Seater Sofa', date: '11 Feb 2021', price: '$127.50', orders: 56, stock: 'Out of stock', amount: '$7,140' },
  { id: 5, name: 'Stillbird Helmet', date: '17 Jan 2021', price: '$54.00', orders: 74, stock: '805', amount: '$3,996' },
]

export const recentOrders = [
  { id: '#VZ2112', customer: 'Alex Smith', product: 'Clothes', amount: '$109.00', vendor: 'Zoetic Fashion', status: 'Paid', rating: '5.0' },
  { id: '#VZ2111', customer: 'Jansh Brown', product: 'Kitchen Storage', amount: '$149.00', vendor: 'Micro Design', status: 'Pending', rating: '4.5' },
  { id: '#VZ2109', customer: 'Ayaan Bowen', product: 'Bike Accessories', amount: '$215.00', vendor: 'Nesta Technologies', status: 'Paid', rating: '4.9' },
  { id: '#VZ2108', customer: 'Prezy Mark', product: 'Furniture', amount: '$199.00', vendor: 'Syntyce Solutions', status: 'Unpaid', rating: '4.3' },
  { id: '#VZ2107', customer: 'Vihan Hudda', product: 'Bags and Wallets', amount: '$330.00', vendor: 'iTest Factory', status: 'Paid', rating: '4.7' },
]

export const statusVariant = {
  Paid: 'success',
  Pending: 'warning',
  Unpaid: 'danger',
}

export const recentActivity = [
  { id: 1, icon: 'ri-shopping-cart-2-line', tone: 'success', title: 'Purchase by James Price', text: 'Product noise evolve smartwatch', time: '02:14 PM Today' },
  { id: 2, icon: 'ri-stack-line', tone: 'primary', title: 'Added new style collection', text: 'By Nesta Technologies', time: '9:47 PM Yesterday' },
  { id: 3, icon: 'ri-heart-3-line', tone: 'danger', title: 'Natasha Carey liked the products', text: 'Allow users to like products in your store.', time: '25 Dec, 2021' },
  { id: 4, icon: 'ri-price-tag-3-line', tone: 'warning', title: 'Today offers by Digitech Galaxy', text: 'Offer valid on orders above $500.', time: '12 Dec, 2021' },
  { id: 5, icon: 'ri-star-line', tone: 'info', title: 'Favorited Product', text: 'Esther James favorited a product.', time: '25 Nov, 2021' },
]

export const topCategories = [
  { name: 'Mobile & Accessories', count: '10,294' },
  { name: 'Desktop', count: '6,256' },
  { name: 'Electronics', count: '3,479' },
  { name: 'Home & Furniture', count: '2,275' },
  { name: 'Grocery', count: '1,950' },
  { name: 'Fashion', count: '1,582' },
]

// Store-visits donut (source breakdown).
export const storeVisitsSeries = [26, 22, 30, 22]
export const storeVisitsLabels = ['Direct', 'Social', 'Email', 'Referrals']
