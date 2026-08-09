import { useCallback } from 'react'
import { useCollection, insertRow, deleteRow } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

/**
 * activityLogRepo.js — the site-wide activity log powering the Road Map. Any
 * screen calls the logger (see useActivityLogger) with a category + an
 * auto-generated work description + optional metadata; the actor is filled in
 * from the current session. Backend-only.
 */
const rid = () => Math.random().toString(36).slice(2, 8)

const rowTo = (r) => ({
  id: r.id,
  category: r.category || 'other',
  description: r.description || '',
  meta: r.meta && typeof r.meta === 'object' ? r.meta : {},
  actorId: r.actor_id || '',
  actorName: r.actor_name || '',
  createdAt: r.created_at || '',
})

export function useActivityLog() {
  const { data, loading, error, reload } = useCollection('activity_log', [], { orderBy: 'created_at', ascending: true, map: rowTo })
  return { logs: data, loading, error, reload }
}

/** Low-level: insert a log row. Prefer useActivityLogger() inside components. */
export const logActivity = ({ category = 'other', description, meta = {}, actorId = '', actorName = '' }) =>
  insertRow('activity_log', {
    id: 'log-' + rid(), category, description,
    meta: meta && typeof meta === 'object' ? meta : {},
    actor_id: actorId || null, actor_name: actorName || null,
    created_at: new Date().toISOString(),
  })

export const removeLog = (id) => deleteRow('activity_log', id)

/** Hook returning log(category, description, meta) bound to the current user.
 *  Fire-and-forget: logging never blocks or breaks the calling action. */
export function useActivityLogger() {
  const { session, userName } = useAuth()
  const uid = session?.user?.id || ''
  return useCallback(
    (category, description, meta = {}) =>
      logActivity({ category, description, meta, actorId: uid, actorName: userName || '' }).catch((e) => console.error('log failed', e)),
    [uid, userName],
  )
}

export const LOG_CATEGORY = {
  booking: { label: 'Plants Booked', icon: 'ri-bookmark-line', tone: 'warning' },
  plant: { label: 'Plants', icon: 'ri-plant-line', tone: 'success' },
  supervisor: { label: 'Site Update', icon: 'ri-user-star-line', tone: 'primary' },
  schedule: { label: 'Schedule', icon: 'ri-repeat-line', tone: 'secondary' },
  activity: { label: 'Activity', icon: 'ri-list-check-2', tone: 'info' },
  comment: { label: 'Comment', icon: 'ri-chat-3-line', tone: 'info' },
  strategy: { label: 'Strategy', icon: 'ri-book-marked-line', tone: 'primary' },
  other: { label: 'Update', icon: 'ri-flag-line', tone: 'secondary' },
}
export const catOf = (c) => LOG_CATEGORY[c] || LOG_CATEGORY.other
