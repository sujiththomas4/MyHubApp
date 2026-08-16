import { useEffect, useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { ASSETS, ASSET, lotInfo, qtyFor } from '@/data/ngRepo'
import {
  useEeNgTrades, addEeNgTrade, editEeNgTrade, removeEeNgTrade,
  useEeNgSettings, saveEeNgSettings, eeAssetStats,
} from '@/data/eeNgRepo'

/**
 * EeNiftyGold.jsx — Eva & Ezaak "Nifty–Gold Ratio (Short Term)" rotation
 * (route /wealth/eva-ezaak/nifty-gold). Rotate between Nifty and Gold on the
 * Nifty/Gold ratio breaking its previous 20-day high/low. The signal is judged
 * manually (outside the tool); this screen records the rotation trades & P&L.
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const PnL = ({ v }) => <span className={(v >= 0 ? 'text-success' : 'text-danger') + ' fw-semibold'}>{v >= 0 ? '+' : ''}{money(Math.round(v), 'INR')}</span>

const Tile = ({ label, value, icon, tone }) => (
  <div className="col-md-3 col-6">
    <div className="card stat-card h-100 mb-0"><div className="card-body">
      <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
      <h4 className="stat-value mt-3 mb-0">{value}</h4>
    </div></div>
  </div>
)

// --- Buy form ---------------------------------------------------------------
function BuyForm({ initial, prices, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const priceOf = (asset) => (asset === 'nifty' ? prices.niftyPrice : prices.goldPrice) ?? ''
  const setAsset = (asset) => setF((s) => ({ ...s, asset, price: s.priceTouched ? s.price : priceOf(asset) }))
  const save = async () => {
    if (!f.qty || Number(f.qty) <= 0) { setErr('Enter a quantity.'); return }
    setErr(null); setSaving(true)
    try { await onSave({ ...f, action: 'buy' }) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="row g-2">
        <div className="col-md-6"><label className="form-label small mb-1">Asset</label>
          <select className="form-select" value={f.asset} onChange={(e) => setAsset(e.target.value)}>
            {ASSETS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="col-md-6"><label className="form-label small mb-1">Date</label><input type="date" className="form-control" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="col-md-6"><label className="form-label small mb-1">Quantity</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} autoFocus /></div>
        <div className="col-md-6"><label className="form-label small mb-1">Unit price (₹)</label><input type="number" className="form-control" value={f.price} onChange={(e) => setF((s) => ({ ...s, price: e.target.value, priceTouched: true }))} /></div>
        <div className="col-12"><label className="form-label small mb-1">Indication / note</label><textarea className="form-control" rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. ratio broke 20-day low → rotate into Nifty" /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : f.id ? 'Update' : 'Add buy'}</button>
      </div>
    </>
  )
}

// --- Sell form (square off a specific buy lot) ------------------------------
function SellForm({ buy, remaining, topPrice, onSave, onCancel }) {
  const [f, setF] = useState({ qty: String(remaining), price: topPrice ?? '', date: todayISO(), note: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const pnl = num(f.qty) * (num(f.price) - num(buy.price))
  const save = async () => {
    const q = Number(f.qty)
    if (!q || q <= 0) { setErr('Enter a quantity.'); return }
    if (q > remaining) { setErr(`Only ${remaining} remaining in this lot.`); return }
    setErr(null); setSaving(true)
    try { await onSave({ id: 'eeng-' + rid(), asset: buy.asset, action: 'sell', parentId: buy.id, qty: f.qty, price: f.price, date: f.date, note: f.note }) }
    catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="border rounded p-2 mb-3 bg-light small">
        Squaring off <strong>{ASSET[buy.asset]?.label}</strong> · bought {buy.qty} @ {money(num(buy.price), 'INR')} · <strong>{remaining}</strong> remaining
      </div>
      <div className="row g-2">
        <div className="col-md-4"><label className="form-label small mb-1">Sell qty</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} autoFocus /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Sell price (₹)</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Date</label><input type="date" className="form-control" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Note</label><input className="form-control" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
      </div>
      <div className="mt-2">P&L on this sell: <PnL v={pnl} /></div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" onClick={save} disabled={saving}><i className="ri-check-line me-1" />{saving ? 'Selling…' : 'Sell'}</button>
      </div>
    </>
  )
}

export default function EeNiftyGold() {
  const { trades, reload: reloadTrades } = useEeNgTrades()
  const { settings, reload: reloadSettings } = useEeNgSettings()

  const [prices, setPrices] = useState({ niftyPrice: '', goldPrice: '' })
  useEffect(() => { setPrices({ niftyPrice: settings.niftyPrice, goldPrice: settings.goldPrice }) }, [settings.niftyPrice, settings.goldPrice])
  const savePrices = async () => { await saveEeNgSettings(prices); await reloadSettings() }

  // Calculator
  const [capital, setCapital] = useState('')
  const [calcAsset, setCalcAsset] = useState('nifty')
  const [unitPrice, setUnitPrice] = useState('')
  useEffect(() => { setUnitPrice(calcAsset === 'nifty' ? (prices.niftyPrice ?? '') : (prices.goldPrice ?? '')) }, [calcAsset, prices.niftyPrice, prices.goldPrice])
  const calc = qtyFor(capital, unitPrice)

  const nifty = useMemo(() => eeAssetStats('nifty', trades, prices.niftyPrice), [trades, prices.niftyPrice])
  const gold = useMemo(() => eeAssetStats('gold', trades, prices.goldPrice), [trades, prices.goldPrice])
  const lots = useMemo(() => lotInfo(trades), [trades])
  const ratio = num(prices.niftyPrice) && num(prices.goldPrice) ? num(prices.niftyPrice) / num(prices.goldPrice) : null
  const priceOf = (a) => (a === 'nifty' ? prices.niftyPrice : prices.goldPrice)

  const totInvested = nifty.invested + gold.invested
  const totValue = nifty.value + gold.value
  const totRealised = nifty.realised + gold.realised
  const totUnrealised = nifty.unrealised + gold.unrealised

  const [buyModal, setBuyModal] = useState(null)
  const [sellLot, setSellLot] = useState(null)
  const [del, setDel] = useState(null)
  const openAdd = () => setBuyModal({ asset: 'nifty', qty: '', price: prices.niftyPrice ?? '', date: todayISO(), note: '' })
  const saveBuy = async (f) => { if (f.id) await editEeNgTrade(f); else await addEeNgTrade({ ...f, id: 'eeng-' + rid() }); await reloadTrades(); setBuyModal(null) }
  const saveSell = async (f) => { await addEeNgTrade(f); await reloadTrades(); setSellLot(null) }
  const confirmDelete = async () => {
    const t = del; setDel(null)
    for (const s of trades.filter((x) => x.parentId === t.id)) await removeEeNgTrade(s.id) // eslint-disable-line no-await-in-loop
    await removeEeNgTrade(t.id); await reloadTrades()
  }
  const removeSell = async (id) => { await removeEeNgTrade(id); await reloadTrades() }

  const Holding = ({ a, st }) => {
    const meta = ASSET[a]
    const active = st.holding > 0
    return (
      <div className="col-md-6">
        <div className={'card mb-0 h-100' + (active ? ` border border-2 border-${meta.tone}` : '')}>
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className={`stat-icon bg-${meta.tone}-subtle text-${meta.tone}`} style={{ width: 40, height: 40 }}><i className={meta.icon} /></span>
              <h5 className="mb-0 flex-grow-1">{meta.label}</h5>
              {active ? <span className={`badge bg-${meta.tone}`}>Holding {st.holding}</span> : <span className="badge bg-light text-muted">Not held</span>}
            </div>
            <div className="row g-2 small text-muted">
              <div className="col-6">Qty <span className="fw-semibold text-body">{st.qty || '—'}</span></div>
              <div className="col-6">Avg <span className="fw-semibold text-body">{st.avg ? money(st.avg, 'INR') : '—'}</span></div>
              <div className="col-6">Invested <span className="fw-semibold text-body">{st.invested ? money(Math.round(st.invested), 'INR') : '—'}</span></div>
              <div className="col-6">Realised {st.realised ? <PnL v={st.realised} /> : '—'}</div>
              <div className="col-12">Unrealised {st.qty > 0 && st.ltp ? <PnL v={st.unrealised} /> : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const shownBuys = trades.filter((t) => t.action === 'buy')
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))

  return (
    <div className="ee-nifty-gold">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Nifty–Gold Ratio (Short Term)</h4>
          <small className="text-muted">For Eva &amp; Ezaak · rotate between Nifty &amp; Gold on the ratio&apos;s 20-day break.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><a href="/wealth/eva-ezaak">Eva &amp; Ezaak Portfolio</a></li>
            <li className="breadcrumb-item active" aria-current="page">Nifty–Gold Ratio</li>
          </ol>
        </nav>
      </div>

      <div className="alert alert-info border-0 d-flex gap-2 mb-3" role="alert">
        <i className="ri-compass-3-line fs-18" />
        <div className="small">
          <strong>How this works.</strong> This is a short-term rotation between Nifty and Gold driven by the <strong>Nifty / Gold ratio</strong> breaking its <strong>previous 20-day high or low</strong>. When the ratio breaks out, rotate the holding from one asset into the other — only one side is held at a time. The breakout signal (previous 20-day high/low) is judged manually outside this tool; here you record each rotation buy, square it off when the ratio flips, and track the realised P&L.
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div><label className="form-label small mb-1"><i className="ri-line-chart-line text-primary me-1" />Nifty price</label><input type="number" className="form-control form-control-sm" style={{ maxWidth: 150 }} value={prices.niftyPrice} onChange={(e) => setPrices((s) => ({ ...s, niftyPrice: e.target.value }))} /></div>
          <div><label className="form-label small mb-1"><i className="ri-coin-line text-warning me-1" />Gold price</label><input type="number" className="form-control form-control-sm" style={{ maxWidth: 150 }} value={prices.goldPrice} onChange={(e) => setPrices((s) => ({ ...s, goldPrice: e.target.value }))} /></div>
          <button className="btn btn-sm btn-soft-primary" onClick={savePrices}><i className="ri-save-line me-1" />Save prices</button>
          <div className="ms-auto text-end"><div className="text-muted small">Nifty / Gold ratio</div><h4 className="mb-0">{ratio != null ? ratio.toFixed(2) : '—'}</h4></div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <Tile label="Invested" value={money(Math.round(totInvested), 'INR')} icon="ri-wallet-3-line" tone="info" />
        <Tile label="Current value" value={money(Math.round(totValue), 'INR')} icon="ri-funds-line" tone="primary" />
        <Tile label="Realised P&L" value={<PnL v={totRealised} />} icon="ri-check-double-line" tone="success" />
        <Tile label="Unrealised P&L" value={<PnL v={totUnrealised} />} icon="ri-line-chart-line" tone="warning" />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-5">
          <div className="card mb-0 h-100">
            <div className="card-header py-2"><h6 className="card-title mb-0"><i className="ri-calculator-line me-1" />Quantity calculator</h6></div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-12 d-flex align-items-center gap-2">
                  <span className="small text-muted">For:</span>
                  <div className="btn-group btn-group-sm">
                    <button className={'btn ' + (calcAsset === 'nifty' ? 'btn-primary' : 'btn-soft-primary')} onClick={() => setCalcAsset('nifty')}>Nifty</button>
                    <button className={'btn ' + (calcAsset === 'gold' ? 'btn-warning' : 'btn-soft-warning')} onClick={() => setCalcAsset('gold')}>Gold</button>
                  </div>
                  <span className="text-muted small ms-auto">from {calcAsset === 'nifty' ? 'Nifty' : 'Gold'} price</span>
                </div>
                <div className="col-6"><label className="form-label small mb-1">Capital (₹)</label><input type="number" className="form-control" placeholder="e.g. 100000" value={capital} onChange={(e) => setCapital(e.target.value)} /></div>
                <div className="col-6"><label className="form-label small mb-1">Unit price (₹)</label><input type="number" className="form-control" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
              </div>
              <div className="row g-2 mt-2 text-center">
                <div className="col-4"><div className="border rounded p-2"><div className="text-muted small">Quantity</div><h4 className="mb-0 text-primary">{calc.qty}</h4></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="text-muted small">Amount used</div><div className="fw-semibold mt-1">{money(Math.round(calc.used), 'INR')}</div></div></div>
                <div className="col-4"><div className="border rounded p-2"><div className="text-muted small">Leftover</div><div className="fw-semibold mt-1">{money(Math.round(calc.leftover), 'INR')}</div></div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="row g-3 h-100">
            <Holding a="nifty" st={nifty} />
            <Holding a="gold" st={gold} />
          </div>
        </div>
      </div>

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Rotation trades</h5>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />Add transaction</button>
        </div>
        <div className="card-body p-0">
          {shownBuys.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No transactions yet. Buy Nifty or Gold when the ratio breaks the 20-day high/low.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Date</th><th>Asset</th><th className="text-end">Qty</th><th className="text-end">Buy price</th><th className="text-end">Sell price</th><th className="text-center">Remaining</th><th className="text-end">P&L</th><th>Indication</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {shownBuys.map((t) => {
                    const info = lots[t.id] || { soldQty: 0, remaining: num(t.qty), realised: 0, sells: [] }
                    const soldQty = info.soldQty
                    const avgSell = soldQty > 0 ? info.sells.reduce((s, x) => s + num(x.qty) * num(x.price), 0) / soldQty : 0
                    const sellTitle = info.sells.map((x) => `${x.date || ''}: ${x.qty} @ ${money(num(x.price), 'INR')}`).join('\n')
                    const canSell = info.remaining > 0
                    const lastSell = info.sells[info.sells.length - 1]
                    return (
                      <tr key={t.id}>
                        <td className="text-muted">{t.date || '—'}</td>
                        <td><span className={`badge bg-${ASSET[t.asset]?.tone || 'secondary'}-subtle text-${ASSET[t.asset]?.tone || 'secondary'}`}><i className={(ASSET[t.asset]?.icon || '') + ' me-1'} />{ASSET[t.asset]?.label || t.asset}</span></td>
                        <td className="text-end">{t.qty}</td>
                        <td className="text-end">{money(num(t.price), 'INR')}</td>
                        <td className="text-end">
                          {soldQty > 0 ? <span title={sellTitle}>{money(avgSell, 'INR')}{soldQty < num(t.qty) ? <span className="text-muted small"> ({soldQty})</span> : null}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-center">{info.remaining}/{t.qty}</td>
                        <td className="text-end">{soldQty > 0 ? <PnL v={info.realised} /> : <span className="text-muted">—</span>}</td>
                        <td className="text-muted small" style={{ maxWidth: 200, whiteSpace: 'normal' }}>{t.note || '—'}</td>
                        <td className="text-end text-nowrap">
                          {canSell && <button className="btn btn-sm btn-soft-danger px-2 me-1" title="Sell / square off" onClick={() => setSellLot(t)}><i className="ri-subtract-line me-1" />Sell</button>}
                          {soldQty > 0 && <button className="btn btn-sm btn-ghost-warning px-2" title="Undo last sell" onClick={() => removeSell(lastSell.id)}><i className="ri-arrow-go-back-line" /></button>}
                          <button className="btn btn-sm btn-ghost-secondary px-2" title="Edit" onClick={() => setBuyModal({ ...t })}><i className="ri-pencil-line" /></button>
                          <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(t)}><i className="ri-delete-bin-line" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={Boolean(buyModal)} title={<><i className="ri-shopping-cart-2-line me-2 text-primary" />{buyModal?.id ? 'Edit buy' : 'New buy'}</>} onClose={() => setBuyModal(null)}>
        {buyModal && <BuyForm initial={buyModal} prices={prices} onSave={saveBuy} onCancel={() => setBuyModal(null)} />}
      </Modal>

      <Modal open={Boolean(sellLot)} title={<><i className="ri-subtract-line me-2 text-danger" />Sell / square off</>} onClose={() => setSellLot(null)}>
        {sellLot && <SellForm buy={sellLot} remaining={lots[sellLot.id]?.remaining ?? 0} topPrice={priceOf(sellLot.asset)} onSave={saveSell} onCancel={() => setSellLot(null)} />}
      </Modal>

      <ConfirmDialog open={Boolean(del)} title="Delete transaction?" message="This transaction will be removed and P&L recomputed." confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
