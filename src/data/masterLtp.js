import { listRows, updateRow } from '@/lib/api'

/**
 * masterLtp.js — keeps one price per stock across the app.
 *
 * stock_strength is the master: every screen that edits an LTP writes it back
 * here, and editing it here pushes down into the books. Matching is on symbol,
 * which is safe because every table involved stores a ticker.
 *
 * Deliberately imports nothing but the api layer — the repos it syncs already
 * import each other, and a cycle here would be a very confusing bug.
 */
const iso = () => new Date().toISOString()
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const norm = (v) => (v || '').trim().toUpperCase()

/** Books that carry their own copy of LTP, and how to find a row's symbol. */
const BOOKS = [
  { table: 'swing1h_trades', symbolOf: (r) => r.symbol, only: (r) => r.state === 'OPEN' },
  { table: 'ee_ema_positions', symbolOf: (r) => r.symbol },
  { table: 'ee_focus_stocks', symbolOf: (r) => r.symbol, extra: { ltp_updated_at: iso } },
]

/** entries: [{ symbol, ltp }] — deduped, last value per symbol wins. */
const bySymbol = (entries) => {
  const m = new Map()
  entries.forEach((e) => { if (norm(e.symbol)) m.set(norm(e.symbol), num(e.ltp)) })
  return m
}

/**
 * Book → master. Call after any screen saves an LTP so stock_strength always
 * holds the freshest price. Never creates rows: a symbol that isn't tracked on
 * Stock Strength is simply skipped.
 */
export async function syncMasterLtp(entries) {
  const wanted = bySymbol(entries)
  if (!wanted.size) return
  const rows = await listRows('stock_strength')
  await Promise.all(
    rows
      .filter((r) => wanted.has(norm(r.symbol)))
      .filter((r) => num(r.ltp) !== wanted.get(norm(r.symbol)))
      .map((r) => updateRow('stock_strength', r.id, { ltp: wanted.get(norm(r.symbol)), ltp_updated_at: iso() })),
  )
}

/**
 * Master → books. Call when LTP is edited on Stock Strength so the swing,
 * EMA and Focus screens value their positions at the same price.
 */
export async function pushLtpToBooks(entries) {
  const wanted = bySymbol(entries)
  if (!wanted.size) return
  await Promise.all(BOOKS.map(async (book) => {
    let rows = []
    try { rows = await listRows(book.table) } catch { return } // table may not exist yet
    const targets = rows
      .filter((r) => wanted.has(norm(book.symbolOf(r))))
      .filter((r) => !book.only || book.only(r))
      .filter((r) => num(r.ltp) !== wanted.get(norm(book.symbolOf(r))))
    await Promise.all(targets.map((r) => {
      const patch = { ltp: wanted.get(norm(book.symbolOf(r))) }
      if (book.extra) Object.entries(book.extra).forEach(([k, fn]) => { patch[k] = fn() })
      return updateRow(book.table, r.id, patch)
    }))
  }))
}
