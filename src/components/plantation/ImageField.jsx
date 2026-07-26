import { useState } from 'react'
import { uploadImage } from '@/lib/api'

/**
 * ImageField — pick an image, upload it to Storage, and return its public URL.
 * Used across plantation screens (lands, poles, plants, defects…). One image per
 * field for now; the value is the hosted URL (never base64 / local).
 */
export default function ImageField({ value, onChange, folder = 'plantation', size = 44 }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr(null)
    try {
      onChange(await uploadImage(file, folder))
    } catch (ex) {
      setErr(ex.message || 'Upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="d-flex align-items-center gap-2">
      {value
        ? <img src={value} alt="" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6 }} />
        : <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted" style={{ width: size, height: size }}><i className="ri-image-line" /></div>}
      <label className="btn btn-sm btn-light mb-0">
        {busy ? 'Uploading…' : (value ? 'Change' : 'Upload')}
        <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
      </label>
      {value && <button type="button" className="btn btn-sm btn-ghost-danger px-2" onClick={() => onChange('')} title="Remove"><i className="ri-close-line" /></button>}
      {err && <span className="text-danger small">{err}</span>}
    </div>
  )
}
