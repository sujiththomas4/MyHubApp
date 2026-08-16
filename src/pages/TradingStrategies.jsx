import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useStrategies, addStrategy, editStrategy, removeStrategy } from '@/data/strategiesRepo'

/**
 * TradingStrategies.jsx — the strategy playbook (route /business/strategies).
 * Each strategy defines its OWN columns (text or dropdown) and shows a table of
 * columns + values. Dropdown columns let you add new option values inline.
 * (Stock Strength moved to Stock Market Investments → /investments/stock-strength.)
 * Backend-only.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

// --- A single value cell (text input or dropdown) ---------------------------
function ValueCell({ column, value, onCommit }) {
  const [addOpt, setAddOpt] = useState(false)
  const [newOpt, setNewOpt] = useState('')

  if (column.type === 'select') {
    if (addOpt) {
      const confirmAdd = () => { const v = newOpt.trim(); if (v) onCommit(v, true); setAddOpt(false); setNewOpt('') }
      return (
        <div className="input-group input-group-sm" style={{ minWidth: 150 }}>
          <input className="form-control" autoFocus placeholder="New option" value={newOpt}
            onChange={(e) => setNewOpt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAddOpt(false); setNewOpt('') } }} />
          <button className="btn btn-primary" title="Add" onClick={confirmAdd}><i className="ri-check-line" /></button>
          <button className="btn btn-light" title="Cancel" onClick={() => { setAddOpt(false); setNewOpt('') }}><i className="ri-close-line" /></button>
        </div>
      )
    }
    return (
      <select className="form-select form-select-sm" value={value || ''} style={{ minWidth: 130 }}
        onChange={(e) => { if (e.target.value === '__add__') setAddOpt(true); else onCommit(e.target.value, false) }}>
        <option value="">—</option>
        {column.options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__add__">＋ Add option…</option>
      </select>
    )
  }
  return (
    <input className="form-control form-control-sm" defaultValue={value || ''} key={value || ''} placeholder="—" style={{ minWidth: 130 }}
      onBlur={(e) => { if (e.target.value !== (value || '')) onCommit(e.target.value, false) }} />
  )
}

// --- Add / edit a column ----------------------------------------------------
function ColumnModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const setOpt = (i, v) => setF((s) => ({ ...s, options: s.options.map((o, j) => (j === i ? v : o)) }))
  const addOpt = () => setF((s) => ({ ...s, options: [...s.options, ''] }))
  const rmOpt = (i) => setF((s) => ({ ...s, options: s.options.filter((_, j) => j !== i) }))

  const save = () => {
    if (!f.name.trim()) { setErr('Column name is required.'); return }
    onSave({ ...f, name: f.name.trim(), options: f.options.map((o) => o.trim()).filter(Boolean) })
  }

  return (
    <Modal open title={f.isNew ? 'Add column' : 'Edit column'} onClose={onClose}>
      <div className="row g-2">
        <div className="col-md-7">
          <label className="form-label small mb-1">Column name</label>
          <input className="form-control" placeholder="e.g. Entry condition, Timeframe" value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </div>
        <div className="col-md-5">
          <label className="form-label small mb-1">Type</label>
          <select className="form-select" value={f.type} onChange={(e) => set('type', e.target.value)}>
            <option value="text">Free text</option>
            <option value="select">Dropdown</option>
          </select>
        </div>
        {f.type === 'select' && (
          <div className="col-12">
            <div className="d-flex align-items-center mb-1">
              <label className="form-label small mb-0 flex-grow-1">Options</label>
              <button type="button" className="btn btn-sm btn-soft-primary py-0" onClick={addOpt}><i className="ri-add-line me-1" />Add option</button>
            </div>
            {f.options.length === 0 && <div className="text-muted small fst-italic mb-1">No options yet. You can also add more later while filling values.</div>}
            <div className="d-flex flex-column gap-1">
              {f.options.map((o, i) => (
                <div className="input-group input-group-sm" key={i}>
                  <input className="form-control" placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
                  <button className="btn btn-ghost-danger" title="Remove" onClick={() => rmOpt(i)}><i className="ri-delete-bin-line" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}><i className="ri-save-3-line me-1" />Save</button>
      </div>
    </Modal>
  )
}

// --- One strategy: a header row + its columns/values table ------------------
function StrategyRow({ strategy, persist, onRename, onDelete }) {
  const [colModal, setColModal] = useState(null)   // { isNew, id, name, type, options }
  const [delCol, setDelCol] = useState(null)
  const cols = strategy.columns || []

  const commitValue = async (column, value, isNewOption) => {
    const columns = isNewOption
      ? cols.map((c) => (c.id === column.id ? { ...c, options: [...new Set([...(c.options || []), value])] } : c))
      : cols
    await persist({ ...strategy, columns, values: { ...strategy.values, [column.id]: value } })
  }
  const saveColumn = async (col) => {
    const exists = cols.some((c) => c.id === col.id)
    const columns = exists ? cols.map((c) => (c.id === col.id ? col : c)) : [...cols, col]
    setColModal(null)
    await persist({ ...strategy, columns })
  }
  const removeColumn = async (col) => {
    setDelCol(null)
    const values = { ...strategy.values }; delete values[col.id]
    await persist({ ...strategy, columns: cols.filter((c) => c.id !== col.id), values })
  }
  const toggleStar = async (col) => {
    await persist({ ...strategy, columns: cols.map((c) => (c.id === col.id ? { ...c, star: !c.star } : c)) })
  }

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center gap-2">
        <h5 className="card-title mb-0 flex-grow-1"><i className="ri-bookmark-3-line me-2 text-primary" />{strategy.name}</h5>
        <button className="btn btn-sm btn-soft-primary" onClick={() => setColModal({ isNew: true, id: 'col-' + rid(), name: '', type: 'text', options: [] })}><i className="ri-add-line me-1" />Add column</button>
        <button className="btn btn-sm btn-ghost-secondary px-2" title="Rename strategy" onClick={() => onRename(strategy)}><i className="ri-pencil-line" /></button>
        <button className="btn btn-sm btn-ghost-danger px-2" title="Delete strategy" onClick={() => onDelete(strategy)}><i className="ri-delete-bin-line" /></button>
      </div>
      <div className="card-body p-0">
        {cols.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">No columns yet. Add columns to describe this strategy.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <tbody>
                {[...cols].sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0)).map((c) => (
                  <tr key={c.id} className={c.star ? 'table-warning' : ''}>
                    <th className={c.star ? '' : 'table-light'} style={{ width: '35%', whiteSpace: 'nowrap' }}>
                      <div className="d-flex align-items-center gap-1">
                        <button className={'btn btn-sm p-0 px-1 ' + (c.star ? 'text-warning' : 'btn-ghost-secondary')} title={c.star ? 'Unstar column' : 'Mark as star'} onClick={() => toggleStar(c)}>
                          <i className={c.star ? 'ri-star-fill' : 'ri-star-line'} />
                        </button>
                        <span className="flex-grow-1">{c.name}</span>
                        {c.type === 'select' && <i className="ri-arrow-down-s-line text-muted" title="Dropdown" />}
                        <button className="btn btn-sm btn-ghost-secondary p-0 px-1" title="Edit column" onClick={() => setColModal({ ...c, isNew: false })}><i className="ri-pencil-line" /></button>
                        <button className="btn btn-sm btn-ghost-danger p-0 px-1" title="Delete column" onClick={() => setDelCol(c)}><i className="ri-close-line" /></button>
                      </div>
                    </th>
                    <td>
                      <ValueCell column={c} value={strategy.values?.[c.id]} onCommit={(v, isNew) => commitValue(c, v, isNew)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {colModal && <ColumnModal initial={colModal} onSave={saveColumn} onClose={() => setColModal(null)} />}
      <ConfirmDialog
        open={Boolean(delCol)} title="Delete column?"
        message={delCol ? `Column "${delCol.name}" and its value will be removed from this strategy.` : ''}
        confirmLabel="Delete" onConfirm={() => removeColumn(delCol)} onCancel={() => setDelCol(null)}
      />
    </div>
  )
}

// --- Strategies tab ---------------------------------------------------------
function StrategiesTab() {
  const { strategies, reload } = useStrategies()
  const [nameModal, setNameModal] = useState(null)  // { id?, name }
  const [confirm, setConfirm] = useState(null)

  const persist = async (s) => { await editStrategy(s); await reload() }

  const saveName = async () => {
    const name = (nameModal.name || '').trim()
    if (!name) return
    if (nameModal.id) await editStrategy({ ...strategies.find((s) => s.id === nameModal.id), name })
    else await addStrategy({ id: 'strat-' + rid(), name, columns: [], values: {}, sortOrder: strategies.length })
    setNameModal(null)
    await reload()
  }
  const onDelete = async () => { const t = confirm; setConfirm(null); await removeStrategy(t.id); await reload() }

  return (
    <>
      <div className="d-flex align-items-center mb-3">
        <span className="text-muted small flex-grow-1">{strategies.length} strateg{strategies.length === 1 ? 'y' : 'ies'}</span>
        <button className="btn btn-primary btn-sm" onClick={() => setNameModal({ name: '' })}><i className="ri-add-line me-1" />Add strategy</button>
      </div>

      {strategies.length === 0 ? (
        <div className="card"><div className="card-body text-center text-muted py-5">
          No strategies yet. Add one, then define its columns. 📈
        </div></div>
      ) : (
        strategies.map((s) => (
          <StrategyRow key={s.id} strategy={s} persist={persist}
            onRename={(x) => setNameModal({ id: x.id, name: x.name })} onDelete={setConfirm} />
        ))
      )}

      <Modal open={Boolean(nameModal)} title={nameModal?.id ? 'Rename strategy' : 'New strategy'} onClose={() => setNameModal(null)}>
        {nameModal && (
          <>
            <label className="form-label small mb-1">Strategy name</label>
            <input className="form-control" placeholder="e.g. Weekly straddle, Gap-up momentum" value={nameModal.name} autoFocus
              onChange={(e) => setNameModal((m) => ({ ...m, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName() }} />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-light" onClick={() => setNameModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveName}><i className="ri-save-3-line me-1" />Save</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)} title="Delete strategy?"
        message={confirm ? `"${confirm.name}" and all its columns will be permanently removed.` : ''}
        confirmLabel="Delete" onConfirm={onDelete} onCancel={() => setConfirm(null)}
      />
    </>
  )
}

// --- Page -------------------------------------------------------------------
export default function TradingStrategies() {
  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">Strategies</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Business</li>
            <li className="breadcrumb-item active" aria-current="page">Strategies</li>
          </ol>
        </nav>
      </div>

      <StrategiesTab />
    </div>
  )
}
