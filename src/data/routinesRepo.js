import { useCollection, insertRow, updateRow, deleteRow, upsertRow } from '@/lib/api'

/**
 * routinesRepo.js — Personal daily routines.
 *
 * `routines` are the definitions (what to do and when); `routine_logs` record,
 * per calendar day, whether a routine was done and an optional comment.
 * Backend-only, like every other repo.
 */
export const staticRoutines = []

// ---- Routine definitions ----------------------------------------------------
const rowToRoutine = (r) => ({
  id: r.id,
  title: r.title || '',
  schedule: r.schedule || 'daily',           // 'daily' | 'weekly' | 'once'
  days: Array.isArray(r.days) ? r.days : [],  // weekdays for 'weekly' (0=Sun..6=Sat)
  onDate: r.on_date || '',                    // for 'once'
  active: r.active !== false,
  sortOrder: r.sort_order ?? 0,
})

const routineToRow = (x) => ({
  id: x.id,
  title: x.title,
  schedule: x.schedule || 'daily',
  days: x.schedule === 'weekly' ? (x.days || []) : [],
  on_date: x.schedule === 'once' ? (x.onDate || null) : null,
  active: x.active !== false,
  sort_order: x.sortOrder ?? 0,
  updated_at: new Date().toISOString(),
})

/** All routine definitions, in display order. */
export function useRoutines() {
  const { data, loading, error } = useCollection('routines', staticRoutines, {
    orderBy: 'sort_order', ascending: true, map: rowToRoutine,
  })
  return { routines: data, loading, error }
}

export const addRoutine = (x) => insertRow('routines', routineToRow(x))
export const editRoutine = (x) => updateRow('routines', x.id, routineToRow(x))
export const removeRoutine = (id) => deleteRow('routines', id)

// ---- Per-day logs -----------------------------------------------------------
const rowToLog = (r) => ({
  id: r.id,
  routineId: r.routine_id,
  date: r.date,
  done: !!r.done,
  comment: r.comment || '',
})

/** Every routine log (small, personal dataset — filter by date in the UI). */
export function useRoutineLogs() {
  const { data, loading, error } = useCollection('routine_logs', [], {
    orderBy: 'date', ascending: false, map: rowToLog,
  })
  return { logs: data, loading, error }
}

export const logId = (routineId, date) => `${routineId}__${date}`

/** Create-or-update the log for one routine on one day. */
export const saveRoutineLog = ({ routineId, date, done, comment }) =>
  upsertRow('routine_logs', {
    id: logId(routineId, date),
    routine_id: routineId,
    date,
    done: !!done,
    comment: comment || null,
    updated_at: new Date().toISOString(),
  }, 'id')

// ---- Scheduling -------------------------------------------------------------
/** Does this routine apply on the given YYYY-MM-DD date? */
export function appliesOn(routine, dateISO) {
  if (!routine.active) return false
  if (routine.schedule === 'daily') return true
  if (routine.schedule === 'weekly') {
    const dow = new Date(dateISO + 'T00:00:00').getDay()
    return routine.days.includes(dow)
  }
  if (routine.schedule === 'once') return routine.onDate === dateISO
  return false
}
