import { useMemo, useState } from 'react'
import { money, price, fmtDate } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import SearchSelect from '@/components/ui/SearchSelect'
import { useStockStrength, BUCKET } from '@/data/stockStrengthRepo'
import {
  useEmaPositions, useEmaLots, addBasket, addLot, removeLot,
  editPosition, removePosition, saveLtps,
  positionStats, emaView, bookTotals, ADD_DROP, SIDES, SUPPORT_OPTIONS, SUPPORT,
} from '@/data/emaSupportRepo'

/**
 * EmaSupport.jsx — "50 & 200 EMA Support" (route /wealth/eva-ezaak/ema-support).
 * A long-term accumulation book: buy at the 50/200 EMA, then add again each
 * time price falls 10% under the last buy. No capital budget and no sizing —
 * you decide the quantity; the screen keeps the history and does the averaging.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const todayISO = () => new Date().toISOString().slice(0, 10)
const pctText = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`

const SupportBadge = ({ value }) => {
  const o = SUPPORT[value]
  if (!o) return <span className="text-muted">—</span>
  return <span className={`badge bg-${o.tone}-subtle text-${o.tone}`}>{o.label}</span>
}

const PnL = ({ v }) => <span className={v > 0 ? 'text-success fw-semibold' : v < 0 ? 'text-danger fw-semibold' : 'text-muted'}>{money(v, 'INR')}</span>

const Tile = ({ label, value, sub, icon, tone = 'primary', valueClass = '' }) => (
  <div className="col-6 col-md-3"><div className="card stat-card h-100 mb-0"><div className="card-body">
    <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
    <h4 className={'stat-value mt-3 mb-0 ' + valueClass}>{value}</h4>
    {sub && <span className="text-muted small">{sub}</span>}
  </div></div></div>
)

/** Where price sits against the 50/200 EMA — the reason this book exists. */
function EmaCell({ position }) {
  const v = emaView(position)
  if (!v) return <span className="text-muted">—</span>
  const line = (label, ema, gap, below) => {
    if (!ema) return null
    const tone = below ? 'text-danger' : gap <= 0.02 ? 'text-warning fw-semibold' : 'text-muted'
    return <div className={'small ' + tone}>{label} {price(ema, 'INR')} <span className="ms-1">{gap == null ? '' : pctText(gap)}</span></div>
  }
  return (
    <>
      {line('50', v.e50, v.g50, v.below50)}
      {line('200', v.e200, v.g200, v.below200)}
      {!v.e50 && !v.e200 && <span className="text-muted small">not set</span>}
    </>
  )
}

export default function EmaSupport() {
  const { positions, reload: reloadPositions } = useEmaPositions()
  const { lots, reload: reloadLots } = useEmaLots()
  const { stocks } = useStockStrength()
  const [modal, setModal] = useState(null)
  const [del, setDel] = useState(null)
  const [ltpDraft, setLtpDraft] = useState(null)
  const [ltpSaving, setLtpSaving] = useState(false)

  const reloadAll = async () => { await Promise.all([reloadPositions(), reloadLots()]) }
  const statsOf = (p) => positionStats(p, lots)
  const totals = useMemo(() => bookTotals(positions, lots), [positions, lots])
  const rows = useMemo(
    () => positions.map((p) => ({ p, s: positionStats(p, lots) })).sort((a, b) => b.s.value - a.s.value),
    [positions, lots],
  )

  // Batched LTP editing — nothing hits the network until Save.
  const startLtpEdit = () => setLtpDraft(Object.fromEntries(positions.map((p) => [p.id, String(p.ltp ?? '')])))
  const changedLtps = ltpDraft
    ? positions.filter((p) => ltpDraft[p.id] !== undefined && num(ltpDraft[p.id]) !== num(p.ltp)).map((p) => ({ id: p.id, ltp: ltpDraft[p.id], symbol: p.symbol }))
    : []
  const saveLtpEdits = async () => {
    if (!changedLtps.length) { setLtpDraft(null); return }
    setLtpSaving(true)
    try { await saveLtps(changedLtps); await reloadPositions(); setLtpDraft(null) } finally { setLtpSaving(false) }
  }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">50 &amp; 200 EMA Support</h4>
          <small className="text-muted">Long-term accumulation — buy at support, add again {(ADD_DROP * 100).toFixed(0)}% below the last buy.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><a href="/wealth/eva-ezaak">Eva &amp; Ezaak Portfolio</a></li>
            <li className="breadcrumb-item active" aria-current="page">50 &amp; 200 EMA Support</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3 mb-3">
        <Tile label="Invested" value={money(totals.invested, 'INR')} sub={`${totals.held} of ${totals.n} held`} icon="ri-wallet-3-line" />
        <Tile label="Current value" value={money(totals.value, 'INR')} icon="ri-line-chart-line" tone="info" />
        <Tile label="Unrealised" value={<PnL v={totals.unrealised} />} sub={totals.invested > 0 ? pctText(totals.unrealised / totals.invested) : '—'} icon="ri-funds-line" tone={totals.unrealised >= 0 ? 'success' : 'danger'} />
        <Tile label="Due to add" value={totals.dueToAdd} sub={`price ${(ADD_DROP * 100).toFixed(0)}%+ under last buy`} icon="ri-arrow-down-circle-line" tone="warning" valueClass={totals.dueToAdd ? 'text-warning' : ''} />
      </div>

      <Basket stocks={stocks} positions={positions} onSaved={reloadAll} />

      <div className="card mb-3">
        <div className="card-header d-flex align-items-center gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Holdings</h5>
          {ltpDraft ? (
            <>
              <span className="text-muted small">{changedLtps.length} changed</span>
              <button className="btn btn-sm btn-light" onClick={() => setLtpDraft(null)} disabled={ltpSaving}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={saveLtpEdits} disabled={ltpSaving}><i className="ri-save-line me-1" />{ltpSaving ? 'Saving…' : 'Save LTPs'}</button>
            </>
          ) : (
            <button className="btn btn-sm btn-soft-primary" onClick={startLtpEdit} disabled={positions.length === 0}><i className="ri-pencil-line me-1" />Update LTP</button>
          )}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light"><tr>
                <th>Stock</th><th className="text-end">Qty</th><th className="text-end">Avg cost</th><th className="text-end">Invested</th>
                <th className="text-end">LTP</th><th className="text-end">Value</th><th className="text-end">P&amp;L</th>
                <th>50 / 200 EMA</th><th className="text-end">Next add</th><th className="text-center">Adds</th><th />
              </tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={11} className="text-center text-muted py-4">No stocks yet. Add one above to start the book.</td></tr>}
                {rows.map(({ p, s }) => (
                  <tr key={p.id} className={s.dueToAdd ? 'table-warning' : undefined}>
                    <td>
                      <div className="fw-semibold">
                        {p.symbol}
                        {p.bucket && <span className={`badge bg-${(BUCKET[p.bucket] || {}).tone || 'secondary'}-subtle text-${(BUCKET[p.bucket] || {}).tone || 'secondary'} ms-1`}>{p.bucket}</span>}
                        {s.qty === 0 && s.buys > 0 && <span className="badge bg-light text-muted ms-1">exited</span>}
                      </div>
                      {p.sector && <div className="text-muted small">{p.sector}</div>}
                    </td>
                    <td className="text-end">{s.qty || <span className="text-muted">—</span>}</td>
                    <td className="text-end">{s.qty > 0 ? price(s.avgCost, 'INR') : <span className="text-muted">—</span>}</td>
                    <td className="text-end">{s.qty > 0 ? money(s.invested, 'INR') : <span className="text-muted">—</span>}</td>
                    <td className="text-end" style={{ minWidth: 110 }}>
                      {ltpDraft ? (
                        <input type="number" step="0.01" className="form-control form-control-sm text-end" value={ltpDraft[p.id] ?? ''}
                          onChange={(e) => setLtpDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveLtpEdits(); if (e.key === 'Escape') setLtpDraft(null) }} />
                      ) : (p.ltp ? price(num(p.ltp), 'INR') : <span className="text-muted">—</span>)}
                    </td>
                    <td className="text-end">{s.qty > 0 ? money(s.value, 'INR') : <span className="text-muted">—</span>}</td>
                    <td className="text-end">
                      {s.qty > 0 ? <><PnL v={s.unrealised} />{s.pnlPct != null && <div className={'small ' + (s.unrealised >= 0 ? 'text-success' : 'text-danger')}>{pctText(s.unrealised / s.invested)}</div>}</>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td><EmaCell position={p} /></td>
                    <td className="text-end">
                      {s.nextAdd > 0 ? (
                        <>
                          <div className={s.dueToAdd ? 'text-warning fw-semibold' : ''}>{price(s.nextAdd, 'INR')}</div>
                          <div className="text-muted small">{s.dueToAdd ? 'due now' : `${pctText(s.dropFromLastBuy)} vs last buy`}</div>
                        </>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-ghost-secondary px-2" title="Trade log" onClick={() => setModal({ kind: 'log', data: p })}>
                        <span className="badge bg-light text-body">{s.lots.length}</span>
                      </button>
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-soft-primary px-2 me-1" title="Add / trim" onClick={() => setModal({ kind: 'lot', data: p })}><i className="ri-add-line" /></button>
                      <button className="btn btn-sm btn-ghost-secondary px-2 me-1" title="Edit details" onClick={() => setModal({ kind: 'edit', data: p })}><i className="ri-information-line" /></button>
                      <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(p)}><i className="ri-delete-bin-line" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr className="fw-semibold">
                  <td colSpan={3}>Total</td>
                  <td className="text-end">{money(totals.invested, 'INR')}</td>
                  <td />
                  <td className="text-end">{money(totals.value, 'INR')}</td>
                  <td className="text-end"><PnL v={totals.unrealised} /></td>
                  <td colSpan={4} className="text-muted small">Realised {money(totals.realised, 'INR')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {modal?.kind === 'lot' && <LotModal position={modal.data} stats={statsOf(modal.data)} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadAll() }} />}
      {modal?.kind === 'log' && <LogModal position={modal.data} stats={statsOf(modal.data)} onClose={() => setModal(null)} onChanged={reloadAll} />}
      {modal?.kind === 'edit' && <DetailsModal position={modal.data} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await reloadPositions() }} />}
      <ConfirmDialog
        open={Boolean(del)} title="Delete stock?"
        message={del ? `${del.symbol} and its entire trade log will be permanently removed.` : ''}
        confirmLabel="Delete" tone="danger"
        onConfirm={async () => { const p = del; setDel(null); await removePosition(p.id); await reloadAll() }}
        onCancel={() => setDel(null)}
      />
    </div>
  )
}

// --- Add stocks -------------------------------------------------------------
const blankRow = () => ({ key: Math.random().toString(36).slice(2, 8), stockId: '', symbol: '', name: '', sector: '', bucket: '', thesis: '', qty: '', price: '', tradeDate: todayISO(), support: '50', note: '' })

/**
 * Same feel as the swing basket, minus the capital split — this book has no
 * budget. A row whose symbol already exists just adds a lot to that position
 * rather than creating a duplicate.
 */
function Basket({ stocks, positions, onSaved }) {
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const setRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, blankRow()])
  const dropRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key))

  const pickStock = (key, id) => {
    const st = stocks.find((x) => x.id === id)
    setRow(key, st
      ? { stockId: id, symbol: st.symbol, name: st.name || '', sector: st.sector || '', bucket: st.bucket || '', thesis: st.rationale || '' }
      : { stockId: '', symbol: '', name: '', sector: '', bucket: '', thesis: '' })
  }

  const stockOptions = useMemo(() => [...stocks]
    .sort((a, b) => (a.bucket || 'Z').localeCompare(b.bucket || 'Z') || a.symbol.localeCompare(b.symbol))
    .map((st) => ({ value: st.id, label: `${st.symbol}${st.bucket ? ' · ' + st.bucket : ''}${st.sector ? ' · ' + st.sector : ''}` })), [stocks])

  const valueOf = (r) => num(r.qty) * num(r.price)
  const total = rows.reduce((s, r) => s + valueOf(r), 0)
  const readyCount = rows.filter((r) => r.symbol && num(r.qty) > 0 && num(r.price) > 0).length
  const heldSymbols = new Set(positions.map((p) => (p.symbol || '').toUpperCase()))

  const save = async () => {
    const payload = rows.filter((r) => r.symbol && num(r.qty) > 0 && num(r.price) > 0)
    if (!payload.length) { setErr('Each row needs a stock, a quantity and a price.'); return }
    setErr(null); setSaving(true)
    try { await addBasket(payload, positions); setRows([]); await onSaved() }
    catch (e) { setErr(e.message || 'Could not save.') } finally { setSaving(false) }
  }

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center flex-wrap gap-2">
        <h5 className="card-title mb-0 me-2">Add stocks</h5>
        {rows.length > 0 && <span className="text-muted small">{rows.length} row{rows.length === 1 ? '' : 's'} · {money(total, 'INR')}</span>}
        <span className="flex-grow-1" />
        <button className="btn btn-sm btn-soft-primary" onClick={addRow}><i className="ri-add-line me-1" />Add stock</button>
        {rows.length > 0 && (
          <>
            <button className="btn btn-sm btn-light" onClick={() => { setRows([]); setErr(null) }} disabled={saving}>Clear</button>
            <button className="btn btn-sm btn-primary" onClick={save} disabled={saving || readyCount === 0}>
              <i className="ri-check-line me-1" />{saving ? 'Saving…' : `Save ${readyCount || ''} buy${readyCount === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card-body text-center text-muted py-4">
          <i className="ri-stack-line fs-3 d-block mb-2" />
          <strong>Add stock</strong> for each name you are buying. No budget here — you set the quantity.
        </div>
      ) : (
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light"><tr>
                <th style={{ minWidth: 230 }}>Stock</th>
                <th className="text-end" style={{ width: 110 }}>Qty</th>
                <th className="text-end" style={{ width: 120 }}>Price</th>
                <th style={{ width: 150 }}>Date</th>
                <th style={{ width: 130 }}>Support</th>
                <th className="text-end">Value</th>
                <th>Note</th>
                <th />
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <SearchSelect value={r.stockId} onChange={(id) => pickStock(r.key, id)} options={stockOptions} placeholder="Search Stock Strength…" />
                      {r.symbol && heldSymbols.has(r.symbol.toUpperCase()) && (
                        <div className="text-info small mt-1"><i className="ri-information-line me-1" />already held — this adds to it</div>
                      )}
                    </td>
                    <td><input type="number" className="form-control form-control-sm text-end" value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} /></td>
                    <td><input type="number" step="0.01" className="form-control form-control-sm text-end" value={r.price} onChange={(e) => setRow(r.key, { price: e.target.value })} /></td>
                    <td><input type="date" className="form-control form-control-sm" value={r.tradeDate} onChange={(e) => setRow(r.key, { tradeDate: e.target.value })} /></td>
                    <td>
                      <select className="form-select form-select-sm" value={r.support} onChange={(e) => setRow(r.key, { support: e.target.value })}>
                        {SUPPORT_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="text-end">{valueOf(r) ? money(valueOf(r), 'INR') : <span className="text-muted">—</span>}</td>
                    <td><input className="form-control form-control-sm" placeholder="optional" value={r.note} onChange={(e) => setRow(r.key, { note: e.target.value })} /></td>
                    <td className="text-end"><button className="btn btn-sm btn-ghost-danger px-1" onClick={() => dropRow(r.key)}><i className="ri-close-line" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {err && <div className="card-body pt-0"><div className="alert alert-danger py-2 mb-0">{err}</div></div>}
    </div>
  )
}

// --- Add or trim an existing position ---------------------------------------
function LotModal({ position, stats, onClose, onSaved }) {
  const [f, setF] = useState({ side: 'BUY', qty: '', price: String(num(position.ltp) || ''), tradeDate: todayISO(), support: '50', note: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const q = num(f.qty); const p = num(f.price)
  const isSell = f.side === 'SELL'
  // Preview the position after this lot, using the same average-cost rule.
  const after = isSell
    ? { qty: stats.qty - q, avg: stats.avgCost, realised: q * (p - stats.avgCost) }
    : { qty: stats.qty + q, avg: stats.qty + q > 0 ? (stats.invested + q * p) / (stats.qty + q) : 0, realised: 0 }

  const save = async () => {
    if (q <= 0 || p <= 0) { setErr('Quantity and price are required.'); return }
    if (isSell && q > stats.qty) { setErr(`You only hold ${stats.qty}.`); return }
    setErr(null); setSaving(true)
    try { await addLot({ positionId: position.id, ...f }); await onSaved() }
    catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open title={<><i className="ri-add-circle-line me-2 text-primary" />{position.symbol}</>} onClose={onClose}>
      <div className="border rounded p-2 mb-3 bg-light small">
        Holding <strong>{stats.qty}</strong> at avg {price(stats.avgCost, 'INR')}
        {stats.lastBuyPrice > 0 && <> · last buy {price(stats.lastBuyPrice, 'INR')} on {fmtDate(stats.lastBuyDate)}</>}
        {stats.nextAdd > 0 && <> · add at {price(stats.nextAdd, 'INR')}</>}
      </div>
      <div className="row g-2">
        <div className="col-md-3"><label className="form-label small mb-1">Action</label>
          <select className="form-select" value={f.side} onChange={(e) => set('side', e.target.value)}>
            {SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-md-3"><label className="form-label small mb-1">Quantity</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} autoFocus /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Price</label><input type="number" step="0.01" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Date</label><input type="date" className="form-control" value={f.tradeDate} onChange={(e) => set('tradeDate', e.target.value)} /></div>
        {!isSell && (
          <div className="col-md-4"><label className="form-label small mb-1">Bought at</label>
            <select className="form-select" value={f.support} onChange={(e) => set('support', e.target.value)}>
              {SUPPORT_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div className="col-12"><label className="form-label small mb-1">Note <span className="text-muted">(optional)</span></label><input className="form-control" placeholder="Why this add / trim" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
      </div>

      {q > 0 && p > 0 && (
        <div className="d-flex gap-3 mt-3">
          <div className="border rounded p-2 flex-grow-1 text-center"><div className="text-muted small">Value</div><div className="fw-semibold mt-1">{money(q * p, 'INR')}</div></div>
          <div className="border rounded p-2 flex-grow-1 text-center"><div className="text-muted small">Qty after</div><div className="fw-semibold mt-1">{after.qty}</div></div>
          <div className="border rounded p-2 flex-grow-1 text-center">
            <div className="text-muted small">{isSell ? 'Realised' : 'Avg after'}</div>
            <div className="fw-semibold mt-1">{isSell ? <PnL v={after.realised} /> : price(after.avg, 'INR')}</div>
          </div>
        </div>
      )}
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className={'btn ' + (isSell ? 'btn-danger' : 'btn-primary')} onClick={save} disabled={saving}><i className="ri-check-line me-1" />{saving ? 'Saving…' : isSell ? 'Record sell' : 'Record buy'}</button>
      </div>
    </Modal>
  )
}

// --- Trade log --------------------------------------------------------------
/**
 * Every buy and sell with the running position beside it, so you can see how
 * the average moved as you accumulated rather than just where it landed.
 */
function LogModal({ position, stats, onClose, onChanged }) {
  const [busy, setBusy] = useState(null)

  let qty = 0; let cost = 0
  const walked = stats.lots.map((l) => {
    const q = num(l.qty); const p = num(l.price)
    let realised = null
    if (l.side === 'SELL') {
      const avg = qty > 0 ? cost / qty : 0
      const sold = Math.min(q, qty)
      realised = sold * (p - avg)
      cost -= sold * avg; qty -= sold
    } else {
      qty += q; cost += q * p
    }
    return { l, runQty: qty, runAvg: qty > 0 ? cost / qty : 0, realised }
  })

  const del = async (id) => {
    setBusy(id)
    try { await removeLot(id); await onChanged() } finally { setBusy(null) }
  }

  return (
    <Modal open size="lg" title={<><i className="ri-history-line me-2 text-primary" />{position.symbol} — trade log</>} onClose={onClose}>
      <div className="row g-2 mb-3 text-center">
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Holding</div><div className="fw-semibold mt-1">{stats.qty}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Avg cost</div><div className="fw-semibold mt-1">{price(stats.avgCost, 'INR')}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Invested</div><div className="fw-semibold mt-1">{money(stats.invested, 'INR')}</div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Unrealised</div><div className="mt-1"><PnL v={stats.unrealised} /></div></div></div>
        <div className="col"><div className="border rounded p-2"><div className="text-muted small">Realised</div><div className="mt-1"><PnL v={stats.realised} /></div></div></div>
      </div>

      {stats.lots.length === 0 ? (
        <p className="text-muted text-center py-4 mb-0">No trades recorded.</p>
      ) : (
        <div className="table-responsive" style={{ maxHeight: 380 }}>
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light"><tr>
              <th>Date</th><th>Action</th><th>At</th><th className="text-end">Qty</th><th className="text-end">Price</th><th className="text-end">Value</th>
              <th className="text-end">Held after</th><th className="text-end">Avg after</th><th className="text-end">Realised</th><th>Note</th><th />
            </tr></thead>
            <tbody>
              {walked.map(({ l, runQty, runAvg, realised }) => (
                <tr key={l.id}>
                  <td className="text-nowrap">{fmtDate(l.trade_date)}</td>
                  <td><span className={'badge ' + (l.side === 'SELL' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success')}>{l.side === 'SELL' ? 'Sell' : 'Buy'}</span></td>
                  <td>{l.side === 'SELL' ? <span className="text-muted">—</span> : <SupportBadge value={l.support} />}</td>
                  <td className="text-end">{num(l.qty)}</td>
                  <td className="text-end">{price(num(l.price), 'INR')}</td>
                  <td className="text-end">{money(num(l.qty) * num(l.price), 'INR')}</td>
                  <td className="text-end">{runQty}</td>
                  <td className="text-end">{runQty > 0 ? price(runAvg, 'INR') : '—'}</td>
                  <td className="text-end">{realised == null ? <span className="text-muted">—</span> : <PnL v={realised} />}</td>
                  <td className="small text-muted" style={{ maxWidth: 200, whiteSpace: 'normal' }}>{l.note || '—'}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-ghost-danger px-1" disabled={busy === l.id} onClick={() => del(l.id)}><i className="ri-delete-bin-line" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted small mt-2 mb-0">
        Average cost method: a sell realises against the running average and leaves it unchanged, so the average always reflects what you still hold.
      </p>
    </Modal>
  )
}

// --- Stock details ----------------------------------------------------------
function DetailsModal({ position, onClose, onSaved }) {
  const [f, setF] = useState({
    thesis: position.thesis || '',
    ema50: position.ema_50 ?? '',
    ema200: position.ema_200 ?? '',
    sector: position.sector || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const save = async () => {
    setErr(null); setSaving(true)
    try {
      await editPosition(position.id, {
        thesis: f.thesis.trim() || null,
        sector: f.sector.trim() || null,
        ema_50: f.ema50 === '' ? null : num(f.ema50),
        ema_200: f.ema200 === '' ? null : num(f.ema200),
        levels_at: new Date().toISOString(),
      })
      await onSaved()
    } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }

  return (
    <Modal open title={<><i className="ri-information-line me-2 text-primary" />{position.symbol}</>} onClose={onClose}>
      <div className="row g-2">
        <div className="col-md-4"><label className="form-label small mb-1">50 EMA</label><input type="number" step="0.01" className="form-control" value={f.ema50} onChange={(e) => set('ema50', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">200 EMA</label><input type="number" step="0.01" className="form-control" value={f.ema200} onChange={(e) => set('ema200', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Sector</label><input className="form-control" value={f.sector} onChange={(e) => set('sector', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Why I hold this</label>
          <textarea className="form-control" rows={4} placeholder="The long-term case — what has to stay true for this to keep its place."
            value={f.thesis} onChange={(e) => set('thesis', e.target.value)} />
        </div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-2 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  )
}
