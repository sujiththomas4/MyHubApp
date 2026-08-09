import { useCollection, insertRow, updateRow, deleteRow } from '@/lib/api'

/**
 * updateSchedulesRepo.js — recurring supervisor-update schedules. We persist the
 * recurrence RULE only; occurrences are generated on the fly (see
 * generateOccurrences) so editing a rule reshapes future occurrences without
 * materialising rows or losing saved updates. Backend-only.
 */
const iso = () => new Date().toISOString()

const rowTo = (r) => ({
  id: r.id,
  title: r.title || '',
  landId: r.land_id || '',
  supervisor: r.supervisor || '',
  startDate: r.start_date || '',
  endDate: r.end_date || '',
  frequency: r.frequency || 'weekly',
  interval: r.interval ?? 1,
  weekdays: Array.isArray(r.weekdays) ? r.weekdays : [],
  dayOfMonth: r.day_of_month ?? null,
  active: r.active !== false,
  note: r.note || '',
  sortOrder: r.sort_order ?? 0,
})
const toRow = (x) => ({
  id: x.id,
  title: (x.title || '').trim(),
  land_id: x.landId || null,
  supervisor: x.supervisor || null,
  start_date: x.startDate || null,
  end_date: x.endDate || null,
  frequency: x.frequency || 'weekly',
  interval: Math.max(1, Number(x.interval) || 1),
  weekdays: Array.isArray(x.weekdays) ? x.weekdays : [],
  day_of_month: x.frequency === 'monthly' ? (Number(x.dayOfMonth) || 1) : null,
  active: x.active !== false,
  note: x.note || null,
  sort_order: x.sortOrder ?? 0,
  updated_at: iso(),
})

export function useUpdateSchedules() {
  const { data, loading, error, reload } = useCollection('plantation_update_schedules', [], { orderBy: 'sort_order', ascending: true, map: rowTo })
  return { schedules: data, loading, error, reload }
}
export const addSchedule = (x) => insertRow('plantation_update_schedules', toRow(x))
export const editSchedule = (x) => updateRow('plantation_update_schedules', x.id, toRow(x))
export const removeSchedule = (id) => deleteRow('plantation_update_schedules', id)

// ---- Recurrence -----------------------------------------------------------
export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
export const WEEKDAYS = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
]
const WD_LABEL = Object.fromEntries(WEEKDAYS.map((w) => [w.value, w.label]))

const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const parse = (isoDate) => (isoDate ? midnight(new Date(isoDate + 'T00:00:00')) : null)
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x }

/**
 * Occurrence dates (ISO) for a schedule, clamped to [from, to] and the
 * schedule's own start/end. Falls back to a 6-year horizon if no end date.
 * Hard-capped so a runaway rule can never generate an unbounded list.
 */
export function generateOccurrences(sch, fromISO, toISO, cap = 2000) {
  if (!sch || !sch.startDate) return []
  const start = parse(sch.startDate)
  const end = sch.endDate ? parse(sch.endDate) : addYears(start, 6)
  const winFrom = fromISO ? parse(fromISO) : start
  const winTo = toISO ? parse(toISO) : end
  const lo = winFrom > start ? winFrom : start
  const hi = winTo < end ? winTo : end
  if (hi < lo) return []
  const out = []

  if (sch.frequency === 'monthly') {
    const interval = Math.max(1, sch.interval || 1)
    const dom = sch.dayOfMonth || start.getDate()
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cursor <= hi && out.length < cap) {
      const d = midnight(new Date(cursor.getFullYear(), cursor.getMonth(), dom))
      if (d >= start && d >= lo && d <= hi) out.push(isoOf(d))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + interval, 1)
    }
  } else {
    const interval = Math.max(1, sch.interval || 1)
    const weekdays = (sch.weekdays && sch.weekdays.length) ? sch.weekdays : [start.getDay()]
    const anchor = addDays(start, -start.getDay()) // Sunday of the start week
    let weekStart = anchor
    while (weekStart <= hi && out.length < cap) {
      const weekIndex = Math.round((weekStart - anchor) / (7 * 86400000))
      if (weekIndex % interval === 0) {
        for (const wd of weekdays) {
          const d = addDays(weekStart, wd)
          if (d >= start && d >= lo && d <= hi) out.push(isoOf(d))
        }
      }
      weekStart = addDays(weekStart, 7)
    }
  }
  return [...new Set(out)].sort()
}

/** Human summary, e.g. "Every 2 weeks on Sat, Sun" or "Monthly on day 1". */
export function describeSchedule(sch) {
  if (!sch) return ''
  const every = sch.interval > 1 ? `${sch.interval} ` : ''
  if (sch.frequency === 'monthly') {
    return `Every ${every}month${sch.interval > 1 ? 's' : ''} on day ${sch.dayOfMonth || 1}`
  }
  const days = (sch.weekdays || []).slice().sort((a, b) => a - b).map((w) => WD_LABEL[w]).join(', ')
  return `Every ${every}week${sch.interval > 1 ? 's' : ''}${days ? ' on ' + days : ''}`
}
