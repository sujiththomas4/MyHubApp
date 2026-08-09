import { useCollection, insertRow, deleteRow } from '@/lib/api'

/**
 * bookingCommentsRepo.js — threaded comments on plants-booked rows. Each comment
 * stores who added it, when, and any @-mentioned user ids. Backend-only.
 */
const rowToComment = (r) => ({
  id: r.id,
  bookingId: r.booking_id,
  body: r.body || '',
  authorId: r.author_id || '',
  authorName: r.author_name || '',
  mentions: Array.isArray(r.mentions) ? r.mentions : [],
  createdAt: r.created_at || '',
})
const commentToRow = (c) => ({
  id: c.id,
  booking_id: c.bookingId,
  body: c.body,
  author_id: c.authorId || null,
  author_name: c.authorName || null,
  mentions: Array.isArray(c.mentions) ? c.mentions : [],
  created_at: c.createdAt,
})

export function useBookingComments() {
  const { data, loading, error, reload } = useCollection('pepper_booking_comments', [], { orderBy: 'created_at', ascending: true, map: rowToComment })
  return { comments: data, loading, error, reload }
}
export const addBookingComment = (c) => insertRow('pepper_booking_comments', commentToRow(c))
export const removeBookingComment = (id) => deleteRow('pepper_booking_comments', id)

/** Friendly relative time: "just now", "5 minutes ago", "yesterday", "3 days ago"… */
export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const now = Date.now()
  const secs = Math.round((now - then) / 1000)
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const d0 = new Date(iso); d0.setHours(0, 0, 0, 0)
  const dNow = new Date(); dNow.setHours(0, 0, 0, 0)
  const days = Math.round((dNow - d0) / 86400000)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) { const w = Math.round(days / 7); return `${w} week${w === 1 ? '' : 's'} ago` }
  if (days < 365) { const mo = Math.round(days / 30); return `${mo} month${mo === 1 ? '' : 's'} ago` }
  const y = Math.round(days / 365); return `${y} year${y === 1 ? '' : 's'} ago`
}

/** Full timestamp for tooltips. */
export function fullDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
