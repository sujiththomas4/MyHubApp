import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * optionSellingBacktestRepo.js — Daily Option Selling backtests.
 *
 * Each backtest is a dated/timed set of option legs entered by hand,
 * e.g. "24300 CE @90 SELL x2". Legs are stored as a jsonb array on the row;
 * lot_size is one value per backtest. Backend-only, like every other repo.
 */
export const staticBacktests = []

/** DB row -> app object. */
const rowToBacktest = (r) => ({
  id: r.id,
  date: r.date,
  time: r.time || '',
  lotSize: r.lot_size ?? 65,
  notes: r.notes || '',
  legs: Array.isArray(r.legs) ? r.legs.map(legFromDb) : [],
})

const legFromDb = (l) => ({
  strike: l.strike ?? '',
  type: l.type || 'CE',           // CE | PE
  lots: l.lots ?? '',             // number of lots
  side: l.side || 'SELL',         // SELL | BUY (entry side)
  price: l.price ?? '',           // entry price (points)
  entryTime: l.entry_time || '',
  exit: l.exit ?? '',             // exit price (points); '' while open
  exitTime: l.exit_time || '',
})

const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

/** App object -> DB row. */
const toRow = (b) => ({
  id: b.id,
  date: b.date,
  time: b.time || null,
  lot_size: b.lotSize === '' || b.lotSize == null ? 65 : Number(b.lotSize),
  notes: b.notes || null,
  legs: (b.legs || []).map((l) => ({
    strike: numOrNull(l.strike),
    type: l.type || 'CE',
    lots: numOrNull(l.lots),
    side: l.side || 'SELL',
    price: numOrNull(l.price),
    entry_time: l.entryTime || null,
    exit: numOrNull(l.exit),
    exit_time: l.exitTime || null,
  })),
  updated_at: new Date().toISOString(),
})

/** All backtests, newest day first. */
export function useBacktests() {
  const { data, loading, error } = useCollection('option_selling_backtests', staticBacktests, {
    orderBy: 'date', ascending: false, map: rowToBacktest,
  })
  const sorted = [...data].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return { backtests: sorted, loading, error }
}

export const addBacktest = (b) => insertRow('option_selling_backtests', toRow(b))
export const editBacktest = (b) => updateRow('option_selling_backtests', b.id, toRow(b))
export const removeBacktest = (id) => deleteRow('option_selling_backtests', id)
