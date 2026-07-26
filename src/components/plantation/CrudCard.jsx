import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/plantation/Field'

/**
 * CrudCard — a table card with an "Add" button that opens a popup form, plus
 * per-row edit (same popup) and delete (confirm). Add / update never happen
 * inline — always in the modal.
 *
 * Props:
 *   title, addLabel, modalTitle, emptyText
 *   rows      — array of records (each with an `id`)
 *   columns   — [{ header, className?, cell:(row)=>node }]
 *   fields    — [{ key, label, type, ... }] (see Field below)
 *   makeBlank — () => blank form object (inject parent ids / defaults here)
 *   onSave    — async (form) => void  (decide add vs edit via form.id)
 *   onDelete  — async (id) => void
 */
export default function CrudCard({ title, addLabel = 'Add', modalTitle, modalSize, emptyText = 'Nothing yet.', rows, columns, fields, makeBlank, onSave, onDelete, openTo, openLabel = 'Open', rowExtra }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }))
  const openAdd = () => { setForm(makeBlank()); setErr(null); setOpen(true) }
  const openEdit = (row) => { setForm({ ...row }); setErr(null); setOpen(true) }
  const close = () => { setOpen(false); setForm(null) }
  const editing = Boolean(form && form.id)

  const save = async () => {
    const missing = fields.find((f) => f.required && !String(form[f.key] ?? '').trim())
    if (missing) { setErr(`${missing.label} is required.`); return }
    setErr(null); setSaving(true)
    try { await onSave(form); close() }
    catch (e) { setErr(e.message || 'Could not save.') }
    finally { setSaving(false) }
  }

  const visibleFields = form ? fields.filter((f) => !f.showIf || f.showIf(form)) : []

  return (
    <div className="card mb-0">
      <div className="card-header d-flex align-items-center">
        <h5 className="card-title mb-0 flex-grow-1">{title}</h5>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />{addLabel}</button>
      </div>
      <div className="card-body p-0">
        {rows.length === 0 ? (
          <p className="text-muted text-center py-4 mb-0">{emptyText}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>{columns.map((c, i) => <th key={i} className={c.className}>{c.header}</th>)}<th className="text-end">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c, i) => <td key={i} className={c.className}>{c.cell(row)}</td>)}
                    <td className="text-end text-nowrap">
                      {rowExtra && rowExtra(row)}
                      {openTo && <Link to={openTo(row)} className="btn btn-sm btn-soft-primary px-2 me-1" title={openLabel}>{openLabel}<i className="ri-arrow-right-line ms-1" /></Link>}
                      <button className="btn btn-sm btn-ghost-secondary px-2" onClick={() => openEdit(row)} title="Edit"><i className="ri-pencil-line" /></button>
                      <button className="btn btn-sm btn-ghost-danger px-2" onClick={() => setConfirm(row)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} size={modalSize} title={(editing ? 'Edit ' : 'New ') + (modalTitle || title)} onClose={close}>
        {form && (
          <>
            <div className="row g-2">
              {visibleFields.map((f) => (
                <div key={f.key} className={f.colClass || 'col-12'}>
                  <label className="form-label small mb-1">{f.label}</label>
                  <Field field={f} form={form} set={set} />
                </div>
              ))}
            </div>
            {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-light" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                <i className="ri-save-3-line me-1" />{saving ? 'Saving…' : editing ? 'Update' : 'Save'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)} title="Delete?" message="This cannot be undone." confirmLabel="Delete"
        onConfirm={async () => { const t = confirm; setConfirm(null); await onDelete(t.id) }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
