import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { localInsert, localUpdate, localDelete } from '@/lib/localdb'
import { stockMarketAccounts as staticAccounts, stockMarketHoldings as staticHoldings } from '@/data/AppData'

/** Data access for stock-market accounts + holdings (Supabase or localStorage). */
const rowToAccount = (r) => ({
  id: r.id, slug: r.slug, StockmarketAccountName: r.account_name,
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

export const addHolding = (h) =>
  isSupabaseConfigured ? insertRow('stock_holdings', holdingToRow(h)) : Promise.resolve(localInsert('stock_holdings', staticHoldings, h))
export const editHolding = (h) =>
  isSupabaseConfigured ? updateRow('stock_holdings', h.id, holdingToRow(h)) : Promise.resolve(localUpdate('stock_holdings', staticHoldings, h.id, h))
export const removeHolding = (id) =>
  isSupabaseConfigured ? deleteRow('stock_holdings', id) : Promise.resolve(localDelete('stock_holdings', staticHoldings, id))
