/**
 * seed.mjs — one-time load of the current AppData into Supabase.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
 *   node supabase/seed.mjs
 *
 * The service_role key bypasses RLS — use it only locally, never in the app.
 */
import { createClient } from '@supabase/supabase-js'
import * as A from '../src/data/AppData.js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const db = createClient(url, key)

async function up(table, rows, onConflict = 'id') {
  if (!rows.length) return
  const { error } = await db.from(table).upsert(rows, { onConflict })
  console.log(`${table}: ${error ? 'ERROR ' + error.message : rows.length + ' rows'}`)
}

const run = async () => {
  await up('app_settings', [{ key: 'fx.aedInr', value: 26 }], 'key')
  await up('brokers', A.brokers, 'slug')

  await up('loans', A.loans.map((l) => ({
    id: l.id, bank_name: l.bankName, amount: l.amount, currency: l.currency,
    start_date: l.startDate, end_date: l.endDate, emi: l.emi,
    outstanding_amount: l.outstandingAmount, location: l.location,
  })))
  await up('installments', A.installments.map((i) => ({
    id: i.id, loan_id: i.loanId, number: i.number, date: i.date, amount: i.amount, status: i.status,
  })))

  await up('savings_categories', A.savingsCategories, 'slug')
  await up('savings', A.savings.map((s) => ({
    id: s.id, category: s.category, name: s.name, currency: s.currency,
    invested: s.invested, current_value: s.currentValue, start_date: s.startDate,
    locked_years: s.lockedYears, note: s.note,
  })))

  await up('stock_accounts', A.stockMarketAccounts.map((a) => ({
    id: a.id, slug: a.slug, account_name: a.StockmarketAccountName,
    region: a.region, currency: a.currency, icon: a.icon,
  })))
  await up('stock_holdings', A.stockMarketHoldings.map((h) => ({
    id: h.id, account_id: h.accountId, name: h.name, qty: h.qty,
    invested: h.invested, current_value: h.currentValue, note: h.note,
  })))

  const brokerAccounts = A.brokerModules.flatMap((m) => m.accounts.map((a) => ({
    id: a.id, module: m.id, slug: a.slug, broker: a.broker, icon: a.icon, currency: a.currency,
  })))
  const brokerTrades = A.brokerModules.flatMap((m) => m.trades.map((t) => ({
    id: t.id, account_id: t.accountId, date: t.date, orders: t.orders,
    gross_pnl: t.grossPnl, brokerage: t.brokerage, govt_charges: t.govtCharges,
  })))
  await up('broker_accounts', brokerAccounts)
  await up('broker_trades', brokerTrades)

  await up('plantation_entries', A.plantationEntries.map((e) => ({
    id: e.id, type: e.type, date: e.date, due_date: e.dueDate,
    category: e.category, amount: e.amount, status: e.status, note: e.note,
  })))
  await up('plantation_activities', A.plantationActivities.map((a) => ({
    id: a.id, date: a.date, due_date: a.dueDate, activity: a.activity, status: a.status, note: a.note,
  })))

  console.log('Done.')
}

run().catch((e) => { console.error(e); process.exit(1) })
