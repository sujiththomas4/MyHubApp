import { useMemo, useState } from 'react'
import { money, fmtDate } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useSwingPositions, addSwingPosition, editSwingPosition, removeSwingPosition,
  useSwingTrades, addSwingTrade, editSwingTrade, removeSwingTrade,
  positionStats, SWING_STATUS_BADGE, SWING_STATUS_LABEL,
} from '@/data/swingRepo'

/**
 * StockSwing.jsx — Stock Swing Trading (route /business/swing). Add stock
 * positions, average (add qty), square off (sell partial/full), track realised
 * & unrealised P&L. Limit buys sit as pending until marked bought.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const PnL = ({ v }) => <span className={(v >= 0 ? 'text-success' : 'text-danger') + ' fw-semibold'}>{v >= 0 ? '+' : ''}{money(Math.round(v), 'INR')}</span>

const Tile = ({ label, value, sub, icon, tone }) => (
  <div className="col-md-3 col-6">
    <div className="card stat-card h-100 mb-0"><div className="card-body">
      <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
      <h4 className="stat-value mt-3 mb-0">{value}</h4>
      {sub && <span className="text-muted small">{sub}</span>}
    </div></div>
  </div>
)

// --- Add position -----------------------------------------------------------
function AddPositionForm({ onSave, onCancel }) {
  const [f, setF] = useState({ symbol: '', name: '', qty: '', price: '', orderType: 'market', date: todayISO(), note: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.symbol.trim()) { setErr('Symbol is required.'); return }
    if (!f.qty || Number(f.qty) <= 0) { setErr('Enter a buy quantity.'); return }
    setErr(null); setSaving(true)
    try { await onSave(f) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="row g-2">
        <div className="col-md-6"><label className="form-label small mb-1">Symbol</label><input className="form-control text-uppercase" placeholder="e.g. TATAMOTORS" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} autoFocus /></div>
        <div className="col-md-6"><label className="form-label small mb-1">Name <span className="text-muted">(optional)</span></label><input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Buy qty</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Price</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Order</label>
          <select className="form-select" value={f.orderType} onChange={(e) => set('orderType', e.target.value)}>
            <option value="market">Market (bought)</option>
            <option value="limit">Limit (not yet bought)</option>
          </select>
        </div>
        <div className="col-md-3"><label className="form-label small mb-1">Date</label><input type="date" className="form-control" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Note</label><input className="form-control" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Add position'}</button>
      </div>
    </>
  )
}

// --- Manage a position (average / sell / mark bought / current price) --------
function ManagePosition({ position, trades, reloadPos, reloadTrades, onClose }) {
  const st = positionStats(position, trades)
  const [buy, setBuy] = useState({ qty: '', price: '', orderType: 'market', date: todayISO() })
  const [sell, setSell] = useState({ qty: '', price: '', date: todayISO() })
  const [ltp, setLtp] = useState(position.currentPrice)
  const [err, setErr] = useState(null)
  const [delTrade, setDelTrade] = useState(null)

  const addBuy = async () => {
    if (!buy.qty || Number(buy.qty) <= 0) { setErr('Enter buy quantity.'); return }
    setErr(null)
    await addSwingTrade({ id: 'sw-' + rid(), positionId: position.id, kind: 'buy', qty: buy.qty, price: buy.price, orderType: buy.orderType, status: buy.orderType === 'limit' ? 'pending' : 'executed', date: buy.date })
    setBuy({ qty: '', price: '', orderType: 'market', date: todayISO() }); await reloadTrades()
  }
  const addSell = async () => {
    const q = Number(sell.qty)
    if (!q || q <= 0) { setErr('Enter sell quantity.'); return }
    if (q > st.openQty) { setErr(`Cannot sell ${q} — only ${st.openQty} open.`); return }
    setErr(null)
    await addSwingTrade({ id: 'sw-' + rid(), positionId: position.id, kind: 'sell', qty: sell.qty, price: sell.price, orderType: 'market', status: 'executed', date: sell.date })
    setSell({ qty: '', price: '', date: todayISO() }); await reloadTrades()
  }
  const markBought = async (t) => { await editSwingTrade({ ...t, status: 'executed' }); await reloadTrades() }
  const saveLtp = async () => { await editSwingPosition({ ...position, currentPrice: ltp }); await reloadPos() }
  const confirmDelTrade = async () => { const t = delTrade; setDelTrade(null); await removeSwingTrade(t.id); await reloadTrades() }

  return (
    <Modal open size="lg" title={<><i className="ri-line-chart-line me-2 text-primary" />{position.symbol}{position.name ? ` · ${position.name}` : ''}</>} onClose={onClose}>
      {/* Snapshot */}
      <div className="row g-2 mb-3">
        <div className="col-6 col-md-3"><div className="border rounded p-2 h-100"><div className="text-muted small">Open qty</div><div className="fw-semibold">{st.openQty}</div></div></div>
        <div className="col-6 col-md-3"><div className="border rounded p-2 h-100"><div className="text-muted small">Avg buy</div><div className="fw-semibold">{money(st.avgBuy, 'INR')}</div></div></div>
        <div className="col-6 col-md-3"><div className="border rounded p-2 h-100"><div className="text-muted small">Realised</div><PnL v={st.realised} /></div></div>
        <div className="col-6 col-md-3"><div className="border rounded p-2 h-100"><div className="text-muted small">Unrealised</div>{st.openQty > 0 ? <PnL v={st.unrealised} /> : <span className="text-muted">—</span>}</div></div>
      </div>

      {/* Current price */}
      <div className="d-flex align-items-end gap-2 mb-3">
        <div><label className="form-label small mb-1">Current price (LTP)</label><input type="number" className="form-control form-control-sm" style={{ maxWidth: 140 }} value={ltp} onChange={(e) => setLtp(e.target.value)} /></div>
        <button className="btn btn-sm btn-soft-primary" onClick={saveLtp}><i className="ri-refresh-line me-1" />Update price</button>
        <span className="text-muted small ms-auto">Invested {money(Math.round(st.invested), 'INR')} · Value {money(Math.round(st.currentValue), 'INR')}</span>
      </div>

      {err && <div className="alert alert-danger py-2 mb-3">{err}</div>}

      {/* Actions */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="border rounded p-2 h-100">
            <h6 className="small mb-2"><i className="ri-add-circle-line text-success me-1" />Buy / average</h6>
            <div className="row g-1">
              <div className="col-4"><input type="number" className="form-control form-control-sm" placeholder="Qty" value={buy.qty} onChange={(e) => setBuy((s) => ({ ...s, qty: e.target.value }))} /></div>
              <div className="col-4"><input type="number" className="form-control form-control-sm" placeholder="Price" value={buy.price} onChange={(e) => setBuy((s) => ({ ...s, price: e.target.value }))} /></div>
              <div className="col-4"><select className="form-select form-select-sm" value={buy.orderType} onChange={(e) => setBuy((s) => ({ ...s, orderType: e.target.value }))}><option value="market">Market</option><option value="limit">Limit</option></select></div>
              <div className="col-8"><input type="date" className="form-control form-control-sm" value={buy.date} onChange={(e) => setBuy((s) => ({ ...s, date: e.target.value }))} /></div>
              <div className="col-4 d-grid"><button className="btn btn-sm btn-success" onClick={addBuy}>Add</button></div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="border rounded p-2 h-100">
            <h6 className="small mb-2"><i className="ri-subtract-line text-danger me-1" />Sell / square off <span className="text-muted">({st.openQty} open)</span></h6>
            <div className="row g-1">
              <div className="col-4"><input type="number" className="form-control form-control-sm" placeholder="Qty" value={sell.qty} onChange={(e) => setSell((s) => ({ ...s, qty: e.target.value }))} /></div>
              <div className="col-4"><input type="number" className="form-control form-control-sm" placeholder="Price" value={sell.price} onChange={(e) => setSell((s) => ({ ...s, price: e.target.value }))} /></div>
              <div className="col-4 d-grid"><button className="btn btn-sm btn-outline-secondary" disabled={st.openQty <= 0} onClick={() => setSell((s) => ({ ...s, qty: String(st.openQty) }))}>All</button></div>
              <div className="col-8"><input type="date" className="form-control form-control-sm" value={sell.date} onChange={(e) => setSell((s) => ({ ...s, date: e.target.value }))} /></div>
              <div className="col-4 d-grid"><button className="btn btn-sm btn-danger" disabled={st.openQty <= 0} onClick={addSell}>Sell</button></div>
            </div>
          </div>
        </div>
      </div>

      {/* Trades */}
      <h6 className="small text-muted mb-2">Trades</h6>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light"><tr><th>Date</th><th>Type</th><th className="text-end">Qty</th><th className="text-end">Price</th><th className="text-end">Value</th><th className="text-center">Status</th><th /></tr></thead>
          <tbody>
            {st.trades.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-3">No trades yet.</td></tr> : [...st.trades].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map((t) => (
              <tr key={t.id}>
                <td>{t.date ? fmtDate(t.date) : '—'}</td>
                <td><span className={'badge fw-normal ' + (t.kind === 'buy' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger')}>{t.kind === 'buy' ? 'Buy' : 'Sell'}</span></td>
                <td className="text-end">{t.qty}</td>
                <td className="text-end">{money(Number(t.price) || 0, 'INR')}</td>
                <td className="text-end">{money((Number(t.qty) || 0) * (Number(t.price) || 0), 'INR')}</td>
                <td className="text-center">
                  {t.status === 'pending'
                    ? <button className="btn btn-sm btn-soft-warning py-0" onClick={() => markBought(t)} title="Mark as bought">Limit · mark bought</button>
                    : <span className="badge bg-light text-muted">Executed</span>}
                </td>
                <td className="text-end"><button className="btn btn-sm btn-ghost-danger p-1" onClick={() => setDelTrade(t)}><i className="ri-delete-bin-line" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={Boolean(delTrade)} title="Delete trade?" message="This trade will be removed and P&L recomputed." confirmLabel="Delete" onConfirm={confirmDelTrade} onCancel={() => setDelTrade(null)} />
    </Modal>
  )
}

export default function StockSwing() {
  const { positions, reload: reloadPos } = useSwingPositions()
  const { trades, reload: reloadTrades } = useSwingTrades()
  const [adding, setAdding] = useState(false)
  const [manage, setManage] = useState(null)
  const [del, setDel] = useState(null)

  const rows = useMemo(() => positions.map((p) => ({ p, st: positionStats(p, trades) })), [positions, trades])
  const totInvested = rows.reduce((s, r) => s + r.st.invested, 0)
  const totRealised = rows.reduce((s, r) => s + r.st.realised, 0)
  const totUnrealised = rows.reduce((s, r) => s + r.st.unrealised, 0)
  const openCount = rows.filter((r) => r.st.status === 'open').length

  const addPosition = async (f) => {
    const id = 'pos-' + rid()
    await addSwingPosition({ id, symbol: f.symbol, name: f.name, currentPrice: f.orderType === 'market' ? f.price : '', note: f.note, sortOrder: positions.length })
    await addSwingTrade({ id: 'sw-' + rid(), positionId: id, kind: 'buy', qty: f.qty, price: f.price, orderType: f.orderType, status: f.orderType === 'limit' ? 'pending' : 'executed', date: f.date })
    await reloadPos(); await reloadTrades(); setAdding(false)
  }
  const confirmDelete = async () => {
    const p = del; setDel(null)
    for (const t of trades.filter((x) => x.positionId === p.id)) await removeSwingTrade(t.id) // eslint-disable-line no-await-in-loop
    await removeSwingPosition(p.id); await reloadPos(); await reloadTrades()
  }
  const managed = manage ? positions.find((p) => p.id === manage) : null

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Stock Swing Trading</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Swing Trading</li>
          </ol>
        </nav>
      </div>

      <div className="row g-3 mb-3">
        <Tile label="Open positions" value={openCount} sub={`${positions.length} total`} icon="ri-briefcase-line" tone="primary" />
        <Tile label="Invested (open)" value={money(Math.round(totInvested), 'INR')} icon="ri-wallet-3-line" tone="info" />
        <Tile label="Realised P&L" value={<PnL v={totRealised} />} icon="ri-check-double-line" tone="success" />
        <Tile label="Unrealised P&L" value={<PnL v={totUnrealised} />} icon="ri-line-chart-line" tone="warning" />
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Positions</h5>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add position</button>
        </div>
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No positions yet. Add a stock to start tracking. 📈</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Stock</th><th className="text-end">Open qty</th><th className="text-end">Avg buy</th><th className="text-end">LTP</th><th className="text-end">Invested</th><th className="text-end">Realised</th><th className="text-end">Unrealised</th><th className="text-center">Status</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map(({ p, st }) => (
                    <tr key={p.id}>
                      <td><div className="fw-medium">{p.symbol}</div>{p.name && <div className="text-muted small">{p.name}</div>}{st.pendingBuys.length > 0 && <span className="badge bg-warning-subtle text-dark mt-1">{st.pendingBuys.length} pending limit</span>}</td>
                      <td className="text-end">{st.openQty || '—'}</td>
                      <td className="text-end">{st.avgBuy ? money(st.avgBuy, 'INR') : '—'}</td>
                      <td className="text-end">{st.ltp ? money(st.ltp, 'INR') : '—'}</td>
                      <td className="text-end">{st.invested ? money(Math.round(st.invested), 'INR') : '—'}</td>
                      <td className="text-end">{st.soldQty > 0 ? <PnL v={st.realised} /> : <span className="text-muted">—</span>}</td>
                      <td className="text-end">{st.openQty > 0 && st.ltp ? <PnL v={st.unrealised} /> : <span className="text-muted">—</span>}</td>
                      <td className="text-center"><span className={'badge fw-normal ' + (SWING_STATUS_BADGE[st.status] || SWING_STATUS_BADGE.empty)}>{SWING_STATUS_LABEL[st.status] || st.status}</span></td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-soft-primary px-2 me-1" onClick={() => setManage(p.id)}><i className="ri-settings-3-line me-1" />Manage</button>
                        <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(p)}><i className="ri-delete-bin-line" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={adding} title={<><i className="ri-add-line me-2 text-primary" />New position</>} onClose={() => setAdding(false)}>
        {adding && <AddPositionForm onSave={addPosition} onCancel={() => setAdding(false)} />}
      </Modal>

      {managed && <ManagePosition position={managed} trades={trades} reloadPos={reloadPos} reloadTrades={reloadTrades} onClose={() => setManage(null)} />}

      <ConfirmDialog open={Boolean(del)} title="Delete position?" message={del ? `"${del.symbol}" and all its trades will be permanently removed.` : ''} confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
