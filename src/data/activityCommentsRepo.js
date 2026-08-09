import { useCollection, insertRow, deleteRow } from '@/lib/api'

/**
 * activityCommentsRepo.js — threaded comments on plantation activities. Backend-only.
 * (Friendly time helpers live in bookingCommentsRepo — timeAgo / fullDateTime.)
 */
const rowTo = (r) => ({
  id: r.id,
  activityId: r.activity_id,
  body: r.body || '',
  authorId: r.author_id || '',
  authorName: r.author_name || '',
  mentions: Array.isArray(r.mentions) ? r.mentions : [],
  createdAt: r.created_at || '',
})
const toRow = (c) => ({
  id: c.id,
  activity_id: c.activityId,
  body: c.body,
  author_id: c.authorId || null,
  author_name: c.authorName || null,
  mentions: Array.isArray(c.mentions) ? c.mentions : [],
  created_at: c.createdAt,
})

export function useActivityComments() {
  const { data, loading, error, reload } = useCollection('activity_comments', [], { orderBy: 'created_at', ascending: true, map: rowTo })
  return { comments: data, loading, error, reload }
}
export const addActivityComment = (c) => insertRow('activity_comments', toRow(c))
export const removeActivityComment = (id) => deleteRow('activity_comments', id)
