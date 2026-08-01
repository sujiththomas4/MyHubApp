import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * supervisorUpdatesRepo.js — bi-weekly supervisor updates (backend-only).
 */
const iso = () => new Date().toISOString()

const rowTo = (r) => ({
  id: r.id, landId: r.land_id || '', date: r.date || '', periodFrom: r.period_from || '', periodTo: r.period_to || '',
  supervisor: r.supervisor || '', title: r.title || '', workDone: r.work_done || '', highlights: r.highlights || '',
  concerns: r.concerns || '', nextPlan: r.next_plan || '', image: r.image || '', sortOrder: r.sort_order ?? 0,
})
const toRow = (x) => ({
  id: x.id, land_id: x.landId || null, date: x.date || null, period_from: x.periodFrom || null, period_to: x.periodTo || null,
  supervisor: x.supervisor || null, title: x.title, work_done: x.workDone || null, highlights: x.highlights || null,
  concerns: x.concerns || null, next_plan: x.nextPlan || null, image: x.image || null, sort_order: x.sortOrder ?? 0, updated_at: iso(),
})

export function useSupervisorUpdates() {
  const { data, loading, error } = useCollection('plantation_supervisor_updates', [], { orderBy: 'period_from', ascending: false, map: rowTo })
  return { updates: data, loading, error }
}
export const addSupervisorUpdate = (x) => insertRow('plantation_supervisor_updates', toRow(x))
export const editSupervisorUpdate = (x) => updateRow('plantation_supervisor_updates', x.id, toRow(x))
export const removeSupervisorUpdate = (id) => deleteRow('plantation_supervisor_updates', id)
