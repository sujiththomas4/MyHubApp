import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * gymRepo.js — Personal GYM workouts.
 *
 * `gym_exercises` is a reusable library of defined activities; `gym_plan` holds
 * the items planned for a specific date (name/part snapshotted from the library
 * so a plan survives later edits). No recurrence — everything is per-date.
 * Backend-only, like every other repo.
 */

// ---- Exercise library -------------------------------------------------------
const rowToExercise = (r) => ({
  id: r.id,
  name: r.name || '',
  part: r.part || '',
  active: r.active !== false,
  sortOrder: r.sort_order ?? 0,
})

const exerciseToRow = (x) => ({
  id: x.id,
  name: x.name,
  part: x.part || null,
  active: x.active !== false,
  sort_order: x.sortOrder ?? 0,
  updated_at: new Date().toISOString(),
})

/** All defined activities, in display order. */
export function useGymExercises() {
  const { data, loading, error } = useCollection('gym_exercises', [], {
    orderBy: 'sort_order', ascending: true, map: rowToExercise,
  })
  return { exercises: data, loading, error }
}

export const addGymExercise = (x) => insertRow('gym_exercises', exerciseToRow(x))
export const editGymExercise = (x) => updateRow('gym_exercises', x.id, exerciseToRow(x))
export const removeGymExercise = (id) => deleteRow('gym_exercises', id)

// ---- Per-date plan ----------------------------------------------------------
const rowToPlan = (r) => ({
  id: r.id,
  date: r.date,
  exerciseId: r.exercise_id || '',
  name: r.name || '',
  part: r.part || '',
  target: r.target || '',
  done: !!r.done,
  comment: r.comment || '',
  sortOrder: r.sort_order ?? 0,
})

const planToRow = (x) => ({
  id: x.id,
  date: x.date,
  exercise_id: x.exerciseId || null,
  name: x.name,
  part: x.part || null,
  target: x.target || null,
  done: !!x.done,
  comment: x.comment || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: new Date().toISOString(),
})

/** Every planned workout item (personal dataset — filter by date in the UI). */
export function useGymPlan() {
  const { data, loading, error } = useCollection('gym_plan', [], {
    orderBy: 'date', ascending: false, map: rowToPlan,
  })
  return { plan: data, loading, error }
}

export const addGymPlanItem = (x) => insertRow('gym_plan', planToRow(x))
export const editGymPlanItem = (x) => updateRow('gym_plan', x.id, planToRow(x))
export const removeGymPlanItem = (id) => deleteRow('gym_plan', id)

/** Light patch (done toggle / comment) without re-sending the whole row. */
export const patchGymPlanItem = (id, patch) =>
  updateRow('gym_plan', id, { ...patch, updated_at: new Date().toISOString() })
