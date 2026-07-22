import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'
import { brokerModules } from '@/data/AppData'

/**
 * brokerRepo.js — broker accounts + day-P&L trades for the business trading
 * modules (Option Buying / Selling / Intraday). Supabase or localStorage.
 */
export const brokerModuleMeta = brokerModules.map((m) => ({ id: m.id, title: m.title, basePath: m.basePath }))

const staticAccounts = brokerModules.flatMap((m) =>
  m.accounts.map((a) => ({ id: a.id, module: m.id, slug: a.slug, broker: a.broker, holder: a.holder || '', icon: a.icon, currency: a.currency })))
const staticTrades = brokerModules.flatMap((m) => m.trades)

const rowToAccount = (r) => ({ id: r.id, module: r.module, slug: r.slug, broker: r.broker, holder: r.holder || '', icon: r.icon, currency: r.currency })
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

/* Create or update a broker account (id). Used to spin up a per-holder account
   the first time a trade is booked against a new holder for a broker+module. */
export const upsertAccount = (a) =>
  upsertRow('broker_accounts', {
    id: a.id, module: a.module, slug: a.slug, broker: a.broker,
    holder: a.holder || '', icon: a.icon, currency: a.currency,
  })

export const addTrade = (t) =>
  insertRow('broker_trades', tradeToRow(t))
export const editTrade = (t) =>
  updateRow('broker_trades', t.id, tradeToRow(t))
export const removeTrade = (id) =>
  deleteRow('broker_trades', id)
