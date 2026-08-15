import { useMemo, useState } from 'react'
import { money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  useEeStocks, addEeStock, editEeStock, removeEeStock,
  useEeTrades, addEeTrade, removeEeTrade, stockStats,
} from '@/data/eeStocksRepo'

/**
 * EeHoldings — reusable Eva & Ezaak holdings manager (add / average / exit,
 * realised vs unrealised, per-category returns). Shared by the stocks and
 * gold/silver screens; add new asset screens by passing a different `categories`.
 *
 * Props: categories [{key,label,tone,icon}], target? (per-category count goal),
 * itemLabel (e.g. 'stock', 'holding').
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const PnL = ({ v }) => <span className={(v >= 0 ? 'text-success' : 'text-danger') + ' fw-semibold'}>{v >= 0 ? '+' : ''}{money(Math.round(v), 'INR')}</span>

function AddForm({ itemLabel, categories, defaultCategory, onSave, onCancel }) {
  const [f, setF] = useState({ category: defaultCategory || (categories && categories[0]?.key) || '', name: '', symbol: '', price: '', qty: '', currentPrice: '', date: todayISO() })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.name.trim() && !f.symbol.trim()) { setErr('Enter a name or symbol.'); return }
    if (!f.qty || Number(f.qty) <= 0) { setErr('Enter a quantity.'); return }
    setErr(null); setSaving(true)
    try { await onSave(f) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="row g-2">
        {categories && (
          <div className="col-md-12"><label className="form-label small mb-1">Category</label>
            <select className="form-select" value={f.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        )}
        <div className="col-md-7"><label className="form-label small mb-1">Name</label><input className="form-control" placeholder="e.g. Reliance / 24K Gold" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></div>
        <div className="col-md-5"><label className="form-label small mb-1">Symbol</label><input className="form-control text-uppercase" placeholder="RELIANCE / GOLD" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Buy price</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Quantity</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Current value</label><input type="number" className="form-control" placeholder="LTP" value={f.currentPrice} onChange={(e) => set('currentPrice', e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1">Date</label><input type="date" className="form-control" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : `Add ${itemLabel}`}</button>
      </div>
    </>
  )
}

function BuyForm({ stock, onSave, onCancel }) {
  const [f, setF] = useState({ qty: '', price: stock.currentPrice ?? '', date: todayISO() })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.qty || Number(f.qty) <= 0) { setErr('Enter a quantity.'); return }
    setErr(null); setSaving(true)
    try { await onSave({ id: 'eet-' + rid(), stockId: stock.id, kind: 'buy', qty: f.qty, price: f.price, date: f.date }) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="small text-muted mb-2">{stock.name || stock.symbol} — add more quantity (averages the price)</div>
      <div className="row g-2">
        <div className="col-md-6"><label className="form-label small mb-1">Quantity</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} autoFocus /></div>
        <div className="col-md-6"><label className="form-label small mb-1">Entry price</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving}><i className="ri-add-line me-1" />{saving ? 'Saving…' : 'Add'}</button>
      </div>
    </>
  )
}

function ExitForm({ stock, holding, onSave, onCancel }) {
  const [f, setF] = useState({ qty: String(holding), price: stock.currentPrice ?? '', date: todayISO() })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    const q = Number(f.qty)
    if (!q || q <= 0) { setErr('Enter a quantity.'); return }
    if (q > holding) { setErr(`Only ${holding} held.`); return }
    setErr(null); setSaving(true)
    try { await onSave({ id: 'eet-' + rid(), stockId: stock.id, kind: 'sell', qty: f.qty, price: f.price, date: f.date }) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="small text-muted mb-2">{stock.name || stock.symbol} — {holding} held</div>
      <div className="row g-2">
        <div className="col-md-6"><label className="form-label small mb-1">Sell quantity</label><input type="number" className="form-control" value={f.qty} onChange={(e) => set('qty', e.target.value)} autoFocus /></div>
        <div className="col-md-6"><label className="form-label small mb-1">Exit price</label><input type="number" className="form-control" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" onClick={save} disabled={saving}><i className="ri-logout-box-r-line me-1" />{saving ? 'Saving…' : 'Exit'}</button>
      </div>
    </>
  )
}

function EditForm({ stock, onSave, onCancel }) {
  const [f, setF] = useState({ ...stock })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => { setSaving(true); try { await onSave(f) } catch { setSaving(false) } }
  return (
    <>
      <div className="row g-2">
        <div className="col-md-7"><label className="form-label small mb-1">Name</label><input className="form-control" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></div>
        <div className="col-md-5"><label className="form-label small mb-1">Symbol</label><input className="form-control text-uppercase" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} /></div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />Save</button>
      </div>
    </>
  )
}

export default function EeHoldings({ categories, target = null, itemLabel = 'holding', tabbed = true }) {
  const { stocks, reload: reloadStocks } = useEeStocks()
  const { trades, reload: reloadTrades } = useEeTrades()
  const catKeys = categories.map((c) => c.key)
  const [tab, setTab] = useState(categories[0]?.key)
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'stock', dir: 'asc' })
  const [adding, setAdding] = useState(false)
  const [buy, setBuy] = useState(null)
  const [exit, setExit] = useState(null)
  const [editStock, setEditStock] = useState(null)
  const [del, setDel] = useState(null)

  const active = categories.find((c) => c.key === tab) || categories[0]

  const rowsByCat = useMemo(() => {
    const map = {}
    categories.forEach((c) => { map[c.key] = [] })
    stocks.filter((s) => catKeys.includes(s.category)).forEach((s) => { map[s.category].push({ s, st: stockStats(s, trades) }) })
    return map
  }, [stocks, trades, categories, catKeys])
  const allRows = categories.flatMap((c) => rowsByCat[c.key] || [])
  const isAll = tabbed && tab === 'all'
  const showCat = !tabbed || isAll // combined view → show a Category column + picker
  const rows = tabbed ? (isAll ? allRows : (rowsByCat[tab] || [])) : (catFilter ? (rowsByCat[catFilter] || []) : allRows)
  const countOf = (k) => (rowsByCat[k] || []).length
  const catMeta = (k) => categories.find((c) => c.key === k)

  const q = search.trim().toLowerCase()
  const sortVal = ({ s, st }) => {
    if (sort.key === 'stock') return (s.symbol || s.name || '').toLowerCase()
    if (sort.key === 'category') return (catMeta(s.category)?.label || s.category || '').toLowerCase()
    if (sort.key === 'ltp') return Number(s.currentPrice) || 0
    return st[sort.key] || 0
  }
  const display = [...rows]
    .filter(({ s }) => !q || (s.name || '').toLowerCase().includes(q) || (s.symbol || '').toLowerCase().includes(q))
    .sort((a, b) => { const av = sortVal(a); const bv = sortVal(b); const d = sort.dir === 'asc' ? 1 : -1; return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * d })
  const setSortKey = (k) => setSort((s) => (s.key === k && s.dir === 'asc' ? { key: k, dir: 'desc' } : { key: k, dir: 'asc' }))
  const Th = ({ label, k, className }) => (
    <th className={className} role="button" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSortKey(k)}>
      {label} <i className={'ri-arrow-' + (sort.key === k ? (sort.dir === 'asc' ? 'up' : 'down') : 'up-down') + '-line text-muted small'} />
    </th>
  )

  const catTotals = (k) => (rowsByCat[k] || []).reduce((a, { st }) => ({ invested: a.invested + st.invested, total: a.total + st.total, unrealised: a.unrealised + st.unrealised, realised: a.realised + st.realised }), { invested: 0, total: 0, unrealised: 0, realised: 0 })
  const catReturn = (k) => { const { invested, unrealised } = catTotals(k); return invested ? (unrealised / invested) * 100 : 0 }
  const totInvested = categories.reduce((s, c) => s + catTotals(c.key).invested, 0)
  const totValue = categories.reduce((s, c) => s + catTotals(c.key).total, 0)
  const totRealised = categories.reduce((s, c) => s + catTotals(c.key).realised, 0)
  const totUnrealised = categories.reduce((s, c) => s + catTotals(c.key).unrealised, 0)
  const overallPct = totInvested ? (totUnrealised / totInvested) * 100 : 0

  const saveAdd = async (f) => {
    const id = 'ees-' + rid()
    const category = showCat ? (f.category || categories[0].key) : tab
    await addEeStock({ id, category, name: f.name, symbol: f.symbol, currentPrice: f.currentPrice || f.price, sortOrder: stocks.length })
    await addEeTrade({ id: 'eet-' + rid(), stockId: id, kind: 'buy', qty: f.qty, price: f.price, date: f.date })
    await reloadStocks(); await reloadTrades(); setAdding(false)
  }
  const saveTrade = (setter) => async (t) => { await addEeTrade(t); await reloadTrades(); setter(null) }
  const saveEdit = async (f) => { await editEeStock(f); await reloadStocks(); setEditStock(null) }
  const setLtp = (s, val) => { const v = val === '' ? '' : Number(val); if (String(s.currentPrice ?? '') !== String(v)) editEeStock({ ...s, currentPrice: v }).catch(console.error) }
  const confirmDelete = async () => {
    const s = del; setDel(null)
    for (const t of trades.filter((x) => x.stockId === s.id)) await removeEeTrade(t.id) // eslint-disable-line no-await-in-loop
    await removeEeStock(s.id); await reloadStocks(); await reloadTrades()
  }
  const countLabel = (k) => (target ? `${countOf(k)}/${target}` : countOf(k))

  return (
    <>
      {/* Portfolio totals + per-category returns */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">Total invested</span><div className="stat-icon bg-info-subtle text-info"><i className="ri-wallet-3-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{money(Math.round(totInvested), 'INR')}</h4>
        </div></div></div>
        <div className="col-6 col-lg"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">Current value</span><div className="stat-icon bg-primary-subtle text-primary"><i className="ri-funds-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0">{money(Math.round(totValue), 'INR')} <span className={'fs-6 ' + (overallPct >= 0 ? 'text-success' : 'text-danger')}>({overallPct >= 0 ? '+' : ''}{overallPct.toFixed(1)}%)</span></h4>
        </div></div></div>
        <div className="col-6 col-lg"><div className="card stat-card h-100 mb-0"><div className="card-body">
          <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">Booked profit</span><div className={`stat-icon bg-${totRealised >= 0 ? 'success' : 'danger'}-subtle text-${totRealised >= 0 ? 'success' : 'danger'}`}><i className="ri-safe-2-line" /></div></div>
          <h4 className="stat-value mt-3 mb-0"><PnL v={totRealised} /></h4>
          <span className="text-muted small">realised from exits</span>
        </div></div></div>
        {categories.map((c) => {
          const r = catReturn(c.key); const { unrealised } = catTotals(c.key)
          return (
            <div className="col-6 col-lg" key={c.key}><div className="card stat-card h-100 mb-0"><div className="card-body">
              <div className="d-flex align-items-center"><span className="stat-label flex-grow-1">{c.label} return</span><div className={`stat-icon bg-${c.tone}-subtle text-${c.tone}`}><i className={c.icon} /></div></div>
              <h4 className={'stat-value mt-3 mb-0 ' + (r >= 0 ? 'text-success' : 'text-danger')}>{r >= 0 ? '+' : ''}{r.toFixed(1)}%</h4>
              <span className="text-muted small">unreal. {unrealised >= 0 ? '+' : ''}{money(Math.round(unrealised), 'INR')}</span>
            </div></div></div>
          )
        })}
      </div>

      {tabbed && (
        <ul className="nav nav-tabs nav-tabs-custom mb-3">
          <li className="nav-item">
            <button className={'nav-link ' + (tab === 'all' ? 'active' : '')} onClick={() => setTab('all')}>
              <i className="ri-apps-2-line me-1" />All <span className="badge bg-light text-muted ms-1">{allRows.length}</span>
            </button>
          </li>
          {categories.map((c) => (
            <li className="nav-item" key={c.key}>
              <button className={'nav-link ' + (tab === c.key ? 'active' : '')} onClick={() => setTab(c.key)}>
                <i className={c.icon + ' me-1'} />{c.label} <span className="badge bg-light text-muted ms-1">{countLabel(c.key)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="card mb-0">
        <div className="card-header d-flex align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 flex-grow-1">
            {tabbed && !isAll
              ? <><i className={active.icon + ' me-1'} />{active.label} <span className="text-muted fs-13 fw-normal">({countLabel(tab)})</span></>
              : <>{isAll ? 'All' : 'Holdings'} <span className="text-muted fs-13 fw-normal">({rows.length})</span></>}
          </h5>
          {!tabbed && (
            <select className="form-select form-select-sm" style={{ maxWidth: 150 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label} ({countOf(c.key)})</option>)}
            </select>
          )}
          <div className="input-group input-group-sm" style={{ maxWidth: 220 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Search name or symbol…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add {itemLabel}</button>
        </div>
        <div className="card-body p-0">
          {rows.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No {tabbed && !isAll ? active.label.toLowerCase() + ' ' : ''}{itemLabel}s yet. Add your first one.</p>
          ) : display.length === 0 ? (
            <p className="text-muted text-center py-5 mb-0">No {itemLabel}s match “{search}”.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr><Th label="Name" k="stock" />{showCat && <Th label="Category" k="category" />}<Th label="Avg price" k="avgPrice" className="text-end" /><Th label="Qty" k="quantity" className="text-end" /><Th label="LTP" k="ltp" className="text-end" /><Th label="Invested" k="invested" className="text-end" /><Th label="Total" k="total" className="text-end" /><Th label="Unrealised" k="unrealised" className="text-end" /><Th label="Booked" k="realised" className="text-end" /><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {display.map(({ s, st }) => (
                    <tr key={s.id}>
                      <td><div className="fw-medium">{s.symbol || s.name}</div>{s.symbol && s.name && <div className="text-muted small">{s.name}</div>}</td>
                      {showCat && <td>{(() => { const m = catMeta(s.category); return m ? <span className={`badge bg-${m.tone}-subtle text-${m.tone}`}>{m.label}</span> : <span className="text-muted">{s.category}</span> })()}</td>}
                      <td className="text-end">{st.avgPrice ? money(st.avgPrice, 'INR') : '—'}</td>
                      <td className="text-end">{st.quantity || '—'}</td>
                      <td className="text-end"><input type="number" defaultValue={s.currentPrice} key={s.id + ':' + s.currentPrice} className="form-control form-control-sm text-end p-1" style={{ width: 90, display: 'inline-block' }} onBlur={(e) => setLtp(s, e.target.value)} title="Current price" /></td>
                      <td className="text-end">{st.invested ? money(Math.round(st.invested), 'INR') : '—'}</td>
                      <td className="text-end">{st.total ? money(Math.round(st.total), 'INR') : '—'}</td>
                      <td className="text-end">
                        {st.quantity > 0 && st.ltp
                          ? <><PnL v={st.unrealised} /><div className={'small ' + (st.unrealised >= 0 ? 'text-success' : 'text-danger')}>{st.invested ? `${st.unrealised >= 0 ? '+' : ''}${((st.unrealised / st.invested) * 100).toFixed(1)}%` : ''}</div></>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-end">{st.realised ? <PnL v={st.realised} /> : <span className="text-muted">—</span>}</td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-soft-success px-2 me-1" title="Add / average" onClick={() => setBuy(s)}><i className="ri-add-line" /></button>
                        {st.quantity > 0 && <button className="btn btn-sm btn-soft-danger px-2 me-1" title="Exit" onClick={() => setExit({ s, holding: st.quantity })}><i className="ri-logout-box-r-line" /></button>}
                        <button className="btn btn-sm btn-ghost-secondary px-2" title="Edit" onClick={() => setEditStock(s)}><i className="ri-pencil-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger px-2" title="Delete" onClick={() => setDel(s)}><i className="ri-delete-bin-line" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={adding} title={<><i className="ri-add-line me-2 text-primary" />Add {tabbed && !isAll ? `${active.label} ` : ''}{itemLabel}</>} onClose={() => setAdding(false)}>
        {adding && <AddForm itemLabel={itemLabel} categories={showCat ? categories : null} defaultCategory={showCat ? (catFilter || categories[0].key) : tab} onSave={saveAdd} onCancel={() => setAdding(false)} />}
      </Modal>
      <Modal open={Boolean(buy)} title={<><i className="ri-add-line me-2 text-success" />Add quantity</>} onClose={() => setBuy(null)}>
        {buy && <BuyForm stock={buy} onSave={saveTrade(setBuy)} onCancel={() => setBuy(null)} />}
      </Modal>
      <Modal open={Boolean(exit)} title={<><i className="ri-logout-box-r-line me-2 text-danger" />Exit</>} onClose={() => setExit(null)}>
        {exit && <ExitForm stock={exit.s} holding={exit.holding} onSave={saveTrade(setExit)} onCancel={() => setExit(null)} />}
      </Modal>
      <Modal open={Boolean(editStock)} title={<><i className="ri-pencil-line me-2 text-primary" />Edit {itemLabel}</>} onClose={() => setEditStock(null)}>
        {editStock && <EditForm stock={editStock} onSave={saveEdit} onCancel={() => setEditStock(null)} />}
      </Modal>
      <ConfirmDialog open={Boolean(del)} title={`Delete ${itemLabel}?`} message={del ? `"${del.symbol || del.name}" and its trades will be removed.` : ''} confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)} />
    </>
  )
}
