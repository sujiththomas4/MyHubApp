import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * SearchSelect — a dropdown with a search box that filters across the options.
 * The panel is portaled to <body> with fixed positioning so it never gets
 * clipped inside a scrolling modal. Set `allowCustom` to let the user keep a
 * typed value that isn't in the list (e.g. a non-user's name).
 */
export default function SearchSelect({ value, onChange, options = [], placeholder = 'Select…', allowCustom = false }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const openIt = () => {
    const r = triggerRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + 4, left: r.left, width: r.width })
    setQ(''); setOpen(true)
  }
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      close()
    }
    const reposition = () => close() // simplest: close on scroll/resize to avoid stale position
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  // Options may be plain strings or { value, label } objects.
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const trimmed = q.trim()
  const filtered = opts.filter((o) => (o.label || '').toLowerCase().includes(trimmed.toLowerCase()))
  const selected = opts.find((o) => o.value === value)
  const display = selected ? selected.label : value
  const showCustom = allowCustom && trimmed && !opts.some((o) => (o.label || '').toLowerCase() === trimmed.toLowerCase())
  const pick = (v) => { onChange(v); close() }

  return (
    <>
      <button type="button" ref={triggerRef} className="form-select text-start d-flex align-items-center"
        onClick={() => (open ? close() : openIt())}>
        <span className={'flex-grow-1 text-truncate ' + (value ? '' : 'text-muted')}>{display || placeholder}</span>
      </button>
      {open && rect && createPortal(
        <div ref={panelRef} className="card shadow" style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 2000, maxHeight: 300, overflow: 'hidden' }}>
          <div className="p-2 border-bottom">
            <input autoFocus className="form-control form-control-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div style={{ maxHeight: 230, overflowY: 'auto' }} className="py-1">
            {value && <button type="button" className="ss-item text-muted small" onClick={() => pick('')}><i className="ri-close-line me-1" />Clear</button>}
            {filtered.map((o) => (
              <button type="button" key={o.value} className={'ss-item text-truncate' + (o.value === value ? ' active' : '')} onClick={() => pick(o.value)}>{o.label}</button>
            ))}
            {filtered.length === 0 && !showCustom && <div className="px-3 py-2 text-muted small">No matches</div>}
            {showCustom && <button type="button" className="ss-item" onClick={() => pick(trimmed)}><i className="ri-add-line me-1" />Use “{trimmed}”</button>}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
