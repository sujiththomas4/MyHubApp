import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { localInsert, localUpdate, localDelete } from '@/lib/localdb'
import { brokerModules } from '@/data/AppData'

/**
 * brokerRepo.js — broker accounts + day-P&L trades for the business trading
 * modules (Option Buying / Selling / Intraday). Supabase or localStorage.
 */
export const brokerModuleMeta = brokerModules.map((m) => ({ id: m.id, title: m.title, basePath: m.basePath }))

const staticAccounts = brokerModules.flatMap((m) =>
  m.accounts.map((a) => ({ id: a.id, module: m.id, slug: a.slug, broker: a.broker, icon: a.icon, currency: a.currency })))
const staticTrades = brokerModules.flatMap((m) => m.trades)

const rowToAccount = (r) => ({ id: r.id, module: r.module, slug: r.slug, broker: r.broker, icon: r.icon, currency: r.currency })
const rowToTrade = (r) => ({
  id: r.id, accountId: r.account_id, date: r.date, orders: r.orders,
  grossPnl: Number(r.gross_pnl), brokerage: Number(r.brokerage), govtCharges: Number(r.govt_charges),
})
const tradeToRow = (t) => ({
  id: t.id, account_id: t.accountId, date: t.date, orders: t.orders,
  gross_pnl: t.grossPnl, brokerage: t.brokerage, govt_charges: t.govtCharges,
})

export function useBrokerAccounts() {
  const { data } = useCollection('broker_accounts', staticAccounts, { map: rowToAccount })
  return data
}
export function useBrokerTrades() {
  const { data } = useCollection('broker_trades', staticTrades, { map: rowToTrade })
  return data
}

export const addTrade = (t) =>
  isSupabaseConfigured ? insertRow('broker_trades', tradeToRow(t)) : Promise.resolve(localInsert('broker_trades', staticTrades, t))
export const editTrade = (t) =>
  isSupabaseConfigured ? updateRow('broker_trades', t.id, tradeToRow(t)) : Promise.resolve(localUpdate('broker_trades', staticTrades, t.id, t))
export const removeTrade = (id) =>
  isSupabaseConfigured ? deleteRow('broker_trades', id) : Promise.resolve(localDelete('broker_trades', staticTrades, id))
