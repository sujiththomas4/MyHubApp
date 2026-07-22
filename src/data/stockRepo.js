import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { stockMarketAccounts as staticAccounts, stockMarketHoldings as staticHoldings } from '@/data/AppData'

/** Data access for stock-market accounts + holdings (Supabase or localStorage). */
const rowToAccount = (r) => ({
  id: r.id, slug: r.slug, StockmarketAccountName: r.account_name, holder: r.holder || '',
  region: r.region, currency: r.currency, icon: r.icon,
})
const rowToHolding = (r) => ({
  id: r.id, accountId: r.account_id, name: r.name, qty: Number(r.qty),
  invested: Number(r.invested), currentValue: Number(r.current_value), note: r.note || '',
})
const holdingToRow = (h) => ({
  id: h.id, account_id: h.accountId, name: h.name, qty: h.qty,
  invested: h.invested, current_value: h.currentValue, note: h.note,
})

export function useStockAccounts() {
  const { data } = useCollection('stock_accounts', staticAccounts, { map: rowToAccount })
  return data
}
export function useStockHoldings() {
  const { data } = useCollection('stock_holdings', staticHoldings, { map: rowToHolding })
  return data
}

const accToRow = (a) => ({
  id: a.id, slug: a.slug, account_name: a.StockmarketAccountName, holder: a.holder || '',
  region: a.region, currency: a.currency, icon: a.icon,
})

// Account CRUD — a broker can hold several accounts, one per holder.
export const addStockAccount = (a) =>
  insertRow('stock_accounts', accToRow(a))
export const editStockAccount = (id, patch) =>
  updateRow('stock_accounts', id, patch)
export const removeStockAccount = (id) =>
  deleteRow('stock_accounts', id)

export const addHolding = (h) =>
  insertRow('stock_holdings', holdingToRow(h))
export const editHolding = (h) =>
  updateRow('stock_holdings', h.id, holdingToRow(h))
export const removeHolding = (id) =>
  deleteRow('stock_holdings', id)
