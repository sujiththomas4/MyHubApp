import { useState } from 'react'
import { uploadImage } from '@/lib/api'

/**
 * PasteImage — a screenshot field you can paste into (Ctrl/⌘+V) or pick a file.
 * Uploads to Storage and returns the hosted URL (never base64).
 */
export default function PasteImage({ value, onChange, folder = 'trades', label = 'screenshot' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const upload = async (file) => {
    setBusy(true); setErr(null)
    try { onChange(await uploadImage(file, folder)) }
    catch (e) { setErr(e.message || 'Upload failed') }
    finally { setBusy(false) }
  }
  const onPaste = (e) => {
    const items = e.clipboardData?.items || []
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) { e.preventDefault(); upload(f); return }
      }
    }
  }
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }

  if (value) {
    return (
      <div className="position-relative d-inline-block">
        <a href={value} target="_blank" rel="noreferrer"><img src={value} alt="" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8, border: '1px solid var(--bs-border-color)' }} /></a>
        <button type="button" className="btn btn-sm btn-danger position-absolute" style={{ top: 6, right: 6 }} title="Remove" onClick={() => onChange('')}><i className="ri-close-line" /></button>
      </div>
    )
  }
  return (
    <div>
      <div tabIndex={0} onPaste={onPaste} className="rounded d-flex flex-column align-items-center justify-content-center text-muted"
        style={{ minHeight: 120, border: '2px dashed var(--bs-border-color)', cursor: 'text', outline: 'none' }}>
        <i className="ri-clipboard-line fs-3 mb-1" />
        <div className="small">{busy ? 'Uploading…' : `Click here and paste (Ctrl/⌘+V) your ${label}`}</div>
        <label className="btn btn-sm btn-light mt-2 mb-0">or choose file<input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} /></label>
      </div>
      {err && <div className="text-danger small mt-1">{err}</div>}
    </div>
  )
}
