import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { stockMarketAccounts, stockMarketHoldings, stockSum, money } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * StockAccount.jsx
 * -----------------------------------------------------------------------------
 * One stock-market account (route /investments/:slug). Shows its holdings
 * (line items) with add / edit / delete. Amounts are in the account's own
 * currency. Local state (seeded from AppData).
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const rid = () => Math.random().toString(36).slice(2, 8)

function HoldingForm({ initial, currency, onSave, onCancel }) {
  const [f, setF] = useState({
    name: initial?.name || '',
    qty: initial?.qty ?? '',
    invested: initial?.invested ?? '',
    currentValue: initial?.currentValue ?? '',
    note: initial?.note || '',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const num = (v) => Math.round(parseFloat(v) || 0)
  const pnl = num(f.currentValue) - num(f.invested)
  const save = () => onSave({
    id: initial?.id || 'sh-' + rid(),
    name: f.name.trim() || 'Untitled',
    qty: parseInt(f.qty) || 0,
    invested: num(f.invested),
    currentValue: num(f.currentValue),
    note: f.note.trim(),
  })

  return (
    <>
      <div className="row g-2">
        <div className="col-md-5">
          <label className="form-label small mb-1">Stock / instrument</label>
          <input className="form-control form-control-sm" placeholder="e.g. Infosys" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Qty</label>
          <input type="number" className="form-control form-control-sm" value={f.qty} onChange={(e) => set('qty', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Invested ({currency})</label>
          <input type="number" className="form-control form-control-sm" value={f.invested} onChange={(e) => set('invested', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Current value ({currency})</label>
          <input type="number" className="form-control form-control-sm" value={f.currentValue} onChange={(e) => set('currentValue', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">P&amp;L</label>
          <div className={'form-control form-control-sm bg-light ' + pnlClass(pnl)}>{money(pnl, currency)}</div>
        </div>
        <div className="col-md-9">
          <label className="form-label small mb-1">Note</label>
          <input className="form-control form-control-sm" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}><i className="ri-save-line me-1" />{initial ? 'Save changes' : 'Add holding'}</button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

export default function StockAccount() {
  const { slug } = useParams()
  const account = useMemo(() => stockMarketAccounts.find((a) => a.slug === slug), [slug])

  const [items, setItems] = useState([])
  const [adding, setAdding] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)

  useEffect(() => {
    setAdding(false); setEditRow(null); setDeleteRow(null)
    setItems(account ? stockMarketHoldings.filter((h) => h.accountId === account.id) : [])
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!account) {
    return (
      <>
        <div className="page-title-box"><h4 className="mb-0">Account not found</h4></div>
        <div className="card"><div className="card-body">
          <p className="mb-3">No stock account matches “{slug}”.</p>
          <Link to="/investments/pnl" className="btn btn-primary btn-sm"><i className="ri-arrow-left-line me-1" />Back to P&amp;L</Link>
        </div></div>
      </>
    )
  }

  const cur = account.currency
  const s = stockSum(items)
  const rows = [...items].sort((a, b) => (b.currentValue - b.invested) - (a.currentValue - a.invested))

  const addItem = (x) => { setItems((xs) => [...xs, { ...x, accountId: account.id }]); setAdding(false) }
  const updateItem = (x) => { setItems((xs) => xs.map((i) => (i.id === x.id ? { ...i, ...x } : i))); setEditRow(null) }
  const confirmDelete = () => { setItems((xs) => xs.filter((i) => i.id !== deleteRow.id)); setDeleteRow(null) }

  return (
    <div className="stock-market">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0"><i className={account.icon + ' me-2 text-muted'} />{account.StockmarketAccountName}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item"><Link to="/investments/pnl">Stock Market</Link></li>
            <li className="breadcrumb-item">{account.region}</li>
            <li className="breadcrumb-item active" aria-current="page">{account.StockmarketAccountName}</li>
          </ol>
        </nav>
      </div>

      {/* Tiles */}
      <div className="row">
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Invested</span>
          <h4 className="stat-value mt-2 mb-0">{money(s.invested, cur)}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Current value</span>
          <h4 className="stat-value mt-2 mb-0">{money(s.value, cur)}</h4>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">P&amp;L</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(s.pnl)}>{money(s.pnl, cur)}</h4>
          <span className={'small ' + pnlClass(s.pnl)}>{s.pnlPct.toFixed(1)}%</span>
        </div></div></div>
        <div className="col-md-3 col-6"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Holdings</span>
          <h4 className="stat-value mt-2 mb-0">{s.count}</h4>
          <span className="text-muted small">{account.region} · {cur}</span>
        </div></div></div>
      </div>

      {/* Holdings */}
      <div className="card">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Holdings</h5>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add holding</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Stock</th><th className="text-center">Qty</th>
                  <th className="text-end">Invested</th><th className="text-end">Value</th>
                  <th className="text-end">P&amp;L</th><th>Note</th><th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-4">No holdings yet.</td></tr>
                ) : rows.map((x) => {
                  const pnl = x.currentValue - x.invested
                  return (
                    <tr key={x.id}>
                      <td className="fw-medium">{x.name}</td>
                      <td className="text-center">{x.qty}</td>
                      <td className="text-end">{money(x.invested, cur)}</td>
                      <td className="text-end">{money(x.currentValue, cur)}</td>
                      <td className={'text-end fw-semibold ' + pnlClass(pnl)}>
                        {money(pnl, cur)} <span className="small">({x.invested ? ((pnl / x.invested) * 100).toFixed(1) : 0}%)</span>
                      </td>
                      <td className="text-muted small">{x.note}</td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit" onClick={() => setEditRow(x)}><i className="ri-pencil-line" /></button>
                          <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDeleteRow(x)}><i className="ri-delete-bin-line" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td colSpan={2}>Total</td>
                  <td className="text-end">{money(s.invested, cur)}</td>
                  <td className="text-end">{money(s.value, cur)}</td>
                  <td className={'text-end ' + pnlClass(s.pnl)}>{money(s.pnl, cur)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={adding || Boolean(editRow)}
        size="lg"
        title={editRow
          ? <><i className="ri-pencil-line me-2 text-primary" />Edit holding — {account.StockmarketAccountName}</>
          : <><i className="ri-add-line me-2 text-primary" />New holding — {account.StockmarketAccountName}</>}
        onClose={() => { setAdding(false); setEditRow(null) }}
      >
        <HoldingForm
          key={editRow?.id || 'new'}
          initial={editRow}
          currency={cur}
          onSave={editRow ? updateItem : addItem}
          onCancel={() => { setAdding(false); setEditRow(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete holding?"
        message={deleteRow ? `“${deleteRow.name}” will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  )
}
