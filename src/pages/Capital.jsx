import { useMemo, useState } from 'react'
import { brokers as brokerSeed, compoundedReturn, money } from '@/data/AppData'
import { useCapital } from '@/context/CapitalContext'
import { useBrokerAccounts, useBrokerTrades } from '@/data/brokerRepo'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * Capital.jsx
 * -----------------------------------------------------------------------------
 * Capital per ACCOUNT — a (broker, holder) pair. The same broker can appear
 * twice under different holders, each with its own capital, so this is the one
 * place to add accounts and set their capital. It's shared across every activity
 * (Option Buying / Selling / Intraday); the P&L comes from broker_trades.
 */
const pnlClass = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted')
const netOf = (t) => t.grossPnl - t.brokerage - t.govtCharges
const key = (slug, holder = '') => (holder ? `${slug}|${holder}` : slug)

// Broker options for the "add account" picker — distinct slugs from the seed.
const BROKER_OPTIONS = brokerSeed.map((b) => ({ slug: b.slug, name: b.name, icon: b.icon, currency: b.currency }))

function AccountForm({ initial, onSave, onCancel }) {
  const editing = Boolean(initial)
  const [slug, setSlug] = useState(initial?.slug || BROKER_OPTIONS[0]?.slug || '')
  const [holder, setHolder] = useState(initial?.holder || '')
  const [capital, setCapital] = useState(initial ? String(initial.capital) : '')

  const save = () => {
    const b = BROKER_OPTIONS.find((x) => x.slug === slug)
    onSave({
      slug,
      holder: holder.trim(),
      name: b?.name || initial?.name || slug,
      icon: b?.icon || initial?.icon,
      currency: b?.currency || initial?.currency || 'INR',
      capital,
    })
  }

  return (
    <>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label small mb-1">Broker</label>
          {/* Broker defines the account — lock it while editing so the row
              keeps its identity; change holder/capital instead. */}
          <select className="form-select form-select-sm" value={slug} disabled={editing} onChange={(e) => setSlug(e.target.value)}>
            {BROKER_OPTIONS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Account holder</label>
          <input
            className="form-control form-control-sm"
            placeholder="e.g. Sujith / Priya"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
          />
          <div className="form-text small">Leave blank for the primary account.</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small mb-1">Capital</label>
          <div className="input-group input-group-sm">
            <span className="input-group-text">₹</span>
            <input type="number" className="form-control" placeholder="0" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary btn-sm" onClick={save}>
          <i className="ri-save-line me-1" />{editing ? 'Save changes' : 'Add account'}
        </button>
        <button className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </>
  )
}

export default function Capital() {
  const { accounts: capitalAccounts, getCapital, setCapital, upsertAccount, removeAccount, resetCapital } = useCapital()
  const brokerAccounts = useBrokerAccounts()
  const trades = useBrokerTrades()
  const [adding, setAdding] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // (slug|holder) -> its day-P&L rows. Trades sit on broker_accounts, which now
  // carry a holder, so P&L splits per holder rather than lumping a broker's
  // accounts together.
  const tradesByKey = useMemo(() => {
    const acc = new Map()               // account id -> (slug|holder)
    brokerAccounts.forEach((a) => acc.set(a.id, key(a.slug, a.holder)))
    const out = {}
    trades.forEach((t) => {
      const k = acc.get(t.accountId)
      if (!k) return                    // orphaned row: account deleted
      ;(out[k] = out[k] || []).push(t)
    })
    return out
  }, [brokerAccounts, trades])

  const rows = capitalAccounts.map((a) => {
    const capital = getCapital(a.slug, a.holder)
    const t = tradesByKey[key(a.slug, a.holder)] || []
    const net = t.reduce((s, x) => s + netOf(x), 0)
    return { ...a, capital, net, value: capital + net, returnPct: compoundedReturn(t, capital) }
  })
  const total = rows.reduce((s, b) => s + b.capital, 0)
  const totalNet = rows.reduce((s, b) => s + b.net, 0)
  const totalValue = total + totalNet
  const totalReturn = compoundedReturn(trades, total)

  const addAccount = (a) => { upsertAccount(a); setAdding(false) }

  // Renaming the holder changes the row's (slug, holder) key, so drop the old
  // row before writing the new one; a plain rename would otherwise leave a
  // duplicate behind.
  const saveEdit = (a) => {
    const changedKey = a.holder !== (editTarget.holder || '')
    if (changedKey) removeAccount(editTarget.slug, editTarget.holder)
    upsertAccount(a)
    setEditTarget(null)
  }
  const confirmDelete = () => { removeAccount(deleteTarget.slug, deleteTarget.holder); setDeleteTarget(null) }

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Capital</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Capital</li>
          </ol>
        </nav>
      </div>

      {/* Tiles */}
      <div className="row">
        <div className="col-md-4"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Total capital</span>
          <h4 className="stat-value mt-2 mb-0">{money(total, 'INR')}</h4>
          <span className="text-muted small">{rows.length} account{rows.length === 1 ? '' : 's'}</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Net P&amp;L</span>
          <h4 className={'stat-value mt-2 mb-0 ' + pnlClass(totalNet)}>{money(totalNet, 'INR')}</h4>
          <span className="text-muted small">across all activities</span>
        </div></div></div>
        <div className="col-md-4"><div className="card stat-card"><div className="card-body">
          <span className="stat-label">Current value</span>
          <h4 className="stat-value mt-2 mb-0">{money(totalValue, 'INR')}</h4>
          <span className="text-muted small">capital + P&amp;L</span>
        </div></div></div>
      </div>

      {/* Allocation table with editable capital */}
      <div className="card">
        <div className="card-header d-flex align-items-center gap-2">
          <h5 className="card-title mb-0 flex-grow-1">Allocation by account</h5>
          <button className="btn btn-soft-primary btn-sm" onClick={() => setAdding(true)}><i className="ri-add-line me-1" />Add account</button>
          <button className="btn btn-light btn-sm" onClick={resetCapital}><i className="ri-refresh-line me-1" />Reset defaults</button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Broker</th>
                  <th>Account holder</th>
                  <th style={{ width: 190 }}>Capital</th>
                  <th className="text-end">Allocation</th>
                  <th className="text-end">Net P&amp;L</th>
                  <th className="text-end">Return</th>
                  <th className="text-end">Current value</th>
                  <th style={{ width: 76 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={key(b.slug, b.holder)}>
                    <td className="fw-medium"><i className={b.icon + ' me-2 text-muted'} />{b.name}</td>
                    <td>{b.holder ? b.holder : <span className="text-muted fst-italic">Primary</span>}</td>
                    <td>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number" className="form-control" value={b.capital}
                          onChange={(e) => setCapital(b.slug, b.holder, e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="text-end text-muted">{total ? ((b.capital / total) * 100).toFixed(0) : 0}%</td>
                    <td className={'text-end fw-semibold ' + pnlClass(b.net)}>{money(b.net, b.currency)}</td>
                    <td className={'text-end ' + pnlClass(b.net)}>{b.returnPct.toFixed(2)}%</td>
                    <td className="text-end">{money(b.value, b.currency)}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit account" onClick={() => setEditTarget(b)}>
                        <i className="ri-pencil-line" />
                      </button>
                      <button className="btn btn-sm btn-ghost-danger p-1" title="Remove account" onClick={() => setDeleteTarget(b)}>
                        <i className="ri-delete-bin-line" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold border-top">
                  <td colSpan={2}>Total</td>
                  <td>{money(total, 'INR')}</td>
                  <td className="text-end">100%</td>
                  <td className={'text-end ' + pnlClass(totalNet)}>{money(totalNet, 'INR')}</td>
                  <td className={'text-end ' + pnlClass(totalNet)}>{totalReturn.toFixed(2)}%</td>
                  <td className="text-end">{money(totalValue, 'INR')}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="card-footer text-muted small">
          <i className="ri-information-line me-1" />
          Each account is a broker + holder. The same broker held under two names keeps two separate pools. Changes here flow to every business screen and the P&amp;L analytics.
        </div>
      </div>

      <Modal
        open={adding}
        size="lg"
        title={<><i className="ri-add-line me-2 text-primary" />Add capital account</>}
        onClose={() => setAdding(false)}
      >
        <AccountForm onSave={addAccount} onCancel={() => setAdding(false)} />
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        size="lg"
        title={<><i className="ri-pencil-line me-2 text-primary" />Edit account</>}
        onClose={() => setEditTarget(null)}
      >
        {editTarget && (
          <AccountForm
            key={key(editTarget.slug, editTarget.holder)}
            initial={editTarget}
            onSave={saveEdit}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this account?"
        message={deleteTarget && (
          <>Capital for <strong>{deleteTarget.name}{deleteTarget.holder ? ` · ${deleteTarget.holder}` : ''}</strong> will be removed. Its trades are not deleted, but they’ll no longer roll up to a capital pool.</>
        )}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
