import { useEffect, useMemo, useRef, useState } from 'react'
import { LEVELS, ORDER, computeVisible, emptyHierarchyFilter, hierarchyFilterActive } from '@/components/plantation/hierarchyScope'

/**
 * HierarchyFilter — a cascading Property → Zone → Row → Pole → Plant scope bar.
 * Each level is a multi-select with an "All" option; child options are limited to
 * the parents currently chosen. Changing a level resets the deeper levels to All.
 *
 *   value: { land:Set, zone:Set, vertical:Set, pole:Set, plant:Set }
 *   onChange(nextValue)
 *
 * Scope math lives in ./hierarchyScope (computeVisible).
 */
export function MultiSelect({ icon, label, options, selected, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const count = selected.size
  const summary = count === 0 ? 'All' : `${count} selected`
  const toggle = (v) => { const n = new Set(selected); n.has(v) ? n.delete(v) : n.add(v); onChange(n) }
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options

  return (
    <div className="position-relative" ref={ref}>
      <button type="button" className={'btn btn-sm border d-flex align-items-center gap-1 ' + (count ? 'btn-soft-primary' : 'btn-light')} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        {icon && <i className={icon} />}<span className={count ? '' : 'text-muted'}>{label}:</span> <span className="fw-medium">{summary}</span> <i className="ri-arrow-down-s-line" />
      </button>
      {open && (
        <div className="dropdown-menu show p-0 mt-1" style={{ minWidth: 240 }}>
          {options.length > 8 && (
            <div className="p-2 border-bottom"><input className="form-control form-control-sm" placeholder={`Search ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
          )}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            <button type="button" className={'ss-item' + (count === 0 ? ' active' : '')} onClick={() => onChange(new Set())}>
              <i className={'me-2 ' + (count === 0 ? 'ri-checkbox-line text-primary' : 'ri-checkbox-blank-line')} />All {label.toLowerCase()}s
            </button>
            <div className="dropdown-divider my-0" />
            {shown.length === 0 ? (
              <div className="px-3 py-2 text-muted small">{options.length === 0 ? 'None available' : 'No match'}</div>
            ) : shown.map((o) => (
              <button type="button" key={o.value} className={'ss-item' + (selected.has(o.value) ? ' active' : '')} onClick={() => toggle(o.value)}>
                <i className={'me-2 ' + (selected.has(o.value) ? 'ri-checkbox-line text-primary' : 'ri-checkbox-blank-line')} />{o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HierarchyFilter({ data, value, onChange, hide }) {
  const { options } = useMemo(() => computeVisible(value, data), [value, data])
  const levels = hide ? LEVELS.filter((l) => !hide.includes(l.key)) : LEVELS

  const setLevel = (key, next) => {
    const idx = ORDER.indexOf(key)
    const nv = { ...value, [key]: next }
    for (let i = idx + 1; i < ORDER.length; i++) nv[ORDER[i]] = new Set()  // reset deeper levels
    onChange(nv)
  }
  const clearAll = () => onChange(emptyHierarchyFilter())
  const active = hierarchyFilterActive(value)

  return (
    <div className="d-flex align-items-center flex-wrap gap-2">
      <span className="text-muted small text-nowrap"><i className="ri-filter-3-line me-1" />Filter</span>
      {levels.map((l, i) => (
        <MultiSelect
          key={l.key} icon={l.icon} label={l.label}
          options={options[l.key]}
          selected={value[l.key] || new Set()}
          onChange={(next) => setLevel(l.key, next)}
          disabled={i > 0 && options[l.key].length === 0}
        />
      ))}
      {active && <button className="btn btn-sm btn-ghost-danger" onClick={clearAll}><i className="ri-close-line me-1" />Clear</button>}
    </div>
  )
}
