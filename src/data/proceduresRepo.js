import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * proceduresRepo.js — "Records": documented procedures + their steps, and a
 * general contacts directory. Backend-only.
 */
const iso = () => new Date().toISOString()

// ---- Procedures ------------------------------------------------------------
const rowToProc = (r) => ({
  id: r.id, title: r.title || '', category: r.category || '', status: r.status || 'done',
  summary: r.summary || '', date: r.date || '', note: r.note || '', image: r.image || '', sortOrder: r.sort_order ?? 0,
})
const procToRow = (x) => ({
  id: x.id, title: x.title, category: x.category || null, status: x.status || 'done',
  summary: x.summary || null, date: x.date || null, note: x.note || null, image: x.image || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})
export function useProcedures() {
  const { data, loading, error } = useCollection('plantation_procedures', [], { orderBy: 'sort_order', ascending: true, map: rowToProc })
  return { procedures: data, loading, error }
}
export const addProcedure = (x) => insertRow('plantation_procedures', procToRow(x))
export const editProcedure = (x) => updateRow('plantation_procedures', x.id, procToRow(x))
export const removeProcedure = (id) => deleteRow('plantation_procedures', id)

// ---- Procedure steps -------------------------------------------------------
const rowToStep = (r) => ({ id: r.id, procedureId: r.procedure_id, step: r.step || '', done: !!r.done, date: r.date || '', note: r.note || '', sortOrder: r.sort_order ?? 0 })
const stepToRow = (x) => ({ id: x.id, procedure_id: x.procedureId, step: x.step || null, done: !!x.done, date: x.date || null, note: x.note || null, sort_order: x.sortOrder ?? 0, updated_at: iso() })
export function useProcedureSteps() {
  const { data, loading, error } = useCollection('plantation_procedure_steps', [], { orderBy: 'sort_order', ascending: true, map: rowToStep })
  return { steps: data, loading, error }
}
export const addProcedureStep = (x) => insertRow('plantation_procedure_steps', stepToRow(x))
export const editProcedureStep = (x) => updateRow('plantation_procedure_steps', x.id, stepToRow(x))
export const removeProcedureStep = (id) => deleteRow('plantation_procedure_steps', id)

// ---- Contacts --------------------------------------------------------------
const rowToContact = (r) => ({ id: r.id, name: r.name || '', role: r.role || '', category: r.category || '', district: r.district || '', specialisedIn: r.specialised_in || '', phone: r.phone || '', email: r.email || '', address: r.address || '', note: r.note || '', important: !!r.important, sortOrder: r.sort_order ?? 0 })
const contactToRow = (x) => ({ id: x.id, name: x.name, role: x.role || null, category: x.category || null, district: x.district || null, specialised_in: x.specialisedIn || null, phone: x.phone || null, email: x.email || null, address: x.address || null, note: x.note || null, important: !!x.important, sort_order: x.sortOrder ?? 0, updated_at: iso() })
export function useContacts() {
  const { data, loading, error } = useCollection('plantation_contacts', [], { orderBy: 'name', ascending: true, map: rowToContact })
  return { contacts: data, loading, error }
}
export const addContact = (x) => insertRow('plantation_contacts', contactToRow(x))
export const editContact = (x) => updateRow('plantation_contacts', x.id, contactToRow(x))
export const removeContact = (id) => deleteRow('plantation_contacts', id)

export const PROC_STATUS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]
export const PROC_STATUS_BADGE = { planned: 'bg-secondary-subtle text-secondary', in_progress: 'bg-warning-subtle text-dark', done: 'bg-success-subtle text-success' }
