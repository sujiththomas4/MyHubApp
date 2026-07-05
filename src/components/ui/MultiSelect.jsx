import { useEffect, useRef, useState } from 'react'

/**
 * MultiSelect.jsx
 * -----------------------------------------------------------------------------
 * Lightweight multi-select dropdown with grouped checkbox options. Controlled
 * via `selected` (array of option strings) + `onChange`.
 *
 *   <MultiSelect label="Conditions" groups={[{label, options}]} selected={arr} onChange={fn} />
 *
 * Closes on outside click / Escape. No Bootstrap JS needed.
 */
export default function MultiSelect({ label = 'Filter', groups = [], selected = [], onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (opt) =>
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])

  return (
    <div className="ms-wrap" ref={ref}>
      <button type="button" className="btn btn-light btn-sm" onClick={() => setOpen((o) => !o)}>
        <i className="ri-filter-3-line me-1" />{label}
        {selected.length > 0 && <span className="badge bg-primary ms-1">{selected.length}</span>}
        <i className={'ms-1 ' + (open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line')} />
      </button>
      {open && (
        <div className="ms-panel">
          <div className="d-flex align-items-center mb-2">
            <span className="small text-muted flex-grow-1">{selected.length} selected</span>
            {selected.length > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" onClick={() => onChange([])}>Clear</button>
            )}
          </div>
          {groups.map((g) => (
            <div className="ms-group" key={g.label}>
              <div className="small text-muted mb-1">{g.label}</div>
              {g.options.map((opt) => (
                <label className="ms-item" key={opt}>
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
