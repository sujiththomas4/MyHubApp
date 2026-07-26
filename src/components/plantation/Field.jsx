import ImageField from '@/components/plantation/ImageField'
import SearchSelect from '@/components/ui/SearchSelect'

/**
 * Field — renders one form control from a field descriptor. Shared by CrudCard
 * and EntityModal so every plantation form behaves the same.
 *
 * Descriptor: { key, label, type, options?, placeholder?, folder?, rows?, switchLabel? }
 * type: text | number | date | textarea | select | datalist | switch | image
 */
export default function Field({ field, form, set }) {
  const v = form[field.key] ?? ''
  const on = (val) => set(field.key, val)
  switch (field.type) {
    case 'select':
      return (
        <select className="form-select" value={v} onChange={(e) => on(e.target.value)}>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    case 'datalist':
      return (
        <>
          <input className="form-control" list={field.key + '-dl'} placeholder={field.placeholder} value={v} onChange={(e) => on(e.target.value)} />
          <datalist id={field.key + '-dl'}>{field.options.map((o) => <option key={o} value={o} />)}</datalist>
        </>
      )
    case 'number':
      return <input type="number" className="form-control" placeholder={field.placeholder} value={v} onChange={(e) => on(e.target.value)} />
    case 'date':
      return <input type="date" className="form-control" value={v} onChange={(e) => on(e.target.value)} />
    case 'textarea':
      return <textarea className="form-control" rows={field.rows || 2} placeholder={field.placeholder} value={v} onChange={(e) => on(e.target.value)} />
    case 'switch':
      return (
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id={field.key} checked={!!form[field.key]} onChange={(e) => on(e.target.checked)} />
          <label className="form-check-label" htmlFor={field.key}>{field.switchLabel || 'Yes'}</label>
        </div>
      )
    case 'computed':
      return <input className="form-control bg-light" readOnly tabIndex={-1} value={field.compute ? field.compute(form) : ''} />
    case 'search':
      return <SearchSelect value={v} onChange={on} options={field.options || []} placeholder={field.placeholder} allowCustom={field.allowCustom} />
    case 'image':
      return <ImageField value={v} folder={field.folder || 'plantation'} onChange={on} />
    default:
      return <input type="text" className="form-control" placeholder={field.placeholder} value={v} onChange={(e) => on(e.target.value)} />
  }
}
