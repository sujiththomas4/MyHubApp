import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Field from '@/components/plantation/Field'

/**
 * EntityModal — a popup add/edit form driven by a field descriptor list.
 * `initial` seeds the form (with an `id` for edit, without for add). `onSave`
 * receives the completed form; it decides add vs edit.
 */
export default function EntityModal({ open, title, fields, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || {})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => { setForm(initial || {}); setErr(null) }, [initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const editing = Boolean(form && form.id)
  const visible = (fields || []).filter((f) => !f.showIf || f.showIf(form))

  const save = async () => {
    const missing = (fields || []).find((f) => f.required && !String(form[f.key] ?? '').trim())
    if (missing) { setErr(`${missing.label} is required.`); return }
    setErr(null); setSaving(true)
    try { await onSave(form); onClose() }
    catch (e) { setErr(e.message || 'Could not save.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="row g-2">
        {visible.map((f) => (
          <div key={f.key} className={f.colClass || 'col-12'}>
            <label className="form-label small mb-1">{f.label}</label>
            <Field field={f} form={form} set={set} />
          </div>
        ))}
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <i className="ri-save-3-line me-1" />{saving ? 'Saving…' : editing ? 'Update' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
